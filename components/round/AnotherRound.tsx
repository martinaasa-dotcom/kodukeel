"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { againHref } from "@/lib/ux/again";

/**
 * The way to another round of the round on screen.
 *
 * The one drawing of the button every finish screen offers, because a link to
 * the page you are already on does nothing (`lib/ux/again.ts`). It builds the
 * next round's address itself, so a screen cannot get it wrong by typing its
 * own path, and it pairs with `FreshRound`, which is what makes the new
 * address a new round.
 */
export function AnotherRound({ children, variant, size, className }: {
  children: ReactNode;
  variant?: Parameters<typeof ButtonLink>[0]["variant"];
  size?: Parameters<typeof ButtonLink>[0]["size"];
  className?: string;
}) {
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  return (
    <ButtonLink href={againHref(path, params?.toString() ?? "")} variant={variant} size={size} className={className}>
      {children}
    </ButtonLink>
  );
}
