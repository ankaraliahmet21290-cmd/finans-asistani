export type AnalyticsAction = "page_view" | "click";

export type DeviceType = "Masaüstü" | "Mobil" | "Tablet" | "Bilinmiyor";

export type AnalyticsTimeframe = "realtime" | "hourly" | "weekly" | "monthly" | "all";

export interface AnalyticsEvent {
  id: string;
  ip: string;
  city?: string;
  country?: string;
  countryCode?: string;
  screen: string;
  path: string;
  action: AnalyticsAction;
  label?: string;
  userAgent?: string;
  device: DeviceType;
  timestamp: number; // Unix timestamp in ms
  isoTime: string;
}

export interface ScreenStat {
  screen: string;
  path: string;
  clicks: number;
  uniqueIps: number;
  percentage: number;
  lastClickTime: number;
}

export interface IpStat {
  ip: string;
  city: string;
  country: string;
  countryCode: string;
  totalClicks: number;
  firstSeen: number;
  lastSeen: number;
  device: DeviceType;
  screens: Record<string, number>;
  topScreen: string;
  isLocal: boolean;
}

export interface GeoStat {
  city: string;
  country: string;
  countryCode: string;
  clicks: number;
  uniqueIps: number;
  percentage: number;
}

export interface TimelineBucket {
  label: string;
  timestamp: number;
  count: number;
  uniqueIps: number;
}

export interface AnalyticsSummary {
  timeframe: AnalyticsTimeframe;
  totalClicks: number;
  uniqueIps: number;
  realtimeActiveIps: number; // Last 15 minutes unique IP count
  mostVisitedScreen: { screen: string; clicks: number } | null;
  mostActiveIp: { ip: string; clicks: number; city: string; country: string } | null;
  topLocation: { city: string; country: string; clicks: number } | null;
  screenStats: ScreenStat[];
  ipStats: IpStat[];
  geoStats: GeoStat[];
  timeline: TimelineBucket[];
  recentEvents: AnalyticsEvent[];
  serverTime: string;
  periodLabel: string;
}
