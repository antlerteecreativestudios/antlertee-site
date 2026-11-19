import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { deletePost, revalidateCatalog, SlugTakenError, updatePost, validatePost } from "@/server/catalog";
import { json, jsonError, readJson, serverError } from "@/server/http";
import { revalidateMedia } from "@/server/media";

type Ctx = { params: Promise<{ id: string }> };

/** Save a blog post (the editor sends the whole form). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const v = validatePost(await readJson(req, 262_144));
    if (!v.ok) return jsonError(400, "Please fix the highlighted fields.", { errors: v.errors });
    const post = await updatePost((await params).id, v.value);
    if (!post) return jsonError(404, "Post not found.");
    revalidateCatalog();
    return json({ ok: true, post });
  } catch (err) {
    if (err instanceof SlugTakenError) return jsonError(409, err.message, { errors: { slug: err.message } });
    return serverError("admin-post-update", err);
  }
}

/** Delete a blog post and its uploaded cover photo. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    if (!(await deletePost((await params).id))) return jsonError(404, "Post not found.");
    revalidateCatalog();
    revalidateMedia();
    return json({ ok: true });
  } catch (err) {
    return serverError("admin-post-delete", err);
  }
}
