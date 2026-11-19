"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MAX_NOTE } from "@/lib/leads/rules";
import type { LeadEvent } from "@/server/leads";
import { adminRequest } from "./api";
import { LocalTime } from "./LocalTime";

/** Notes and stage changes for one lead, newest first, with a box to add a note (like Shopify's order timeline). */
export function LeadTimeline({ id, csrf, events, receivedAt }: { id: string; csrf: string; events: LeadEvent[]; receivedAt: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const r = await adminRequest(`/api/admin/leads/${id}/notes/`, { method: "POST", csrf, body: { body: text } });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setText("");
    router.refresh();
  };

  const remove = async (eventId: string) => {
    if (!window.confirm("Delete this note?")) return;
    const r = await adminRequest(`/api/admin/leads/${id}/notes/?event=${encodeURIComponent(eventId)}`, { method: "DELETE", csrf });
    if (!r.ok) setError(r.error);
    else router.refresh();
  };

  return (
    <section className="a-card" aria-labelledby="h-timeline">
      <h2 id="h-timeline">Timeline</h2>
      <form onSubmit={(e) => void add(e)} className="a-field">
        <label htmlFor="lead-note" className="sr-only">
          Add a note
        </label>
        <textarea
          id="lead-note"
          className="a-input"
          rows={3}
          maxLength={MAX_NOTE}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder="Add a note: what was agreed, the price you quoted, sample feedback…"
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p className="a-error" role="alert">
            {error}
          </p>
          <button type="submit" className="btn primary" disabled={busy || !text.trim()} style={{ marginLeft: "auto" }}>
            {busy ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>
      <ol className="a-timeline" style={{ marginTop: 12 }}>
        {events.map((ev) => (
          <li key={ev.id} data-kind={ev.kind}>
            <span className="a-timeline-body">{ev.body}</span>
            <span className="a-timeline-meta">
              <LocalTime iso={ev.createdAt} />
              {ev.kind === "note" && (
                <button type="button" className="btn plain" style={{ minHeight: 22, fontSize: 12 }} onClick={() => void remove(ev.id)}>
                  Delete
                </button>
              )}
            </span>
          </li>
        ))}
        <li data-kind="stage">
          <span className="a-timeline-body">Received from the website</span>
          <span className="a-timeline-meta">
            <LocalTime iso={receivedAt} />
          </span>
        </li>
      </ol>
    </section>
  );
}
