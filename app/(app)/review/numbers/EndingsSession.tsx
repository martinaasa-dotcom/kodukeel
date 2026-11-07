"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Hash, X } from "lucide-react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap } from "@/components/ui";
import { EstonianInput } from "@/components/EstonianInput";
import { Speak } from "@/components/Speak";
import { RoundProgress } from "@/components/round/RoundProgress";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useSingleKeys } from "@/components/SingleKeys";
import { RoundDone, type WorthALook } from "@/components/round/RoundDone";
import { mayActOnKey } from "@/lib/ux/shortcuts";
import { keepMissedNumbers } from "@/app/actions";
import { OPTION_CLASS, VERDICT_CLASS, VERDICT_INK, type Verdict } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import { SILENT_JOBS, markHeard, type EndingsCard, type HearCard, type HearMark, type SameNumberCard, type YearCard } from "@/lib/games/numberEndings";

/**
 * NUMBER ENDINGS, PLAYED: ONE NUMBER, MANY JOBS.
 *
 * The second mode of the Numbers round, three steps in the order the
 * briefing names them: two same-number cards, two years and six heard
 * sentences. The rules are `lib/games/numberEndings.ts`; this is the screen.
 *
 * WHAT IT WRITES. A card the learner got wrong, a tile, a part of a year or a
 * number heard, hands its number in at the end of the round, and the words
 * that number is made of go into the deck (`keepMissedNumbers`), which is the
 * operator's rule for a game: what you get wrong comes back. Nothing is
 * graded down and a right answer writes nothing, since a tap between three
 * forms recalls none of them on its own. A round left half way writes
 * nothing, which is ADR-016's rule for an abandoned round.
 */
export function EndingsSession({ cards }: { cards: readonly EndingsCard[] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState<number[]>([]);
  const [worth, setWorth] = useState<WorthALook[]>([]);
  const [right, setRight] = useState(0);
  const [sent, setSent] = useState(false);
  const [kept, setKept] = useState<number | null>(null);
  const look = useLookBack();
  const current = cards[index];

  const settled = useCallback((card: EndingsCard, ok: boolean) => {
    if (ok) {
      setRight((r) => r + 1);
      return;
    }
    setMissed((m) => (m.includes(card.n) ? m : [...m, card.n]));
    setWorth((w) => [...w, ...worthOf(card, t)]);
  }, [t]);

  const next = useCallback(() => {
    if (current) {
      look.record({
        of: `${current.kind}:${current.n}`,
        label: "Arvud",
        question: current.kind === "hear" ? current.en : current.kind === "year" ? current.en : String(current.n),
        answer: current.kind === "hear" ? current.et : current.kind === "year"
          ? `${current.before} ${current.parts.map((p) => p.answer).join(" ")} ${current.after}`
          : current.rows.map((r) => `${r.before} ${r.answer} ${r.after}`.replace(/ \./g, ".")).join(" "),
        note: null,
        questionLang: "en",
        answerLang: "et",
        speak: current.kind === "hear" ? current.et : null,
      });
    }
    setIndex((i) => i + 1);
  }, [current, look]);

  const finished = cards.length > 0 && index >= cards.length;
  useEffect(() => {
    if (!finished || sent) return;
    setSent(true);
    if (missed.length === 0) return;
    void keepMissedNumbers(missed)
      .then((res) => setKept(res.ok && "added" in res ? res.added : 0))
      .catch(() => setKept(null));
  }, [finished, sent, missed]);

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-6 md:px-10">
        <Empty
          title={t("No numbers to practice yet")}
          body={t("This opens once you've met the numbers. They're one of the first units of the course.")}
          action={<ButtonLink href="/learn" variant="primary">{t("Meet some words")}</ButtonLink>}
        />
      </div>
    );
  }

  if (!current) {
    const total = cards.length;
    return (
      <RoundDone
        title={right === total ? t("Every number right") : fill(t("{n} of {total} right"), { n: right, total })}
        line={missed.length === 0 ? undefined : kept && kept > 0
          ? t("The numbers you missed are in your deck now, and they'll come back in your reviews.")
          : t("The numbers you missed will come back in another round.")}
        figures={[
          { value: right, label: t("Right") },
          { value: total - right, label: t("To look at") },
          { value: total, label: t("Numbers") },
        ]}
        missed={worth}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Arvud</h1>
      <RoundProgress done={index} total={cards.length} label={t("Session progress")} />
      {look.panel && <LookBackCard {...look.panel} />}
      <div hidden={look.looking}>
        {current.kind === "same" && <SameCard key={index} card={current} onSettled={settled} onNext={next} />}
        {current.kind === "year" && <YearCardView key={index} card={current} onSettled={settled} onNext={next} />}
        {current.kind === "hear" && <HearCardView key={index} card={current} onSettled={settled} onNext={next} />}
      </div>
      {look.seen.length > 0 && (
        <div className="mt-4 flex justify-center">
          <LookBackButton {...look.button} disabled={look.looking} />
        </div>
      )}
    </div>
  );
}

