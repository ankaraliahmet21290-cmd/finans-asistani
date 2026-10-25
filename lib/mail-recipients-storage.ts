import fs from "fs/promises";
import path from "path";
import type { MailRecipient } from "./mail-recipients-types";
import type { MailIntervalKey } from "./mail-settings-types";

export type { MailRecipient };

export const RECIPIENTS_FILE_PATH = path.join(process.cwd(), "mail-recipients.md");

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function parseIntervalKey(raw?: string): MailIntervalKey {
  if (!raw) return "15m";
  const s = raw.toLowerCase().trim();
  if (s === "5m" || s.startsWith("5 dk") || s.startsWith("5 dak") || s.startsWith("5 min")) return "5m";
  if (s === "10m" || s.startsWith("10 dk") || s.startsWith("10 dak")) return "10m";
  if (s === "15m" || s.startsWith("15 dk") || s.startsWith("15 dak")) return "15m";
  if (s === "30m" || s.startsWith("30 dk") || s.startsWith("30 dak")) return "30m";
  if (s === "1h" || s.startsWith("1 saat") || s.startsWith("1s") || s === "60m") return "1h";
  if (s === "2h" || s.startsWith("2 saat") || s.startsWith("2s") || s === "120m") return "2h";
  if (s === "4h" || s.startsWith("4 saat") || s.startsWith("4s") || s === "240m") return "4h";
  if (s === "daily" || s.includes("günlük") || s.includes("gunluk")) return "daily";
  if (s === "off" || s.includes("kapalı") || s.includes("kapali") || s.includes("devre dışı")) return "off";
  return "15m";
}

export function formatIntervalLabel(key?: MailIntervalKey): string {
  switch (key) {
    case "5m":
      return "5 dk";
    case "10m":
      return "10 dk";
    case "15m":
      return "15 dk";
    case "30m":
      return "30 dk";
    case "1h":
      return "1 saat";
    case "2h":
      return "2 saat";
    case "4h":
      return "4 saat";
    case "daily":
      return "Günlük";
    case "off":
      return "Kapalı";
    default:
      return "15 dk";
  }
}

/**
 * Parses markdown content from mail-recipients.md into MailRecipient array.
 */
