"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { extensionOf } from "@/lib/leads/rules";
import { UploadError, uploadFile } from "@/lib/uploads/client";
import type { Thumb } from "@/server/admin-images";
import { adminRequest } from "./api";
import { Icon } from "./Icon";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const MAX = 20 * 1024 * 1024;

/**
 * A product's photos (Shopify's Media card): the first is the cover on the rack. Upload several at once (button or
 * drag and drop), reorder, make cover, describe and remove. Photos are cropped to 3:4 and optimised on the server.
 */
export function PhotoManager({ productId, photos, csrf }: { productId: string; photos: Thumb[]; csrf: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const base = `/api/admin/products/${productId}/photos/`;

  const upload = async (files: File[]) => {
    const list = files.filter((f) => TYPES[extensionOf(f.name)]);
    if (list.length < files.length) setMsg({ tone: "error", text: "Only JPG, PNG and WebP photos can be added." });
    let added = 0;
    for (const [i, file] of list.entries()) {
      if (file.size > MAX) {
        setMsg({ tone: "error", text: `${file.name} is over 20 MB.` });
        continue;
      }
      try {
        setBusy(`Uploading ${i + 1} of ${list.length}…`);
        setProgress(0);
        const mime = TYPES[extensionOf(file.name)] ?? "image/jpeg";
        const ref = await uploadFile(file, { kind: "media", area: "incoming", csrf, mime }, setProgress);
        setBusy(`Optimising ${i + 1} of ${list.length}…`);
        const r = await adminRequest(base, { method: "POST", csrf, body: { key: ref.key } });
        if (!r.ok) throw new UploadError(r.error);
        added++;
      } catch (err) {
        setMsg({ tone: "error", text: err instanceof UploadError ? err.message : `${file.name} could not be uploaded.` });
      }
    }
    setBusy(null);
    if (added) {
      setMsg({ tone: "ok", text: `${added} photo${added > 1 ? "s" : ""} added. The site is updated.` });
      router.refresh();
    }
  };

  const setOrder = async (order: string[], done: string) => {
    setBusy("Saving…");
    const r = await adminRequest(base, { method: "PUT", csrf, body: { order } });
    setBusy(null);
    setMsg(r.ok ? { tone: "ok", text: done } : { tone: "error", text: r.error });
    if (r.ok) router.refresh();
  };

  const slots = photos.map((p) => p.slot);
  const move = (i: number, to: number) => {
    const next = [...slots];
    const [s] = next.splice(i, 1);
    if (!s) return;
    next.splice(to, 0, s);
    void setOrder(next, to === 0 ? "Cover photo changed." : "Order saved.");
  };
  const remove = (p: Thumb) => {
    if (!window.confirm(p.own ? "Remove this photo? It is deleted for good." : "Remove this photo from the product? (The site keeps the original file.)")) return;
    void setOrder(
      slots.filter((s) => s !== p.slot),
      "Photo removed.",
    );
  };
  const describe = async (p: Thumb) => {
    const alt = window.prompt("Describe the photo for people who can't see it (and for Google):", p.alt);
    if (alt === null) return;
    setBusy("Saving…");
    const r = await adminRequest(base, { method: "PATCH", csrf, body: { slot: p.slot, alt } });
    setBusy(null);
    setMsg(r.ok ? { tone: "ok", text: "Description saved." } : { tone: "error", text: r.error });
    if (r.ok) router.refresh();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void upload([...e.dataTransfer.files]);
  };

  return (
    <section className="a-card" aria-labelledby="h-media">
      <div className="a-card-head">
        <h2 id="h-media">Photos</h2>
        <span className="a-small">First photo = cover on the rack · cropped to 3:4</span>
      </div>
      <div className="a-media">
        {photos.map((p, i) => (
          <div key={p.slot} className="a-media-item">
            <div className="a-media-img">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a pre-optimised file */}
              <img src={p.src} alt={p.alt} loading="lazy" />
              {i === 0 && (
                <span className="a-media-cover badge no-dot" data-tone="ink">
                  Cover
                </span>
              )}
            </div>
            <div className="a-media-tools">
              {i > 0 && (
                <button type="button" className="btn" disabled={busy !== null} onClick={() => move(i, 0)}>
                  Make cover
                </button>
              )}
              {i > 1 && (
                <button type="button" className="btn icon" disabled={busy !== null} onClick={() => move(i, i - 1)} title="Move earlier">
                  <Icon name="arrowLeft" size={14} />
                  <span className="sr-only">Move photo {i + 1} earlier</span>
                </button>
              )}
              {p.own && (
                <button type="button" className="btn" disabled={busy !== null} onClick={() => void describe(p)}>
                  Describe
                </button>
              )}
              <button type="button" className="btn icon danger" disabled={busy !== null} onClick={() => remove(p)} title="Remove">
                <Icon name="trash" size={14} />
                <span className="sr-only">Remove photo {i + 1}</span>
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="a-drop"
          data-over={over || undefined}
          disabled={busy !== null}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <Icon name="image" />
          <span>{photos.length ? "Add photos" : "Add photos, or drop them here"}</span>
        </button>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = "";
          if (files.length) void upload(files);
        }}
      />
      {busy?.startsWith("Uploading") && (
        <div className="a-progress" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ marginTop: 10 }}>
          <i style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      )}
      <p className="a-msg" data-tone={msg?.tone} role="status" aria-live="polite" style={{ marginTop: 8 }}>
        {busy ?? msg?.text}
      </p>
    </section>
  );
}
