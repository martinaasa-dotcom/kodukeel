"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Loader2, Plus, Underline, X } from "lucide-react";
import { addToDeck, setWordGloss } from "@/app/actions";
import { Button } from "@/components/Button";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Speak } from "@/components/Speak";
import type { GlossedToken } from "@/lib/dict/glossed";
import type { Condition } from "@/lib/audio/conditions";

/**
 * AN ATTESTED SENTENCE YOU CAN READ, RATHER THAN ONE YOU CAN ONLY LOOK AT.
 *
 * The word being taught is marked, exactly as it always was. What is new is
 * that every other word the dictionary vouches for is underlined and opens,
 * under the sentence, as the headword it belongs to, which form of it this is,
 * and what it means, with a way to keep it. See `lib/dict/glossed.ts` for what
 * is allowed to be underlined and why: this component draws what that module
 * decided and decides nothing itself.
 *
 * THE PANEL SITS UNDER THE SENTENCE RATHER THAN OVER THE WORD, and that is the
 * decision the rest of this follows from. A popover hung off an inline word in
 * a 360px card is the fault `test-containment.mjs` exists for, it covers the
 * sentence it is explaining, and it has to be dismissed before the next word
 * can be read. A panel below is the same width as the card at every size, and
 * a reader can run along the sentence with a pointer and watch it change.
 *
 * SO A POINTER LEAVING A WORD CLEARS NOTHING. Hovering picks a word, tapping
 * picks a word, focusing picks a word, and the panel then stays until another
 * word is picked or it is closed. If leaving cleared it, the mouse could never
 * reach the controls inside it, which is the half of this that a learner
 * actually presses.
 *
 * AND THE PANEL CARRIES THE WAY OUT, for the reason the letter bar's own cross
 * does: the moment somebody decides they do not want six underlines across a
 * sentence they are reading is the moment one is open in front of them, and a
 * setting three screens away is a setting they will not go and find. Pressing
 * it turns the sentence plain here and now, so the answer is visible before
 * the round trip that stores it, and Settings is where it is turned back on,
 * which the control says. Whether the dictionary was consulted at all is the
 * server's decision (see lib/ux/wordGloss.ts): a learner who has turned this
 * off is handed no tokens on the next screen, so this component is never asked
 * to draw a feature nobody wants.
 */
