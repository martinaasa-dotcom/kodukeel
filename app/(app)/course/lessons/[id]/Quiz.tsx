"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Flame } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceGroup } from "@/components/Choice";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, Meter, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
// By its own module, never the barrel, which imports every lesson the course has.
import { markPhrase, type PracticeItem, type TypedMark } from "@/lib/course/lessons/practice";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { isAdvanceKey } from "@/lib/ux/advanceKey";
import { OPTION_CLASS, optionState, VERDICT_CLASS } from "@/lib/ux/verdict";

/**
 * PRACTICE AND REVIEW: ONE QUESTION AT A TIME, BUILT BY THE SERVER FROM THE
 * LEDGER (`lib/course/lessons/practice.ts`).
 *
 * Five shapes of question, in the order the server puts them: a match to warm
 * up, a meaning picked out by ear or by eye, a line of the conversation with
 * a form taken out (the evening's pattern, asked), what somebody said back,
 * and a meaning typed back in Estonian. The questions arrive already built, so
 * nothing here decides what a learner may be asked.
 *
 * A RUN OF RIGHT ANSWERS IS COUNTED ON THE SCREEN, from three. It is about
 * the learner and it is true, which is what makes it worth a line: never a
 * score, never a penalty, and it starts again quietly on a miss.
 *
 * It grades nothing (the deck is where grades live, ADR-016): a lesson changes
 * nobody's schedule but by finishing it. A hue is never the only thing saying
 * how an answer went: the option wears the app's marking class and the live
 * region says it in words.
 */
