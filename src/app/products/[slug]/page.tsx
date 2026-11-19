import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductStage } from "@/components/product/ProductGallery";
import { BayContents, GarmentArt, Wardrobe, bayStyle } from "@/components/product/Wardrobe";
import { QuoteCta } from "@/components/QuoteCta";
import { SITE_URL, brand } from "@/content/site";
import { getProduct, getProducts } from "@/lib/cms/content";
import { absoluteUrl } from "@/lib/media";
import { pageMeta } from "@/lib/meta";
import { slotImage } from "@/server/media";
import { jsonLdScript } from "@/lib/json-ld";

interface Params {
  params: Promise<{ slug: string }>;
}

// Products added in the content studio get their page on first visit (and are then cached), without a redeploy.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const img = await slotImage(product.image);
  return pageMeta({
    title: product.seoTitle ?? `${product.name} (${product.sub}): private-label manufacturing`,
    description: product.seoDescription ?? `${product.description} MOQ ${product.moq}.`,
    path: `/products/${product.slug}/`,
    image: { url: img.src, width: img.width, height: img.height, alt: img.alt },
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const related = (await getProducts()).filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 4);
  // Prices are on request (B2B), so this is described as an item page with breadcrumbs rather than a schema.org Product:
  // Google requires a price, review or rating on Product, and would list every product page as an error otherwise.
  const url = `${SITE_URL}/products/${product.slug}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemPage",
        "@id": url,
        url,
        name: product.name,
        description: product.description,
        primaryImageOfPage: absoluteUrl((await slotImage(product.image)).src, SITE_URL),
        about: { "@type": "Thing", name: `${product.name}, ${product.category.toLowerCase()} made to order` },
        publisher: { "@type": "Organization", name: brand.name, url: `${SITE_URL}/` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Products", item: `${SITE_URL}/products/` },
          { "@type": "ListItem", position: 3, name: product.name, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <article className="pdp-page fit-bands" data-snap="fit" aria-labelledby="product-title">
        <div className="band band-ink band-head is-first" data-nav="dark">
          <Link className="pill" href="/products/">
            ← All products
          </Link>
          <p className="br kicker">
            {product.category} &nbsp;/&nbsp; {product.sub}
          </p>
        </div>
        <div className="band band-paper band-main" data-nav="light">
          <div className="pdp">
            <ProductStage product={product} />
            <ProductDetails product={product} headingId="product-title" headingLevel="h1" inBands />
          </div>
        </div>
        <div className="band band-yellow band-foot pdp-buy" data-nav="yellow">
          <p className="pdp-price">Price on request</p>
          <Link className="pill inked lg" href={`/contact/?product=${product.slug}`}>
            Request a quote
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="pdp-more fit band-ink" data-nav="dark" data-snap="fit" aria-labelledby="related-title">
          <Wardrobe
            cornice={
              <h2 id="related-title" className="wd-engrave">
                More {product.category}
              </h2>
            }
          >
            <div className="wd-bay" style={bayStyle(related.length)}>
              <BayContents count={related.length}>
                {related.map((p) => (
                  <li key={p.slug} className="wd-item">
                    <Link className="wd-garment" href={`/products/${p.slug}/`} aria-label={`${p.name}, ${p.sub}`}>
                      <GarmentArt product={p} />
                    </Link>
                  </li>
                ))}
              </BayContents>
            </div>
          </Wardrobe>
        </section>
      )}
      <QuoteCta title={`Make it\nyours`} />
    </>
  );
}
