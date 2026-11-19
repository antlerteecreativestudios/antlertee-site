import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { jsonError, serverError } from "@/server/http";
import { leadFileResponse } from "@/server/lead-file-response";
import { getLeadFile } from "@/server/leads";

/** Streams a customer file to the logged-in admin. `?view=1` shows PDFs and images inline. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const ctx = requireAdminApi(req, false);
    if (!isAdminContext(ctx)) return ctx;
    const { id, fileId } = await params;
    const file = await getLeadFile(id, fileId);
    if (!file) return jsonError(404, "File not found.");
    return (await leadFileResponse(file, req.nextUrl.searchParams.get("view") === "1")) ?? jsonError(404, "File not found in storage.");
  } catch (err) {
    return serverError("admin-lead-file", err);
  }
}
