import { openerBySlot, STAGES, MIXED_STAGE } from "@/lib/estonian/openers";

/**
 * WHERE A LEARNER STANDS ON THE OPENERS, READ OFF THEIR OWN ANSWERS.
 *
 * Nothing here is stored (ADR-014). Every answer in the openers round is a
 * `Review` row whose `slot` names the opener it was about, so which stage a
 * learner has settled is a function of those rows and of nothing else.
 *
 * A stage is SETTLED when the last `WINDOW` answers on it are right at least
 * `SETTLED_SHARE` of the time and came on at least `SETTLED_DAYS` different
 * days. Both halves matter: a run of right answers in one sitting is a good
 * evening and not a habit, and a share over a few lucky weeks is not a share.
 * That is the operator's own wording, "ten times or a few days of getting it
 * right a lot".
 *
 * It only ever OFFERS the next stage. Nothing locks, because the learner is the
 * authority on what they want to practise tonight.
 *
 * Pure: no React, no Prisma.
 */

export const WINDOW = 20;
export const MIN_ANSWERS = 12;
export const SETTLED_SHARE = 0.85;
export const SETTLED_DAYS = 3;

/** One answer, as the log holds it. `day` is the learner's own calendar day. */
export interface OpenerAnswer {
  slot: string;
  rating: number;
  day: string;
}

export interface StageReading {
  n: number;
  title: string;
  line: string;
  answers: number;
  /** Share right over the last `WINDOW` answers, or null with too few. */
  share: number | null;
  days: number;
  settled: boolean;
  /** Offered: the first stage always, and each one after the one before settled. */
  open: boolean;
}

export interface OpenersReading {
  stages: StageReading[];
  /** The stage to lead with: the highest one open. */
  current: number;
}

/** A right answer is Good or better. Hard is a miss that was nearly a hit. */
function right(rating: number): boolean {
  return rating >= 3;
}

/**
 * The reading, from answers newest first. `maxStage` caps what is offered at
 * all, so a level that does not reach a stage is never told it is next.
 */
export function readOpeners(answers: readonly OpenerAnswer[], maxStage = MIXED_STAGE): OpenersReading {
  const byStage = new Map<number, OpenerAnswer[]>();
  for (const a of answers) {
    const stage = openerBySlot(a.slot)?.stage;
    if (!stage) continue;
    const list = byStage.get(stage) ?? [];
    list.push(a);
    byStage.set(stage, list);
  }
  // The mixed stage is settled by everything: it asks all of them.
  byStage.set(MIXED_STAGE, answers.filter((a) => openerBySlot(a.slot)));

  /*
    A stage is open when the one before it is open and either settled or one the
    learner has already answered on. The second half is what stops a bad day
    taking a stage back: somebody who got to stage 3 and then slipped on stage 2
    is not shut out of 3, they are led back to 2 (`current`, below). The mixed
    stage has no answers of its own to point at, so it needs the stage before it
    settled.
  */
  let previousOpen = true;
  let previousSettled = true;
  const stages: StageReading[] = STAGES.map((s) => {
    const mine = (byStage.get(s.n) ?? []).slice(0, WINDOW);
    const share = mine.length >= MIN_ANSWERS ? mine.filter((a) => right(a.rating)).length / mine.length : null;
    const days = new Set(mine.map((a) => a.day)).size;
    const settled = share !== null && share >= SETTLED_SHARE && days >= SETTLED_DAYS;
    const answered = byStage.get(s.n)?.length ?? 0;
    const reached = s.n < MIXED_STAGE && answered > 0;
    const open = s.n <= maxStage && previousOpen && (previousSettled || reached || s.n === 1);
    previousOpen = open;
    previousSettled = settled;
    return { n: s.n, title: s.title, line: s.line, answers: answered, share, days, settled, open };
  });

  /*
    The stage to lead with is the first one still being worked on, which is the
    one a learner is best served by whether they are climbing or have slipped.
    When every open stage is settled it is the highest of them.
  */
  const open = stages.filter((s) => s.open);
  const current = open.find((s) => !s.settled)?.n ?? Math.max(1, ...open.map((s) => s.n));
  return { stages, current };
}
