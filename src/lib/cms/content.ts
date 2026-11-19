// Products and blog posts for the public pages. They are edited in the admin (/admin/products, /admin/blog) and read
// from the site's own database (src/server/catalog.ts), with the built-in content (src/content) as the fallback when
// nothing has been saved yet or the database is unreachable, so the site never goes blank.
import type { Post } from "@/content/blog";
import type { Product } from "@/content/products";
import { getPublicPosts, getPublicProducts } from "@/server/catalog";

export const getProducts = (): Promise<Product[]> => getPublicProducts();
export const getPosts = (): Promise<Post[]> => getPublicPosts();

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.slug === slug);
}

export async function getPost(slug: string): Promise<Post | undefined> {
  return (await getPosts()).find((p) => p.slug === slug);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.featured);
}
