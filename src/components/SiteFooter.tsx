import Link from "next/link";
import { brand, contact, nav, whatsappLink } from "@/content/site";
import { modelCredit } from "@/content/credits";
import { NewsletterForm } from "./NewsletterForm";
import { SocialLinks } from "./SocialLinks";

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;
const outline = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const resources = [
  { href: "/process/#tech-pack", label: "Tech pack builder" },
  { href: "/process/#how-it-works", label: "How it works" },
  { href: "/credits/", label: "Credits" },
] as const;

/** Footer: sign-off and email pill, then brand + socials, link columns and office details, then the legal line. */
export function SiteFooter() {
  return (
    <footer className="footer" data-nav="dark">
      <div className="ft-in">
        <div className="ft-top">
          <div>
            <h2 className="ft-title">
              Let&rsquo;s make
              <br />
              yours<span className="dot">.</span>
            </h2>
            <p className="ft-lede">
              Questions, a sample, or just a rough mockup? Message us on WhatsApp or email and we will reply there. Or join the list and see the next drop first.
            </p>
          </div>
          <NewsletterForm />
        </div>

        <div className="ft-cols">
          <div className="ft-brand">
            <Link className="wm" href="/" aria-label="Antlertee Creative Studios, home">
              <span className="wm-logo" aria-hidden="true" />
            </Link>
            <p className="ft-about">
              Private-label streetwear and garment manufacturing in {brand.city}. Heavyweight knitwear, fleece, outerwear and denim,
              with print, embroidery and specialised washes under one roof, from tech pack to bulk.
            </p>
            <SocialLinks className="ft-social" />
          </div>

          <nav aria-label="Explore">
            <h2 className="ft-h">Explore</h2>
            <ul className="ft-links">
              <li>
                <Link href="/">Home</Link>
              </li>
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h2 className="ft-h">Resources</h2>
            <ul className="ft-links">
              {resources.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="ft-h">Office</h2>
            <ul className="ft-office">
              <li>
                <svg {...icon} {...outline}>
                  <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z" />
                  <circle cx="12" cy="10" r="2.2" />
                </svg>
                <span>
                  <b>{brand.name}</b>
                  {brand.city}, {brand.country}
                </span>
              </li>
              <li>
                <svg {...icon} {...outline}>
                  <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z" />
                </svg>
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  WhatsApp {contact.whatsappDisplay}
                </a>
              </li>
              <li>
                <svg {...icon} {...outline}>
                  <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="ft-bottom">
          <span className="ft-tag">{brand.tagline.replace(".", "")}</span>
          <span>
            © {new Date().getFullYear()} {brand.name}. All rights reserved. {modelCredit.short} <Link href="/credits/">Credits</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
