"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ListChecks, X } from "lucide-react";
import { advanceCourseStep, tonightSteps } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { MODULE_HOME, MODULE_PARAM, readFocus, type ModuleFocus } from "@/lib/course/focus";
import { ModuleContext, ModuleNextContext, ModuleStepsContext, type ModuleStepRow } from "./moduleFocus";

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
 * So a step opened from the module has one way on, and pressing it ticks the
 * step and opens the next one in the same press. On a phone it is pinned to the
 * foot of the screen where the phone bar was. On a desktop there is no bar at
 * all: the way on is "Next" where the step ends, on a round's finish screen and
 * at the foot of a reading, and nothing floats over the middle of a round.
 *
 * AND THE RAIL AND ANU STAY. The first version took the whole website off the
 * screen, rail, phone bar and tutor's button, and it was reported the other
 * way: a learner three steps in had no idea where in the app they were and
 * nobody to ask about the card in front of them. So the rail is the ordinary
 * rail with Learn lit and tonight's steps hung under it, each one pressable,
 * the one you are on marked and the ones behind you ticked; a class group is
 * not drawn, since nothing about tonight is in it. Anu stays in her corner at
 * every width, and what goes is the phone bar alone. The cross is a phone's
 * only: on a desktop the rail's own Today is the door.
 *
 * HOW THE PHONE BAR GOES, AND WHY IT IS CSS. `.module-step` is the one element
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
  const steps = useTonight(focus);
  return (
    <ModuleContext.Provider value={focus}>
      <ModuleStepsContext.Provider value={steps}>
        <ModuleNextContext.Provider value={focus ? <ModuleNext focus={focus} steps={steps} /> : null}>
          {children}
          {focus && <ModuleBar focus={focus} />}
        </ModuleNextContext.Provider>
      </ModuleStepsContext.Provider>
    </ModuleContext.Provider>
  );
}

/**
 * TONIGHT'S STEPS, ASKED OF THE SERVER ONCE PER STEP.
 *
 * Per step rather than once per evening, because pressing on is what ticks a
 * step and the rail has to show the tick on the screen that press opened. The
 * previous answer stands while the next is on its way, so the list under Learn
 * does not blink out between two steps of one evening; a different day drops
 * it. Caught for the reason every Server Action call here is: a rejection out
 * of an effect is an unhandled promise, and a rail with no steps under Learn
 * is still a rail.
 */
function useTonight(focus: ModuleFocus | null): readonly ModuleStepRow[] {
  const [rows, setRows] = useState<{ key: string; steps: readonly ModuleStepRow[] }>({ key: "", steps: [] });
  const programmeId = focus?.programmeId ?? "";
  const dayId = focus?.dayId ?? "";
  const stepId = focus?.stepId ?? "";
  useEffect(() => {
    if (!programmeId || !dayId) return;
    let live = true;
    tonightSteps(programmeId, dayId)
      .catch(() => null)
      .then((steps) => {
        if (live && steps) setRows({ key: `${programmeId}/${dayId}`, steps });
      });
    return () => { live = false; };
  }, [programmeId, dayId, stepId]);
  return focus && rows.key === `${programmeId}/${dayId}` ? rows.steps : [];
}

/**
 * PRESSING ON, SHARED BY THE PHONE BAR AND THE DESKTOP'S "NEXT".
 *
 * Two buttons, one press: tick this step and open the next one. The long
 * comments on why the rejection is caught and why nothing follows the push are
 * on the body below and hold for both.
 */
function useCarryOn(focus: ModuleFocus) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);
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
        looking at a blank screen with the step's address still in the bar.

        `.catch(() => null)` is the shape `components/StarWord.tsx` already
        uses, and for its reason: the honest thing to do with a press that did
        not land is to say so and leave everything as it was.
      */
      const result = await advanceCourseStep(focus.programmeId, focus.dayId, focus.stepId)
        .catch(() => null);
      if (!result) {
        setFailed("That didn't reach us, so this step isn't ticked yet.");
        return;
      }
      if (!result.ok) { setFailed(result.error); return; }
      /*
        AND NOTHING AFTER THE PUSH. `advanceCourseStep` revalidates `/course`
        and `/` inside the action, which drops the client's copy of both, and a
        `router.refresh()` here was a second render of the route this press had
        just opened, which remounted under the caret the bar puts on the new
        screen's heading.
      */
      router.push(result.href);
    });
  };
  return { carryOn, pending, failed };
}

/**
 * THE WAY ON WHERE A STEP ENDS, ON A DESKTOP.
 *
 * Drawn by whoever reaches the end: a round's finish screen through `WayOut`,
 * the foot of a reading page through `ReadingEnd` and a conversation's debrief
 * through `NextStep`. It names where it goes, "Next, step 3: Match", because a button that only says "Continue" is a
 * button whose destination you find out by pressing it, and the rail beside it
 * already lists the evening by name.
 *
 * A phone keeps its bar for now and this stands down there, since two buttons
 * doing one thing on one screen is one too many.
 */
