"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function getScreenNameFromPath(path: string): string {
  if (!path || path === "/") return "BIST Hisseleri (Ana Sayfa)";
  if (path === "/kripto") return "Kripto Varlıklar";
  if (path === "/emtia-doviz") return "Emtia & Döviz";
  if (path === "/abd-borsasi") return "ABD Borsası (Nasdaq/S&P)";
  if (path.startsWith("/symbol/")) {
    const symbol = path.replace("/symbol/", "").toUpperCase();
    return `Hisse Detay: ${symbol}`;
  }
  if (path === "/kullanim-kilavuzu") return "Kullanım Kılavuzu";
  if (path === "/teknik-detay-klavuzu") return "Teknik Detay Kılavuzu";
  if (path === "/analitik") return "Ziyaretçi & Ekran Analitiği";

  return path;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Track page views on route changes
  useEffect(() => {
    if (!pathname) return;
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    const screenName = getScreenNameFromPath(pathname);

    // Send page view beacon/fetch
    try {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screen: screenName,
          path: pathname,
          action: "page_view",
          label: `Sayfa Ziyareti: ${screenName}`,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore network errors
    }
  }, [pathname]);

  // Track key interaction clicks (links, tabs, buttons)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const now = Date.now();
      // Throttle click events to at most 1 per 800ms
      if (now - lastClickTimeRef.current < 800) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if target or parent is a link, button or tab
      const clickable = target.closest("a, button, [role='button'], [role='tab'], [data-analytics-label]");
      if (!clickable) return;

      lastClickTimeRef.current = now;

      const explicitLabel = clickable.getAttribute("data-analytics-label");
      const text = clickable.textContent?.trim().slice(0, 40) || "";
      const screenName = getScreenNameFromPath(pathname || "/");

      const label = explicitLabel || (text ? `Tıklama: ${text}` : `Ekran Etkileşimi: ${screenName}`);

      try {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screen: screenName,
            path: pathname || "/",
            action: "click",
            label,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Ignore network errors
      }
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [pathname]);

  return null;
}
