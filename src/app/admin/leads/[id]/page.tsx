import { notFound } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { LeadControls } from "@/components/admin/LeadControls";
import { LeadTimeline } from "@/components/admin/LeadTimeline";
import { LocalTime } from "@/components/admin/LocalTime";
import { KindBadge, PageHead, StageBadge } from "@/components/admin/ui";
import { formatBytes, leadReference } from "@/lib/leads/rules";
import { requireAdminPage } from "@/server/auth/admin";
import { getLead, listLeadEvents } from "@/server/leads";

const FIELD_LABELS: Record<string, string> = { product: "Product", quantity: "Quantity (pcs)", deadline: "Deadline" };
const VIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { csrf } = await requireAdminPage();
  const { id } = await params;
  const [found, events] = await Promise.all([getLead(id), listLeadEvents(id)]);
  if (!found) notFound();
  const { lead, files } = found;
  const back = lead.kind === "techpack" ? "/admin/tech-packs/" : "/admin/leads/";
  const fields = Object.entries(lead.payload.fields ?? {}).filter(([, v]) => v);
  const wa = lead.whatsapp.replace(/[^\d]/g, "");

  return (
    <div className="a-page wide">
      <PageHead
        title={`${leadReference(lead.id)} · ${lead.name}`}
        back={back}
        badges={
          <>
            <KindBadge kind={lead.kind} />
            {lead.status === "spam" ? (
              <span className="badge" data-tone="bad">
                Spam
              </span>
            ) : (
              <StageBadge stage={lead.stage} />
            )}
            {lead.status === "done" && <span className="badge">Archived</span>}
          </>
        }
      />
      <p className="a-sub" style={{ marginTop: -8 }}>
        Received <LocalTime iso={lead.createdAt} />
        {lead.sourcePath ? ` from ${lead.sourcePath}` : ""}
      </p>

      <div className="a-cols">
        <div className="a-stack">
          <section className="a-card" aria-labelledby="h-req">
            <h2 id="h-req">{lead.kind === "techpack" ? "Request" : "Quote request"}</h2>
            {fields.length > 0 && (
              <dl className="a-dl" style={{ marginBottom: lead.message ? 12 : 0 }}>
                {fields.map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{FIELD_LABELS[k] ?? k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {lead.message ? <p className="a-pre">{lead.message}</p> : fields.length === 0 && <p className="a-sub">No message.</p>}
          </section>

          {lead.payload.summary && (
            <section className="a-card" aria-labelledby="h-tp">
              <h2 id="h-tp">Tech pack built on the website</h2>
              <p className="a-pre">{lead.payload.summary}</p>
            </section>
          )}

          <section className="a-card" aria-labelledby="h-files">
            <h2 id="h-files">Files ({files.length})</h2>
            {files.length === 0 ? (
              <p className="a-sub">No files were sent with this lead.</p>
            ) : (
              <ul className="a-files">
                {files.map((f) => {
                  const base = `/api/admin/leads/${lead.id}/files/${f.id}/`;
                  return (
                    <li key={f.id} className="a-file">
                      <Icon name="file" />
                      <span className="a-file-name">
                        {f.originalName}
                        <span className="a-meta" style={{ display: "block", fontWeight: 400 }}>
                          {formatBytes(f.size)}
                        </span>
                      </span>
                      <span className="a-media-tools">
                        {VIEWABLE.has(f.mime) && (
                          <a className="btn" href={`${base}?view=1`} target="_blank" rel="noopener noreferrer">
                            View<span className="sr-only"> {f.originalName}</span>
                          </a>
                        )}
                        <a className="btn" href={base} download>
                          <Icon name="download" size={16} />
                          <span className="sr-only">Download {f.originalName}</span>
                        </a>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <LeadTimeline id={lead.id} csrf={csrf} events={events} receivedAt={lead.createdAt} />
        </div>

        <div className="a-stack">
          <LeadControls id={lead.id} stage={lead.stage} status={lead.status} csrf={csrf} back={back} />
          <section className="a-card" aria-labelledby="h-cust">
            <h2 id="h-cust">Customer</h2>
            <div style={{ display: "grid", gap: 6 }}>
              <strong>{lead.name}</strong>
              {lead.brand && <span>{lead.brand}</span>}
              {lead.country && <span className="a-sub">{lead.country}</span>}
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              {lead.email && (
                <a className="btn" href={`mailto:${lead.email}?subject=${encodeURIComponent(`Your Antlertee request ${leadReference(lead.id)}`)}`}>
                  <Icon name="mail" size={16} /> {lead.email}
                </a>
              )}
              {wa && (
                <a className="btn" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={16} /> {lead.whatsapp}
                </a>
              )}
            </div>
          </section>
          {lead.userAgent && (
            <p className="a-small" style={{ overflowWrap: "anywhere" }}>
              Browser: {lead.userAgent}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
