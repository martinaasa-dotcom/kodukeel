"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ListChecks } from "lucide-react";
import { advanceCourseStep } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { MODULE_HOME, MODULE_PARAM, readFocus, type ModuleFocus } from "@/lib/course";
import { ModuleContext } from "./moduleFocus";

/**
 * TONIGHT'S MODULE, WITH THE REST OF THE WEBSITE TAKEN OFF THE SCREEN.
 *
 * The module screen is a decision made in advance and it was handing the
 * learner off to the ordinary app the moment they pressed a step. What that
 * cost was reported off the reading step and the report is the specification:
 * the page was read, the learner kept scrolling, and at the foot of it they
 * met a drill that was not part of tonight, because nothing on the screen said
 * where the reading ended. Then they came back to the list and the step was
 * not ticked, so the evening asked them to press "I did this" about a page
 * they had visibly just read.
 *
 * So a step opened from the module is a room rather than a page. The rail, the
 * bar along the bottom of a phone and the tutor's button in the corner go, the
 * way on is one button pinned to the foot of the screen, and pressing it ticks
 * the step and opens the next one in the same press. There is nothing else to
 * press, which is the whole of the ask: an evening with one thing to do at a
 * time, from the first step to the last.
 *
 * HOW THE WEBSITE GOES, AND WHY IT IS CSS. `.module-step` is the one element
 * this draws and `body:has(...)` is what reads it, exactly as `.scene-room`
 * does for a conversation. In a selector rather than an attribute written from
 * an effect, and that is the difference between a room and a room that
 * flickers: an effect runs after the first paint, so every step would draw the
 * whole website for a frame and then take it away. What it hides is marked
 * `data-chrome` at the three places that draw it rather than matched by shape.
 *
 * WHY IT IS MOUNTED ONCE, IN THE SHELL. A day's steps open a reading, four
 * shapes of round, a conversation and the review queue, which is eighteen
 * pages today and more whenever a rotation gains a round. Wiring a frame into
 * each of them is eighteen chances to forget, and the one that forgets looks
 * exactly like a step nobody has opened yet. Mounted here it is the address
 * that decides, so a step that did not exist when this was written arrives
 * already inside the module.
 *
 * AND NOTHING HERE IS TRUSTED. The marker came off a URL a learner could have
 * typed. It decides whether a frame is drawn and what the caption says, and it
 * decides nothing else: `advanceCourseStep` resolves the programme, the day
 * and the step again on the server, refuses to tick a derived step, refuses a
 * day nobody has reached, and works out the way on from the day's own order
 * rather than from anything sent to it.
 *
 * THE CONTEXT ITSELF IS NEXT DOOR, in `moduleFocus.ts`, and its own header says
 * why: everything that reads it would otherwise drag this file, its icons and a
 * reference to `advanceCourseStep` along, including `Empty`, which is drawn on
 * the landing page.
 */
