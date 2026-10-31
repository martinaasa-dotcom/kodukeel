"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, Check, Flame } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceGroup } from "@/components/Choice";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { fillNodes } from "@/components/TemplateNodes";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { WordLink } from "@/components/course/WordLink";
import { Card, Meter, SectionTitle } from "@/components/ui";
import { fill, type Locale } from "@/lib/copy/locale";
// By its own module, never the barrel, which imports every lesson the course has.
import { isTyped, markTyped, type PracticeItem, type TypedMark } from "@/lib/course/lessons/practice";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { isAdvanceKey, onOwnControl } from "@/lib/ux/advanceKey";
import { OPTION_CLASS, optionState, VERDICT_CLASS } from "@/lib/ux/verdict";

/**
 * PRACTICE AND REVIEW: ONE QUESTION AT A TIME, BUILT BY THE SERVER FROM THE
 * LEDGER (`lib/course/lessons/practice.ts`).
 *
 * Eight shapes of question, in the order the server puts them: a match to
 * warm up, a meaning picked out by ear or by eye, a line of the conversation
 * with a form taken out (the evening's pattern, asked), what somebody said
 * back, a meaning typed back in Estonian, at B1 a sentence changed into
 * another and a line put right, and at B2 a new word worked out from parts
 * the learner has (`WorkOut`), its meaning picked before its parts are shown.
 * The questions arrive already built, so
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
export function Quiz({ items, onFinished, onAnswer, summary = true, review = false, level = 2 }: {
  items: readonly PracticeItem[];
  /** Called once the last question is answered, with how many were right the first time. */
  onFinished: (score: { right: number; total: number }) => void;
  /** Each answer as it is given, for a check the server marks (`submitCheck`). */
  onAnswer?: (at: number, response: string) => void;
  /** Whether to draw the count of first-time answers at the end; a check draws its own result. */
  summary?: boolean;
  /** This is the lesson's review, so the summary does not send the learner to "the review" for what slipped. */
  review?: boolean;
  /** 3 inside a lesson's step, whose own heading is the h2. */
  level?: 2 | 3;
}) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  // Which question's clip has played, and which one's would not load: keyed on the question, so the next one starts fresh.
  const [heardAt, setHeardAt] = useState(-1);
  const [silentAt, setSilentAt] = useState(-1);
  const heardOnce = heardAt === at;
  const silent = silentAt === at;
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
    ? isTyped(item) ? mark !== null : item.kind === "match" ? matched !== null : picked !== null
    : false;

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);
  /* A typed question after another question takes the caret into its box, so
     the Enter that pressed Next does not land on Check over an empty box and
     mark it wrong. Not on the first question: arriving is not moving on. */
  const boxRef = useRef<HTMLInputElement>(null);
  // A question with no box takes the caret to its heading instead, or Next's going leaves it on the page.
  const questionRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(at);
  useEffect(() => {
    if (shownAt.current === at) return;
    shownAt.current = at;
    (boxRef.current ?? questionRef.current)?.focus();
  }, [at]);
  // The summary replaces the question whose Done was pressed, so the caret goes to it and it is read.
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (over) summaryRef.current?.focus();
  }, [over]);

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
      <div data-lesson-quiz="done" ref={summaryRef} tabIndex={-1} className="outline-none">
        <Card tone="sky" className="pop-in">
          <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {fill(t("{n} of {total} right the first time."), { n: String(firstTime), total: String(items.length) })}
          </p>
          <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
            {all
              ? t("Every one. Carry on when you're ready.")
              : review ? t("The ones that slipped come round again in a later review.") : t("Earlier words come back in the review at the end of each lesson.")}
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
    if (!isTyped(item) || mark !== null) return;
    const m = markTyped(item, typed);
    setMark(m);
    onAnswer?.(at, typed);
    scored(m.verdict === "right");
    sound(m.verdict === "wrong" ? "wrong" : "right");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // A speaker or Next that has the keyboard presses itself (`onOwnControl`).
    if (answered && isAdvanceKey(e) && !onOwnControl(e.target)) {
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
    rework: t("Change the sentence"),
    fix: t("Put it right"),
    workOut: t("Work it out"),
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
        {/* Where the caret goes on a new question with no box: its heading, which says what is asked and which question this is. */}
        <div ref={questionRef} tabIndex={-1} className="outline-none">
          <SectionTitle level={level} hint={fill(t("{n} of {total}"), { n: String(at + 1), total: String(items.length) })}>{heading}</SectionTitle>
        </div>

        {item.kind === "hear" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Played once on arrival where the learner has autoplay on, and a press away where not. A clip that will not load shows the words instead, so the question can still be answered. */}
            <Speak
              key={`${at}-${item.et}`}
              text={item.et}
              size={22}
              autoplay
              label={heardOnce ? t("Play it again") : t("Play it")}
              onPlay={() => setHeardAt(at)}
              onUnavailable={() => setSilentAt(at)}
            />
            {silent && picked === null && <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("The sound didn't come through, so here it is written.")}</p>}
            {(picked !== null || silent) && <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{item.et}</p>}
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
                ? <><span className="mx-0.5 inline-block min-w-[3.5ch] border-b-2 align-baseline" style={{ borderColor: "var(--accent)" }} aria-hidden>&nbsp;</span><span className="sr-only" lang={locale}>{t("a gap")}</span></>
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
              <Speak key={`${at}-${item.ask.et}`} text={item.ask.et} size={18} autoplay label={t("Hear the question")} />
              <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{item.ask.et}</p>
            </div>
            <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={item.ask.en} locale={locale} /></p>
          </div>
        )}

        {item.kind === "workOut" && <WorkOutSentence item={item} answered={picked !== null} />}

        {item.kind === "match" && (
          <Match key={at} pairs={item.pairs} onDone={(clean) => { setMatched(clean); scored(clean); sound("right"); }} />
        )}

        {(item.kind === "hear" || item.kind === "pick" || item.kind === "gap" || item.kind === "reply" || item.kind === "workOut") && (
          <ChoiceGroup ariaLabel={item.kind === "gap" ? t("Which word fits") : item.kind === "reply" ? t("What they say back") : t("What it means")} select="one" answer className="choice-grid mt-4">
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

        {item.kind === "workOut" && picked !== null && <WorkOutParts item={item} />}

        {(item.kind === "rework" || item.kind === "fix") && (
          <div className="mt-2 flex flex-col gap-3" data-rework={item.kind}>
            {item.kind === "rework" ? (
              <>
                <div className="flex items-start gap-2">
                  <Speak key={`${at}-${item.from.et}`} text={item.from.et} size={18} label={t("Hear the sentence")} />
                  <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{item.from.et}</p>
                </div>
                <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={item.from.en} locale={locale} /></p>
                <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}><LessonText text={item.ask} locale={locale} /></p>
              </>
            ) : (
              <>
                {/* The line with the slip is never played: hearing it said wrong is how a slip sticks. */}
                <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{item.shown}</p>
                <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={item.en} locale={locale} /></p>
                <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{t("One word is in the wrong form. Type the line put right.")}</p>
              </>
            )}
            <TypedBox
              boxRef={boxRef}
              label={item.kind === "fix" ? t("The line put right, in Estonian") : t("The changed sentence, in Estonian")}
              answer={item.answer}
              typed={typed}
              setTyped={setTyped}
              mark={mark}
              onCheck={check}
            >
              <p>{mark ? t(mark.note) : null}</p>
              <p className="mt-1">
                <span lang="et" className="font-bold">{item.answer}</span>{" "}
                <LessonText text={item.kind === "rework" ? item.answerEn : item.en} locale={locale} />
              </p>
              {item.kind === "fix" && <p className="mt-1"><LessonText text={item.why} locale={locale} /></p>}
            </TypedBox>
          </div>
        )}

        {item.kind === "type" && (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-xl font-bold" style={{ color: "var(--ink)" }}><LessonText text={item.en} locale={locale} /></p>
            {item.note && <p className="text-base" style={{ color: "var(--ink-2)" }}>{t(item.note)}</p>}
            <TypedBox boxRef={boxRef} label={t("Your answer, in Estonian")} answer={item.answer} typed={typed} setTyped={setTyped} mark={mark} onCheck={check}>
              {mark && (
                <p>
                  {t(mark.note)}{" "}
                  {mark.verdict !== "right" && fillNodes(t("It's {answer}."), { answer: <span lang="et" className="font-bold">{item.answer}</span> })}
                </p>
              )}
            </TypedBox>
          </div>
        )}

        <p role="status" aria-live="polite" className="sr-only">{liveLine(item, picked, mark, matched, t, locale)}</p>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {isTyped(item) && mark === null ? (
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

/**
 * The box a typed question is answered in, with the letters an English
 * keyboard lacks, the verdict once marked, and the answer to hear. One block
 * for every typed kind, so the box a learner types into is the same box
 * whatever the question; `children` is what the verdict says.
 */
function TypedBox({ boxRef, label, answer, typed, setTyped, mark, onCheck, children }: {
  boxRef: RefObject<HTMLInputElement | null>;
  label: string; answer: string; typed: string; setTyped: (value: string) => void;
  mark: TypedMark | null; onCheck: () => void; children: ReactNode;
}) {
  const t = useT();
  return (
    <>
      <input
        ref={boxRef}
        lang="et"
        className="field-lg w-full"
        value={typed}
        disabled={mark !== null}
        aria-label={label}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && mark === null) {
            e.preventDefault();
            e.stopPropagation();
            // An empty box is answered with the Check button, on purpose, and never by an Enter that went one press too far.
            if (typed.trim() !== "") onCheck();
          }
        }}
      />
      {mark === null && <div className="under-field"><DiacriticBar /></div>}
      {mark !== null && (
        <div className={`verdict-panel ${VERDICT_CLASS[mark.verdict === "wrong" && mark.close ? "nearly" : mark.verdict]}`}>{children}</div>
      )}
      {mark !== null && (
        <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
          <Speak text={answer} size={15} /> {t("hear it")}
        </span>
      )}
    </>
  );
}

