import Link from "next/link";

const TABS = [
  { key: "customer", href: "/admin/files/", label: "Customer files" },
  { key: "library", href: "/admin/media/library/", label: "Library" },
  { key: "site", href: "/admin/media/", label: "Site images" },
] as const;

/** The three file areas under one "Files" section (like Shopify's Content → Files). */
export function FilesTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Files" className="a-card flush">
      <ul className="a-tabs" style={{ borderBottom: 0 }}>
        {TABS.map((t) => (
          <li key={t.key}>
            <Link href={t.href} aria-current={current === t.key ? "page" : undefined}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
