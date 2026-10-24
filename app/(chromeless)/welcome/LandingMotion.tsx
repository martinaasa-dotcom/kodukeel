"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAwake } from "@/components/motion/useAwake";
import { PARTS } from "@/lib/copy/values";
import { useT, useWholeLanguage } from "@/components/Locale";
import { TrParts } from "@/components/TrParts";
import { FitText } from "@/components/FitText";
import { LETTER_SCATTER_EVENT } from "@/lib/ux/letterMotion";
import { stepsWithin } from "@/lib/ux/rest";
import type { DemoWord } from "./LandingDemo";

/**
 * One word, turning through its cases, under the headline.
 *
 * The page's claim is that a handful of stored forms and a set of regular
 * endings carry most of Estonian, and a headline can only assert that. This
 * shows it: the forms are the ones the case explorer below is built from,
 * read out of the dictionary and the app's own derivation on the server, so
 * nothing here is typed. The English under each is the question the case
 * answers, off `lib/estonian/cases.ts`.
 *
 * It is a picture of the explorer rather than a control, so the moving part
 * is hidden from a screen reader and one static sentence says the same
 * thing. It stops on hover, on focus inside the page's own card and for
 * anybody who asked for less movement, where it shows the first form and
 * holds it.
 *
 * And it rests on its own within five seconds of starting (WCAG 2.2.2,
 * `lib/ux/rest.ts`): the turns that fit in that time, then the form it
 * reached stays up. A press still deals the next one, because then somebody
 * asked for it.
 */
/** How often the card turns while it is turning by itself. */
const TURN_MS = 1700;
export function HeroWord({ words }: { words: DemoWord[] }) {
  const t = useT();
  // A press here can draw a line the page did not arrive with. See components/Locale.tsx.
  const reach = useWholeLanguage();
  const frames = useMemo(
    () =>
      words.flatMap((w) =>
        w.cases
          .filter((c) => !c.principal && c.singular && c.english)
          .map((c) => ({
            lemma: w.lemma,
            form: (c.singular ?? "").split(PARTS)[0] ?? "",
            question: c.english ?? null,
          })),
      ),
    [words],
  );
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  /** Bumped on every tap, so the timer restarts and the card gives under the press. */
  const [taps, setTaps] = useState(0);

  /* The card turns once the page has settled, with the brand's idle loops
     (components/motion/useAwake.ts): until then it holds its first form,
     which is what it shows anybody who asked for less movement anyway. */
  const awake = useAwake();
  /** Turns the card has taken by itself, which are spent once and never given back. */
  const turned = useRef(0);
  const [rested, setRested] = useState(false);

  useEffect(() => {
    if (frames.length < 2 || held || !awake || rested) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;
    const id = window.setInterval(() => {
      turned.current += 1;
      setI((n) => (n + 1) % frames.length);
      if (turned.current >= stepsWithin(TURN_MS)) setRested(true);
    }, TURN_MS);
    return () => window.clearInterval(id);
  }, [frames.length, held, taps, awake, rested]);

  /*
    A TAP DEALS THE NEXT FORM. The card was a picture of the machine and the
    one thing on the first screen a hand reaches for; pressing it and having
    nothing happen reads as broken. So it is a button: each press shows the
    next ending on the stem, restarts the clock, and throws the page's
    letters, which is the same thing the builder further down does.
  */
  const next = () => {
    setI((n) => (n + 1) % Math.max(1, frames.length));
    setTaps((n) => n + 1);
    document.dispatchEvent(new CustomEvent(LETTER_SCATTER_EVENT));
  };

  const frame = frames[i % Math.max(1, frames.length)];
  const siblings = frames.filter((f) => f.lemma === frame?.lemma).map((f) => f.form);
  if (!frame) return null;
  const first = frames[0]!;

  return (
    <div
      {...reach}
      className="hero-word"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <p className="sr-only">
        <TrParts
          template="For example, {lemma} becomes {form}, {question}"
          parts={{
            lemma: <span lang="et">{first.lemma}</span>,
            form: <span lang="et">{first.form}</span>,
            question: first.question,
          }}
        />
      </p>
      {/* What a press just dealt, said once, for somebody who cannot see the card. */}
      <p className="sr-only" aria-live="polite">
        {taps > 0 && <><span lang="et">{frame.form}</span>, {frame.question}</>}
      </p>
      {/* Spans rather than divs inside it: a button holds phrasing content only. */}
      <button
        type="button"
        onClick={next}
        className="hero-word-press"
      >
      {/*
        Named by text inside it rather than an `aria-label` over it: the card
        under it is a word on show, not the button's label, and a name laid
        over visible text has to carry that text (WCAG 2.5.3).
      */}
      <span className="sr-only">{t("Show the next ending on this word")}</span>
      {/*
        The card is a sticker on a sticker: a coral one tilted behind it and the
        word on top, so the thing the page is about is the most physical object
        on the screen. The bar under the question fills while a form is up and
        restarts with the next one, which is the only clock on it; it stops with
        the word under a pointer and for anybody who asked for less movement.
      */}
      <span aria-hidden className="hero-word-stack">
        <span className="hero-word-back" />
        <span className="hero-word-card">
          <span className="hero-word-top">
            <span className="hero-word-label">{t("The word")}</span>
            <span lang="et" className="hero-word-lemma">{frame.lemma}</span>
          </span>
          <FitText
            key={`${frame.lemma}-${frame.form}`}
            text={frame.form}
            steadyFor={siblings}
            max="var(--text-6xl)"
            lang="et"
            className="hero-word-form"
          />
          <span key={`q-${i}`} className="hero-word-question">{frame.question}</span>
          <span className="hero-word-track">
            <span key={`t-${i}`} className="hero-word-tick" data-held={held || !awake || rested ? "" : undefined} />
          </span>
        </span>
      </span>
      </button>
      <p className="hero-word-hint" aria-hidden>{t("Tap it to try the next ending")}</p>
    </div>
  );
}
