"use client";

import { useMemo, useState } from "react";
import { Picture } from "@/components/Picture";
import type { ImageId } from "@/content/images";
import type { Product } from "@/content/products";
import { TurnStage } from "./TurnStage";

export interface GalleryPhoto {
  id: ImageId;
  alt: string;
}

/** The cover photo first, then any extra photos added in the content studio. */
export function galleryPhotos(product: Product): [GalleryPhoto, ...GalleryPhoto[]] {
  const base = `${product.name}, ${product.sub}`;
  return [
    { id: product.image, alt: base },
    ...(product.gallery ?? []).map((g, i) => ({ id: g.image, alt: g.alt ?? `${base}, photo ${i + 2}` })),
  ];
}

/** Which photo is showing. Pair it with <GalleryThumbs> and render the current photo in a <TurnStage>. */
export function useGallery(product: Product) {
  const photos = useMemo(() => galleryPhotos(product), [product]);
  const [index, setIndex] = useState(0);
  const at = Math.min(index, photos.length - 1);
  return { photos, index: at, setIndex, current: photos[at] ?? photos[0] };
}

/** Small pictures under the photo to switch between them. Renders nothing when there is only the cover. */
export function GalleryThumbs({ photos, index, onSelect }: { photos: GalleryPhoto[]; index: number; onSelect: (i: number) => void }) {
  if (photos.length < 2) return null;
  return (
    <ul className="pv-thumbs" aria-label="More photos of this product">
      {photos.map((p, i) => (
        <li key={p.id}>
          <button type="button" className="pv-thumb" aria-pressed={i === index} aria-label={`Show photo ${i + 1} of ${photos.length}`} onClick={() => onSelect(i)}>
            <Picture id={p.id} sizes="56px" alt="" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The product page's photo area: the turnable photo plus thumbnails when there is more than one photo. */
export function ProductStage({ product }: { product: Product }) {
  const g = useGallery(product);
  return (
    <div className={g.photos.length > 1 ? "pv-media has-gallery" : "pv-media"}>
      <div className="pv-frame">
        <TurnStage key={g.current.id} image={g.current.id} alt={g.current.alt} priority={g.index === 0} />
      </div>
      <GalleryThumbs photos={g.photos} index={g.index} onSelect={g.setIndex} />
    </div>
  );
}
