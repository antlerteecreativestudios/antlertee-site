import type { NextRequest } from "next/server";
import { isMediaUploadKey } from "@/lib/leads/rules";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { revalidateCatalog, setPostPhoto } from "@/server/catalog";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { MediaInputError, revalidateMedia, takeIncoming } from "@/server/media";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Set the cover photo from an upload: { key: "media/incoming/<uuid>/<name>" }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const body = await readJson(req, 2048);
    const key = typeof body === "object" && body !== null ? (body as { key?: unknown }).key : undefined;
    if (!isMediaUploadKey(key, "incoming")) return jsonError(400, "Invalid upload.");
    const post = await setPostPhoto((await params).id, await takeIncoming(key));
    if (!post) return jsonError(404, "Post not found.");
    revalidateMedia();
    revalidateCatalog();
    return json({ ok: true, post });
  } catch (err) {
    if (err instanceof MediaInputError) return jsonError(400, err.message);
    return serverError("admin-post-photo", err);
  }
}

/** Remove the cover photo (the post then shows the default photo). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const post = await setPostPhoto((await params).id, null);
    if (!post) return jsonError(404, "Post not found.");
    revalidateMedia();
    revalidateCatalog();
    return json({ ok: true, post });
  } catch (err) {
    return serverError("admin-post-photo-remove", err);
  }
}
