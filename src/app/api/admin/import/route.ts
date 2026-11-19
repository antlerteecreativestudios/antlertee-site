import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { importCatalog } from "@/server/catalog";
import { json, serverError } from "@/server/http";

export const maxDuration = 300;

/** One-time copy of the products and posts from the old studio (or the built-in content). Never overwrites. */
export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    return json({ ok: true, result: await importCatalog() });
  } catch (err) {
    return serverError("admin-import", err);
  }
}
