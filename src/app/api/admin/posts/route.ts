import type { NextRequest } from "next/server";
import { isAdminContext, requireAdminApi } from "@/server/auth/admin";
import { createPost, revalidateCatalog, SlugTakenError, validatePost } from "@/server/catalog";
import { json, jsonError, readJson, serverError } from "@/server/http";

/** Create a blog post. */
export async function POST(req: NextRequest) {
  try {
    const ctx = requireAdminApi(req, true);
    if (!isAdminContext(ctx)) return ctx;
    const v = validatePost(await readJson(req, 262_144));
    if (!v.ok) return jsonError(400, "Please fix the highlighted fields.", { errors: v.errors });
    const post = await createPost(v.value);
    revalidateCatalog();
    return json({ ok: true, post }, 201);
  } catch (err) {
    if (err instanceof SlugTakenError) return jsonError(409, err.message, { errors: { slug: err.message } });
    return serverError("admin-post-create", err);
  }
}
