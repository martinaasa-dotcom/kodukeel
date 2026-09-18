"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, History, Undo2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Chip, KeyCap } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { ADVANCE_KEY_GLYPH } from "@/lib/ux/advanceKey";
import { earlier, later, openAt, type SeenCard } from "@/lib/ux/lookBack";

/**
 * SEEING THE LAST WORD AGAIN, DRAWN ONCE.
 *
 * `lib/ux/lookBack.ts` says what a look back is and why it is not undo. This
 * is the two places a round draws it: the quiet button in the footer that
 * opens it, and the card that stands in the round's place while it is open.
 *
 * IT REPLACES THE CARD RATHER THAN COVERING IT. A panel over a card in a
 * 360px round is the shape this project has a rule against, and it would
 * leave the round underneath answerable by a stray key. One screen at a time
 * is what every other step of a round does, it needs no scrim and no focus
 * trap, and it makes the way forward obvious, because the buttons at the foot
 * of the card are the round's own buttons in the round's own place.
 *
 * THE WAY BACK IS ALSO A WAY FORWARD, which is the half that was asked for by
 * name. Somebody who steps back two words has to be able to walk out the way
 * they came, so the primary button is always the forward one: "Next" while
 * there is a newer card to see, and "Back to the round" at the newest, which
 * is where they were standing when they pressed. The quiet button beside it
 * goes further back, and the header carries the way straight out for somebody
 * who is done rather than walking.
 *
 * NOTHING ON IT IS A CONTROL OVER THE ROUND. No rating, no star, no dictionary
 * link, no report button: this is a reading of what was on the screen, and
 * every one of those would be a second place to do something the card itself
 * already offers, on a screen the learner is only passing through.
 */

/** The look back's own position, held by the round that draws it. */
export function useLookBack(seen: readonly SeenCard[]) {
  const [at, setAt] = useState<number | null>(null);

  const open = useCallback(() => setAt(openAt(seen)), [seen]);
  const close = useCallback(() => setAt(null), []);
  const back = useCallback(() => setAt((i) => (i === null ? null : earlier(i, seen) ?? i)), [seen]);
  /** Forward, and past the newest that means back to the round. */
  const forward = useCallback(() => setAt((i) => (i === null ? null : later(i, seen))), [seen]);

  const card = at === null ? null : seen[at] ?? null;
  return {
    at,
    card,
    looking: card !== null,
    hasEarlier: at !== null && earlier(at, seen) !== null,
    hasLater: at !== null && later(at, seen) !== null,
    open,
    close,
    back,
    forward,
  };
}

/**
 * The button that opens it, for a round's footer.
 *
 * Not drawn at all where nothing has been seen yet, which is the first card
 * of a session: a control that can only ever say "there is nothing behind
 * you" is a control that teaches people to ignore that row.
 */
export function LookBackButton({ count, onOpen, disabled = false }: {
  count: number;
  onOpen: () => void;
  disabled?: boolean;
}) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className="tap-tint flex items-center gap-1 rounded-md px-1.5 py-0.5 disabled:opacity-40"
      style={{ color: "var(--ink-3)" }}
    >
      <History size={12} aria-hidden /> See it again <KeyCap>B</KeyCap>
    </button>
  );
}

/**
 * The card, in the round's place.
 *
 * `answerShown` is not a state here: a look back is a card whose answer is
 * already known, and hiding it would make this a second round with a second
 * set of grades, which is the thing it must not be.
 */
export function LookBackCard({ card, position, newest, hasEarlier, hasLater, onBack, onForward, onClose }: {
  card: SeenCard;
  /** Which kept showing this is, counting from the oldest. */
  position: number;
  /** The position of the newest kept showing, which is the one just gone. */
  newest: number;
  hasEarlier: boolean;
  hasLater: boolean;
  onBack: () => void;
  onForward: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="neutral">{card.label}</Chip>
        {/* Counting from the card the learner was on, so the one that just
            went is "1 back" rather than "0 back", which reads as a fault. */}
        <span className="tnum label-xs" style={{ color: "var(--ink-3)" }}>
          {newest - position + 1} back
        </span>
        {/* Only while the forward button is not already the way out. At the
            newest card the two would be the same door twice, and the primary
            is the one a reading eye and a thumb both end up on. */}
        {hasLater && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="tap-tint flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold"
              style={{ color: "var(--ink-3)" }}
            >
              <Undo2 size={13} aria-hidden /> Back to the round
            </button>
          </div>
        )}
      </div>

      <div
        key={card.key}
        className="pop-in flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-11 text-center md:min-h-[320px]"
        aria-live="polite"
      >
        {/* The speaker goes beside whichever side is Estonian, which is the
            question on a card asked in Estonian and the answer on one asked in
            English: a play button next to an English gloss offers to read out
            a word that is not there. */}
        <div className="flex items-center gap-2">
          <p
            lang={card.questionLang}
            className="text-xl font-semibold leading-snug tracking-tight md:text-2xl"
            style={{ color: "var(--ink-2)" }}
          >
            {card.question}
          </p>
          {card.speak && card.questionLang === "et" && <Speak text={card.speak} />}
        </div>
        {card.note && (
          <p className="text-[13.5px]" style={{ color: "var(--ink-3)" }}>{card.note}</p>
        )}
        <div className="flex items-center gap-2">
          <p
            lang={card.answerLang}
            className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
            style={{ color: "var(--ink)" }}
          >
            {card.answer}
          </p>
          {card.speak && card.questionLang !== "et" && <Speak text={card.speak} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t px-5 py-4" style={{ borderColor: "var(--rule-soft)" }}>
        <Button onClick={onBack} disabled={!hasEarlier}>
          <ArrowLeft size={14} aria-hidden /> One more back
        </Button>
        {/* The primary is the forward one, and at the newest card forward is
            the way out: somebody two words back walks home the way they came
            rather than hunting for a different button. */}
        <Button variant="primary" size="lg" onClick={onForward}>
          {hasLater ? "Next" : "Back to the round"} <ArrowRight size={14} aria-hidden />
        </Button>
      </div>

      <p className="px-6 pb-4 text-center text-2xs" style={{ color: "var(--ink-3)" }}>
        Nothing here is graded. <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap> to carry on.
      </p>
    </div>
  );
}
