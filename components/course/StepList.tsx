"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock } from "lucide-react";
import { markCourseStep, startCourseDay } from "@/app/actions";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Button, ButtonLink } from "@/components/Button";
import { Card, Chip, Note } from "@/components/ui";
import { MEET_STEP, focusedSteps, type CourseStep } from "@/lib/course";

/**
 * TODAY'S MODULE, AS A LIST YOU WALK DOWN.
 *
 * One step is open at a time and it is the first unfinished one, which is the
 * whole of what a planned evening buys: there is never a question about what
 * to do next, only whether to do it. The steps behind it are ticked and the
 * ones ahead are named but quiet, so the evening has a visible end without
 * offering six doors at once.
 *
 * TWO KINDS OF TICK, AND THE CARD SAYS WHICH. Meeting the words and the
 * closing round are read off the learner's own answers and cannot be pressed:
 * their chip says the app checked. Everything else is the learner saying they
 * did it, which is the same class of fact as the conversation Today asks
 * about, and its button says "I did this" rather than pretending the app
 * watched a round it has no way of seeing. A `Review` row carries no note of
 * which mode wrote it, so there is no honest alternative, and saying so is
 * better than a tick that quietly means less than it looks.
 *
 * AND A STEP OPENED FROM HERE STAYS INSIDE THE MODULE. Every href carries the
 * marker `lib/course/focus.ts` writes, which is what turns the screen it opens
 * into a room: the rail, the phone bar and the tutor's button go, and the way
 * on is one button at the foot of it that ticks this step and opens the next.
 * So the ordinary evening never comes back to this list at all, and the "I did
 * this" below is what is left for somebody who played the round somewhere else
 * and is telling us so.
 *
 * THE WORDS GO IN THE DECK ON A PRESS AND NEVER ON A RENDER. The first step
 * runs `startCourseDay` before it opens the ladder, because `PrefetchLink`
 * fetches a whole page once a pointer has settled on a link for 90ms and a
 * page that built cards while rendering would build them for a hover.
 */
