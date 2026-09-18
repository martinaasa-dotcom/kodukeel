"use client";

import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { putWordAside } from "@/app/actions";

/**
 * TOO COMPLICATED, WHEREVER THE WORD IS.
 *
 * The fifth thing a learner can say about a card, and the only one that is
 * about the card rather than about their memory. Again, Hard, Good and Easy
 * all answer "how well did that go", and a word three bands past somebody has
 * no honest answer among them: pressing Again brings it straight back and
 * tells the scheduler they nearly had it, which is how a word that arrived
 * early gets drilled hardest.
 *
 * ONE DRAWING, for the reason `StarWord` is one. This sits on a review card,
 * on the learn ladder and on a unit lesson, and a copy per session is three
 * answers to what happens when the write fails and three wordings of what the
 * press did.
 *
 * IT SAYS WHAT IT DID, and the session it sits in is what shows that: the
 * whole effect of this button is that a card stops arriving for a few days, so
 * a press that only made a card disappear would read as a fault.
 * `putWordAside` returns the sentence (`deferralNote`) and the caller prints
 * it, with the way back beside it.
 *
 * NOT OPTIMISTIC, which is where it differs from the star. A star is a
 * bookmark and can be put back the way it was if it did not land; this moves
 * every card of the word and the session drops them, so it waits for the
 * answer rather than acting as though it has one.
 */
export function TooComplicated({
  lexemeId, label, context, onDone,
}: {
  lexemeId: string;
  /** The word, so the button says which one is going away. */
  label: string;
  /** Where they were standing. Stored with the row, for whoever reads the queue. */
  context: string;
  /** Told what happened, so the screen can say it and drop the card. */
  onDone: (note: string) => void;
}) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex items-center gap-2">
      {failed && (
        <span className="text-2xs" style={{ color: "var(--hard-ink)" }} role="status">
          Not saved. Try again.
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        aria-label={`Put ${label} aside, it is too complicated for now`}
        className="tap-tint flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold disabled:opacity-40"
        style={{ color: "var(--ink-3)" }}
        onClick={() => {
          setFailed(false);
          start(async () => {
            const result = await putWordAside(lexemeId, context).catch(() => null);
            if (result?.ok) onDone(result.note);
            else setFailed(true);
          });
        }}
      >
        <CalendarClock size={13} aria-hidden /> Too complicated
      </button>
    </span>
  );
}
