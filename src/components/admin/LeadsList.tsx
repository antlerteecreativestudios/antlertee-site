import Link from "next/link";
import { isLeadStage, leadReference, LEAD_STAGES, STAGE_LABELS, type LeadKind, type LeadStage } from "@/lib/leads/rules";
import { listLeads, stageCounts, type LeadFilter } from "@/server/leads";
import { Icon } from "./Icon";
import { KindBadge, one, PageHead, qs, shortDate, StageBadge, type Search } from "./ui";

const PAGE = 50;
const OPEN: LeadStage[] = ["contacted", "quoted", "sampling", "production"];

type View = LeadStage | "all" | "open" | "spam";

/** The leads table (Shopify's Orders list for B2B): stage tabs, search, pages. Used by Leads and Tech packs. */
export async function LeadsList({ searchParams, kind }: { searchParams: Search; kind?: LeadKind }) {
  const sp = await searchParams;
  const base = kind === "techpack" ? "/admin/tech-packs/" : "/admin/leads/";
  const rawView = one(sp.view) || one(sp.stage);
  const view: View = rawView === "open" || rawView === "spam" || isLeadStage(rawView) ? rawView : "all";
  const q = one(sp.q).slice(0, 100);
  const page = Math.min(Math.max(1, Number.parseInt(one(sp.page), 10) || 1), 10_000);

  const filter: LeadFilter = { kind, q, limit: PAGE, offset: (page - 1) * PAGE, hideSpam: true };
  if (view === "spam") filter.status = "spam";
  else if (view === "open") filter.stages = OPEN;
  else if (view !== "all") filter.stage = view;

  const [{ leads, total }, counts] = await Promise.all([listLeads(filter), stageCounts(kind)]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const tabs: { view: View; label: string; n: number }[] = [
    { view: "all", label: "All", n: counts.all },
    { view: "open", label: "Open deals", n: counts.open },
    ...LEAD_STAGES.map((s) => ({ view: s, label: STAGE_LABELS[s], n: counts[s] })),
    { view: "spam", label: "Spam", n: counts.spam },
  ];
  const href = (v: View, p = 1) => `${base}${qs({ view: v === "all" ? "" : v, q, page: p > 1 ? p : undefined })}`;
  const title = kind === "techpack" ? "Tech packs" : "Leads";

  return (
    <div className="a-page wide">
      <PageHead
        title={title}
        actions={
          <a className="btn" href={`/api/admin/leads/export/`} download>
            <Icon name="download" size={16} /> Export
          </a>
        }
      />
      <p className="a-sub">
        {kind === "techpack"
          ? "Every tech pack sent from the website, built with the online builder or uploaded as files. Bold rows are not opened yet."
          : "Everyone who asked for a price or sent a tech pack from the website. Bold rows are not opened yet. Open one to reply and to move it along as the order progresses."}
      </p>
      <section className="a-card flush" aria-label={title}>
        <nav aria-label="Filter by stage">
          <ul className="a-tabs">
            {tabs.map((t) => (
              <li key={t.view}>
                <Link href={href(t.view)} aria-current={view === t.view ? "page" : undefined}>
                  {t.label} <span className="n">{t.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form className="a-filters" role="search" action={base} method="get">
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <label htmlFor="lead-q" className="sr-only">
            Search by name, email, brand or WhatsApp
          </label>
          <input id="lead-q" name="q" type="search" className="a-input" defaultValue={q} placeholder="Search name, email, brand or WhatsApp" />
          <button type="submit" className="btn">
            <Icon name="search" size={16} /> Search
          </button>
        </form>

        {leads.length === 0 ? (
          <div className="a-empty">
            <strong>{q || view !== "all" ? "No leads match" : kind === "techpack" ? "No tech packs yet" : "No leads yet"}</strong>
            <span>
              {q || view !== "all"
                ? "Try another tab or search."
                : "Quote requests and tech packs sent from the website show up here, newest first."}
            </span>
          </div>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th scope="col">Lead</th>
                  <th scope="col" className="hide-sm">
                    Date
                  </th>
                  {!kind && (
                    <th scope="col" className="hide-sm">
                      Type
                    </th>
                  )}
                  <th scope="col" className="hide-sm">
                    Contact
                  </th>
                  <th scope="col" className="hide-sm num">
                    Files
                  </th>
                  <th scope="col">Stage</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} data-unread={l.status === "new" || undefined}>
                    <td>
                      <Link className="a-rowlink" href={`/admin/leads/${l.id}/`}>
                        {l.name}
                        {l.status === "new" && <span className="sr-only"> (unread)</span>}
                      </Link>
                      <div className="a-meta">{[l.brand, leadReference(l.id)].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="hide-sm nowrap a-meta">{shortDate(l.createdAt)}</td>
                    {!kind && (
                      <td className="hide-sm">
                        <KindBadge kind={l.kind} />
                      </td>
                    )}
                    <td className="hide-sm a-meta">{l.email || l.whatsapp}</td>
                    <td className="hide-sm num a-meta">{l.fileCount || "—"}</td>
                    <td>
                      {l.status === "spam" ? (
                        <span className="badge" data-tone="bad">
                          Spam
                        </span>
                      ) : (
                        <StageBadge stage={l.stage} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="a-pager" aria-label="Pages">
            {page > 1 && (
              <Link className="btn" href={href(view, page - 1)}>
                Newer
              </Link>
            )}
            <span className="a-sub">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="btn" href={href(view, page + 1)}>
                Older
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