/** The frame every card is drawn in: a header naming the step, the body, and the one button. */
function Shell({ step, children, foot }: { step: string; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border" style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
      <div className="round-head flex flex-wrap items-center gap-x-4 gap-y-1 px-6 pt-4">
        <Chip tone="accent"><Hash size={12} aria-hidden /> Arvud</Chip>
        <span className="ml-auto text-sm" style={{ color: "var(--ink-3)" }}>{step}</span>
      </div>
      <div className="px-5 py-6 sm:px-6">{children}</div>
      <div className="flex items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>{foot}</div>
    </div>
  );
}

/** Continue, once a card is answered, on the key that moves every card on. */
function useContinue(done: boolean, onNext: () => void) {
  useEffect(() => {
    if (!done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (isAdvanceKey(e)) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, onNext]);
}

function ContinueButton({ onNext }: { onNext: () => void }) {
  const t = useT();
  return (
    <Button variant="primary" size="lg" className="w-full" onClick={onNext} autoFocus>
      {t("Continue")}
      <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
    </Button>
  );
}

/* ------------------------------------------------------------------------ */
/* Step one: the same number in six sentences.                               */
/* ------------------------------------------------------------------------ */

function SameCard({ card, onSettled, onNext }: {
  card: SameNumberCard;
  onSettled: (card: EndingsCard, ok: boolean) => void;
  onNext: () => void;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const [at, setAt] = useState(0);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [slipped, setSlipped] = useState(false);
  const [live, setLive] = useState("");
  const singleKeys = useSingleKeys();
  const done = at >= card.rows.length;
  useContinue(done, onNext);

  const pick = useCallback((tile: string) => {
    const row = card.rows[at];
    if (!row) return;
    if (tile === row.answer) {
      sound("right");
      setLive(fill(t("Right. {answer}."), { answer: `${row.before} ${row.answer} ${row.after}` }));
      setWrongPick(null);
      const nextAt = at + 1;
      setAt(nextAt);
      if (nextAt >= card.rows.length) onSettled(card, !slipped);
    } else {
      sound("wrong");
      setLive(t("Not that one. Try again."));
      setWrongPick(tile);
      setSlipped(true);
    }
  }, [at, card, slipped, sound, t, onSettled]);

  // 1, 2, 3 pick a tile, the way every other choice in the app does.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!mayActOnKey(e, singleKeys)) return;
      const i = Number(e.key) - 1;
      const tile = card.tiles[i];
      if (Number.isInteger(i) && tile) {
        e.preventDefault();
        pick(tile);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, card.tiles, pick, singleKeys]);

  return (
    <Shell step={t("One number, many jobs")} foot={done
      ? <ContinueButton onNext={onNext} />
      : <p className="text-md font-semibold" style={{ color: wrongPick ? VERDICT_INK.nearly : "var(--ink-2)" }}>
          {wrongPick ? t("Not that one. Try again.") : t("Pick the form this sentence needs.")}
        </p>}>
      <div className="flex flex-col items-center">
        <span className="tnum font-display text-5xl font-extrabold" style={{ color: "var(--accent-deep)" }}>{card.n}</span>
        <p className="mt-1 text-center text-sm" style={{ color: "var(--ink-2)" }}>{t("Three ways to say it. Which one does each sentence need?")}</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-base font-semibold" lang="et" style={{ color: "var(--ink-2)" }}>
          {card.tiles.map((tile) => <span key={tile} className="whitespace-nowrap">{tile}</span>)}
        </p>
      </div>
      <ol className="mt-6 flex flex-col gap-3">
        {card.rows.map((row, i) => {
          const filled = i < at;
          const active = i === at;
          return (
            <li
              key={row.job}
              className="rounded-lg border px-4 py-3"
              style={{ borderColor: active ? "var(--accent-deep)" : "var(--rule-soft)", borderWidth: active ? 2 : 1 }}
              aria-current={active ? "step" : undefined}
            >
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>{fill(t(row.enTemplate), row.enValues)}</p>
              <p lang="et" className="mt-1 text-lg">
                {row.before}{" "}
                {filled
                  ? <span className={`rounded-md px-2 font-bold ${OPTION_CLASS.right}`}>{row.answer}</span>
                  : <span className="inline-block w-24 border-b-2 align-baseline sm:w-40" style={{ borderColor: active ? "var(--accent-deep)" : "var(--ink-3)" }}>&nbsp;</span>}
                {/^[.,!?]/.test(row.after) ? "" : " "}{row.after}
                {filled && <Check size={18} className="ml-1 inline" style={{ color: VERDICT_INK.right }} aria-hidden />}
              </p>
              {/* The choice sits under the sentence it is for, so a phone never scrolls away from it. */}
              {active && (
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("The forms")}>
                  {card.tiles.map((tile, ti) => (
                    <button
                      key={tile}
                      type="button"
                      onClick={() => pick(tile)}
                      lang="et"
                      className={`choice-btn inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-base font-semibold ${wrongPick === tile ? `shake ${OPTION_CLASS.wrong}` : ""}`}
                      style={{ borderColor: "var(--rule)" }}
                    >
                      <KeyCap>{ti + 1}</KeyCap> {tile}
                    </button>
                  ))}
                </div>
              )}
              {filled && !SILENT_JOBS.has(row.job) && (
                <Speak
                  text={`${row.before} ${row.answer}${/^[.,!?]/.test(row.after) ? "" : " "}${row.after}`}
                  size={14}
                  label={t("Hear it said")}
                  className="press mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                />
              )}
            </li>
          );
        })}
      </ol>
      {done && (
        <p className="mt-4 text-center text-sm" style={{ color: "var(--ink-2)" }}>
          {t("Plain for an age or a count, omastav (2nd form) before “with” and “in”, and “-th” for a floor or a date.")}
        </p>
      )}
      <p className="sr-only" aria-live="polite">{live}</p>
    </Shell>
  );
}

