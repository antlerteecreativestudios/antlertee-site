import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { ImportButton } from "@/components/admin/ImportButton";
import { one, PageHead, qs, shortDate, type Search } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/auth/admin";
import { thumbResolver } from "@/server/admin-images";
import { listAdminPosts, readMinutes, type PostStatus } from "@/server/catalog";

export default async function BlogPage({ searchParams }: { searchParams: Search }) {
  const { csrf } = await requireAdminPage();
  const sp = await searchParams;
  const raw = one(sp.status);
  const status: PostStatus | undefined = raw === "published" || raw === "draft" ? raw : undefined;
  const q = one(sp.q).slice(0, 100);
  const [all, thumb] = await Promise.all([listAdminPosts(), thumbResolver()]);
  const posts = all.filter((p) => (!status || p.status === status) && (!q || `${p.title} ${p.tag}`.toLowerCase().includes(q.toLowerCase())));
  const tabs: { key: PostStatus | "all"; label: string; n: number }[] = [
    { key: "all", label: "All", n: all.length },
    { key: "published", label: "Published", n: all.filter((p) => p.status === "published").length },
    { key: "draft", label: "Draft", n: all.filter((p) => p.status === "draft").length },
  ];

  return (
    <div className="a-page wide">
      <PageHead
        title="Blog posts"
        actions={
          <Link className="btn primary" href="/admin/blog/new/">
            <Icon name="plus" size={16} /> Write a post
          </Link>
        }
      />
      {all.length === 0 ? (
        <section className="a-card">
          <div className="a-empty">
            <strong>Bring in your blog posts</strong>
            <span>Until you do, the website shows its 6 built-in posts. Importing copies them (and the products) here so you can edit them.</span>
            <ImportButton csrf={csrf} />
          </div>
        </section>
      ) : (
        <>
        <p className="a-sub">Articles on the website&apos;s blog. They help people find Antlertee on Google. Drafts stay hidden until you publish them.</p>
        <section className="a-card flush" aria-label="Blog posts">
          <nav aria-label="Filter by status">
            <ul className="a-tabs">
              {tabs.map((t) => (
                <li key={t.key}>
                  <Link href={`/admin/blog/${qs({ status: t.key === "all" ? "" : t.key, q })}`} aria-current={(status ?? "all") === t.key ? "page" : undefined}>
                    {t.label} <span className="n">{t.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form className="a-filters" role="search" action="/admin/blog/" method="get">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="b-q" className="sr-only">
              Search posts
            </label>
            <input id="b-q" name="q" type="search" className="a-input" defaultValue={q} placeholder="Search posts" />
            <button type="submit" className="btn">
              <Icon name="search" size={16} /> Search
            </button>
          </form>
          {posts.length === 0 ? (
            <div className="a-empty">
              <strong>No posts match</strong>
            </div>
          ) : (
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th scope="col">Post</th>
                    <th scope="col">Visibility</th>
                    <th scope="col" className="hide-sm">
                      Topic
                    </th>
                    <th scope="col" className="hide-sm num">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => {
                    const t = thumb(p.image);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="a-cell-main">
                            {t ? (
                              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of a pre-optimised file
                              <img className="a-thumb" src={t.src} alt="" width={40} height={40} loading="lazy" />
                            ) : (
                              <span className="a-thumb" aria-hidden="true" />
                            )}
                            <span>
                              <Link className="a-rowlink" href={`/admin/blog/${p.id}/`}>
                                {p.title}
                              </Link>
                              <span className="a-meta" style={{ display: "block" }}>
                                {readMinutes(p.body)} min read
                              </span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge" data-tone={p.status === "published" ? "good" : "info"}>
                            {p.status === "published" ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="hide-sm a-meta">{p.tag}</td>
                        <td className="hide-sm num a-meta">{shortDate(p.date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </>
      )}
    </div>
  );
}
