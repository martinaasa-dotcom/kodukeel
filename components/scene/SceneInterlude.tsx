"use client";

import { useCallback, useEffect, useId, useRef, type CSSProperties } from "react";
import { Button } from "@/components/Button";
import { SceneMotif } from "./SceneMotif";

/**
 * TIME PASSING, DRAWN AS THE ONE THING THAT STOPS THE ROOM.
 *
 * A scene can pick a learner up and put them somewhere else. `poodi-piima`
 * walks them out of their own kitchen and into a shop; the pharmacy sends them
 * to the back of a queue and brings them back twenty minutes later; the café
 * puts a drink on the counter in front of them. Every question after one of
 * those is asked about the new place, and answering it from the old one is
 * wrong in a way the learner has no way to see coming.
 *
 * THE SCREEN HAS NOW SAID THIS THREE WAYS AND THE FIRST TWO DID NOT LAND. It
 * was a grey sentence between two hairlines, which reads as furniture. Then it
 * was a tinted chip that arrived, which is better and is still one more thing
 * arriving on a screen where something arrives every few seconds: a learner who
 * had just been walked to a shop reported, again, that nothing had told them
 * the scene had moved. They were reading the right pixels both times.
 *
 * So the room stops. The conversation is covered, the light gathers into the
 * middle of the screen, an hour is drawn, and the sentence comes up out of a
 * blur into it. Nothing else is on the screen and nothing else can be pressed.
 *
 * THE LEARNER CANNOT TYPE WHILE IT RUNS, AND THAT IS THE POINT RATHER THAN A
 * SIDE EFFECT. A turn typed into a scene that is halfway through moving is a
 * turn answered about the wrong place, and the lines the other side says next
 * are held behind this too (`SceneSession`), so the conversation the learner
 * comes back to is already the new one. The way on is a button rather than a
 * wait: pressing it, or Enter, or Escape, or anywhere on the cover, ends it
 * immediately, because a learner who has read the sentence should never be
 * made to sit through the rest of an animation.
 *
 * IT IS NOT A JAIL AND IT IS NOT A METER. There is no bar filling and no
 * countdown (§7). It clears itself after a hold long enough to read the
 * sentence twice, and under `prefers-reduced-motion` nothing moves at all, the
 * panel is simply there, and the hold is shorter, because a still panel is read
 * in less time than a moving one is watched.
 */

/** Long enough to read the sentence twice, and not long enough to wait through. */
const HOLD_MS = 3_200;
/** Nothing is moving, so nothing has to be waited out. */
const STILL_MS = 1_600;
/**
 * How long the cover takes to fade once it has been read, so the caller can
 * hold it on screen for exactly that long.
 *
 * The fade is `.scene-veil-out` in `app/globals.css` and this is how long the
 * cover stays mounted for it, which is one number written in two places
 * because a class cannot tell a component how long it runs. They have to
 * agree: shorter here and the cover is cut away mid-fade, longer and the
 * conversation waits behind a cover nobody can see any more.
 *
 * The lines said after the move are appended underneath *before* this runs, so
 * what comes through the fade is already the new place rather than the old one
 * with a beat of nothing in between.
 */
