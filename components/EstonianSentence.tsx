"use client";

import { GlossedSentence } from "@/components/GlossedSentence";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { Speak } from "@/components/Speak";
import { splitOnForm } from "@/lib/dict/examples";
import type { GlossedToken } from "@/lib/dict/glossed";

/**
 * AN ATTESTED SENTENCE SHOWN TO A LEARNER, WITH WHAT IT MEANS UNDER IT.
 *
 * A sentence nobody can read teaches nothing, and that was reported on the one
 * screen whose whole job is a word doing its job: the unit lesson met `jah`,
 * glossed it "yes", and printed `Sina jah.` underneath in the smallest type on
 * the card with no English anywhere near it. A learner reads that as a line
 * the app forgot to finish. It was not one screen's fault either. Ekilex
 * records no English against a usage on a reader key, so *every* attested
 * sentence in this app arrives bare, and each screen had answered that for
 * itself: `WordIntro` asked and stored, six review rounds did the same after
 * it, and the unit lesson, the gap-fill reveal, the daily quest, the learn
 * ladder's own gap, the word of the day and every grammar page printed
 * `{en && ...}`, which on a fresh deployment is nothing at all, for ever.
 *
 * So this is the one drawing of an attested sentence, and the pairing is what
 * it is for: the Estonian and its English are one object here, and a screen
 * cannot draw the first without the second because there is no way to call
 * this that leaves the English out. `en` and `canTranslate` are **required**
 * for the reason `illSgShort` is required on `NounStems`: a caller that has
 * not thought about this does not compile. Null means the dictionary holds
 * none *yet*, which is a different claim from the screen having decided not to
 * say, and `SentenceTranslation` is what turns the first into the second, once
 * per sentence per deployment, stored on the lexeme so the next learner reads
 * it free.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING IS ESTONIAN. The sentence is as a
 * lexicographer recorded it; the marking is `splitOnForm`, which the screens
 * already used; the underlines are `lib/dict/glossed.ts`, which is the
 * dictionary's own headwords at the confidence a photographed page has to
 * clear (ADR-021); and the English is a model translating *into* English,
 * which is the one direction ADR-005 permits, tagged where it lands.
 *
 * What it deliberately does NOT draw is the chrome around a sentence. A first
 * meeting puts it in a panel with a provenance line, a gap-fill reveal puts it
 * under a verdict, a grammar page puts it under a form: those are each screen's
 * own, and folding them in here would make this the fourteenth thing that
 * cannot change without changing all of them.
 */
export function EstonianSentence({
  et, en, lexemeId, canTranslate, form = null, tokens = null,
  speak, speakLabel, className, ask, onTranslated,
}: {
  /** The sentence exactly as it was recorded. */
  et: string;
  /**
   * Its English, where the dictionary already holds one, and null where it
   * does not. Never a screen's own reading of the sentence.
   */
  en: string | null;
  /** The entry it hangs off, so a translation can be asked for and stored. Null where none can. */
  lexemeId: string | null;
  /** Whether this deployment has a model to ask. With none, nothing is offered. */
  canTranslate: boolean;
  /** The form the screen is about, marked in the sentence. */
  form?: string | null;
  /**
   * The same sentence with the dictionary under every other word, when the
   * page looked and the learner wants it (see lib/ux/wordGloss.ts).
   *
   * Null falls back to the marking alone, which is what every one of these
   * screens drew before the lookup existed.
   */
  tokens?: GlossedToken[] | null;
  /** How it is said, where the caller has an opinion. Passed straight through. */
  speak?: { voice?: string; rate?: number; autoplay?: boolean };
  speakLabel?: string;
  className?: string;
  /** When the translation call is spent. See `SentenceTranslation`. */
  ask?: "onArrival" | "never";
  /** Told what came back, for a caller keeping its own copy of the sentence. */
  onTranslated?: (en: string) => void;
}) {
  return (
    <>
      {tokens ? (
        /*
          Keyed on the sentence, like everything else here: a session draws one
          card after another through this same position, and without it the
          next sentence opens carrying the last one's panel.
        */
        <GlossedSentence
          key={et}
          tokens={tokens}
          sentence={et}
          speak={speak}
        />
      ) : (
        /*
          The speaker spans both lines and sits centred beside them. Beside the
          Estonian alone, a 44px button under a coarse pointer was taller than
          a one-line sentence, so the English under it was pushed a button's
          height down and every short example read as two things with a gap.
        */
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
          <p lang="et" className={className ?? "text-lg font-semibold leading-snug"} style={{ color: "var(--ink)" }}>
            {splitOnForm(et, form).map((run, i) => (
              run.match
                ? <mark key={i} className="bg-transparent font-bold" style={{ color: "var(--accent-deep)" }}>{run.text}</mark>
                : <span key={i}>{run.text}</span>
            ))}
          </p>
          <Speak
            text={et}
            label={speakLabel ?? "Hear the sentence"}
            voice={speak?.voice}
            rate={speak?.rate}
            autoplay={speak?.autoplay}
            className="press row-span-2 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--raised)]"
          />
          <div className="min-w-0">
            <SentenceTranslation
              key={et}
              lexemeId={lexemeId}
              et={et}
              en={en}
              canTranslate={canTranslate}
              ask={ask}
              onTranslated={onTranslated}
            />
          </div>
        </div>
      )}
      {tokens && (
        <SentenceTranslation
          key={et}
          lexemeId={lexemeId}
          et={et}
          en={en}
          canTranslate={canTranslate}
          ask={ask}
          onTranslated={onTranslated}
        />
      )}
    </>
  );
}
