import type { MailIntervalKey } from "./mail-settings-types";

export type MarketScope = "bist" | "crypto" | "commodity_forex" | "us_stocks";
export type NotificationType = "reports" | "positions" | "watchlist";

export interface MailRecipient {
  email: string;
  name?: string;
  intervalKey?: MailIntervalKey;
  intervalLabel?: string;
  enabled: boolean;
  addedAt: string;
  notes?: string;
  notifyReports?: boolean;    // Çoklu zaman dilimi tarama raporları (varsayılan: true)
  notifyPositions?: boolean;  // Stop-Loss & Kâr Al portföy alarmları (varsayılan: true)
  notifyWatchlist?: boolean;  // İzleme listesi AL/SAT sinyal alarmları (varsayılan: true)
  markets?: MarketScope[];    // İlgilenilen piyasalar: ["bist", "crypto", "commodity_forex", "us_stocks"]
}

export interface MailRecipientsResponse {
  ok: boolean;
  recipients: MailRecipient[];
  activeEmails: string[];
  totalCount: number;
  activeCount: number;
  filePath: string;
  message?: string;
  error?: string;
}
