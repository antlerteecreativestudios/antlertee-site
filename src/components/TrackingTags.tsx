"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { CONNECTIONS, type ActiveConnections } from "@/lib/connections";

/**
 * Tracking tags switched on in the admin (Settings → Connections). Public pages only: never on /admin. Every id was
 * validated against a strict pattern when it was saved and is checked again here, so only the expected characters can
 * reach these inline scripts.
 */
interface TrackingWindow {
  fbq?: (...args: unknown[]) => void;
  ttq?: { page?: () => void };
}

export function TrackingTags({ ids }: { ids: ActiveConnections }) {
  const path = usePathname() ?? "";
  // The base codes count the first page only; pages after that change without a reload, so report each one. (GA4 and
  // Clarity follow page changes on their own.)
  const firstPath = useRef<string | null>(null);
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    if (firstPath.current === null) {
      firstPath.current = path;
      return;
    }
    const w = window as unknown as TrackingWindow;
    w.fbq?.("track", "PageView");
    w.ttq?.page?.();
  }, [path]);
  if (path.startsWith("/admin")) return null;
  const ok = (key: keyof ActiveConnections): string | null => {
    const id = ids[key];
    const def = CONNECTIONS.find((c) => c.key === key);
    return id && def?.pattern.test(id) ? id : null;
  };
  const meta = ok("metaPixel");
  const ga4 = ok("ga4");
  const gtm = ok("gtm");
  const tiktok = ok("tiktok");
  const clarity = ok("clarity");

  return (
    <>
      {meta && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- Meta's no-JavaScript fallback beacon */}
          <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${meta}&ev=PageView&noscript=1`} />
        </noscript>
      )}
      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      )}
      {ga4 && (
        <>
          <Script id="ga4-src" src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      )}
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}
      {tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}
      {clarity && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
        </Script>
      )}
    </>
  );
}
