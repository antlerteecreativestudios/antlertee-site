"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LEAD_STAGES, STAGE_LABELS, type LeadStage, type LeadStatus } from "@/lib/leads/rules";
import { adminRequest } from "./api";

/** Right-hand panel of a lead: pipeline stage, inbox state (unread / archived / spam) and delete. Opening marks it read. */
export function LeadControls({ id, stage, status, csrf, back }: { id: string; stage: LeadStage; status: LeadStatus; csrf: string; back: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const autoRead = useRef(false);

  const patch = async (body: { stage?: LeadStage; status?: LeadStatus }, done?: string) => {
    setBusy(true);
    const r = await adminRequest(`/api/admin/leads/${id}/`, { method: "PATCH", csrf, body });
    setBusy(false);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    if (done) setMsg({ tone: "ok", text: done });
    router.refresh();
  };

  useEffect(() => {
    if (status === "new" && !autoRead.current) {
      autoRead.current = true;
      void patch({ status: "read" });
    }
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async () => {
    if (!window.confirm("Delete this lead, its notes and its files for good? This cannot be undone.")) return;
    setBusy(true);
    const r = await adminRequest(`/api/admin/leads/${id}/`, { method: "DELETE", csrf });
    if (!r.ok) {
      setBusy(false);
      setMsg({ tone: "error", text: r.error });
      return;
    }
    router.push(back);
    router.refresh();
  };

  return (
    <section className="a-card" aria-labelledby="h-stage">
      <h2 id="h-stage">Stage</h2>
      <div className="a-field">
        <label htmlFor="lead-stage" className="sr-only">
          Stage
        </label>
        <select
          id="lead-stage"
          className="a-input"
          value={stage}
          disabled={busy || status === "spam"}
          onChange={(e) => void patch({ stage: e.currentTarget.value as LeadStage }, `Moved to ${STAGE_LABELS[e.currentTarget.value as LeadStage]}.`)}
        >
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="a-help">Move the lead along as the order progresses: New (just arrived), Contacted, Quoted, Sampling, In production, Delivered. Use Lost if it didn&apos;t go ahead. Each change is noted on the timeline.</p>
      </div>
      <div className="a-media-tools" style={{ marginTop: 14 }}>
        {status !== "new" && (
          <button type="button" className="btn" disabled={busy} onClick={() => void patch({ status: "new" }, "Marked unread.")}>
            Mark unread
          </button>
        )}
        {status === "done" ? (
          <button type="button" className="btn" disabled={busy} onClick={() => void patch({ status: "read" }, "Back in the inbox.")}>
            Unarchive
          </button>
        ) : (
          <button type="button" className="btn" disabled={busy} onClick={() => void patch({ status: "done" }, "Archived.")}>
            Archive
          </button>
        )}
        {status === "spam" ? (
          <button type="button" className="btn" disabled={busy} onClick={() => void patch({ status: "read" }, "Not spam.")}>
            Not spam
          </button>
        ) : (
          <button type="button" className="btn" disabled={busy} onClick={() => void patch({ status: "spam" }, "Marked as spam.")}>
            Spam
          </button>
        )}
        <button type="button" className="btn danger" disabled={busy} onClick={() => void remove()}>
          Delete
        </button>
      </div>
      <p className="a-msg" data-tone={msg?.tone} role="status" aria-live="polite" style={{ marginTop: 8 }}>
        {msg?.text}
      </p>
    </section>
  );
}