function ModuleNext({ focus, steps }: { focus: ModuleFocus; steps: readonly ModuleStepRow[] }) {
  const { carryOn, pending, failed } = useCarryOn(focus);
  const at = steps.findIndex((s) => s.id === focus.stepId);
  const next = at >= 0 ? steps[at + 1] : undefined;
  const last = focus.n >= focus.of;
  return (
    <div data-module-next="" className="hidden w-full flex-col items-center gap-2 md:flex">
      <Button variant="primary" size="lg" onClick={carryOn} disabled={pending}>
        {last ? (
          <>Finish tonight <ArrowRight size={16} aria-hidden /></>
        ) : (
          <>
            {next ? `Next, step ${focus.n + 1}: ${next.title}` : `Next, step ${focus.n + 1}`}
            <ArrowRight size={16} aria-hidden />
          </>
        )}
      </Button>
      {focus.derived && (
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          This step ticks itself off as you answer. This button just moves you on.
        </p>
      )}
      {failed && (
        <p role="status" className="text-sm" style={{ color: "var(--again-ink)" }}>
          {failed} Nothing has changed.
        </p>
      )}
    </div>
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
  const { carryOn, pending, failed } = useCarryOn(focus);

  /*
    HOW TALL THE BAR IS, FOR ANU TO STAND CLEAR OF ON A PHONE.

    It is one row or two and grows a line when a step says it ticks itself, so
    a height typed into the stylesheet is a height that is wrong on some step.
    Measured the way `lib/layout/dockClearance.ts` measures the phone bar, and
    written as `--module-bar`, which `app/globals.css` reads below 768px only:
    on a desktop the bar is a card in the flow and Anu keeps her own corner.
  */
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--module-bar", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--module-bar");
    };
  }, []);

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
      /*
        And `md:hidden` is the desktop half: from the width the rail appears
        at there is no bar at all, because the way on is "Next" where the step
        ends and a card floating over the middle of a round is the thing this
        was asked to remove. Hidden rather than unmounted, so `body:has()`
        still reads the hook and the caret effect above still runs.
      */
      ref={bar}
      className="module-step fixed inset-x-0 bottom-0 z-[95] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden"
    >
      <div
        className="module-bar mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-[var(--r-xl)] border p-3"
        style={{
          borderColor: "var(--rule)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/*
          One row where there is room for it and two on a phone: the two
          buttons wrap onto a row of their own rather than squeezing the step
          count into a column of single letters, which is what one row did at
          360 once the cross joined it. `ml-auto` keeps them on the right on
          either row, so the way on stays where a thumb ends up.
        */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/*
            AND ONE DOOR BACK INTO THE APP, BECAUSE A ROOM WITH NO WAY OUT IS A
            TRAP RATHER THAN A FOCUS.

            Everything else that leaves is gone on purpose, and the way back to
            the list is still inside the evening. What was missing is the press
            for somebody whose evening has ended: the doorbell went, the bus
            stop arrived, or they simply want the dictionary. Taking them to the
            list first and making them find the rail from there is two presses
            to do the one thing a person expects a cross in a corner to do.

            So it is at the far left, where the weakest choice in a row sits in
            this app, drawn as a cross and a word rather than a button, so it is
            findable and never competes with the way on. It goes to Today,
            which is the app's own front door, and it asks nothing: every step
            already ticked is stored, and the module is where they left it.
            The word goes at phone width and the cross stays, since the name in
            `aria-label` begins with the word a sighted reader sees.

            The whole bar is a phone's only: from the width the rail appears
            at, the rail's own Today is this door and "Next" is the way on.

            `data-module-leave` is what `scripts/test-module.mjs` reads to tell
            this door, which is deliberate, from a door a round left open.
          */}
          <Link
            href="/"
            data-module-leave=""
            aria-label="Leave tonight's module and go back to Today"
            className="tap-tint inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-semibold"
            style={{ color: "var(--ink-3)" }}
          >
            <X size={16} aria-hidden />
            <span className="hidden sm:inline">Leave</span>
          </Link>
          <div className="min-w-[7rem] flex-1">
            <p className="label-xs whitespace-nowrap" style={{ color: "var(--ink-3)" }}>
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
            THE QUIET WAY BACK TO THE LIST. It goes to the module's own screen
            rather than to Today, because leaving a step is not leaving the
            evening: the list is where the rest of tonight is, and
            an app that answered "I am done with this bit" with its home page
            would be the exit this frame exists to remove.
          */}
          <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
            <ButtonLink href={MODULE_HOME} variant="ghost">
              <ListChecks size={15} aria-hidden /> Tonight
            </ButtonLink>
            <Button variant="primary" onClick={carryOn} disabled={pending}>
              {last ? "Finish" : "Continue"} <ArrowRight size={15} aria-hidden />
            </Button>
          </div>
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
            This step ticks itself off as you answer. This button just moves you on.
          </p>
        )}
        {failed && (
          <p role="status" className="text-sm" style={{ color: "var(--again-ink)" }}>
            {failed} Nothing has changed, and the page is still here.
          </p>
        )}
      </div>
    </div>
  );
}
