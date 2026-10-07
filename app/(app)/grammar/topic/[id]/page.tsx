import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ReadingEnd } from "@/components/course/ReadingEnd";
import { questionReading } from "@/lib/estonian/cases";
import { localeFor } from "@/lib/progress/locale";
import { countOf, fill, tr } from "@/lib/copy/locale";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, TriangleAlert } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { TOPIC_NOTES, grammarTopic } from "@/lib/estonian/grammar";
import { grammarTerm } from "@/lib/estonian/terms";
import { SYLLABUS } from "@/lib/collections/syllabus";
import { courseLevelFor } from "@/lib/progress/level";
import { uiText, uiWantsEnglish } from "@/lib/copy/uiLanguage";
import { Card, Chip, Note, Page, SectionTitle, Stack } from "@/components/ui";
import { DrillLink } from "@/components/DrillLink";
import { PointExamples } from "@/components/grammar/PointExamples";
import { VerbTable } from "./VerbTable";
import { resolveProvider } from "@/lib/tutor/provider";
import { pinnedExamples } from "@/lib/progress/grammarExamples";
import { verbExamples } from "@/lib/progress/verbExamples";
import { focusFrom } from "@/lib/course";
import { moduleScopeFrom } from "@/lib/course/scope";
import { verbAsks } from "@/lib/course/tryIt";
import { TryIt } from "@/components/course/TryIt";
import { FitText } from "@/components/FitText";

/**
 * The grammar topics with a drill of their own.
 *
 * Two, and both are things you cannot learn from a page about them. Rektsioon
 * has to be met verb by verb, because `aitan sind` and `helistan sulle` look
 * identical in English and only the drill tells them apart. Quantitative
 * gradation is a length distinction Estonian spelling only half records, so
 * `maja` against `majja` is a question about what you can hear rather than what
 * you can read. Both drills used to sit on the practice menu, which is the one
 * screen that cannot tell you either of them is what you are getting wrong.
 */
const TOPIC_DRILL: Record<string, string> = {
  government: "/review/government",
  gradation: "/review/pairs",
  // The same drill from both, since it asks for either table: the present
  // from the first lesson, and the conditional once a learner is at B1.
  "present-tense": "/review/conjugation",
  conditional: "/review/conjugation",
};

/** The topics with a table of real verbs, and which slots that table shows. */
const VERB_TOPICS: Record<string, "present" | "negative" | "conditional" | "imperative" | "past"> = {
  /*
    The page about the past said the third person does something to the stem
    that is learned per verb, and showed no verb. Both persons the dictionary
    stores are on it now, on the module's own verbs inside a module.
  */
  imperfect: "past",
  "present-tense": "present",
  /*
    THE VERB TO BE SHOWS ITSELF. The page said it was the one verb you cannot
    avoid and one of the few irregular ones, and then showed not one form of
    it: a beginner read it on the fourth evening of the course and left
    without `olen`, `oled` or `on`. Its present is stored per person because
    no rule reaches `on`, so the table is the six the harvest holds, marked
    as such, and it is the only verb on this page (`ONLY_VERB`).
  */
  olema: "present",
  negation: "negative",
  conditional: "conditional",
  imperative: "imperative",
};

/** A topic whose table is one verb: the page about `olema` shows `olema`. */
const ONLY_VERB: Record<string, string> = { olema: "olema" };

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return TOPIC_NOTES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = grammarTopic(id);
  const locale = await localeFor(await requireUserId());
  if (!topic) return { title: tr(locale, "Grammar") };
  const term = grammarTerm(id);
  return {
    title: term
      ? fill(tr(locale, "Grammar, {topic}, or {term}"), { topic: tr(locale, topic.title).toLowerCase(), term: term.et })
      : fill(tr(locale, "Grammar, {topic}"), { topic: tr(locale, topic.title) }),
    description: topic.summary,
  };
}

