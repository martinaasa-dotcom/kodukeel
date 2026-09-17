"use client";

import { Speak } from "@/components/Speak";
import { EstonianSentence } from "@/components/EstonianSentence";
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
          {/*
            One drawing of an attested sentence, here and on every other screen
            that shows one: the Estonian, the dictionary under it where the
            page looked, and what the whole thing means.
          */}
          <EstonianSentence
            et={sentence.et}
            en={sentence.en}
            form={sentence.form}
            tokens={tokens}
            lexemeId={lexemeId}
            canTranslate={canTranslate}
          />

          {/*
            AND NOTHING UNDER IT SAYING SO.

            This carried a line of 12px grey reading "Any underlined word opens
            its meaning", on every first meeting, for ever. It was reported as
            part of the small print stuck to every screen, and it was: an
            underline that opens on a tap is the oldest signal there is, the
            panel it opens says what it is the moment anybody tries, and a
            learner is told once by trying and then told again every card for
            the rest of the course. The other branch, "Try reading it out
            loud", was advice nobody asked for under a sentence somebody was
            already reading.
          */}
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
