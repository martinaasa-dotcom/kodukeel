"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceGroup } from "@/components/Choice";
import { Card, KeyCap, SectionTitle } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { useFeedbackSound } from "@/components/AudioPrefs";
import type { TryItAsk } from "@/lib/course/tryIt";
import { OPTION_CLASS, optionState } from "@/lib/ux/verdict";

/**
 * THE READING ASKS BACK, AND IT IS A GAME RATHER THAN A TEST.
 *
 * Three questions under the table the page just showed, each about one cell
 * of it, each a tap. The table stays on the screen above, so the answer is
 * always there to be looked up, which is exactly the point: this is the
 * reading being used a moment after it was read, not a test of whether it
 * stuck. Somebody who looks up is doing the thing the page is for.
 *
 * IT GRADES NOTHING AND MAY NOT. Every answer is printed above, so a row in
 * the review log would tell the scheduler somebody recalled a form they were
 * looking at. `lib/course/tryIt.ts` says so at length; this file reaches no
 * Server Action and no outbox, and `scripts/test-invariants.ts` holds it there.
 *
 * A HUE IS NEVER THE ONLY THING SAYING WHICH STATE AN OPTION IS IN. The
 * picked and the right option wear the app's own marking classes, and the
 * live region says the correction in words, with `lang` on the Estonian in
 * it so a screen reader says it as Estonian.
 *
 * And it ends. Three questions and a sentence, and the only way on is the
 * frame's own button at the foot of the screen, which is what keeps the
 * reading a two-minute step rather than a round.
 */
export function TryIt({ asks }: { asks: readonly TryItAsk[] }) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [rightSoFar, setRightSoFar] = useState(0);
  const [over, setOver] = useState(false);
  const sound = useFeedbackSound();

  if (asks.length === 0) return null;
  const ask = asks[Math.min(at, asks.length - 1)]!;
  const last = at >= asks.length - 1;

  const pick = (option: string) => {
    if (picked !== null) return;
    setPicked(option);
    const right = option === ask.answer;
    if (right) setRightSoFar((n) => n + 1);
    sound(right ? "right" : "wrong");
  };

  const next = () => {
    if (last) { setOver(true); return; }
    setAt((n) => n + 1);
    setPicked(null);
  };

  if (over) {
    /*
      One sentence about what happened, in the learner's terms, and no score
      out of three: three taps with the table on the screen is not a result
      anybody needs printed. What it says instead is the thing the taps were
      for.
    */
    return (
      <div data-try-it="done">
      <Card tone="mint">
        <div className="flex items-start gap-3">
          <Sparkles size={20} aria-hidden style={{ color: "var(--good-ink)" }} />
          <div className="min-w-0">
            <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              That is the whole point, and you just used it.
            </p>
            <p role="status" className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
              {rightSoFar === asks.length
                ? "Every one of those was right. The rounds after this ask the same thing on tonight's words."
                : "The table above is the thing to glance at when a form looks odd. It will look less odd tomorrow."}
            </p>
          </div>
        </div>
      </Card>
      </div>
    );
  }

  return (
    /* The hook is on a wrapper because `Card` takes a fixed prop list and
       drops anything else, which is the fault `StepList` records about its
       own marker. */
    <div data-try-it={at + 1}>
    <Card>
      <SectionTitle hint={`${at + 1} of ${asks.length}, nothing is scored`}>Try it</SectionTitle>
      <p className="mt-2 text-lg font-bold" style={{ color: "var(--ink)" }}>
        <Prompt ask={ask} />
      </p>

      <ChoiceGroup
        ariaLabel="Which form"
        select="one"
        className="choice-grid mt-4"
      >
        {ask.options.map((option, i) => {
          const state = picked === null ? null : optionState(option === ask.answer, option === picked);
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === picked}
              disabled={picked !== null}
              onClick={() => pick(option)}
              className={`choice-btn flex items-center gap-3 rounded-[var(--r-lg)] px-4 py-3 text-left ${state ? OPTION_CLASS[state] : ""}`}
            >
              <KeyCap>{i + 1}</KeyCap>
              <span lang="et" className="text-lg font-bold">{option}</span>
            </button>
          );
        })}
      </ChoiceGroup>

      <p role="status" aria-live="polite" className="mt-4 text-base" style={{ color: "var(--ink-2)" }}>
        {picked === null ? "" : (
          <Estonianised text={picked === ask.answer ? ask.yes : ask.no} words={ask.options} />
        )}
      </p>

      {picked !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {/* The form heard once, right after it was picked: the one moment a
              beginner wants the sound of a word is when it has just surprised
              them. */}
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
            <Speak text={ask.answer} size={15} /> hear it
          </span>
          <Button variant="primary" onClick={next}>
            {last ? "Done" : "Next"} <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      )}
    </Card>
    </div>
  );
}

/** The prompt with the word it is about set as Estonian. */
function Prompt({ ask }: { ask: TryItAsk }) {
  return <Estonianised text={ask.prompt} words={[ask.about]} />;
}

/**
 * A sentence of English with the Estonian words in it marked `lang="et"`.
 *
 * The builder writes plain strings, because it is pure and holds no markup;
 * the screen is where a word gets its language. It marks the words it was
 * told about and nothing else, so an English word that happens to be spelled
 * like an Estonian one is left alone.
 */
function Estonianised({ text, words }: { text: string; words: readonly string[] }) {
  const marks = [...words].sort((a, b) => b.length - a.length).filter(Boolean);
  if (marks.length === 0) return <>{text}</>;
  /*
    Whole words only, and not with `\b`, which is ASCII and finds no boundary
    between a space and an õ: `on` is the whole of `olema` for `ta` and is
    also inside "one" and "Not", so a bare match marked half the sentence.
  */
  const pattern = new RegExp(`(?<!\\p{L})(${marks.map(escape).join("|")})(?!\\p{L})`, "gu");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        marks.includes(part)
          ? <span key={i} lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{part}</span>
          : <span key={i}>{part}</span>,
      )}
    </>
  );
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
