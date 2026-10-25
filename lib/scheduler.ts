import { isWithinTradingHours, scanCategorizedSignals } from "./multitimeframe";
import {
  sendCategorizedTimeframeMail,
  isMailConfigured,
  sendPositionAlarmMail,
  sendSignalMail,
} from "./mail";
import {
  getMailSettingsFromFile,
  type MailIntervalKey,
  type MailScheduleConfig,
} from "./mail-settings-storage";
import { MAIL_INTERVAL_OPTIONS } from "./mail-settings-types";
import { getRecipientsFromFile, type MailRecipient } from "./mail-recipients-storage";
import { loadPositionsFile, savePositionsFile } from "./position-storage";
import { getCandles } from "./data";
import {
  getWatchlistWithSettingsFromFile,
  saveWatchlistSettingsToFile,
} from "./watchlist-storage";
import { analyzeSymbol } from "./analyze";
import { getPendingMail, getSignal, setPendingMail, setSignal } from "./store";
import type { SignalMailItem } from "./types";

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
const recipientLastMailedMap = new Map<string, number>();

function getMinutesForInterval(key: MailIntervalKey): number {
  switch (key) {
    case "5m":
      return 5;
    case "10m":
      return 10;
    case "15m":
      return 15;
    case "30m":
      return 30;
    case "1h":
      return 60;
    case "2h":
      return 120;
    case "4h":
      return 240;
    case "daily":
      return 1440;
    default:
      return 15;
  }
}

