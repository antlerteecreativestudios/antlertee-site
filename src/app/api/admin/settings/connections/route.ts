import type { NextRequest } from "next/server";
import { validateConnections } from "@/lib/connections";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { saveConnections } from "@/server/settings";

/** Save every connection: { metaPixel: { id, enabled }, ga4: {...}, ... }. */
export async function PUT(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const v = validateConnections(await readJson(req, 8192));
    if (!v.ok) return jsonError(400, "Please fix the highlighted fields.", { errors: v.errors });
    await saveConnections(v.value);
    return json({ ok: true, connections: v.value });
  } catch (err) {
    return serverError("admin-connections", err);
  }
}