export const VEIL_OUT_MS = 300;
export function SceneInterlude({ sceneId, text, onDone }: {
  /** The room being moved into, for the mark at the end of the journey. */
  sceneId: string;
  text: string;
  onDone: () => void;
}) {
  const labelled = useId();
  const carryOn = useRef<HTMLButtonElement>(null);
  /*
    Called once, whatever happens. The hold can finish while a press is in
    flight, and two calls would resume the conversation twice: the lines held
    behind this would be appended a second time, which is the other side saying
    everything again.
  */
  const spent = useRef(false);
  const cover = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    if (spent.current) return;
    spent.current = true;
    /*
      The cover fades rather than cutting, and the conversation is handed back
      at the same moment rather than after: the caller appends the lines said in
      the new place and then clears this after `VEIL_OUT_MS`, so what comes
      through the fade is the new place rather than the old one.
    */
    cover.current?.classList.add("scene-veil-out");
    onDone();
  }, [onDone]);

  useEffect(() => {
    const still = typeof matchMedia === "function"
      && matchMedia("(prefers-reduced-motion: reduce)").matches;
    /*
      Focus moves here, which is the one place in this app that takes it: the
      screen has stopped for a moment that has to be read, and a learner on a
      keyboard whose caret is still in a box they cannot type into has been
      told nothing at all. It goes back to the box when the conversation
      resumes (`SceneSession`).
    */
    carryOn.current?.focus({ preventScroll: true });
    const at = window.setTimeout(finish, still ? STILL_MS : HOLD_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(at);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  return (
    <div
      ref={cover}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelled}
      onClick={() => finish()}
      className="scene-veil fixed inset-0 z-[120] flex items-center justify-center px-6"
      style={{ background: "var(--ground)" }}
    >
      {/* The light gathering behind the words. Decorative: everything it says
          is said in the sentence it is drawn behind. */}
      <div
        aria-hidden
        className="scene-bloom pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 42% at 50% 46%, var(--accent-soft), transparent 70%),"
            + " radial-gradient(80% 55% at 50% 118%, var(--wash-3), transparent 66%)",
        }}
      />

      <div className="relative flex w-full max-w-lg flex-col items-center gap-5 text-center">
        {/*
          AN HOUR GOING ROUND, AND THEN THE PLACE IT WENT ROUND INTO.

          The sentence says both halves ("five minutes later, and you are in
          the shop now") and this is the same two halves drawn: time on the
          left, a short journey between them, the room on the right. It is the
          scene's own mark, the one on the bar the learner has been looking at
          for the whole conversation, so arriving at it reads as arriving
          somewhere they know they are.

          Decoration throughout. Everything it carries is in the sentence
          underneath, which is what lets the lot of it be hidden from a reader.
        */}
        <span className="flex items-center gap-4">
          <Dial />
          <span aria-hidden className="relative block h-1 w-16 rounded-full" style={{ background: "var(--accent-soft)" }}>
            {[1, 2].map((at) => (
              <span
                key={at}
                className={`amb-travel amb-${at} absolute -top-1 left-1/2 h-3 w-3 rounded-full`}
                style={{ background: "var(--accent)", opacity: 0 }}
              />
            ))}
          </span>
          <span className="scene-place block">
            <SceneMotif sceneId={sceneId} size="sm" />
          </span>
        </span>

        {/* Two rules drawing out from the middle, which is the thread of the
            conversation opening to let something through. */}
        <span
          aria-hidden
          className="scene-thread h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, var(--rule), transparent)" }}
        />

        <p className="scene-told label-xs" style={{ color: "var(--accent-deep)", "--told-at": 0 } as CSSProperties}>
          Time passes
        </p>

        <p
          id={labelled}
          className="scene-told text-2xl font-bold leading-tight md:text-3xl"
          style={{ color: "var(--ink)", "--told-at": 1 } as CSSProperties}
        >
          {text}
        </p>

        <p className="scene-place text-sm" style={{ color: "var(--ink-2)" }}>
          The rest of the conversation happens here.
        </p>

        <span
          aria-hidden
          className="scene-thread h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, var(--rule), transparent)" }}
        />

        {/*
          The one thing to press, and the only loud thing on the screen while
          this is up. It carries the whole gesture: the cover, Enter, Escape
          and anywhere else all end it too, and none of those is discoverable
          by looking.
        */}
        <Button ref={carryOn} variant="primary" size="lg" onClick={() => finish()}>
          Carry on
        </Button>
      </div>
    </div>
  );
}

/**
 * An hour going round once.
 *
 * Not a clock face with numbers on it, which would be this screen claiming a
 * time the scene never dealt. It is the shape of time passing and nothing more:
 * a ring, a hand, and one turn.
 */
function Dial() {
  return (
    <span
      aria-hidden
      className="scene-dial flex h-20 w-20 items-center justify-center rounded-full"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}
    >
      <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none">
        <circle cx="24" cy="24" r="20" stroke="var(--rule)" strokeWidth="2" />
        <circle
          cx="24" cy="24" r="20"
          stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="126" strokeDashoffset="94"
          transform="rotate(-90 24 24)"
        />
        <g className="scene-hand">
          <line x1="24" y1="24" x2="24" y2="11" stroke="var(--accent-deep)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="24" cy="24" r="2.5" fill="var(--accent-deep)" />
      </svg>
    </span>
  );
}
