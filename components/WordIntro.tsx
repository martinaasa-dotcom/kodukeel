"use client";

import { useState } from "react";
import { Speak } from "@/components/Speak";
import { GlossedSentence } from "@/components/GlossedSentence";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { splitOnForm } from "@/lib/dict/examples";
import type { GlossedToken } from "@/lib/dict/glossed";
import { SAME_SPELLING, sameSpelling } from "@/lib/copy/values";

/**
 * A WORD'S FIRST OUTING: WHAT IT MEANS, AND IT DOING ITS JOB IN A SENTENCE
 * SOMEBODY ACTUALLY WROTE.
 *
 * The sentence is the part that does the work. A gloss makes a word a label,
 * and a word in a sentence is a word you have seen behave. It is attested
 * Estonian picked by `teachingSentence`, with the form the learner is about to
 * be asked for marked in it, and nothing here is written or derived (ADR-005).
 *
 * AND A SENTENCE NOBODY CAN READ TEACHES NOTHING, which is what this screen
 * was for most words. Ekilex records no English on a reader key, so the usual
 * first meeting was one glossed word inside six that were not, and it was
 * reported that way. Two answers, and they are different answers rather than
 * two goes at one. Word by word is the one that always works and costs
 * nothing: `lib/dict/glossed.ts` puts the dictionary's own headword and gloss
 * under every word it will vouch for, offline, with no key and no call, and a
 * word the learner does not have can be kept from there. The whole sentence in
 * English is the other, and it is a paid call to a model translating *into*
 * English, which is the direction ADR-005 permits, so it is asked for rather
 * than spent on every word somebody meets. It is tagged where it lands, and
 * `translateExample` stores it on the sentence, so the next learner to meet
 * this word reads it for free.
 *
 * One component rather than one per screen, and that is what it is for. Review
 * had this drawing and Learn needs the same one: two copies would be two
 * answers to how a word is introduced, and the one nobody was looking at would
 * be the one that stopped saying where its sentence came from.
 */
export function WordIntro({
  lemma, gloss, equivalent, sentence, tokens, lexemeId, canTranslate = false,
  isPhrase, autoplay = true, children,
}: {
  lemma: string;
  gloss: string;
  /** The Institute's own equivalent in the learner's chosen language, or null. */
  equivalent: { text: string; lang: string } | null;
  /** An attested sentence, and which form of the word it carries. */
  sentence: { et: string; en: string | null; form: string | null } | null;
  /**
   * That same sentence with the dictionary under it, when the page looked.
   *
   * Null falls back to the marking alone, which is what this screen drew
   * before the lookup existed: a screen that quietly showed nothing would be
   * worse than one that shows the sentence it always showed.
   */
  tokens: GlossedToken[] | null;
  /** The entry the sentence hangs off, for asking about the sentence. */
  lexemeId: string | null;
  /** Whether this deployment has a model to ask. With none, nothing is offered. */
  canTranslate?: boolean;
  /** A whole utterance rather than a word, which is why it has no example. */
  isPhrase: boolean;
  autoplay?: boolean;
  /** Anything the screen wants under the sentence, such as what comes next. */
  children?: React.ReactNode;
}) {
  /*
    Whether the underlines were turned off from inside the panel a moment ago.
    It decides one thing, which is the sentence the provenance line ends on:
    "any underlined word opens its meaning" is true of the server's answer and
    false for the second between the press and the refresh landing, and a
    screen may not say a thing is there while somebody is looking at it not
    being there. The sentence itself is drawn plain by the component that was
    pressed. Reset by the next card, which arrives keyed on its own id.
  */
  const [plain, setPlain] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <p lang="et" className="text-3xl font-bold leading-tight tracking-tight md:text-4xl" style={{ color: "var(--ink)" }}>
          {lemma}
        </p>
        {/* Read aloud on arrival: the first time a word is met is the one time
            hearing it is worth more than reading it. */}
        <Speak text={lemma} autoplay={autoplay} />
      </div>
      {gloss && (
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {sameSpelling(lemma, gloss) ? SAME_SPELLING : gloss}
        </p>
      )}
      {equivalent && (
        <p lang={equivalent.lang} className="text-base" style={{ color: "var(--ink-2)" }}>
          {equivalent.text}
        </p>
      )}

      <div className="my-1 h-1 w-14 rounded-full" style={{ background: "var(--accent-soft)" }} />

      {sentence ? (
        <div className="w-full max-w-md rounded-[var(--r)] px-4 py-3.5 text-left" style={{ background: "var(--raised)" }}>
          {tokens ? (
            /*
              `plain` is not a second branch, deliberately. Swapping this
              ternary the moment the panel is turned off leaves BOTH sentences
              on screen: the swap lands inside the transition that refreshes
              the route, React holds the outgoing subtree while the incoming
              server render is pending, and the reader gets the line twice.
              Measured. `GlossedSentence` draws itself plain instead, which it
              has to be able to do for the conversation anyway, and all this
              flag decides is what the caption underneath claims.
            */
            <GlossedSentence
              key={sentence.et}
              tokens={tokens}
              sentence={sentence.et}
              onTurnedOff={() => setPlain(true)}
            />
          ) : (
            <div className="flex items-start gap-2">
              <p lang="et" className="flex-1 text-lg font-semibold leading-snug" style={{ color: "var(--ink)" }}>
                {splitOnForm(sentence.et, sentence.form).map((run, i) => (
                  run.match
                    ? <mark key={i} className="bg-transparent font-bold" style={{ color: "var(--accent-deep)" }}>{run.text}</mark>
                    : <span key={i}>{run.text}</span>
                ))}
              </p>
              <Speak text={sentence.et} label="Hear the sentence" />
            </div>
          )}

          {/* Keyed on the sentence, because a session draws one card after
              another through this same position: without it the word after a
              translated one opens carrying the last word's English. */}
          <SentenceTranslation
            key={sentence.et}
            lexemeId={lexemeId}
            et={sentence.et}
            en={sentence.en}
            canTranslate={canTranslate}
          />

          {/* One line rather than two. The provenance is the half that has to
              be there, and where there is something to open, saying so is
              worth more than telling a beginner to read it aloud. */}
          <p className="mt-2 text-2xs" style={{ color: "var(--ink-3)" }}>
            {!plain && tokens?.some((token) => token.entry)
              ? "A real sentence, from Ekilex. Any underlined word opens its meaning."
              : "A real sentence, from Ekilex. Try reading it out loud."}
          </p>
        </div>
      ) : (
        /* No sentence, said plainly. The dictionary carries examples for most
           words and not for all of them, and a screen that quietly shows a word
           on its own looks exactly like one that had nothing to say about it.

           AND A PHRASE IS NOT AN ABSENCE. Ekilex records a usage against a
           word, so it has none for `Tere!` or `Kuidas läheb?` and never will:
           those are already the sentence. Every one of the twenty phrases the
           A1 greetings unit teaches used to read as a gap in the dictionary,
           on the first cards anybody meets. */
        <p className="max-w-[38ch] text-sm" style={{ color: "var(--ink-3)" }}>
          {isPhrase
            ? "A whole phrase, said just as it stands. Say it out loud a couple of times."
            : "No example sentence for this one yet. Say it out loud a couple of times."}
        </p>
      )}

      {children}
    </>
  );
}
