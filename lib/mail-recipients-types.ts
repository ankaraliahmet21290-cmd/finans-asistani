export interface MailRecipient {
  email: string;
  name?: string;
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
