// Private share links for customer files: the WhatsApp message carries one link per file so the team can open them from
// the chat without logging in. A link is an HMAC over (lead, file, expiry) with a key derived from SESSION_SECRET, so it
// cannot be guessed or altered, and it stops working after LINK_DAYS. Changing SESSION_SECRET revokes every link.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { authConfig } from "./config";

export const LINK_DAYS = 30;

function key(): Buffer {
  return createHash("sha256").update(`file-links\u0000${authConfig().sessionSecret}`).digest();
}

function mac(leadId: string, fileId: string, exp: number): string {
  return createHmac("sha256", key()).update(`${leadId}\u0000${fileId}\u0000${exp}`).digest("base64url");
}

/** Token for one file, valid until `now + LINK_DAYS`. */
export function signFileLink(leadId: string, fileId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + LINK_DAYS * 86_400;
  return `${exp}.${mac(leadId, fileId, exp)}`;
}

export function verifyFileLink(leadId: string, fileId: string, token: string | null, now = Date.now()): boolean {
  if (!token || token.length > 200) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!sig || !Number.isInteger(exp) || exp < Math.floor(now / 1000)) return false;
  const want = Buffer.from(mac(leadId, fileId, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Absolute URL of a file's share link, on the origin the visitor used (works on previews and the live domain). */
export function fileLinkUrl(origin: string, leadId: string, fileId: string): string {
  return `${origin}/api/files/${leadId}/${fileId}/?t=${encodeURIComponent(signFileLink(leadId, fileId))}`;
}
