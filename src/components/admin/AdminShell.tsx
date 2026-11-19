"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { LogoutButton } from "./LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Other path prefixes that also mark this item as the current page. */
  also?: string[];
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin/", label: "Home", icon: "home", exact: true },
  { href: "/admin/leads/", label: "Leads", icon: "inbox" },
  { href: "/admin/tech-packs/", label: "Tech packs", icon: "techpack" },
  { href: "/admin/products/", label: "Products", icon: "tag" },
  { href: "/admin/blog/", label: "Blog posts", icon: "post" },
  { href: "/admin/files/", label: "Files", icon: "folder", also: ["/admin/media/"] },
  { href: "/admin/subscribers/", label: "Subscribers", icon: "people" },
];

const SETTINGS: NavItem = { href: "/admin/settings/", label: "Settings", icon: "settings" };

function isCurrent(path: string, item: NavItem): boolean {
  const p = path.endsWith("/") ? path : `${path}/`;
  if (item.exact) return p === item.href;
  return [item.href, ...(item.also ?? [])].some((h) => p.startsWith(h));
}

/** Top bar + left sidebar, like Shopify's admin. On phones the sidebar slides in from a menu button. */
export function AdminShell({ csrf, unread, children }: { csrf: string; unread: number; children: ReactNode }) {
  const path = usePathname() ?? "";
  // The phone menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const open = menuFor === path;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => setMenuFor((typeof next === "function" ? next(open) : next) ? path : null);

  const link = (item: NavItem, badge?: number) => {
    const current = isCurrent(path, item);
    return (
      <li key={item.href}>
        <Link href={item.href} className="a-nav-link" aria-current={current ? "page" : undefined}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {badge ? (
            <span className="a-nav-badge" aria-label={`${badge} unread`}>
              {badge}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <div className="a-frame" data-menu={open || undefined}>
      <header className="a-top">
        <button type="button" className="a-menu-btn" aria-expanded={open} aria-controls="a-side" onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? "close" : "menu"} />
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
        <Link href="/admin/" className="a-brand">
          Antlertee<span className="a-dot">.</span>
        </Link>
        <div className="a-top-end">
          <a className="a-top-link" href="/" target="_blank" rel="noopener noreferrer">
            <Icon name="external" />
            <span>View site</span>
          </a>
          <LogoutButton csrf={csrf} />
        </div>
      </header>
      <nav id="a-side" className="a-side" aria-label="Admin">
        <ul className="a-nav">{NAV.map((item) => link(item, item.href === "/admin/leads/" ? unread : undefined))}</ul>
        <ul className="a-nav a-nav-end">{link(SETTINGS)}</ul>
      </nav>
      {open && <button type="button" className="a-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div className="a-main">{children}</div>
    </div>
  );
}