export function parseRecipientsMarkdown(content: string): MailRecipient[] {
  const lines = content.split(/\r?\n/);
  const recipientMap = new Map<string, MailRecipient>();

  let hasFrequencyHeader = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Table row format: | E-Posta | İsim / Not | Sıklık | Durum | Eklenme Tarihi |
    if (line.startsWith("|") && line.endsWith("|")) {
      const cols = line
        .split("|")
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);

      if (cols.length < 1) continue;

      const rawEmail = cols[0];
      // Skip markdown table header and divider lines
      const lowerHeader = rawEmail.toLowerCase();
      if (
        lowerHeader.includes("e-posta") ||
        lowerHeader.includes("email") ||
        lowerHeader.includes("alıcı") ||
        lowerHeader.startsWith("---") ||
        lowerHeader.startsWith(":")
      ) {
        if (
          cols.some(
            (c) =>
              c.toLowerCase().includes("sıklık") ||
              c.toLowerCase().includes("frekans") ||
              c.toLowerCase().includes("interval")
          )
        ) {
          hasFrequencyHeader = true;
        }
        continue;
      }

      if (!isValidEmail(rawEmail)) continue;

      const email = rawEmail.toLowerCase();
      const name = cols[1] && cols[1] !== "-" ? cols[1] : undefined;

      let intervalKey: MailIntervalKey = "15m";
      let statusRaw = "Aktif";
      let addedAt = new Date().toISOString();

      if (hasFrequencyHeader || cols.length >= 5) {
        // Table format: | E-Posta | İsim / Not | Sıklık | Durum | Eklenme Tarihi |
        intervalKey = parseIntervalKey(cols[2]);
        statusRaw = (cols[3] || "Aktif").toLowerCase();
        addedAt = cols[4] && cols[4] !== "-" ? cols[4] : addedAt;
      } else {
        // Backward-compatible 4-column format: | E-Posta | İsim / Not | Durum | Eklenme Tarihi |
        const candidateStatus = (cols[2] || "").toLowerCase();
        const isStatusWord =
          candidateStatus === "aktif" ||
          candidateStatus === "pasif" ||
          candidateStatus === "kapalı" ||
          candidateStatus === "açık" ||
          candidateStatus === "true" ||
          candidateStatus === "false";

        if (isStatusWord) {
          statusRaw = candidateStatus;
          intervalKey = "15m";
        } else {
          intervalKey = parseIntervalKey(cols[2]);
          statusRaw = (cols[3] || "Aktif").toLowerCase();
        }
        addedAt = cols[3] && cols[3] !== "-" ? cols[3] : addedAt;
      }

      const enabled = !(
        statusRaw === "pasif" ||
        statusRaw === "kapalı" ||
        statusRaw === "hayır" ||
        statusRaw === "false" ||
        statusRaw === "0"
      );

      recipientMap.set(email, {
        email,
        name,
        intervalKey,
        intervalLabel: formatIntervalLabel(intervalKey),
        enabled,
        addedAt,
      });
      continue;
    }

    // 2. Bullet list fallback: - test@example.com (İsim) [Sıklık: 1 saat]
    if (line.startsWith("-") || line.startsWith("*")) {
      const stripped = line.replace(/^[-*]\s*/, "").trim();
      const emailMatch = stripped.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        const email = emailMatch[1].toLowerCase();
        if (!recipientMap.has(email) && isValidEmail(email)) {
          const nameMatch = stripped.match(/\(([^)]+)\)/);
          const freqMatch = stripped.match(/\[(?:sıklık|frequency|aralık):\s*([^\]]+)\]/i);
          const intervalKey = freqMatch ? parseIntervalKey(freqMatch[1]) : "15m";
          recipientMap.set(email, {
            email,
            name: nameMatch ? nameMatch[1].trim() : undefined,
            intervalKey,
            intervalLabel: formatIntervalLabel(intervalKey),
            enabled: true,
            addedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return Array.from(recipientMap.values());
}

/**
 * Formats a list of recipients into structured Markdown content.
 */
export function formatRecipientsMarkdown(recipients: MailRecipient[]): string {
  const activeList = recipients.filter((r) => r.enabled);
  const nowStr = new Date().toISOString();

  let md = `# E-Posta Alıcı Listesi (Mail Recipients)\n\n`;
  md += `Bu dosya Finans Asistanı piyasa sinyalleri ve zaman dilimi analiz raporlarının otomatik gönderileceği e-posta adreslerini ve her alıcıya özel gönderim sıklığını tanımlar.\n`;
  md += `Arayüz üzerinden yeni e-posta adresi eklendiğinde, sıklığı değiştirildiğinde veya silindiğinde bu dosya otomatik olarak güncellenir.\n`;
  md += `Dilerseniz bu dosyayı doğrudan düzenleyerek de alıcı ekleyebilir veya sıklıklarını (5 dk, 10 dk, 15 dk, 30 dk, 1 saat, 2 saat, 4 saat, Günlük) ayarlayabilirsiniz.\n\n`;

  md += `| E-Posta | İsim / Not | Sıklık | Durum | Eklenme Tarihi |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;

  if (recipients.length === 0) {
    md += `| *Henüz alıcı eklenmedi* | - | 15 dk | Pasif | ${nowStr} |\n`;
  } else {
    for (const r of recipients) {
      const name = r.name ? r.name.replace(/\|/g, "/") : "-";
      const intervalLabel = formatIntervalLabel(r.intervalKey);
      const status = r.enabled ? "Aktif" : "Pasif";
      const date = r.addedAt || nowStr;
      md += `| ${r.email} | ${name} | ${intervalLabel} | ${status} | ${date} |\n`;
    }
  }

  md += `\n---\n\n`;
  md += `### Aktif Alıcılar (${activeList.length} Adres):\n`;
  if (activeList.length === 0) {
    md += `_Şu anda aktif alıcı bulunmuyor. Yeni bir e-posta adresi ekleyin veya durumunu Aktif yapın._\n`;
  } else {
    for (const r of activeList) {
      const intervalLabel = formatIntervalLabel(r.intervalKey);
      md += `- ${r.email}${r.name ? ` (${r.name})` : ""} · [Sıklık: ${intervalLabel}]\n`;
    }
  }

  md += `\n*Son Dosya Güncellemesi: ${nowStr}*\n`;
  return md;
}

// In-memory cache
let cachedRecipients: MailRecipient[] | null = null;
let lastFileReadTime = 0;
const CACHE_TTL_MS = 2500;

function getDefaultInitialRecipients(): MailRecipient[] {
  const initialEmails: string[] = [];
  const envTo = process.env.MAIL_TO;
  const envGmail = process.env.GMAIL_USER;

  if (envTo) {
    envTo.split(",").forEach((e) => {
      const clean = e.trim().toLowerCase();
      if (clean && isValidEmail(clean) && !initialEmails.includes(clean)) {
        initialEmails.push(clean);
      }
    });
  }

  if (initialEmails.length === 0 && envGmail && isValidEmail(envGmail.trim())) {
    initialEmails.push(envGmail.trim().toLowerCase());
  }

  if (initialEmails.length === 0) {
    initialEmails.push("ankarali.ahmet.06@gmail.com");
  }

  const now = new Date().toISOString();
  return initialEmails.map((email, index) => ({
    email,
    name: index === 0 ? "Varsayılan Alıcı" : undefined,
    intervalKey: "15m",
    intervalLabel: "15 dk",
    enabled: true,
    addedAt: now,
  }));
}

/**
 * Reads recipients from mail-recipients.md. If missing, initializes default file.
 */
export async function getRecipientsFromFile(forceFresh = false): Promise<MailRecipient[]> {
  const now = Date.now();
  if (!forceFresh && cachedRecipients && now - lastFileReadTime < CACHE_TTL_MS) {
    return cachedRecipients;
  }

  try {
    const content = await fs.readFile(RECIPIENTS_FILE_PATH, "utf-8");
    const parsed = parseRecipientsMarkdown(content);
    cachedRecipients = parsed;
    lastFileReadTime = now;
    return parsed;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      const defaults = getDefaultInitialRecipients();
      await saveRecipientsToFile(defaults);
      cachedRecipients = defaults;
      lastFileReadTime = now;
      return defaults;
    }
    console.error("[mail-recipients-storage] Okuma hatası:", err);
    return cachedRecipients || [];
  }
}

