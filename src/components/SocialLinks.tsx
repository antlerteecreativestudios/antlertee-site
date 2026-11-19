import type { ReactNode } from "react";
import { contact } from "@/content/site";

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;
const outline = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Instagram() {
  return (
    <svg {...icon} {...outline}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

function Facebook() {
  return (
    <svg {...icon} fill="currentColor">
      <path d="M13.6 21v-7.4h2.5l.4-3h-2.9V8.8c0-.9.3-1.5 1.5-1.5h1.5V4.6c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.3H8.2v3h2.5V21z" />
    </svg>
  );
}

function LinkedIn() {
  return (
    <svg {...icon} {...outline}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5V16M8 7.8v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1.9 2.1 2.4V16" />
    </svg>
  );
}

const socials: { label: string; href: string; icon: ReactNode }[] = [
  { label: "Instagram", href: contact.instagram, icon: <Instagram /> },
  { label: "Facebook", href: contact.facebook, icon: <Facebook /> },
  { label: "LinkedIn", href: contact.linkedin, icon: <LinkedIn /> },
];

/** Instagram, Facebook and LinkedIn as round icon links. Used in the footer and the full-screen menu. */
export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={className} aria-label="Antlertee on social media">
      {socials.map((s) => (
        <li key={s.label}>
          <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (opens in a new tab)`}>
            {s.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}
