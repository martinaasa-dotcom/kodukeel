"use client";

import { useState } from "react";
import { EnterKeyCap, SpaceKeyCap } from "@/components/KeyCaps";
import { SELF_GRADES, type RatingValue } from "@/lib/srs/scheduler";
import { VERDICT_CLASS, verdictOfRating } from "@/lib/ux/verdict";

/**
 * THE TWO SELF-GRADES, ONE DRAWING, AND THE KEYS THAT PRESS THEM.
 *
 * "Not yet" is Space and "Got it" is Enter, which is the order of the two
 * buttons and the way a hand rests on the keyboard: the long bar for the
 * miss, the key at the edge for the hit. The digits 1 and 2 still work and
 * are not drawn, since two keys on a button is one key too many to read.
 *
 * The keyboard handling is the round's own, because it is the round that
 * knows whether a box has focus; this draws the buttons and says which key
 * each one answers to. `lib/ux/advanceKey.ts` is the reading of the keys.
 */
export function SelfGradeButtons({
  busy, onGrade,
}: {
  busy: boolean;
  onGrade: (rating: RatingValue) => void;
}) {
  const [said, setSaid] = useState("");
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* The tint is all a sighted reader needs and nothing at all to a screen reader. */}
      <p role="status" className="sr-only">{said}</p>
      {SELF_GRADES.map((g) => (
        <button
          key={g.rating}
          type="button"
          disabled={busy}
          onClick={() => { setSaid(`Marked: ${g.label}`); onGrade(g.rating); }}
          aria-keyshortcuts={g.rating === 1 ? "Space" : "Enter"}
          /* No `-translate-y` on hover: the buttons sit in a `gap-2.5` grid and
             a hover that moves the box up loses contact with a pointer resting
             near its lower edge, which un-hovers it, which undoes the shift.
             `scale` grows the box from its own centre and can only gain area
             under the pointer. */
          className={`${VERDICT_CLASS[verdictOfRating(g.rating)]} press flex items-center justify-center gap-2 rounded-[var(--r)] px-2 py-3.5 transition-ui hover:scale-[1.02] disabled:opacity-40`}
        >
          <span className="text-base font-bold">{g.label}</span>
          {g.rating === 1 ? <SpaceKeyCap /> : <EnterKeyCap />}
        </button>
      ))}
    </div>
  );
}
