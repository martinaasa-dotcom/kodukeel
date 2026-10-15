import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { SYLLABUS } from "@/lib/collections/syllabus";
import { PUBLIC_CARDS } from "@/lib/copy/publicCards";
import { EXAM_PARTS, alignCourse, type ExamPart, type LevelAlignment } from "@/lib/curriculum/align";
import { shareCard } from "@/lib/progress/publicLocale";
import { sceneTesting } from "@/lib/scenes/catalogue";

// English only (docs/38-third-batch.md, D12), like /pilots, so its own card in English.
export const metadata = { title: "What the course covers", ...shareCard("en", "What the course covers", PUBLIC_CARDS["/curriculum"], "/curriculum") };

/*
  The footer under every public page asks the database whether /impact has
  anything to say yet, so a page baked at build time would answer for the build
  machine. The course itself is the syllabus in the repository.
*/
export const dynamic = "force-dynamic";

const PART_NAME = new Map(EXAM_PARTS.map((p) => [p.part, p]));
const named = (parts: readonly ExamPart[]) => parts.map((p) => PART_NAME.get(p)!.en).join(", ");

/**
 * WHAT EACH UNIT CLAIMS A LEARNER CAN DO, AND WHAT IT PREPARES THEM FOR.
 *
 * Generated from the repository rather than typed: the units, their levels and
 * their "can do" sentences are the syllabus, the exam parts are
 * `lib/curriculum/align.ts`, and the conversation is the scene that tests the
 * unit. A teacher or a reviewer reads it to see where the course has nothing,
 * so the gaps are printed as plainly as the rest.
 */
export default function CurriculumPage() {
  const levels = alignCourse(SYLLABUS, sceneTesting);
  return (
    <Legal title="What the course covers" updated="15 October 2026" path="/curriculum" oneLanguage>
      <P>
        Every unit of the course, by level: what it says a learner can do afterwards, which part of the
        Estonian language examination it prepares for, and the conversation that tests it where there is
        one. The levels are the Council of Europe’s CEFR scale. The “can do” sentences are this course’s
        own, and this page does not claim to follow any official curriculum document.
      </P>
      <P>
        The state examines A2, B1, B2 and C1, each in four parts: writing, listening, reading and speaking.
        There is no A1 examination, so A1 units are listed without a part. What each part sets is on{" "}
        <Link href="/state-exam" className="underline underline-offset-2">the page about the examination</Link>.
        Under each level, a part no unit is aimed at is named as a gap.
      </P>
      {levels.map((level) => <Level key={level.level} level={level} />)}
    </Legal>
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