// Helper to format date in Istanbul timezone
function getIstanbulDateString(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

/**
 * Syncs the scheduler state with mail-settings.md
 */
export async function syncSchedulerWithConfig(): Promise<MailScheduleConfig> {
  const config = await getMailSettingsFromFile(true);
  state.intervalMinutes = config.intervalMinutes;
  state.intervalKey = config.intervalKey;
  state.intervalLabel = config.label;
  state.emailLabel = config.emailLabel;
  state.enabled = config.enabled;
  state.onlyTradingHours = config.onlyTradingHours;

  if (!config.enabled || config.intervalKey === "off" || config.intervalMinutes === 0) {
    state.lastStatus = "Otomatik e-posta gönderimi kapalı (mail-settings.md: kapalı)";
  } else {
    state.lastStatus = `Aktif (${config.label} aralığında kontrol ediliyor - mail-settings.md)`;
  }

  return config;
}

export async function runScheduledScan(
  force = false,
  specificRecipients?: MailRecipient[]
): Promise<{
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
    let sentRecipientCount = 0;

    if (isMailConfigured()) {
      const allRecipients = await getRecipientsFromFile();
      const recipientsToSend =
        specificRecipients && specificRecipients.length > 0
          ? specificRecipients
          : allRecipients.filter((r) => r.enabled);

      if (recipientsToSend.length > 0) {
        // Group recipients by intervalKey to provide tailored frequency header
        const groups = new Map<MailIntervalKey, string[]>();
        for (const r of recipientsToSend) {
          const k = r.intervalKey || config.intervalKey || "15m";
          const list = groups.get(k) || [];
          list.push(r.email);
          groups.set(k, list);
        }

        const sendTime = Date.now();

        for (const [intKey, emails] of groups.entries()) {
          const opt = MAIL_INTERVAL_OPTIONS.find((o) => o.key === intKey);
          const label = opt ? opt.emailLabel : config.emailLabel;
          const sent = await sendCategorizedTimeframeMail(data, label, emails);
          if (sent) {
            sentRecipientCount += emails.length;
            for (const email of emails) {
              recipientLastMailedMap.set(email.toLowerCase(), sendTime);
            }
          }
        }

        if (sentRecipientCount > 0) {
          mailed = true;
          state.lastMailedAt = new Date().toISOString();
        }
      }
    }

    state.lastStatus = `Başarılı. ${data.totalSignalsCount} sinyal bulundu. Mail: ${
      mailed ? `${sentRecipientCount} alıcıya gönderildi` : "Atlandı"
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
 * Checks if interval elapsed according to mail-recipients.md and mail-settings.md
 */
async function checkSchedulerTick() {
  try {
    const config = await syncSchedulerWithConfig();

    if (config.onlyTradingHours && !isWithinTradingHours()) {
      return;
    }

    const recipients = await getRecipientsFromFile();
    const activeRecipients = recipients.filter((r) => r.enabled && r.intervalKey !== "off");
    if (activeRecipients.length === 0) {
      return;
    }

    const now = Date.now();
    const todayIstanbul = getIstanbulDateString();
    const dueRecipients: MailRecipient[] = [];

    for (const r of activeRecipients) {
      const intKey = r.intervalKey || config.intervalKey || "15m";
      if (intKey === "off") continue;

      const lastTime = recipientLastMailedMap.get(r.email.toLowerCase()) ?? 0;

      if (intKey === "daily") {
        const lastDateStr = lastTime > 0 ? getIstanbulDateString(new Date(lastTime)) : null;
        if (lastDateStr !== todayIstanbul) {
          dueRecipients.push(r);
        }
      } else {
        const minutes = getMinutesForInterval(intKey);
        const intervalMs = minutes * 60 * 1000;
        if (now - lastTime >= intervalMs) {
          dueRecipients.push(r);
        }
      }
    }

    if (dueRecipients.length > 0) {
      void runScheduledScan(false, dueRecipients);
    }
  } catch (err) {
    console.error("[scheduler] checkSchedulerTick hatası:", err);
  }
}
async function checkPositionTrackerTick() {
  try {
    const { settings, positions } = await loadPositionsFile();
    if (settings.checkInterval === "off" || settings.intervalMinutes === 0) return;
    if (settings.onlyTradingHours && !isWithinTradingHours()) return;

    const now = Date.now();
    const lastCheck = settings.lastCheckAt ? new Date(settings.lastCheckAt).getTime() : 0;
    const intervalMs = settings.intervalMinutes * 60 * 1000;

    if (now - lastCheck < intervalMs) return;

    const activePositions = positions.filter((p) => p.status === "active");
    if (activePositions.length === 0) {
      settings.lastCheckAt = new Date().toISOString();
      await savePositionsFile(settings, positions);
      return;
    }

    const nowIso = new Date().toISOString();
    let alarmsSent = 0;

    const updated = await Promise.all(
      positions.map(async (pos) => {
        if (pos.status !== "active") return pos;

        try {
          const candleRes = await getCandles(pos.ticker, pos.timeframe);
          const currentPrice =
            candleRes.regularMarketPrice ?? candleRes.closes.at(-1) ?? pos.entryPrice;

          const profitLossPercent =
            pos.entryPrice > 0
              ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
              : 0;

          // STOP-LOSS Check
          if (currentPrice <= pos.stopLoss && pos.notifiedType !== "stop_loss") {
            await sendPositionAlarmMail({
              type: "stop_loss",
              position: {
                ticker: pos.ticker,
                code: pos.code,
                name: pos.name,
                timeframe: pos.timeframe,
                entryPrice: pos.entryPrice,
                currentPrice,
                stopLoss: pos.stopLoss,
                takeProfit: pos.takeProfit,
                profitLossPercent,
                notes: pos.notes,
              },
            });
            alarmsSent++;
            return {
              ...pos,
              status: "stop_loss_hit" as const,
              notifiedAt: nowIso,
              notifiedType: "stop_loss" as const,
            };
          }

          // TAKE-PROFIT Check
          if (currentPrice >= pos.takeProfit && pos.notifiedType !== "take_profit") {
            await sendPositionAlarmMail({
              type: "take_profit",
              position: {
                ticker: pos.ticker,
                code: pos.code,
                name: pos.name,
                timeframe: pos.timeframe,
                entryPrice: pos.entryPrice,
                currentPrice,
                stopLoss: pos.stopLoss,
                takeProfit: pos.takeProfit,
                profitLossPercent,
                notes: pos.notes,
              },
            });
            alarmsSent++;
            return {
              ...pos,
              status: "take_profit_hit" as const,
              notifiedAt: nowIso,
              notifiedType: "take_profit" as const,
            };
          }

          return pos;
        } catch {
          return pos;
        }
      })
    );

    settings.lastCheckAt = nowIso;
    if (alarmsSent > 0) {
      settings.lastAlarmSentAt = nowIso;
      settings.totalAlarmsSent += alarmsSent;
    }

    await savePositionsFile(settings, updated);
  } catch (err) {
    console.error("[scheduler] checkPositionTrackerTick hatası:", err);
  }
}

let isRunningWatchlistCheck = false;

async function checkWatchlistTrackerTick() {
  if (isRunningWatchlistCheck) return;

  try {
    const { settings, entries } = await getWatchlistWithSettingsFromFile();
    if (settings.checkInterval === "off" || settings.intervalMinutes === 0) return;
    if (settings.onlyTradingHours && !isWithinTradingHours()) return;
    if (entries.length === 0) return;

    const now = Date.now();
    const lastCheck = settings.lastCheckAt ? new Date(settings.lastCheckAt).getTime() : 0;
    const intervalMs = settings.intervalMinutes * 60 * 1000;

    if (settings.checkInterval === "daily") {
      const todayIstanbul = getIstanbulDateString();
      const lastCheckDay = settings.lastCheckAt
        ? getIstanbulDateString(new Date(settings.lastCheckAt))
        : null;
      if (lastCheckDay === todayIstanbul) return;
    } else {
      if (now - lastCheck < intervalMs) return;
    }

    isRunningWatchlistCheck = true;
    const nowIso = new Date().toISOString();
    const changed: SignalMailItem[] = [];

    for (const w of entries) {
      try {
        const res = await analyzeSymbol(w.ticker, w.type);
        const fundReasons =
          res.fund?.metrics
            .filter((m) => m.point !== 0)
            .map((m) => m.detail) ?? [];

        const prev = await getSignal(w.ticker);
        if (prev !== res.signal) {
          await setSignal(w.ticker, res.signal);
          if (prev) {
            changed.push({
              ticker: w.ticker,
              signal: res.signal,
              score: res.score,
              reasons: [...res.tech.reasons, ...fundReasons],
              price: res.price,
            });
          }
        }
      } catch (err) {
        console.error("[scheduler] watchlist sembol kontrol hatası:", w.ticker, err);
      }
    }

    const queue = new Map<string, SignalMailItem>();
    for (const item of await getPendingMail()) queue.set(item.ticker, item);
    for (const item of changed) queue.set(item.ticker, item);
    const items = [...queue.values()];

    if (items.length > 0 && isMailConfigured()) {
      try {
        await sendSignalMail(items);
        await setPendingMail([]);
        settings.lastChangedAt = nowIso;
      } catch (e) {
        console.error("[scheduler] watchlist e-posta gönderilemedi, saklanıyor:", e);
        await setPendingMail(items);
      }
    }

    settings.lastCheckAt = nowIso;
    await saveWatchlistSettingsToFile(settings);
  } catch (err) {
    console.error("[scheduler] checkWatchlistTrackerTick hatası:", err);
  } finally {
    isRunningWatchlistCheck = false;
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
    void checkPositionTrackerTick();
    void checkWatchlistTrackerTick();
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
