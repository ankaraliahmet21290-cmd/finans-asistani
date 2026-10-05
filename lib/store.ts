import type { SignalMailItem } from "./types";

interface KvLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
}

const memory = new Map<string, string>();
let kvClient: Promise<KvLike | null> | null = null;
let kvBroken = false;

function kvEnvPresent(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getKv(): Promise<KvLike | null> {
  if (kvBroken || !kvEnvPresent()) return null;
  if (!kvClient) {
    kvClient = (async () => {
      try {
        const mod = await import("@vercel/kv");
        return mod.kv as KvLike;
      } catch (e) {
        console.warn("[store] KV kullanılamıyor, bellek içi depolamaya düşülüyor:", e);
        kvBroken = true;
        return null;
      }
    })();
  }
  return kvClient;
}

async function read(key: string): Promise<string | null> {
  const kv = await getKv();
  if (kv) {
    try {
      const value = await kv.get<string>(key);
      return value ?? null;
    } catch (e) {
      console.warn("[store] KV okuma hatası:", e);
    }
  }
  return memory.get(key) ?? null;
}

async function write(key: string, value: string): Promise<void> {
  const kv = await getKv();
  if (kv) {
    try {
      await kv.set(key, value);
      return;
    } catch (e) {
      console.warn("[store] KV yazma hatası:", e);
    }
  }
  memory.set(key, value);
}

export async function getSignal(ticker: string): Promise<string | null> {
  return read(`signal:${ticker}`);
}

export async function setSignal(ticker: string, signal: string): Promise<void> {
  await write(`signal:${ticker}`, signal);
}

export async function getPendingMail(): Promise<SignalMailItem[]> {
  const raw = await read("pending:mail");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SignalMailItem[];
  } catch {
    return [];
  }
}

export async function setPendingMail(items: SignalMailItem[]): Promise<void> {
  await write("pending:mail", JSON.stringify(items));
}
