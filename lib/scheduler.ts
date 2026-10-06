import { isWithinTradingHours, scanCategorizedSignals } from "./multitimeframe";
import { sendCategorizedTimeframeMail, isMailConfigured } from "./mail";
import {
  getMailSettingsFromFile,
  type MailIntervalKey,
  type MailScheduleConfig,
} from "./mail-settings-storage";

export interface SchedulerState {
  initialized: boolean;
  intervalMinutes: number;
  intervalKey: MailIntervalKey;
  intervalLabel: string;
  emailLabel: string;
  enabled: boolean;
  onlyTradingHours: boolean;
  lastRunAt: string | null;
  lastMailedAt: string | null;
  lastStatus: string | null;
  totalRuns: number;
  lastSignalCount: number;
}

const state: SchedulerState = {
  initialized: false,
  intervalMinutes: 15,
  intervalKey: "15m",
  intervalLabel: "15 dk",
  emailLabel: "15 Dakikalık",
  enabled: true,
  onlyTradingHours: true,
  lastRunAt: null,
  lastMailedAt: null,
  lastStatus: "Başlatılmadı",
  totalRuns: 0,
  lastSignalCount: 0,
};

let timerId: NodeJS.Timeout | null = null;
let isRunningTask = false;

// Helper to format date in Istanbul timezone
function getIstanbulDateString(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

/**
 * Syncs the scheduler state with mail-settings.md
 */
export async function syncSchedulerWithConfig(): Promise<MailScheduleConfig> {
  const config = await getMailSettingsFromFile();
  state.intervalMinutes = config.intervalMinutes;
  state.intervalKey = config.intervalKey;
  state.intervalLabel = config.label;
  state.emailLabel = config.emailLabel;
  state.enabled = config.enabled;
  state.onlyTradingHours = config.onlyTradingHours;
  return config;
}

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

  const config = await syncSchedulerWithConfig();
  const withinHours = isWithinTradingHours();

  // If auto-mail is turned off or disabled in mail-settings.md and not forced
  if (!force && (!config.enabled || config.intervalKey === "off" || config.intervalMinutes === 0)) {
    state.lastStatus = "Otomatik gönderim kapalı (mail-settings.md: kapalı).";
    return {
      ok: true,
      withinHours,
      mailed: false,
      message: "Otomatik e-posta gönderimi ayarlardan kapatılmış.",
      signalsCount: 0,
    };
  }

  if (config.onlyTradingHours && !withinHours && !force) {
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
      mailed = await sendCategorizedTimeframeMail(data, config.emailLabel);
      if (mailed) {
        state.lastMailedAt = new Date().toISOString();
      }
    }

    state.lastStatus = `Başarılı. ${data.totalSignalsCount} sinyal bulundu. Sıklık: ${config.label}. Mail: ${
      mailed ? "Gönderildi" : "Atlandı"
    }`;

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

/**
 * Checks if interval elapsed according to mail-settings.md
 */
async function checkSchedulerTick() {
  try {
    const config = await syncSchedulerWithConfig();

    if (!config.enabled || config.intervalKey === "off" || config.intervalMinutes === 0) {
      return;
    }

    if (config.onlyTradingHours && !isWithinTradingHours()) {
      return;
    }

    const now = Date.now();

    // DAILY check: run once per trading day
    if (config.intervalKey === "daily") {
      const todayIstanbul = getIstanbulDateString();
      const lastMailedDay = state.lastMailedAt
        ? getIstanbulDateString(new Date(state.lastMailedAt))
        : null;

      if (lastMailedDay !== todayIstanbul) {
        void runScheduledScan(false);
      }
      return;
    }

    // MINUTES-BASED check: 5m, 10m, 15m, 30m, 1h, 2h, 4h
    const lastTrigger = state.lastMailedAt
      ? new Date(state.lastMailedAt).getTime()
      : state.lastRunAt
      ? new Date(state.lastRunAt).getTime()
      : 0;

    const intervalMs = config.intervalMinutes * 60 * 1000;
    if (now - lastTrigger >= intervalMs) {
      void runScheduledScan(false);
    }
  } catch (err) {
    console.error("[scheduler] checkSchedulerTick hatası:", err);
  }
}

export function ensureSchedulerStarted(): SchedulerState {
  if (state.initialized) {
    return getSchedulerState();
  }

  state.initialized = true;
  void syncSchedulerWithConfig().then((c) => {
    state.lastStatus = `Aktif (${c.label} aralığında kontrol ediliyor - mail-settings.md)`;
  });

  // Check every 30 seconds for accurate triggering
  timerId = setInterval(() => {
    void checkSchedulerTick();
  }, 30 * 1000);

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
