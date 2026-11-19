// Thumbnails for admin lists and editors: the current picture of any photo slot (an uploaded replacement or the
// built-in file), read fresh from the database (not the public pages' cache).
import type { ImageId } from "@/content/images";
import { resolveImage } from "@/lib/media";
import { listOverrides } from "./media";

export interface Thumb {
  slot: string;
  src: string;
  alt: string;
  /** Uploaded in the admin (can be deleted and described here) rather than one of the site's built-in photos. */
  own: boolean;
}

export async function thumbResolver(): Promise<(slot: string) => Thumb | null> {
  const overrides = new Map((await listOverrides()).map((o) => [o.slotId, o]));
  return (slot: string) => {
    if (!slot) return null;
    const img = resolveImage(slot as ImageId, overrides.get(slot));
    return { slot, src: img.src, alt: img.alt, own: /^p-/.test(slot) };
  };
}
