"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { acceptCourseMove, snoozeCourseMove } from "@/app/actions";
import { Button } from "@/components/Button";
import { Note } from "@/components/ui";
import { NOT_REACHED } from "@/lib/copy/values";
import { useT } from "@/components/Locale";

/**
 * The two presses under an offer on the module screen: make the move, or not
 * now.
 *
 * The move is the loud one and sits last in its row, which is this app's rule
 * about a row of buttons. "Not now" is a real answer rather than a dismissal
 * of a nag, so it is a button and not a cross in a corner, and what it does is
 * said on it. Neither press navigates: both actions revalidate the course, so
 * the screen redraws on the part the learner is now on, or without the card.
 *
 * `kind` is the only thing sent. Where the move goes is worked out again on
 * the server off the learner's own answers (`acceptCourseMove`), so a card
 * drawn a minute ago cannot move anybody somewhere the reading has stopped
 * supporting, and says so if it tried.
 */
export function CourseMove({ kind, label }: { kind: "down" | "back" | "ahead" | null; label: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = useT();

  /* Each press catches its own rejection at the call, which is where the
     invariant looks and where a dropped connection is turned into a sentence
     rather than a torn-down screen. */
  const run = (press: () => Promise<{ ok: true } | { ok: false; error: string } | null>) => {
    setFailed(null);
    start(async () => {
      const result = await press();
      if (!result) { setFailed(t(NOT_REACHED)); return; }
      if (!result.ok) setFailed(result.error);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {/* Where there is no move to make, the card is news rather than a
            question, and the press is an acknowledgement. */}
        <Button variant="secondary" disabled={pending} onClick={() => run(() => snoozeCourseMove().catch(() => null))}>
          {kind ? t("Not now") : t("Got it")}
        </Button>
        {kind && label && (
          <Button variant="primary" disabled={pending} onClick={() => run(() => acceptCourseMove(kind).catch(() => null))}>
            {label} <ArrowRight size={15} aria-hidden />
          </Button>
        )}
      </div>
      {failed && (
        <div className="mt-2" role="status">
          <Note tone="again">{failed} {t("Nothing has changed.")}</Note>
        </div>
      )}
    </div>
  );
}
