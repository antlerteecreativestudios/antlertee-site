// Products and blog posts: the admin's data access, input validation, photo handling and the cached reads behind
// the public pages. Parameterised SQL only. Photos reuse the site-image pipeline (media.ts): each uploaded product
// or post photo is a slot of its own ("p-<id>") in media_overrides, so every <Picture> picks it up unchanged.
import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { posts as localPosts, type Block, type Post } from "@/content/blog";
import type { ImageId } from "@/content/images";
import generatedImages from "@/content/images.generated.json";
import { categories, products as localProducts, type Category, type Product } from "@/content/products";
import { facts } from "@/content/site";
import { cleanText } from "@/lib/leads/rules";
import { ConfigError } from "./config";
import { iso, json, num, query, str, type Row } from "./db";
import { replaceSlot, resetSlot, revalidateMedia, setSlotAlt, type SlotInfo } from "./media";
import { UUID_RE } from "./leads";

export const CATALOG_TAG = "catalog";
/** Uploaded product and post photos use the same 3:4 shape as the built-in product photos. */
export const PHOTO_ASPECT = "3:4";
const PLACEHOLDER_IMAGE = "factory-own-label";

export const FITS = ["Oversized", "Oversized boxy", "Boxy", "Relaxed", "Regular", "Slim", "Cropped"] as const;
export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export const FINISHES = [
  ...new Set([...localProducts.flatMap((p) => p.finishes), "DTF print", "Appliqué", "Distressing", "Garment dye"]),
].sort();

/* ---------- types ---------- */

export type ProductStatus = "active" | "draft";
export type PostStatus = "published" | "draft";

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  status: ProductStatus;
  category: Category;
  sub: string;
  description: string;
  image: string;
  gallery: string[];
  fabric: string;
  gsm: number | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface AdminPost {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  summary: string;
  date: string;
  tag: string;
  image: string;
  body: Block[];
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
}

/** The fields the product editor sends (everything except id, photos and timestamps). */
export type ProductInput = Omit<AdminProduct, "id" | "image" | "gallery" | "createdAt" | "updatedAt">;
export type PostInput = Omit<AdminPost, "id" | "image" | "createdAt" | "updatedAt">;

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/* ---------- helpers ---------- */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isCategory = (v: unknown): v is Category => categories.some((c) => c === v);
const stringList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Cleans a list of short strings: trimmed, de-duplicated (case-insensitive), capped. */
function cleanList(v: unknown, maxItems: number, maxLen: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of stringList(v)) {
    const t = cleanText(item, maxLen);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

function wordCount(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + (b.type === "ul" ? b.items.join(" ") : b.text).split(/\s+/).filter(Boolean).length, 0);
}

export const readMinutes = (blocks: Block[]): number => Math.max(1, Math.round(wordCount(blocks) / 200));

/* ---------- validation (all input is untrusted) ---------- */

export function validateProduct(raw: unknown): Validation<ProductInput> {
  if (!isRecord(raw)) return { ok: false, errors: { form: "Invalid request." } };
  const errors: Record<string, string> = {};
  const name = cleanText(raw.name, 80);
  if (!name) errors.name = "Give the product a name.";
  const slug = cleanText(raw.slug, 80).toLowerCase() || slugify(name);
  if (!SLUG_RE.test(slug)) errors.slug = "Use lowercase letters, numbers and dashes only, e.g. heavyweight-hoodie.";
  const category = raw.category;
  if (!isCategory(category)) errors.category = "Pick a category.";
  const status: ProductStatus = raw.status === "draft" ? "draft" : "active";
  let gsm: number | null = null;
  if (raw.gsm !== null && raw.gsm !== undefined && raw.gsm !== "") {
    const n = typeof raw.gsm === "number" ? raw.gsm : Number(raw.gsm);
    if (!Number.isInteger(n) || n < 80 || n > 800) errors.gsm = "Enter a whole number between 80 and 800, e.g. 300.";
    else gsm = n;
  }
  const specs = Array.isArray(raw.specs)
    ? raw.specs.flatMap((s: unknown) => {
        if (!isRecord(s)) return [];
        const label = cleanText(s.label, 30);
        const value = cleanText(s.value, 120);
        return label && value ? [{ label, value }] : [];
      }).slice(0, 12)
    : [];
  const position = typeof raw.position === "number" && Number.isInteger(raw.position) ? Math.min(Math.max(raw.position, 0), 100_000) : 0;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      slug,
      name,
      status,
      category: category as Category,
      sub: cleanText(raw.sub, 40),
      description: cleanText(raw.description, 2000, true),
      fabric: cleanText(raw.fabric, 80),
      gsm,
      fit: cleanText(raw.fit, 40),
      fitNote: cleanText(raw.fitNote, 80),
      sizes: cleanList(raw.sizes, 12, 10),
      colours: cleanList(raw.colours, 30, 30),
      finishes: cleanList(raw.finishes, 30, 40),
      drop: cleanText(raw.drop, 60),
      leadTime: cleanText(raw.leadTime, 60),
      specs,
      moq: cleanText(raw.moq, 80),
      featured: raw.featured === true,
      position,
      seoTitle: cleanText(raw.seoTitle, 70),
      seoDescription: cleanText(raw.seoDescription, 160),
    },
  };
}

