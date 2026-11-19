// Site settings (Settings page): stored as JSON rows in site_settings. Public pages read the active connections through a
// cached call that never throws, so tracking can never take the site down.
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { activeConnections, normalizeConnections, type ActiveConnections, type Connections } from "@/lib/connections";
import { json, query } from "./db";

export const SETTINGS_TAG = "site-settings";

export async function getConnections(): Promise<Connections> {
  const rows = await query("SELECT value FROM site_settings WHERE key = 'connections'");
  return normalizeConnections(json(rows[0]?.value));
}

export async function saveConnections(value: Connections): Promise<void> {
  await query(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ('connections', $1::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(value)],
  );
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

async function readActive(): Promise<ActiveConnections> {
  try {
    return activeConnections(await getConnections());
  } catch {
    // No database (or unreachable): no tracking tags, the site works as usual.
    return {};
  }
}

export const getActiveConnections = unstable_cache(readActive, ["active-connections-v1"], { tags: [SETTINGS_TAG], revalidate: 300 });
