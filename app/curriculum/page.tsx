import type { ReactNode } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ENGLISH_AND_ESTONIAN, Legal, P, S } from "@/components/Legal";
import { SYLLABUS } from "@/lib/collections/syllabus";
import { EXAM_PARTS, alignCourse, lessonLevels, outlineLessons, type ExamPart, type LevelAlignment, type PartOutline } from "@/lib/curriculum/align";
import { PROGRAMMES } from "@/lib/course";
import { courseChecks } from "@/lib/course/checks";
import { LESSONS, LESSON_PARTS, lessonLabel, type LessonSpec, type PartOfLessons } from "@/lib/course/lessons";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { publicPageTitle, resolvePublicPage, type PublicSearch } from "@/lib/progress/publicLocale";
import { fill, tr, type PublicLocale } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { publicCard } from "@/lib/copy/publicCards";
import { sceneTesting } from "@/lib/scenes/catalogue";

/*
  In English and Estonian (D16 in docs/44-sixth-batch.md): a reviewer at the
  Institute or a ministry reads what the course covers in Estonian. Not yet in
  Russian or Ukrainian (docs/38-third-batch.md, D12), so it offers neither.
*/
export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicPageTitle(searchParams, "What the course covers", undefined, publicCard("/curriculum"), ENGLISH_AND_ESTONIAN);
}

/*
  The footer under every public page asks the database whether /impact has
  anything to say yet, so a page baked at build time would answer for the build
  machine. The course itself is the lessons and the syllabus in the repository.
*/
export const dynamic = "force-dynamic";

const PART_NAME = new Map(EXAM_PARTS.map((p) => [p.part, p]));
/** An exam part by the name the reader's language gives it: the state's own Estonian name, or the English. */
const partName = (part: ExamPart, locale: PublicLocale) => (locale === "et" ? PART_NAME.get(part)!.et : PART_NAME.get(part)!.en);
const named = (parts: readonly ExamPart[], locale: PublicLocale) => parts.map((p) => partName(p, locale)).join(", ");
/** A conversation's title in the reader's own quotation marks: „…“ in Estonian, “…” in English. */
const quoted = (locale: PublicLocale, title: ReactNode) => (locale === "et" ? <>„{title}“</> : <>“{title}”</>);

/**
 * WHAT THE COURSE TEACHES AT EACH LEVEL, AND WHAT IT PREPARES SOMEBODY FOR.
 *
 * Generated from the repository rather than typed. A1 is the lessons: each
 * part, its lessons, the role-play it ends on and the check that closes it,
 * off `LESSONS`, `LESSON_PARTS` and the course's own checks. The levels above
 * are units: their "can do" sentences are the syllabus, the exam parts are
 * `lib/curriculum/align.ts`, and the conversation is the scene that tests the
 * unit. A teacher or a reviewer reads it to see where the course has nothing,
 * so the gaps are printed as plainly as the rest.
 */
export default async function CurriculumPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicPage(searchParams, ENGLISH_AND_ESTONIAN);
  const t = (english: string) => tr(locale, english);
  const taught = lessonLevels(LESSONS);
  const levels = alignCourse(SYLLABUS.filter((u) => !taught.has(u.level)), sceneTesting);
  const checks = courseChecks(PROGRAMMES);
  const lessonParts = outlineLessons(LESSONS, LESSON_PARTS, checks, sceneForLesson);
  return (
    <Legal title={t("What the course covers")} updated="24 October 2026" locale={locale} explicit={explicit} path="/curriculum" drawnIn={ENGLISH_AND_ESTONIAN}>
      <P>
        {fill(t("The whole course, by level. A1 is taught as {lessons} lessons in {parts} parts, and the levels above as units until each of them becomes lessons too."), { lessons: LESSONS.length, parts: LESSON_PARTS.length })}
      </P>
      <P>
        {t("For every lesson, what a learner can do afterwards. For every unit, what it says a learner can do, which part of the Estonian language examination it prepares for, and the conversation that tests it where there is one. The levels are the Council of Europe’s CEFR scale. The “can do” sentences are this course’s own, and this page does not claim to follow any official curriculum document.")}
      </P>
      {/*
        The course describes its lessons and units in English, in the
        repository, and that is the text a reader here gets: translating 61
        lessons and every unit into Estonian is a second copy of the course
        that would drift. Each such line is marked English, so a screen reader
        reads it in English, and this paragraph says so first.
      */}
      {locale !== "en" && <P>{t("The lessons and units below describe themselves in English, as the course itself is written. The headings and everything around them are in this page’s language.")}</P>}
      <P>
        {t("The state examines A2, B1, B2 and C1, each in four parts: writing, listening, reading and speaking. There is no A1 examination, so the A1 lessons prepare for no part of one.")}{" "}
        <Link href={localeHref("/state-exam", locale, explicit)} className="underline underline-offset-2">{t("What each part sets is on the page about the examination.")}</Link>{" "}
        {t("Under each level from A2, a part no unit is aimed at is named as a gap.")}
      </P>
      {lessonParts.length > 0 && (
        <S id="a1" title={fill(t("A1, {lessons} lessons in {parts} parts"), { lessons: LESSONS.length, parts: LESSON_PARTS.length })}>
          <P>
            {t("Each lesson is one evening: a conversation to listen to, the words, how it works, practice, saying it, and a review. Some parts end on a role-play with a live conversation, and every part ends in a check of what its lessons taught. Moving on from a part means passing its check, and the last check covers the whole of A1.")}
          </P>
          {lessonParts.map((outline) => <LessonPart key={outline.part.id} outline={outline} locale={locale} />)}
        </S>
      )}
      {levels.map((level) => <Level key={level.level} level={level} locale={locale} />)}
    </Legal>
  );
}