/**
 * One grammar point that is not an ending.
 *
 * IT LEADS WITH WHAT THE POINT IS, in English, for the reason the case pages
 * do. `kaudne kõneviis` is what a class calls it and is not what somebody
 * opening this page is looking for, so the plain description is the heading and
 * the term a course uses sits under it with the name an English reference
 * grammar uses beside it.
 *
 * Deliberately sparser than the case pages, and the difference is honest rather
 * than unfinished. A case page can show the ending on real words, because every
 * form on it is read out of the dictionary with its provenance. There is no
 * equally safe way to illustrate the quotative: picking sentences whose words
 * end in the right letters would be the app asserting a grammatical analysis it
 * has not verified, which is the same failure as generating a form, wearing a
 * different hat.
 *
 * So this page explains in English and then hands over to the units that teach
 * the point, where the examples are attested and in context.
 *
 * AND READ FROM TONIGHT'S MODULE IT HANDS OVER TO NOTHING AT ALL.
 *
 * The module's second step is "read the point behind it", and this is the page
 * it opens. It was reported from exactly here: the learner read it, kept
 * scrolling because nothing said the reading had ended, and at the foot of it
 * met "Drill it" and took a drill that was never part of tonight. Above that
 * sit three units, each with a lesson to take, and above those a way back to
 * the whole reference. Four doors out of a two-minute step.
 *
 * Inside a module this is the point and the verbs that show it, and the one
 * way on is the frame's own button at the foot of the screen. The evening has
 * its own rounds, two steps further down, on tonight's own words. Nothing is
 * deleted for anybody else: opened from the reference or from a card, this
 * page is exactly what it was.
 */
