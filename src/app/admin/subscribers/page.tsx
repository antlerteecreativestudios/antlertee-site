import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { LocalTime } from "@/components/admin/LocalTime";
import { one, PageHead, type Search } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/auth/admin";
import { listSubscribers } from "@/server/subscribers";

const PAGE = 100;

export default async function SubscribersPage({ searchParams }: { searchParams: Search }) {
  await requireAdminPage();
  const page = Math.max(1, Number.parseInt(one((await searchParams).page), 10) || 1);
  const { subscribers, total } = await listSubscribers(PAGE, (page - 1) * PAGE);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="a-page wide">
      <PageHead
        title="Subscribers"
        actions={
          <a className="btn" href="/api/admin/subscribers/export/" download>
            <Icon name="download" size={16} /> Export
          </a>
        }
      />
      <p className="a-sub">People who joined the newsletter from the website footer. Export the list to send a campaign from your email tool.</p>
      <section className="a-card flush" aria-label="Subscribers">
        {subscribers.length === 0 ? (
          <div className="a-empty">
            <strong>No subscribers yet</strong>
            <span>New sign-ups from the footer appear here.</span>
          </div>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="hide-sm">
                    Signed up on
                  </th>
                  <th scope="col" className="num">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{s.email}</td>
                    <td>
                      <span className="badge" data-tone={s.status === "subscribed" ? "good" : undefined}>
                        {s.status === "subscribed" ? "Subscribed" : "Unsubscribed"}
                      </span>
                    </td>
                    <td className="hide-sm a-meta">{s.sourcePath || "—"}</td>
                    <td className="num a-meta">
                      <LocalTime iso={s.createdAt} />
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
              <Link className="btn" href={`/admin/subscribers/${page - 1 > 1 ? `?page=${page - 1}` : ""}`}>
                Newer
              </Link>
            )}
            <span className="a-sub">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="btn" href={`/admin/subscribers/?page=${page + 1}`}>
                Older
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
