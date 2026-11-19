import Link from "next/link";
import { FilesTabs } from "@/components/admin/FilesTabs";
import { Icon } from "@/components/admin/Icon";
import { KindBadge, PageHead, shortDate } from "@/components/admin/ui";
import { formatBytes, leadReference } from "@/lib/leads/rules";
import { requireAdminPage } from "@/server/auth/admin";
import { listAllLeadFiles } from "@/server/leads";

const VIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

/** Every file customers sent with a quote or tech pack (private: only readable here, never public). */
export default async function FilesPage() {
  await requireAdminPage();
  const files = await listAllLeadFiles();
  return (
    <div className="a-page wide">
      <PageHead title="Files" />
      <FilesTabs current="customer" />
      <section className="a-card flush" aria-label="Customer files">
        {files.length === 0 ? (
          <div className="a-empty">
            <strong>No customer files yet</strong>
            <span>Tech packs, sketches and references that customers attach on the website are kept here, private to this admin.</span>
          </div>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">From</th>
                  <th scope="col" className="hide-sm num">
                    Size
                  </th>
                  <th scope="col" className="hide-sm num">
                    Date
                  </th>
                  <th scope="col" className="num">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const base = `/api/admin/leads/${f.leadId}/files/${f.id}/`;
                  return (
                    <tr key={f.id}>
                      <td>
                        <div className="a-cell-main">
                          <Icon name="file" />
                          <span style={{ overflowWrap: "anywhere", fontWeight: 600 }}>{f.originalName}</span>
                        </div>
                      </td>
                      <td>
                        <Link href={`/admin/leads/${f.leadId}/`}>{f.leadName}</Link>
                        <div className="a-meta">
                          <KindBadge kind={f.leadKind} /> {leadReference(f.leadId)}
                        </div>
                      </td>
                      <td className="hide-sm num a-meta">{formatBytes(f.size)}</td>
                      <td className="hide-sm num a-meta">{shortDate(f.createdAt)}</td>
                      <td className="actions">
                        <span className="a-media-tools" style={{ justifyContent: "flex-end" }}>
                          {VIEWABLE.has(f.mime) && (
                            <a className="btn" href={`${base}?view=1`} target="_blank" rel="noopener noreferrer">
                              View<span className="sr-only"> {f.originalName}</span>
                            </a>
                          )}
                          <a className="btn icon" href={base} download title="Download">
                            <Icon name="download" size={16} />
                            <span className="sr-only">Download {f.originalName}</span>
                          </a>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
