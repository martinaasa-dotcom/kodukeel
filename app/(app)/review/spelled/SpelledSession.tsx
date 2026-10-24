"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Phone, Repeat, Snail } from "lucide-react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page } from "@/components/ui";
import { EstonianInput } from "@/components/EstonianInput";
import { FitText } from "@/components/FitText";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { RoundDone } from "@/components/round/RoundDone";
import { RoundProgress } from "@/components/round/RoundProgress";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { useSpeller } from "@/components/sounds/useSpeller";
import { compareSpelling, spellOut } from "@/lib/collections/spelling";
import { VERDICT_CLASS, type Verdict } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { roundPageTitle } from "@/lib/ux/roundNames";

export interface SpelledWord {
  /** The card the word was drawn through, as a key. Nothing is graded on it. */
  id: string;
  /** Spelled out and never shown until it has been written down. */
  lemma: string;
  meaning: string;
  lexemeId: string;
  starred: boolean;
}

/** A first miss is marked and the word spelled again; a second shows it. */
const TRIES = 2;

/**
 * TÄHTHAAVAL, PLAYED. A word arrives the way it does down a phone line: one
 * letter's name at a time, in the native speaker's voice, each empty box
 * lighting as its letter is said. The learner writes it down, and the boxes
 * fill as they type, so they can see they have caught the right number of
 * letters before they press Check.
 *
 * A miss marks which letters are wrong, in place, and plays the word again;
 * a second shows it. "Slower" leaves longer gaps rather than stretching the
 * names, because a gap is where a listener writes. Nothing is graded
 * (see the page for why): the last screen lists what to look at again.
 */
