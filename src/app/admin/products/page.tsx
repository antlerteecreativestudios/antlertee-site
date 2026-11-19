import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { ImportButton } from "@/components/admin/ImportButton";
import { OrderButtons } from "@/components/admin/OrderButtons";
import { one, PageHead, qs, type Search } from "@/components/admin/ui";
import { categories, type Category } from "@/content/products";
import { requireAdminPage } from "@/server/auth/admin";
import { thumbResolver } from "@/server/admin-images";
import { listAdminProducts, productCounts, type ProductStatus } from "@/server/catalog";

const isCategory = (v: string): v is Category => categories.some((c) => c === v);

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
  const { csrf } = await requireAdminPage();
  const sp = await searchParams;
  const statusRaw = one(sp.status);
  const status: ProductStatus | undefined = statusRaw === "active" || statusRaw === "draft" ? statusRaw : undefined;
  const catRaw = one(sp.category);
  const category = isCategory(catRaw) ? catRaw : undefined;
  const q = one(sp.q).slice(0, 100);
  const [products, counts, thumb] = await Promise.all([listAdminProducts({ status, category, q }), productCounts(), thumbResolver()]);
  const filtered = Boolean(status || category || q);
  const allIds = filtered ? [] : products.map((p) => p.id);
  const tabs: { key: ProductStatus | "all"; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "active", label: "Active", n: counts.active },
    { key: "draft", label: "Draft", n: counts.draft },
  ];

  return (
    <div className="a-page wide">
      <PageHead
        title="Products"
        actions={
          <Link className="btn primary" href="/admin/products/new/">
            <Icon name="plus" size={16} /> Add product
          </Link>
        }
      />

      {counts.all === 0 ? (
        <section className="a-card">
          <div className="a-empty">
            <strong>Bring in your products</strong>
            <span>
              Until you do, the website shows its built-in products. Importing copies the 26 products and 6 blog posts (with their photos) from the
              old studio into this admin, where you can edit them. Nothing is overwritten.
            </span>
            <ImportButton csrf={csrf} />
          </div>
        </section>
      ) : (
        <>
        <p className="a-sub">Everything on the website&apos;s rack. Click a product to change its photos, details or minimum order. Drafts stay hidden from visitors. Use the arrows to change the order on the website.</p>
        <section className="a-card flush" aria-label="Products">
          <nav aria-label="Filter by status">
            <ul className="a-tabs">
              {tabs.map((t) => (
                <li key={t.key}>
                  <Link href={`/admin/products/${qs({ status: t.key === "all" ? "" : t.key, category, q })}`} aria-current={(status ?? "all") === t.key ? "page" : undefined}>
                    {t.label} <span className="n">{t.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form className="a-filters" role="search" action="/admin/products/" method="get">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="p-q" className="sr-only">
              Search products
            </label>
            <input id="p-q" name="q" type="search" className="a-input" defaultValue={q} placeholder="Search products" />
            <label htmlFor="p-cat" className="sr-only">
              Category
            </label>
            <select id="p-cat" name="category" className="a-input" defaultValue={category ?? ""}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="submit" className="btn">
              <Icon name="search" size={16} /> Filter
            </button>
          </form>
          {products.length === 0 ? (
            <div className="a-empty">
              <strong>No products match</strong>
              <span>Try another tab, category or search.</span>
            </div>
          ) : (
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="hide-sm">
                      Category
                    </th>
                    <th scope="col" className="hide-sm">
                      Minimum order
                    </th>
                    <th scope="col" className="num">
                      {filtered ? "" : "Order on site"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
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
                              <Link className="a-rowlink" href={`/admin/products/${p.id}/`}>
                                {p.name}
                              </Link>
                              <span className="a-meta" style={{ display: "block" }}>
                                {[p.sub, p.featured ? "On the home page" : ""].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge" data-tone={p.status === "active" ? "good" : "info"}>
                            {p.status === "active" ? "Active" : "Draft"}
                          </span>
                        </td>
                        <td className="hide-sm a-meta">{p.category}</td>
                        <td className="hide-sm a-meta">{p.moq || "Standard"}</td>
                        <td className="actions">{!filtered && <OrderButtons ids={allIds} index={i} name={p.name} csrf={csrf} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <details className="a-card">
          <summary className="a-label" style={{ cursor: "pointer" }}>
            Missing a product or photo from the old studio?
          </summary>
          <p className="a-sub" style={{ margin: "8px 0 12px" }}>
            Import again: it only adds products, posts and photos that aren&apos;t here yet, and never changes anything you edited.
          </p>
          <ImportButton csrf={csrf} />
        </details>
        </>
      )}
    </div>
  );
}
