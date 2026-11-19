import type { NextRequest } from "next/server";
import { verifyFileLink } from "@/server/file-links";
import { jsonError, serverError } from "@/server/http";
import { leadFileResponse } from "@/server/lead-file-response";
import { getLead, getLeadFile } from "@/server/leads";

/**
 * A customer file opened from the link in the WhatsApp message (`?t=` is the signed token, see server/file-links.ts).
 * PDFs and images open in the browser; other types download. Expired, altered or unknown links get the same 404.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ leadId: string; fileId: string }> }) {
  try {
    const { leadId, fileId } = await params;
    if (!verifyFileLink(leadId, fileId, req.nextUrl.searchParams.get("t"))) return jsonError(404, "This file link has expired or is not valid.");
    const file = await getLeadFile(leadId, fileId);
    // Leads marked as spam lose their share links, so the form can't be used as free file hosting on this domain.
    const lead = file ? await getLead(leadId) : null;
    if (!file || !lead || lead.lead.status === "spam") return jsonError(404, "This file link has expired or is not valid.");
    return (await leadFileResponse(file, true)) ?? jsonError(404, "This file link has expired or is not valid.");
  } catch (err) {
    return serverError("file-link", err);
  }
}
