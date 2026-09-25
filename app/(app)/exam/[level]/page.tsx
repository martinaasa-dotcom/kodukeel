import { notFound, redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { paperFor, sittingOf } from "@/lib/progress/exam";
import { isExamLevel } from "@/lib/exam/spec";
import { fillRate } from "@/lib/exam/paper";
import { freshSeed, numberedSeed, PAPERS_PER_LEVEL } from "@/lib/exam/seed";
import { SKILLS, type SkillKey } from "@/lib/exam/types";
import { ExamSession } from "./ExamSession";
import { firstParams } from "@/lib/ux/queryParam";

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const upper = level.toUpperCase();
  return { title: isExamLevel(upper) ? `${upper} mock exam` : "Mock exam" };
}

export const dynamic = "force-dynamic";

/**
 * One sitting.
 *
 * The paper is built here, on the server, from a seed that lives in the URL.
 * That is not a detail: `buildPaper` is deterministic in (level, seed, pool), so
 * a learner who reloads mid-listening gets the paper back rather than a fresh
 * one, and `submitExam` can rebuild the same paper to mark it without the client
 * ever sending the questions or the answers it thinks are right.
 *
 * A visit with no seed is redirected to one carrying a fresh seed, which is what
 * makes "another paper" a link rather than a piece of state.
 */
export default async function ExamLevelPage({ params, searchParams }: {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ seed?: string | string[]; paper?: string | string[]; part?: string | string[] }>;
}) {
  const { level } = await params;
  const query = firstParams(await searchParams);
  const first = query.seed;
  /*
    Only a seed the hand-in will take. `submitExam` refuses anything longer
    than 64 characters, and an over-long parameter built a paper that could be
    sat for three hours and never handed in. Anything else is a fresh paper.
  */
  const seed = first && first.length <= 64 ? first : undefined;
  const upper = level.toUpperCase();
  if (!isExamLevel(upper)) notFound();

  /*
    A numbered paper, whole or one part, is asked for by number and turned into
    a seed of its own shape here, carrying this moment like any fresh seed
    (lib/exam/seed.ts). A number or a part that is not one is a fresh paper
    rather than an error: the address is a link somebody may have typed.
  */
  if (!seed && query.paper) {
    const number = Number(query.paper);
    const part = (SKILLS as readonly string[]).includes(query.part ?? "") ? (query.part as SkillKey) : null;
    if (Number.isInteger(number) && number >= 1 && number <= PAPERS_PER_LEVEL) {
      redirect(`/exam/${upper}?seed=${numberedSeed(number, part)}`);
    }
  }

  if (!seed) {
    // A random draw in base 36, short enough to read out and long enough that
    // two learners sitting at once do not get the same paper, then the moment
    // the paper was built, which pins its pool (see lib/exam/seed.ts).
    const fresh = freshSeed();
    redirect(`/exam/${upper}?seed=${fresh}`);
  }

  const ownerId = await requireUserId();
  // A paper already handed in opens on its result: sitting it again with the
  // answers in hand would be copying rather than sitting.
  const sat = await sittingOf(ownerId, upper, seed);
  if (sat) redirect(`/exam/result/${sat.id}`);
  const paper = await paperFor(ownerId, upper, seed);

  return <ExamSession paper={paper} fillRate={fillRate(paper)} />;
}
