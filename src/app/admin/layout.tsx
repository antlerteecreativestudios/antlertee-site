import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { currentAdmin } from "@/server/auth/admin";
import { pipelineCounts } from "@/server/leads";
import "./admin.css";

export const metadata: Metadata = {
  title: { absolute: "Admin | Antlertee" },
  robots: { index: false, follow: false, nocache: true },
};

// Session and counts are per request.
export const dynamic = "force-dynamic";

/** Shopify-style frame (top bar + sidebar) for logged-in admins; the login page renders without it. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin: Awaited<ReturnType<typeof currentAdmin>> = null;
  try {
    admin = await currentAdmin();
  } catch {
    // Admin not configured: the login page explains it.
  }
  if (!admin) return <div className="adm adm-bare">{children}</div>;
  const unread = await pipelineCounts()
    .then((c) => c.unread)
    .catch(() => 0);
  return (
    <div className="adm">
      <AdminShell csrf={admin.csrf} unread={unread}>
        {children}
      </AdminShell>
    </div>
  );
}
