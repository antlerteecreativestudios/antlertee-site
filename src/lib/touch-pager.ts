// Phones and tablets: one swipe = one section. While the finger is down the page follows it (Lenis syncTouch); when it
// lifts, the page glides to the next stop in the swipe direction instead of flying on with momentum.
// Stops: every section start (`data-snap`, the same list the desktop soft stop uses); inside a pinned section
// ("Built here.", Collections) one step per swipe; inside a section taller than the screen, one screen per swipe so
// nothing is skipped; and the bottom of the page. Pages without sections (blog articles) are left alone.
import type Lenis from "lenis";
import type { VirtualScrollData } from "lenis";
import { collectPoints } from "./soft-stop";

const MIN_SWIPE_PX = 40; // shorter moves are taps or wobbles: settle back to the nearest stop
const PIN_STEP = 0.7; // matches the Collections pin (0.7 of a screen per piece)
const SCREEN_STEP = 0.85; // a long section moves this much of a screen per swipe (keeps a line of overlap)
const DURATION = 0.7;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Touches that start in these keep their own behaviour (menu, dialogs, form fields, sideways rails). */
const IGNORE = '[data-lenis-prevent], input, textarea, select, [role="dialog"], [aria-modal="true"]';

export interface TouchPager {
  /** Combine into Lenis's `virtualScroll`: returns false to drop the phone's release momentum while paging. */
  gate: (data: VirtualScrollData) => boolean;
  attach: (lenis: Lenis) => void;
  destroy: () => void;
}

function stops(): number[] {
  const vh = window.innerHeight;
  const max = Math.max(0, document.documentElement.scrollHeight - vh);
  const points = collectPoints(max);
  if (points.length < 2) return [];
  const out = new Set<number>([0, max]);
  points.forEach((p, i) => {
    out.add(Math.min(p.top, max));
    const pinEnd = p.pinEnd !== undefined ? Math.min(p.pinEnd, max) : undefined;
    if (pinEnd !== undefined) {
      for (let y = p.top + vh * PIN_STEP; y < pinEnd - 8; y += vh * PIN_STEP) out.add(Math.round(y));
      out.add(pinEnd);
    }
    // A section taller than the screen: one screen per swipe until the next section.
    const from = pinEnd ?? p.top;
    const next = points[i + 1]?.top ?? max;
    for (let y = from + vh * SCREEN_STEP; y < next - vh * 0.25; y += vh * SCREEN_STEP) out.add(Math.round(Math.min(y, max)));
  });
  return [...out].sort((a, b) => a - b);
}

export function createTouchPager(): TouchPager {
  let lenis: Lenis | null = null;
  let active = false; // a paging gesture is in progress (finger down on the page itself)
  let startY = 0;
  let startX = 0;
  let startScroll = 0;
  const removers: (() => void)[] = [];

  const onStart = (e: TouchEvent) => {
    const t = e.touches[0];
    const target = e.target instanceof Element ? e.target : null;
    active = Boolean(lenis && t && e.touches.length === 1 && !target?.closest(IGNORE) && stops().length);
    if (!active || !t || !lenis) return;
    startY = t.clientY;
    startX = t.clientX;
    startScroll = lenis.scroll;
  };

  const onEnd = (e: TouchEvent) => {
    if (!active || !lenis) return;
    active = false;
    const t = e.changedTouches[0];
    if (!t) return;
    const dy = startY - t.clientY; // > 0: finger moved up, page goes down
    const dx = startX - t.clientX;
    const list = stops();
    if (!list.length) return;
    let target: number | undefined;
    if (Math.abs(dy) >= MIN_SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
      target = dy > 0 ? list.find((y) => y > startScroll + 4) : [...list].reverse().find((y) => y < startScroll - 4);
    }
    // Short or sideways move: settle on the nearest stop to where the page is now.
    target ??= list.reduce((best, y) => (Math.abs(y - lenis!.scroll) < Math.abs(best - lenis!.scroll) ? y : best), list[0] ?? 0);
    lenis.scrollTo(target, { duration: DURATION, easing: easeOutCubic, force: true });
  };

  return {
    // Lenis turns the finger's release speed into momentum on "touchend" (its listener runs before ours, so the
    // gesture is still active then): drop it so the glide to the next stop is the only movement. Finger-following
    // touchmove events still go through.
    gate: (data) => !(active && data.event.type === "touchend"),
    attach: (l) => {
      lenis = l;
      window.addEventListener("touchstart", onStart, { passive: true });
      window.addEventListener("touchend", onEnd, { passive: true });
      window.addEventListener("touchcancel", onEnd, { passive: true });
      removers.push(() => {
        window.removeEventListener("touchstart", onStart);
        window.removeEventListener("touchend", onEnd);
        window.removeEventListener("touchcancel", onEnd);
      });
    },
    destroy: () => {
      removers.splice(0).forEach((r) => r());
      lenis = null;
    },
  };
}

