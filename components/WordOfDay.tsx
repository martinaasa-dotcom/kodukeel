import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { BookOpen, CalendarDays, Sprout } from "lucide-react";
import { ALMANAC_SOURCE, type WordOfDay, type WordOfDayCollection } from "@/lib/progress/wordOfDay";
import { AddWordButton } from "@/components/AddWordButton";
import { Speak } from "@/components/Speak";
import { WaveWord, WAVE_END } from "@/components/motion/WaveWord";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { Card, CardLink, Chip, SectionTitle } from "@/components/ui";
import { countOf, fill, tr, type Locale } from "@/lib/copy/locale";

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
export function WordOfDayCard({ word, collection, canTranslate, locale, className }: {
  word: WordOfDay | null;
  /**
   * What the learner has kept from this panel so far.
   *
   * A count is what turns a card you read into a card you use: somebody who has
   * kept eleven words this way opens it looking for the twelfth. It says nothing
   * at nought, because "kept 0 so far" is a scoreboard for not having started.
   */
  collection: WordOfDayCollection;
  /** Whether this deployment has a model to ask for a sentence's English. */
  canTranslate: boolean;
  /** The language the card's own words are in. The word and its sentence never change. */
  locale: Locale;
  className?: string;
}) {
  const t = (english: string) => tr(locale, english);
  if (!word) {
    return (
      <Card className={className}>
        <SectionTitle>{t("Word of the day")}</SectionTitle>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }} lang={locale}>
          {t("You've already met every word we could pick for today, which is a first. Have a browse in the dictionary, and there'll be a new one here tomorrow.")}
        </p>
        <Link
          href="/dictionary"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--accent-deep)" }}
        >
          <BookOpen size={14} aria-hidden /> {t("Open the dictionary")}
        </Link>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <SectionTitle hint={word.occasion ? t(word.occasion.name) : t("new to you")}>
        {t("Word of the day")}
      </SectionTitle>

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
          /* The word ripples, letter by letter, when it is reached for: the
             one bit of play on a card whose whole subject is a word. The link
             carries the word as its name, since the letters are hidden. */
          aria-label={word.lemma}
          data-hop-on="hover"
          data-hop-end={WAVE_END}
          className="text-2xl font-bold leading-tight underline decoration-transparent underline-offset-4 transition-ui hover:decoration-current"
          style={{ color: "var(--ink)" }}
        >
          <WaveWord text={word.lemma} named />
        </Link>
        <Speak text={word.lemma} label={fill(t("Hear {word}"), { word: word.lemma })} />
      </div>
      <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>{word.translation}</p>

      {/*
        The band alone. Three chips sat here, and the other two were facts
        about the word rather than about today: the part of speech and the
        gradation pattern are both on the entry this word links to, printed
        beside the table they are about. On a card whose job is one word and
        why it is today's, a row of three pills is the busiest thing on the
        screen and the least useful.
      */}
      {word.cefr && (
        <div className="mt-3">
          <Chip tone="sky">{word.cefr}</Chip>
        </div>
      )}

      {/*
        Why this word today. An icon and a line rather than a heading, because
        it is an aside about the date and the word above it is the point.
      */}
      {/*
        Only where there is an occasion to name. On an ordinary day this read
        "Nothing special about today, so here is a word you have not met yet."
        under a hint already reading "new to you": a line whose whole content
        was that there was nothing to say, beside a line that had said it.
      */}
      {word.occasion && (
        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <CalendarDays size={15} aria-hidden className="mt-0.5" style={{ color: "var(--sky-ink)" }} />
          <span>{t(word.occasion.note)}</span>
        </p>
      )}

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
        Marked as this panel's own, which is the only reason the count below can
        exist without a column to store it in.
      */}
      <AddWordButton lexemeId={word.lexemeId} lemma={word.lemma} source={ALMANAC_SOURCE} className="mt-4" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <CardLink
          href={`/dictionary?q=${encodeURIComponent(word.lemma)}`}
          icon={<BookOpen size={14} aria-hidden />}
        >
          {t("See the full entry")}
        </CardLink>
        {collection.kept > 0 && (
          <p className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-3)" }}>
            <Sprout size={13} aria-hidden />
            {locale === "en"
              ? <>
                {collection.kept} {collection.kept === 1 ? "word of the day" : "words of the day"} kept so far
                {collection.streak > 1 ? `, ${collection.streak} days in a row` : ""}
              </>
              : fill(t(collection.streak > 1
                ? "Words of the day kept so far: {kept}, {days} in a row"
                : "Words of the day kept so far: {kept}"), { kept: collection.kept, days: countOf(locale, collection.streak, "day") })}
          </p>
        )}
      </div>
    </Card>
  );
}

