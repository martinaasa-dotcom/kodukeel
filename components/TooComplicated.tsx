"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/Button";
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
 * IT ASKS FIRST. The button used to act the instant it was pressed and say
 * what it had done in text small enough to miss, which is how a learner reads
 * a word vanishing from their deck as a bug rather than as something they
 * asked for. A confirmation dialog says what is about to happen (the word
 * comes back on its own in a few weeks, or once the learner reaches the band
 * it belongs to, and it can be brought back sooner from My words at any time)
 * before anything is written, and the outcome sentence afterward is the
 * confirmation of what actually happened rather than the only explanation of
 * what a press does.
 *
 * ONE DRAWING, for the reason `StarWord` is one. This sits on a review card,
 * on the learn ladder and on a unit lesson, and a copy per session is three
 * answers to what happens when the write fails and three wordings of what the
 * press did.
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
  /** The word, so the button and the dialog say which one is going away. */
  label: string;
  /** Where they were standing. Stored with the row, for whoever reads the queue. */
  context: string;
  /** Told what happened, so the screen can say it and drop the card. */
  onDone: (note: string) => void;
}) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!asking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAsking(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asking]);

  const confirm = () => {
    setFailed(false);
    start(async () => {
      const result = await putWordAside(lexemeId, context).catch(() => null);
      if (result?.ok) {
        setAsking(false);
        onDone(result.note);
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-label={`Ask about putting ${label} aside for now`}
        className="tap-tint flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold disabled:opacity-40"
        style={{ color: "var(--ink-3)" }}
        onClick={() => {
          setFailed(false);
          setAsking(true);
        }}
      >
        <CalendarClock size={13} aria-hidden /> Too complicated
      </button>

      {asking && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center px-4"
          style={{ background: "rgb(0 0 0 / 0.35)" }}
          onClick={() => !pending && setAsking(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`too-complicated-${lexemeId}`}
        >
          <div
            className="pop-in w-full max-w-sm rounded-[var(--r-xl)] border p-5"
            style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p id={`too-complicated-${lexemeId}`} className="text-base font-bold" style={{ color: "var(--ink)" }}>
              Put <span lang="et">{label}</span> aside?
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
              It leaves your review queue for now, so it stops turning up on cards.
              It comes back on its own in a few weeks, or once you reach the level it
              belongs to, whichever fits. You can bring it back sooner any time from
              My words.
            </p>
            {failed && (
              <p className="mt-3 text-sm" role="status" style={{ color: "var(--hard-ink)" }}>
                Not saved. Try again.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAsking(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirm} disabled={pending}>
                Put it aside
              </Button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
