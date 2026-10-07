"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { shuffle } from "@/lib/random/shuffle";
import { rng } from "@/lib/random/seeded";
import { OPTION_CLASS, VERDICT_CLASS, optionState } from "@/lib/ux/verdict";
import { FitText } from "@/components/FitText";
import { countOf, fill } from "@/lib/copy/locale";
import { useLocale, useT } from "@/components/Locale";
import { TrParts } from "@/components/TrParts";

export interface EveningWord {
  readonly et: string;
  readonly en: string;
}

export interface EveningStep {
  readonly title: string;
  readonly minutes: number;
  readonly why: string;
}

/**
 * THE FIRST SIX MINUTES OF EVENING ONE, ON THE PAGE.
 *
 * The course promises fifteen minutes an evening and one button to press,
 * and a visitor has no way to know what is behind the button. So the first
 * step of the first evening is here, in the order the app runs it: the five
 * words met, then each picked out of four a moment later. The words and their
 * English are the dictionary's, read on the server off the programme's own
 * first day (`lib/course`), so this is the same evening the button opens and
 * not a demonstration written for the page. Nothing is graded or stored; a
 * card that is picked here is still new inside.
 */
export function FirstEvening({ words, steps, title, canDo, evenings }: {
  words: readonly EveningWord[];
  steps: readonly EveningStep[];
  title: string;
  canDo: string;
  evenings: number;
}) {
  const t = useT();
  const locale = useLocale();
  const [stage, setStage] = useState<"meet" | "pick" | "done">("meet");
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [round, setRound] = useState(0);

  // The order the words are asked in and the four options each time, fixed per round.
  const questions = useMemo(() => {
    const random = rng(1000 + round);
    return shuffle(words, random).map((w) => ({
      word: w,
      options: shuffle([...shuffle(words.filter((o) => o.en !== w.en), random).slice(0, 3), w], random),
    }));
  }, [words, round]);

  const minutes = steps.reduce((n, s) => n + s.minutes, 0);
  const q = questions[at];

  const choose = (en: string) => {
    if (picked || !q) return;
    setPicked(en);
    if (en === q.word.en) setRight((n) => n + 1);
  };
  const onward = () => {
    setPicked(null);
    if (at + 1 < questions.length) setAt(at + 1);
    else setStage("done");
  };
  const again = () => {
    setRound((n) => n + 1);
    setAt(0);
    setRight(0);
    setPicked(null);
    setStage("meet");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      {/* The evening, as its steps, with the minutes added up rather than promised. */}
      <ol className="evening-steps flex flex-col gap-2">
        {steps.map((step, n) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-[var(--r-lg)] border p-4"
            data-now={n === 0 ? "" : undefined}
            style={{ background: n === 0 ? "var(--accent-soft)" : "var(--surface)", borderColor: "var(--edge)" }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: n === 0 ? "var(--accent-deep)" : "var(--raised)", color: n === 0 ? "var(--accent-ink)" : "var(--ink-2)" }}
            >
              {n + 1}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-md font-semibold" style={{ color: "var(--ink)" }}>{step.title}</span>
                <span className="text-sm" style={{ color: "var(--ink-3)" }}>{fill(t("{n} min"), { n: step.minutes })}</span>
              </span>
              <span className="mt-1 block text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{step.why}</span>
            </span>
          </li>
        ))}
        <li className="px-1 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
          {fill(t("{minutes} minutes, and then you’re done for the night. {evenings} evenings like this one take you all the way to C1."), {
            // Russian and Ukrainian take the noun's form from the number, so
            // there the template holds no noun and is handed the counted phrase.
            minutes: locale === "en" ? minutes : countOf(locale, minutes, "minute"),
            evenings: locale === "en"
              ? evenings.toLocaleString("en-GB")
              : countOf(locale, evenings, "evening").replace(String(evenings), evenings.toLocaleString(locale)),
          })}
        </li>
      </ol>

      {/* The first step, playable. */}
      {/* First on a phone: the thing to press, then the steps it belongs to. */}
      <div className="evening-play night order-first flex flex-col gap-4 rounded-[var(--r-xl)] border p-5 md:p-7 lg:order-none">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="label-xs" style={{ color: "var(--cta)" }}>{t("Evening one, step one")}</p>
          <p lang="et" className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{title}</p>
        </div>

        {stage === "meet" && (
          <>
            <p className="text-md font-semibold" style={{ color: "var(--ink)" }}>{canDo}</p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {words.map((w, n) => (
                <li
                  key={w.et}
                  className="evening-word flex items-baseline justify-between gap-3 rounded-[var(--r)] px-4 py-3"
                  style={{ "--i": n } as React.CSSProperties}
                >
                  <span lang="et" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{w.et}</span>
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>{w.en}</span>
                </li>
              ))}
            </ul>
            <div>
              <Button type="button" variant="primary" onClick={() => setStage("pick")}>
                {t("Got them, now quiz me")} <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </>
        )}

        {stage === "pick" && q && (
          <>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {fill(t("Now they come back one at a time. Pick what each one means. {n} of {all}"), { n: at + 1, all: questions.length })}
            </p>
            <FitText as="p" text={q.word.et} max="var(--text-4xl)" lang="et" className="font-display font-bold" style={{ color: "var(--ink)" }} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label={t("What it means")}>
              {q.options.map((o) => {
                const state = picked ? optionState(o.en === q.word.en, o.en === picked) : null;
                return (
                  <button
                    key={o.en}
                    type="button"
                    disabled={Boolean(picked)}
                    onClick={() => choose(o.en)}
                    className={`choice-btn flex items-center justify-between gap-2 rounded-[var(--r)] border px-4 py-3 text-left text-base font-semibold ${state ? OPTION_CLASS[state] : ""}`}
                  >
                    {o.en}
                    {state === "right" && <Check size={17} aria-hidden />}
                  </button>
                );
              })}
            </div>
            <p aria-live="polite" className={picked ? `verdict-panel ${VERDICT_CLASS[picked === q.word.en ? "right" : "wrong"]}` : "sr-only"}>
              {picked ? (picked === q.word.en ? t("That’s the one.") : (
                <TrParts
                  template="Not quite. {word} means {meaning}. It’ll come round again soon."
                  parts={{ word: <span lang="et">{q.word.et}</span>, meaning: q.word.en }}
                />
              )) : ""}
            </p>
            {picked && (
              <div>
                <Button type="button" variant="primary" onClick={onward}>
                  {at + 1 < questions.length ? t("Next word") : t("See how it went")} <ArrowRight size={16} aria-hidden />
                </Button>
              </div>
            )}
          </>
        )}

        {stage === "done" && (
          <>
            <p className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>
              {fill(t("{right} out of {all}, just a minute after meeting them."), { right, all: words.length })}
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {t("And that’s the first step of your first evening. Inside, the ones you missed come back sooner, and the ones you got come back just before you’d forget them.")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={again} className="tap-tint inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
                <RotateCcw size={15} aria-hidden /> {t("Try it again")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
