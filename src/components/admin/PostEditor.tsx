"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { Block } from "@/content/blog";
import { extensionOf } from "@/lib/leads/rules";
import { UploadError, uploadFile } from "@/lib/uploads/client";
import type { Thumb } from "@/server/admin-images";
import type { AdminPost } from "@/server/catalog";
import { adminRequest } from "./api";
import { Icon } from "./Icon";

interface Form {
  title: string;
  slug: string;
  status: "published" | "draft";
  summary: string;
  date: string;
  tag: string;
  body: Block[];
  seoTitle: string;
  seoDescription: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function toForm(p: AdminPost | null): Form {
  return {
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    status: p?.status ?? "draft",
    summary: p?.summary ?? "",
    date: p?.date || today(),
    tag: p?.tag ?? "",
    body: p?.body ?? [{ type: "p", text: "" }],
    seoTitle: p?.seoTitle ?? "",
    seoDescription: p?.seoDescription ?? "",
  };
}

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const BLOCK_LABEL: Record<Block["type"], string> = { p: "Paragraph", h2: "Heading", ul: "Bullet list", note: "Highlighted note" };
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Shopify-style blog post editor: title, summary, body blocks and cover photo; visibility, date, topic and search listing aside. */
export function PostEditor({ post, cover, csrf, siteUrl }: { post: AdminPost | null; cover: Thumb | null; csrf: string; siteUrl: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState<Form>(() => toForm(post));
  const [form, setForm] = useState<Form>(saved);
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const isNew = !post;

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });

  const setBlock = (i: number, b: Block) => set("body", form.body.map((x, j) => (j === i ? b : x)));
  const moveBlock = (i: number, by: -1 | 1) => {
    const to = i + by;
    if (to < 0 || to >= form.body.length) return;
    const next = [...form.body];
    const [b] = next.splice(i, 1);
    if (!b) return;
    next.splice(to, 0, b);
    set("body", next);
  };
  const addBlock = (type: Block["type"]) => set("body", [...form.body, type === "ul" ? { type, items: [""] } : { type, text: "" }]);

  const save = async () => {
    if (!form.title.trim()) {
      setMsg({ tone: "error", text: "Give the post a title." });
      return;
    }
    setBusy("Saving…");
    setMsg(null);
    const body = { ...form, body: form.body.map((b) => (b.type === "ul" ? { ...b, items: b.items.filter((i) => i.trim()) } : b)) };
    const r = isNew
      ? await adminRequest<{ post: AdminPost }>("/api/admin/posts/", { method: "POST", csrf, body })
      : await adminRequest<{ post: AdminPost }>(`/api/admin/posts/${post.id}/`, { method: "PATCH", csrf, body });
    setBusy(null);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    const next = toForm(r.data.post);
    setSaved(next);
    setForm(next);
    if (isNew) router.replace(`/admin/blog/${r.data.post.id}/`);
    else {
      setMsg({ tone: "ok", text: next.status === "published" ? "Saved. The post is live." : "Saved as a draft." });
      router.refresh();
    }
  };