function cleanBlocks(v: unknown): Block[] {
  if (!Array.isArray(v)) return [];
  const out: Block[] = [];
  for (const b of v.slice(0, 200)) {
    if (!isRecord(b)) continue;
    if (b.type === "ul") {
      const items = stringList(b.items)
        .map((i) => cleanText(i, 500))
        .filter(Boolean)
        .slice(0, 30);
      if (items.length) out.push({ type: "ul", items });
    } else if (b.type === "p" || b.type === "h2" || b.type === "note") {
      const text = cleanText(b.text, b.type === "h2" ? 160 : 4000, b.type !== "h2");
      if (text) out.push({ type: b.type, text });
    }
  }
  return out;
}

export function validatePost(raw: unknown): Validation<PostInput> {
  if (!isRecord(raw)) return { ok: false, errors: { form: "Invalid request." } };
  const errors: Record<string, string> = {};
  const title = cleanText(raw.title, 120);
  if (!title) errors.title = "Give the post a title.";
  const slug = cleanText(raw.slug, 80).toLowerCase() || slugify(title);
  if (!SLUG_RE.test(slug)) errors.slug = "Use lowercase letters, numbers and dashes only.";
  const date = cleanText(raw.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.date = "Pick a date.";
  const body = cleanBlocks(raw.body);
  const status: PostStatus = raw.status === "draft" ? "draft" : "published";
  if (status === "published" && body.length === 0) errors.body = "Write something before publishing, or save it as a draft.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      slug,
      title,
      status,
      summary: cleanText(raw.summary, 300),
      date,
      tag: cleanText(raw.tag, 30),
      body,
      seoTitle: cleanText(raw.seoTitle, 70),
      seoDescription: cleanText(raw.seoDescription, 160),
    },
  };
}

/* ---------- row mapping ---------- */

