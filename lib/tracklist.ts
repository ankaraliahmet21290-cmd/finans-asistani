import fs from "fs";
import path from "path";

export interface TrackEntry {
  ticker: string;
  type: "stock" | "gold";
  date: string;
  price: number;
  signal: string;
  timeframe: string;
}

const TRACKLIST_FILE = path.join(process.cwd(), "takiplistem.md");

function parseLine(line: string): TrackEntry | null {
  if (!line.trim() || !line.startsWith("|") || line.includes("Sembol") || line.includes("---")) return null;
  const parts = line.split("|").map((p) => p.trim());
  if (parts.length >= 6) {
    const ticker = parts[1];
    const type = parts[2] as "stock" | "gold";
    const date = parts[3];
    const price = parseFloat(parts[4]);
    const signal = parts[5];
    const timeframe = parts[6] || "1d";
    if (ticker && date && !isNaN(price)) {
      return { ticker, type, date, price, signal, timeframe };
    }
  }
  return null;
}

export async function readTracklist(): Promise<TrackEntry[]> {
  try {
    if (!fs.existsSync(TRACKLIST_FILE)) {
      return [];
    }
    const content = await fs.promises.readFile(TRACKLIST_FILE, "utf-8");
    const lines = content.split("\n");
    const entries: TrackEntry[] = [];
    for (const line of lines) {
      const entry = parseLine(line);
      if (entry) entries.push(entry);
    }
    return entries;
  } catch (error) {
    console.error("[Tracklist] Read error:", error);
    return [];
  }
}

export async function addToTracklist(entry: TrackEntry): Promise<void> {
  const current = await readTracklist();
  
  // If we just want to track everything regardless if it exists, we just append it.
  current.push(entry);

  let mdContent = `# Takip Listem (Sinyal Karşılaştırma)\n\nBu dosya, sinyallerin başarısını ölçmek amacıyla kaydedilen varlıkları içerir.\n\n| Sembol | Tür | Kayıt Tarihi | Kayıt Fiyatı | Kayıt Sinyali | Periyot |\n| --- | --- | --- | --- | --- | --- |\n`;

  for (const e of current) {
    mdContent += `| ${e.ticker} | ${e.type} | ${e.date} | ${e.price} | ${e.signal} | ${e.timeframe} |\n`;
  }

  await fs.promises.writeFile(TRACKLIST_FILE, mdContent, "utf-8");
}

export async function removeFromTracklist(ticker: string, date: string): Promise<void> {
  const current = await readTracklist();
  const filtered = current.filter(e => !(e.ticker === ticker && e.date === date));
  
  let mdContent = `# Takip Listem (Sinyal Karşılaştırma)\n\nBu dosya, sinyallerin başarısını ölçmek amacıyla kaydedilen varlıkları içerir.\n\n| Sembol | Tür | Kayıt Tarihi | Kayıt Fiyatı | Kayıt Sinyali | Periyot |\n| --- | --- | --- | --- | --- | --- |\n`;

  for (const e of filtered) {
    mdContent += `| ${e.ticker} | ${e.type} | ${e.date} | ${e.price} | ${e.signal} | ${e.timeframe} |\n`;
  }

  await fs.promises.writeFile(TRACKLIST_FILE, mdContent, "utf-8");
}
