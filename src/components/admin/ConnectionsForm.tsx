"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CONNECTIONS, type ConnectionKey, type Connections } from "@/lib/connections";
import { adminRequest } from "./api";

/** Settings → Connections: paste an id, switch it on, save. Checked against each service's id format before saving. */
export function ConnectionsForm({ initial, csrf }: { initial: Connections; csrf: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<ConnectionKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const update = (key: ConnectionKey, patch: Partial<Connections[ConnectionKey]>) => {
    setForm((f) => {
      const next = { ...f[key], ...patch };
      // Typing a new id switches it on; clearing the id switches it off.
      if (patch.id !== undefined) next.enabled = patch.id.trim() ? (f[key].id ? f[key].enabled : true) : false;
      return { ...f, [key]: next };
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = async () => {
    const errs: Partial<Record<ConnectionKey, string>> = {};
    for (const def of CONNECTIONS) {
      const id = form[def.key].id.trim();
      if (id && !def.pattern.test(id)) errs[def.key] = def.error;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      setMsg({ tone: "error", text: "Please fix the highlighted ids." });
      return;
    }
    const body = Object.fromEntries(CONNECTIONS.map((d) => [d.key, { id: form[d.key].id.trim(), enabled: form[d.key].enabled }]));
    setBusy(true);
    const r = await adminRequest<{ connections: Connections }>("/api/admin/settings/connections/", { method: "PUT", csrf, body });
    setBusy(false);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    setSaved(r.data.connections);
    setForm(r.data.connections);
    setMsg({ tone: "ok", text: "Saved. The website loads the switched-on tags within a minute." });
    router.refresh();
  };

  return (
    <form
      className="a-stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {dirty && (
        <div className="a-savebar" role="region" aria-label="Unsaved changes">
          <strong>Unsaved changes</strong>
          <div className="a-savebar-actions">
            <button type="button" className="btn" onClick={() => setForm(saved)} disabled={busy}>
              Discard
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
      <p className="a-msg" data-tone={msg?.tone} role="status" aria-live="polite">
        {msg?.text}
      </p>
      {CONNECTIONS.map((def) => {
        const v = form[def.key];
        const err = errors[def.key];
        return (
          <section key={def.key} className="a-card" aria-labelledby={`c-${def.key}-h`}>
            <div className="a-card-head">
              <h2 id={`c-${def.key}-h`}>{def.name}</h2>
              <span className="badge" data-tone={saved[def.key].enabled ? "good" : undefined}>
                {saved[def.key].enabled ? "Connected" : saved[def.key].id ? "Off" : "Not connected"}
              </span>
            </div>
            <p className="a-help" style={{ marginBottom: 10 }}>
              {def.help}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <div className="a-field" style={{ flex: "1 1 240px" }}>
                <label htmlFor={`c-${def.key}`} className="sr-only">
                  {def.name} id
                </label>
                <input
                  id={`c-${def.key}`}
                  className="a-input"
                  value={v.id}
                  placeholder={def.placeholder}
                  spellCheck={false}
                  autoComplete="off"
                  maxLength={100}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? `c-${def.key}-e` : undefined}
                  onChange={(e) => update(def.key, { id: e.currentTarget.value })}
                />
              </div>
              <label className="a-switch">
                <input type="checkbox" checked={v.enabled} disabled={!v.id.trim()} onChange={(e) => update(def.key, { enabled: e.currentTarget.checked })} />
                <span>On</span>
              </label>
            </div>
            {err && (
              <p className="a-error" id={`c-${def.key}-e`} style={{ marginTop: 6 }}>
                {err}
              </p>
            )}
          </section>
        );
      })}
    </form>
  );
}
