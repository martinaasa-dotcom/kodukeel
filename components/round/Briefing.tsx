"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, MousePointerClick } from "lucide-react";
import { Button } from "@/components/Button";
import { KeyCap } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { briefingFor, type BriefingId } from "@/lib/copy/briefings";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill, tr } from "@/lib/copy/locale";

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
  const locale = useLocale();
  const t = (english: string) => tr(locale, english);
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


  return (
    <div className="round-brief mx-auto max-w-lg px-4 sm:px-5" data-briefing={id} lang={locale}>
      {/* The one heading on the screen: the round's own is inside the round,
          which is not mounted yet. Two steps rather than two paragraphs:
          what arrives on the screen, and what the learner does about it,
          each beside a mark that says which of the two it is. Every vertical
          figure follows the window (`.round-brief` in globals.css), so the
          button is on screen on a laptop rather than under the fold. */}
      <div className="round-brief-panel night pop-in rounded-[var(--r-xl)] border text-center">
        <Mascot size={44} className="mx-auto" />
        <h1 className="round-brief-title round-brief-gap font-display font-bold tracking-tight" style={{ color: "var(--ink)", textWrap: "balance" }}>
          {t(brief.title)}
        </h1>
        {count && count.n > 0 && (
          <p className="mt-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
            {fill(t("{count} in this round"), { count: countOf(locale, count.n, count.noun) })}
          </p>
        )}
        <BriefingSteps what={t(brief.what)} you={t(brief.you)} className="round-brief-gap" />
        <div className="round-brief-gap flex justify-center">
          <Button
            variant="primary"
            data-briefing-start=""
            onClick={() => setPressed(true)}
          >
            {t(brief.action)} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The two marked steps on their own: what arrives on the screen beside an eye,
 * and what the learner does about it beside a pointer.
 *
 * The briefing draws them, and so do the start screens a timed round or a
 * board opens on, which used to put the same two sentences in one centred
 * paragraph with a third sentence run on after them. On a night panel a
 * paragraph is the one thing that reads as a wall; two marked steps are what
 * every other round opens on, so the four that differed now look the same.
 * `more` is a fact about this round that belongs with what to do, such as
 * which key flips a card, and it rides at the end of the second step.
 */
export function BriefingSteps({ id, what, you, more, className = "" }: {
  id?: BriefingId;
  what?: string;
  you?: string;
  more?: ReactNode;
  className?: string;
}) {
  const brief = id ? briefingFor(id) : null;
  const t = useT();
  const first = what ?? (brief ? t(brief.what) : undefined);
  const second = you ?? (brief ? t(brief.you) : undefined);
  if (!first || !second) return null;
  return (
    <ol className={`flex flex-col gap-2 text-left ${className}`} data-briefing-lines={id}>
      <li className="flex items-start gap-3 rounded-[var(--r-lg)] px-3 py-2.5 sm:px-3.5" style={{ background: "rgb(255 255 255 / 0.06)", border: "1px solid rgb(255 255 255 / 0.1)" }}>
        <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: "var(--sky)", color: "var(--on-hue)" }}>
          <Eye size={14} />
        </span>
        <span className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{first}</span>
      </li>
      <li className="flex items-start gap-3 rounded-[var(--r-lg)] px-3 py-2.5 sm:px-3.5" style={{ background: "rgb(255 255 255 / 0.1)", border: "1px solid rgb(255 255 255 / 0.16)" }}>
        <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: "var(--cta)", color: "var(--on-hue)" }}>
          <MousePointerClick size={14} />
        </span>
        <span className="text-sm font-semibold leading-relaxed" style={{ color: "var(--ink)" }}>
          {second}{more && <> {more}</>}
        </span>
      </li>
    </ol>
  );
}
