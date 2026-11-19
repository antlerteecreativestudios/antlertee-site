import { FilesTabs } from "@/components/admin/FilesTabs";
import { PageHead } from "@/components/admin/ui";
import { SlotCard } from "@/components/admin/SlotCard";
import type { ImageId } from "@/content/images";
import { resolveImage } from "@/lib/media";
import { requireAdminPage } from "@/server/auth/admin";
import { allSlots, listOverrides } from "@/server/media";
import { slotUsage } from "@/server/slot-usage";

export default async function SiteImagesPage() {
  const { csrf } = await requireAdminPage();
  const overrides = await listOverrides();
  const byId = new Map(overrides.map((o) => [o.slotId, o]));
  const usage = slotUsage();
  const slots = allSlots();
  const replaced = overrides.filter((o) => o.url).length;

  return (
    <div className="a-page wide">
      <PageHead title="Files" />
      <FilesTabs current="site" />
        <p className="a-sub">
          Every image on the site, {slots.length} in all ({replaced} replaced). Replace one with a JPG, PNG or WebP: it is cropped to the same
          shape, optimised, and goes live on the site within a few seconds. Reset brings back the original.
        </p>
        <ul className="adm-grid">
          {slots.map((s) => {
            const o = byId.get(s.id);
            const img = resolveImage(s.id as ImageId, o);
            return (
              <li key={s.id}>
                <SlotCard
                  csrf={csrf}
                  id={s.id}
                  aspect={s.aspect}
                  manifestAlt={s.alt}
                  customAlt={o?.alt ?? null}
                  src={img.src}
                  width={img.width}
                  height={img.height}
                  replaced={Boolean(o?.url)}
                  hasOverride={Boolean(o)}
                  usedIn={usage.get(s.id) ?? []}
                />
              </li>
            );
          })}
        </ul>
    </div>
  );
}
