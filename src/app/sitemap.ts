import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { getPosts, getProducts } from "@/lib/cms/content";
import { absoluteUrl } from "@/lib/media";
import { slotImage } from "@/server/media";

// Rebuilt at most hourly, and at once when products or posts change in the admin (revalidateCatalog).
export const revalidate = 3600;

const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/products/", priority: 0.9, changeFrequency: "weekly" },
  { path: "/tech-pack-builder/", priority: 0.9, changeFrequency: "monthly" },
  { path: "/process/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about/", priority: 0.7, changeFrequency: "monthly" },
  { path: "/blog/", priority: 0.7, changeFrequency: "weekly" },
  { path: "/contact/", priority: 0.7, changeFrequency: "yearly" },
  { path: "/credits/", priority: 0.2, changeFrequency: "yearly" },
];

/** Every public page, with its main photo (Google Images reads `images`). Draft products and posts are left out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([getProducts(), getPosts()]);
  const image = async (id: Parameters<typeof slotImage>[0]) => absoluteUrl((await slotImage(id)).src, SITE_URL);
  const newestPost = posts.reduce<string | undefined>((d, p) => (!d || (p.updatedAt ?? p.date) > d ? (p.updatedAt ?? p.date) : d), undefined);

  return [
    ...PAGES.map(({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      ...(path === "/blog/" && newestPost ? { lastModified: newestPost } : {}),
      changeFrequency,
      priority,
    })),
    ...(await Promise.all(
      products.map(async (p) => ({
        url: `${SITE_URL}/products/${p.slug}/`,
        ...(p.updatedAt ? { lastModified: p.updatedAt } : {}),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        images: [await image(p.image)],
      })),
    )),
    ...(await Promise.all(
      posts.map(async (p) => ({
        url: `${SITE_URL}/blog/${p.slug}/`,
        lastModified: p.updatedAt ?? p.date,
        changeFrequency: "yearly" as const,
        priority: 0.6,
        images: [await image(p.image)],
      })),
    )),
  ];
}
