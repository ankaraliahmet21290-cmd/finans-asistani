import { isWithinTradingHours, scanCategorizedSignals } from "./multitimeframe";
import { sendCategorizedTimeframeMail, isMailConfigured } from "./mail";

export interface SchedulerState {
  initialized: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  lastMailedAt: string | null;
  lastStatus: string | null;
  totalRuns: number;
  lastSignalCount: number;
}

const state: SchedulerState = {
  initialized: false,
  intervalMinutes: 15,
  lastRunAt: null,
  lastMailedAt: null,
  lastStatus: "Başlatılmadı",
  totalRuns: 0,
  lastSignalCount: 0,
};

let timerId: NodeJS.Timeout | null = null;
let isRunningTask = false;

export async function runScheduledScan(force = false): Promise<{
  ok: boolean;
  withinHours: boolean;
  mailed: boolean;
  message: string;
  signalsCount: number;
}> {
  if (isRunningTask) {
    return {
      ok: false,
      withinHours: isWithinTradingHours(),
      mailed: false,
      message: "Önceki tarama hala devam ediyor.",
      signalsCount: 0,
    };
  }

  const withinHours = isWithinTradingHours();
  if (!withinHours && !force) {
    state.lastStatus = "Seans dışı (09:50-18:00 arası çalışır), atlandı.";
    return {
      ok: true,
      withinHours: false,
      mailed: false,
      message: "Seans saatleri dışında (09:50 - 18:00). Tarama atlandı.",
      signalsCount: 0,
    };
  }

  isRunningTask = true;
  state.lastRunAt = new Date().toISOString();
  state.totalRuns++;

  try {
    const data = await scanCategorizedSignals();
    state.lastSignalCount = data.totalSignalsCount;

    let mailed = false;
    if (isMailConfigured()) {
      mailed = await sendCategorizedTimeframeMail(data);
      if (mailed) {
        state.lastMailedAt = new Date().toISOString();
      }
    }

    state.lastStatus = `Başarılı. ${data.totalSignalsCount} sinyal bulundu. Mail: ${mailed ? "Gönderildi" : "Atlandı"}`;

    return {
      ok: true,
      withinHours,
      mailed,
      message: state.lastStatus,
      signalsCount: data.totalSignalsCount,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    state.lastStatus = `Hata: ${err}`;
    console.error("[scheduler] runScheduledScan hatası:", err);
    return {
      ok: false,
      withinHours,
      mailed: false,
      message: err,
      signalsCount: 0,
    };
  } finally {
    isRunningTask = false;
  }
}

export function ensureSchedulerStarted(): SchedulerState {
  if (state.initialized) {
    return getSchedulerState();
  }

  state.initialized = true;
  state.lastStatus = "Aktif (15 dakikada bir kontrol ediliyor)";

  // Check every 60 seconds if 15 minutes have elapsed and within trading hours
  const INTERVAL_MS = 15 * 60 * 1000;

  timerId = setInterval(() => {
    const now = Date.now();
    const lastRun = state.lastRunAt ? new Date(state.lastRunAt).getTime() : 0;

    if (now - lastRun >= INTERVAL_MS && isWithinTradingHours()) {
      void runScheduledScan(false);
    }
  }, 60 * 1000);

  // Unref timer so it doesn't block process exit
  if (timerId && typeof timerId.unref === "function") {
    timerId.unref();
  }

  return getSchedulerState();
}

export function getSchedulerState(): SchedulerState & {
  isWithinHours: boolean;
  tradingHoursLabel: string;
} {
  return {
    ...state,
    isWithinHours: isWithinTradingHours(),
    tradingHoursLabel: "09:50 - 18:00 (Pazartesi - Cuma)",
  };
}
