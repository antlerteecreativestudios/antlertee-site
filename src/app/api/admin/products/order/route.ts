import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { reorderProducts, revalidateCatalog } from "@/server/catalog";
import { json, jsonError, readJson, serverError } from "@/server/http";

/** Save the shelf order: { ids: [product ids in order] }. */
export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const body = await readJson(req, 65_536);
    const ids = typeof body === "object" && body !== null ? (body as { ids?: unknown }).ids : undefined;
    if (!Array.isArray(ids) || !ids.every((i): i is string => typeof i === "string")) return jsonError(400, "Invalid order.");
    await reorderProducts(ids);
    revalidateCatalog();
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-product-order", err);
  }
}
