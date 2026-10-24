import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { SYLLABUS } from "@/lib/collections/syllabus";
import { PUBLIC_CARDS } from "@/lib/copy/publicCards";
import { EXAM_PARTS, alignCourse, lessonLevels, outlineLessons, type ExamPart, type LevelAlignment, type PartOutline } from "@/lib/curriculum/align";
import { PROGRAMMES } from "@/lib/course";
import { courseChecks } from "@/lib/course/checks";
import { LESSONS, LESSON_PARTS, lessonLabel, type LessonSpec, type PartOfLessons } from "@/lib/course/lessons";
import { sceneForLesson } from "@/lib/scenes/lessonScenes";
import { shareCard } from "@/lib/progress/publicLocale";
import { sceneTesting } from "@/lib/scenes/catalogue";

// English only (docs/38-third-batch.md, D12), like /pilots, so its own card in English.
export const metadata = { title: "What the course covers", ...shareCard("en", "What the course covers", PUBLIC_CARDS["/curriculum"], "/curriculum") };

/*
  The footer under every public page asks the database whether /impact has
  anything to say yet, so a page baked at build time would answer for the build
  machine. The course itself is the lessons and the syllabus in the repository.
*/
export const dynamic = "force-dynamic";

const PART_NAME = new Map(EXAM_PARTS.map((p) => [p.part, p]));
const named = (parts: readonly ExamPart[]) => parts.map((p) => PART_NAME.get(p)!.en).join(", ");

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
export default function CurriculumPage() {
  const taught = lessonLevels(LESSONS);
  const levels = alignCourse(SYLLABUS.filter((u) => !taught.has(u.level)), sceneTesting);
  const checks = courseChecks(PROGRAMMES);
  const lessonParts = outlineLessons(LESSONS, LESSON_PARTS, checks, sceneForLesson);
  return (
    <Legal title="What the course covers" updated="24 October 2026" path="/curriculum" oneLanguage>
      <P>
        The whole course, by level. A1 is taught as {LESSONS.length} lessons in {LESSON_PARTS.length} parts,
        and the levels above as units until each of them becomes lessons too.
      </P>
      <P>
        For every lesson, what a learner can do afterwards. For every unit, what it says a learner can do,
        which part of the Estonian language examination it prepares for, and the conversation that tests it
        where there is one. The levels are the Council of Europe’s CEFR scale. The “can do” sentences are
        this course’s own, and this page does not claim to follow any official curriculum document.
      </P>
      <P>
        The state examines A2, B1, B2 and C1, each in four parts: writing, listening, reading and speaking.
        There is no A1 examination, so the A1 lessons prepare for no part of one. What each part sets is on{" "}
        <Link href="/state-exam" className="underline underline-offset-2">the page about the examination</Link>.
        Under each level from A2, a part no unit is aimed at is named as a gap.
      </P>
      {lessonParts.length > 0 && (
        <S id="a1" title={`A1, ${LESSONS.length} lessons in ${LESSON_PARTS.length} parts`}>
          <P>
            Each lesson is one evening: a conversation to listen to, the words, how it works, practice,
            saying it, and a review. Some parts end on a role-play with a live conversation, and every part
            ends in a check of what its lessons taught. Moving on from a part means passing its check, and
            the last check covers the whole of A1.
          </P>
          {lessonParts.map((outline) => <LessonPart key={outline.part.id} outline={outline} />)}
        </S>
      )}
      {levels.map((level) => <Level key={level.level} level={level} />)}
    </Legal>
  );
}

function LessonPart({ outline }: { outline: PartOutline<LessonSpec, PartOfLessons> }) {
  const { part, lessons, roleplays, check } = outline;
  return (
    <div className="flex flex-col gap-3" data-curriculum-part={part.id}>
      <h3 className="font-semibold" style={{ color: "var(--ink)" }}>{part.title}</h3>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>{part.about}</p>
      <ol className="flex flex-col gap-3" data-curriculum-lessons={part.id}>
        {lessons.map((lesson) => (
          <li key={lesson.id} data-lesson={lesson.id} className="rounded-[var(--r)] border p-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>
              Lesson {lessonLabel(lesson)}: {lesson.title}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{lesson.goal}</p>
          </li>
        ))}
      </ol>
      {roleplays.map(({ lesson, scene }) => (
        <p key={lesson.id} className="text-sm" style={{ color: "var(--ink-2)" }}>
          Lesson {lessonLabel(lesson)} ends on a role-play
          {scene ? <>, played live as the conversation “{scene.title}”.</> : "."}
        </p>
      ))}
      {check && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {check.final
            ? `The part closes with the check on the whole of A1: ${check.questions} questions on all ${check.lessons} lessons, passed to move on to A2.`
            : `The part closes with a check of ${check.questions} questions on its ${check.lessons} lessons, passed to move on to the next part.`}
        </p>
      )}
    </div>
  );
}

function Level({ level }: { level: LevelAlignment<(typeof SYLLABUS)[number]> }) {
  return (
    <S id={level.level.toLowerCase()} title={`${level.level}, ${level.units.length} units`}>
      {level.examined ? (
        <P>
          {level.gaps.length === 0
            ? `Every part of the ${level.level} examination has at least one unit aimed at it.`
            : `No unit at ${level.level} is aimed at ${named(level.gaps).toLowerCase()}, so that part is a gap.`}
          {" "}
          {level.byPart.map(({ part, units }) => `${PART_NAME.get(part)!.en}: ${units.length}`).join(", ")}.
        </P>
      ) : (
        <P>The state sets no {level.level} examination, so these units prepare for no part of one.</P>
      )}
      <ul className="flex flex-col gap-3" data-curriculum-level={level.level}>
        {level.units.map(({ unit, preparation, scene }) => (
          <li key={unit.id} className="rounded-[var(--r)] border p-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
            <p className="font-semibold" lang="et" style={{ color: "var(--ink)" }}>{unit.title}</p>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>{unit.subtitle}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{unit.canDo}</p>
            {preparation && (
              <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                <span className="font-semibold" style={{ color: "var(--ink)" }}>Prepares for {named(preparation.parts).toLowerCase()}.</span>{" "}
                {preparation.why}
              </p>
            )}
            {scene && (
              <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                Tested by the conversation “{scene.title}”.
              </p>
            )}
          </li>
        ))}
      </ul>
    </S>
  );
}
