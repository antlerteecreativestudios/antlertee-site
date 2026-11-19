import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { SITE_URL } from "@/content/site";
import { requireAdminPage } from "@/server/auth/admin";
import { thumbResolver } from "@/server/admin-images";
import { getAdminPost } from "@/server/catalog";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { csrf } = await requireAdminPage();
  const { id } = await params;
  if (id === "new") return <PostEditor post={null} cover={null} csrf={csrf} siteUrl={SITE_URL} />;
  const [post, thumb] = await Promise.all([getAdminPost(id), thumbResolver()]);
  if (!post) notFound();
  return <PostEditor post={post} cover={thumb(post.image)} csrf={csrf} siteUrl={SITE_URL} />;
}
