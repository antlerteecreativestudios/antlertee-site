import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { createProduct, revalidateCatalog, SlugTakenError, validateProduct } from "@/server/catalog";
import { json, jsonError, readJson, serverError } from "@/server/http";

/** Create a product from the editor's fields. Photos are added afterwards (they need the product id). */
export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const v = validateProduct(await readJson(req, 32_768));
    if (!v.ok) return jsonError(400, "Please fix the highlighted fields.", { errors: v.errors });
    const product = await createProduct(v.value);
    revalidateCatalog();
    return json({ ok: true, product }, 201);
  } catch (err) {
    if (err instanceof SlugTakenError) return jsonError(409, err.message, { errors: { slug: err.message } });
    return serverError("admin-product-create", err);
  }
}
