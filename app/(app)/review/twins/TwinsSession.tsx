"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Scale, X } from "lucide-react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { EstonianSentence } from "@/components/EstonianSentence";
import { GapMeaning } from "@/components/GapMeaning";
import { TrParts } from "@/components/TrParts";
import { StarWord } from "@/components/StarWord";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { useGrade } from "@/components/round/useGrade";
import { WayOut } from "@/components/round/RoundExit";
import { RoundProgress } from "@/components/round/RoundProgress";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { useKeepInView } from "@/components/round/useKeepInView";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { gapMeaning } from "@/lib/copy/gapMeaning";
import { narrowLadder, struckOptions } from "@/lib/questions/hints";
import { OPTION_CLASS, VERDICT_CLASS, optionState, type Verdict } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { DRIFTED_NOTE, KIND_COPY, letterRuns, splitAtGap, twinGroup } from "@/lib/collections/twins";
import type { TwinQuestion } from "@/lib/progress/twinQuestions";

export type TwinsQuestion = TwinQuestion & { cardId: string | null; starred: boolean };

/**
 * KAKSIKUD, PLAYED.
 *
 * Two shapes of question (`lib/progress/twinQuestions.ts`): a recorded
 * sentence with one word of a look-alike group taken out and its English
 * above it, or one word of a rule pair and what the other one means.
 *
 * A sentence question grades the answer's own card through `gradeCard`
 * (ADR-016): Good for the word the writer used, Hard for a word Estonian lets
 * stand in there, which is the call the review card makes about a second right
 * word, and Again for the look-alike. A word the learner holds no card for
 * writes nothing, and neither does a guess, which is reasoned rather than
 * recalled.
 *
 * AFTERWARDS THE PAIR, SIDE BY SIDE. What each word means, where the letters
 * part ways for a look-alike, the rule for a pair a rule built, and a sentence
 * using the other word. That last one is the point of the round: two sentences
 * next to each other say the difference faster than a definition.
 */