export function GlossedSentence({ tokens, sentence, speak, onTurnedOff }: {
  tokens: GlossedToken[];
  /** The sentence as recorded, for the speaker. Joining the tokens gives the same string. */
  sentence: string;
  /**
   * How the sentence is said, where the caller has an opinion about it.
   *
   * A first meeting has none and gets the app's own voice in a quiet room. A
   * conversation has all of it: the persona's voice, the room the scene is
   * heard in, their pace, and whether this is the line that just arrived and
   * should play itself. Passed through rather than reimplemented, so the two
   * screens cannot disagree about what a speaker button does.
   */
  speak?: {
    voice?: string;
    condition?: Condition;
    rate?: number;
    autoplay?: boolean;
  };
  /**
   * Told once, where the screen around the sentence says something about the
   * underlines being there.
   *
   * The first meeting's provenance line reads "Any underlined word opens its
   * meaning", which is true of the server's answer and false for the second
   * between the press and the refresh landing. A screen may not say a thing is
   * there while the reader is looking at it not being there, and the caption
   * cannot see this component's own state. A conversation says nothing about
   * underlines and passes none.
   */
  onTurnedOff?: () => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState<number | null>(null);
  /*
    Turned off from inside the panel, optimistically. The server stops handing
    tokens over on the next render, and until it does this is what the reader
    sees: the same sentence with the taught word still marked, which is exactly
    what the screens above draw when the dictionary was never consulted.
  */
  const [dismissed, setDismissed] = useState(false);
  const chosen = open === null || dismissed ? null : tokens[open] ?? null;

  return (
    <div className="w-full">
      <div className="flex items-start gap-2">
        <p lang="et" className="flex-1 text-lg font-semibold leading-snug" style={{ color: "var(--ink)" }}>
          {tokens.map((token, i) => {
            if (token.taught) {
              return (
                <mark key={i} className="bg-transparent font-bold" style={{ color: "var(--accent-deep)" }}>
                  {token.text}
                </mark>
              );
            }
            if (!token.entry || dismissed) return <span key={i}>{token.text}</span>;
            const showing = open === i;
            return (
              <button
                key={i}
                type="button"
                /* An inline word in a sentence is deliberately not padded up to
                   the 44px floor: vertical padding on an inline box grows the
                   border box past the line rather than the line itself, which
                   is how a link ends up drawn outside the card it is in. WCAG
                   2.2 makes the same exception for the same reason. */
                className="rounded-sm underline underline-offset-4 transition-ui"
                /* The hover state is the open state, so there is no `hover:`
                   class here and there may not be one: an inline style beats a
                   class `:hover`, and a control painting its own resting
                   decoration inline can never define one. A pointer entering
                   the word opens it, which is what makes it solid. */
                style={{
                  /* The open word is a tint rather than a second purple. The
                     taught word is already `--accent-deep` two words away, and
                     two inks that close together read as one thing said twice:
                     what is showing is marked by being lifted off the line,
                     which is a different kind of object rather than a hue. */
                  color: "var(--ink)",
                  background: showing ? "var(--accent-soft)" : "transparent",
                  // Inline padding only, for the reason above.
                  paddingInline: "2px",
                  marginInline: "-2px",
                  textDecorationColor: showing ? "var(--accent-deep)" : "var(--accent)",
                  textDecorationStyle: showing ? "solid" : "dotted",
                }}
                /* The panel is a sibling rather than a child, so the word says
                   which region it opened: a screen reader following the button
                   otherwise lands on the sentence again. */
                aria-expanded={showing}
                aria-controls={panelId}
                onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(i); }}
                onFocus={() => setOpen(i)}
                /* Always opens, never toggles. A mouse arriving on the word
                   has already opened it, so a click that toggled would close
                   the panel of the word the pointer is sitting on, which is
                   what happens the first time anybody hovers and then presses.
                   The panel is closed from the panel. */
                onClick={() => setOpen(i)}
              >
                {token.text}
              </button>
            );
          })}
        </p>
        <Speak text={sentence} label="Hear the sentence" {...speak} />
      </div>

      <div id={panelId}>
        {chosen?.entry && (
          <WordPanel
            key={chosen.entry.lexemeId}
            entry={chosen.entry}
            onClose={() => setOpen(null)}
            onTurnOff={() => { setDismissed(true); onTurnedOff?.(); }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * One word out of the sentence, in English, with the thing somebody who did
 * not have it wants next.
 *
 * `matchedAs` is the whole reason this beats a gloss on its own: the sentence
 * says `kohvi` and the dictionary says `kohv`, and a learner who is not told
 * those are one word learns that they are two. It is only printed where the
 * spelling in front of them is not the headword.
 */
function WordPanel({ entry, onClose, onTurnOff }: {
  entry: NonNullable<GlossedToken["entry"]>;
  onClose: () => void;
  /** Draw the sentence plain, now, while the answer is on its way to the server. */
  onTurnOff: () => void;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  /*
    Its own transition, not the one the add button reads. Sharing it made
    pressing "stop underlining" put "Adding…" on the button beside it, which is
    the panel reporting a word had been kept when nothing of the sort happened.
  */
  const [leaving, startLeaving] = useTransition();
  const router = useRouter();

  const turnOff = () => {
    onTurnOff();
    startLeaving(async () => {
      await setWordGloss("off");
      /*
        Re-renders this screen from the setting, so the sentence somebody is
        looking at and the next one they meet agree about it. The optimistic
        change above is what they see in the meantime, since a review card is
        several server round trips from here.
      */
      router.refresh();
    });
  };

  const add = () => {
    start(async () => {
      /*
        A press, never a render. Recognition and production both, which is what
        every other one-word add in this app offers: a word you can read and
        cannot say is half learned. It does not refresh the route, because the
        route behind this is a review session holding its own queue.
      */
      const r = await addToDeck(entry.lexemeId, ["RECOGNITION", "PRODUCTION"], "SENTENCE");
      setResult(r.ok ? (r.added === 0 ? "Already in your deck." : `Added ${r.added} cards.`) : r.error);
    });
  };

  return (
    <div
      className="mt-2.5 rounded-[var(--r)] border px-3 py-2.5 text-left"
      style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {/* The headword is the link to its entry rather than a second
                button reading "Full entry": the card already has one of those
                for the word being taught, and two links with one name going to
                two places is a reader being told the same thing twice. */}
            <Link
              href={`/dictionary?q=${encodeURIComponent(entry.lemma)}`}
              lang="et"
              className="inline-flex items-baseline gap-1 text-base font-bold underline underline-offset-4"
              style={{ color: "var(--ink)", textDecorationColor: "var(--accent)" }}
            >
              {entry.lemma}
              <BookOpen size={12} aria-hidden />
            </Link>
            {entry.matchedAs && (
              <span className="text-2xs" style={{ color: "var(--ink-3)" }}>{entry.matchedAs}</span>
            )}
          </p>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{entry.gloss}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${entry.lemma}`}
          className="tap-tint -mr-1 rounded-full p-1.5"
          style={{ color: "var(--ink-3)" }}
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      <div className="mt-2">
        <Button size="sm" variant="soft" onClick={add} disabled={pending || result !== null}>
          {pending ? (
            <><Loader2 size={13} className="animate-spin" aria-hidden /> Adding…</>
          ) : result ? (
            <><Check size={13} aria-hidden /> {result}</>
          ) : (
            <><Plus size={13} aria-hidden /> Add to my deck</>
          )}
        </Button>
      </div>
      {/*
        THE WAY OUT IS UNDER THE PANEL RATHER THAN BESIDE THE BUTTON, because
        the two are about different things: keeping the word is about this
        word, and this is about every sentence in the app. Beside it they also
        wrapped at 360 into a stack with the loud one at the bottom, which is
        the row rule read upside down (see `buttonRuns`): a row ends on its
        primary and a column leads with it, and a wrapping row of two is
        whichever of those the width decides. A line of its own is neither.
      */}
      <div className="mt-2.5 border-t pt-2" style={{ borderColor: "var(--rule)" }}>
        <button
          type="button"
          onClick={turnOff}
          disabled={leaving}
          title="Stop underlining words. Settings turns it back on."
          /* The accessible name carries the sentence the tooltip does, because
             a tooltip is a hover and this app is measured on a phone. It opens
             with the visible words, which is what "label in name" asks for. */
          aria-label="Stop underlining words. Settings turns it back on."
          /* Inset by its own padding rather than pulled back by a negative
             margin: this panel has none to absorb one, and a control hanging
             outside the box it belongs to is what `test-containment.mjs`
             refused the last time somebody reached for `-ml-1`. */
          className="tap-tint inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs"
          style={{ color: "var(--ink-3)" }}
        >
          <Underline size={13} aria-hidden />
          Stop underlining words
        </button>
      </div>
      <span className="sr-only" role="status">{result ? `${entry.lemma}: ${result}` : ""}</span>
    </div>
  );
}
