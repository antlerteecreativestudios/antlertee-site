import type { NextRequest } from "next/server";
import { cleanText, MAX_NOTE } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { addLeadNote, deleteLeadNote } from "@/server/leads";

type Ctx = { params: Promise<{ id: string }> };

/** Add a note to the lead's timeline: { body }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const raw = await readJson(req, MAX_NOTE * 4 + 256);
    const body = cleanText(typeof raw === "object" && raw !== null ? (raw as { body?: unknown }).body : "", MAX_NOTE, true);
    if (!body) return jsonError(400, "Write a note first.");
    const event = await addLeadNote((await params).id, body);
    if (!event) return jsonError(404, "Lead not found.");
    return json({ ok: true, event }, 201);
  } catch (err) {
    return serverError("admin-lead-note", err);
  }
}

/** Delete one note: ?event=<id>. Stage changes stay on the timeline. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const ok = await deleteLeadNote((await params).id, req.nextUrl.searchParams.get("event") ?? "");
    return ok ? json({ ok: true }) : jsonError(404, "Note not found.");
  } catch (err) {
    return serverError("admin-lead-note-delete", err);
  }
}
