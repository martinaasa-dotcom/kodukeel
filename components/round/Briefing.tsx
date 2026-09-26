"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, MousePointerClick } from "lucide-react";
import { Button } from "@/components/Button";
import { KeyCap } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { briefingFor, type BriefingId } from "@/lib/copy/briefings";

/**
 * THE SCREEN A ROUND OPENS ON, AND THE ROUND IS NOT BEHIND IT YET.
 *
 * `lib/copy/briefings.ts` is what it says and why. This is the drawing, and
 * the one thing about it that is load-bearing rather than cosmetic is that
 * the round is a *child*: it is not rendered, so it is not mounted, so no
 * clock has started, no clip has played and no card has been dealt. A
 * briefing drawn *inside* a session would be a screen with the round's own
 * effects already running behind it, which on the timed rounds means the
 * learner reads the instructions with the clock going.
 *
 * So it is wired at the page, where the round is a child element and the
 * page already knows whether there is anything to brief somebody about: a
 * deck with nothing due draws its empty state and no briefing, because a
 * screen saying what is about to happen in front of a screen saying nothing
 * is about to happen is the app talking to itself.
 */
export function BeforeYouStart({ id, ready = true, count, children }: {
  /**
   * Which round, by the key `BRIEFINGS` holds it under. The union rather
   * than a string, so a key nobody wrote is a compile error: a briefing that
   * resolves to nothing draws the round straight away, which is a round
   * opening on its first question and looks exactly like one nobody wired.
   */
  id: BriefingId;
  /**
   * Whether there is a round to brief. False draws the children straight
   * away, which is how an empty deck reaches its own empty state.
   */
  ready?: boolean;
  /**
   * How many questions, where the page knows. Drawn as its own quiet line
   * rather than written into the copy, because it is a fact about this
   * learner's deck tonight and the table is the same for everybody.
   */
  count?: { n: number; noun: string } | null;
  children: ReactNode;
}) {
  const brief = briefingFor(id);
  /*
    WHAT IS STORED IS THE PRESS, NOT THE VERDICT.

    Written as `useState(!brief || !ready)` this read `ready` once, on the
    first render, and a round is a server component that re-renders under a
    standing client: grading revalidates the route, and a round that was
    empty when the page opened can have cards by the time it refreshes. Read
    once, that learner got the round with no briefing, because the initial
    state had already decided there was nothing to brief them about. Storing
    the press instead leaves `ready` a live prop, and the screen appears the
    moment there is a round behind it.
  */
  const [pressed, setPressedState] = useState(false);
  /* A screen that replaces itself opens at its own top: the briefing can be
     taller than a phone, and the scroll it took to reach the button would
     otherwise be left standing over the round it hands to. */
  const setPressed = (next: boolean) => {
    setPressedState(next);
    if (next) window.scrollTo({ top: 0 });
  };
  const started = pressed || !brief || !ready;

  useEffect(() => {
    if (started) return;
    function onKey(e: KeyboardEvent) {
      /*
        A KEY AIMED AT A CONTROL IS THAT CONTROL'S.

        The briefing is a screen with the rail, the dock and, inside a module,
        the step's own bar still around it, and Enter on a focused link is how
        a keyboard follows one. Taken bare, this swallowed all of it: tabbing
        to any of the rail's fourteen links and pressing Enter started the
        round instead of going anywhere, because `preventDefault` cancels the
        browser's own activation. That is the fault `lib/ux/advanceKey.ts`
        already records twice, under `b` and under `u`, and the guard is
        `LookBackCard`'s, which leaves anything aimed at a control alone.
      */
      if (!isAdvanceKey(e)) return;
      if (inEditable(e.target)) return;
      if (e.target instanceof Element
        && e.target.closest("button, a, input, textarea, select, [role='button']")) return;
      e.preventDefault();
      setPressed(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]);

  if (started || !brief) return <>{children}</>;

  const plural = count === null || count === undefined
    ? ""
    : count.n === 1 ? count.noun : `${count.noun}s`;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-5 md:py-16" data-briefing={id}>
      {/* The one heading on the screen: the round's own is inside the round,
          which is not mounted yet. Two steps rather than two paragraphs:
          what arrives on the screen, and what the learner does about it,
          each beside a mark that says which of the two it is. */}
      <div
        className="pop-in rounded-[var(--r-xl)] border px-4 py-7 text-center sm:px-6 md:px-8"
        style={{ borderColor: "var(--rule-soft)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <Mascot size={56} className="mx-auto" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          {brief.title}
        </h1>
        {count && count.n > 0 && (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
            {count.n} {plural} in this round
          </p>
        )}
        <ol className="mt-6 flex flex-col gap-2.5 text-left">
          <li className="flex items-start gap-3 rounded-[var(--r-lg)] px-3 py-3 sm:px-4 sm:py-3.5" style={{ background: "var(--raised)" }}>
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "var(--sky-soft)", color: "var(--sky-ink)" }}>
              <Eye size={16} />
            </span>
            <span className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>{brief.what}</span>
          </li>
          <li className="flex items-start gap-3 rounded-[var(--r-lg)] px-3 py-3 sm:px-4 sm:py-3.5" style={{ background: "var(--accent-soft)" }}>
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "var(--surface)", color: "var(--accent-deep)" }}>
              <MousePointerClick size={16} />
            </span>
            <span className="text-base font-semibold leading-relaxed" style={{ color: "var(--ink)" }}>{brief.you}</span>
          </li>
        </ol>
        <div className="mt-7 flex justify-center">
          <Button
            variant="primary"
            size="lg"
            data-briefing-start=""
            onClick={() => setPressed(true)}
          >
            {brief.action} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The same two sentences, for a round that already opens on a screen of its
 * own.
 *
 * Five rounds had one before this existed: the three with a clock, the
 * picture board and the daily quest each draw a card saying what they are
 * and offering a Start. Putting a briefing in front of one of those is two
 * screens before the round, which is a press for nothing, so they read the
 * table here instead and the wording is still one table's. What stays theirs
 * is everything that is a fact about this sitting rather than about the
 * round: how long the clock runs, how many cards are loaded, the personal
 * best.
 */
export function BriefingLines({ id, className = "" }: { id: BriefingId; className?: string }) {
  const brief = briefingFor(id);
  if (!brief) return null;
  return (
    <span className={className} data-briefing-lines={id}>
      {brief.what} {brief.you}
    </span>
  );
}
