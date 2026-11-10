import fs from "fs/promises";
import path from "path";
import type {
  AnalyticsEvent,
  AnalyticsSummary,
  AnalyticsTimeframe,
  DeviceType,
  GeoStat,
  IpStat,
  ScreenStat,
  TimelineBucket,
} from "./analytics-types";

export const ANALYTICS_FILE_PATH = path.join(process.cwd(), "analytics-logs.json");

const MAX_STORED_EVENTS = 10000;

// In-memory caches for fast read/write
let cachedEvents: AnalyticsEvent[] | null = null;
let isSaving = false;
let pendingSave = false;

// Geo-location cache: IP -> { city, country, countryCode }
const geoCache = new Map<string, { city: string; country: string; countryCode: string }>();

// Pre-defined demo & known mappings
const KNOWN_GEO_MAPPINGS: Record<string, { city: string; country: string; countryCode: string }> = {
  "127.0.0.1": { city: "Yerel (Localhost)", country: "Türkiye", countryCode: "TR" },
  "::1": { city: "Yerel (Localhost)", country: "Türkiye", countryCode: "TR" },
  "85.105.142.71": { city: "İstanbul", country: "Türkiye", countryCode: "TR" },
  "176.234.92.18": { city: "Ankara", country: "Türkiye", countryCode: "TR" },
  "212.156.40.112": { city: "İzmir", country: "Türkiye", countryCode: "TR" },
  "88.241.67.204": { city: "Bursa", country: "Türkiye", countryCode: "TR" },
  "94.54.180.29": { city: "Antalya", country: "Türkiye", countryCode: "TR" },
  "31.223.4.155": { city: "Adana", country: "Türkiye", countryCode: "TR" },
  "78.180.12.94": { city: "Kocaeli", country: "Türkiye", countryCode: "TR" },
  "195.175.254.2": { city: "Gaziantep", country: "Türkiye", countryCode: "TR" },
};

export function isLocalIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  return (
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean.includes("localhost") ||
    clean.startsWith("192.168.") ||
    clean.startsWith("10.") ||
    clean.startsWith("172.16.") ||
    clean.startsWith("172.17.") ||
    clean.startsWith("172.18.") ||
    clean.startsWith("172.19.") ||
    clean.startsWith("172.20.") ||
    clean.startsWith("172.21.") ||
    clean.startsWith("172.22.") ||
    clean.startsWith("172.23.") ||
    clean.startsWith("172.24.") ||
    clean.startsWith("172.25.") ||
    clean.startsWith("172.26.") ||
    clean.startsWith("172.27.") ||
    clean.startsWith("172.28.") ||
    clean.startsWith("172.29.") ||
    clean.startsWith("172.30.") ||
    clean.startsWith("172.31.")
  );
}

export function parseDevice(userAgent?: string): DeviceType {
  if (!userAgent) return "Masaüstü";
  const ua = userAgent.toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet") || ua.includes("playbook")) {
    return "Tablet";
  }
  if (
    ua.includes("mobile") ||
    ua.includes("iphone") ||
    ua.includes("android") ||
    ua.includes("ipod") ||
    ua.includes("blackberry") ||
    ua.includes("webos") ||
    ua.includes("windows phone")
  ) {
    return "Mobil";
  }
  return "Masaüstü";
}

export function getClientIp(headers: Headers): string {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((s) => s.trim());
    if (ips[0] && ips[0] !== "") return ips[0];
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const trueClientIp = headers.get("true-client-ip");
  if (trueClientIp) return trueClientIp.trim();

  const xClientIp = headers.get("x-client-ip");
  if (xClientIp) return xClientIp.trim();

  return "127.0.0.1";
}