/** What the course says about itself, in English: marked so on a page in another language. */
const courseLang = (locale: PublicLocale) => (locale === "en" ? undefined : "en");

function LessonPart({ outline, locale }: { outline: PartOutline<LessonSpec, PartOfLessons>; locale: PublicLocale }) {
  const { part, lessons, roleplays, check } = outline;
  const t = (english: string) => tr(locale, english);
  return (
    <div className="flex flex-col gap-3" data-curriculum-part={part.id}>
      <h3 className="font-semibold" lang={courseLang(locale)} style={{ color: "var(--ink)" }}>{part.title}</h3>
      <p className="text-sm" lang={courseLang(locale)} style={{ color: "var(--ink-2)" }}>{part.about}</p>
      <ol className="flex flex-col gap-3" data-curriculum-lessons={part.id}>
        {lessons.map((lesson) => (
          <li key={lesson.id} data-lesson={lesson.id} className="rounded-[var(--r)] border p-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>
              {fill(t("Lesson {label}:"), { label: lessonLabel(lesson) })} <span lang={courseLang(locale)}>{lesson.title}</span>
            </p>
            <p className="mt-1 text-sm" lang={courseLang(locale)} style={{ color: "var(--ink-2)" }}>{lesson.goal}</p>
          </li>
        ))}
      </ol>
      {roleplays.map(({ lesson, scene }) => (
        <p key={lesson.id} className="text-sm" style={{ color: "var(--ink-2)" }}>
          {scene
            ? <>{fill(t("Lesson {label} ends on a role-play, played live as the conversation"), { label: lessonLabel(lesson) })} {quoted(locale, <span lang={courseLang(locale)}>{scene.title}</span>)}.</>
            : fill(t("Lesson {label} ends on a role-play."), { label: lessonLabel(lesson) })}
        </p>
      ))}
      {check && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {check.final
            ? fill(t("The part closes with the check on the whole of A1: {questions} questions on all {lessons} lessons, passed to move on to A2."), { questions: check.questions, lessons: check.lessons })
            : fill(t("The part closes with a check of {questions} questions on its {lessons} lessons, passed to move on to the next part."), { questions: check.questions, lessons: check.lessons })}
        </p>
      )}
    </div>
  );
}

function Level({ level, locale }: { level: LevelAlignment<(typeof SYLLABUS)[number]>; locale: PublicLocale }) {
  const t = (english: string) => tr(locale, english);
  // The English sentence names the parts in lower case after "aimed at"; the
  // Estonian names are lower case already.
  const gapParts = locale === "en" ? named(level.gaps, locale).toLowerCase() : named(level.gaps, locale);
  return (
    <S id={level.level.toLowerCase()} title={fill(t("{level}, {units} units"), { level: level.level, units: level.units.length })}>
      {level.examined ? (
        <P>
          {level.gaps.length === 0
            ? fill(t("Every part of the {level} examination has at least one unit aimed at it."), { level: level.level })
            : fill(t("No unit at {level} is aimed at {parts}, so that part is a gap."), { level: level.level, parts: gapParts })}
          {" "}
          {level.byPart.map(({ part, units }) => `${partName(part, locale)}: ${units.length}`).join(", ")}.
        </P>
      ) : (
        <P>{fill(t("The state sets no {level} examination, so these units prepare for no part of one."), { level: level.level })}</P>
      )}
      <ul className="flex flex-col gap-3" data-curriculum-level={level.level}>
        {level.units.map(({ unit, preparation, scene }) => (
          <li key={unit.id} className="rounded-[var(--r)] border p-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
            <p className="font-semibold" lang="et" style={{ color: "var(--ink)" }}>{unit.title}</p>
            <p className="text-sm" lang={courseLang(locale)} style={{ color: "var(--ink-3)" }}>{unit.subtitle}</p>
            <p className="mt-1 text-sm" lang={courseLang(locale)} style={{ color: "var(--ink-2)" }}>{unit.canDo}</p>
            {preparation && (
              <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                <span className="font-semibold" style={{ color: "var(--ink)" }}>
                  {fill(t("Prepares for {parts}."), { parts: locale === "en" ? named(preparation.parts, locale).toLowerCase() : named(preparation.parts, locale) })}
                </span>{" "}
                <span lang={courseLang(locale)}>{preparation.why}</span>
              </p>
            )}
            {scene && (
              <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                {t("Tested by the conversation")} {quoted(locale, <span lang={courseLang(locale)}>{scene.title}</span>)}.
              </p>
            )}
          </li>
        ))}
      </ul>
    </S>
  );
}
