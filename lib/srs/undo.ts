import type { z } from "zod";

import { prisma } from "@/lib/db";
import { Scheduling } from "@/lib/api/contract";
import type { SchedulingState } from "@/lib/srs/scheduler";

/**
 * A card's scheduling in the shape that crosses the wire, which a grade hands
 * back and undo takes back.
 *
 * The schema is the v1 contract's own (`Scheduling` in lib/api/contract.ts), so
 * the web's `undoGrade` and `POST /api/v1/grades/undo` validate one shape and a
 * native client reading the published schema reads the same ranges.
 */
export type SchedulingSnapshot = z.infer<typeof Scheduling>;

/** A scheduling state as it crosses the wire. */
export function snapshotOf(state: SchedulingState): SchedulingSnapshot {
  return {
    due: state.due.toISOString(),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsedDays: state.elapsedDays,
    scheduledDays: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    learningSteps: state.learningSteps,
    lastReview: state.lastReview?.toISOString() ?? null,
  };
}

export type UndoResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "not_found"; error: string };

/**
 * Puts a card back the way it was before the last grade, for an owner already
 * resolved.
 *
 * The Review row stays. `Review` is append-only and is the input to FSRS
 * parameter optimization, so deleting a row to make a mistake disappear would
 * corrupt the one table we cannot rebuild, and it would also be a lie: the card
 * really was shown, and really was answered. What undo restores is the
 * *scheduling*, which is derived state and safe to rewind.
 *
 * The previous state comes from the client because that is the only place it
 * still exists; it is validated and range-clamped on the way in, and can only
 * ever be applied to a card the owner already holds. Moved here out of
 * `app/actions.ts` so the web's `undoGrade` and `POST /api/v1/grades/undo` are
 * one body (ADR-029); each door resolves its owner and calls this.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const CENTURY_MS = 100 * 365 * DAY_MS;

export async function undoGradeFor(ownerId: string, cardId: string, previous: unknown): Promise<UndoResult> {
  const parsed = Scheduling.safeParse(previous);
  if (!parsed.success) return { ok: false, reason: "invalid", error: "That card's details didn't come through properly." };

  const card = await prisma.card.findFirst({ where: { id: cardId, ownerId }, select: { id: true } });
  if (!card) return { ok: false, reason: "not_found", error: "We couldn't find that card. It may have been removed." };

  const p = parsed.data;
  const due = new Date(p.due);
  if (Number.isNaN(due.getTime())) return { ok: false, reason: "invalid", error: "That card's details didn't come through properly." };
  // The last review is a date for the same reason `due` is: an unparseable one
  // reached the update as an Invalid Date and came back as a 500.
  const lastReview = p.lastReview ? new Date(p.lastReview) : null;
  if (lastReview && Number.isNaN(lastReview.getTime())) {
    return { ok: false, reason: "invalid", error: "That card's details didn't come through properly." };
  }

  /*
    A date the client sends can still be one Postgres will not store: a JS Date
    reaches year 275760, a timestamp column does not, and that write came back
    as a 500. Nothing a grade ever wrote is more than a century from today, and
    nothing was reviewed in the future, so those are the bounds.
  */
  const now = Date.now();
  const outOfRange = (d: Date, latest: number) => d.getTime() < now - CENTURY_MS || d.getTime() > latest;
  if (outOfRange(due, now + CENTURY_MS) || (lastReview && outOfRange(lastReview, now + DAY_MS))) {
    return { ok: false, reason: "invalid", error: "That card's details didn't come through properly." };
  }

  await prisma.card.update({
    where: { id: cardId },
    data: {
      due,
      stability: p.stability,
      difficulty: p.difficulty,
      elapsedDays: p.elapsedDays,
      scheduledDays: p.scheduledDays,
      reps: p.reps,
      lapses: p.lapses,
      state: p.state,
      learningSteps: p.learningSteps,
      lastReview,
    },
  });
  return { ok: true };
}