export function StepList({ programmeId, dayId, steps, done, closing }: {
  programmeId: string;
  dayId: string;
  steps: readonly CourseStep[];
  /** Step ids already finished, proved or ticked. */
  done: readonly string[];
  /** How far through the closing round the learner is, for the one step that counts. */
  closing: { graded: number; needed: number };
}) {
  const [ticked, setTicked] = useState<readonly string[]>(done);
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const finished = (id: string) => ticked.includes(id);
  const next = steps.find((s) => !finished(s.id)) ?? null;
  /*
    Where each step goes, with the marker on it, worked out in one place so the
    numbering the frame prints ("step 3 of 5") and the order this list draws
    cannot come apart.
  */
  const opens = new Map(focusedSteps(programmeId, dayId, steps).map((f) => [f.step.id, f.href]));

  /*
    A TICK HANDS ITS FOCUS ON RATHER THAN DROPPING IT.

    "I did this" disables itself the moment it is pressed, and a browser moves
    focus off a control it has just disabled: measured, `document.activeElement`
    was the body afterwards, so a keyboard walked back to the top of the page
    for every step of every evening. The step that opens is where the learner
    was going, so that is where the caret goes.

    Only after a press, never on arrival: this list is most of a phone screen
    and focusing it on load would scroll the card that says what tonight is off
    the top. `handOn` is set by the press and spent by the effect.
  */
  const handOn = useRef(false);
  const openStep = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!handOn.current) return;
    /* THE PRIMARY, NEVER THE FIRST CONTROL IN THE ROW. "I did this" comes
       first, because this app puts the quiet button to the left of the loud
       one, so focusing the first control would leave a keyboard one Enter away
       from ticking a step nobody had done. */
    openStep.current?.querySelector<HTMLElement>("[data-step-start] a,[data-step-start] button")?.focus();
    /* AND AGAIN ONCE THE REFRESH HAS LANDED. The tick moves the list on its
       own and then `router.refresh()` re-renders it from the server, which
       drops the caret a second time: measured, focus was on the body three
       seconds after a press that had just placed it correctly. So the press is
       spent only when the transition is over. */
    if (!pending) handOn.current = false;
  }, [next?.id, pending]);

  const tick = (step: CourseStep) => {
    setTicked((was) => [...was, step.id]);
    setFailed(null);
    handOn.current = true;
    start(async () => {
      const result = await markCourseStep(programmeId, dayId, step.id);
      if (!result.ok) {
        setTicked((was) => was.filter((id) => id !== step.id));
        setFailed(result.error);
        return;
      }
      router.refresh();
    });
  };

  /*
    The first step is the one press that writes cards, so it is a button that
    navigates rather than a link. Everything else is an ordinary link, which
    keeps the prefetch and the back button working the way they do everywhere.
  */
  const open = (step: CourseStep) => {
    if (step.id !== MEET_STEP) return;
    setFailed(null);
    start(async () => {
      const result = await startCourseDay(programmeId, dayId);
      if (!result.ok) { setFailed(result.error); return; }
      router.push(opens.get(step.id) ?? step.href);
    });
  };

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, at) => {
        const isDone = finished(step.id);
        const isNext = next?.id === step.id;
        return (
          <li key={step.id}>
            <Card
              tone={isNext ? "accent" : "plain"}
              className={isDone ? "opacity-100" : ""}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    /*
                      A HUE'S TINT WITH A HUE'S INK, never its fill with its
                      ink: `--good-ink` is drawn to clear 4.5:1 on `--good-soft`
                      and nowhere else, and the pair is the same one every
                      marked answer in the app already wears.
                    */
                    background: isDone ? "var(--good-soft)" : isNext ? "var(--accent-soft)" : "var(--raised)",
                    color: isDone ? "var(--good-ink)" : isNext ? "var(--accent-deep)" : "var(--ink-3)",
                  }}
                >
                  {isDone ? <Check size={15} /> : at + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold" style={{ color: "var(--ink)" }}>{step.title}</p>
                  {(isNext || isDone) && (
                    <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                      {step.why}
                    </p>
                  )}
                  {isNext && step.id === "review" && (
                    <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
                      {closing.graded} of {closing.needed} answers in. Keep going and this ticks itself.
                    </p>
                  )}

                  <div
                    ref={isNext ? openStep : undefined}
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    {isDone ? (
                      <Chip tone="good">
                        {step.derived ? "Checked against your answers" : "Done"}
                      </Chip>
                    ) : isNext ? (
                      <>
                        {/*
                          THE QUIET BUTTON FIRST AND THE LOUD ONE LAST, which is
                          this app's own rule about a row of buttons: the accent
                          one sits where a thumb and a reading eye both end up.
                        */}
                        {!step.derived && (
                          <Button
                            variant="secondary"
                            onClick={() => tick(step)}
                            disabled={pending}
                          >
                            I did this
                          </Button>
                        )}
                        {/*
                          The marker is on a wrapper rather than on the control
                          itself: `ButtonLink` takes a fixed prop list and drops
                          anything else, so an attribute on it reaches no
                          element and the caret quietly goes nowhere. Measured
                          that way once.
                        */}
                        <span data-step-start className="contents">
                          {step.id === MEET_STEP ? (
                            <Button variant="primary" onClick={() => open(step)} disabled={pending}>
                              Start <ArrowRight size={15} aria-hidden />
                            </Button>
                          ) : (
                            <ButtonLink href={opens.get(step.id) ?? step.href} variant="primary">
                              Start <ArrowRight size={15} aria-hidden />
                            </ButtonLink>
                          )}
                        </span>
                      </>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm"
                        style={{ color: "var(--ink-3)" }}
                      >
                        <Lock size={13} aria-hidden /> {step.minutes} min, after this one
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </li>
        );
      })}

      {failed && (
        <li>
          <div role="status">
            <Note tone="again">
              {failed} Nothing was changed.{" "}
              <Link href="/course" className="underline">Try again</Link>.
            </Note>
          </div>
        </li>
      )}
    </ol>
  );
}
