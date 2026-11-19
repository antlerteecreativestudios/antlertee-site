// Leads data access. Parameterised SQL only.
import { isLeadStage, STAGE_LABELS, type LeadFileRef, type LeadInput, type LeadKind, type LeadStage, type LeadStatus } from "@/lib/leads/rules";
import { iso, json, num, query, str, type Row } from "./db";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface LeadPayload {
  fields?: Record<string, string>;
  techPack?: unknown;
  /** Plain-text tech pack summary composed on the server from the sanitised builder state. */
  summary?: string;
}

export interface Lead {
  id: string;
  createdAt: string;
  kind: LeadKind;
  status: LeadStatus;
  stage: LeadStage;
  updatedAt: string;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  brand: string;
  message: string;
  payload: LeadPayload;
  sourcePath: string;
  userAgent: string;
  fileCount: number;
}

export interface LeadFile {
  id: string;
  leadId: string;
  originalName: string;
  mime: string;
  size: number;
  storageKey: string;
  createdAt: string;
}

function toPayload(v: unknown): LeadPayload {
  const p = json(v);
  return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as LeadPayload) : {};
}

function toLead(r: Row): Lead {
  return {
    id: str(r.id),
    createdAt: iso(r.created_at),
    kind: str(r.kind) === "techpack" ? "techpack" : "quote",
    status: (["new", "read", "done", "spam"].includes(str(r.status)) ? str(r.status) : "new") as LeadStatus,
    stage: isLeadStage(r.stage) ? r.stage : "new",
    updatedAt: iso(r.updated_at ?? r.created_at),
    name: str(r.name),
    email: str(r.email),
    whatsapp: str(r.whatsapp),
    country: str(r.country),
    brand: str(r.brand),
    message: str(r.message),
    payload: toPayload(r.payload),
    sourcePath: str(r.source_path),
    userAgent: str(r.user_agent),
    fileCount: num(r.file_count),
  };
}

function toFile(r: Row): LeadFile {
  return {
    id: str(r.id),
    leadId: str(r.lead_id),
    originalName: str(r.original_name),
    mime: str(r.mime),
    size: num(r.size),
    storageKey: str(r.storage_key),
    createdAt: iso(r.created_at),
  };
}

