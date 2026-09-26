import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Card, Chip, SectionTitle } from "@/components/ui";
import { MASTERY_LABEL, MASTERY_ORDER, MASTERY_CORRECT, MASTERY_SLOTS, type Mastery } from "@/lib/srs/mastery";
import { wordsAt, type MasteredWord } from "@/lib/progress/mastery";

/**
 * WHICH WORDS ARE KNOWN, WHICH ARE NEARLY, AND WHICH KEEP GOING WRONG.
 *
 * The deck could say a word was due or not due and nothing else. This is the
 * other reading, asked for directly: a mastered list, an almost list, and a
 * needs-work list, so somebody can see what they have actually got rather than
 * only what the scheduler wants from them today.
 *
 * COUNTED IN WORDS, NOT CARDS, which is what makes it different from the deck
 * tiles above it on the same page. Those count cards and read the FSRS state,
 * so one word contributes four or five rows and "Known" means "this card's
 * interval is long". A learner does not think in cards. `masteryOf` is the
 * rule and it is about the word: five correct answers across three different
 * forms, with the most recent one right.
 *
 * The tiers open one at a time and start closed. Four lists of sixty words
 * unrolled on a page somebody opened to see a number is a wall, and the counts
 * are the part that gets read.
 */

/** A hue each, and none of them shared with another meaning on this page. */
const TONES: Record<Mastery, "mint" | "butter" | "peach" | "sky"> = {
  mastered: "mint",
  almost: "butter",
  struggling: "peach",
  learning: "sky",
};

/** What each tier means, in the learner's terms rather than the rule's. */
const EXPLAINS: Record<Mastery, string> = {
  mastered: `Right ${MASTERY_CORRECT} times across ${MASTERY_SLOTS} different forms, or every form it has.`,
  almost: "Coming along. A couple more forms and these are done.",
  struggling: "These keep going wrong. Worth a round of flash cards.",
  learning: "Met, but not answered enough times to say either way.",
};

export function MasteryLists({
  words,
  counts,
}: {
  words: readonly MasteredWord[];
  counts: Record<Mastery, number>;
}) {
  if (words.length === 0) return null;

  return (
    <Card>
      <SectionTitle hint="counted in words, not cards">How well each word is sticking</SectionTitle>

      {/*
        One row per tier, and the row is the count. This drew four tiles of
        the numbers and then the same four numbers again as the rows that open,
        so every figure on the card was printed twice. A tier with nothing in
        it is still a row, quieter, because "none mastered yet" is a fact.
      */}
      <div className="flex flex-col gap-2">
        {MASTERY_ORDER.map((tier) => (
          <TierRow key={tier} tier={tier} words={wordsAt(words, tier)} total={counts[tier]} />
        ))}
      </div>

      {/*
        The page this is a summary of. It is the same query and the same rule;
        what the page adds is the per-word reading, which forms each word has
        been right in and how far off it is, and room to show it.
      */}
      <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
        Word by word, with what each one still needs, is on{" "}
        <Link
          href="/words/mastery"
          className="font-semibold underline underline-offset-2"
          style={{ color: "var(--accent-deep)" }}
        >
          Where your words stand
        </Link>.
      </p>
    </Card>
  );
}

function TierRow({ tier, words, total }: { tier: Mastery; words: MasteredWord[]; total: number }) {
  const tone = TONES[tier];
  const head = (
    <>
      <span aria-hidden className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: `var(--${tone})` }} />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold" style={{ color: "var(--ink)" }}>{MASTERY_LABEL[tier]}</span>
        <span className="block text-xs" style={{ color: "var(--ink-3)" }}>{EXPLAINS[tier]}</span>
      </span>
      <span className="tnum font-display text-2xl font-bold" style={{ color: total > 0 ? `var(--${tone}-ink)` : "var(--ink-3)" }}>
        {total}
      </span>
    </>
  );
  if (total === 0) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r)] border px-4 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        {head}
      </div>
    );
  }
  return (
    <details className="rounded-[var(--r)] border" style={{ borderColor: "var(--rule-soft)" }}>
      <summary className="tap-tint flex cursor-pointer items-center gap-3 rounded-[var(--r)] px-4 py-3">
        {head}
        <span className="sr-only">{total === 1 ? "word" : "words"}</span>
      </summary>

      <div className="px-4 pb-4">
        <ul className="flex flex-wrap gap-2">
          {words.map((word) => (
            <li key={word.lexemeId}>
              {/* Straight to the entry, because the question a list like this
                  raises is "which one was that again". */}
              <Link href={`/dictionary?q=${encodeURIComponent(word.lemma)}`} className="tap-tint rounded-full">
                <Chip tone={tier === "struggling" ? "again" : tier === "mastered" ? "good" : "hard"}>
                  <span lang="et">{word.lemma}</span>
                </Chip>
              </Link>
            </li>
          ))}
        </ul>
        {total > words.length && (
          <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
            The {words.length} you have worked most, of {total}.
          </p>
        )}
      </div>
    </details>
  );
}