function toAdminProduct(r: Row): AdminProduct {
  const gallery = json(r.gallery);
  const specs = json(r.specs);
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    status: str(r.status) === "draft" ? "draft" : "active",
    category: isCategory(r.category) ? r.category : categories[0],
    sub: str(r.sub),
    description: str(r.description),
    image: str(r.image),
    gallery: Array.isArray(gallery) ? gallery.flatMap((g: unknown) => (isRecord(g) && typeof g.image === "string" ? [g.image] : [])) : [],
    fabric: str(r.fabric),
    gsm: r.gsm == null ? null : num(r.gsm),
    fit: str(r.fit),
    fitNote: str(r.fit_note),
    sizes: stringList(json(r.sizes)),
    colours: stringList(json(r.colours)),
    finishes: stringList(json(r.finishes)),
    drop: str(r.drop_name),
    leadTime: str(r.lead_time),
    specs: Array.isArray(specs) ? specs.flatMap((s: unknown) => (isRecord(s) ? [{ label: str(s.label), value: str(s.value) }] : [])) : [],
    moq: str(r.moq),
    featured: r.featured === true,
    position: num(r.position),
    seoTitle: str(r.seo_title),
    seoDescription: str(r.seo_description),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toAdminPost(r: Row): AdminPost {
  return {
    id: str(r.id),
    slug: str(r.slug),
    title: str(r.title),
    status: str(r.status) === "draft" ? "draft" : "published",
    summary: str(r.summary),
    date: str(r.date_s),
    tag: str(r.tag),
    image: str(r.image),
    body: cleanBlocks(json(r.body)),
    seoTitle: str(r.seo_title),
    seoDescription: str(r.seo_description),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const POST_COLUMNS = `*, to_char(date, 'YYYY-MM-DD') AS date_s`;

/** The spec rows on the product page: the structured boxes first, then extra rows whose label is not already used. */
export function buildSpecs(p: Pick<AdminProduct, "fabric" | "gsm" | "fit" | "fitNote" | "sizes" | "colours" | "drop" | "leadTime" | "specs">) {
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, value: string | undefined) => {
    if (value) rows.push({ label, value });
  };
  add("Fabric", p.fabric || undefined);
  add("Weight", p.gsm ? `${p.gsm} GSM` : undefined);
  add("Fit", p.fit && p.fitNote ? `${p.fit}, ${p.fitNote}` : p.fit || p.fitNote || undefined);
  add("Sizes", p.sizes.join(", ") || undefined);
  add("Colour", p.colours.join(", ") || undefined);
  add("Drop", p.drop || undefined);
  add("Delivery", p.leadTime || undefined);
  const taken = new Set(rows.map((r) => r.label.toLowerCase()));
  return [...rows, ...p.specs.filter((s) => !taken.has(s.label.toLowerCase()))];
}

const slotOrPlaceholder = (id: string): ImageId => (id || PLACEHOLDER_IMAGE) as ImageId;

function toPublicProduct(p: AdminProduct): Product {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    sub: p.sub,
    image: slotOrPlaceholder(p.image),
    gallery: p.gallery.length ? p.gallery.map((g) => ({ image: g as ImageId })) : undefined,
    description: p.description,
    specs: buildSpecs(p),
    finishes: p.finishes,
    moq: p.moq || facts.moqLong,
    featured: p.featured,
    seoTitle: p.seoTitle || undefined,
    seoDescription: p.seoDescription || undefined,
    updatedAt: p.updatedAt || undefined,
  };
}

function toPublicPost(p: AdminPost): Post {
  return {
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    date: p.date,
    readMinutes: readMinutes(p.body),
    tag: p.tag,
    image: slotOrPlaceholder(p.image),
    body: p.body,
    seoTitle: p.seoTitle || undefined,
    seoDescription: p.seoDescription || undefined,
    updatedAt: p.updatedAt || undefined,
  };
}

/* ---------- public reads (cached; never throw) ---------- */

declare global {
  var __acsWarnedCatalog: boolean | undefined;
}

function warnOnce(err: unknown) {
  if (globalThis.__acsWarnedCatalog) return;
  globalThis.__acsWarnedCatalog = true;
  console.warn(
    err instanceof ConfigError
      ? "[catalog] DATABASE_URL is not set: pages use the built-in products and posts."
      : "[catalog] could not read products/posts from the database: pages use the built-in content.",
  );
}

/**
 * Public products: the active ones in shelf order. Until anything has been saved in the admin (empty table), or if the
 * database cannot be reached, the site shows its built-in content so it never goes blank.
 */
async function readPublicProducts(): Promise<Product[]> {
  try {
    const rows = await query("SELECT * FROM products ORDER BY position, name");
    if (rows.length === 0) return localProducts;
    return rows.map(toAdminProduct).filter((p) => p.status === "active").map(toPublicProduct);
  } catch (err) {
    warnOnce(err);
    return localProducts;
  }
}

async function readPublicPosts(): Promise<Post[]> {
  try {
    const rows = await query(`SELECT ${POST_COLUMNS} FROM posts ORDER BY date DESC, created_at DESC`);
    if (rows.length === 0) return localPosts;
    return rows.map(toAdminPost).filter((p) => p.status === "published").map(toPublicPost);
  } catch (err) {
    warnOnce(err);
    return localPosts;
  }
}

export const getPublicProducts = unstable_cache(readPublicProducts, ["catalog-products-v1"], { tags: [CATALOG_TAG], revalidate: 300 });
export const getPublicPosts = unstable_cache(readPublicPosts, ["catalog-posts-v1"], { tags: [CATALOG_TAG], revalidate: 300 });

/** Rebuilds the statically generated pages so an admin edit is live without a redeploy. */
export function revalidateCatalog(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

/* ---------- admin: products ---------- */

export interface ProductFilter {
  q?: string;
  status?: ProductStatus;
  category?: Category;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listAdminProducts(filter: ProductFilter = {}): Promise<AdminProduct[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`status = $${params.length}`);
  }
  if (filter.category) {
    params.push(filter.category);
    where.push(`category = $${params.length}`);
  }
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    where.push(`(name ILIKE $${params.length} OR slug ILIKE $${params.length} OR fabric ILIKE $${params.length})`);
  }
  const rows = await query(`SELECT * FROM products ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY position, name LIMIT 1000`, params);
  return rows.map(toAdminProduct);
}

