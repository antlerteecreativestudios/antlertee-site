"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The marketing site's loader, smooth scroll, nav and footer; left out on the admin pages and the content studio. */
export function SiteChrome({ before, after, children }: { before: ReactNode; after: ReactNode; children: ReactNode }) {
  const path = usePathname() ?? "";
  if (path.startsWith("/admin") || path.startsWith("/studio")) return <>{children}</>;
  return (
    <>
      {before}
      {children}
      {after}
    </>
  );
}
