"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registered once; only imported by home-page scenes so GSAP stays out of the other pages' bundles.
gsap.registerPlugin(ScrollTrigger);
// Phones show and hide the address bar while scrolling, which changes the viewport height. Without this, every change
// re-measures the pinned sections ("Built here.", Collections) mid-scroll and they jump.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
