import type { NextRequest } from "next/server";
import { cleanText, isMediaUploadKey } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { addProductPhoto, getAdminProduct, revalidateCatalog, setPhotoAlt, setProductPhotos } from "@/server/catalog";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { MediaInputError, revalidateMedia, takeIncoming } from "@/server/media";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const field = (body: unknown, name: string): unknown => (typeof body === "object" && body !== null ? (body as Record<string, unknown>)[name] : undefined);

/** Add an uploaded photo: { key: "media/incoming/<uuid>/<name>" }. The first photo becomes the cover. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const { id } = await params;
    if (!(await getAdminProduct(id))) return jsonError(404, "Product not found.");
    const key = field(await readJson(req, 2048), "key");
    if (!isMediaUploadKey(key, "incoming")) return jsonError(400, "Invalid upload.");
    const product = await addProductPhoto(id, await takeIncoming(key));
    if (!product) return jsonError(404, "Product not found.");
    revalidateMedia();
    revalidateCatalog();
    return json({ ok: true, product });
  } catch (err) {
    if (err instanceof MediaInputError) return jsonError(400, err.message);
    return serverError("admin-product-photo-add", err);
  }
}

/** Reorder or remove photos: { order: [slot ids, cover first] }. Photos left out are deleted. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const order = field(await readJson(req, 8192), "order");
    if (!Array.isArray(order) || order.length > 40 || !order.every((s): s is string => typeof s === "string")) return jsonError(400, "Invalid photo order.");
    const product = await setProductPhotos((await params).id, order);
    if (!product) return jsonError(404, "Product not found.");
    revalidateMedia();
    revalidateCatalog();
    return json({ ok: true, product });
  } catch (err) {
    return serverError("admin-product-photo-order", err);
  }
}

/** Alt text of one of this product's uploaded photos: { slot, alt }. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const body = await readJson(req, 4096);
    const slot = field(body, "slot");
    const product = await getAdminProduct((await params).id);
    if (!product) return jsonError(404, "Product not found.");
    if (typeof slot !== "string" || ![product.image, ...product.gallery].includes(slot)) return jsonError(400, "Unknown photo.");
    if (!(await setPhotoAlt(slot, cleanText(field(body, "alt"), 300)))) {
      return jsonError(400, "This is one of the site's built-in photos. Change its description under Files, Site images.");
    }
    revalidateMedia();
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-product-photo-alt", err);
  }
}