export function Quiz({ items, onFinished, onAnswer, summary = true }: {
  items: readonly PracticeItem[];
  /** Called once the last question is answered, with how many were right the first time. */
  onFinished: (score: { right: number; total: number }) => void;
  /** Each answer as it is given, for a check the server marks (`submitCheck`). */
  onAnswer?: (at: number, response: string) => void;
  /** Whether to draw the count of first-time answers at the end; a check draws its own result. */
  summary?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [mark, setMark] = useState<TypedMark | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);
  const [firstTime, setFirstTime] = useState(0);
  const [run, setRun] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  const item = items[Math.min(at, items.length - 1)];
  const answered = item
    ? item.kind === "type" ? mark !== null : item.kind === "match" ? matched !== null : picked !== null
    : false;

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  if (!item) return null;

  const scored = (right: boolean) => {
    if (right) {
      const now = run + 1;
      setFirstTime((n) => n + 1);
      setRun(now);
      setBest((b) => Math.max(b, now));
    } else setRun(0);
  };

  const next = () => {
    if (at >= items.length - 1) {
      setOver(true);
      onFinished({ right: firstTime, total: items.length });
      return;
    }
    setAt((n) => n + 1);
    setPicked(null);
    setTyped("");
    setMark(null);
    setMatched(null);
  };

  if (over && !summary) return null;
  if (over) {
    const all = firstTime === items.length;
    return (
      <div data-lesson-quiz="done">
        <Card tone="sky" className="pop-in">
          <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {fill(t("{n} of {total} right the first time."), { n: String(firstTime), total: String(items.length) })}
          </p>
          <p role="status" className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {all
              ? t("Every one. Carry on when you're ready.")
              : t("The ones you missed come back in the review at the end of the next lesson.")}
          </p>
          {best >= 3 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold" style={{ color: "var(--accent-deep)" }}>
              <Flame size={16} aria-hidden /> {fill(t("Best run: {n} in a row"), { n: String(best) })}
            </p>
          )}
        </Card>
      </div>
    );
  }

  const choose = (option: string, answer: string) => {
    if (picked !== null) return;
    setPicked(option);
    onAnswer?.(at, option);
    const right = option === answer;
    scored(right);
    sound(right ? "right" : "wrong");
  };

  const check = () => {
    if (item.kind !== "type" || mark !== null) return;
    const m = markPhrase(typed, item.accept);
    setMark(m);
    onAnswer?.(at, typed);
    scored(m.verdict === "right");
    sound(m.verdict === "wrong" ? "wrong" : "right");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (answered && isAdvanceKey(e)) {
      e.preventDefault();
      next();
    }
  };

  const heading = {
    hear: t("Listen. What does it mean?"),
    pick: t("What does it mean?"),
    type: t("Say it in Estonian"),
    match: t("Match them up"),
    gap: t("Which word fits?"),
    reply: t("What do they say back?"),
  }[item.kind];

  return (
    <div data-lesson-quiz={at + 1} data-quiz-kind={item.kind} onKeyDown={onKeyDown}>
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Meter pct={(at / items.length) * 100} label={fill(t("Question {n} of {total}"), { n: String(at + 1), total: String(items.length) })} height={6} />
        </div>
        {run >= 3 && (
          <span className="pop-in inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold" style={{ color: "var(--accent-deep)" }} data-quiz-run={run}>
            <Flame size={14} aria-hidden /> {fill(t("{n} in a row"), { n: String(run) })}
          </span>
        )}
      </div>
      <Card>
        <SectionTitle hint={fill(t("{n} of {total}"), { n: String(at + 1), total: String(items.length) })}>{heading}</SectionTitle>

        {item.kind === "hear" && (
          <div className="flex flex-wrap items-center gap-3">
            <Speak key={`${at}-${item.et}`} text={item.et} size={22} autoplay insist label={t("Play it again")} />
            {picked !== null && <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{item.et}</p>}
          </div>
        )}
        {item.kind === "pick" && (
          <div className="flex flex-wrap items-center gap-3">
            <p lang="et" className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{item.et}</p>
            <Speak text={item.et} size={18} />
          </div>
        )}
        {item.kind === "gap" && (
          <div className="flex flex-col gap-2" data-gap>
            <p lang="et" className="text-2xl font-bold leading-snug" style={{ color: "var(--ink)" }}>
              {item.before}
              {picked === null
                ? <span className="mx-0.5 inline-block min-w-[3.5ch] border-b-2 align-baseline" style={{ borderColor: "var(--accent)" }} aria-label={t("a gap")}>&nbsp;</span>
                : <span className="pop-in inline-block" style={{ color: "var(--accent-deep)" }}>{item.answer}</span>}
              {item.after}
            </p>
            <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={item.en} locale={locale} /></p>
            {picked !== null && (
              <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
                <Speak text={`${item.before}${item.answer}${item.after}`} size={15} autoplay /> {t("hear the line")}
              </span>
            )}
          </div>
        )}
        {item.kind === "reply" && (
          <div className="flex flex-col gap-2" data-reply>
            <div className="flex items-start gap-2">
              <Speak key={`${at}-${item.ask.et}`} text={item.ask.et} size={18} autoplay insist label={t("Hear the question")} />
              <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{item.ask.et}</p>
            </div>
            <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={item.ask.en} locale={locale} /></p>
          </div>
        )}

        {item.kind === "match" && (
          <Match key={at} pairs={item.pairs} onDone={(clean) => { setMatched(clean); scored(clean); sound("right"); }} />
        )}

        {(item.kind === "hear" || item.kind === "pick" || item.kind === "gap" || item.kind === "reply") && (
          <ChoiceGroup ariaLabel={item.kind === "gap" ? t("Which word fits") : item.kind === "reply" ? t("What they say back") : t("What it means")} select="one" className="choice-grid mt-4">
            {item.options.map((option) => {
              const state = picked === null ? null : optionState(option === item.answer, option === picked);
              const estonian = item.kind === "gap" || item.kind === "reply";
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === picked}
                  disabled={picked !== null}
                  onClick={() => choose(option, item.answer)}
                  className={`choice-btn rounded-[var(--r-lg)] border px-4 py-3 text-left text-base font-semibold ${state ? OPTION_CLASS[state] : ""}`}
                >
                  {estonian ? <span lang="et">{option}</span> : <LessonText text={option} locale={locale} />}
                </button>
              );
            })}
          </ChoiceGroup>
        )}
        {item.kind === "reply" && picked !== null && (
          <p className="mt-3 text-base" style={{ color: "var(--ink-2)" }}>
            <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{item.answer}</span>{" "}
            <LessonText text={item.answerEn} locale={locale} />
          </p>
        )}

        {item.kind === "type" && (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-xl font-bold" style={{ color: "var(--ink)" }}><LessonText text={item.en} locale={locale} /></p>
            {item.note && <p className="text-base" style={{ color: "var(--ink-2)" }}>{t(item.note)}</p>}
            <input
              lang="et"
              className="field-lg w-full"
              value={typed}
              disabled={mark !== null}
              aria-label={t("Your answer, in Estonian")}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mark === null) {
                  e.preventDefault();
                  e.stopPropagation();
                  check();
                }
              }}
            />
            {mark === null && <div className="under-field"><DiacriticBar /></div>}
            {mark !== null && (
              <div className={`verdict-panel ${VERDICT_CLASS[mark.verdict === "wrong" && mark.close ? "nearly" : mark.verdict]}`}>
                <p>
                  {t(mark.note)}{" "}
                  {mark.verdict !== "right" && (
                    <>
                      {t("It's")} <span lang="et" className="font-bold">{item.answer}</span>
                    </>
                  )}
                </p>
              </div>
            )}
            {mark !== null && (
              <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
                <Speak text={item.answer} size={15} /> {t("hear it")}
              </span>
            )}
          </div>
        )}

        <p role="status" aria-live="polite" className="sr-only">{liveLine(item, picked, mark, matched, t)}</p>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {item.kind === "type" && mark === null ? (
            <Button variant="primary" onClick={check}>
              <Check size={15} aria-hidden /> {t("Check")}
            </Button>
          ) : answered ? (
            <Button ref={nextRef} variant="primary" onClick={next}>
              {at >= items.length - 1 ? t("Done") : t("Next")} <ArrowRight size={15} aria-hidden />
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

/** What the live region says once a question is answered. */
function liveLine(
  item: PracticeItem, picked: string | null, mark: TypedMark | null, matched: boolean | null, t: (s: string) => string,
): string {
  if (item.kind === "type") return mark ? `${t(mark.note)} ${item.answer}` : "";
  if (item.kind === "match") return matched === null ? "" : matched ? t("All matched, first time.") : t("All matched.");
  if (picked === null) return "";
  if (picked === item.answer) return t("Right.");
  return item.kind === "gap" || item.kind === "reply"
    ? fill(t("Not this one. It's {answer}."), { answer: item.answer })
    : fill(t("Not this one. It means {answer}."), { answer: t(item.answer) });
}

/**
 * A MATCH: TAP A WORD, THEN ITS MEANING.
 *
 * The meanings are shuffled off the words themselves, so a board looks the
 * same on the server and in the browser and the same again after a reload.
 * A right pair locks in both, a wrong one shakes and lets go, and the board
 * says it is done once every pair is in. It is right first time only where
 * no pair was tried wrong.
 */
function Match({ pairs, onDone }: { pairs: readonly { et: string; en: string }[]; onDone: (clean: boolean) => void }) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const meanings = useMemo(
    () => shuffle(pairs.map((p) => p.en), rng(seedFrom(`match:${pairs.map((p) => p.et).join("|")}`))),
    [pairs],
  );
  const [chosen, setChosen] = useState<number | null>(null);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [slips, setSlips] = useState(0);
  const finished = done.size === pairs.length;

  const take = (en: string) => {
    if (chosen === null || finished) return;
    if (pairs[chosen]!.en === en) {
      const now = new Set(done).add(chosen);
      setDone(now);
      setChosen(null);
      if (now.size === pairs.length) onDone(slips === 0);
      else sound("right");
    } else {
      setSlips((n) => n + 1);
      setWrong(en);
      sound("wrong");
      window.setTimeout(() => setWrong(null), 450);
    }
  };

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3" data-match>
      <ul className="flex flex-col gap-2" aria-label={t("Estonian")}>
        {pairs.map((pair, i) => {
          const isDone = done.has(i);
          return (
            <li key={pair.et}>
              <button
                type="button"
                lang="et"
                disabled={isDone || finished}
                aria-pressed={chosen === i}
                onClick={() => setChosen(i)}
                className={`choice-btn w-full rounded-[var(--r-lg)] border px-3 py-3 text-left text-base font-bold ${isDone ? OPTION_CLASS.right : ""}`}
                style={chosen === i ? { borderColor: "var(--accent)", boxShadow: "0 0 0 2px var(--accent)" } : undefined}
              >
                {pair.et}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="flex flex-col gap-2" aria-label={t("In English")}>
        {meanings.map((en) => {
          const owner = pairs.findIndex((p) => p.en === en);
          const isDone = done.has(owner);
          return (
            <li key={en}>
              <button
                type="button"
                disabled={isDone || finished || chosen === null}
                onClick={() => take(en)}
                className={`choice-btn w-full rounded-[var(--r-lg)] border px-3 py-3 text-left text-base font-semibold ${isDone ? OPTION_CLASS.right : ""} ${wrong === en ? `${OPTION_CLASS.wrong} shake` : ""}`}
              >
                <LessonText text={en} locale={locale} />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="col-span-2 text-sm" style={{ color: "var(--ink-3)" }}>
        {finished
          ? (slips === 0 ? t("All matched, first time.") : t("All matched."))
          : chosen === null ? t("Tap a word, then what it means.") : t("Now tap what it means.")}
      </p>
    </div>
  );
}
