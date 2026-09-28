"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { useFinishingHover } from "@/components/motion/useFinishingHover";

/** How long a press plays, matched to the longest `data-burst` rule in
 *  app/globals.css with its stagger. */
const BURST_MS = 900;

/**
 * The link the wordmark sits in, top left of the rail and the landing page.
 *
 * A hover is `data-play`, set and cleared by `useFinishingHover`, so a pointer
 * leaving lets the move finish its beat rather than dropping it mid-air. A
 * press sets `data-burst` for one run of its keyframes. A second press while
 * the first is still in the air is not a restart, because a restart is a jump:
 * it waits for the one in flight.
 *
 * `holdForPress` is for the one place the mark does not survive the click: the
 * landing page's own pages, where going home draws a different page and the
 * mark with it. There the press plays out and then the link is followed, so
 * nobody watches the pixels leave and never come down. In the rail the mark
 * outlives the navigation, so the link is followed at once and the press plays
 * on over the next page. A click with a modifier, which opens a tab, is never
 * held.
 */
export function BrandLink({
  href,
  className = "",
  title,
  label,
  holdForPress = false,
  children,
}: {
  href: string;
  className?: string;
  title?: string;
  label?: string;
  holdForPress?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const until = useRef(0);
  const router = useRouter();
  const hover = useFinishingHover(ref);

  /** Starts a press unless one is in the air; returns how long it has left. */
  function burst(): number {
    const el = ref.current;
    const now = performance.now();
    if (!el) return 0;
    if (now < until.current) return until.current - now;
    until.current = now + BURST_MS;
    el.removeAttribute("data-burst");
    // Reading layout here is what lets the same keyframes start over on the
    // next press: without it the attribute is removed and put back in one
    // frame and the browser sees nothing change.
    void el.offsetWidth;
    el.setAttribute("data-burst", "");
    window.setTimeout(() => {
      if (performance.now() >= until.current) el.removeAttribute("data-burst");
    }, BURST_MS + 50);
    return BURST_MS;
  }

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // A keyboard press arrives as a click with no pointer behind it.
    const left = e.detail === 0 ? burst() : Math.max(0, until.current - performance.now());
    if (!holdForPress || left === 0) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    window.setTimeout(() => router.push(href), left);
  }

  return (
    <Link
      ref={ref}
      href={href}
      title={title}
      aria-label={label}
      className={`mark-play ${className}`}
      {...hover}
      onPointerDown={() => { burst(); }}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
