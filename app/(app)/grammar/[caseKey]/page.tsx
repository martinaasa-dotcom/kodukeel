import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ReadingEnd } from "@/components/course/ReadingEnd";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, MessageCircleQuestion, PenLine, Target, TriangleAlert,
} from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { CASES, caseQuestionReading } from "@/lib/estonian/cases";
import { localeFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { fillNodes } from "@/components/reference/fillNodes";
import { allCaseReferences, caseReference } from "@/lib/estonian/grammar";
import { caseExamples, type CaseExample } from "@/lib/progress/caseExamples";
import { ButtonLink } from "@/components/Button";
import { Card, Empty, Note, Page, SectionTitle, Stack } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { EstonianSentence } from "@/components/EstonianSentence";
import { PointExamples } from "@/components/grammar/PointExamples";
import { pinnedExamples } from "@/lib/progress/grammarExamples";
import { resolveProvider } from "@/lib/tutor/provider";
import { SuggestFix } from "@/components/SuggestFix";
import { NO_VALUE } from "@/lib/copy/values";
import { focusFrom } from "@/lib/course";
import { moduleScopeFrom } from "@/lib/course/scope";
import { caseAsks } from "@/lib/course/tryIt";
import { TryIt } from "@/components/course/TryIt";
import { WordLink } from "@/components/course/WordLink";
import { FitText } from "@/components/FitText";

export const dynamic = "force-dynamic";

/** Pre-renders nothing, but tells Next the shape of the segment. */
export function generateStaticParams() {
  return CASES.map((c) => ({ caseKey: c.key.toLowerCase() }));
}

/** The ending, or the word "memorized" where there is no ending to give. */
function endingOf(ref: { spec: { principal: boolean; suffix: string; et: string } }): string {
  // A stored case has no ending to print, so it is named the way a class
  // names it. "memorized" at the top of the page read as a heading about
  // nothing: it is what a form is, not what the case is called.
  return ref.spec.principal ? ref.spec.et : `-${ref.spec.suffix}`;
}

/** The plain meaning as a heading. Everything else about it stays as written. */
function asTitle(plain: string): string {
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

export async function generateMetadata({ params }: { params: Promise<{ caseKey: string }> }) {
  const { caseKey } = await params;
  const ref = caseReference(caseKey.toUpperCase());
  const locale = await localeFor(await requireUserId());
  if (!ref) return { title: tr(locale, "Grammar") };
  return {
    title: fill(tr(locale, "{ending} means {meaning}, {name}"), { ending: endingOf(ref), meaning: tr(locale, ref.plain), name: ref.spec.et }),
    description: ref.summary,
  };
}

const ORIGIN_LABEL: Record<CaseExample["origin"], { label: string; title: string }> = {
  EKILEX: {
    label: "recorded",
    title: "The form as the dictionary records it",
  },
  STORED: {
    // "memorized" rather than "principal part", because on the sisseütlev page
    // every stored form is the short illative and `tuppa` is not one of the
    // three. The title under it was already saying the true thing.
    label: "memorized",
    title: "A form you learn by heart, because no rule gives it to you",
  },
  DERIVED: {
    label: "from the omastav",
    title: "Worked out for you: the omastav with this case's ending added on",
  },
};

/** How many attested sentences to print. Three is a sample; six is a wall. */
const SENTENCES = 3;

/**
 * One ending, explained.
 *
 * WHAT THE PAGE LEADS WITH IS WHAT THE ENDING MEANS. It used to lead with the
 * Estonian name and carry the Latin one beside it, which is right on a card
 * offering a choice between fourteen and wrong on the page somebody opens
 * because they cannot remember whether it is -s or -st. So the heading is the
 * English word, the eyebrow is the ending, and both names are in the card
 * underneath: a class says one and an English reference grammar says the
 * other, and neither is what a learner came here for.
 *
 * The prose is `lib/estonian/grammar.ts` and contains no Estonian. Every
 * Estonian word below it is read out of the dictionary by
 * `lib/progress/caseExamples.ts` and carries where it came from, because
 * "Ekilex says so" and "this app added an ending to a stem" are different
 * claims and a learner deserves to know which one they are looking at.
 *
 * AND READ FROM TONIGHT'S MODULE IT IS A READING AND NOTHING ELSE.
 *
 * The module's second step is "read the point behind it", and what it opened
 * was this, whole: an ending explained, and then four buttons, a drill, a note
 * about the drill and a way on to the next ending. It was reported from
 * exactly there. The learner read the page, kept scrolling because nothing
 * said the reading had ended, and took a drill that was never part of tonight.
 * The drill was a good drill. It was not this step, and the evening has its
 * own rounds two steps further down.
 *
 * So inside a module the page is the ending and the words that wear it, and
 * the one way on is the frame's own button at the foot of the screen. Nothing
 * here is deleted for anybody else: opened from the reference, from a card or
 * from a search, this page is exactly what it was.
 */
export default async function CasePage({
  params, searchParams,
}: {
  params: Promise<{ caseKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { caseKey } = await params;
  const query = await searchParams;
  const inModule = focusFrom(query) !== null;
  // The words on the page are the module's own when it is opened from a step.
  const scope = moduleScopeFrom(query);
  const ref = caseReference(caseKey.toUpperCase());
  if (!ref) notFound();

  const ownerId = await requireUserId();
  const [examples, locale] = await Promise.all([
    caseExamples(ownerId, ref.key, 6, scope?.lemmas),
    localeFor(ownerId),
  ]);
  const t = (english: string) => tr(locale, english);

  const all = allCaseReferences();
  const index = all.findIndex((c) => c.key === ref.key);
  const previous = index > 0 ? all[index - 1] : undefined;
  const next = index < all.length - 1 ? all[index + 1] : undefined;

  const withSentence = examples.filter((e) => e.sentence).slice(0, SENTENCES);
  const canTranslate = resolveProvider() !== null;
  const pinned = await pinnedExamples("case", ref.key);

  return (
    <Page
      eyebrow={
        // As written. `label-xs` uppercases, and an ending is a piece of
        // Estonian rather than a label: "-SSE" is not the ending. This is the
        // same rule `Chip`'s `caseSensitive` exists for.
        <span lang="et" style={{ textTransform: "none" }}>{endingOf(ref)}</span>
      }
      title={asTitle(t(ref.plain))}
      lead={t(ref.summary)}
      actions={inModule ? undefined : (
        <Link
          href="/grammar"
          className="press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink-2)" }}
        >
          <ArrowLeft size={14} aria-hidden /> {t("All endings")}
        </Link>
      )}
    >
      <Stack>
        {/*
          The ending is the answer to what a learner came here for, so it is
          the one thing drawn large, lit, beside the name a class uses and the
          question the case answers.
        */}
        <Card tone="night">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
            <div className="min-w-0">
              <p className="label-xs" style={{ color: "var(--cta)" }}>{t("The ending")}</p>
              {ref.spec.principal ? (
                <p className="font-display mt-2 text-3xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
                  {t("None. This one you learn by heart.")}
                </p>
              ) : (
                <p className="mt-1 flex items-baseline gap-3">
                  <FitText
                    text={`-${ref.spec.suffix}`}
                    lang="et"
                    className="font-display font-bold leading-none tracking-tight [--fit-max:var(--text-7xl)] md:[--fit-max:var(--text-8xl)]"
                    style={{ color: "var(--cta)" }}
                  />
                  <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("on the omastav")}</span>
                </p>
              )}
            </div>
            <dl className="grid min-w-0 flex-[1_1_18rem] gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Called")}</dt>
                <dd lang="et" className="font-display mt-1 text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {ref.spec.et}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Answers")}</dt>
                <dd lang="et" className="font-display mt-1 text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {ref.spec.question}
                </dd>
                {/* And what that is asking. The question is the name a class uses
                    and it is opaque to somebody who has not met it, which is the
                    whole reason the Latin name used to be the only English
                    anywhere near a case. See `lib/estonian/cases.ts`. */}
                <dd className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
                  {caseQuestionReading(ref.spec, locale)}
                </dd>
              </div>
            </dl>
          </div>
          {ref.englishHook && (
            <p className="mt-6 border-t pt-4 text-base" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-2)" }}>
              <span className="label-xs mr-2" style={{ color: "var(--cta)" }}>{t("In English")}</span>
              {t(ref.englishHook)}
            </p>
          )}
        </Card>

        <section>
          <SectionTitle>{t("Where it turns up")}</SectionTitle>
          <Card>
            <ul className="flex flex-col gap-2.5">
              {ref.uses.map((use) => (
                <li key={use} className="flex items-start gap-2.5 text-base" style={{ color: "var(--ink-2)" }}>
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  {/* A div rather than a span, because what goes under the use
                      is a list, and a list inside phrasing content is markup no
                      browser has to parse the way it was written. */}
                  <div className="min-w-0 flex-1">
                    {t(use)}
                    <PointExamples examples={pinned.get(use)} canTranslate={canTranslate} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <SectionTitle>{t("Watch out")}</SectionTitle>
          <Card tone="butter">
            <div className="flex items-start gap-3">
              <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--butter-ink)" }} />
              <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {t(ref.watchOut)}
              </p>
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle hint={examples.some((e) => e.inDeck) ? t("words from your deck first") : t("from the dictionary")}>
            {t("On real words")}
          </SectionTitle>
          {examples.length === 0 ? (
            <Empty
              title={t("No words to show it with yet")}
              body={t("Every example here comes from the dictionary. Look up a noun and this will fill in.")}
              action={<ButtonLink href="/dictionary" variant="primary">{t("Open the dictionary")}</ButtonLink>}
            />
          ) : (
            <div
              className="overflow-x-auto rounded-[var(--r-lg)] border"
              style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
            >
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr>
                    {/*
                      The stem column is headed the way the page heads
                      everything else now. It said "Genitive", which is the one
                      English word on a table of Estonian and is a term out of
                      a grammar this language does not use.
                    */}
                    {[t("Word"), "Omastav", endingOf(ref)].map((h, i) => (
                      <th
                        key={h}
                        className="label-xs px-3 py-2.5 text-left"
                        style={{
                          background: "var(--raised)",
                          color: "var(--ink-3)",
                          // The third heading is the ending itself, and an
                          // ending is not a label to be uppercased.
                          textTransform: i === 2 ? "none" : undefined,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {examples.map((example) => (
                    <tr key={example.lexemeId} style={{ borderTop: "1px solid var(--rule-soft)" }}>
                      <td className="px-3 py-2.5">
                        {/*
                          AND THE WORD IS PRINTED RATHER THAN LINKED INSIDE A
                          MODULE. Six words in a table, each a door into the
                          dictionary, is six ways out of a two-minute reading,
                          and the learner who takes one lands on a screen with
                          no way back to the evening. The word itself is what
                          the row is for and it is still here; what is gone is
                          the door. One drawing of that, next door, because the
                          third instance of it was found by CI rather than by
                          reading: components/course/WordLink.tsx.
                        */}
                        <WordLink lemma={example.lemma} linkClass="hover:underline">
                          <span lang="et" className="text-base" style={{ color: "var(--ink)" }}>
                            {example.lemma}
                          </span>
                        </WordLink>
                        <span className="block text-xs" style={{ color: "var(--ink-3)" }}>
                          {example.translation}
                        </span>
                      </td>
                      <td lang="et" className="px-3 py-2.5" style={{ color: "var(--ink-3)" }}>
                        {example.genitive ?? NO_VALUE}
                      </td>
                      <td className="px-3 py-2.5">
                        {/* Both illatives where the word has both: one answer
                            to one question, and a table that prints either
                            alone has chosen which word to be wrong about. The
                            second is set in the quieter ink because it is the
                            regular ending rather than the form the dictionary
                            recorded, which is the same distinction the chip
                            beside it makes. */}
                        <span className="inline-flex items-center gap-1.5">
                          <span lang="et" className="text-base font-semibold" style={{ color: "var(--accent-deep)" }}>
                            {example.form}
                          </span>
                          {example.alsoRight && (
                            <span lang="et" className="text-base" style={{ color: "var(--ink-3)" }}>
                              / {example.alsoRight}
                            </span>
                          )}
                          <Speak text={example.form} label={fill(t("Hear \"{sentence}\""), { sentence: example.form })} size={13} />
                        </span>
                        {/* Where the form came from, under it rather than in a
                            column of its own: a column of six identical chips
                            was the loudest thing on the table and said one
                            fact six times. */}
                        <span
                          className="block text-xs"
                          title={t(ORIGIN_LABEL[example.origin].title)}
                          style={{ color: example.origin === "DERIVED" ? "var(--ink-3)" : "var(--sky-ink)" }}
                        >
                          {t(ORIGIN_LABEL[example.origin].label)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* The table asks back: which of these words is this one, with the
            ending on. The stem is the question, and the stem is what the page
            is about. Nothing is scored; see components/course/TryIt.tsx. */}
        {examples.length > 0 && (
          <TryIt asks={caseAsks(examples, ref.spec.et, ref.spec.suffix)} />
        )}

        {withSentence.length > 0 && (
          <section>
            <SectionTitle>{t("In a sentence")}</SectionTitle>
            <ul className="flex flex-col gap-2">
              {withSentence.map((example) => (
                <li key={`${example.lexemeId}-sentence`}>
                  <Card>
                    {/*
                      The sentence and what it says, through the one drawing
                      every other screen gives an attested line. It used to be
                      `{sentence.en && ...}`, and Ekilex records no English
                      against a usage on a reader key, so the page that exists
                      to show a case doing its job showed fourteen sentences of
                      Estonian with nothing under any of them.
                    */}
                    <EstonianSentence
                      et={example.sentence!.et}
                      en={example.sentence!.en}
                      form={example.sentenceForm ?? example.form}
                      lexemeId={example.lexemeId}
                      canTranslate={canTranslate}
                      className="min-w-0 flex-1 text-base leading-snug"
                    />
                    <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                      {fillNodes(t("Here {form} is the {case} of {lemma}."), {
                        form: <span lang="et" style={{ color: "var(--accent-deep)" }}>{example.sentenceForm ?? example.form}</span>,
                        case: <span lang="et">{ref.spec.et}</span>,
                        lemma: <span lang="et">{example.lemma}</span>,
                      })}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The drill and the three ways off this page, which a module step may
            not carry: see the header. */}
        {!inModule && (
          <>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/review/write">
                <PenLine size={15} aria-hidden /> {t("Write a sentence with it")}
              </ButtonLink>
              {/* Writing a sentence in a case is the hardest thing you can do with
                  one, so it belongs on the page that just explained it rather than
                  on a menu that cannot say which case you are stuck on. */}
              <ButtonLink href="/dictionary">
                <BookOpen size={15} aria-hidden /> {t("Look a word up")}
              </ButtonLink>
              <ButtonLink href="/tutor">
                <MessageCircleQuestion size={15} aria-hidden /> {t("Ask Anu about it")}
              </ButtonLink>
              <ButtonLink href={`/review?case=${ref.key}`} variant="primary">
                <Target size={15} aria-hidden /> {t("Drill it")}
              </ButtonLink>
            </div>

            <Note tone="neutral">
              {t("The drill asks about words in your deck that take this ending. If it comes up empty, add some nouns from the course first.")}
            </Note>
          </>
        )}

        {/*
          The reference is prose we wrote about a language we do not speak
          natively, next to forms the dictionary supplied. Both can be wrong,
          and the reader is frequently in a class with somebody who will tell
          them so that afternoon.
        */}
        <div className="flex flex-wrap items-center gap-3 border-t pt-5" style={{ borderColor: "var(--rule-soft)" }}>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            {t("Doesn't match what your teacher says?")}
          </p>
          <SuggestFix
            category="WRONG_CONTENT"
            trigger={`The grammar reference for ${ref.spec.et}`}
            label={t("Tell us what's wrong")}
          />
        </div>

        {/* And the ending after this one, which is the course's business
            tonight rather than the reader's. */}
        {!inModule && (
        <nav
          aria-label={t("Endings")}
          className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"
          style={{ borderColor: "var(--rule-soft)" }}
        >
          {previous ? (
            <Link
              href={`/grammar/${previous.key.toLowerCase()}`}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "var(--ink-2)" }}
            >
              <ArrowLeft size={14} aria-hidden /> {endingOf(previous)}
              <span style={{ color: "var(--ink-3)" }}>{t(previous.plain)}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link
              href={`/grammar/${next.key.toLowerCase()}`}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "var(--ink-2)" }}
            >
              {endingOf(next)} <span style={{ color: "var(--ink-3)" }}>{t(next.plain)}</span>
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </nav>
        )}
        {inModule && <ReadingEnd />}
      </Stack>
    </Page>
  );
}
