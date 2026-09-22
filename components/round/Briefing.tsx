"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { KeyCap } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import { briefingFor, type Briefing } from "@/lib/copy/briefings";

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
  /** Which round, by the key `BRIEFINGS` holds it under. */
  id: string;
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
  const [started, setStarted] = useState(!brief || !ready);

  useEffect(() => {
    if (started) return;
    function onKey(e: KeyboardEvent) {
      if (!isAdvanceKey(e)) return;
      e.preventDefault();
      setStarted(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]);

  if (started || !brief) return <>{children}</>;

  const plural = count && count.n === 1 ? count.noun : count ? `${count.noun}s` : "";

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 md:px-10" data-briefing={id}>
      {/* The one heading on the screen: the round's own is inside the round,
          which is not mounted yet. */}
      <div className="pop-in text-center">
        <Mascot size={72} className="mx-auto" />
        <h1 className="mt-5 text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          {brief.title}
        </h1>
        <p className="mx-auto mt-3 max-w-[46ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {brief.what}
        </p>
        <p className="mx-auto mt-2 max-w-[46ch] text-base leading-relaxed font-semibold" style={{ color: "var(--ink)" }}>
          {brief.you}
        </p>
        {count && count.n > 0 && (
          <p className="mt-4 text-sm" style={{ color: "var(--ink-3)" }}>
            {count.n} {plural} in this round.
          </p>
        )}
      </div>
      <div className="mt-8 flex justify-center">
        <Button
          variant="primary"
          size="lg"
          data-briefing-start=""
          onClick={() => setStarted(true)}
        >
          {brief.action} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
        </Button>
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
export function BriefingLines({ id, className = "" }: { id: string; className?: string }) {
  const brief = briefingFor(id);
  if (!brief) return null;
  return (
    <span className={className} data-briefing-lines={id}>
      {brief.what} {brief.you}
    </span>
  );
}

export type { Briefing };