export async function productCounts(): Promise<{ all: number; active: number; draft: number }> {
  const rows = await query("SELECT status, count(*) AS n FROM products GROUP BY status");
  const out = { all: 0, active: 0, draft: 0 };
  for (const r of rows) {
    const s = str(r.status) === "draft" ? "draft" : "active";
    out[s] += num(r.n);
    out.all += num(r.n);
  }
  return out;
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  if (!UUID_RE.test(id)) return null;
  const rows = await query("SELECT * FROM products WHERE id = $1", [id]);
  return rows[0] ? toAdminProduct(rows[0]) : null;
}

export class SlugTakenError extends Error {}

const isUniqueViolation = (err: unknown) => typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23505";

function productParams(v: ProductInput): unknown[] {
  return [
    v.slug,
    v.name,
    v.status,
    v.category,
    v.sub,
    v.description,
    v.fabric,
    v.gsm,
    v.fit,
    v.fitNote,
    JSON.stringify(v.sizes),
    JSON.stringify(v.colours),
    JSON.stringify(v.finishes),
    v.drop,
    v.leadTime,
    JSON.stringify(v.specs),
    v.moq,
    v.featured,
    v.position,
    v.seoTitle,
    v.seoDescription,
  ];
}

export async function createProduct(v: ProductInput, image = ""): Promise<AdminProduct> {
  try {
    const rows = await query(
      `INSERT INTO products (slug, name, status, category, sub, description, fabric, gsm, fit, fit_note, sizes, colours, finishes,
         drop_name, lead_time, specs, moq, featured, position, seo_title, seo_description, image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16::jsonb, $17, $18,
         CASE WHEN $19::int > 0 THEN $19::int ELSE (SELECT coalesce(max(position), 0) + 10 FROM products) END, $20, $21, $22)
       RETURNING *`,
      [...productParams(v), image],
    );
    const row = rows[0];
    if (!row) throw new Error("Product insert returned nothing.");
    return toAdminProduct(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTakenError("Another product already uses this web address. Change the URL handle.");
    throw err;
  }
}

export async function updateProduct(id: string, v: ProductInput): Promise<AdminProduct | null> {
  if (!UUID_RE.test(id)) return null;
  try {
    const rows = await query(
      `UPDATE products SET slug = $1, name = $2, status = $3, category = $4, sub = $5, description = $6, fabric = $7, gsm = $8,
         fit = $9, fit_note = $10, sizes = $11::jsonb, colours = $12::jsonb, finishes = $13::jsonb, drop_name = $14, lead_time = $15,
         specs = $16::jsonb, moq = $17, featured = $18, position = $19, seo_title = $20, seo_description = $21, updated_at = now()
       WHERE id = $22 RETURNING *`,
      [...productParams(v), id],
    );
    return rows[0] ? toAdminProduct(rows[0]) : null;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTakenError("Another product already uses this web address. Change the URL handle.");
    throw err;
  }
}

/** Uploaded photo slots ("p-...") belong to one product or post and are deleted with it; built-in slots are shared. */
export const isOwnSlot = (id: string) => /^p-[a-z0-9-]{6,40}$/.test(id);

const ownSlot = (id: string, alt: string): SlotInfo => ({ id, alt, aspect: PHOTO_ASPECT, focusY: 0.5 });

async function removeSlots(ids: string[]) {
  for (const id of ids.filter(isOwnSlot)) {
    await resetSlot(ownSlot(id, "")).catch(() => console.error("[catalog] could not delete a photo's files"));
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const rows = await query("DELETE FROM products WHERE id = $1 RETURNING image, gallery", [id]);
  const row = rows[0];
  if (!row) return false;
  const p = toAdminProduct(row);
  await removeSlots([p.image, ...p.gallery]);
  return true;
}

/** Saves a new shelf order: ids in the order they should appear. */
export async function reorderProducts(ids: string[]): Promise<void> {
  const clean = ids.filter((i) => UUID_RE.test(i)).slice(0, 1000);
  if (!clean.length) return;
  await query(
    `UPDATE products p SET position = x.pos * 10, updated_at = now()
     FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS x(id, pos) WHERE p.id = x.id::uuid`,
    [JSON.stringify(clean)],
  );
}

/**
 * Adds a photo to a product: processed like a site image (3:4, AVIF + WebP). The first photo becomes the cover;
 * later ones go to the gallery. Returns the updated product.
 */
export async function addProductPhoto(id: string, source: Buffer): Promise<AdminProduct | null> {
  const product = await getAdminProduct(id);
  if (!product) return null;
  const slotId = `p-${randomUUID().slice(0, 13)}`;
  await replaceSlot(ownSlot(slotId, product.name), source);
  const hasCover = Boolean(product.image);
  const rows = await query(
    hasCover
      ? `UPDATE products SET gallery = gallery || jsonb_build_array(jsonb_build_object('image', $2::text)), updated_at = now() WHERE id = $1 RETURNING *`
      : `UPDATE products SET image = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, slotId],
  );
  return rows[0] ? toAdminProduct(rows[0]) : null;
}

/**
 * Rearranges a product's photos. `order` lists the slot ids to keep, cover first; photos left out are removed
 * (their files are deleted when they were uploaded here). Only ids the product already has are accepted.
 */
export async function setProductPhotos(id: string, order: string[]): Promise<AdminProduct | null> {
  const product = await getAdminProduct(id);
  if (!product) return null;
  const current = [product.image, ...product.gallery].filter(Boolean);
  const keep = [...new Set(order)].filter((s) => current.includes(s));
  const removed = current.filter((s) => !keep.includes(s));
  const rows = await query(
    "UPDATE products SET image = $2, gallery = $3::jsonb, updated_at = now() WHERE id = $1 RETURNING *",
    [id, keep[0] ?? "", JSON.stringify(keep.slice(1).map((image) => ({ image })))],
  );
  await removeSlots(removed);
  return rows[0] ? toAdminProduct(rows[0]) : null;
}

/** Alt text of one uploaded photo (stored with the photo itself, so the site's <Picture> uses it). */
export async function setPhotoAlt(slotId: string, alt: string): Promise<boolean> {
  if (!isOwnSlot(slotId)) return false;
  await setSlotAlt(ownSlot(slotId, ""), alt || null);
  return true;
}

/* ---------- admin: posts ---------- */

export async function listAdminPosts(filter: { q?: string; status?: PostStatus } = {}): Promise<AdminPost[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`status = $${params.length}`);
  }
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    where.push(`(title ILIKE $${params.length} OR tag ILIKE $${params.length})`);
  }
  const rows = await query(
    `SELECT ${POST_COLUMNS} FROM posts ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY date DESC, created_at DESC LIMIT 1000`,
    params,
  );
  return rows.map(toAdminPost);
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  if (!UUID_RE.test(id)) return null;
  const rows = await query(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1`, [id]);
  return rows[0] ? toAdminPost(rows[0]) : null;
}

function postParams(v: PostInput): unknown[] {
  return [v.slug, v.title, v.status, v.summary, v.date, v.tag, JSON.stringify(v.body), v.seoTitle, v.seoDescription];
}

export async function createPost(v: PostInput, image = ""): Promise<AdminPost> {
  try {
    const rows = await query(
      `INSERT INTO posts (slug, title, status, summary, date, tag, body, seo_title, seo_description, image)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7::jsonb, $8, $9, $10) RETURNING ${POST_COLUMNS}`,
      [...postParams(v), image],
    );
    const row = rows[0];
    if (!row) throw new Error("Post insert returned nothing.");
    return toAdminPost(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTakenError("Another post already uses this web address. Change the URL handle.");
    throw err;
  }
}

export async function updatePost(id: string, v: PostInput): Promise<AdminPost | null> {
  if (!UUID_RE.test(id)) return null;
  try {
    const rows = await query(
      `UPDATE posts SET slug = $1, title = $2, status = $3, summary = $4, date = $5::date, tag = $6, body = $7::jsonb,
         seo_title = $8, seo_description = $9, updated_at = now()
       WHERE id = $10 RETURNING ${POST_COLUMNS}`,
      [...postParams(v), id],
    );
    return rows[0] ? toAdminPost(rows[0]) : null;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTakenError("Another post already uses this web address. Change the URL handle.");
    throw err;
  }
}

export async function deletePost(id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const rows = await query("DELETE FROM posts WHERE id = $1 RETURNING image", [id]);
  if (!rows[0]) return false;
  await removeSlots([str(rows[0].image)]);
  return true;
}

/** Replaces a post's cover photo (or removes it with `source` null). */
export async function setPostPhoto(id: string, source: Buffer | null): Promise<AdminPost | null> {
  const post = await getAdminPost(id);
  if (!post) return null;
  let slotId = "";
  if (source) {
    slotId = isOwnSlot(post.image) ? post.image : `p-${randomUUID().slice(0, 13)}`;
    await replaceSlot(ownSlot(slotId, post.title), source);
  } else {
    await removeSlots([post.image]);
  }
  const rows = await query(`UPDATE posts SET image = $2, updated_at = now() WHERE id = $1 RETURNING ${POST_COLUMNS}`, [id, slotId]);
  return rows[0] ? toAdminPost(rows[0]) : null;
}

/* ---------- one-time import (from the old Sanity studio, or the built-in content) ---------- */

export interface ImportResult {
  source: "sanity" | "built-in";
  products: number;
  posts: number;
  photos: number;
  skipped: number;
}

const MAX_IMPORT_PHOTO = 20 * 1024 * 1024;

/** Downloads one photo from Sanity's CDN (an https URL on cdn.sanity.io only). */
async function fetchSanityPhoto(url: unknown): Promise<Buffer | null> {
  if (typeof url !== "string") return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "cdn.sanity.io") return null;
  const res = await fetch(u, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 0 && buf.length <= MAX_IMPORT_PHOTO ? buf : null;
}

const SANITY_PRODUCTS = `*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**"))] | order(order asc, name asc){
  "slug": slug.current, name, category, sub, description, specs[]{label, value}, finishes, moq, featured, imageId, order,
  fabric, gsm, fit, fitNote, sizes, colours, drop, leadTime, seoTitle, seoDescription,
  "photo": photo.asset->url, "photoAlt": photo.alt, "gallery": gallery[defined(asset)]{ alt, "url": asset->url }
}`;
const SANITY_POSTS = `*[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))] | order(date desc){
  "slug": slug.current, title, summary, date, tag, imageId, seoTitle, seoDescription, body[]{ _type, text, items },
  "photo": photo.asset->url, "photoAlt": photo.alt
}`;

/** Only the site's own built-in photo ids are accepted from an import (never another item's uploaded "p-" slot). */
const builtInImage = (v: unknown): string => (typeof v === "string" && Object.hasOwn(generatedImages, v) ? v : "");

const SANITY_BLOCK: Record<string, Block["type"]> = { paragraph: "p", heading: "h2", note: "note", bullets: "ul" };

/** The retired Sanity studio's public dataset (read-only, no token), queried over its plain HTTP API. */
const SANITY_QUERY_URL = "https://3ts9614s.apicdn.sanity.io/v2025-02-19/data/query/production";

async function sanityQuery(groq: string): Promise<Record<string, unknown>[]> {
  const url = new URL(SANITY_QUERY_URL);
  url.searchParams.set("query", groq);
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Sanity answered ${res.status}.`);
  const data: unknown = await res.json();
  const result = isRecord(data) ? data.result : undefined;
  return Array.isArray(result) ? result.filter(isRecord) : [];
}

/**
 * Copies the products and posts into this database, once: rows whose web address already exists are skipped, so
 * running it again never overwrites edits. Reads the old Sanity studio; when that is unreachable, the built-in content.
 */
export async function importCatalog(): Promise<ImportResult> {
  let source: ImportResult["source"] = "sanity";
  let rawProducts: Record<string, unknown>[] = [];
  let rawPosts: Record<string, unknown>[] = [];
  try {
    [rawProducts, rawPosts] = await Promise.all([sanityQuery(SANITY_PRODUCTS), sanityQuery(SANITY_POSTS)]);
    if (rawProducts.length === 0 && rawPosts.length === 0) throw new Error("Sanity is empty.");
  } catch {
    source = "built-in";
    rawProducts = localProducts.map((p, i) => ({ ...p, imageId: p.image, order: (i + 1) * 10 }));
    rawPosts = localPosts.map((p) => ({ ...p, imageId: p.image, body: p.body.map((b) => ({ ...b, _type: b.type })) }));
  }

  const existing = new Set((await query("SELECT slug FROM products UNION ALL SELECT 'post:' || slug FROM posts")).map((r) => str(r.slug)));
  const result: ImportResult = { source, products: 0, posts: 0, photos: 0, skipped: 0 };
  // Photos are slow (download + four image sizes each), so every row is saved first and photos follow in a second pass.
  // A run that stops part-way therefore never leaves the catalogue half-made, and running the import again fills in
  // photos for anything still without one.
  const productPhotos: { slug: string; urls: unknown[] }[] = [];
  const postPhotos: { slug: string; url: unknown }[] = [];

  try {
    for (const [i, raw] of rawProducts.entries()) {
      // Sanity kept the structured fields apart; the built-in content has them inside `specs` (shown as extra rows).
      const v = validateProduct({ ...raw, status: "active", position: typeof raw.order === "number" ? Math.round(raw.order) : (i + 1) * 10 });
      if (!v.ok) {
        result.skipped++;
        continue;
      }
      const urls = [raw.photo, ...(Array.isArray(raw.gallery) ? raw.gallery.map((g: unknown) => (isRecord(g) ? g.url : null)) : [])].filter(Boolean);
      if (urls.length) productPhotos.push({ slug: v.value.slug, urls });
      if (existing.has(v.value.slug)) {
        result.skipped++;
        continue;
      }
      try {
        // A cover uploaded in Sanity replaces the built-in photo, so those products start without one.
        await createProduct(v.value, raw.photo ? "" : builtInImage(raw.imageId));
        existing.add(v.value.slug);
        result.products++;
      } catch (err) {
        if (!(err instanceof SlugTakenError)) throw err;
        result.skipped++;
      }
    }

    for (const raw of rawPosts) {
      const body = Array.isArray(raw.body)
        ? raw.body.map((b: unknown) => (isRecord(b) ? { type: SANITY_BLOCK[str(b._type)] ?? str(b._type), text: b.text, items: b.items } : null))
        : [];
      const v = validatePost({ ...raw, body, status: "published" });
      if (!v.ok) {
        result.skipped++;
        continue;
      }
      if (raw.photo) postPhotos.push({ slug: v.value.slug, url: raw.photo });
      if (existing.has(`post:${v.value.slug}`)) {
        result.skipped++;
        continue;
      }
      try {
        await createPost(v.value, raw.photo ? "" : builtInImage(raw.imageId));
        existing.add(`post:${v.value.slug}`);
        result.posts++;
      } catch (err) {
        if (!(err instanceof SlugTakenError)) throw err;
        result.skipped++;
      }
    }

    // Second pass: photos, only for items that still have no photo of their own (so re-runs never duplicate them).
    for (const job of productPhotos) {
      const row = (await query("SELECT id, image, gallery FROM products WHERE slug = $1", [job.slug]))[0];
      if (!row || str(row.image)) continue;
      for (const url of job.urls) {
        const buf = await fetchSanityPhoto(url).catch(() => null);
        if (!buf) continue;
        try {
          await addProductPhoto(str(row.id), buf);
          result.photos++;
        } catch {
          console.error("[catalog-import] a product photo could not be processed");
        }
      }
    }
    for (const job of postPhotos) {
      const row = (await query("SELECT id, image FROM posts WHERE slug = $1", [job.slug]))[0];
      if (!row || str(row.image)) continue;
      const buf = await fetchSanityPhoto(job.url).catch(() => null);
      if (!buf) continue;
      try {
        await setPostPhoto(str(row.id), buf);
        result.photos++;
      } catch {
        console.error("[catalog-import] a post photo could not be processed");
      }
    }
  } finally {
    revalidateCatalog();
    revalidateMedia();
  }
  return result;
}
