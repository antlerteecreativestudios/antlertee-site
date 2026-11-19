"use client";

import Link from "next/link";

/**
 * Any admin page that fails (e.g. the database is briefly unreachable) shows this instead of a blank or technical
 * error page: what happened in plain words, and what to do next. Details go to the server log, never the screen.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="a-page narrow">
      <section className="a-card">
        <div className="a-empty">
          <strong>This page couldn&apos;t load</strong>
          <span>
            The admin couldn&apos;t reach its data just now. Nothing was lost: your leads, products and files are safe. Try again in a moment; if it keeps
            happening, contact the person who set up the website.
          </span>
          <div className="a-media-tools" style={{ justifyContent: "center" }}>
            <button type="button" className="btn primary" onClick={() => reset()}>
              Try again
            </button>
            <Link className="btn" href="/admin/">
              Go to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