export async function resolveGeoIp(
  ip: string,
  headers?: Headers
): Promise<{ city: string; country: string; countryCode: string }> {
  if (!ip) {
    return { city: "Bilinmiyor", country: "Türkiye", countryCode: "TR" };
  }

  // 1. Check in-memory cache
  if (geoCache.has(ip)) {
    return geoCache.get(ip)!;
  }

  // 2. Check predefined mappings
  if (KNOWN_GEO_MAPPINGS[ip]) {
    geoCache.set(ip, KNOWN_GEO_MAPPINGS[ip]);
    return KNOWN_GEO_MAPPINGS[ip];
  }

  // 3. Check reverse proxy / CDN headers if available
  if (headers) {
    const headerCity = headers.get("x-vercel-ip-city") || headers.get("cf-ipcity");
    const headerCountry =
      headers.get("x-vercel-ip-country-name") ||
      headers.get("x-vercel-ip-country") ||
      headers.get("cf-ipcountry");
    const headerCountryCode =
      headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || "TR";

    if (headerCity || headerCountry) {
      const decodedCity = headerCity ? decodeURIComponent(headerCity) : "Bilinmiyor";
      const res = {
        city: decodedCity,
        country: headerCountry || "Türkiye",
        countryCode: headerCountryCode || "TR",
      };
      geoCache.set(ip, res);
      return res;
    }
  }

  // 4. Local IP detection
  if (isLocalIp(ip)) {
    const res = { city: "Yerel (Geliştirici)", country: "Türkiye", countryCode: "TR" };
    geoCache.set(ip, res);
    return res;
  }

  // 5. Attempt remote lookup for public IP with 1.2s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const apiRes = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.status === "success") {
        const res = {
          city: data.city || "Bilinmiyor",
          country: data.country || "Türkiye",
          countryCode: data.countryCode || "TR",
        };
        geoCache.set(ip, res);
        return res;
      }
    }
  } catch {
    // Timeout or network error
  }

  // Fallback default
  const fallback = { city: "İstanbul", country: "Türkiye", countryCode: "TR" };
  geoCache.set(ip, fallback);
  return fallback;
}

