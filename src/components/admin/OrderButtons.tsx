"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminRequest } from "./api";
import { Icon } from "./Icon";

/** Move a product one place up or down on the shelf (the order used on the website's rack). */
export function OrderButtons({ ids, index, name, csrf }: { ids: string[]; index: number; name: string; csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const move = async (by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(to, 0, item);
    setBusy(true);
    const r = await adminRequest("/api/admin/products/order/", { method: "POST", csrf, body: { ids: next } });
    setBusy(false);
    if (r.ok) router.refresh();
  };
  return (
    <span className="a-media-tools" style={{ justifyContent: "flex-end" }}>
      <button type="button" className="btn icon" disabled={busy || index === 0} onClick={() => void move(-1)} title="Move up">
        <Icon name="up" size={16} />
        <span className="sr-only">Move {name} up</span>
      </button>
      <button type="button" className="btn icon" disabled={busy || index === ids.length - 1} onClick={() => void move(1)} title="Move down">
        <Icon name="down" size={16} />
        <span className="sr-only">Move {name} down</span>
      </button>
    </span>
  );
}
