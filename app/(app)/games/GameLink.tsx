"use client";

import type { CSSProperties, ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { markGamePlayed } from "@/app/actions";

/**
 * A press on a game, written down on the way.
 *
 * On the press and never on a render, since a link is fetched whenever a
 * pointer settles on it (`components/PrefetchLink.tsx`) and a write there would
 * mark a game played for somebody who only hovered over its tile. The daily
 * puzzles pass `record={false}`: they are "Done today" once finished, which
 * the puzzle itself reports, and opening one is not finishing it.
 */
export function GameLink({ href, record = true, className, style, children }: {
  href: string; record?: boolean; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={record ? () => { void markGamePlayed(href).catch(() => null); } : undefined}
    >
      {children}
    </Link>
  );
}

/** The spotlight's own button, which writes the press down the same way. */
export function PlayButton({ href, record = true, children }: { href: string; record?: boolean; children: ReactNode }) {
  return (
    <ButtonLink
      href={href}
      variant="primary"
      size="lg"
      onClick={record ? () => { void markGamePlayed(href).catch(() => null); } : undefined}
    >
      {children}
    </ButtonLink>
  );
}
