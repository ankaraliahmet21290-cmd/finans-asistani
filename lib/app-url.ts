import { getMailSettingsFromFile, saveMailSettingsToFile } from "./mail-settings-storage";

let runtimeAppUrl: string | null = null;

export function isLocalhost(url?: string | null): boolean {
  if (!url) return false;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(url);
}

export function cleanAppUrl(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

export function extractAppUrlFromRequest(req: Request): string | null {
  try {
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost || req.headers.get("host");
    if (!host) return null;

    let proto = forwardedProto;
    if (!proto) {
      proto = isLocalhost(host) ? "http" : "https";
    }

    return cleanAppUrl(`${proto}://${host}`);
  } catch {
    return null;
  }
}

/**
 * Registers an app URL from a request or direct URL string.
 * Updates in-memory runtime cache. If a real domain is detected and
 * persist is true, saves to mail-settings.md so scheduled/cron tasks also use it.
 */
export function registerAppUrl(input: Request | string, persist = false): string | null {
  const url = typeof input === "string" ? cleanAppUrl(input) : extractAppUrlFromRequest(input);
  if (!url) return null;

  // Always keep real domain in preference over localhost
  if (!runtimeAppUrl || !isLocalhost(url) || isLocalhost(runtimeAppUrl)) {
    runtimeAppUrl = url;
  }

  if (persist && !isLocalhost(url)) {
    void getMailSettingsFromFile()
      .then((cfg) => {
        if (!cfg.appUrl || isLocalhost(cfg.appUrl) || cfg.appUrl !== url) {
          return saveMailSettingsToFile({ appUrl: url });
        }
      })
      .catch((err) => {
        console.warn("[app-url] Domain kaydetme uyarısı:", err);
      });
  }

  return url;
}

export function getRuntimeAppUrl(): string | null {
  return runtimeAppUrl;
}

/**
 * Resolves the primary base URL for email links and notifications.
 * Prioritizes the actual domain the application is running on over localhost.
 */
export async function resolveAppBaseUrl(req?: Request): Promise<string> {
  // 1. If explicit request is provided, register and evaluate it
  if (req) {
    const fromReq = extractAppUrlFromRequest(req);
    if (fromReq) {
      registerAppUrl(fromReq, !isLocalhost(fromReq));
      if (!isLocalhost(fromReq)) {
        return fromReq;
      }
    }
  }

  // 2. Read from mail-settings.md
  try {
    const config = await getMailSettingsFromFile();
    if (config.appUrl && !isLocalhost(config.appUrl)) {
      return cleanAppUrl(config.appUrl);
    }
  } catch {
    // ignore
  }

  // 3. Runtime detected domain from prior requests (captured from visitor / browser hits)
  if (runtimeAppUrl && !isLocalhost(runtimeAppUrl)) {
    return runtimeAppUrl;
  }

  // 4. Environment variables (non-localhost)
  if (process.env.NEXT_PUBLIC_APP_URL && !isLocalhost(process.env.NEXT_PUBLIC_APP_URL)) {
    return cleanAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.APP_URL && !isLocalhost(process.env.APP_URL)) {
    return cleanAppUrl(process.env.APP_URL);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return cleanAppUrl(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) {
    return cleanAppUrl(`https://${process.env.VERCEL_URL}`);
  }

  // 5. Configured or default domain fallback
  try {
    const config = await getMailSettingsFromFile();
    if (config.appUrl) {
      return cleanAppUrl(config.appUrl);
    }
  } catch {
    // ignore
  }

  if (process.env.APP_URL) {
    return cleanAppUrl(process.env.APP_URL);
  }

  return "https://finans-asistanim.ilanbul.tech";
}
