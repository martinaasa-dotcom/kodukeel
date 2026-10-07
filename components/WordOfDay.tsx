import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { BookOpen } from "lucide-react";
import { ALMANAC_SOURCE, type WordOfDay } from "@/lib/progress/wordOfDay";
import { AddWordButton } from "@/components/AddWordButton";
import { Speak } from "@/components/Speak";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { Card, SectionTitle } from "@/components/ui";

/**
 * ONE WORD A DAY, WITH A REASON, THAT THE REST OF THE APP IS NOT GOING TO SHOW
 * YOU ANYWAY.
 *
 * Every other panel on Today reports on the learner's own deck, which means
 * every other panel goes quiet on the first morning and repeats itself on the
 * four hundredth. This one comes out of the dictionary, so it works on day one,
 * and it is chosen by the date, so it is different tomorrow whatever anybody
 * did today.
 *
 * The reason is the whole panel. `pannkook` on its own is a vocabulary item and
 * gets scrolled past; `pannkook` under "Pancake Day" is a thing somebody tells
 * a friend at lunch. `lib/copy/almanac.ts` decides what today is,
 * `lib/progress/wordOfDay.ts` asks the dictionary who carries the meaning, and
 * this prints what came back.
 *
 * WHAT IT WILL NOT DO IS INVENT ONE. When the dictionary cannot meet any of the
 * day's requests the word is simply drawn, and the card says that instead of
 * dressing it up. A reason nobody can check is worse than no reason, and the
 * day the card claims pancakes over the word for a cupboard is the day nobody
 * reads it again.
 */
export function WordOfDayCard({ word, canTranslate, className }: {
  word: WordOfDay | null;
  /** Whether this deployment has a model to ask for a sentence's English. */
  canTranslate: boolean;
  className?: string;
}) {
  if (!word) {
    return (
      <Card className={className}>
        <SectionTitle>Word of the day</SectionTitle>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          You&apos;ve already met every word we could pick for today, which is a first. Have a
          browse in the dictionary, and there&apos;ll be a new one here tomorrow.
        </p>
        <Link
          href="/dictionary"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--accent-deep)" }}
        >
          <BookOpen size={14} aria-hidden /> Open the dictionary
        </Link>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <SectionTitle>Word of the day</SectionTitle>

      {/*
        The number this card is about, at the size a number on a card is set,
        and pressable. `text-3xl` is the scale's page-title step, so on a phone
        the word sat at exactly the size of the page's own heading two inches
        above it and the two competed. And the word itself was inert while a
        separate line underneath offered to open its entry, which is the thing
        every sticking-point row already does by making the word the link.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/dictionary?q=${encodeURIComponent(word.lemma)}`}
          lang="et"
          className="text-2xl font-bold leading-tight underline decoration-transparent underline-offset-4 transition-ui hover:decoration-current"
          style={{ color: "var(--ink)" }}
        >
          {word.lemma}
        </Link>
        <Speak text={word.lemma} label={`Hear ${word.lemma}`} />
      </div>
      <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>{word.translation}</p>

      {word.example && (
        <figure className="mt-4 rounded-[var(--r)] px-3.5 py-3" style={{ background: "var(--sky-soft)" }}>
          <blockquote lang="et" className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
            {word.example.et}
          </blockquote>
          {/*
            And what it says. `{word.example.en && ...}` was the whole of the
            English here, and Ekilex records none on a reader key, so on a
            fresh deployment this panel offered a beginner a sentence in a
            language they are on day one of and nothing at all to read it
            with, every morning, for ever.
          */}
          <SentenceTranslation
            key={word.example.et}
            lexemeId={word.lexemeId}
            et={word.example.et}
            en={word.example.en ?? null}
            canTranslate={canTranslate}
          />
          {/* No provenance caption. It said "Recorded sentence" under every
              sentence this card has ever drawn, which is the disclaimer that
              came off the level check and every round: a claim worth making
              once, where somebody is deciding whether to trust this, and not
              under each individual sentence. */}
        </figure>
      )}

      {/*
        Marked as this panel's own.
      */}
      <AddWordButton lexemeId={word.lexemeId} lemma={word.lemma} source={ALMANAC_SOURCE} className="mt-4" />
    </Card>
  );
}

