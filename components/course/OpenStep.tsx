"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { startCourseDay } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { Note } from "@/components/ui";
import { useT } from "@/components/Locale";
import { MEET_STEP } from "@/lib/course/types";

/**
 * THE ONE BUTTON THAT OPENS A STEP OF TONIGHT'S MODULE.
 *
 * Two places draw it: the open step on the list, and the module's hero card,
 * where it is the first thing on the screen so a learner who stopped halfway
 * carries on without scrolling down a list to find where they were. One
 * component rather than a copy each, because the first step is not a link:
 * it is the one press that writes the day's words into the deck, so it runs
 * `startCourseDay` before it navigates, and a second copy that forgot is a
 * hero button that opens the ladder over an empty deck.
 *
 * A failure is said beside the button, or handed to the caller where it has a
 * place of its own for it (the list does).
 */
export function OpenStep({
  programmeId, dayId, stepId, href, label, size = "md", disabled = false, onFailed,
}: {
  programmeId: string;
  dayId: string;
  stepId: string;
  /** Where the step goes, with the module's marker already on it. */
  href: string;
  label: ReactNode;
  size?: "md" | "lg";
  disabled?: boolean;
  /** Where a failure goes when the caller says it; otherwise it is drawn here. */
  onFailed?: (message: string | null) => void;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = useT();
  const report = (message: string | null) => (onFailed ? onFailed(message) : setFailed(message));
  const arrow = <ArrowRight size={size === "lg" ? 17 : 15} aria-hidden />;

  if (stepId !== MEET_STEP) {
    return (
      <ButtonLink href={href} variant="primary" size={size} className="whitespace-nowrap">
        {label} {arrow}
      </ButtonLink>
    );
  }

  const open = () => {
    report(null);
    start(async () => {
      /* Caught: a Server Action throws rather than answering when the network
         is gone, and an uncaught rejection out of a transition takes the tree
         with it. */
      const result = await startCourseDay(programmeId, dayId).catch(() => null);
      if (!result) { report(t("That didn't reach us.")); return; }
      if (!result.ok) { report(t(result.error)); return; }
      router.push(href);
    });
  };

  return (
    <>
      <Button variant="primary" size={size} onClick={open} disabled={disabled || pending} className="whitespace-nowrap">
        {label} {arrow}
      </Button>
      {!onFailed && failed && (
        <div role="status" className="basis-full">
          <Note tone="again">{failed} {t("Nothing has changed.")}</Note>
        </div>
      )}
    </>
  );
}
