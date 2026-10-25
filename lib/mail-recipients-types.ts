import type { MailIntervalKey } from "./mail-settings-types";

export interface MailRecipient {
  email: string;
  name?: string;
  intervalKey?: MailIntervalKey;
  intervalLabel?: string;
  enabled: boolean;
  addedAt: string;
  notes?: string;
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
