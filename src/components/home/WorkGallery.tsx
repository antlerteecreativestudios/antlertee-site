"use client";

import Link from "next/link";
import { useEffect, useRef, type FocusEvent } from "react";
import { Picture } from "@/components/Picture";
import { gallery } from "@/content/copy";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useMediaQuery } from "@/lib/use-media";

/**
 * "Built here." The section pins and the row of cards scrolls sideways as you scroll down, on every screen size
 * including phones (the owner wants the locked, guided scroll there too). Reduced motion gets a native swipeable,
 * scroll-snapping row instead. The CSS swipe mode in globals.css uses the same query (keep them in step).
 */
const PIN_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 520px)";
const SCROLL_QUERY = "(prefers-reduced-motion: reduce), (max-height: 519.98px)";

export function WorkGallery() {
  const pinned = useMediaQuery(PIN_QUERY, true);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const mm = gsap.matchMedia();
    mm.add(
      { pin: PIN_QUERY, scroll: SCROLL_QUERY },
      (context) => {
        const isPin = Boolean(context.conditions?.pin);
        if (!isPin) return;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: true, // Lenis already eases the scroll; a second 1s ease on top made the row trail behind
            refreshPriority: 2,
            invalidateOnRefresh: true,
          },
        });
        stRef.current = tween.scrollTrigger ?? null;
        return () => {
          stRef.current = null;
        };
      },
    );
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, []);

  // Keyboard users: tabbing to an offscreen card scrolls the page so the pinned row brings it into view.
  const onFocus = (e: FocusEvent<HTMLUListElement>) => {
    const st = stRef.current;
    const track = trackRef.current;
    const card = (e.target as HTMLElement).closest("li");
    if (!st || !track || !card) return;
    const distance = Math.max(1, track.scrollWidth - window.innerWidth);
    const wanted = Math.min(1, Math.max(0, (card.offsetLeft - window.innerWidth * 0.3) / distance));
    window.scrollTo({ top: st.start + (st.end - st.start) * wanted, behavior: "instant" });
  };

  // GSAP wraps the pinned <section> in a "pin-spacer". React must own the node it later removes, so the section sits
  // inside this wrapper: on navigation React removes the wrapper (and the spacer inside it) instead of throwing
  // "removeChild: not a child of this node" and showing the error page.
  return (
    <div className="pin-host">
      <section
        ref={sectionRef}
        className="work"
        data-nav="dark"
        data-snap="edge"
        data-mode={pinned ? "pin" : "scroll"}
        aria-labelledby="work-title"
        id="work"
      >
        <div className="work-in">
          <div className="work-head">
            <h2 id="work-title" className="h-section">
              Built here<span className="dot">.</span>
            </h2>
            <p>Real pieces off our floor. Every one can carry your label.</p>
          </div>
          <div
            className="track-wrap"
            role="region"
            aria-label="Products made at Antlertee, scroll sideways"
            tabIndex={pinned ? undefined : 0}
          >
            <ul className="track" ref={trackRef} onFocus={onFocus}>
              {gallery.map((item) => (
                <li key={item.slug}>
                  <Link className="card" href={`/products/${item.slug}/`}>
                    <Picture id={item.image} sizes="(max-width: 860px) 76vw, 24vw" />
                    <span className="tag">{item.tag}</span>
                    <div className="txt">
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="swipe-hint br" aria-hidden="true">
            Swipe ⟶
          </p>
        </div>
      </section>
    </div>
  );
}
