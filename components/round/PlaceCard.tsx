"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, X } from "lucide-react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { rich } from "@/components/round/rich";
import { Button } from "@/components/Button";
import { KeyCap } from "@/components/ui";
import { EstonianSentence } from "@/components/EstonianSentence";
import { MapPicture } from "@/components/round/MapScene";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { useGrade } from "@/components/round/useGrade";
import { useKeepInView } from "@/components/round/useKeepInView";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { narrowLadder, struckOptions } from "@/lib/questions/hints";
import { OPTION_CLASS, VERDICT_CLASS, optionState } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import type { PlaceQuestion } from "@/lib/progress/map";

/**
 * A PLACE QUESTION IN MAP: A BALL, A NOUN, AND THREE PLACE WORDS.
 *
 * The picture is the question, the options are the noun's genitive with a
 * different place word after each, and the answer is graded on the place
 * word's own recognition card where the learner has one (ADR-016), with no
 * slot because the card's type is the slot. Whoever has no card for the word
 * writes nothing, which is what Map says about itself everywhere.
 *
 * It owns its own keys, because the round around it is built for a case
 * question with a rung and a typed answer, and none of that applies here:
 * there is one rung, the picture, and a hint crosses an option out. The round
 * hands over only whether it is paused for a look back.
 *
 * The phrase is a join of the stored genitive and a dictionary entry, which
 * the reveal says in a line, and the sentence beneath it is the lexicographer's
 * and holds the place word.
 */
export function PlaceCard({ q, index, paused, canTranslate, onAnswered, onNext }: {
  q: PlaceQuestion;
  index: number;
  paused: boolean;
  canTranslate: boolean;
  onAnswered: (right: boolean) => void;
  onNext: () => void;
}) {
  const t = useT();
  const grade = useGrade();
  const sound = useFeedbackSound();
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const shownAt = useRef(Date.now());
  const answered = picked !== null;
  const footer = useKeepInView<HTMLDivElement>(answered ? index : null);

  const texts = q.options.map((o) => o.text);
  const correct = q.options[q.answer]!.text;
  const hints = useHints({
    word: q.lexemeId, question: `${q.lexemeId}:place:${q.place}`, ladder: narrowLadder(texts, correct),
  });
  const struck = struckOptions(texts, correct, hints.taken);

  useEffect(() => { shownAt.current = Date.now(); setPicked(null); }, [index]);

  const pick = useCallback(async (i: number) => {
    if (answered || busy) return;
    setBusy(true);
    const isRight = i === q.answer;
    const duration = Date.now() - shownAt.current;
    setPicked(i);
    sound(isRight ? "right" : "wrong");
    if (!isRight) hints.noteMiss();
    if (q.cardId) await grade(q.cardId, Math.min(isRight ? 3 : 1, hints.ceiling) as 1 | 2 | 3, duration);
    onAnswered(isRight);
    setBusy(false);
  }, [answered, busy, q, hints, grade, sound, onAnswered]);

  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (answered) {
        if (!inEditable(e.target) && isAdvanceKey(e)) { e.preventDefault(); onNext(); }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) { e.preventDefault(); void pick(n - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, answered, q, pick, onNext]);

  const wasRight = picked === q.answer;
  return (
    <>
      <div className="px-6 pt-4">
        <MapPicture scene={q.scene} />
        <p className="mt-1 text-center text-sm" style={{ color: "var(--ink-3)" }}>
          <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{q.lemma}</span>, {q.gloss}
        </p>
      </div>
      <p className="px-6 pt-4 text-center text-xl font-semibold" style={{ color: "var(--accent-deep)" }}>
        {t(q.scene.ask)}
      </p>

      <div className="grid grid-cols-1 gap-2 px-6 py-4 lg:grid-cols-3">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const state = answered ? OPTION_CLASS[optionState(isAnswer, isPicked)] : "";
          const out = !answered && struck.includes(o.text);
          return (
            <button key={o.key} type="button" disabled={answered || busy} onClick={() => void pick(i)}
              className={`choice-btn ${state} flex items-center gap-2 rounded-[var(--r)] border px-4 py-3 text-left text-base font-semibold disabled:cursor-default`}
              style={answered ? undefined : {
                "--choice-bg": "var(--raised)", "--choice-border": "transparent", color: "var(--ink)",
              } as CSSProperties}>
              <KeyCap>{i + 1}</KeyCap>
              <span lang="et" className={`flex-1 ${out ? "line-through" : ""}`}>{o.text}</span>
              {out && <span className="sr-only"> {t("(ruled out by a hint)")}</span>}
              {answered && isAnswer && <Check size={15} aria-label={t("Right")} />}
              {answered && isPicked && !isAnswer && <X size={15} aria-label={t("Your pick")} />}
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="border-t px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <HintLadder ladder={narrowLadder(texts, correct)} taken={hints.taken} onTake={hints.take} open={hints.open}
            label="this word" graded={q.cardId !== null} />
        </div>
      )}

      {answered && (
        <div className="flex flex-col gap-4 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          <p role="status" className={`verdict-panel ${VERDICT_CLASS[wasRight ? "right" : "wrong"]}`}>
            {wasRight ? t("Yes.") : t("Not that one.")}{" "}
            {rich(t("{form} is what the picture shows."), {
              form: <span lang="et" data-answer="" className="font-semibold">{correct}</span>,
            })}
          </p>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {fill(t("The noun in its omastav form, then {word}. {word} means {meaning}."), {
              word: q.place, meaning: t(MEANINGS[q.place] ?? "where it is"),
            })}
          </p>
          <EstonianSentence
            et={q.sentence} en={q.en} lexemeId={q.lexemeId} canTranslate={canTranslate}
            form={q.form} ask="onArrival" speakLabel={t("Hear the sentence")}
          />
        </div>
      )}

      {answered && (
        <div ref={footer} className="dock-clear border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          <Button variant="primary" size="lg" className="w-full" autoFocus onClick={onNext}>
            {t("Continue")}
            <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        </div>
      )}
    </>
  );
}

/** What each place word says, in English, for the line under the answer. */
const MEANINGS: Readonly<Record<string, string>> = {
  peal: "on top of",
  all: "under",
  ees: "in front of",
  taga: "behind",
  kõrval: "next to",
  kohal: "above",
};
