import { ClientWork } from "@/components/home/ClientWork";
import { HomeHero } from "@/components/home/HomeHero";
import { Orbit } from "@/components/home/Orbit";
import { ProcessProof } from "@/components/home/ProcessProof";
import { Statement } from "@/components/home/Statement";
import { WorkGallery } from "@/components/home/WorkGallery";
import { Rack } from "@/components/product/Rack";
import { QuoteCta } from "@/components/QuoteCta";
import { SITE_URL, brand, contact, facts } from "@/content/site";
import { getProducts } from "@/lib/cms/content";
import { pageMeta } from "@/lib/meta";
import { jsonLdScript } from "@/lib/json-ld";

export const metadata = pageMeta({
  title: `${brand.name}: private-label streetwear manufacturer, Karachi`,
  description: `Yarn to pack. Heavyweight knitwear, fleece, outerwear and denim with in-house print, embroidery and specialised washes. MOQ ${facts.moqLong}, worldwide shipping.`,
  path: "/",
  absoluteTitle: true,
});

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: brand.name,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/brand/logo-full-ink.png`,
  email: contact.email,
  telephone: contact.whatsappDisplay.replace(/\s/g, ""),
  sameAs: [contact.instagram],
  address: { "@type": "PostalAddress", addressLocality: brand.city, addressCountry: "PK" },
  description: brand.description,
};

export default async function HomePage() {
  const products = await getProducts();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organization) }} />
      <HomeHero />
      <Statement />
      <WorkGallery />
      <Orbit />
      <Rack
        products={products.filter((p) => p.featured)}
        totalCount={products.length}
        basePath="/"
        title="The rack"
        intro="Pick a base, we build it to your spec. Open a piece to see fabric, weight and finishes."
      />
      <ClientWork />
      <ProcessProof />
      <QuoteCta />
    </>
  );
}