/* ------------------------------------------------------------------------ */
/* Step two: a year, part by part.                                           */
/* ------------------------------------------------------------------------ */

function YearCardView({ card, onSettled, onNext }: {
  card: YearCard;
  onSettled: (card: EndingsCard, ok: boolean) => void;
  onNext: () => void;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const [picks, setPicks] = useState<(string | null)[]>(() => card.parts.map(() => null));
  const [checked, setChecked] = useState(false);
  const allPicked = picks.every((p) => p !== null);
  const allRight = picks.every((p, i) => p === card.parts[i]!.answer);
  const full = `${card.before} ${card.parts.map((p) => p.answer).join(" ")} ${card.after}`;
  useContinue(checked, onNext);

  const check = useCallback(() => {
    if (!allPicked || checked) return;
    setChecked(true);
    sound(allRight ? "right" : "wrong");
    onSettled(card, allRight);
  }, [allPicked, checked, allRight, sound, onSettled, card]);

  const verdict: Verdict = allRight ? "right" : "wrong";
  return (
    <Shell step={t("Build the year")} foot={checked
      ? <ContinueButton onNext={onNext} />
      : <Button variant="primary" size="lg" className="w-full" onClick={check} disabled={!allPicked}>{t("Check")}</Button>}>
      <p className="text-center text-sm" style={{ color: "var(--ink-3)" }}>{fill(t(card.enTemplate), card.enValues)}</p>
      <p lang="et" className="mt-1 text-center text-2xl font-semibold">
        {card.before} {card.n}. {card.after}
      </p>
      <p className="mt-2 text-center text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Pick each part. Here every part changes, and the last one becomes “-th”.")}
      </p>
      {/* A part is a column as wide as its longest word, and the columns wrap as wholes: a word broken across two lines is a word nobody can read (the words-are-never-broken rule). */}
      <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-3">
        {card.parts.map((part, i) => (
          <div key={i} className="flex min-w-[8.5rem] flex-col gap-2" role="radiogroup" aria-label={fill(t("Part {n}"), { n: i + 1 })}>
            {part.options.map((option) => {
              const picked = picks[i] === option;
              const state = checked ? (option === part.answer ? OPTION_CLASS.right : picked ? OPTION_CLASS.wrong : OPTION_CLASS.other) : "";
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  disabled={checked}
                  lang="et"
                  onClick={() => setPicks((p) => p.map((v, j) => (j === i ? option : v)))}
                  className={`choice-btn flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-md border px-3 text-center text-base font-semibold disabled:cursor-default ${state}`}
                  style={checked ? undefined : picked
                    ? { borderColor: "var(--accent-deep)", background: "var(--accent-soft)", color: "var(--accent-deep)" }
                    : { borderColor: "var(--rule)" }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {checked && (
        <div className="mt-6">
          <div className={`${VERDICT_CLASS[verdict]} verdict-panel pop-in`}>
            <p className="font-semibold">{allRight ? t("Right.") : t("Not quite. Here it is in full:")}</p>
            <p lang="et" className="mt-1 flex flex-wrap items-center gap-2">
              <span>{full}</span>
              {!SILENT_JOBS.has(card.job) && <Speak text={full} autoplay size={16} label={t("Hear it said")}
                className="press flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }} />}
            </p>
          </div>
          <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-base">
            <caption className="label-xs mb-2 text-left" style={{ color: "var(--ink-3)" }}>{t("The same year doing other jobs")}</caption>
            <tbody>
              {card.others.map((o) => (
                <tr key={o.et} className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
                  <td className="py-2 pr-4 text-sm" style={{ color: "var(--ink-2)" }}>{fill(t(o.enTemplate), o.enValues)}</td>
                  <td lang="et" className="py-2">{o.et}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{checked ? (allRight ? t("Right.") : fill(t("Not quite. It's {answer}."), { answer: full })) : ""}</p>
    </Shell>
  );
}

/* ------------------------------------------------------------------------ */
/* Step three: a sentence heard, the number written down.                    */
/* ------------------------------------------------------------------------ */

function HearCardView({ card, onSettled, onNext }: {
  card: HearCard;
  onSettled: (card: EndingsCard, ok: boolean) => void;
  onNext: () => void;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const [text, setText] = useState("");
  const [mark, setMark] = useState<HearMark | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useContinue(mark !== null, onNext);

  const check = useCallback(() => {
    if (mark || !text.trim()) return;
    const result = markHeard(card, text);
    setMark(result);
    sound(result.right ? "right" : "wrong");
    onSettled(card, result.right && !result.dotWrong);
  }, [mark, text, card, sound, onSettled]);

  const verdict: Verdict | null = mark ? (mark.right ? (mark.dotWrong ? "nearly" : "right") : "wrong") : null;
  const line = useMemo(() => {
    if (!mark) return "";
    if (!mark.right) return mark.read ? fill(t("You wrote {said}. It's {answer}."), { said: mark.read, answer: card.answer }) : fill(t("It's {answer}."), { answer: card.answer });
    if (mark.dotWrong) return card.dotted
      ? fill(t("Right number. It means “-th” here, so it's written {answer}, with a dot."), { answer: card.answer })
      : fill(t("Right number. It's a plain number here, so it's written {answer}, without a dot."), { answer: card.answer });
    return card.dotted ? t("Right. It means “-th”, so it has a dot.") : t("Right.");
  }, [mark, card, t]);

  return (
    <Shell step={t("Write the number you hear")} foot={mark
      ? <ContinueButton onNext={onNext} />
      : <Button variant="primary" size="lg" className="w-full" onClick={check} disabled={!text.trim()}>
          {t("Check")}
          <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
        </Button>}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Speak text={card.et} autoplay size={28} label={t("Hear it again")}
          className="press flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }} />
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {card.hour ? t("Write the hour, in digits.") : card.decade ? t("Write the decade, in digits.") : t("Write the number in digits. Add a dot if it means “-th”.")}
        </p>
        {!mark ? (
          <div className="w-full max-w-xs text-left">
            <EstonianInput value={text} onChange={setText} id="ending-answer" ariaLabel={t("The number you heard")}
              placeholder={t("e.g. 17 or 17.")} inputRef={inputRef} onEnter={check} large />
          </div>
        ) : (
          <div className={`${VERDICT_CLASS[verdict!]} verdict-panel pop-in w-full max-w-md text-left`}>
            <p className="flex items-center gap-2 font-semibold">
              {mark.right ? <Check size={18} aria-hidden /> : <X size={18} aria-hidden />}
              {line}
            </p>
            <p lang="et" className="mt-1">{card.et}</p>
            <p className="mt-1 text-sm">{fill(t(card.enTemplate), card.enValues)}</p>
          </div>
        )}
        <p className="sr-only" aria-live="polite">{line}</p>
      </div>
    </Shell>
  );
}

/** What a missed card puts on the finish screen: the Estonian it wanted, and what it means. */
function worthOf(card: EndingsCard, t: (english: string) => string): WorthALook[] {
  const english = (c: { enTemplate: string; enValues: Readonly<Record<string, string>> }) => fill(t(c.enTemplate), c.enValues);
  if (card.kind === "hear") return [{ et: card.et, note: `${english(card)} (${card.answer})` }];
  if (card.kind === "year") {
    return [{ et: `${card.before} ${card.parts.map((p) => p.answer).join(" ")} ${card.after}`, note: english(card) }];
  }
  return card.rows.map((r) => ({ et: `${r.before} ${r.answer}${/^[.,!?]/.test(r.after) ? "" : " "}${r.after}`, note: english(r) }));
}