export function ModuleScope({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const focus = readFocus(params.get(MODULE_PARAM));
  return (
    <ModuleContext.Provider value={focus}>
      {children}
      {focus && <ModuleBar focus={focus} />}
    </ModuleContext.Provider>
  );
}

/**
 * The one way on, pinned to the foot of the screen.
 *
 * The primary is last in its row, which is this app's rule about a row of
 * buttons everywhere else: the accent one sits where a thumb and a reading eye
 * both end up. What is to its left is not a second choice about tonight, it is
 * the way back to the list, which is still inside the module.
 *
 * A DERIVED STEP IS PRESSED PAST RATHER THAN TICKED, and the bar says so
 * rather than letting the press imply a row was written. The closing round and
 * meeting the words are read off the learner's own answers, so somebody who
 * walks out of either half way is still looking at an unfinished step when
 * they reach the list, and being told that here is better than finding it out
 * there. Which steps those are is the day's own business, so the frame is told
 * rather than guessing from the step id.
 */
function ModuleBar({ focus }: { focus: ModuleFocus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);

  /*
    PRESSING ON HANDS THE CARET TO THE STEP IT OPENS.

    This bar lives in the shell, so it survives the navigation it causes and
    the browser leaves focus on a button that is now above a different screen;
    measured, `document.activeElement` was the body afterwards. A keyboard
    walked back to the top of the page for every step of every evening, and a
    screen reader was told nothing at all about arriving somewhere new, which
    on a five-step evening is five silent screen changes.

    It is the same fault `components/course/StepList.tsx` has a header about,
    one screen over, and it wants the opposite answer: the list hands the caret
    to the button the learner was reaching for, and this hands it to what they
    were reaching *at*. Every route in this app carries exactly one `h1`, drawn
    or `sr-only`, which `scripts/test-invariants.ts` asserts, so it is there to
    be moved to and reading it out is the announcement.

    Only when the step changes, never on arrival: somebody who opened this
    screen some other way has not asked to be moved.
  */
  const arrivedAt = useRef(focus.stepId);
  useEffect(() => {
    if (arrivedAt.current === focus.stepId) return;
    arrivedAt.current = focus.stepId;

    /*
      AND WHICH HEADING IS THE NEW ONE CANNOT BE DECIDED BY ELEMENT ALONE.

      The bar hears the new step from `useSearchParams`, and which commit the
      page under it lands in is not ours to decide: on one press the old
      heading is still standing and the new tree arrives frames later, and on
      the next the address and the content commit together, so the heading in
      `#main` is already the new step's before this effect has run.

      The first version read the heading present at that moment as the old one
      and waited for a different element. Where the two commit together that
      element never arrives, the wait ran out of frames, and the caret stayed
      on the body: green on one run of `scripts/test-module.mjs` and red on
      the next with the code untouched, which is a race rather than a flake.
      Taking the first heading it sees is the same fault pointed the other way,
      and moves the caret to the screen the learner is leaving.

      So a heading that replaces the one standing at the press is the new step
      and is announced the moment it lands, and where nothing replaces it the
      one standing was already the new step's and is announced at the end of
      the window. One announcement either way, always of the screen the learner
      ended up on, whichever order the two commits land in.
    */
    let frames = 0;
    let raf = 0;
    /* A heading is not focusable on its own, and a permanent `tabindex` would
       put it in the tab order of a page nobody navigated to. Taken off again
       once it has been read, which is the shape every skip link takes. */
    const announce = (heading: HTMLElement) => {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
    };
    const was = document.querySelector("#main h1");
    const settle = () => {
      const heading = document.querySelector<HTMLElement>("#main h1");
      if (heading && heading !== was) { announce(heading); return; }
      /* About a second at sixty frames, after which the screen and the address
         landed together and the heading standing is the one to read out. */
      if (frames++ <= 60) { raf = requestAnimationFrame(settle); return; }
      const settled = document.querySelector<HTMLElement>("#main h1");
      /* Unless the learner has started on the new screen, in which case they
         have the caret and are not to be interrupted a second after arriving.
         The press they came in on does not count: that button is in this bar,
         and measured across a navigation it is the body that holds the caret
         afterwards anyway. */
      const onTheScreen = document.activeElement instanceof HTMLElement
        && document.getElementById("main")?.contains(document.activeElement);
      if (settled && !onTheScreen) announce(settled);
    };
    raf = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(raf);
  }, [focus.stepId]);

  const last = focus.n >= focus.of;
  const carryOn = () => {
    setFailed(null);
    start(async () => {
      /*
        AND A PRESS THAT NEVER REACHED THE SERVER IS CAUGHT.

        A Server Action returns `{ ok: false }` for an answer it has, and
        *throws* when there was no answer: the network is gone, the deployment
        is restarting, the tab has been asleep. Without the catch that rejection
        leaves the transition, and React tears the tree down: measured with the
        plug pulled, `#main` was empty, the bar was gone and the learner was
        looking at a blank screen with the step's address still in the bar. On
        a feature whose whole promise is that a step is a room you cannot
        wander out of, the way on deleting the room is the worst of the failure
        modes, and it is the one that needed no network to be reached.

        `.catch(() => null)` is the shape `components/StarWord.tsx` already
        uses, and for its reason: the honest thing to do with a press that did
        not land is to say so and leave everything as it was.
      */
      const result = await advanceCourseStep(focus.programmeId, focus.dayId, focus.stepId)
        .catch(() => null);
      if (!result) {
        setFailed("That did not reach the server, so this step is not ticked.");
        return;
      }
      if (!result.ok) { setFailed(result.error); return; }
      /*
        AND NOTHING AFTER THE PUSH, WHICH IS A CORRECTION.

        There was a `router.refresh()` here, so the module screen would not be
        served from the router cache with the step still open on it. It is not
        needed: `advanceCourseStep` revalidates `/course` and `/` inside the
        action, which drops the client's copy of both, and the refresh was a
        second render of the route this press had just opened. What that cost
        was the caret: the effect above puts it on the new screen's heading and
        the refresh remounted underneath it, so focus landed on the heading or
        on the body depending on which won, which is a check that passes on
        this machine and fails on a slower one.
      */
      router.push(result.href);
    });
  };

  return (
    /*
      `module-step` is the hook, and it is on the element that draws rather
      than on a bare marker somewhere else: a rule and the thing it is about
      cannot come apart when they are the same element.
    */
    <div
      /*
        Not `.bottom-notice`, which is the class that floats a small notice
        clear of the phone bar: the phone bar is not drawn here, and this is a
        strip across the foot of the screen rather than something standing off
        it. Its own padding is the safe area, which on a phone with a home
        indicator is where the indicator is not.

        `z-[95]` puts it over the page and under the command palette, which is
        the one thing in this app that is opened deliberately with a keystroke.
      */
      className="module-step fixed inset-x-0 bottom-0 z-[95] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
    >
      <div
        className="module-bar mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-[var(--r-xl)] border p-3"
        style={{
          borderColor: "var(--rule)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>
              Step {focus.n} of {focus.of}
            </p>
            {/* A meter rather than a row of dots, because an evening runs to
                five or six steps and a dot apiece is furniture at 360px. */}
            <div
              aria-hidden
              className="module-meter mt-1.5 h-1.5 overflow-hidden rounded-full"
              style={{ background: "var(--raised)" }}
            >
              <div
                className="h-full rounded-full transition-ui"
                style={{ width: `${Math.round((focus.n / focus.of) * 100)}%`, background: "var(--accent)" }}
              />
            </div>
          </div>
          {/*
            THE QUIET WAY BACK, AND IT IS THE ONLY ONE. It goes to the module's
            own screen rather than to Today, because leaving a step is not
            leaving the evening: the list is where the rest of tonight is, and
            an app that answered "I am done with this bit" with its home page
            would be the exit this frame exists to remove.
          */}
          <ButtonLink href={MODULE_HOME} variant="ghost">
            <ListChecks size={15} aria-hidden /> Tonight
          </ButtonLink>
          <Button variant="primary" onClick={carryOn} disabled={pending}>
            {last ? "Finish" : "Continue"} <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
        {/*
          AND A STEP THE LOG FINISHES SAYS SO BEFORE IT IS PRESSED PAST.

          Meeting the words and the closing round are read off the learner's
          own answers and this press writes nothing for either, so somebody who
          walks out of one half way meets an unfinished step when they reach
          the list. That surprise is the shape of the thing this whole change
          was reported as, one room over, and one line here is cheaper than
          finding it out there. The same fact the list states, in the tense of
          somebody standing on the step.
        */}
        {focus.derived && (
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            This step ticks itself from your answers, not from this button.
          </p>
        )}
        {failed && (
          <p role="status" className="text-sm" style={{ color: "var(--again-ink)" }}>
            {failed} Nothing was changed, and the reading is still here.
          </p>
        )}
      </div>
    </div>
  );
}
