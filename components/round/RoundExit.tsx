"use client";

import type { ReactNode } from "react";
import { BookOpen, X } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { useModuleFocus } from "@/components/course/moduleFocus";

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
 * THE THIRD WAY OUT WAS THE ONE NOBODY COUNTED. A card in a round carries a
 * "Full entry" link in its corner, which is a door into the dictionary in the
 * middle of a round, and it was written out in three sessions. It survived the
 * first pass at this because it is neither of the two shapes above, and it was
 * found by a suite walking an evening and listing every link on every step
 * rather than by anybody reading the code: the reading step was clean and the
 * closing round offered `/dictionary?q=Venemaa`. It is one drawing now, so a
 * fourth card inherits the answer.
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
      data-round-live=""
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

/**
 * The way to a word's own dictionary entry, from the corner of a card.
 *
 * Worth having where somebody chose the round: a word turns out to be worth
 * reading about and the entry is one press away. Inside a module it is a door
 * out of the evening in the middle of a round, so it stands down, and what
 * stays in that corner is the star, which keeps the learner where they are.
 */
export function FullEntry({ lemma, icon = true }: { lemma: string; icon?: boolean }) {
  const focus = useModuleFocus();
  if (focus) return null;
  return (
    <Link
      href={`/dictionary?q=${encodeURIComponent(lemma)}`}
      className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-60"
      style={{ color: "var(--ink-3)" }}
    >
      {icon && <BookOpen size={13} aria-hidden />} Full entry
    </Link>
  );
}
