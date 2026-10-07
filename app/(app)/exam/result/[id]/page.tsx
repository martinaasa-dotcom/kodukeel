import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { notFound } from "next/navigation";
import {
  ArrowRight, BadgeCheck, Check, FileWarning, Info, Repeat, TrendingDown, TrendingUp, Trophy,
  TriangleAlert, X,
} from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { attemptById, bestAt, previousAttempt } from "@/lib/progress/exam";
import { buildReport } from "@/lib/exam/report";
import { allMarks } from "@/lib/exam/score";
import { PASS_PCT, specFor } from "@/lib/exam/spec";
import { SKILL_ET, SKILL_LABEL } from "@/lib/exam/types";
import { NO_VALUE } from "@/lib/copy/values";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { DATE_AND_TIME, DateText } from "@/components/DateText";
import { ButtonLink } from "@/components/Button";
import { Card, Chip, Meter, Note, Page, Ring, SectionTitle } from "@/components/ui";
import { SuggestFix } from "@/components/SuggestFix";
import { AnuReading } from "./AnuReading";
import { Explain } from "@/components/Explain";
import type { ItemMark } from "@/lib/exam/score";
import { SelfCheck } from "./SelfCheck";
import { SELF_CHECK, isWrittenKind } from "@/lib/exam/selfCheck";
import { writtenSampleFor } from "@/lib/exam/official";
import { VERDICT_CLASS } from "@/lib/ux/verdict";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr, type Locale } from "@/lib/copy/locale";
import { sayIn } from "@/lib/copy/said";
import { fillNodes } from "@/components/fillNodes";

export async function generateMetadata() {
  return titleFor("Exam result");
}

export const dynamic = "force-dynamic";

/**
 * The result, and the half of it that is worth having.
 *
 * A real slip gives four percentages and nothing else, which leaves a candidate
 * who failed on 57 percent guessing which part to work on. This says where every
 * mark went, names the task that did the damage, and lists every question that
 * was wrong with the answer beside it, because a mock exam whose answers you
 * never see is a test rather than a lesson.
 */
