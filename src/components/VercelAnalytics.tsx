"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** Admin and API visits are the team's own, not visitors: leave them out of the numbers. */
const isPrivate = (url: string): boolean => {
  try {
    const path = new URL(url).pathname;
    return path.startsWith("/admin") || path.startsWith("/api");
  } catch {
    return false;
  }
};

/**
 * Vercel Web Analytics (visitors, pages, countries, devices) and Speed Insights (real-visitor Core Web Vitals). Both are
 * cookie-free. They only collect once switched on in the Vercel dashboard (project → Analytics / Speed Insights).
 */
export function VercelAnalytics() {
  return (
    <>
      <Analytics beforeSend={(event: BeforeSendEvent) => (isPrivate(event.url) ? null : event)} />
      <SpeedInsights beforeSend={(event) => (isPrivate(event.url) ? null : event)} />
    </>
  );
}