/**
 * Saves given recipients list to mail-recipients.md.
 */
export async function saveRecipientsToFile(recipients: MailRecipient[]): Promise<MailRecipient[]> {
  const content = formatRecipientsMarkdown(recipients);
  await fs.writeFile(RECIPIENTS_FILE_PATH, content, "utf-8");
  cachedRecipients = recipients;
  lastFileReadTime = Date.now();
  return recipients;
}

/**
 * Adds a new recipient or updates an existing one if already present.
 */
export async function addRecipientToFile(newRecipient: {
  email: string;
  name?: string;
  intervalKey?: MailIntervalKey;
  enabled?: boolean;
}): Promise<MailRecipient[]> {
  const email = newRecipient.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw new Error(`Geçersiz e-posta formatı: ${newRecipient.email}`);
  }

  const current = await getRecipientsFromFile(true);
  const existingIndex = current.findIndex((r) => r.email.toLowerCase() === email);
  const intervalKey =
    newRecipient.intervalKey ??
    (existingIndex >= 0 ? current[existingIndex].intervalKey ?? "15m" : "15m");

  const item: MailRecipient = {
    email,
    name: newRecipient.name?.trim() || undefined,
    intervalKey,
    intervalLabel: formatIntervalLabel(intervalKey),
    enabled: newRecipient.enabled !== undefined ? newRecipient.enabled : true,
    addedAt: existingIndex >= 0 ? current[existingIndex].addedAt : new Date().toISOString(),
  };

  let updated: MailRecipient[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = item;
  } else {
    updated = [...current, item];
  }

  return saveRecipientsToFile(updated);
}

/**
 * Removes a recipient by email from mail-recipients.md.
 */
export async function removeRecipientFromFile(email: string): Promise<MailRecipient[]> {
  const cleanEmail = email.trim().toLowerCase();
  const current = await getRecipientsFromFile(true);
  const filtered = current.filter((r) => r.email.toLowerCase() !== cleanEmail);
  return saveRecipientsToFile(filtered);
}

/**
 * Updates recipient details (status, name, interval frequency).
 */
export async function updateRecipientInFile(
  email: string,
  updates: {
    enabled?: boolean;
    name?: string;
    intervalKey?: MailIntervalKey;
  }
): Promise<MailRecipient[]> {
  const cleanEmail = email.trim().toLowerCase();
  const current = await getRecipientsFromFile(true);
  const existingIndex = current.findIndex((r) => r.email.toLowerCase() === cleanEmail);

  if (existingIndex < 0) {
    throw new Error(`Alıcı bulunamadı: ${email}`);
  }

  const existing = current[existingIndex];
  const newInterval =
    updates.intervalKey !== undefined ? updates.intervalKey : existing.intervalKey ?? "15m";

  const updated = [...current];
  updated[existingIndex] = {
    ...existing,
    enabled: updates.enabled !== undefined ? updates.enabled : existing.enabled,
    name: updates.name !== undefined ? updates.name.trim() || undefined : existing.name,
    intervalKey: newInterval,
    intervalLabel: formatIntervalLabel(newInterval),
  };

  return saveRecipientsToFile(updated);
}

/**
 * Toggles or updates recipient status.
 */
export async function toggleRecipientStatus(
  email: string,
  enabled: boolean,
  name?: string,
  intervalKey?: MailIntervalKey
): Promise<MailRecipient[]> {
  return updateRecipientInFile(email, { enabled, name, intervalKey });
}

/**
 * Returns list of active recipient email addresses from mail-recipients.md.
 */
export async function getActiveRecipientEmails(forceFresh = false): Promise<string[]> {
  const list = await getRecipientsFromFile(forceFresh);
  return list.filter((r) => r.enabled).map((r) => r.email);
}
