"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminRequest } from "./api";

interface ImportResult {
  source: "sanity" | "built-in";
  products: number;
  posts: number;
  photos: number;
  skipped: number;
}

/** One-time import of the existing products and blog posts (from the old studio, else the built-in content). */
export function ImportButton({ csrf }: { csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    const r = await adminRequest<{ result: ImportResult }>("/api/admin/import/", { method: "POST", csrf });
    setBusy(false);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    const x = r.data.result;
    setMsg({
      tone: "ok",
      text: `Imported ${x.products} products and ${x.posts} blog posts${x.photos ? ` with ${x.photos} photos` : ""}${x.source === "built-in" ? " from the built-in content" : ""}.${x.skipped ? ` ${x.skipped} already existed and were left alone.` : ""}`,
    });
    router.refresh();
  };

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <button type="button" className="btn primary" onClick={() => void run()} disabled={busy}>
        {busy ? "Importing… about a minute" : "Import products and blog posts"}
      </button>
      <p className="a-msg" data-tone={msg?.tone} role="status" aria-live="polite">
        {msg?.text}
      </p>
    </div>
  );
}
