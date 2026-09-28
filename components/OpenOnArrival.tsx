"use client";

import { useEffect } from "react";

/**
 * A link to something folded shut opens it on the way in.
 *
 * The landing page says the comparison table is "under the questions" and
 * linked there, and the reader arrived at a row of closed questions with the
 * table folded inside the last of them: sent to a thing and shown the lid.
 * Chrome expands a closed `details` when a fragment lands inside it and
 * Safari does not, so this does it everywhere: whenever the address's hash
 * names an element that is, or sits inside, a closed `details`, every
 * disclosure around it opens and the element is brought to the top of the
 * window. Mounted once, in the root layout, so a link written tomorrow to
 * any folded thing gets it without anybody remembering.
 */
export function OpenOnArrival() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      let opened = false;
      for (let at: Element | null = target; at; at = at.parentElement) {
        if (at instanceof HTMLDetailsElement && !at.open) {
          at.open = true;
          opened = true;
        }
      }
      if (opened) target.scrollIntoView({ block: "start" });
    };
    open();
    window.addEventListener("hashchange", open);
    // A click on a link to the hash already in the address fires no
    // hashchange, so a second press on "the questions" would do nothing.
    const clicked = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      if (a && a.getAttribute("href") === window.location.hash) window.setTimeout(open, 0);
    };
    document.addEventListener("click", clicked);
    return () => {
      window.removeEventListener("hashchange", open);
      document.removeEventListener("click", clicked);
    };
  }, []);
  return null;
}
