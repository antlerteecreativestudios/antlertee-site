// Tracking and verification connections managed on the admin's Settings page. Shared by the server (validation, storage)
// and the browser (the tags rendered on public pages). Every id is checked against a strict pattern before it is saved,
// because it ends up inside a script on every page: only the expected characters can ever get there.

export interface ConnectionDef {
  key: ConnectionKey;
  name: string;
  help: string;
  placeholder: string;
  pattern: RegExp;
  error: string;
}

export const CONNECTION_KEYS = ["metaPixel", "ga4", "gtm", "tiktok", "clarity", "googleVerify", "bingVerify"] as const;
export type ConnectionKey = (typeof CONNECTION_KEYS)[number];

export interface ConnectionValue {
  id: string;
  enabled: boolean;
}

export type Connections = Record<ConnectionKey, ConnectionValue>;

export const CONNECTIONS: readonly ConnectionDef[] = [
  {
    key: "metaPixel",
    name: "Meta Pixel",
    help: "Facebook and Instagram ads. Meta Events Manager → Data sources → your pixel → the number under its name.",
    placeholder: "e.g. 1234567890123456",
    pattern: /^\d{10,20}$/,
    error: "A Meta Pixel id is 10 to 20 digits.",
  },
  {
    key: "ga4",
    name: "Google Analytics 4",
    help: "Google Analytics → Admin → Data streams → your website → Measurement ID.",
    placeholder: "e.g. G-ABC123XYZ9",
    pattern: /^G-[A-Z0-9]{6,12}$/,
    error: "A Measurement ID looks like G-ABC123XYZ9.",
  },
  {
    key: "gtm",
    name: "Google Tag Manager",
    help: "Tag Manager → your container id at the top. Use this or Google Analytics, not both for the same tags.",
    placeholder: "e.g. GTM-ABC1234",
    pattern: /^GTM-[A-Z0-9]{4,10}$/,
    error: "A container id looks like GTM-ABC1234.",
  },
  {
    key: "tiktok",
    name: "TikTok Pixel",
    help: "TikTok Ads Manager → Assets → Events → Web events → your pixel id.",
    placeholder: "e.g. C4ABCDEF12GHIJKL3MN0",
    pattern: /^[A-Z0-9]{15,25}$/,
    error: "A TikTok pixel id is 15 to 25 capital letters and numbers.",
  },
  {
    key: "clarity",
    name: "Microsoft Clarity",
    help: "Free heatmaps and session recordings. Clarity → Settings → Overview → Project ID.",
    placeholder: "e.g. abcd1234ef",
    pattern: /^[a-z0-9]{8,12}$/,
    error: "A Clarity project id is 8 to 12 lowercase letters and numbers.",
  },
  {
    key: "googleVerify",
    name: "Google Search Console",
    help: "Search Console → Add property → URL prefix → HTML tag. Paste only the content=\"…\" value.",
    placeholder: "e.g. abc123-XYZ_456",
    pattern: /^[A-Za-z0-9_-]{10,100}$/,
    error: "Paste only the code inside content=\"…\" (letters, numbers, - and _).",
  },
  {
    key: "bingVerify",
    name: "Bing Webmaster Tools",
    help: "Bing Webmaster → Add site → HTML meta tag. Paste only the content=\"…\" value.",
    placeholder: "e.g. 0123456789ABCDEF0123456789ABCDEF",
    pattern: /^[A-Za-z0-9_-]{10,100}$/,
    error: "Paste only the code inside content=\"…\" (letters, numbers, - and _).",
  },
];

export const EMPTY_CONNECTIONS: Connections = Object.fromEntries(CONNECTION_KEYS.map((k) => [k, { id: "", enabled: false }])) as Connections;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Validates untrusted input. An empty id is allowed (and always saved switched off). */
export function validateConnections(raw: unknown): { ok: true; value: Connections } | { ok: false; errors: Record<string, string> } {
  if (!isRecord(raw)) return { ok: false, errors: { form: "Invalid request." } };
  const errors: Record<string, string> = {};
  const value = { ...EMPTY_CONNECTIONS };
  for (const def of CONNECTIONS) {
    const item = raw[def.key];
    const id = isRecord(item) && typeof item.id === "string" ? item.id.trim() : "";
    const enabled = isRecord(item) && item.enabled === true;
    if (id && !def.pattern.test(id)) errors[def.key] = def.error;
    value[def.key] = { id, enabled: Boolean(id) && enabled };
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** Reads stored settings defensively (old or partial rows), dropping anything that no longer passes validation. */
export function normalizeConnections(raw: unknown): Connections {
  const out = { ...EMPTY_CONNECTIONS };
  if (!isRecord(raw)) return out;
  for (const def of CONNECTIONS) {
    const item = raw[def.key];
    if (!isRecord(item) || typeof item.id !== "string" || !def.pattern.test(item.id)) continue;
    out[def.key] = { id: item.id, enabled: item.enabled === true };
  }
  return out;
}

/** Only what the public pages need: the ids that are switched on. */
export type ActiveConnections = Partial<Record<ConnectionKey, string>>;

export function activeConnections(c: Connections): ActiveConnections {
  const out: ActiveConnections = {};
  for (const k of CONNECTION_KEYS) if (c[k].enabled && c[k].id) out[k] = c[k].id;
  return out;
}
