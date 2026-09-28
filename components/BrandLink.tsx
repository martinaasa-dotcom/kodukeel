"use client";

import { useRef, type ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";

/**
 * The link the wordmark sits in, top left of the rail and the landing page.
 *
 * It exists for the press. A hover can be CSS alone (`.mark-play:hover` in
 * app/globals.css), but `:active` lasts as long as the button is held, which
 * on a click is a tenth of a second: too short for pixels to go up and come
 * down. So a press sets `data-burst`, the keyframes run once from it, and it
 * is cleared when they are done, ready for the next. Pressing again mid-burst
 * restarts it rather than being ignored.
 */
export function BrandLink({
  href,
  className = "",
  title,
  label,
  children,
}: {
  href: string;
  className?: string;
  title?: string;
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const timer = useRef<number | undefined>(undefined);

  function burst() {
    const el = ref.current;
    if (!el) return;
    window.clearTimeout(timer.current);
    el.removeAttribute("data-burst");
    // Reading layout here is what lets the same keyframes start over on a
    // second press: without it the attribute is removed and put back in one
    // frame and the browser sees nothing change.
    void el.offsetWidth;
    el.setAttribute("data-burst", "");
    timer.current = window.setTimeout(() => el.removeAttribute("data-burst"), 1100);
  }

  return (
    <Link
      ref={ref}
      href={href}
      title={title}
      aria-label={label}
      className={`mark-play ${className}`}
      onPointerDown={burst}
      // A keyboard press arrives as a click with no pointer behind it.
      onClick={(e) => { if (e.detail === 0) burst(); }}
    >
      {children}
    </Link>
  );
}