export default async function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await requireUserId();
  const [attempt, locale] = await Promise.all([attemptById(ownerId, id), localeFor(ownerId)]);
  if (!attempt) notFound();
  const t = (english: string, context?: string) => tr(locale, english, context);

  const result = attempt.parsed;
  if (!result) {
    return (
      <Page title={t("We can't open this result any more")} eyebrow={t("Mock examination")}>
        <Note tone="again">
          {fill(t(attempt.passed
            ? "It was saved in an older format that this version can't show in full. Your score still stands: {pct} percent, which counted as a pass."
            : "It was saved in an older format that this version can't show in full. Your score still stands: {pct} percent, which counted as a fail."), { pct: attempt.pct })}
        </Note>
      </Page>
    );
  }

  const report = buildReport(result);
  const spec = specFor(result.level);
  const sample = writtenSampleFor(result.level);
  /*
    Not off `report.missed`: a text that scored well is not in that list, and it
    is the answer worth reading back whether or not it lost marks. Both of them
    now, because the writing part sets two, and the short message is the one
    people get wrong by treating it as a small essay.
  */
  const written = allMarks(result).filter((mark) => typeof mark.raw === "string" && mark.raw);

  /*
    Both strictly earlier than this sitting, so opening an old result compares it
    with the papers before it rather than with ones sat afterwards, and so "your
    best yet" means it beat everything, rather than being trivially true of the
    row it was computed from.
  */
  const [previous, best, clock] = await Promise.all([
    previousAttempt(ownerId, result.level, attempt.finishedAt, result.part ?? null),
    bestAt(ownerId, result.level, attempt.finishedAt, result.part ?? null),
    learnerDayClock(ownerId),
  ]);
  const moved = previous ? result.pct - previous.pct : null;

  return (
    <Page
      eyebrow={
        <>
          {/* One sentence per shape rather than four pieces glued in English
              order, and "sat" kept apart from "passed" in every language. */}
          {fillNodes(t(
            result.number && result.part ? "{level}, paper {n}, {part} only, sat {date}"
              : result.number ? "{level}, paper {n}, sat {date}"
              : result.part ? "{level}, {part} only, sat {date}"
              : "{level}, sat {date}",
          ), {
            level: result.level,
            n: result.number ?? "",
            part: result.part ? t(SKILL_LABEL[result.part]).toLocaleLowerCase(locale) : "",
            date: <DateText iso={attempt.finishedAt.toISOString()} zone={clock.zone} options={DATE_AND_TIME} />,
          })}
        </>
      }
      title={
        result.part
          ? fill(t("{part}: {pct} percent"), { part: t(SKILL_LABEL[result.part]), pct: result.pct })
          : (result.passed ? t("Passed", "exam") : t("Not this time"))
      }
      lead={sayIn(locale, report.said.headline)}
      actions={
        <ButtonLink
          href={result.number ? `/exam/${result.level}/papers` : `/exam/${result.level}`}
          variant="secondary"
        >
          <Repeat size={15} aria-hidden /> {t(result.number ? "The numbered papers" : "Another paper")}
        </ButtonLink>
      }
    >
      <section className="mb-10">
        <Card tone={result.passed ? "sky" : "blush"}>
          <div className="flex flex-wrap items-center gap-6">
            <Ring
              pct={result.pct}
              size={92}
              thickness={8}
              tone={result.passed ? "var(--sky)" : "var(--blush)"}
              label={fill(t("{pct} percent"), { pct: result.pct })}
            >
              <span className="tnum text-2xl font-bold" style={{ color: "var(--ink)" }}>
                {result.pct}%
              </span>
            </Ring>
            <div className="min-w-[16rem] flex-1">
              <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
                {fill(t("{points} of {max} points, {band}"), { points: result.points, max: result.maxPoints, band: t(result.band.label) })}
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {sayIn(locale, report.said.consequence)}
              </p>
              {result.absentParts.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
                  <FileWarning size={14} aria-hidden />
                  <span>
                    {fillNodes(t(result.absentParts.length === 1
                      ? "{parts} couldn't be set at all, so it's left out of your total rather than counted as zero."
                      : "{parts} couldn't be set at all, so they're left out of your total rather than counted as zero."), {
                      parts: <span lang="et">{result.absentParts.map((skill) => SKILL_ET[skill]).join(` ${t("and")} `)}</span>,
                    })}
                  </span>
                </p>
              )}
              {result.thin && (
                <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
                  <FileWarning size={14} aria-hidden />
                  {t("The dictionary couldn't fill every task, so this percentage comes from a shorter paper than usual.")}
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

      {(previous || best === null || result.pct > best) && (
        <section className="mb-10">
          <SectionTitle>{t(previous ? "How it compares with last time" : "Where you start from")}</SectionTitle>
          <ul className="grid gap-3 md:grid-cols-2">
            {previous && moved !== null && (
              <Card as="li" tone={moved >= 0 ? "sky" : "blush"}>
                <p
                  className="flex items-center gap-2 text-md font-semibold"
                  style={{ color: moved >= 0 ? "var(--sky-ink)" : "var(--blush-ink)" }}
                >
                  {moved >= 0 ? <TrendingUp size={16} aria-hidden /> : <TrendingDown size={16} aria-hidden />}
                  {moved === 0
                    ? fill(t("The same as your last {level}"), { level: result.level })
                    : fill(t(moved > 0 ? "Up {n} points on your last {level}" : "Down {n} points on your last {level}"), { n: Math.abs(moved), level: result.level })}
                </p>
                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: moved >= 0 ? "var(--sky-ink)" : "var(--blush-ink)" }}
                >
                  {fillNodes(t("{before} percent on {date}, {now} today. The questions were different each time, so think of it as two tries at the level, not the same paper twice."), {
                    before: previous.pct,
                    date: <DateText iso={new Date(previous.at).toISOString()} zone={clock.zone} options={DATE_AND_TIME} />,
                    now: result.pct,
                  })}
                </p>
              </Card>
            )}
            {(best === null || result.pct > best) && (
              <Card as="li" tone="accent">
                <p className="flex items-center gap-2 text-md font-semibold" style={{ color: "var(--ink)" }}>
                  <Trophy size={16} aria-hidden />
                  {/* "Your best yet" over a first attempt at one percent is a
                      cheer for a number nobody would cheer, so a first paper is
                      called what it is. */}
                  {fill(t(best === null ? "Your first {level} paper" : "Your best {level} yet"), { level: result.level })}
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {best === null
                    ? fill(t("{pct} percent is the score to beat next time."), { pct: result.pct })
                    : fill(t("Better than anything you've sat at this level. Your old best was {pct} percent."), { pct: best })}
                </p>
              </Card>
            )}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <SectionTitle hint={fill(t("{pct} percent to pass"), { pct: PASS_PCT })}>{t("The four parts")}</SectionTitle>
        <ul className="grid gap-3 lg:grid-cols-2">
          {result.parts.map((part) => (
            <Card as="li" key={part.skill}>
              <div className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="text-md font-semibold" style={{ color: "var(--ink)" }}>
                    {t(part.label)}
                  </span>
                  <span lang="et" className="ml-2 whitespace-nowrap text-sm" style={{ color: "var(--ink-3)" }}>
                    {SKILL_ET[part.skill]}
                  </span>
                </span>
                <span className="tnum shrink-0 text-lg font-bold" style={{ color: "var(--ink)" }}>
                  {part.rawAvailable === 0 ? NO_VALUE : part.points}
                  {part.rawAvailable > 0 && (
                    <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>
                      {" "}{fill(t("of {max}"), { max: part.maxPoints })}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-2">
                <Meter
                  pct={part.pct}
                  label={fill(t("{part} at {pct} percent"), { part: t(part.label), pct: part.pct })}
                  tone={part.pct >= PASS_PCT ? "var(--sky)" : "var(--blush)"}
                />
              </div>
              <ul className="mt-3 grid gap-1">
                {part.tasks.map((task) => (
                  <li key={task.taskId} className="flex items-baseline justify-between gap-3 text-sm">
                    <span style={{ color: "var(--ink-2)" }}>{t(task.title)}</span>
                    <span className="tnum shrink-0" style={{ color: "var(--ink-3)" }}>
                      {task.rawAvailable === 0
                        ? NO_VALUE
                        : fill(t("{n} of {total}"), { n: Math.round(task.raw * 10) / 10, total: task.rawAvailable })}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
      </section>

      <div className="mb-10 grid gap-6 md:grid-cols-2">
        <section>
          <SectionTitle>{t("What went well")}</SectionTitle>
          {report.strengths.length === 0 ? (
            <Note tone="neutral">{t("No part reached three quarters this time. Where the marks went shows what to work on next.")}</Note>
          ) : (
            <ul className="grid gap-3">
              {report.strengths.map((item) => (
                <Card as="li" key={item.id} tone="sky">
                  <p className="flex items-center gap-2 text-md font-semibold" style={{ color: "var(--sky-ink)" }}>
                    <BadgeCheck size={16} aria-hidden /> {sayIn(locale, item.said.title)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--sky-ink)" }}>
                    {sayIn(locale, item.said.detail)}
                  </p>
                </Card>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>{t("Where the marks went")}</SectionTitle>
          {report.gaps.length === 0 ? (
            <Note tone="good">{t("Every part reached three quarters or more. Nothing to fix here.")}</Note>
          ) : (
            <ul className="grid gap-3">
              {report.gaps.map((item) => (
                <Card as="li" key={item.id} tone="blush">
                  <p className="flex items-center gap-2 text-md font-semibold" style={{ color: "var(--blush-ink)" }}>
                    <TriangleAlert size={16} aria-hidden /> {sayIn(locale, item.said.title)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--blush-ink)" }}>
                    {sayIn(locale, item.said.detail)}
                  </p>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
                      style={{ color: "var(--blush-ink)" }}
                    >
                      {t(item.cta ?? "Practice it")} <ArrowRight size={13} aria-hidden />
                    </Link>
                  )}
                </Card>
              ))}
            </ul>
          )}
        </section>
      </div>

      {report.repeatOffenders.length > 0 && (
        <section className="mb-10">
          <SectionTitle hint={t("wrong more than once across the paper")}>{t("Words that kept tripping you up")}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {report.repeatOffenders.map((word) => (
              <li key={word.lexemeId}>
                <Link href={`/dictionary?q=${encodeURIComponent(word.lemma)}`}>
                  <Chip tone="again" caseSensitive>
                    <span lang="et">{word.lemma}</span>
                    <span>{fill(t("{n} times"), { n: word.times })}</span>
                  </Chip>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {written.length > 0 && (
        <section className="mb-10">
          <SectionTitle hint={written.length > 1 ? t("both of them") : undefined}>
            {t("What you wrote")}
          </SectionTitle>
          {/*
            THE ONE PLACE THIS SCORE CAN FLATTER SOMEBODY, SAID OUT LOUD. The
            marks on these two came from length and from the words the task
            named, because those are the only things a machine can settle
            without judging Estonian. An examiner marks the accuracy of the
            prose itself and this app never will, so the mark is a ceiling
            rather than a measurement, and somebody reading a good writing score
            has to know which of the two they are holding.
          */}
          <div className="mb-4">
            <Note tone="neutral">
              <Info size={14} className="mr-1.5 inline" aria-hidden />
              {t("These marks are for length and for using the words you were given. A real examiner also checks that your Estonian is correct, and we can't judge that here. So read this score as the most you could get, not what an examiner would give you. Anu can read either text and tell you what she thinks, but she doesn't mark anything.")}
            </Note>
          </div>
          <ul className="grid gap-4">
            {written.map((mark) => {
              const task = result.parts
                .flatMap((p) => p.tasks)
                .find((t) => t.marks.some((m) => m.itemId === mark.itemId));
              const kind = spec.parts.flatMap((p) => p.tasks).find((t) => t.id === task?.taskId)?.kind;
              return (
                <li key={mark.itemId}>
                  <AnuReading
                    text={mark.raw ?? ""}
                    level={result.level}
                    title={task?.title ? t(task.title) : undefined}
                    marks={fill(t("{n} of {total}"), { n: Math.round(mark.scored * 10) / 10, total: mark.available })}
                  />
                  {isWrittenKind(kind) && <SelfCheck items={SELF_CHECK[kind]} />}
                </li>
              );
            })}
          </ul>
          {/*
            What an examiner actually said about real scripts at this level,
            which is the one view of a text's accuracy this app can point at
            without pretending to hold it. The Board's own PDF, named as such.
          */}
          {sample && (
            <Card className="mt-4">
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {fill(t("How examiners marked real {level} texts"), { level: result.level })}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
                {t("The Board published real candidates’ texts with the examiners’ comments beside them. Reading one next to yours is the closest you'll get to a second opinion here.")}
              </p>
              <a
                href={sample.href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
                style={{ color: "var(--accent-deep)" }}
              >
                {fill(t("Open the {level} samples on harno.ee"), { level: result.level })} <ArrowRight size={14} aria-hidden />
              </a>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>{t("A PDF, in Estonian.")}</p>
            </Card>
          )}
        </section>
      )}

      <section>
        <SectionTitle hint={fill(t("{n} of them"), { n: report.missed.length })}>{t("Everything you got wrong")}</SectionTitle>
        {report.missed.length === 0 ? (
          <Note tone="good">{t("None. You got every question right.")}</Note>
        ) : (
          /*
            BY TASK, WITH THE QUESTION. A flat list of answer chips said "you
            wrote kassi, the answer was kassil" with no sentence to say why,
            forty lines long on a thin attempt, most of them blanks. So each
            task is a group headed by its own title, every wrong answer shows
            the sentence or the word it was asked about, and the blanks fold
            into one line per task that opens on the answers.
          */
          <div className="grid gap-6">
            {result.parts.map((part) => {
              const tasks = part.tasks
                .map((task) => ({
                  task,
                  wrong: task.marks.filter((m) => !m.correct && m.available > 0),
                }))
                .filter(({ wrong }) => wrong.length > 0);
              if (tasks.length === 0) return null;
              return (
                <div key={part.skill}>
                  <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
                    {t(part.label)} <span lang="et">{SKILL_ET[part.skill]}</span>
                  </p>
                  <ul className="grid gap-4">
                    {tasks.map(({ task, wrong }) => {
                      const blank = wrong.filter((m) => m.given === "" && m.note === "Left blank.");
                      const answered = wrong.filter((m) => !blank.includes(m));
                      return (
                        <li key={task.taskId}>
                          <p className="mb-2 text-md font-semibold" style={{ color: "var(--ink)" }}>{t(task.title)}</p>
                          <ul className="grid gap-2">
                            {answered.map((mark) => <WrongAnswer key={mark.itemId} mark={mark} locale={locale} />)}
                          </ul>
                          {blank.length > 0 && (
                            <div className={answered.length > 0 ? "mt-2" : ""}>
                              <Explain label={blank.length === 1 ? t("One left blank, and its answer") : fill(t("{n} left blank, and their answers"), { n: blank.length })}>
                                <ul className="grid gap-1.5">
                                  {blank.map((mark) => (
                                    <li key={mark.itemId} className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                                      {mark.prompt && <span className="mr-2" {...promptLang(mark)}>{mark.prompt}</span>}
                                      <span className="font-semibold" style={{ color: "var(--sky-ink)" }} lang={mark.language === "et" ? "et" : undefined}>
                                        {expectedIn(mark, locale)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </Explain>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        {report.missed.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/*
              Every mark on this paper is a comparison against a form the
              dictionary vouches for, which is what keeps a model out of the
              judgement. It does not make the dictionary right, and a candidate
              who has just been marked down by it is the person most likely to
              have spotted that.
            */}
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              {t("Think we marked a right answer wrong?")}
            </p>
            <SuggestFix
              category="MARKED_WRONG"
              categories={["MARKED_WRONG", "WRONG_CONTENT"]}
              trigger={`A ${result.level} mock paper marked ${report.missed.length} answer(s) wrong.`}
              label={t("Tell us about the marking")}
            />
          </div>
        )}
      </section>

      {/*
        RIGHT, AND STILL WORTH A LINE. The list above reads `report.missed`,
        which is every mark that was wrong, and the marker writes a note on two
        answers that were right: a dictation where a diacritic went, which the
        real specification forgives and which `acceptsSlips` says is reported
        anyway because a learner who never sees it never fixes it, and a word
        order the writer did not choose, which is right Estonian and carries
        the note saying where the writer put the word. Both were computed on
        every paper and drawn on none of it.

        Drawn as a right answer rather than as a near miss: the tick and the
        palette's own `right`, because that is what the mark was, and what they
        wrote beside what the recording has, since on both of these the two
        differ and the difference is the whole of what there is to say.
      */}
      {report.accepted.length > 0 && (
        <section className="mt-8">
          <SectionTitle hint={fill(t("{n} of them"), { n: report.accepted.length })}>{t("Right, with a note")}</SectionTitle>
          <ul className="grid gap-2">
            {report.accepted.map((mark) => {
              const et = mark.language !== "en";
              return (
                <Card as="li" key={mark.itemId} className="!py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`${VERDICT_CLASS.right} inline-flex items-center gap-1.5 rounded-[var(--r-sm)] px-2 py-1 text-md`}
                      lang={et && mark.given ? "et" : undefined}
                    >
                      <Check size={14} aria-label={t("Your answer, and it counted")} />
                      {mark.given || NO_VALUE}
                    </span>
                    <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("the recording has")}</span>
                    <span className="text-md" lang={et ? "et" : undefined} style={{ color: "var(--ink)" }}>
                      {mark.expected}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{t(mark.note)}</p>
                </Card>
              );
            })}
          </ul>
        </section>
      )}

      {/*
        WHAT THIS RESULT IS NOT, ON THE SCREEN WHERE SOMEBODY READS A NUMBER
        ABOUT THEMSELVES.

        "The structure of this paper is real" was the whole of it, and it is
        true and it is the half that raises the stakes: a learner who has just
        spent ninety minutes on something headed "Mock state examination" and
        scored 72 reads that sentence as a prediction. The level check has said
        the other half since it was written, in `ResultPanel`: not a
        certificate, and the exams that count are the state ones. The longer
        paper, which looks far more like the real thing, never did.

        Naming the body is the part worth having. Somebody deciding whether to
        book the real examination needs to know who runs it, and somebody
        seeing a result on a screen needs to know this app has nothing to do
        with them. Both sentences are facts about the paper rather than about
        the learner, so they go under the result rather than beside the score.
      */}
      <p className="mt-8 text-sm" style={{ color: "var(--ink-3)" }}>
        {spec.official
          ? fillNodes(t("The shape of this paper is real. The questions aren't, and neither is the result. It's practice, not a certificate, and Kodukeel has nothing to do with {board}, who run the exams that count."), {
            board: <span lang="et">Haridus- ja Noorteamet</span>,
          })
          : t("Estonia doesn't test at this level, so nothing about this paper is official. It's just for you.")}
        {" "}
        <Link href="/exam" className="underline underline-offset-4">{t("Back to the exam hub")}</Link>
      </p>
    </Page>
  );
}

/** One wrong answer, under the question it answered. */
function WrongAnswer({ mark, locale }: { mark: ItemMark; locale: Locale }) {
  const t = (english: string) => tr(locale, english);
  // Three question shapes answer in English. Tagging those Estonian had a
  // screen reader pronounce "cheese" as an Estonian word.
  const et = mark.language !== "en";
  return (
    <Card as="li" className="!py-3">
      {mark.prompt && (
        <p className="mb-2 text-md leading-relaxed" style={{ color: "var(--ink)" }} {...promptLang(mark)}>
          {mark.prompt}
        </p>
      )}
      {/* The answer and what was written, each in the palette's own word for
          it (lib/ux/verdict.ts), with an icon beside each so a hue is never
          the only thing carrying the difference. */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`${VERDICT_CLASS.right} inline-flex items-center gap-1.5 rounded-[var(--r-sm)] px-2 py-1 text-md`}
          lang={et ? "et" : undefined}
        >
          <Check size={14} aria-label={t("The answer")} />
          {expectedIn(mark, locale)}
        </span>
        <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("you wrote")}</span>
        <span
          /* The same step as the answer beside it: one object said twice. */
          className={`${VERDICT_CLASS.wrong} inline-flex items-center gap-1.5 rounded-[var(--r-sm)] px-2 py-1 text-md`}
          lang={et && mark.given ? "et" : undefined}
        >
          <X size={14} aria-label={t("Your answer")} />
          {givenIn(mark, locale) || NO_VALUE}
        </span>
      </div>
      {mark.note && (
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{noteIn(mark, locale)}</p>
      )}
    </Card>
  );
}

/*
  A written task's lines in the learner's language, off the templates the
  marker kept; a mark stored before it kept them is printed as it was.
*/
function expectedIn(mark: ItemMark, locale: Locale): string {
  return mark.said ? sayIn(locale, mark.said.expected) : mark.expected;
}
function givenIn(mark: ItemMark, locale: Locale): string {
  return mark.said && mark.given ? sayIn(locale, mark.said.given) : mark.given;
}
function noteIn(mark: ItemMark, locale: Locale): string {
  return mark.said ? mark.said.note.map((s) => sayIn(locale, s)).join(" ") : tr(locale, mark.note);
}

/*
  The prompt's language, said. A sentence asked about is Estonian; a written
  task's brief is English, built from the paper's own tables, and nobody has
  translated those yet, so it says that too: `data-untranslated` is what
  `scripts/test-locales.mjs` counts as a known gap rather than a new leftover.
*/
function promptLang(mark: ItemMark): { lang: string; "data-untranslated"?: string } {
  return mark.promptLanguage === "en" ? { lang: "en", "data-untranslated": "exam brief" } : { lang: "et" };
}
