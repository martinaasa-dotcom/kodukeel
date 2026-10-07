import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { CaseLabel } from "@/components/CaseLabel";
import { ChevronRight, Puzzle, Sparkles, Target, TriangleAlert } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { oneEntryPerLemma } from "@/lib/dict/search";
import { DEMO_STEMS } from "@/lib/collections/demoWords";
import { buildCaseTable, shownForms, stemsFrom } from "@/lib/estonian/derive";
import {
  CASE_GROUPS, TOPIC_GROUPS, TOPIC_NOTES, caseReference, grammarTopic, groupEndings,
} from "@/lib/estonian/grammar";
import { VERB_AXES, grammarGroupTerm, grammarTerm } from "@/lib/estonian/terms";
import { caseAccuracy } from "@/lib/stats/history";
import { caseReviewsFor } from "@/lib/progress/cases";
import { Card, Chip, Meter, Note, Page, SectionTitle, Stack } from "@/components/ui";
import { Lettered } from "@/components/HeroLetters";
import { localeFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { fillNodes } from "@/components/reference/fillNodes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Grammar: the endings and what they mean",
  description:
    "All fourteen Estonian cases in plain English, each with the name your teacher uses and the question it answers, shown on real words.",
};

/**
 * The reference layer.
 *
 * Every other screen in the app tests. This one explains, which is the half a
 * flashcard app usually leaves to a textbook the learner does not own.
 *
 * WHAT LEADS IS THE ENDING. A learner mid-sentence is not looking for the
 * inessive, they are looking for -s, and the version of this page that led
 * with fourteen Latin names asked them to decode a heading before they could
 * read the line under it. So each card is the ending, then the English word it
 * means, then one line on what it does, and the two names a course and a
 * reference grammar use sit under that as the cross-reference they are.
 *
 * The strip at the top is the argument in one object: one real word out of the
 * dictionary, wearing every ending. Nothing on it is written here.
 */
/* The endings take the night's four colours in turn, each in its ink so it
   reads on the dark panel. */
const ENDING_HUES = ["var(--butter-ink)", "var(--blush-ink)", "var(--sky-ink)", "var(--accent-deep)"];

