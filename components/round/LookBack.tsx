"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, History, Undo2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Chip, KeyCap } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { ADVANCE_KEY_GLYPH } from "@/lib/ux/advanceKey";
import { earlier, later, openAt, remember, forgetLast, type SeenCard } from "@/lib/ux/lookBack";

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

/**
 * The look back's own position, held by the round that draws it.
 *
 * WHERE THE CARET GOES IS PART OF IT. The button that opens this unmounts
 * nothing, and the buttons inside it unmount when it closes, so without the
 * ref below a keyboard leaves the panel and lands on the body: this app has
 * a rule about exactly that, written for the conversation's send button, and
 * a round is where it costs most, since the next thing a learner does is
 * answer a card they can no longer reach with the keyboard. So closing puts
 * the caret back on the control that opened it, which is also where the
 * reader was standing.
 */
export function useLookBack() {
  /*
    THE ROUND HANDS OVER WHAT IT DREW AND NOTHING ELSE.

    The first two rounds to carry this each held the list, the counter that
    keys a showing and the call to `remember` themselves, which is four lines
    of identical wiring per round and four places for the nineteenth round to
    get it subtly wrong. What a round actually knows is what was on its
    screen, so that is all it says: `record` takes the card as it was drawn
    and the rest lives here.
  */
  const [seen, setSeen] = useState<SeenCard[]>([]);
  /* One card can be shown twice in a round, so the key is the showing. */
  const showings = useRef(0);
  const record = useCallback((entry: Omit<SeenCard, "key">) => {
    showings.current += 1;
    setSeen((s) => remember(s, { ...entry, key: `${entry.of}#${showings.current}` }));
  }, []);
  /** Takes back the newest showing of one card, which is what undo rewinds. */
  const forget = useCallback((of: string) => setSeen((s) => forgetLast(s, of)), []);

  const [at, setAt] = useState<number | null>(null);
  /*
    Held through a callback rather than handed out as the ref object itself,
    and read by a caller that destructures it (`const { trigger } = look`).
    Both halves are about the hooks lint rule rather than about React:
    `ref={look.trigger}` is reported as a ref access during render whatever
    is behind it, which is three warnings per call site for a thing this is
    not doing, and a callback prop says what is actually meant, which is
    "tell me which node you drew".
  */
  const triggerEl = useRef<HTMLButtonElement | null>(null);
  const trigger = useCallback((node: HTMLButtonElement | null) => { triggerEl.current = node; }, []);

  const open = useCallback(() => setAt(openAt(seen)), [seen]);
  const leave = useCallback(() => setAt(null), []);
  const back = useCallback(() => setAt((i) => (i === null ? null : earlier(i, seen) ?? i)), [seen]);
  /** Forward, and past the newest that is the round itself. */
  const forward = useCallback(() => setAt((i) => (i === null ? null : later(i, seen))), [seen]);

  /*
    AND THE CARET GOES BACK AFTER THE PANEL HAS GONE, NOT WHILE IT IS LEAVING.

    Focusing inside the handler that closes it does nothing at all, which is
    the sort of fix that looks like it works: the round draws the trigger
    disabled while the panel is open, a disabled control cannot take focus,
    and the handler runs before React has re-rendered it back into an enabled
    one. Measured on a typed card it appeared to work anyway, because the next
    card's answer box autofocuses on mount and that is what the caret was
    landing on; on a flip card, which has no box, it landed on the body.

    So the restore is an effect on the panel having closed, which runs after
    the commit that enables the button again. A card that pulls focus into its
    own answer box still wins, and that is the better place for it to be.
  */
  const wasLooking = useRef(false);
  useEffect(() => {
    const looking = at !== null;
    if (wasLooking.current && !looking) triggerEl.current?.focus();
    wasLooking.current = looking;
  }, [at]);

  const card = at === null ? null : seen[at] ?? null;

  /*
    The two drawings take a bundle each rather than eight props apiece. A
    round spreads them, so a round that draws the panel cannot forget a
    handler and quietly lose the way forward, which is the shape of mistake
    that spreads across nineteen files rather than staying in one.
  */
  const panel = card === null || at === null ? null : {
    card,
    position: at,
    newest: seen.length - 1,
    hasEarlier: earlier(at, seen) !== null,
    hasLater: later(at, seen) !== null,
    onBack: back,
    onForward: forward,
    onClose: leave,
  };

  return {
    seen,
    record,
    forget,
    open,
    close: leave,
    /** Forward one, and past the newest that is the way back to the round. */
    forward,
    looking: card !== null,
    /** Spread onto `LookBackCard`, or null while the round is on screen. */
    panel,
    /** Spread onto `LookBackButton`. */
    button: { count: seen.length, onOpen: open, ref: trigger },
  };
}

/**
 * The button that opens it, for a round's footer.
 *
 * Not drawn at all where nothing has been seen yet, which is the first card
 * of a session: a control that can only ever say "there is nothing behind
 * you" is a control that teaches people to ignore that row.
 */
export function LookBackButton({ count, onOpen, disabled = false, keyHint = true, ref }: {
  count: number;
  onOpen: () => void;
  disabled?: boolean;
  /**
   * Whether to name the key, which is false on a card being typed.
   *
   * `b` is the first letter of `buss`, so the shortcut stands down while an
   * answer box has focus, and a cap promising a key the card in front of you
   * does not answer to is the fault the review footer's own hint was
   * corrected for.
   */
  keyHint?: boolean;
  /** So closing the panel can put the caret back where it was opened from. */
  ref?: React.Ref<HTMLButtonElement>;
}) {
  if (count === 0) return null;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className="tap-tint flex items-center gap-1 rounded-md px-1.5 py-0.5 disabled:opacity-40"
      style={{ color: "var(--ink-3)" }}
    >
      <History size={12} aria-hidden /> See it again {keyHint && <KeyCap>B</KeyCap>}
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
  /*
    THE PANEL TAKES THE CARET WHEN IT OPENS, AND SAYS WHAT IT IS.

    A live region added to the page at the same time as its content is not
    reliably read out: stepping between cards changes the content of a region
    that is already there and announces, and opening the panel does not. So
    arriving is a focus move, which every screen reader reads, onto a box that
    carries its own name. On mount alone, because moving the caret on every
    step would take it off the button the reader is pressing.
  */
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="group"
      aria-label="Looking back at a word you have already answered"
      className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border outline-none"
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
