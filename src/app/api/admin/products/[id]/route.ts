import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { deleteProduct, getAdminProduct, revalidateCatalog, SlugTakenError, updateProduct, validateProduct } from "@/server/catalog";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { revalidateMedia } from "@/server/media";

type Ctx = { params: Promise<{ id: string }> };

/** Save every field of a product (the editor always sends the whole form). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const v = validateProduct(await readJson(req, 32_768));
    if (!v.ok) return jsonError(400, "Please fix the highlighted fields.", { errors: v.errors });
    const { id } = await params;
    // The shelf order is changed on the Products list only; keep whatever it is now (the editor may hold an old value).
    const current = await getAdminProduct(id);
    if (!current) return jsonError(404, "Product not found.");
    const product = await updateProduct(id, { ...v.value, position: current.position });
    if (!product) return jsonError(404, "Product not found.");
    revalidateCatalog();
    return json({ ok: true, product });
  } catch (err) {
    if (err instanceof SlugTakenError) return jsonError(409, err.message, { errors: { slug: err.message } });
    return serverError("admin-product-update", err);
  }
}

/** Delete a product and the photos uploaded for it. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    if (!(await deleteProduct((await params).id))) return jsonError(404, "Product not found.");
    revalidateCatalog();
    revalidateMedia();
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-product-delete", err);
  }
}
