"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { Button } from "@/components/Button";
import { Chip, KeyCap, Page } from "@/components/ui";
import { ChoiceCard, ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { EstonianInput } from "@/components/EstonianInput";
import { FitText } from "@/components/FitText";
import { Speak } from "@/components/Speak";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { RoundDone } from "@/components/round/RoundDone";
import { RoundProgress } from "@/components/round/RoundProgress";
import { acceptedForms, checkAnswer, noteIn } from "@/lib/estonian/answer";
import { VERDICT_CLASS, verdictOfCheck, type Verdict } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { shuffle } from "@/lib/random/shuffle";
import { useLocale } from "@/components/Locale";

export interface CheckWord {
  lexemeId: string;
  lemma: string;
  translation: string;
  inDeck: boolean;
}

interface Part {
  n: number;
  first: number;
  last: number;
  words: CheckWord[];
}

type Direction = "et-en" | "en-et";

interface Outcome {
  word: CheckWord;
  verdict: Verdict;
}

/**
 * MOCKUP OF "CHECK YOURSELF". Three screens: pick the direction and the part,
 * type the other side of each word, then a score with the misses listed and
 * an offer to put only those in the deck.
 */
export function CheckSession({ title, slug, parts }: { title: string; slug: string; parts: Part[] }) {
  const t = useT();
  const [direction, setDirection] = useState<Direction>("en-et");
  const [partN, setPartN] = useState<number | "all">(parts[0]?.n ?? 1);
  const [words, setWords] = useState<CheckWord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  const start = () => {
    const pool = partN === "all" ? parts.flatMap((p) => p.words) : parts.find((p) => p.n === partN)?.words ?? [];
    setWords(shuffle(pool));
    setIndex(0);
    setOutcomes([]);
  };

  const settle = useCallback((o: Outcome) => setOutcomes((all) => [...all, o]), []);
  const next = useCallback(() => setIndex((i) => i + 1), []);

  if (!words) {
    return (
      <Page
        title={fill(t("Check yourself: {list}"), { list: t(title).toLowerCase() })}
        lead={t("Type the other side of each word. Nothing is added to your deck unless you ask.")}
      >
        <div className="flex flex-col gap-6">
          <ChoiceGroup label={t("Which way round?")} className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              selected={direction === "en-et"}
              onSelect={() => setDirection("en-et")}
              title={t("See English, type Estonian")}
              detail={<>{t("You see")} <b>{t("to want")}</b>, {t("you type")} <b lang="et">tahtma</b></>}
            />
            <ChoiceCard
              selected={direction === "et-en"}
              onSelect={() => setDirection("et-en")}
              title={t("See Estonian, type English")}
              detail={<>{t("You see")} <b lang="et">tahtma</b>, {t("you type")} <b>{t("to want")}</b></>}
            />
          </ChoiceGroup>

          <ChoiceGroup label={t("Which words?")}>
            {parts.map((p) => (
              <ChoiceChip key={p.n} selected={partN === p.n} onSelect={() => setPartN(p.n)}>
                {fill(t("{first} to {last}"), { first: p.first, last: p.last })}
              </ChoiceChip>
            ))}
            <ChoiceChip selected={partN === "all"} onSelect={() => setPartN("all")}>
              {fill(t("All {n}"), { n: parts.reduce((s, p) => s + p.words.length, 0) })}
            </ChoiceChip>
          </ChoiceGroup>

          <div className="flex justify-end">
            <Button variant="primary" size="lg" onClick={start}>
              {t("Start")} <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const word = words[index];
  if (!word) {
    const right = outcomes.filter((o) => o.verdict === "right").length;
    const nearly = outcomes.filter((o) => o.verdict === "nearly").length;
    const missed = outcomes.filter((o) => o.verdict !== "right");
    const missedNotHeld = missed.filter((o) => !o.word.inDeck).length;
    return (
      <RoundDone
        title={fill(t("{n} of {total} right"), { n: right, total: words.length })}
        line={right === words.length ? t("Every one. You know this list.") : t("The ones you missed are listed below.")}
        figures={[
          { value: right, label: t("Right") },
          { value: nearly, label: t("Nearly") },
          { value: words.length - right - nearly, label: t("Missed") },
        ]}
        missed={missed.map((o) => ({ et: o.word.lemma, note: o.word.translation }))}
        again={t("Check again")}
        also={{ href: `/review/common/${slug}/check`, label: t("Change direction") }}
      >
        {missedNotHeld > 0 && (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary">
              <Plus size={15} aria-hidden /> {fill(t("Add the {n} you missed to your deck"), { n: missedNotHeld })}
            </Button>
          </div>
        )}
      </RoundDone>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">{t("Check yourself")}</h1>
      <RoundProgress done={index} total={words.length} label={t("Session progress")} />
      <Question key={`${index}-${word.lexemeId}`} word={word} direction={direction} onSettled={settle} onNext={next} />
    </div>
  );
}

function Question({ word, direction, onSettled, onNext }: {
  word: CheckWord;
  direction: Direction;
  onSettled: (o: Outcome) => void;
  onNext: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ verdict: Verdict; note: string } | null>(null);
  const toEnglish = direction === "et-en";
  const shown = toEnglish ? word.lemma : word.translation;
  const expected = toEnglish ? word.translation : word.lemma;
  const accepted = useMemo(() => acceptedForms(expected, toEnglish ? "en" : "et").map((a) => a.shown), [expected, toEnglish]);

  const mark = useCallback((giveUp = false) => {
    if (result) return;
    if (giveUp || typed.trim() === "") {
      setResult({ verdict: "wrong", note: "" });
      sound("wrong");
      onSettled({ word, verdict: "wrong" });
      return;
    }
    const check = checkAnswer(typed, expected, toEnglish ? "en" : "et");
    const verdict = verdictOfCheck(check);
    setResult({ verdict, note: noteIn(check, locale) });
    sound(verdict === "right" ? "right" : "wrong");
    onSettled({ word, verdict });
  }, [result, typed, expected, toEnglish, locale, sound, onSettled, word]);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (inEditable(e.target)) return;
      if (isAdvanceKey(e)) { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, onNext]);

  const headline = !result ? null
    : result.verdict === "right" ? t("Right.")
    : result.verdict === "nearly" ? t("Nearly.")
    : typed.trim() === "" ? t("Here it is.") : t("Not this one.");

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent">{toEnglish ? t("Estonian to English") : t("English to Estonian")}</Chip>
      </div>

      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {toEnglish ? t("What does this mean?") : t("How do you say this in Estonian?")}
        </p>
        <div className="flex items-center gap-3">
          <FitText
            text={shown}
            max="var(--text-3xl)"
            lang={toEnglish ? "et" : undefined}
            className="font-display font-bold"
            style={{ color: "var(--ink)" }}
          />
          {toEnglish && <Speak text={word.lemma} size={18} label={t("Hear the word")} />}
        </div>

        {result ? (
          <div className={`${VERDICT_CLASS[result.verdict]} verdict-panel w-full max-w-sm text-left`} aria-live="polite">
            <p className="font-bold">{headline}</p>
            {/* A slip names the letter; a miss names nothing, since the answer is printed once below. */}
            {result.verdict === "nearly" && result.note && <p>{result.note}</p>}
            {result.verdict === "wrong" && typed.trim() !== "" && (
              <p>{t("You typed")} <span lang={toEnglish ? undefined : "et"}>{typed}</span></p>
            )}
            {result.verdict === "right" ? (
              accepted.length > 1 && (
                <p className="mt-1">{t("Also counts:")} <b lang={toEnglish ? undefined : "et"}>{accepted.join(", ")}</b></p>
              )
            ) : result.verdict === "wrong" && (
              <p className="mt-1">
                {accepted.length > 1 ? t("Any of these counts:") : t("The answer:")}{" "}
                <b lang={toEnglish ? undefined : "et"}>{accepted.join(", ")}</b>
              </p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {toEnglish ? (
              <input
                className="field field-lg w-full"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); mark(); } }}
                aria-label={t("The meaning in English")}
                placeholder={t("Type it in English")}
                autoFocus
              />
            ) : (
              <EstonianInput
                value={typed}
                onChange={(v) => setTyped(v)}
                onEnter={() => mark()}
                ariaLabel={t("The word in Estonian")}
                placeholder={t("Type it in Estonian")}
                autoFocus
                large
              />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
        {result ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onNext}>
            {t("Continue")}
            <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => mark(true)}>{t("I don't know")}</Button>
            <Button variant="primary" className="ml-auto" onClick={() => mark()} disabled={typed.trim() === ""}>
              {t("Check")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
