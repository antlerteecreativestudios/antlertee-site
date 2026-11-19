// Streams one customer file with safe headers. Shared by the admin download route and the signed share-link route.
import type { LeadFile } from "./leads";
import { getStorage } from "./storage";

/** Types the browser may show inline (everything else downloads). Never HTML/SVG: those are not accepted at all. */
export const INLINE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Returns null when the stored object is missing. */
export async function leadFileResponse(file: LeadFile, inline: boolean): Promise<Response | null> {
  const obj = await getStorage().read("leads", file.storageKey);
  if (!obj) return null;
  const show = inline && INLINE_TYPES.has(file.mime);
  return new Response(obj.stream, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(obj.size),
      "Content-Disposition": contentDisposition(show ? "inline" : "attachment", file.originalName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      // Chrome's PDF viewer will not run in a sandboxed document, so PDFs get a strict policy without `sandbox`.
      "Content-Security-Policy": file.mime === "application/pdf" ? "default-src 'none'; img-src 'self'" : "default-src 'none'; img-src 'self'; sandbox",
      "Referrer-Policy": "no-referrer",
    },
  });
}