  const uploadCover = async (file: File) => {
    if (!post) return;
    const mime = TYPES[extensionOf(file.name)];
    if (!mime) {
      setMsg({ tone: "error", text: "Use a JPG, PNG or WebP photo." });
      return;
    }
    try {
      setBusy("Uploading…");
      const ref = await uploadFile(file, { kind: "media", area: "incoming", csrf, mime }, () => undefined);
      setBusy("Optimising…");
      const r = await adminRequest(`/api/admin/posts/${post.id}/photo/`, { method: "POST", csrf, body: { key: ref.key } });
      if (!r.ok) throw new UploadError(r.error);
      setMsg({ tone: "ok", text: "Cover photo updated." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof UploadError ? err.message : "The upload failed. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const removeCover = async () => {
    if (!post || !window.confirm("Remove the cover photo? The post will show the default photo.")) return;
    setBusy("Removing…");
    const r = await adminRequest(`/api/admin/posts/${post.id}/photo/`, { method: "DELETE", csrf });
    setBusy(null);
    if (r.ok) router.refresh();
    else setMsg({ tone: "error", text: r.error });
  };

  const remove = async () => {
    if (!post || !window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setBusy("Deleting…");
    const r = await adminRequest(`/api/admin/posts/${post.id}/`, { method: "DELETE", csrf });
    setBusy(null);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    router.push("/admin/blog/");
    router.refresh();
  };

  const url = `${siteUrl}/blog/${form.slug || "your-post"}/`;

  return (
    <form
      className="a-page wide"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {(dirty || isNew) && (
        <div className="a-savebar" role="region" aria-label="Unsaved changes">
          <strong>{isNew ? "New blog post" : "Unsaved changes"}</strong>
          <div className="a-savebar-actions">
            {!isNew && (
              <button type="button" className="btn" onClick={() => setForm(saved)} disabled={busy !== null}>
                Discard
              </button>
            )}
            <button type="submit" className="btn primary" disabled={busy !== null}>
              {busy === "Saving…" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
      <div className="a-head">
        <Link className="a-back" href="/admin/blog/" aria-label="Back to blog posts">
          <Icon name="arrowLeft" />
        </Link>
        <h1>{isNew ? "Write a blog post" : saved.title}</h1>
        {!isNew && (
          <span className="badge" data-tone={saved.status === "published" ? "good" : "info"}>
            {saved.status === "published" ? "Published" : "Draft"}
          </span>
        )}
        {!isNew && saved.status === "published" && (
          <div className="a-head-actions">
            <a className="btn" href={`/blog/${saved.slug}/`} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={16} /> View on site
            </a>
          </div>
        )}
      </div>
      <p className="a-msg" data-tone={msg?.tone} role="status" aria-live="polite">
        {busy && busy !== "Saving…" ? busy : msg?.text}
      </p>

      <div className="a-cols">
        <div className="a-stack">
          <section className="a-card">
            <div className="a-field">
              <label htmlFor="p-title">Title</label>
              <input id="p-title" className="a-input" maxLength={120} value={form.title} onChange={(e) => set("title", e.currentTarget.value)} placeholder="e.g. How to choose the right GSM for a hoodie" />
            </div>
            <div className="a-field">
              <label htmlFor="p-summary">Summary</label>
              <textarea id="p-summary" className="a-input" rows={2} maxLength={300} value={form.summary} onChange={(e) => set("summary", e.currentTarget.value)} />
              <p className="a-help">One sentence for the blog card and link previews.</p>
            </div>
          </section>

          <section className="a-card" aria-labelledby="h-body">
            <h2 id="h-body">Content</h2>
            <p className="a-help" style={{ marginTop: -6, marginBottom: 10 }}>Build the post from blocks: add a paragraph, a heading, a bullet list or a highlighted note, and use the arrows to reorder.</p>
            <div className="a-blocks">
              {form.body.map((b, i) => (
                <div key={i} className="a-block" data-type={b.type}>
                  <span className="a-block-kind">{BLOCK_LABEL[b.type]}</span>
                  {b.type === "ul" ? (
                    <textarea
                      className="a-input"
                      aria-label={`Bullet list ${i + 1}, one point per line`}
                      rows={Math.max(3, b.items.length + 1)}
                      value={b.items.join("\n")}
                      placeholder="One point per line"
                      onChange={(e) => setBlock(i, { type: "ul", items: e.currentTarget.value.split("\n") })}
                    />
                  ) : (
                    <textarea
                      className="a-input"
                      aria-label={`${BLOCK_LABEL[b.type]} ${i + 1}`}
                      rows={b.type === "h2" ? 1 : 4}
                      value={b.text}
                      onChange={(e) => setBlock(i, { type: b.type, text: e.currentTarget.value })}
                    />
                  )}
                  <div className="a-block-tools">
                    <button type="button" className="btn" onClick={() => moveBlock(i, -1)} disabled={i === 0} title="Move up">
                      <Icon name="up" size={14} />
                      <span className="sr-only">Move block {i + 1} up</span>
                    </button>
                    <button type="button" className="btn" onClick={() => moveBlock(i, 1)} disabled={i === form.body.length - 1} title="Move down">
                      <Icon name="down" size={14} />
                      <span className="sr-only">Move block {i + 1} down</span>
                    </button>
                    <button type="button" className="btn danger" onClick={() => set("body", form.body.filter((_, j) => j !== i))} title="Remove">
                      <Icon name="trash" size={14} />
                      <span className="sr-only">Remove block {i + 1}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="a-add-block" style={{ marginTop: 10 }}>
              {(["p", "h2", "ul", "note"] as const).map((t) => (
                <button key={t} type="button" className="btn" onClick={() => addBlock(t)}>
                  <Icon name="plus" size={14} /> {BLOCK_LABEL[t]}
                </button>
              ))}
            </div>
          </section>

          <section className="a-card" aria-labelledby="h-seo">
            <h2 id="h-seo">How it looks on Google</h2>
            <div className="a-serp">
              <span className="a-serp-url">{url}</span>
              <span className="a-serp-title">{form.seoTitle || form.title || "Post title"}</span>
              <span className="a-serp-desc">{form.seoDescription || form.summary || "The summary shows here."}</span>
            </div>
            <div className="a-field" style={{ marginTop: 12 }}>
              <label htmlFor="p-seoTitle">Title on Google</label>
              <input id="p-seoTitle" className="a-input" maxLength={70} value={form.seoTitle} placeholder={form.title} onChange={(e) => set("seoTitle", e.currentTarget.value)} />
              <p className="a-help">{form.seoTitle.length} of 70 characters. Leave empty to use the title.</p>
            </div>
            <div className="a-field">
              <label htmlFor="p-seoDescription">Description on Google</label>
              <textarea id="p-seoDescription" className="a-input" rows={3} maxLength={160} value={form.seoDescription} onChange={(e) => set("seoDescription", e.currentTarget.value)} />
              <p className="a-help">{form.seoDescription.length} of 160 characters. Leave empty to use the summary.</p>
            </div>
            <div className="a-field">
              <label htmlFor="p-slug">Web address</label>
              <input
                id="p-slug"
                className="a-input"
                maxLength={80}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.currentTarget.value);
                }}
              />
              <p className="a-help">The last part of the link, e.g. /blog/gsm-explained. Changing it breaks links people already shared.</p>
            </div>
          </section>
        </div>

        <div className="a-stack">
          <section className="a-card" aria-labelledby="h-vis">
            <h2 id="h-vis">Visibility</h2>
            <label htmlFor="p-status" className="sr-only">
              Visibility
            </label>
            <select id="p-status" className="a-input" value={form.status} onChange={(e) => set("status", e.currentTarget.value === "published" ? "published" : "draft")}>
              <option value="published">Published</option>
              <option value="draft">Draft (hidden)</option>
            </select>
            <div className="a-field" style={{ marginTop: 12 }}>
              <label htmlFor="p-date">Date</label>
              <input id="p-date" type="date" className="a-input" value={form.date} onChange={(e) => set("date", e.currentTarget.value)} />
            </div>
            <div className="a-field">
              <label htmlFor="p-tag">Topic</label>
              <input id="p-tag" className="a-input" maxLength={30} value={form.tag} placeholder="e.g. Tech pack" onChange={(e) => set("tag", e.currentTarget.value)} />
            </div>
          </section>
          <section className="a-card" aria-labelledby="h-cover">
            <h2 id="h-cover">Cover photo</h2>
            {post ? (
              <>
                {cover && (
                  <div className="a-media-img" style={{ marginBottom: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a pre-optimised file */}
                    <img src={cover.src} alt={cover.alt} />
                  </div>
                )}
                <div className="a-media-tools">
                  <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
                    <Icon name="image" size={16} /> {cover?.own ? "Replace" : "Upload"}
                  </button>
                  {cover?.own && (
                    <button type="button" className="btn danger" onClick={() => void removeCover()} disabled={busy !== null}>
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (f) void uploadCover(f);
                  }}
                />
              </>
            ) : (
              <p className="a-sub">Save the post first, then add a cover photo.</p>
            )}
          </section>
          {!isNew && (
            <button type="button" className="btn danger" onClick={() => void remove()} disabled={busy !== null}>
              <Icon name="trash" size={16} /> Delete post
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
