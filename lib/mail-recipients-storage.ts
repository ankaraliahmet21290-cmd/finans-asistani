import fs from "fs/promises";
import path from "path";
import type { MailRecipient } from "./mail-recipients-types";

export type { MailRecipient };

export const RECIPIENTS_FILE_PATH = path.join(process.cwd(), "mail-recipients.md");

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Parses markdown content from mail-recipients.md into MailRecipient array.
 */
export function parseRecipientsMarkdown(content: string): MailRecipient[] {
  const lines = content.split(/\r?\n/);
  const recipientMap = new Map<string, MailRecipient>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Table row format: | E-Posta | İsim / Not | Durum | Eklenme Tarihi |
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
        continue;
      }

      if (!isValidEmail(rawEmail)) continue;

      const email = rawEmail.toLowerCase();
      const name = cols[1] && cols[1] !== "-" ? cols[1] : undefined;
      const statusRaw = (cols[2] || "Aktif").toLowerCase();
      const enabled = !(
        statusRaw === "pasif" ||
        statusRaw === "kapalı" ||
        statusRaw === "hayır" ||
        statusRaw === "false" ||
        statusRaw === "0"
      );
      const addedAt = cols[3] && cols[3] !== "-" ? cols[3] : new Date().toISOString();

      recipientMap.set(email, {
        email,
        name,
        enabled,
        addedAt,
      });
      continue;
    }

    // 2. Bullet list fallback: - test@example.com (İsim)
    if (line.startsWith("-") || line.startsWith("*")) {
      const stripped = line.replace(/^[-*]\s*/, "").trim();
      const emailMatch = stripped.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        const email = emailMatch[1].toLowerCase();
        if (!recipientMap.has(email) && isValidEmail(email)) {
          // Check if there is a name inside parenthesis
          const nameMatch = stripped.match(/\(([^)]+)\)/);
          recipientMap.set(email, {
            email,
            name: nameMatch ? nameMatch[1].trim() : undefined,
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
  md += `Bu dosya Finans Asistanı piyasa sinyalleri ve zaman dilimi analiz raporlarının otomatik gönderileceği e-posta adreslerini tanımlar.\n`;
  md += `Arayüz üzerinden yeni e-posta adresi eklendiğinde, silindiğinde veya durumu değiştirildiğinde bu dosya otomatik olarak güncellenir.\n`;
  md += `Dilerseniz bu dosyayı doğrudan düzenleyerek de alıcı ekleyebilir veya çıkarabilirsiniz.\n\n`;

  md += `| E-Posta | İsim / Not | Durum | Eklenme Tarihi |\n`;
  md += `| --- | --- | --- | --- |\n`;

  if (recipients.length === 0) {
    md += `| *Henüz alıcı eklenmedi* | - | Pasif | ${nowStr} |\n`;
  } else {
    for (const r of recipients) {
      const name = r.name ? r.name.replace(/\|/g, "/") : "-";
      const status = r.enabled ? "Aktif" : "Pasif";
      const date = r.addedAt || nowStr;
      md += `| ${r.email} | ${name} | ${status} | ${date} |\n`;
    }
  }

  md += `\n---\n\n`;
  md += `### Aktif Alıcılar (${activeList.length} Adres):\n`;
  if (activeList.length === 0) {
    md += `_Şu anda aktif alıcı bulunmuyor. Yeni bir e-posta adresi ekleyin veya durumunu Aktif yapın._\n`;
  } else {
    for (const r of activeList) {
      md += `- ${r.email}${r.name ? ` (${r.name})` : ""}\n`;
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
  enabled?: boolean;
}): Promise<MailRecipient[]> {
  const email = newRecipient.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw new Error(`Geçersiz e-posta formatı: ${newRecipient.email}`);
  }

  const current = await getRecipientsFromFile(true);
  const existingIndex = current.findIndex((r) => r.email.toLowerCase() === email);

  const item: MailRecipient = {
    email,
    name: newRecipient.name?.trim() || undefined,
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
 * Toggles or updates recipient status.
 */
export async function toggleRecipientStatus(
  email: string,
  enabled: boolean,
  name?: string
): Promise<MailRecipient[]> {
  const cleanEmail = email.trim().toLowerCase();
  const current = await getRecipientsFromFile(true);
  const existingIndex = current.findIndex((r) => r.email.toLowerCase() === cleanEmail);

  if (existingIndex < 0) {
    throw new Error(`Alıcı bulunamadı: ${email}`);
  }

  const updated = [...current];
  updated[existingIndex] = {
    ...updated[existingIndex],
    enabled,
    ...(name !== undefined ? { name: name.trim() || undefined } : {}),
  };

  return saveRecipientsToFile(updated);
}

/**
 * Returns list of active recipient email addresses from mail-recipients.md.
 */
export async function getActiveRecipientEmails(forceFresh = false): Promise<string[]> {
  const list = await getRecipientsFromFile(forceFresh);
  return list.filter((r) => r.enabled).map((r) => r.email);
}
