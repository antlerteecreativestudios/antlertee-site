"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { categories } from "@/content/products";
import type { AdminProduct } from "@/server/catalog";
import type { Thumb } from "@/server/admin-images";
import { adminRequest } from "./api";
import { Icon } from "./Icon";
import { PhotoManager } from "./PhotoManager";
import { TagInput } from "./TagInput";

interface Form {
  name: string;
  slug: string;
  status: "active" | "draft";
  category: string;
  sub: string;
  description: string;
  fabric: string;
  gsm: string;
  fit: string;
  fitNote: string;
  sizes: string[];
  colours: string[];
  finishes: string[];
  drop: string;
  leadTime: string;
  specs: { label: string; value: string }[];
  moq: string;
  featured: boolean;
  position: number;
  seoTitle: string;
  seoDescription: string;
}

function toForm(p: AdminProduct | null): Form {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    status: p?.status ?? "draft",
    category: p?.category ?? categories[0],
    sub: p?.sub ?? "",
    description: p?.description ?? "",
    fabric: p?.fabric ?? "",
    gsm: p?.gsm ? String(p.gsm) : "",
    fit: p?.fit ?? "",
    fitNote: p?.fitNote ?? "",
    sizes: p?.sizes ?? [],
    colours: p?.colours ?? [],
    finishes: p?.finishes ?? [],
    drop: p?.drop ?? "",
    leadTime: p?.leadTime ?? "",
    specs: p?.specs ?? [],
    moq: p?.moq ?? "",
    featured: p?.featured ?? false,
    position: p?.position ?? 0,
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

export interface ProductOptions {
  fits: readonly string[];
  sizes: readonly string[];
  finishes: readonly string[];
  defaultMoq: string;
  siteUrl: string;
}

/** Shopify-style product page: main column (title, description, photos, details) and a side column (status, organisation). */
export function ProductEditor({ product, photos, csrf, options }: { product: AdminProduct | null; photos: Thumb[]; csrf: string; options: ProductOptions }) {
  const router = useRouter();
  const [saved, setSaved] = useState<Form>(() => toForm(product));
  const [form, setForm] = useState<Form>(saved);
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const isNew = !product;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const body = { ...form, gsm: form.gsm.trim() ? Number(form.gsm) : null };
    const r = isNew
      ? await adminRequest<{ product: AdminProduct; errors?: Record<string, string> }>("/api/admin/products/", { method: "POST", csrf, body })
      : await adminRequest<{ product: AdminProduct }>(`/api/admin/products/${product.id}/`, { method: "PATCH", csrf, body });
    setBusy(false);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    const next = toForm(r.data.product);
    setSaved(next);
    setForm(next);
    setErrors({});
    if (isNew) {
      router.replace(`/admin/products/${r.data.product.id}/?created=1`);
    } else {
      setMsg({ tone: "ok", text: "Saved. The website is updated." });
      router.refresh();
    }
  };

  // Field errors come back with the 400 response body; adminRequest only passes the message, so re-validate the
  // obvious ones here for inline hints.
  const check = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Give the product a name.";
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) e.slug = "Use lowercase letters, numbers and dashes only.";
    if (form.gsm.trim() && !/^\d{2,3}$/.test(form.gsm.trim())) e.gsm = "Enter a whole number between 80 and 800.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const remove = async () => {
    if (!product || !window.confirm(`Delete “${product.name}” and its uploaded photos? This cannot be undone.`)) return;
    setBusy(true);
    const r = await adminRequest(`/api/admin/products/${product.id}/`, { method: "DELETE", csrf });
    setBusy(false);
    if (!r.ok) {
      setMsg({ tone: "error", text: r.error });
      return;
    }
    router.push("/admin/products/");
    router.refresh();
  };

  const field = (key: keyof Form, label: string, input: ReactNode, help?: string) => (
    <div className="a-field">
      <label htmlFor={`f-${key}`}>{label}</label>
      {input}
      {help && <p className="a-help">{help}</p>}
      {errors[key] && (
        <p className="a-error" id={`e-${key}`}>
          {errors[key]}
        </p>
      )}
    </div>
  );
  const text = (key: "name" | "slug" | "sub" | "fabric" | "fitNote" | "drop" | "leadTime" | "moq" | "seoTitle" | "gsm", max: number, placeholder?: string) => (
    <input
      id={`f-${key}`}
      className="a-input"
      value={form[key]}
      maxLength={max}
      placeholder={placeholder}
      inputMode={key === "gsm" ? "numeric" : undefined}
      aria-invalid={errors[key] ? true : undefined}
      aria-describedby={errors[key] ? `e-${key}` : undefined}
      onChange={(e) => {
        if (key === "slug") setSlugTouched(true);
        set(key, e.currentTarget.value);
      }}
    />
  );

  const url = `${options.siteUrl}/products/${form.slug || "your-product"}/`;
  const seoTitle = form.seoTitle || form.name || "Product name";
  const seoDesc = form.seoDescription || form.description.slice(0, 155) || "A short description shows here.";

  return (
    <form
      className="a-page wide"
      onSubmit={(e) => {
        e.preventDefault();
        if (check()) void save();
      }}
    >
      {(dirty || isNew) && (
        <div className="a-savebar" role="region" aria-label="Unsaved changes">
          <strong>{isNew ? "New product" : "Unsaved changes"}</strong>
          <div className="a-savebar-actions">
            {!isNew && (
              <button type="button" className="btn" onClick={() => setForm(saved)} disabled={busy}>
                Discard
              </button>
            )}
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
      <div className="a-head">
        <Link className="a-back" href="/admin/products/" aria-label="Back to products">
          <Icon name="arrowLeft" />
        </Link>
        <h1>{isNew ? "Add product" : saved.name}</h1>
        {!isNew && (
          <span className="badge" data-tone={saved.status === "active" ? "good" : "info"}>
            {saved.status === "active" ? "Active" : "Draft"}
          </span>
        )}
        {!isNew && saved.status === "active" && (
          <div className="a-head-actions">
            <a className="btn" href={`/products/${saved.slug}/`} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={16} /> View on site
            </a>
          </div>
        )}
      </div>
      <p className="a-msg" data-tone={msg?.tone} role="status" aria-live="polite">
        {msg?.text}
      </p>

      <div className="a-cols">
        <div className="a-stack">
          <section className="a-card">
            {field("name", "Title", text("name", 80, "e.g. Heavyweight acid-wash hoodie"))}
            {field(
              "description",
              "Description",
              <textarea id="f-description" className="a-input" rows={6} maxLength={2000} value={form.description} onChange={(e) => set("description", e.currentTarget.value)} />,
              "What it is, the fabric and the finish, in two or three sentences.",
            )}
          </section>

          {product ? (
            <PhotoManager productId={product.id} photos={photos} csrf={csrf} />
          ) : (
            <section className="a-card">
              <h2>Photos</h2>
              <p className="a-sub">Save the product first, then add its photos here.</p>
            </section>
          )}

          <section className="a-card" aria-labelledby="h-details">
            <h2 id="h-details">Fabric and fit</h2>
            <div className="a-row">
              {field("fabric", "Fabric", text("fabric", 80, "e.g. 100% cotton french terry"))}
              {field("gsm", "Weight (GSM)", text("gsm", 3, "e.g. 400"))}
            </div>
            <div className="a-row">
              {field(
                "fit",
                "Fit",
                <select id="f-fit" className="a-input" value={form.fit} onChange={(e) => set("fit", e.currentTarget.value)}>
                  <option value="">Not set</option>
                  {[...new Set([...options.fits, form.fit].filter(Boolean))].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>,
              )}
              {field("fitNote", "Fit details", text("fitNote", 80, "e.g. dropped shoulders"))}
            </div>
            <fieldset className="a-field" style={{ border: 0, padding: 0, margin: "12px 0 0" }}>
              <legend className="a-label">Sizes</legend>
              <div className="a-checks">
                {options.sizes.map((s) => (
                  <label key={s} className="a-chip">
                    <input
                      type="checkbox"
                      checked={form.sizes.includes(s)}
                      onChange={(e) => set("sizes", e.currentTarget.checked ? options.sizes.filter((x) => x === s || form.sizes.includes(x)) : form.sizes.filter((x) => x !== s))}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="a-field" style={{ marginTop: 12 }}>
              <label htmlFor="f-colours">Colours</label>
              <TagInput id="f-colours" value={form.colours} onChange={(v) => set("colours", v)} placeholder="Type a colour and press Enter" />
            </div>
            <fieldset className="a-field" style={{ border: 0, padding: 0, margin: "12px 0 0" }}>
              <legend className="a-label">Finishes and decoration</legend>
              <div className="a-checks">
                {[...new Set([...options.finishes, ...form.finishes])].map((f) => (
                  <label key={f} className="a-chip">
                    <input
                      type="checkbox"
                      checked={form.finishes.includes(f)}
                      onChange={(e) => set("finishes", e.currentTarget.checked ? [...form.finishes, f] : form.finishes.filter((x) => x !== f))}
                    />
                    <span>{f}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="a-row" style={{ marginTop: 12 }}>
              {field("drop", "Drop or collection", text("drop", 60, "e.g. Winter 26–27"))}
              {field("leadTime", "Delivery time", text("leadTime", 60, "e.g. 3–4 weeks"))}
            </div>
          </section>

          <section className="a-card" aria-labelledby="h-specs">
            <div className="a-card-head">
              <h2 id="h-specs">Extra details</h2>
              <button type="button" className="btn" onClick={() => set("specs", [...form.specs, { label: "", value: "" }])} disabled={form.specs.length >= 12}>
                <Icon name="plus" size={16} /> Add row
              </button>
            </div>
            {form.specs.length === 0 ? (
              <p className="a-sub">Extra rows for the product page, e.g. “Print: puff print on chest”.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {form.specs.map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr) auto", gap: 8 }}>
                    <input
                      className="a-input"
                      aria-label={`Row ${i + 1} label`}
                      placeholder="Label"
                      maxLength={30}
                      value={s.label}
                      onChange={(e) => set("specs", form.specs.map((x, j) => (j === i ? { ...x, label: e.currentTarget.value } : x)))}
                    />
                    <input
                      className="a-input"
                      aria-label={`Row ${i + 1} value`}
                      placeholder="Value"
                      maxLength={120}
                      value={s.value}
                      onChange={(e) => set("specs", form.specs.map((x, j) => (j === i ? { ...x, value: e.currentTarget.value } : x)))}
                    />
                    <button type="button" className="btn icon" onClick={() => set("specs", form.specs.filter((_, j) => j !== i))}>
                      <Icon name="trash" size={16} />
                      <span className="sr-only">Remove row {i + 1}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="a-card" aria-labelledby="h-seo">
            <h2 id="h-seo">How it looks on Google</h2>
            <div className="a-serp" aria-label="Preview">
              <span className="a-serp-url">{url}</span>
              <span className="a-serp-title">{seoTitle}</span>
              <span className="a-serp-desc">{seoDesc}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              {field("seoTitle", "Title on Google", text("seoTitle", 70, form.name), `${form.seoTitle.length} of 70 characters. Leave empty to use the title.`)}
              {field(
                "seoDescription",
                "Description on Google",
                <textarea id="f-seoDescription" className="a-input" rows={3} maxLength={160} value={form.seoDescription} onChange={(e) => set("seoDescription", e.currentTarget.value)} />,
                `${form.seoDescription.length} of 160 characters. Leave empty to use the description.`,
              )}
              {field("slug", "Web address", text("slug", 80), "The last part of the link, e.g. /products/heavyweight-hoodie. Changing it breaks links people already shared.")}
            </div>
          </section>
        </div>

        <div className="a-stack">
          <section className="a-card" aria-labelledby="h-status">
            <h2 id="h-status">Status</h2>
            <label htmlFor="f-status" className="sr-only">
              Status
            </label>
            <select id="f-status" className="a-input" value={form.status} onChange={(e) => set("status", e.currentTarget.value === "active" ? "active" : "draft")}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <p className="a-help" style={{ marginTop: 6 }}>
              {form.status === "active" ? "Shown on the website." : "Hidden from the website until you make it active."}
            </p>
          </section>
          <section className="a-card" aria-labelledby="h-org">
            <h2 id="h-org">Where it shows</h2>
            {field(
              "category",
              "Category",
              <select id="f-category" className="a-input" value={form.category} onChange={(e) => set("category", e.currentTarget.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>,
            )}
            {field("sub", "Short label", text("sub", 40, "e.g. 300 GSM"), "Shown under the name on the rack.")}
            <div className="a-field" style={{ marginTop: 12 }}>
              <label className="a-switch">
                <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.currentTarget.checked)} />
                <span>Show on the home page</span>
              </label>
            </div>
          </section>
          <section className="a-card" aria-labelledby="h-order">
            <h2 id="h-order">Ordering</h2>
            {field("moq", "Minimum order", text("moq", 80, options.defaultMoq), "Leave empty to use the standard minimum.")}
          </section>
          {!isNew && (
            <button type="button" className="btn danger" onClick={() => void remove()} disabled={busy}>
              <Icon name="trash" size={16} /> Delete product
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