function generateSeedEvents(): AnalyticsEvent[] {
  const now = Date.now();
  const events: AnalyticsEvent[] = [];

  const demoIps = [
    {
      ip: "85.105.142.71",
      city: "İstanbul",
      country: "Türkiye",
      countryCode: "TR",
      device: "Masaüstü" as DeviceType,
      weight: 35,
    },
    {
      ip: "176.234.92.18",
      city: "Ankara",
      country: "Türkiye",
      countryCode: "TR",
      device: "Mobil" as DeviceType,
      weight: 28,
    },
    {
      ip: "212.156.40.112",
      city: "İzmir",
      country: "Türkiye",
      countryCode: "TR",
      device: "Masaüstü" as DeviceType,
      weight: 20,
    },
    {
      ip: "88.241.67.204",
      city: "Bursa",
      country: "Türkiye",
      countryCode: "TR",
      device: "Mobil" as DeviceType,
      weight: 15,
    },
    {
      ip: "94.54.180.29",
      city: "Antalya",
      country: "Türkiye",
      countryCode: "TR",
      device: "Tablet" as DeviceType,
      weight: 10,
    },
    {
      ip: "31.223.4.155",
      city: "Adana",
      country: "Türkiye",
      countryCode: "TR",
      device: "Masaüstü" as DeviceType,
      weight: 8,
    },
    {
      ip: "127.0.0.1",
      city: "Yerel (Localhost)",
      country: "Türkiye",
      countryCode: "TR",
      device: "Masaüstü" as DeviceType,
      weight: 12,
    },
  ];

  const screens = [
    { name: "BIST Hisseleri (Ana Sayfa)", path: "/", weight: 40 },
    { name: "Kripto Varlıklar", path: "/kripto", weight: 25 },
    { name: "Emtia & Döviz", path: "/emtia-doviz", weight: 15 },
    { name: "ABD Borsası (Nasdaq/S&P)", path: "/abd-borsasi", weight: 10 },
    { name: "Hisse Detay: THYAO", path: "/symbol/THYAO", weight: 4 },
    { name: "Hisse Detay: ASELS", path: "/symbol/ASELS", weight: 3 },
    { name: "Kullanım Kılavuzu", path: "/kullanim-kilavuzu", weight: 2 },
    { name: "Teknik Detay Kılavuzu", path: "/teknik-detay-klavuzu", weight: 1 },
  ];

  let idCounter = 1;

  // 1. Generate events over the last 30 days
  for (let day = 30; day >= 1; day--) {
    const dayOffset = day * 24 * 60 * 60 * 1000;
    const countThisDay = Math.floor(35 + Math.random() * 25);
    for (let i = 0; i < countThisDay; i++) {
      const randomIp = demoIps[Math.floor(Math.random() * demoIps.length)];
      const randomScreen = screens[Math.floor(Math.random() * screens.length)];
      const eventTime = now - dayOffset + Math.floor(Math.random() * 24 * 60 * 60 * 1000);
      events.push({
        id: `seed-${idCounter++}`,
        ip: randomIp.ip,
        city: randomIp.city,
        country: randomIp.country,
        countryCode: randomIp.countryCode,
        screen: randomScreen.name,
        path: randomScreen.path,
        action: Math.random() > 0.4 ? "click" : "page_view",
        label: randomScreen.name,
        device: randomIp.device,
        timestamp: eventTime,
        isoTime: new Date(eventTime).toISOString(),
      });
    }
  }

  // 2. Generate events for today (last 24 hours)
  for (let hour = 23; hour >= 1; hour--) {
    const hourOffset = hour * 60 * 60 * 1000;
    const countThisHour = Math.floor(8 + Math.random() * 12);
    for (let i = 0; i < countThisHour; i++) {
      const randomIp = demoIps[Math.floor(Math.random() * demoIps.length)];
      const randomScreen = screens[Math.floor(Math.random() * screens.length)];
      const eventTime = now - hourOffset + Math.floor(Math.random() * 60 * 60 * 1000);
      events.push({
        id: `seed-${idCounter++}`,
        ip: randomIp.ip,
        city: randomIp.city,
        country: randomIp.country,
        countryCode: randomIp.countryCode,
        screen: randomScreen.name,
        path: randomScreen.path,
        action: Math.random() > 0.3 ? "click" : "page_view",
        label: randomScreen.name,
        device: randomIp.device,
        timestamp: eventTime,
        isoTime: new Date(eventTime).toISOString(),
      });
    }
  }

  // 3. Generate events for real-time (last 15 minutes)
  for (let min = 15; min >= 0; min--) {
    const countThisMin = Math.floor(1 + Math.random() * 3);
    for (let i = 0; i < countThisMin; i++) {
      const randomIp = demoIps[Math.floor(Math.random() * 4)];
      const randomScreen = screens[Math.floor(Math.random() * screens.length)];
      const eventTime = now - min * 60 * 1000 + Math.floor(Math.random() * 60 * 1000);
      events.push({
        id: `seed-${idCounter++}`,
        ip: randomIp.ip,
        city: randomIp.city,
        country: randomIp.country,
        countryCode: randomIp.countryCode,
        screen: randomScreen.name,
        path: randomScreen.path,
        action: "click",
        label: randomScreen.name,
        device: randomIp.device,
        timestamp: eventTime,
        isoTime: new Date(eventTime).toISOString(),
      });
    }
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

export async function loadAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  if (cachedEvents) return cachedEvents;

  try {
    const raw = await fs.readFile(ANALYTICS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure existing records have city and country populated if missing
      cachedEvents = parsed.map((e) => {
        if (!e.city || !e.country) {
          const mapping = KNOWN_GEO_MAPPINGS[e.ip] || {
            city: "İstanbul",
            country: "Türkiye",
            countryCode: "TR",
          };
          return {
            ...e,
            city: e.city || mapping.city,
            country: e.country || mapping.country,
            countryCode: e.countryCode || mapping.countryCode,
          };
        }
        return e;
      });
      return cachedEvents;
    }
  } catch {
    // File doesn't exist or is invalid
  }

  cachedEvents = generateSeedEvents();
  scheduleSave();
  return cachedEvents;
}

function scheduleSave(): void {
  if (isSaving) {
    pendingSave = true;
    return;
  }

  isSaving = true;
  setTimeout(async () => {
    try {
      if (cachedEvents) {
        if (cachedEvents.length > MAX_STORED_EVENTS) {
          cachedEvents = cachedEvents.slice(-MAX_STORED_EVENTS);
        }
        await fs.writeFile(ANALYTICS_FILE_PATH, JSON.stringify(cachedEvents, null, 2), "utf-8");
      }
    } catch (err) {
      console.error("[analytics-storage] Error saving events:", err);
    } finally {
      isSaving = false;
      if (pendingSave) {
        pendingSave = false;
        scheduleSave();
      }
    }
  }, 300);
}

export async function recordAnalyticsEvent(
  params: Omit<AnalyticsEvent, "id" | "timestamp" | "isoTime">
): Promise<AnalyticsEvent> {
  const events = await loadAnalyticsEvents();
  const now = Date.now();

  const newEvent: AnalyticsEvent = {
    ...params,
    id: `evt-${now}-${Math.random().toString(36).slice(2, 8)}`,
    city: params.city || "İstanbul",
    country: params.country || "Türkiye",
    countryCode: params.countryCode || "TR",
    timestamp: now,
    isoTime: new Date(now).toISOString(),
  };

  events.push(newEvent);
  scheduleSave();
  return newEvent;
}

export async function clearAnalyticsData(): Promise<void> {
  cachedEvents = [];
  try {
    await fs.writeFile(ANALYTICS_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
  } catch (err) {
    console.error("[analytics-storage] Error clearing file:", err);
  }
}

export async function seedDemoAnalyticsData(): Promise<void> {
  cachedEvents = generateSeedEvents();
  scheduleSave();
}

export async function getAnalyticsSummary(
  timeframe: AnalyticsTimeframe = "hourly",
  filterIp?: string,
  filterScreen?: string
): Promise<AnalyticsSummary> {
  const allEvents = await loadAnalyticsEvents();
  const now = Date.now();

  let cutoffMs = 0;
  let periodLabel = "Tüm Zamanlar";

  switch (timeframe) {
    case "realtime":
      cutoffMs = now - 15 * 60 * 1000;
      periodLabel = "Son 15 Dakika (Anlık)";
      break;
    case "hourly":
      cutoffMs = now - 24 * 60 * 60 * 1000;
      periodLabel = "Son 24 Saat (Saatlik)";
      break;
    case "weekly":
      cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
      periodLabel = "Son 7 Gün (Haftalık)";
      break;
    case "monthly":
      cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
      periodLabel = "Son 30 Gün (Aylık)";
      break;
    case "all":
    default:
      cutoffMs = 0;
      periodLabel = "Tüm Kayıtlar";
      break;
  }

  // Realtime active IPs count
  const realtimeCutoff = now - 15 * 60 * 1000;
  const realtimeIpSet = new Set<string>();
  for (const evt of allEvents) {
    if (evt.timestamp >= realtimeCutoff) {
      realtimeIpSet.add(evt.ip);
    }
  }
  const realtimeActiveIps = realtimeIpSet.size;

  // Filter events
  const filtered = allEvents.filter((evt) => {
    if (cutoffMs > 0 && evt.timestamp < cutoffMs) return false;
    if (filterIp) {
      const q = filterIp.toLowerCase();
      const matchIp = evt.ip.toLowerCase().includes(q);
      const matchCity = (evt.city || "").toLowerCase().includes(q);
      const matchCountry = (evt.country || "").toLowerCase().includes(q);
      if (!matchIp && !matchCity && !matchCountry) return false;
    }
    if (filterScreen && !evt.screen.toLowerCase().includes(filterScreen.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalClicks = filtered.length;

  // IP Aggregations
  const ipMap = new Map<
    string,
    {
      ip: string;
      city: string;
      country: string;
      countryCode: string;
      totalClicks: number;
      firstSeen: number;
      lastSeen: number;
      device: DeviceType;
      screens: Record<string, number>;
    }
  >();

  // Screen Aggregations
  const screenMap = new Map<
    string,
    {
      screen: string;
      path: string;
      clicks: number;
      ips: Set<string>;
      lastClickTime: number;
    }
  >();

  // Geo (City & Country) Aggregations
  const geoMap = new Map<
    string,
    {
      city: string;
      country: string;
      countryCode: string;
      clicks: number;
      ips: Set<string>;
    }
  >();

  for (const evt of filtered) {
    const city = evt.city || "İstanbul";
    const country = evt.country || "Türkiye";
    const countryCode = evt.countryCode || "TR";

    // Process IP
    let ipEntry = ipMap.get(evt.ip);
    if (!ipEntry) {
      ipEntry = {
        ip: evt.ip,
        city,
        country,
        countryCode,
        totalClicks: 0,
        firstSeen: evt.timestamp,
        lastSeen: evt.timestamp,
        device: evt.device || "Masaüstü",
        screens: {},
      };
      ipMap.set(evt.ip, ipEntry);
    }
    ipEntry.totalClicks += 1;
    if (evt.timestamp < ipEntry.firstSeen) ipEntry.firstSeen = evt.timestamp;
    if (evt.timestamp > ipEntry.lastSeen) ipEntry.lastSeen = evt.timestamp;
    ipEntry.screens[evt.screen] = (ipEntry.screens[evt.screen] || 0) + 1;

    // Process Screen
    let scEntry = screenMap.get(evt.screen);
    if (!scEntry) {
      scEntry = {
        screen: evt.screen,
        path: evt.path,
        clicks: 0,
        ips: new Set<string>(),
        lastClickTime: evt.timestamp,
      };
      screenMap.set(evt.screen, scEntry);
    }
    scEntry.clicks += 1;
    scEntry.ips.add(evt.ip);
    if (evt.timestamp > scEntry.lastClickTime) scEntry.lastClickTime = evt.timestamp;

    // Process Geo
    const geoKey = `${city}_${country}`;
    let gEntry = geoMap.get(geoKey);
    if (!gEntry) {
      gEntry = {
        city,
        country,
        countryCode,
        clicks: 0,
        ips: new Set<string>(),
      };
      geoMap.set(geoKey, gEntry);
    }
    gEntry.clicks += 1;
    gEntry.ips.add(evt.ip);
  }

  const uniqueIps = ipMap.size;

  // Build IpStat array
  const ipStats: IpStat[] = Array.from(ipMap.values())
    .map((item) => {
      let topScreen = "-";
      let maxScClicks = 0;
      for (const [sName, sCount] of Object.entries(item.screens)) {
        if (sCount > maxScClicks) {
          maxScClicks = sCount;
          topScreen = sName;
        }
      }
      return {
        ip: item.ip,
        city: item.city,
        country: item.country,
        countryCode: item.countryCode,
        totalClicks: item.totalClicks,
        firstSeen: item.firstSeen,
        lastSeen: item.lastSeen,
        device: item.device,
        screens: item.screens,
        topScreen,
        isLocal: isLocalIp(item.ip),
      };
    })
    .sort((a, b) => b.totalClicks - a.totalClicks);

  // Build ScreenStat array
  const screenStats: ScreenStat[] = Array.from(screenMap.values())
    .map((item) => ({
      screen: item.screen,
      path: item.path,
      clicks: item.clicks,
      uniqueIps: item.ips.size,
      percentage: totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 100) : 0,
      lastClickTime: item.lastClickTime,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  // Build GeoStat array
  const geoStats: GeoStat[] = Array.from(geoMap.values())
    .map((item) => ({
      city: item.city,
      country: item.country,
      countryCode: item.countryCode,
      clicks: item.clicks,
      uniqueIps: item.ips.size,
      percentage: totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 100) : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  // Most visited screen and most active IP
  const mostVisitedScreen =
    screenStats.length > 0 ? { screen: screenStats[0].screen, clicks: screenStats[0].clicks } : null;

  const mostActiveIp =
    ipStats.length > 0
      ? {
          ip: ipStats[0].ip,
          clicks: ipStats[0].totalClicks,
          city: ipStats[0].city,
          country: ipStats[0].country,
        }
      : null;

  const topLocation =
    geoStats.length > 0
      ? { city: geoStats[0].city, country: geoStats[0].country, clicks: geoStats[0].clicks }
      : null;

  // Build Timeline Buckets based on timeframe
  const timeline: TimelineBucket[] = [];

  if (timeframe === "realtime") {
    for (let i = 14; i >= 0; i--) {
      const bucketStart = now - (i + 1) * 60 * 1000;
      const bucketEnd = now - i * 60 * 1000;
      const bDate = new Date(bucketEnd);
      const label = `${String(bDate.getHours()).padStart(2, "0")}:${String(bDate.getMinutes()).padStart(2, "0")}`;

      const bucketEvents = filtered.filter(
        (e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd
      );
      const ips = new Set(bucketEvents.map((e) => e.ip));

      timeline.push({
        label,
        timestamp: bucketEnd,
        count: bucketEvents.length,
        uniqueIps: ips.size,
      });
    }
  } else if (timeframe === "hourly") {
    for (let i = 23; i >= 0; i--) {
      const bucketStart = now - (i + 1) * 60 * 60 * 1000;
      const bucketEnd = now - i * 60 * 60 * 1000;
      const bDate = new Date(bucketEnd);
      const label = `${String(bDate.getHours()).padStart(2, "0")}:00`;

      const bucketEvents = filtered.filter(
        (e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd
      );
      const ips = new Set(bucketEvents.map((e) => e.ip));

      timeline.push({
        label,
        timestamp: bucketEnd,
        count: bucketEvents.length,
        uniqueIps: ips.size,
      });
    }
  } else if (timeframe === "weekly") {
    const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    for (let i = 6; i >= 0; i--) {
      const bucketStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const bucketEnd = now - i * 24 * 60 * 60 * 1000;
      const bDate = new Date(bucketEnd);
      const label = `${dayNames[bDate.getDay()]} (${bDate.getDate()}/${bDate.getMonth() + 1})`;

      const bucketEvents = filtered.filter(
        (e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd
      );
      const ips = new Set(bucketEvents.map((e) => e.ip));

      timeline.push({
        label,
        timestamp: bucketEnd,
        count: bucketEvents.length,
        uniqueIps: ips.size,
      });
    }
  } else {
    for (let i = 14; i >= 0; i--) {
      const bucketStart = now - (i + 1) * 2 * 24 * 60 * 60 * 1000;
      const bucketEnd = now - i * 2 * 24 * 60 * 60 * 1000;
      const bDate = new Date(bucketEnd);
      const label = `${bDate.getDate()}/${bDate.getMonth() + 1}`;

      const bucketEvents = filtered.filter(
        (e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd
      );
      const ips = new Set(bucketEvents.map((e) => e.ip));

      timeline.push({
        label,
        timestamp: bucketEnd,
        count: bucketEvents.length,
        uniqueIps: ips.size,
      });
    }
  }

  // Recent 50 events
  const recentEvents = [...filtered]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return {
    timeframe,
    totalClicks,
    uniqueIps,
    realtimeActiveIps,
    mostVisitedScreen,
    mostActiveIp,
    topLocation,
    screenStats,
    ipStats,
    geoStats,
    timeline,
    recentEvents,
    serverTime: new Date(now).toISOString(),
    periodLabel,
  };
}
