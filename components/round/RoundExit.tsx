"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { useModuleFocus } from "@/components/course/ModuleScope";

/**
 * THE TWO WAYS OUT OF A ROUND, DRAWN ONCE, AND WHAT BECOMES OF THEM INSIDE A
 * MODULE.
 *
 * Every round in this app has the same two: a cross in the corner that ends
 * the session, and a row of buttons on the finish screen offering Today,
 * another round and the practice menu. That is right where somebody opened
 * the round themselves, which is most of the time: they chose it, and when it
 * is over they choose again.
 *
 * It is wrong inside tonight's module, and that is what was reported. A module
 * is one decision made in advance and a step of it is a room: the way on is
 * the one button at the foot of the screen, which ticks the step and opens the
 * next, and a finish screen offering three other places to be is three doors
 * out of a room whose door is already drawn. So inside a module both stand
 * down, and `components/course/ModuleScope.tsx` is what they ask.
 *
 * ONE DRAWING RATHER THAN SEVENTEEN. These were written out by hand in every
 * session, near enough identically, which is the state this project's own
 * rules describe as two answers waiting to disagree: a round that kept its own
 * cross would keep its own door out of the module, and it would look exactly
 * like a round nobody had got to yet. The invariant suite is what holds a
 * eighteenth round to asking.
 */

/**
 * The cross that ends a session, or nothing inside a module.
 *
 * `href` because the rounds do not all leave to the same place: a review card
 * goes back to Today and the learn ladder goes back to the course. Where a
 * caller says nothing it is Today, which is what most of them said.
 */
export function EndSession({ href = "/", label = "End session", size = 18 }: {
  href?: string;
  label?: string;
  size?: number;
}) {
  const focus = useModuleFocus();
  if (focus) return null;
  return (
    <Link
      href={href}
      aria-label={label}
      className="press flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--raised)]"
      style={{ color: "var(--ink-3)" }}
    >
      <X size={size} aria-hidden />
    </Link>
  );
}

/**
 * The row of ways off a finish screen, or nothing inside a module.
 *
 * It takes the row rather than sitting inside it, because what a module has to
 * remove is the whole row: "another round" is not an exit and is still a
 * second thing to decide, on the one screen whose job is to say how that round
 * went and hand the evening on.
 */
export function WayOut({ className = "", children }: {
  className?: string;
  children: ReactNode;
}) {
  const focus = useModuleFocus();
  if (focus) return null;
  return <div className={className}>{children}</div>;
}
