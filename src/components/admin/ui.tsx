// Small presentational pieces shared by the admin pages (server-safe: no hooks).
import Link from "next/link";
import type { ReactNode } from "react";
import { STAGE_LABELS, type LeadStage } from "@/lib/leads/rules";
import { Icon } from "./Icon";

const STAGE_TONES: Record<LeadStage, string> = {
  new: "new",
  contacted: "info",
  quoted: "warn",
  sampling: "info",
  production: "info",
  delivered: "good",
  lost: "",
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span className="badge" data-tone={STAGE_TONES[stage] || undefined}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function KindBadge({ kind }: { kind: "quote" | "techpack" }) {
  return (
    <span className="badge no-dot" data-tone={kind === "techpack" ? "ink" : undefined}>
      {kind === "techpack" ? "Tech pack" : "Quote"}
    </span>
  );
}

/** Page title row: optional back link, title, badges and actions on the right. */
export function PageHead({ title, back, badges, actions }: { title: string; back?: string; badges?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="a-head">
      {back && (
        <Link className="a-back" href={back} aria-label="Back">
          <Icon name="arrowLeft" />
        </Link>
      )}
      <h1>{title}</h1>
      {badges}
      {actions && <div className="a-head-actions">{actions}</div>}
    </div>
  );
}

/** "3 Nov" style short date from an ISO string (UTC, so server and browser agree). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Builds a query string, dropping empty values. */
export function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== 0) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export type Search = Promise<Record<string, string | string[] | undefined>>;

export const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";
