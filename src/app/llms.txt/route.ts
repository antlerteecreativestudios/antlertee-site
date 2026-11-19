import { SITE_URL, brand, contact, facts } from "@/content/site";
import { getPosts, getProducts } from "@/lib/cms/content";

// Rebuilt at most hourly, and when content is published in the studio (the revalidate webhook clears the cache).
export const revalidate = 3600;

/**
 * llms.txt: a plain-text map of the site for AI assistants (ChatGPT, Claude, Perplexity, Gemini and others), listing
 * who we are, what we make and where the key pages are. Generated from the same content as the pages, so it never drifts.
 */
export async function GET() {
  const [products, posts] = await Promise.all([getProducts(), getPosts()]);
  const lines = [
    `# ${brand.name}`,
    "",
    `> ${brand.description}`,
    "",
    `${brand.name} (${brand.short}) is a private-label garment manufacturer based in ${brand.city}, ${brand.country}. We make heavyweight knitwear, fleece, outerwear, denim and jerseys for clothing brands, with in-house print, embroidery and washes. Minimum order ${facts.moqLong}; typical turnaround ${facts.turnaround}. We ship worldwide.`,
    "",
    "## Key pages",
    `- [Home](${SITE_URL}/): what we make and how an order runs`,
    `- [Products](${SITE_URL}/products/): the full rack of garment bases, with fabric, weight and finishes`,
    `- [Tech pack builder](${SITE_URL}/tech-pack-builder/): free tool to build a clothing tech pack in about three minutes`,
    `- [Process and FAQs](${SITE_URL}/process/): tech pack to sample to bulk production, and common questions`,
    `- [About](${SITE_URL}/about/): the studio and its manufacturing unit`,
    `- [Blog](${SITE_URL}/blog/): plain-English guides to private-label manufacturing`,
    `- [Contact and quotes](${SITE_URL}/contact/): request a quote`,
    "",
    "## Products",
    ...products.map((p) => `- [${p.name}](${SITE_URL}/products/${p.slug}/): ${p.category}, ${p.sub}`),
    "",
    "## Guides",
    ...posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}/): ${p.summary}`),
    "",
    "## Contact",
    `- WhatsApp: ${contact.whatsappDisplay}`,
    `- Email: ${contact.email}`,
    `- Instagram: ${contact.instagram}`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
