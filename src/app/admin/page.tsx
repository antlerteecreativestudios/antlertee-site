import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { KindBadge, PageHead, shortDate, StageBadge } from "@/components/admin/ui";
import { leadReference } from "@/lib/leads/rules";
import { requireAdminPage } from "@/server/auth/admin";
import { productCounts, listAdminPosts } from "@/server/catalog";
import { leadsPerDay, listLeads, pipelineCounts } from "@/server/leads";
import { countSubscribers } from "@/server/subscribers";

/** Home: what needs attention today, like Shopify's home page. */
export default async function AdminHome() {
  await requireAdminPage();
  const [pipe, recent, days, products, posts, subscribers] = await Promise.all([
    pipelineCounts(),
    listLeads({ hideSpam: true, limit: 6 }),
    leadsPerDay(30),
    productCounts(),
    listAdminPosts(),
    countSubscribers(),
  ]);
  const open = pipe.stages.contacted + pipe.stages.quoted + pipe.stages.sampling + pipe.stages.production;
  const last30 = days.reduce((n, d) => n + d.n, 0);
  const peak = Math.max(1, ...days.map((d) => d.n));
  const empty = products.all === 0 && posts.length === 0;

  return (
    <div className="a-page">
      <PageHead title="Home" />

      {empty && (
        <div className="a-banner" data-tone="warn">
          <span>
            <strong>Bring your products and blog posts in.</strong> The site is showing its built-in content until you import it here. It takes about a
            minute and never overwrites anything.
          </span>
          <Link className="btn" href="/admin/products/">
            Go to Products
          </Link>
        </div>
      )}

      <div className="a-stats">
        <Link className="a-stat" href="/admin/leads/?stage=new">
          <span className="a-stat-label">New leads</span>
          <span className="a-stat-num">{pipe.stages.new}</span>
          <span className="a-small">{pipe.unread} unread</span>
        </Link>
        <Link className="a-stat" href="/admin/leads/?view=open">
          <span className="a-stat-label">Open deals</span>
          <span className="a-stat-num">{open}</span>
          <span className="a-small">contacted to in production</span>
        </Link>
        <Link className="a-stat" href="/admin/tech-packs/">
          <span className="a-stat-label">Tech packs</span>
          <span className="a-stat-num">{pipe.techpacks}</span>
          <span className="a-small">all time</span>
        </Link>
        <Link className="a-stat" href="/admin/subscribers/">
          <span className="a-stat-label">Subscribers</span>
          <span className="a-stat-num">{subscribers}</span>
          <span className="a-small">newsletter</span>
        </Link>
      </div>

      <div className="a-cols">
        <div className="a-stack">
          <section className="a-card" aria-labelledby="h-chart">
            <div className="a-card-head">
              <h2 id="h-chart">Leads, last 30 days</h2>
              <span className="a-sub">{last30} in total</span>
            </div>
            <div className="a-bars" role="img" aria-label={`Leads per day for the last 30 days, ${last30} in total.`}>
              {days.map((d) => (
                <span key={d.day} title={`${shortDate(d.day)}: ${d.n}`} data-zero={d.n === 0 || undefined} style={{ height: `${(d.n / peak) * 100}%` }} />
              ))}
            </div>
            <div className="a-bars-axis" aria-hidden="true">
              <span>{shortDate(days[0]?.day ?? "")}</span>
              <span>Today</span>
            </div>
          </section>

          <section className="a-card flush" aria-labelledby="h-recent">
            <div className="a-card-head" style={{ padding: "14px 16px 0" }}>
              <h2 id="h-recent">Latest leads</h2>
              <Link className="btn plain" href="/admin/leads/">
                View all
              </Link>
            </div>
            {recent.leads.length === 0 ? (
              <div className="a-empty">
                <strong>No leads yet</strong>
                <span>Quote requests and tech packs sent from the website show up here.</span>
              </div>
            ) : (
              <div className="a-table-wrap" style={{ marginTop: 8 }}>
                <table className="a-table">
                  <tbody>
                    {recent.leads.map((l) => (
                      <tr key={l.id} data-unread={l.status === "new" || undefined}>
                        <td>
                          <Link className="a-rowlink" href={`/admin/leads/${l.id}/`}>
                            {l.name}
                          </Link>
                          <div className="a-meta">{[l.brand, leadReference(l.id)].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td className="hide-sm">
                          <KindBadge kind={l.kind} />
                        </td>
                        <td>
                          <StageBadge stage={l.stage} />
                        </td>
                        <td className="num a-meta">{shortDate(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="a-stack">
          <section className="a-card" aria-labelledby="h-store">
            <h2 id="h-store">Your store</h2>
            <dl className="a-dl">
              <dt>Products</dt>
              <dd>
                {products.active} live{products.draft ? `, ${products.draft} draft` : ""}
              </dd>
              <dt>Blog posts</dt>
              <dd>{posts.filter((p) => p.status === "published").length} published</dd>
              <dt>Delivered</dt>
              <dd>{pipe.stages.delivered} orders</dd>
            </dl>
          </section>
          <section className="a-card" aria-labelledby="h-quick">
            <h2 id="h-quick">Quick actions</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <Link className="btn" href="/admin/products/new/">
                <Icon name="plus" size={16} /> Add product
              </Link>
              <Link className="btn" href="/admin/blog/new/">
                <Icon name="plus" size={16} /> Write a blog post
              </Link>
              <Link className="btn" href="/admin/files/">
                <Icon name="folder" size={16} /> Files and photos
              </Link>
              <Link className="btn" href="/admin/settings/">
                <Icon name="settings" size={16} /> Connect Meta Pixel and Google
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