export function TwinsSession({ questions: initialQuestions, canTranslate, focusTitle }: {
  questions: TwinsQuestion[];
  canTranslate: boolean;
  /** The group the round is drilling, where the address named one. */
  focusTitle: string | null;
}) {
  const t = useT();
  const grade = useGrade();
  const sound = useFeedbackSound();
  // Snapshotted on mount: `gradeCard` refreshes this route.
  const [questions] = useState(initialQuestions);
  const [wasEmptyAtStart] = useState(initialQuestions.length === 0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [asked, setAsked] = useState(0);
  const [busy, setBusy] = useState(false);
  const shownAt = useRef(Date.now());

  const q = questions[index];
  const look = useLookBack();
  const finished = !q;
  const answered = picked !== null;
  const footer = useKeepInView<HTMLDivElement>(answered ? index : null);

  const texts = !q ? [] : q.shape === "sentence" ? q.options.map((o) => o.text) : q.options;
  const correct = q ? texts[q.answer] ?? "" : "";
  const ladder = q ? narrowLadder(texts, correct) : [];
  const hintWord = q ? (q.shape === "sentence" ? q.lexemeId : q.asked.lexemeId) : null;
  const hints = useHints({ word: hintWord, question: q ? `${q.groupId}:${index}` : null, ladder });
  const struck = q ? struckOptions(texts, correct, hints.taken) : [];

  useEffect(() => { shownAt.current = Date.now(); setPicked(null); }, [index]);

  const verdictOf = useCallback((i: number): Verdict => {
    if (!q) return "wrong";
    if (i === q.answer) return "right";
    return q.shape === "sentence" && q.standIns.includes(i) ? "nearly" : "wrong";
  }, [q]);

  const pick = useCallback(async (i: number) => {
    if (!q || answered || busy) return;
    setBusy(true);
    const verdict = verdictOf(i);
    setPicked(i);
    sound(verdict === "wrong" ? "wrong" : "right");
    if (verdict === "wrong") hints.noteMiss();
    if (q.cardId) {
      const earned = verdict === "right" ? 3 : verdict === "nearly" ? 2 : 1;
      await grade(q.cardId, Math.min(earned, hints.ceiling) as 1 | 2 | 3, Date.now() - shownAt.current);
    }
    setAsked((n) => n + 1);
    if (verdict !== "wrong") setRight((n) => n + 1);
    setBusy(false);
  }, [q, answered, busy, verdictOf, hints, grade, sound]);

  const next = useCallback(() => {
    if (!answered || !q) return;
    look.record(q.shape === "sentence"
      ? {
          of: `${q.groupId}:${index}`, label: "Kaksikud", question: q.en, answer: q.form,
          note: null, questionLang: "en", answerLang: "et", speak: q.sentence,
        }
      : {
          of: `${q.groupId}:${index}`, label: "Kaksikud", question: q.asked.lemma, answer: correct,
          note: null, questionLang: "et", answerLang: "en", speak: q.asked.lemma,
        });
    setIndex((n) => n + 1);
  }, [answered, q, index, correct, look]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e)) { e.preventDefault(); look.forward(); }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || inEditable(e.target)) return;
      if (e.key.toLowerCase() === "b" && look.seen.length > 0) { e.preventDefault(); look.open(); return; }
      if (answered) { if (isAdvanceKey(e)) { e.preventDefault(); next(); } return; }
      const n = Number(e.key);
      if (n >= 1 && n <= texts.length) { e.preventDefault(); void pick(n - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, answered, texts.length, pick, next, look]);

  if (wasEmptyAtStart) {
    return (
      <Page title="Kaksikud" lead={t("Words that look alike and mean different things.")}>
        <Empty
          title={t("No pairs to practise yet")}
          body={t("The pairs open as the course teaches both words of them.")}
          action={<ButtonLink href="/grammar/twins" variant="primary">{t("See the pairs")}</ButtonLink>}
        />
      </Page>
    );
  }

  if (finished) {
    const accuracy = asked > 0 ? Math.round((right / asked) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
          <Mascot size={68} mood="cheer" className="float mx-auto" />
          <h1 className="font-display mt-5 text-4xl font-bold tracking-tight md:text-5xl" style={{ color: "var(--ink)" }}>
            {t("That's the round done")}
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
            {accuracy >= 80
              ? fill(t("You told {n} of {total} apart."), { n: right, total: asked })
              : fill(t("{n} of {total}. The ones you mixed up come back sooner in your reviews."), { n: right, total: asked })}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile value={right} label={t("Right")} tone="accent" />
          <StatTile value={`${accuracy}%`} label={t("Accuracy")} tone={accuracy >= 85 ? "sky" : "butter"} />
          <StatTile value={asked} label={t("Pairs")} tone="sky" />
        </div>
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/grammar/twins" size="lg">{t("See all the pairs")}</ButtonLink>
          <ButtonLink href="/review/twins" variant="primary" size="lg">{t("Play again")}</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const verdict = answered ? verdictOf(picked) : null;
  const group = twinGroup(q.groupId);
  const pickedText = answered ? texts[picked] ?? "" : "";
  const said = !answered ? ""
    : q.shape === "sentence"
      ? verdict === "right"
        ? fill(t("Yes. {word} is the one that fits."), { word: correct })
        : verdict === "nearly"
          ? fill(t("{picked} works here too. The writer used {word}."), { picked: pickedText, word: correct })
          : fill(t("Not this one. It's {word}."), { word: correct })
      : verdict === "right"
        ? fill(t("Yes. {word} means {means}."), { word: q.asked.lemma, means: correct })
        : fill(t("Not quite. {word} means {means}."), { word: q.asked.lemma, means: correct });
  const remaining = questions.length - index;

  const meaning = q.shape === "sentence" ? gapMeaning({ en: q.en, answer: q.form, cue: q.gloss }) : null;
  const [before, after] = q.shape === "sentence" ? splitAtGap(q.gapped) : ["", ""];

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Kaksikud</h1>
      {/* Mounted before there is anything to say, so a screen reader hears the verdict. */}
      <p className="sr-only" role="status">{said}</p>
      <RoundProgress done={index} total={questions.length} left={remaining} label={t("Session progress")} endHref="/practice" />

      {look.panel ? <LookBackCard {...look.panel} /> : (
        <div className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
          <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
            <Chip tone="accent"><Scale size={12} aria-hidden /> Kaksikud</Chip>
            <Chip>{focusTitle ?? t(KIND_COPY[q.kind].short)}</Chip>
            {/* The count and the star travel together, so on a phone the star
                never wraps onto a line of its own under the chips. */}
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>{fill(t("{n} right"), { n: right })}</span>
              {/* After the answer, since the label names the word the question is hiding. */}
              {answered && (
                <StarWord
                  lexemeId={q.shape === "sentence" ? q.lexemeId : q.asked.lexemeId}
                  starred={q.starred}
                  label={q.shape === "sentence" ? q.lemma : q.asked.lemma}
                />
              )}
            </span>
          </div>

          {q.shape === "sentence" ? (
            <div className="flex flex-col gap-3 px-6 pt-6">
              <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Which word did the writer use?")}</p>
              {!answered && meaning && <GapMeaning meaning={meaning} className="text-lg leading-snug" />}
              <p lang="et" className="text-xl font-semibold leading-snug" style={{ color: "var(--ink)" }}>
                {before}
                {answered ? (
                  <span className="rounded px-1" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>{q.form}</span>
                ) : (
                  <span className="inline-block min-w-[3.5em] border-b-2 align-baseline" style={{ borderColor: "var(--accent)" }}>
                    <span aria-hidden>&nbsp;</span><span className="sr-only">{t("missing word")}</span>
                  </span>
                )}
                {after}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-6 pt-6">
              <p className="text-lg" style={{ color: "var(--ink-2)" }}>
                <TrParts template="{word} means {means}." parts={{
                  word: <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{q.known.lemma}</span>,
                  means: t(q.known.means),
                }} />
              </p>
              <p className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
                <TrParts template="So what does {word} mean?" parts={{
                  word: <span lang="et" style={{ color: "var(--accent-deep)" }}>{q.asked.lemma}</span>,
                }} />
              </p>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t(KIND_COPY[q.kind].short)}.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-2">
            {texts.map((text, i) => {
              const isAnswer = i === q.answer;
              const isPicked = i === picked;
              const state = answered ? OPTION_CLASS[optionState(isAnswer, isPicked)] : "";
              const out = !answered && struck.includes(text);
              return (
                <button key={`${text}-${i}`} type="button" disabled={answered || busy} onClick={() => void pick(i)}
                  className={`choice-btn ${state} flex items-center gap-2 rounded-[var(--r)] border px-4 py-3 text-left text-base font-semibold disabled:cursor-default`}
                  style={answered ? undefined : {
                    "--choice-bg": "var(--raised)", "--choice-border": "transparent", color: "var(--ink)",
                  } as CSSProperties}>
                  <KeyCap>{i + 1}</KeyCap>
                  <span lang={q.shape === "sentence" ? "et" : "en"} className={`flex-1 ${out ? "line-through" : ""}`}>{text}</span>
                  {out && <span className="sr-only"> {t("(ruled out by a hint)")}</span>}
                  {answered && isAnswer && <Check size={15} aria-label={t("Right")} />}
                  {answered && isPicked && !isAnswer && <X size={15} aria-label={t("Your pick")} />}
                </button>
              );
            })}
          </div>

          {!answered && (
            <div className="border-t px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
              <HintLadder ladder={ladder} taken={hints.taken} onTake={hints.take} open={hints.open}
                label="this pair" graded={q.cardId !== null} />
            </div>
          )}

          {answered && (
            <div className="flex flex-col gap-4 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <p className={`verdict-panel ${VERDICT_CLASS[verdict ?? "wrong"]}`}>{said}</p>

              {group && (
                <div className="rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
                  <ul className="flex flex-col gap-1.5">
                    {group.words.map((w) => {
                      const other = group.words.find((o) => o.lemma !== w.lemma)?.lemma ?? w.lemma;
                      return (
                        <li key={w.lemma} className="flex flex-wrap items-baseline gap-x-2">
                          <span lang="et" className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                            {group.kind === "lookalike"
                              ? letterRuns(w.lemma, other).map((r, k) => (
                                  <span key={k} style={r.differs ? { color: "var(--accent-deep)", textDecoration: "underline", textUnderlineOffset: "3px" } : undefined}>{r.text}</span>
                                ))
                              : w.lemma}
                          </span>
                          <span className="text-base" style={{ color: "var(--ink-2)" }}>{t(w.means)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                    {group.drifted ? t(DRIFTED_NOTE) : t(group.tell ?? KIND_COPY[group.kind].rule)}
                  </p>
                </div>
              )}

              {q.shape === "sentence" && (
                <>
                  <EstonianSentence
                    et={q.sentence} en={q.en} lexemeId={q.lexemeId} canTranslate={canTranslate}
                    form={q.form} ask="onArrival" speakLabel={t("Hear the sentence")}
                  />
                  {q.contrast && (
                    <div>
                      <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>
                        {t("And the other one, in a sentence of its own")}
                      </p>
                      <EstonianSentence
                        et={q.contrast.sentence} en={q.contrast.en} lexemeId={q.contrast.lexemeId}
                        canTranslate={canTranslate} form={q.contrast.form} ask="never"
                        speakLabel={t("Hear the sentence")}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {answered && (
            <div ref={footer} className="dock-clear border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <Button variant="primary" size="lg" className="w-full" autoFocus onClick={next}>
                {t("Continue")}
                <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-center text-2xs" style={{ color: "var(--ink-3)" }}>
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}
