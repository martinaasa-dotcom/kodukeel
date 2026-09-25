"use client";

import { useCallback } from "react";
import { gradeCard } from "@/app/actions";
import { useOffline } from "@/components/OfflineProvider";
import { enqueueGrade } from "@/lib/offline/db";
import type { PendingGrade } from "@/lib/offline/outbox";
import type { RatingValue } from "@/lib/srs/scheduler";

/**
 * A GRADE THAT DID NOT REACH THE SERVER GOES INTO THE OUTBOX, IN EVERY ROUND.
 *
 * Every practice round grades through `gradeCard` (ADR-016), so what a learner
 * does in a sprint or a listening round is evidence the scheduler reads. And
 * almost every round wrote a failed grade off: "the grade is simply not
 * recorded", "a failed write costs this one card's rep", or a bare
 * `.catch(() => {})`. A phone on a train drops a request in the middle of a
 * round as readily as in the middle of review, and the durable outbox that
 * review, the flash round, the exceptions round and the learn ladder already
 * write to (ADR-015) was one import away the whole time. Two rounds did not
 * even catch: the daily quest awaited the call bare, so a failed grade threw
 * out of the handler before it set `busy` back and the round stopped
 * answering, and two boards left a rejected promise unhandled.
 *
 * A grade the server refused is queued too, which is `FlashSession`'s own
 * shape: `replayGrades` settles an id it cannot apply, so the outbox drops it
 * rather than holding it. The moment it was answered travels with it, since a
 * replay stamped with the time it landed would tell the scheduler the wrong
 * day. And a device that cannot store it either (private mode, storage
 * refused) costs this one grade and never the round, which is the promise the
 * old comments were keeping.
 *
 * Resolves true where the server took it, false where it was queued or lost;
 * no round is asked to do anything different either way.
 */
export function useGrade() {
  const { refresh, drainFirst } = useOffline();
  return useCallback(
    async (
      cardId: string,
      rating: RatingValue,
      durationMs: number,
      slot?: string,
      reachedSlot?: string,
    ): Promise<boolean> => {
      const answeredAt = new Date().toISOString();
      // One id for this answer, sent with it and queued with it, so a write
      // that committed and lost its answer is settled on replay, not doubled.
      const reviewId = crypto.randomUUID();
      try {
        // Anything queued earlier goes first, so the scheduler hears two
        // answers to one card in the order they were given.
        await drainFirst();
        const res = await gradeCard(cardId, rating, durationMs, answeredAt, slot, reachedSlot, reviewId);
        if (res.ok) return true;
      } catch {
        // Queued below.
      }
      try {
        await enqueueGrade({
          id: reviewId,
          cardId,
          rating,
          durationMs,
          reviewedAt: Date.parse(answeredAt),
          ...(slot ? { slot } : {}),
          ...(reachedSlot ? { reachedSlot } : {}),
        });
        refresh();
      } catch {
        // Nowhere to keep it on this device: the round goes on regardless.
      }
      return false;
    },
    [refresh, drainFirst],
  );
}

/**
 * A whole round's grades into the outbox, for a round that grades in one call.
 *
 * Match hands its board in through `recordMatchGrades`, one batched call
 * rather than a grade per pair, so it cannot use `useGrade`; a batch that did
 * not land is queued here instead, with the ids the batch carried. Those ids
 * are what make it safe: a batch the server applied and whose answer never
 * came back is replayed as ids it has already written, which `replayGrades`
 * settles rather than counting twice.
 */
export function useQueueGrades() {
  const { refresh } = useOffline();
  return useCallback(
    async (grades: readonly PendingGrade[]): Promise<void> => {
      if (grades.length === 0) return;
      try {
        for (const grade of grades) await enqueueGrade(grade);
        refresh();
      } catch {
        // Nowhere to keep them on this device: the finish screen goes on regardless.
      }
    },
    [refresh],
  );
}