/** Inserts the lead and its files in one statement, so either both are saved or neither. */
export async function createLead(
  input: LeadInput,
  payload: LeadPayload,
  files: LeadFileRef[],
  meta: { ipHash: string; userAgent: string },
): Promise<string> {
  const fileRows = files.map((f) => ({ original_name: f.name, mime: f.mime, size: f.size, storage_key: f.key }));
  const rows = await query<{ id: string }>(
    `WITH l AS (
       INSERT INTO leads (kind, name, email, whatsapp, country, brand, message, payload, source_path, ip_hash, user_agent)
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), $8::jsonb, NULLIF($9, ''), $10, NULLIF($11, ''))
       RETURNING id
     ), f AS (
       INSERT INTO lead_files (lead_id, original_name, mime, size, storage_key)
       SELECT l.id, x.original_name, x.mime, x.size, x.storage_key
       FROM l, jsonb_to_recordset($12::jsonb) AS x(original_name text, mime text, size bigint, storage_key text)
     )
     SELECT id FROM l`,
    [
      input.kind,
      input.name,
      input.email,
      input.whatsapp,
      input.country,
      input.brand,
      input.message,
      JSON.stringify(payload),
      input.sourcePath,
      meta.ipHash,
      meta.userAgent,
      JSON.stringify(fileRows),
    ],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Lead insert returned no id.");
  return str(id);
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export interface LeadFilter {
  status?: LeadStatus;
  stage?: LeadStage;
  /** Several stages at once (e.g. the "open deals" view). */
  stages?: LeadStage[];
  kind?: LeadKind;
  /** Hide spam unless asked for (the Shopify-style list shows spam only in its own tab). */
  hideSpam?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

const LIST_COLUMNS = `l.*, (SELECT count(*) FROM lead_files f WHERE f.lead_id = l.id) AS file_count`;

export async function listLeads(filter: LeadFilter): Promise<{ leads: Lead[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`l.status = $${params.length}`);
  }
  if (filter.stage) {
    params.push(filter.stage);
    where.push(`l.stage = $${params.length}`);
  }
  if (filter.stages?.length) {
    params.push(filter.stages);
    where.push(`l.stage = ANY($${params.length}::text[])`);
  }
  if (filter.kind) {
    params.push(filter.kind);
    where.push(`l.kind = $${params.length}`);
  }
  if (filter.hideSpam && filter.status !== "spam") where.push(`l.status <> 'spam'`);
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    const p = `$${params.length}`;
    where.push(`(l.name ILIKE ${p} OR l.email ILIKE ${p} OR l.brand ILIKE ${p} OR l.whatsapp ILIKE ${p})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countRows = await query(`SELECT count(*) AS n FROM leads l ${whereSql}`, params);
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const offset = Math.max(filter.offset ?? 0, 0);
  const rows = await query(
    `SELECT ${LIST_COLUMNS} FROM leads l ${whereSql} ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return { leads: rows.map(toLead), total: num(countRows[0]?.n) };
}

export async function statusCounts(): Promise<Record<LeadStatus | "all", number>> {
  const rows = await query("SELECT status, count(*) AS n FROM leads GROUP BY status");
  const out: Record<LeadStatus | "all", number> = { all: 0, new: 0, read: 0, done: 0, spam: 0 };
  for (const r of rows) {
    const s = str(r.status) as LeadStatus;
    if (s in out) out[s] = num(r.n);
    out.all += num(r.n);
  }
  return out;
}

export async function getLead(id: string): Promise<{ lead: Lead; files: LeadFile[] } | null> {
  if (!UUID_RE.test(id)) return null;
  const rows = await query(`SELECT ${LIST_COLUMNS} FROM leads l WHERE l.id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;
  const files = await query("SELECT * FROM lead_files WHERE lead_id = $1 ORDER BY created_at, original_name", [id]);
  return { lead: toLead(row), files: files.map(toFile) };
}

export async function getLeadFile(leadId: string, fileId: string): Promise<LeadFile | null> {
  if (!UUID_RE.test(leadId) || !UUID_RE.test(fileId)) return null;
  const rows = await query("SELECT * FROM lead_files WHERE id = $1 AND lead_id = $2", [fileId, leadId]);
  return rows[0] ? toFile(rows[0]) : null;
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const rows = await query("UPDATE leads SET status = $2, updated_at = now() WHERE id = $1 RETURNING id", [id, status]);
  return rows.length > 0;
}

/** Moves a lead to another pipeline stage and records the change on its timeline (one statement: both or neither). */
export async function setLeadStage(id: string, stage: LeadStage): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const rows = await query(
    `WITH old AS (SELECT stage FROM leads WHERE id = $1),
     upd AS (
       UPDATE leads SET stage = $2, updated_at = now(), status = CASE WHEN status = 'new' THEN 'read' ELSE status END
       WHERE id = $1 RETURNING id
     ),
     ev AS (
       INSERT INTO lead_events (lead_id, kind, body)
       SELECT upd.id, 'stage', $3 FROM upd, old WHERE old.stage IS DISTINCT FROM $2
     )
     SELECT id FROM upd`,
    [id, stage, `Moved to ${STAGE_LABELS[stage]}`],
  );
  return rows.length > 0;
}

export interface LeadEvent {
  id: string;
  createdAt: string;
  kind: "note" | "stage";
  body: string;
}

export async function listLeadEvents(id: string): Promise<LeadEvent[]> {
  if (!UUID_RE.test(id)) return [];
  const rows = await query("SELECT * FROM lead_events WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 500", [id]);
  return rows.map((r) => ({ id: str(r.id), createdAt: iso(r.created_at), kind: str(r.kind) === "stage" ? "stage" : "note", body: str(r.body) }));
}

export async function addLeadNote(id: string, body: string): Promise<LeadEvent | null> {
  if (!UUID_RE.test(id)) return null;
  const rows = await query(
    `WITH ev AS (INSERT INTO lead_events (lead_id, kind, body) SELECT id, 'note', $2 FROM leads WHERE id = $1 RETURNING *),
     upd AS (UPDATE leads SET updated_at = now() WHERE id = $1)
     SELECT * FROM ev`,
    [id, body],
  );
  const r = rows[0];
  return r ? { id: str(r.id), createdAt: iso(r.created_at), kind: "note", body: str(r.body) } : null;
}

export async function deleteLeadNote(leadId: string, eventId: string): Promise<boolean> {
  if (!UUID_RE.test(leadId) || !UUID_RE.test(eventId)) return false;
  const rows = await query("DELETE FROM lead_events WHERE id = $1 AND lead_id = $2 AND kind = 'note' RETURNING id", [eventId, leadId]);
  return rows.length > 0;
}

/** Lead counts per pipeline stage (spam excluded) and per kind, for the tabs and the dashboard. */
export async function pipelineCounts(): Promise<{ stages: Record<LeadStage | "all", number>; techpacks: number; spam: number; unread: number }> {
  const rows = await query(
    `SELECT stage, kind, status, count(*) AS n FROM leads GROUP BY stage, kind, status`,
  );
  const stages = { all: 0, new: 0, contacted: 0, quoted: 0, sampling: 0, production: 0, delivered: 0, lost: 0 } as Record<LeadStage | "all", number>;
  let techpacks = 0;
  let spam = 0;
  let unread = 0;
  for (const r of rows) {
    const n = num(r.n);
    if (str(r.status) === "spam") {
      spam += n;
      continue;
    }
    if (str(r.status) === "new") unread += n;
    const s = str(r.stage);
    if (isLeadStage(s)) stages[s] += n;
    stages.all += n;
    if (str(r.kind) === "techpack") techpacks += n;
  }
  return { stages, techpacks, spam, unread };
}

/** Leads per day for the last `days` days (spam excluded), oldest first, for the dashboard chart. */
export async function leadsPerDay(days: number): Promise<{ day: string; n: number }[]> {
  const rows = await query(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*) AS n
     FROM leads WHERE status <> 'spam' AND created_at >= now() - ($1::int * interval '1 day')
     GROUP BY 1 ORDER BY 1`,
    [days],
  );
  const byDay = new Map(rows.map((r) => [str(r.day), num(r.n)]));
  const out: { day: string; n: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, n: byDay.get(key) ?? 0 });
  }
  return out;
}

/** Every customer file across all leads, newest first (the Files page). */
export async function listAllLeadFiles(limit = 300): Promise<(LeadFile & { leadName: string; leadKind: LeadKind })[]> {
  const rows = await query(
    `SELECT f.*, l.name AS lead_name, l.kind AS lead_kind FROM lead_files f JOIN leads l ON l.id = f.lead_id
     WHERE l.status <> 'spam' ORDER BY f.created_at DESC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 1000)],
  );
  return rows.map((r) => ({ ...toFile(r), leadName: str(r.lead_name), leadKind: str(r.lead_kind) === "techpack" ? "techpack" : "quote" }));
}

/** Deletes the lead row (files cascade) and returns the storage keys so the caller can delete the files. */
export async function deleteLead(id: string): Promise<string[] | null> {
  if (!UUID_RE.test(id)) return null;
  const files = await query<{ storage_key: string }>("SELECT storage_key FROM lead_files WHERE lead_id = $1", [id]);
  const rows = await query("DELETE FROM leads WHERE id = $1 RETURNING id", [id]);
  if (!rows.length) return null;
  return files.map((f) => str(f.storage_key));
}

export async function allLeadsForExport(): Promise<Lead[]> {
  const rows = await query(`SELECT ${LIST_COLUMNS} FROM leads l ORDER BY l.created_at DESC LIMIT 10000`);
  return rows.map(toLead);
}

/** Counts for the list tabs: each stage (spam excluded), "open" deals, spam and archived, optionally for one kind. */
export async function stageCounts(kind?: LeadKind): Promise<Record<LeadStage | "all" | "open" | "spam" | "archived", number>> {
  const rows = await query(
    `SELECT stage, status, count(*) AS n FROM leads ${kind ? "WHERE kind = $1" : ""} GROUP BY stage, status`,
    kind ? [kind] : [],
  );
  const out = { all: 0, open: 0, spam: 0, archived: 0, new: 0, contacted: 0, quoted: 0, sampling: 0, production: 0, delivered: 0, lost: 0 };
  for (const r of rows) {
    const n = num(r.n);
    const status = str(r.status);
    if (status === "spam") {
      out.spam += n;
      continue;
    }
    if (status === "done") out.archived += n;
    const s = str(r.stage);
    if (isLeadStage(s)) out[s] += n;
    if (s === "contacted" || s === "quoted" || s === "sampling" || s === "production") out.open += n;
    out.all += n;
  }
  return out;
}
