"use client";

import { useCallback, useEffect, type RefObject } from "react";

/**
 * Keeps an uncontrolled form's text fields as a draft in this browser (localStorage), so a visitor can leave the page,
 * switch tabs or come back later without retyping. Files can't be kept (browsers don't allow it); everything else is.
 * Restores once on mount, saves on every change (lightly debounced), and `clear()` forgets it after a successful send.
 * Storage access is always wrapped: private mode and blocked storage throw.
 */
export function useFormDraft(
  formRef: RefObject<HTMLFormElement | null>,
  key: string,
  fields: readonly string[],
  opts: {
    /** Fields not to restore (e.g. ones a link pre-filled, such as the product chosen on a product page). */
    skip?: readonly string[];
    /** Changes whenever the form element is replaced (e.g. after "send another"), so listeners attach to the new one. */
    remount?: unknown;
  } = {},
) {
  const storageKey = `acs-draft:${key}`;
  const skip = (opts.skip ?? []).join(",");

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const saved: unknown = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved === "object") {
        for (const name of fields) {
          if (skip.split(",").includes(name)) continue;
          const v = (saved as Record<string, unknown>)[name];
          const el = form.elements.namedItem(name);
          if (typeof v === "string" && v && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
            el.value = v;
          }
        }
      }
    } catch {
      // No storage or a corrupt draft: start empty.
    }

    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const fd = new FormData(form);
        const data: Record<string, string> = {};
        for (const name of fields) {
          const v = fd.get(name);
          if (typeof v === "string" && v.trim()) data[name] = v.slice(0, 5000);
        }
        try {
          if (Object.keys(data).length) window.localStorage.setItem(storageKey, JSON.stringify(data));
          else window.localStorage.removeItem(storageKey);
        } catch {
          // Storage full or blocked: the form still works, it just isn't remembered.
        }
      }, 300);
    };
    form.addEventListener("input", save);
    form.addEventListener("change", save);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
    };
    // fields is a constant list per form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formRef, storageKey, skip, opts.remount]);

  return useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clear.
    }
  }, [storageKey]);
}
