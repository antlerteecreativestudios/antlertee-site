import Link from "next/link";
import { Faq } from "@/components/Faq";
import { QuoteCta } from "@/components/QuoteCta";
import { SITE_URL, brand, facts, whatsappLink } from "@/content/site";
import { pageMeta } from "@/lib/meta";
import { jsonLdScript } from "@/lib/json-ld";

export const metadata = pageMeta({
  title: "Free tech pack builder for clothing brands",
  description: `Build a clothing tech pack in about three minutes: garment, fit, fabric and GSM, colours, artwork, sizes and labels. Free, no sign-up, from a Karachi garment manufacturer. MOQ ${facts.moqLong}.`,
  path: "/tech-pack-builder/",
});

/** The eight screens of the builder (src/components/techpack/TechPackBuilder.tsx), in order. */
const steps = [
  { name: "Garment", text: "Pick a popular style (tee, hoodie, sweatshirt, jacket, trousers, shorts, jersey) or describe your own." },
  { name: "Fit", text: "Regular, oversized, boxy or cropped. Not sure is a fine answer; we suggest one." },
  { name: "Fabric", text: "Fabric type and weight in GSM, from light 180 GSM jersey to extra-heavy 450 GSM fleece, plus any wash you want." },
  { name: "Colours", text: "The main colour, and any other colourways for the same garment." },
  { name: "Artwork", text: "Tap where a logo or print goes and choose screen print, puff print, DTF or embroidery." },
  { name: "Sizes", text: "A rough quantity is enough. We split it across sizes and you can change it after sampling." },
  { name: "Labels", text: "The small brand details: woven label, care label, hang tags and packaging." },
  { name: "Review", text: "Read the plain-English summary, print the A4 sheet or send it to us." },
] as const;

const faqs = [
  {
    q: "What is a tech pack?",
    a: "A tech pack is the written spec of your garment: the style, fit, fabric and weight, colours, print and embroidery placements, sizes and labels. It lets a factory quote, sample and make exactly the piece you are picturing without guessing.",
  },
  {
    q: "Is the tech pack builder free?",
    a: "Yes. The builder is free, needs no account and saves your draft in your own browser. You only send it to us when you want a quote.",
  },
  {
    q: "How long does it take?",
    a: "About three minutes. Every step can be skipped if you are unsure, and we fill the gaps with suggestions when we reply.",
  },
  {
    q: "Do I need a designer or technical drawings?",
    a: "No. A mockup and PNG files of your design placements are enough to start. If you already have a professional tech pack, you can send it to us instead.",
  },
  {
    q: "What do I get at the end?",
    a: "A printable A4 tech pack sheet, and a ready-written WhatsApp or email message to us with every detail in it.",
  },
  {
    q: "What is your minimum order?",
    a: `Our standard minimum is ${facts.moqLong}. Samples are available before bulk.`,
  },
] as const;

const url = `${SITE_URL}/tech-pack-builder/`;

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Antlertee tech pack builder",
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (web browser)",
    description: "Free web tool that walks a clothing brand through the eight details a factory needs to quote and sample a garment, then produces a printable tech pack sheet.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: brand.name, url: `${SITE_URL}/` },
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to build a clothing tech pack",
    totalTime: "PT3M",
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Tech pack builder", item: url },
    ],
  },
];

export default function TechPackBuilderPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <section className="page-hero dark" data-nav="dark" data-snap="fit" aria-labelledby="tpb-title">
        <p className="br kicker">Free tool</p>
        <h1 id="tpb-title" className="h-page" style={{ marginTop: 18 }}>
          Tech pack
          <br />
          builder<span className="dot">.</span>
        </h1>
        <p className="lead">
          Build a clothing tech pack in about three minutes. Eight short steps, no sign-up, and a printable sheet at the end that any
          factory can quote from.
        </p>
        <p style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="pill solid lg" href="/process/#build-tech-pack">
            Build my tech pack
          </Link>
          <Link className="pill on-dark lg" href="/process/#send-tech-pack">
            I already have one
          </Link>
        </p>
      </section>

      <section className="section" data-nav="light" data-snap="edge" aria-labelledby="tpb-what">
        <div className="prose-lg">
          <h2 id="tpb-what" className="h-section">
            What a tech pack is, and why it saves you a sampling round<span className="dot">.</span>
          </h2>
          <p>
            A tech pack is the written version of your garment. It tells a factory the style, fit, fabric and weight, colours, print and
            embroidery placements, sizes and labels, so the first sample is close to the piece you pictured instead of a guess.
          </p>
          <p>
            Most new brands do not have one, and that is fine. The builder asks the questions in plain English and lets you skip anything
            you are unsure about. We fill the gaps with suggestions when we reply.
          </p>
        </div>

        <h2 className="h-section" style={{ marginTop: "clamp(32px, 6svh, 64px)" }}>
          The eight steps<span className="dot">.</span>
        </h2>
        <ol className="post-list" style={{ listStyle: "decimal", paddingLeft: "1.4em" }}>
          {steps.map((s) => (
            <li key={s.name}>
              <strong>{s.name}.</strong> {s.text}
            </li>
          ))}
        </ol>
        <p style={{ marginTop: 28 }}>
          <Link className="pill inked lg" href="/process/#build-tech-pack">
            Start step one
          </Link>
        </p>
      </section>

      <section className="section" data-nav="light" data-snap="edge" aria-labelledby="tpb-faq">
        <h2 id="tpb-faq" className="h-section">
          Questions<span className="dot">.</span>
        </h2>
        <Faq items={faqs.map((f) => ({ q: f.q, a: f.a }))} />
        <p style={{ marginTop: 24 }}>
          Prefer to talk it through?{" "}
          <a href={whatsappLink("Hi Antlertee, I have a question about a tech pack.")} target="_blank" rel="noopener noreferrer">
            Message us on WhatsApp
          </a>
          , or read{" "}
          <Link href="/blog/what-goes-in-a-tech-pack/">what goes in a tech pack</Link>.
        </p>
      </section>

      <QuoteCta title={`Make it\nyours`} />
    </>
  );
}