export default async function GrammarIndexPage() {
  const ownerId = await requireUserId();

  const [reviews, demo, locale] = await Promise.all([
    // Through the one reader, so this page and Practice and Progress cannot
    // name three different weakest cases at the same learner. See
    // lib/progress/cases.ts.
    caseReviewsFor(ownerId),
    endingStrip(),
    localeFor(ownerId),
  ]);
  const t = (english: string, context?: string) => tr(locale, english, context);
  const weakest = caseAccuracy(reviews).slice(0, 3);

  return (
    <Page route="/grammar"
      eyebrow={t("Reference")}
      title={t("Grammar")}
      lead={t("Fourteen endings. Three you learn by heart, and eleven you can work out.")}
    >
      <Stack>
        <Lettered>
          <Card tone="night" className="md:p-9">
            <p className="label-xs flex items-center gap-2" style={{ color: "var(--butter-ink)" }}>
              <Sparkles size={14} aria-hidden className="shrink-0" />
              {t("How the cases work")}
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold leading-[1.02] md:text-5xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
              {t("One word, eleven endings")}
            </h2>
            <p className="mt-3 max-w-[58ch] text-md leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {t("You learn three forms of a word by heart. Every other case is one of those three with an ending stuck on, and it's the same ending for every word in the language.")}
            </p>
            {demo && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {demo.forms.map((row, i) => (
                  <li
                    key={row.suffix}
                    className="pop-in rounded-full px-3 py-1.5"
                    style={{
                      background: "rgb(255 255 255 / 0.07)",
                      border: "1px solid rgb(255 255 255 / 0.1)",
                      animationDelay: `${i * 45}ms`,
                    }}
                  >
                    <span lang="et" className="text-base" style={{ color: "var(--ink-2)" }}>
                      {row.stem}
                    </span>
                    <span lang="et" className="text-base font-bold" style={{ color: ENDING_HUES[i % ENDING_HUES.length] }}>
                      {row.suffix}
                    </span>
                    <span className="ml-2 text-sm" style={{ color: "var(--ink-3)" }}>
                      {t(row.plain)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Lettered>

        {/*
          THE INTERACTIVE VERSION OF THE CARD ABOVE, FIRST, BECAUSE THE CARD
          ABOVE IS AN ASSERTION.

          The strip says eleven endings are arithmetic and shows one word
          wearing them. Somebody meeting the case system for the first time
          needs to do it once rather than read it once: pick a word, see which
          three forms are stored, watch an ending go onto the second of them,
          and read the result inside a sentence somebody wrote. That is
          `/grammar/build-a-word`, and it is the screen this page is the reference
          for rather than a mode beside it.
        */}
        <Link
          href="/grammar/build-a-word"
          className="lift flex items-start gap-4 rounded-[var(--r-lg)] border p-5"
          style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--accent-deep)", color: "var(--accent-ink)" }}
          >
            <Puzzle size={19} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold" style={{ color: "var(--ink)" }}>
              {t("Build a word")}
            </span>
            <span className="mt-1.5 block text-sm" style={{ color: "var(--ink-2)" }}>
              {t("Pick a word, meet the three forms you learn by heart, then add the other eleven endings one at a time. Each comes with what it means and a real sentence that uses it.")}
            </span>
          </span>
        </Link>

        {/*
          WHERE THE PATTERN STOPS, LINKED FROM THE PAGE THAT TEACHES IT.

          The card above says three are memorised and eleven follow, which is
          true and is the most motivating fact a beginner is given. It is also
          the thing that burns them, because `caseAnswer` prefers an attested
          form over the rule and prints `tuppa` under a heading that taught
          `sse`. A learner who is not told where the rule ends has been handed
          a pattern presented as more reliable than it is.
        */}
        <Link
          href="/grammar/exceptions"
          className="lift flex items-start gap-4 rounded-[var(--r-lg)] border p-5"
          style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--butter-soft)", color: "var(--butter-ink)" }}
          >
            <TriangleAlert size={19} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold" style={{ color: "var(--ink)" }}>
              {t("Words that break the pattern")}
            </span>
            <span className="mt-1.5 block text-sm" style={{ color: "var(--ink-2)" }}>
              {t("Some words go their own way, like tuba becoming tuppa, and when a word's stem changes, eleven cases change with it. Here's which words do that, and how to practise them.")}
            </span>
          </span>
        </Link>

        {weakest.length > 0 && (
          <section>
            <SectionTitle hint={t("from your own reviews")}>{t("Start with these")}</SectionTitle>
            <Card>
              <ul className="flex flex-col gap-2">
                {weakest.map((c) => {
                  const ref = caseReference(c.grammCase);
                  if (!ref) return null;
                  return (
                    <li key={c.grammCase}>
                      <Link
                        href={`/grammar/${c.grammCase.toLowerCase()}`}
                        className="tap-tint flex flex-col gap-1.5 rounded-[var(--r)] px-2 py-2"
                      >
                        {/* Two lines rather than one row, because on a phone
                            the one row put the meter under the label and the
                            figure under the meter, which read as three rows
                            with nothing lining up. */}
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
                            <Target size={15} aria-hidden className="self-center" style={{ color: "var(--ink-3)" }} />
                            {!ref.spec.principal && (
                              <span lang="et" className="font-semibold" style={{ color: "var(--accent-deep)" }}>
                                -{ref.spec.suffix}
                              </span>
                            )}
                            <span className="font-semibold" style={{ color: "var(--ink)" }}>{t(ref.plain)}</span>
                            <span lang="et" className="text-xs" style={{ color: "var(--ink-3)" }}>
                              {ref.spec.et}
                            </span>
                          </span>
                          <span className="tnum shrink-0 text-xs" style={{ color: "var(--ink-3)" }}>
                            {fill(t("{accuracy}% over {total}"), { accuracy: c.accuracy, total: c.total })}
                          </span>
                        </span>
                        <span className="block max-w-[320px]">
                          <Meter
                            pct={c.accuracy}
                            label={fill(t("{case} accuracy"), { case: ref.spec.et })}
                            tone="var(--accent)"
                            height={5}
                          />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        )}

        {CASE_GROUPS.map((group) => {
          // Empty for the three that have no ending, and an empty hint is no
          // hint rather than an empty span sitting in the heading row.
          const endings = groupEndings(group);
          return (
          <section key={group.title}>
            <SectionTitle
              hint={endings.length > 0 ? (
                // As written, for the reason the case page's eyebrow is: a
                // heading is uppercased and an ending is not a label.
                <span lang="et" style={{ textTransform: "none" }}>{endings.join(", ")}</span>
              ) : undefined}
            >
              {t(group.title)}
            </SectionTitle>
            <p className="mb-3 max-w-[68ch] text-sm" style={{ color: "var(--ink-2)" }}>
              {t(group.blurb)}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.keys.map((key) => {
                const ref = caseReference(key);
                if (!ref) return null;
                return (
                  <li key={key}>
                    <Link
                      href={`/grammar/${key.toLowerCase()}`}
                      className="lift flex h-full flex-col gap-2 rounded-[var(--r-lg)] border p-4"
                      style={{
                        borderColor: "var(--edge)",
                        background: "var(--surface)",
                        boxShadow: "var(--depth-sm)",
                      }}
                    >
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {ref.spec.principal ? (
                          <Chip tone="hard">{t("memorized")}</Chip>
                        ) : (
                          <span lang="et" className="text-xl font-bold" style={{ color: "var(--accent-deep)" }}>
                            -{ref.spec.suffix}
                          </span>
                        )}
                        <span className="text-md font-bold" style={{ color: "var(--ink)" }}>
                          {t(ref.plain)}
                        </span>
                      </span>
                      <span className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                        {t(ref.summary)}
                      </span>
                      {/* The two names, quietly, under the thing they name.
                          A class says the first and an English reference
                          grammar says the second, so both have to be findable
                          and neither has any business being the headline. */}
                      <span className="mt-auto pt-1 text-xs" style={{ color: "var(--ink-3)" }}>
                        <CaseLabel label={ref.spec} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          );
        })}

        {/*
          On the page's own surface, set as a definition list rather than four
          boxes inside a yellow box: it was the one filled panel in a reference
          that is otherwise type on paper, and a box inside a box for each of
          four terms.
        */}
        <Card>
          <p className="text-lg font-bold" style={{ color: "var(--ink)" }}>
            {t("Estonian verbs have just two tenses")}
          </p>
          <p className="mt-2 max-w-[64ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {t("A present and a past. Two more are made with a helper verb, the way English says “have done”. Mood, voice and person are separate switches on top, so you describe any form by saying how each switch is set.")}
          </p>
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {VERB_AXES.map((axis) => (
              <div key={axis.et} className="min-w-0">
                <dt className="flex flex-wrap items-baseline gap-2">
                  <span className="text-md font-bold" style={{ color: "var(--ink)" }}>
                    {t(axis.en, "grammar")}
                  </span>
                  <span lang="et" className="text-xs" style={{ color: "var(--ink-3)" }}>{axis.et}</span>
                </dt>
                <dd className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {t(axis.blurb)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <section>
          <SectionTitle hint={countOf(locale, TOPIC_NOTES.length, "point")}>{t("Beyond the endings")}</SectionTitle>
          <p className="mt-1 max-w-[68ch] text-sm" style={{ color: "var(--ink-2)" }}>
            {t("Grouped by the kind of word they're about, in the order a course would teach them.")}
          </p>
          <div className="mt-4 flex flex-col gap-6">
            {TOPIC_GROUPS.map((group) => {
              const groupTerm = grammarGroupTerm(group.id);
              return (
                <div key={group.id}>
                  <h3 className="flex flex-wrap items-baseline gap-2">
                    <span className="text-md font-bold" style={{ color: "var(--ink)" }}>{t(group.title)}</span>
                    {groupTerm && (
                      <span lang="et" className="text-xs" style={{ color: "var(--ink-3)" }}>
                        {groupTerm}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 max-w-[68ch] text-sm" style={{ color: "var(--ink-3)" }}>
                    {t(group.blurb)}
                  </p>
                  {/*
                    ONE LINE A POINT. Each was a card carrying a paragraph,
                    forty-four of them: a page of summaries to read before
                    finding the one you came for. The summary is the first
                    thing the point's own page says; here it is the name, the
                    Estonian a class calls it, and the ending where there is one.
                  */}
                  {/* Two columns by the room the list has, not the window: at
                      768 the rail takes a column and two columns of rows broke
                      "täisminevik" to fit beside its ending. */}
                  <div className="@container">
                  <ul
                    className="mt-3 grid gap-x-6 rounded-[var(--r-lg)] border px-2 py-1.5 @2xl:grid-cols-2"
                    style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
                  >
                    {group.ids.map((id) => {
                      const topic = grammarTopic(id);
                      if (!topic) return null;
                      const term = grammarTerm(id);
                      return (
                        <li key={id}>
                          <Link
                            href={`/grammar/topic/${id}`}
                            className="tap-tint group flex min-h-11 items-center gap-3 rounded-[var(--r-sm)] px-2.5 py-2"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-base font-semibold group-hover:underline" style={{ color: "var(--ink)" }}>
                                {t(topic.title)}
                              </span>
                              {term && (
                                <span lang="et" className="block text-xs" style={{ color: "var(--ink-3)" }}>{term.et}</span>
                              )}
                            </span>
                            {topic.marker && (
                              <span className="shrink-0">
                                <Chip tone="accent" caseSensitive>{topic.marker}</Chip>
                              </span>
                            )}
                            <ChevronRight size={16} aria-hidden className="shrink-0" style={{ color: "var(--ink-3)" }} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Note tone="neutral">
          {t("The singular endings go on the omastav singular, and the plural ones on the omastav plural. If the dictionary has no omastav plural for a word, its table shows a gap rather than a guess.")}
        </Note>

        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {fillNodes(t("Still stuck on one? {ask} and she'll explain the rule behind a sentence you wrote."), {
            ask: (
              <Link href="/tutor" className="underline" style={{ color: "var(--accent-deep)" }}>
                {t("Ask Anu")}
              </Link>
            ),
          })}
        </p>
      </Stack>
    </Page>
  );
}

interface StripRow {
  /** Everything before the ending, so the ending can be picked out in color. */
  readonly stem: string;
  readonly suffix: string;
  /** What the ending means, from `CASE_NOTES`. */
  readonly plain: string;
}

/**
 * One real word wearing every ending, for the card at the top.
 *
 * The claim that card makes is that eleven cases are arithmetic, and a claim
 * like that is worth more shown than asserted. Nothing here is written: the
 * word comes out of the dictionary and the forms come from `buildCaseTable`,
 * which is the same function the dictionary entry and the landing page use.
 * A deployment whose database is unreachable falls back to the checked seed
 * stems, exactly as the landing page does, so the card never renders empty.
 *
 * The word is the regular one on purpose. `tuba` would be a better argument
 * about stems changing and a worse picture of an ending, and this card is
 * about the ending.
 */
async function endingStrip(): Promise<{ lemma: string; forms: StripRow[] } | null> {
  const fallback = DEMO_STEMS[0];
  if (!fallback) return null;

  let stems = fallback;
  try {
    const lexemes = await prisma.lexeme.findMany({
      where: { lemma: fallback.lemma },
      include: { forms: true },
    });
    const [lex] = oneEntryPerLemma(lexemes, [fallback.lemma]);
    if (lex) stems = { ...stems, ...stemsFrom(lex.forms) };
  } catch {
    // A reference page renders whether or not the database is having a good
    // minute, which is the rule the landing page's own case explorer follows.
  }

  const forms = buildCaseTable(stems).flatMap((row) => {
    if (row.spec.principal || !row.spec.suffix) return [];
    const note = caseReference(row.spec.key);
    // shownForms rather than `singular`, because the illative has two right
    // answers and a strip that prints one has chosen which to be wrong about.
    // Only the one that ends in this case's own suffix can show the ending,
    // and where none does the row is left out rather than mislabelled.
    const value = shownForms(row).find((f) => f.endsWith(row.spec.suffix));
    if (!note || !value) return [];
    return [{
      stem: value.slice(0, value.length - row.spec.suffix.length),
      suffix: row.spec.suffix,
      // The first sense only. `plain` reads "onto, and to a person" because a
      // card has room to say both, and eleven of those side by side is a
      // paragraph laid out as chips. The strip is the shape of the system;
      // the card under it is where the second half of a meaning belongs.
      plain: note.plain.split(",")[0]!,
    }];
  });

  return forms.length > 0 ? { lemma: stems.lemma, forms } : null;
}
