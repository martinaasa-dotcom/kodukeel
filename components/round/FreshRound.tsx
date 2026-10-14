"use client";

import { Fragment, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ROUND_PARAM } from "@/lib/ux/again";

/**
 * A round mounts again when the address names a new one.
 *
 * See `lib/ux/again.ts`. React keeps a component's state while its place in
 * the tree holds still, and "Another round" is a navigation to the same page,
 * so without a key that changes the round on screen is the round that just
 * ended. `BeforeYouStart` draws its children through this; a round page with
 * no briefing wraps its session in it directly.
 */
export function FreshRound({ children }: { children: ReactNode }) {
  const round = useSearchParams()?.get(ROUND_PARAM) ?? "";
  return <Fragment key={round}>{children}</Fragment>;
}
