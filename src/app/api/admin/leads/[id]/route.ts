import type { NextRequest } from "next/server";
import { isLeadStage, isLeadStatus } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { deleteLead, setLeadStage, setLeadStatus } from "@/server/leads";
import { getStorage } from "@/server/storage";

type Ctx = { params: Promise<{ id: string }> };

/** Change a lead's inbox status { status: "new" | "read" | "done" | "spam" } and/or pipeline stage { stage }. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const { id } = await params;
    const body = await readJson(req, 1024);
    const o = typeof body === "object" && body !== null ? (body as { status?: unknown; stage?: unknown }) : {};
    if (o.status === undefined && o.stage === undefined) return jsonError(400, "Nothing to change.");
    if (o.status !== undefined && !isLeadStatus(o.status)) return jsonError(400, "Unknown status.");
    if (o.stage !== undefined && !isLeadStage(o.stage)) return jsonError(400, "Unknown stage.");
    if (isLeadStage(o.stage) && !(await setLeadStage(id, o.stage))) return jsonError(404, "Lead not found.");
    if (isLeadStatus(o.status) && !(await setLeadStatus(id, o.status))) return jsonError(404, "Lead not found.");
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-lead-update", err);
  }
}

/** Delete a lead and its files. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const { id } = await params;
    const keys = await deleteLead(id);
    if (keys === null) return jsonError(404, "Lead not found.");
    if (keys.length) {
      await getStorage()
        .remove("leads", keys)
        .catch(() => console.error("[admin-lead-delete] lead deleted, but some files could not be removed from storage"));
    }
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-lead-delete", err);
  }
}