export default async function TopicPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const inModule = focusFrom(query) !== null;
  // The verbs on the page are the module's own when it is opened from a step.
  const scope = moduleScopeFrom(query);
  const topic = grammarTopic(id);
  if (!topic) notFound();

  const ownerId = await requireUserId();
  const [placement, locale] = await Promise.all([courseLevelFor(ownerId), localeFor(ownerId)]);
  const t = (english: string) => tr(locale, english);

  const term = grammarTerm(id);

  const units = SYLLABUS.filter((u) => u.grammar.includes(id));

  /*
    THE FOUR POINTS THAT CAN BE SHOWN ON REAL VERBS.

    The header above says a topic page is sparser than a case page because
    there is no safe way to illustrate most of these on real words. For the
    present tense, the negative, the conditional and the singular imperative
    there is, and it is the case page's own way: every form is either what
    Ekilex recorded or the regular ending on a stored first person that
    `scripts/audit-verbs.ts` checked against Ekilex for every verb in the
    dictionary. Each form says which. The other topics keep to English.
  */
  const pinned = await pinnedExamples("topic", id);
  const canTranslate = resolveProvider() !== null;

  const shown = VERB_TOPICS[id];
  const only = ONLY_VERB[id];
  const verbs = shown
    ? await verbExamples(ownerId, only ? 1 : 4, only ? [only] : scope?.lemmas)
    : [];

  const table = shown && verbs.length > 0 && (
    <section>
      <SectionTitle hint={only ? t("all six, straight from the dictionary") : verbs.some((v) => v.inDeck) ? t("verbs from your deck first") : t("from the dictionary")}>
        {only ? t("The six persons") : t("On real verbs")}
      </SectionTitle>
      <VerbTable verbs={verbs} show={shown} locale={locale} />
    </section>
  );
  /* The taps sit under the table they ask about, wherever the table is. */
  const tryIt = shown && verbs.length > 0 && <TryIt asks={verbAsks(verbs, shown)} />;

  return (
    <Page
      eyebrow={t("Reference")}
      title={t(topic.title)}
      lead={t(topic.summary)}
      actions={inModule ? undefined : (
        <Link href="/grammar" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-deep)" }}>
          <ArrowLeft size={14} aria-hidden /> {t("All grammar")}
        </Link>
      )}
    >
      <Stack>
        {(term || topic.marker) && (
          <Card tone="night">
            <dl className="grid gap-6 lg:grid-cols-3">
              {topic.marker && (
                <div className="min-w-0">
                  <dt className="label-xs" style={{ color: "var(--cta)" }}>
                    {t("The ending that carries it")}
                  </dt>
                  <FitText as="dd" text={topic.marker} lang="et" className="font-display mt-1 font-bold leading-tight [--fit-max:var(--text-2xl)] xl:[--fit-max:var(--text-3xl)]" style={{ color: "var(--ink)" }} />
                </div>
              )}
              {term && (
                <div className="min-w-0">
                  <dt className="label-xs" style={{ color: "var(--cta)" }}>{t("Called")}</dt>
                  <FitText as="dd" text={term.et} lang="et" className="font-display mt-1 font-bold leading-tight [--fit-max:var(--text-2xl)] xl:[--fit-max:var(--text-3xl)]" style={{ color: "var(--ink)" }} />
                  {term.alsoCalled && (
                    <dd className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
                      {fill(t("{name} in an English grammar book"), { name: t(term.alsoCalled) })}
                    </dd>
                  )}
                </div>
              )}
              {term?.question && (
                <div className="min-w-0">
                  <dt className="label-xs" style={{ color: "var(--cta)" }}>
                    {t("Answers")}
                  </dt>
                  <FitText as="dd" text={term.question} lang="et" className="font-display mt-1 font-bold leading-tight [--fit-max:var(--text-2xl)] xl:[--fit-max:var(--text-3xl)]" style={{ color: "var(--ink)" }} />
                  {/* And what it asks, where the table has a reading for it.
                      A point taught by a question nobody has glossed is a
                      point taught in a language the reader came here to
                      learn. See `lib/estonian/cases.ts`. */}
                  {questionReading(term.question, locale) && (
                    <dd className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
                      {questionReading(term.question, locale)}
                    </dd>
                  )}
                </div>
              )}
            </dl>
          </Card>
        )}

        {/*
          A VERB THAT IS LEARNED AS SIX WORDS LEADS WITH THE SIX. The page about
          `olema` is read on the third evening of the course, titled "I am, you
          are, this is", and it opened on the construction for "have" and kept
          the six forms for the foot of the page, so a beginner met `Mul on`
          three screens before `olen`. Where a page's table is one verb that no
          rule reaches, the table is the lesson and the points are what it is
          used for; everywhere else the rule comes first and the table shows it.
        */}
        {only && table}
        {only && tryIt}

        <section>
          <SectionTitle>{t("What it is for")}</SectionTitle>
          <ul className="mt-2 flex flex-col gap-2">
            {topic.points.map((point) => (
              <li
                key={point}
                className="rounded-[var(--r-lg)] border p-4 text-base leading-relaxed md:p-5"
                style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)", color: "var(--ink)" }}
              >
                {t(point)}
                {/* And somebody saying it. See `components/grammar/PointExamples.tsx`
                    for why the reference may name a sentence at all. */}
                <PointExamples examples={pinned.get(point)} canTranslate={canTranslate} />
              </li>
            ))}
          </ul>
        </section>

        <Note tone="hard">
          <span className="flex items-start gap-2">
            <TriangleAlert size={17} aria-hidden className="mt-0.5 shrink-0" />
            <span>{t(topic.watchOut)}</span>
          </span>
        </Note>

        {!only && table}

        {/*
          THE TABLE ASKS BACK. Three taps on the forms just shown, nothing
          scored: the reading being used rather than tested, which is the
          difference between a page somebody read and a form somebody has.
          Built on the server off the same rows the table drew, so the
          question and the table cannot disagree about a form.
        */}
        {!only && tryIt}

        {/* The units that teach it and the drill that asks about it, which a
            module step may not carry: see the header. */}
        {!inModule && (
        <section>
          <SectionTitle hint={countOf(locale, units.length, "unit")}>
            {t("Where the course teaches it")}
          </SectionTitle>
          {units.length === 0 ? (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
              {t("No unit teaches this yet, so for now it's just here for reference.")}
            </p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {units.map((unit) => (
                <li
                  key={unit.id}
                  className="rounded-[var(--r-sm)] border p-3"
                  style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
                >
                  <span className="flex flex-wrap items-baseline gap-2">
                    <Link
                      href={`/learn/${unit.id}`}
                      lang={uiWantsEnglish(placement) ? undefined : "et"}
                      className="text-md font-bold hover:underline"
                      style={{ color: "var(--ink)" }}
                    >
                      {uiText(placement, unit.title, t(unit.subtitle))}
                    </Link>
                    <Chip tone="sky">{unit.level}</Chip>
                  </span>
                  <span className="mt-1 block text-sm" style={{ color: "var(--ink-2)" }}>
                    {t(unit.canDo)}
                  </span>
                  <Link
                    href={`/learn/${unit.id}/lesson`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm underline"
                    style={{ color: "var(--accent-deep)" }}
                  >
                    <BookOpen size={14} aria-hidden /> {t("Take the lesson")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}

        {!inModule && TOPIC_DRILL[id] && (
          <section>
            <SectionTitle hint={t("from your own deck")}>{t("Drill it")}</SectionTitle>
            <DrillLink href={TOPIC_DRILL[id]!} />
          </section>
        )}
        {inModule && <ReadingEnd />}
      </Stack>
    </Page>
  );
}
