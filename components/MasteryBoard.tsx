import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Card, Meter, SectionTitle, StatTile } from "@/components/ui";
import {
  MASTERY_CORRECT, MASTERY_LABEL, MASTERY_ORDER, type Mastery,
} from "@/lib/srs/mastery";
import { slotShort } from "@/lib/srs/slots";
import { wordsAt, type MasteredWord } from "@/lib/progress/mastery";

/**
 * WHERE EVERY WORD STANDS, WORD BY WORD.
 *
 * The learner asked twice for this, and the second time because the first
 * answer was a panel three cards down a page about the deck: "I dont see it
 * anywhere". A list somebody has to find is a list nobody reads, so it has a
 * page of its own, a row in the rail's own table and a link from every screen
 * that talks about mastery.
 *
 * COUNTED IN WORDS, NOT CARDS, which is what makes it different from the deck
 * box on `/words`. That counts cards and reads the FSRS state, so one word
 * contributes four or five rows and "Known" means "this card's interval is
 * long". A learner does not think in cards. `masteryOf` is the rule and it is
 * about the word.
 *
 * WHAT EACH ROW SAYS. How many correct answers, how many different forms they
 * span, and which forms those were, because "you are 60% of the way there" is
 * a number and "you have had this right in the seesütlev and the osastav" is
 * something to act on. The bar reads the smaller of the two shares, so a word
 * right eight times in one form does not show as nearly finished.
 *
 * The four tiers are one colour. They were sky, butter, blush and the accent,
 * which is right, nearly, wrong and "yours", so a tier read as a mark on the
 * learner rather than as where a word has got to. The label says which tier.
 *
 * Server-rendered: the lists are read once and nothing here is interactive
 * beyond the links, so there is nothing for a client bundle to do.
 */


/** What each tier means, in the learner's terms rather than the rule's. */
const EXPLAINS: Record<Mastery, string> = {
  mastered: `Right ${MASTERY_CORRECT} times, across the forms this word has.`,
  almost: "Coming along. A couple more forms and these are done.",
  struggling: "These keep going wrong. Flash cards is the round for them.",
  learning: "Met, but not answered enough times to say either way.",
};

export function MasteryBoard({
  words, counts,
}: { words: readonly MasteredWord[]; counts: Record<Mastery, number> }) {
  return (
    <>
      <Card tone="night">
        <SectionTitle hint="counted in words, not cards">At a glance</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {MASTERY_ORDER.map((tier) => (
            <StatTile key={tier} value={counts[tier]} label={MASTERY_LABEL[tier]} tone="accent" />
          ))}
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
          Mastered is right {MASTERY_CORRECT} times, in three different forms.
        </p>
      </Card>

      {MASTERY_ORDER.filter((tier) => counts[tier] > 0).map((tier) => (
        <Tier key={tier} tier={tier} words={wordsAt(words, tier)} total={counts[tier]} />
      ))}
    </>
  );
}

function Tier({ tier, words, total }: { tier: Mastery; words: MasteredWord[]; total: number }) {
  return (
    <Card>
      <SectionTitle hint={`${total} ${total === 1 ? "word" : "words"}`}>
        {MASTERY_LABEL[tier]}
      </SectionTitle>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>{EXPLAINS[tier]}</p>

      {/* One list with hairlines rather than a bordered box per word: forty
          boxes down a page is forty edges to read past before the words. Two
          columns once the card is wide enough to give each a line of its own. */}
      <div className="@container mt-4">
        <ul className="grid gap-x-6 @2xl:grid-cols-2">
          {words.map((word) => (
            <li key={word.lexemeId} className="border-b" style={{ borderColor: "var(--rule-soft)" }}>
              <Row word={word} />
            </li>
          ))}
        </ul>
      </div>

      {total > words.length && (
        <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
          The {words.length} you have worked most, of {total}.
        </p>
      )}
    </Card>
  );
}

function Row({ word }: { word: MasteredWord }) {
  const { correct, total, slots, slotsNeeded, filled, progress } = word.verdict;
  /* Which forms is for a reader who asks, so it rides on the bar's label; the
     row says the word, what it means, and how far along it is. */
  const forms = filled.length > 0 ? `: ${filled.map((slot) => slotShort(slot)).join(", ")}` : "";
  return (
    /* Straight to the entry, because the question a list like this raises is
       "which one was that again", and the entry is where every form of it is. */
    <Link
      href={`/dictionary?q=${encodeURIComponent(word.lemma)}`}
      className="tap-tint flex min-h-11 items-center gap-3 rounded-md px-1 py-2"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>
            {word.lemma}
          </span>
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>{word.translation}</span>
        </span>
        <span className="block text-sm" style={{ color: "var(--ink-3)" }}>
          <span className="tnum">{correct}</span> of <span className="tnum">{total}</span> right,
          in <span className="tnum">{slots}</span>
          {slots < slotsNeeded ? <> of <span className="tnum">{slotsNeeded}</span></> : null}{" "}
          {slots === 1 ? "form" : "forms"}
        </span>
      </span>
      <span className="w-16 shrink-0">
        <Meter
          pct={Math.round(progress * 100)}
          label={`${word.lemma} toward mastered${forms}`}
          tone="var(--accent)"
          height={5}
        />
      </span>
    </Link>
  );
}