/**
 * What the live region says once a question is answered, with the Estonian in
 * it marked `lang="et"` so a screen reader says it as Estonian.
 */
function liveLine(
  item: PracticeItem, picked: string | null, mark: TypedMark | null, matched: boolean | null, t: (s: string) => string, locale: Locale,
): ReactNode {
  if (isTyped(item)) return mark ? <>{t(mark.note)} <span lang="et">{item.answer}</span></> : "";
  if (item.kind === "match") return matched === null ? "" : matched ? t("All matched, first time.") : t("All matched.");
  if (picked === null) return "";
  if (picked === item.answer) return t("Right.");
  if (item.kind === "gap" || item.kind === "reply") {
    const [before, after = ""] = t("Not this one. It's {answer}.").split("{answer}");
    return <>{before}<span lang="et">{item.answer}</span>{after}</>;
  }
  // The meaning drawn as the option drew it, so `cleaned, after {ei}` is read with no braces and `ei` as Estonian.
  return fillNodes(t("Not this one. It means {answer}."), { answer: <LessonText text={item.answer} locale={locale} /> });
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
  /*
    WHAT THE LAST PRESS DID, SAID OUT LOUD. A pair that locks in recolors and
    one that misses shakes, which a screen reader hears as nothing, so one line
    held in state says it: the last thing that happened rather than a backlog.
  */
  const [said, setSaid] = useState<{ et?: string; text: string } | null>(null);
  // A matched pair disables the meaning that was pressed, so the caret goes to the next word still to match.
  const etRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const take = (en: string) => {
    if (chosen === null || finished) return;
    if (pairs[chosen]!.en === en) {
      const now = new Set(done).add(chosen);
      setDone(now);
      setSaid({ et: pairs[chosen]!.et, text: t("matched.") });
      setChosen(null);
      if (now.size === pairs.length) onDone(slips === 0);
      else {
        sound("right");
        const nextOpen = pairs.findIndex((_, i) => !now.has(i));
        requestAnimationFrame(() => etRefs.current[nextOpen]?.focus());
      }
    } else {
      setSlips((n) => n + 1);
      setWrong(en);
      setSaid({ text: t("Not that one. Try another meaning.") });
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
                ref={(el) => { etRefs.current[i] = el; }}
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
      <p className="sr-only" role="status" aria-live="polite">
        {said && !finished ? <>{said.et && <span lang="et">{said.et} </span>}{said.text}</> : null}
      </p>
      <p className="col-span-2 text-sm" style={{ color: "var(--ink-3)" }}>
        {finished
          ? (slips === 0 ? t("All matched, first time.") : t("All matched."))
          : chosen === null ? t("Tap a word, then what it means.") : t("Now tap what it means.")}
      </p>
    </div>
  );
}

/**
 * WORK IT OUT, BEFORE THE ANSWER (B2, `WorkOut`): the sentence with its one new
 * word marked. The sentence's English is held back until the answer is in,
 * since it says what the word means.
 */
function WorkOutSentence({ item, answered }: { item: Extract<PracticeItem, { kind: "workOut" }>; answered: boolean }) {
  const t = useT();
  const locale = useLocale();
  const at = wordAt(item.et, item.word);
  return (
    <div className="flex flex-col gap-2" data-work-out={item.word}>
      <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("One word here is new, and you know its parts. What does it mean?")}</p>
      <div className="flex items-start gap-2">
        <Speak text={item.et} size={18} label={t("Hear the sentence")} />
        <p lang="et" className="text-xl font-bold leading-snug" style={{ color: "var(--ink)" }}>
          {at < 0 ? item.et : (
            <>
              {item.et.slice(0, at)}
              <mark className="rounded-sm px-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }} data-work-out-word>{item.word}</mark>
              {item.et.slice(at + item.word.length)}
            </>
          )}
        </p>
      </div>
      {answered && <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={item.en} locale={locale} /></p>}
    </div>
  );
}

/** And after it: the word as its parts, and the way to its dictionary entry. */
function WorkOutParts({ item }: { item: Extract<PracticeItem, { kind: "workOut" }> }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="mt-4 flex flex-col gap-1 rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--edge)", background: "var(--raised)" }} data-work-out-parts>
      <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("How it is built")}</p>
      <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
        <span lang="et">{item.parts.join(" + ")}</span>{" = "}
        <WordLink lemma={item.word} className="font-bold" linkClass="underline underline-offset-4">{item.word}</WordLink>
      </p>
      <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={item.answer} locale={locale} /></p>
    </div>
  );
}

/** Where a word stands in a sentence as a whole word, or -1. */
function wordAt(sentence: string, word: string): number {
  for (const m of sentence.matchAll(/\p{L}+/gu)) if (m[0] === word) return m.index ?? -1;
  return -1;
}