export function SpelledSession({ words: initial }: { words: SpelledWord[] }) {
  const t = useT();
  const [words] = useState(initial);
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [spelled, setSpelled] = useState(0);
  const [missed, setMissed] = useState<SpelledWord[]>([]);
  const look = useLookBack();
  const word = words[index];

  const settled = useCallback((w: SpelledWord, solved: boolean, misses: number) => {
    if (solved) setSpelled((n) => n + 1);
    if (solved && misses === 0) setFirstTry((n) => n + 1);
    if (!solved || misses > 0) setMissed((m) => [...m, w]);
  }, []);

  const next = useCallback(() => {
    if (word) {
      look.record({
        of: word.id,
        label: "Tähthaaval",
        question: word.meaning,
        answer: word.lemma,
        note: null,
        questionLang: "en",
        answerLang: "et",
        speak: word.lemma,
      });
    }
    setIndex((i) => i + 1);
  }, [look, word]);

  if (words.length === 0) {
    return (
      <Page {...roundPageTitle("/review/spelled", t)} lead={t("A word you know, spelled out letter by letter. Write it down.")}>
        <Empty
          title={t("No words to spell yet")}
          body={t("It spells words you've already met. Meet a few first.")}
          action={<ButtonLink href="/learn" variant="primary">{t("Meet some words")}</ButtonLink>}
        />
      </Page>
    );
  }

  if (!word) {
    return (
      <RoundDone
        title={spelled === words.length ? t("Every word caught") : fill(t("{n} of {total} caught"), { n: spelled, total: words.length })}
        line={firstTry === words.length
          ? t("Every one on the first hearing. You can take a name down over the phone.")
          : t("The letters' names take a while. Spell your own name on the sounds page to hear them again.")}
        figures={[
          { value: firstTry, label: t("First hearing") },
          { value: spelled, label: t("Caught") },
          { value: words.length, label: t("Words") },
        ]}
        missed={missed.map((m) => ({ et: m.lemma, note: m.meaning }))}
        also={{ href: "/grammar/sounds#spell", label: t("Spell your name") }}
        celebrate={firstTry === words.length}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Tähthaaval</h1>
      <RoundProgress done={index} total={words.length} left={words.length - index} label={t("Session progress")} />
      {look.panel && <LookBackCard {...look.panel} />}
      {/* Hidden rather than replaced, as Tähed does: what was typed is the line's own state. */}
      <div hidden={look.looking}>
        <Line key={word.id} word={word} onSettled={settled} onNext={next} />
      </div>
      {look.seen.length > 0 && (
        <div className="mt-4 flex justify-center">
          <LookBackButton {...look.button} disabled={look.looking} />
        </div>
      )}
    </div>
  );
}

function Line({ word, onSettled, onNext }: {
  word: SpelledWord;
  onSettled: (word: SpelledWord, solved: boolean, misses: number) => void;
  onNext: () => void;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const parts = useMemo(() => spellOut(word.lemma), [word.lemma]);
  const letters = useMemo(() => [...word.lemma], [word.lemma]);
  const { active, spell, stop, speaking } = useSpeller();
  const [typed, setTyped] = useState("");
  const [misses, setMisses] = useState(0);
  const [marked, setMarked] = useState<readonly boolean[] | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [live, setLive] = useState("");
  const answered = verdict !== null;

  // The word is spelled the moment it arrives: a press brought the learner here.
  useEffect(() => {
    void spell(parts);
    return stop;
  }, [parts, spell, stop]);

  const check = useCallback(() => {
    if (answered || typed.trim() === "") return;
    stop();
    const { exact, letters: right } = compareSpelling(typed, word.lemma);
    if (exact) {
      setVerdict(misses === 0 ? "right" : "nearly");
      setMarked(right);
      sound("right");
      setLive(fill(t("Right. {word}, {meaning}."), { word: word.lemma, meaning: word.meaning }));
      onSettled(word, true, misses);
      return;
    }
    const nextMisses = misses + 1;
    setMisses(nextMisses);
    setMarked(right);
    sound("wrong");
    if (nextMisses >= TRIES) {
      setVerdict("wrong");
      setLive(fill(t("Not this time. It's {word}, {meaning}."), { word: word.lemma, meaning: word.meaning }));
      onSettled(word, false, nextMisses);
      return;
    }
    setLive(t("Not quite. The letters marked are wrong. Listen once more."));
    void spell(parts, { slow: true });
  }, [answered, typed, word, misses, sound, t, onSettled, stop, spell, parts]);

  useEffect(() => {
    if (!answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (inEditable(e.target)) return;
      if (isAdvanceKey(e)) { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, onNext]);

  const typedLetters = [...typed.trim()];
  const shown = answered ? letters : typedLetters;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent"><Phone size={12} aria-hidden /> Tähthaaval</Chip>
        <span className="ml-auto text-xs" style={{ color: "var(--ink-3)" }}>
          {fill(t("{n} letters"), { n: letters.length })}
        </span>
        {/* After the answer, since the label names the word the line is spelling. */}
        {answered && <StarWord lexemeId={word.lexemeId} starred={word.starred} label={word.lemma} />}
      </div>

      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {answered
            ? verdict === "wrong" ? t("Here it is, letter by letter.") : t("Caught it.")
            : misses > 0 ? t("Fix the letters marked. It's spelled again, slower.") : t("Write down the word you hear spelled.")}
        </p>

        {/* ONE BOX PER LETTER: it lights as its letter is said and fills as the learner types,
            so the count of letters is something to see as well as hear. */}
        <ol
          lang="et"
          className={`flex flex-wrap justify-center gap-1.5 rounded-[var(--r)] px-3 py-3 ${answered ? `${VERDICT_CLASS[verdict]} wave-arrive` : ""}`}
          style={answered ? undefined : { background: "var(--raised)" }}
          aria-label={t("The letters")}
        >
          {letters.map((_, i) => {
            const char = shown[i];
            const wrong = marked !== null && !answered && marked[i] === false;
            return (
              <li
                key={i}
                data-live={active === i || undefined}
                className="spell-slot flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)] border text-xl font-bold"
                style={{
                  borderColor: wrong ? "var(--again-ink)" : char ? "var(--rule)" : "var(--ink-3)",
                  borderStyle: char ? "solid" : "dashed",
                  background: char ? "var(--surface)" : "transparent",
                  color: wrong ? "var(--again-ink)" : answered ? "inherit" : "var(--ink)",
                  textDecoration: wrong ? "line-through" : undefined,
                }}
              >
                {char === undefined ? null : answered && verdict !== "wrong" ? (
                  <span className="wave-letter" style={{ "--i": i } as CSSProperties}>{char}</span>
                ) : char}
                {wrong && <span className="sr-only"> {t("(wrong letter)")}</span>}
              </li>
            );
          })}
        </ol>

        {answered ? (
          <div className="flex items-center gap-3">
            <FitText text={word.lemma} max="var(--text-3xl)" lang="et" className="font-display font-bold" style={{ color: "var(--ink)" }} />
            <Speak text={word.lemma} size={18} label={t("Hear the word")} />
            <span className="text-base" style={{ color: "var(--ink-2)" }}>{word.meaning}</span>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <EstonianInput
              value={typed}
              onChange={(v) => setTyped(v)}
              onEnter={check}
              ariaLabel={t("The word you heard spelled")}
              placeholder={t("Type the word")}
              autoFocus
              large
            />
          </div>
        )}
        <p className="sr-only" aria-live="polite">{live}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
        {answered ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onNext}>
            {t("Continue")}
            <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => void spell(parts)} disabled={speaking} className="whitespace-nowrap">
              <Repeat size={15} aria-hidden /> {t("Again")}
            </Button>
            <Button variant="secondary" onClick={() => void spell(parts, { slow: true })} disabled={speaking} className="whitespace-nowrap">
              <Snail size={15} aria-hidden /> {t("Slower")}
            </Button>
            <Button variant="primary" className="ml-auto whitespace-nowrap" onClick={check} disabled={typed.trim() === ""}>
              {t("Check")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
