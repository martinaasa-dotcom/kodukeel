"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Keyboard, Map as MapIcon, X } from "lucide-react";
import { useT } from "@/components/Locale";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { CaseQuestion } from "@/components/CaseQuestion";
import { EstonianSentence } from "@/components/EstonianSentence";
import { DiacriticBar } from "@/components/DiacriticBar";
import { FitText } from "@/components/FitText";
import { StarWord } from "@/components/StarWord";
import { MapPicture } from "@/components/round/MapScene";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { useGrade } from "@/components/round/useGrade";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { useKeepInView } from "@/components/round/useKeepInView";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { hintLadder, narrowLadder, struckOptions } from "@/lib/questions/hints";
import { OPTION_CLASS, VERDICT_CLASS, optionState } from "@/lib/ux/verdict";
import { MAP_CASES } from "@/lib/games/map";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { markForm, type FlashMark } from "@/lib/games/flash";
import { caseByKey } from "@/lib/estonian/cases";
import { isFormSlot } from "@/lib/srs/slots";
import type { MapQuestion } from "@/lib/progress/map";

/**
 * MAP.
 *
 * A picture of something moving, and three forms of one word to tell apart.
 * Untimed, because the point is what the ending means and a clock turns that
 * back into a reflex, which Target already is.
 *
 * Every answer grades through `gradeCard` (ADR-016) with the case that was
 * asked, and a wrong pick writes which case was reached for instead, so the
 * pair somebody mixes up here is counted with the pair they mix up on a card.
 * A word the learner holds no card for writes nothing, which is what the round
 * says about itself and not a gap in it.
 *
 * THREE RUNGS, AND THE LOG DECIDES WHICH. A word is first met as a picture,
 * then asked by the question a class uses with the picture gone, then typed
 * from an empty box (`rungFrom` in `lib/games/map.ts`). The picture comes back
 * after the answer on the two harder rungs, because that is the lesson.
 *
 * THE REVEAL IS THE SENTENCE. A form nobody can be shown in use is a form this
 * app cannot teach, so every question exists because a lexicographer's
 * sentence holds the asked form, and it is printed after the answer with the
 * form marked, beside the three endings as a set.
 */
export function MapSession({ questions: initialQuestions, canTranslate }: {
  questions: MapQuestion[];
  canTranslate: boolean;
}) {
  const grade = useGrade();
  const sound = useFeedbackSound();
  // Snapshotted on mount: `gradeCard` refreshes this route, and a round whose
  // questions changed under the player is a different round.
  const [questions] = useState(initialQuestions);
  const [wasEmptyAtStart] = useState(initialQuestions.length === 0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const t = useT();
  const [asked, setAsked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [mark, setMark] = useState<FlashMark | null>(null);
  const shownAt = useRef(Date.now());

  const q = questions[index];
  const look = useLookBack();
  const finished = !q;
  const answered = picked !== null || mark !== null;
  const typedRung = q?.rung === 3;
  const footer = useKeepInView<HTMLDivElement>(answered ? index : null);

  /*
    The way out of being stuck is crossing one option out, worst rival first,
    which leaves the pair worth telling apart standing longest. A hint is paid
    for: it caps the grade (`lib/questions/hints.ts`).
  */
  const texts = q ? q.options.map((o) => o.text) : [];
  const correct = q ? q.options[q.answer]!.text : "";
  const ladder = !q ? []
    : typedRung
      /* Nothing to cross out when nothing is offered, so the top rung uncovers
         the form from the end, where the ending is, the way the flash round does. */
      ? hintLadder({ answer: correct, stems: [q.lemma], suffix: caseByKey(q.caseKey)?.suffix })
      : narrowLadder(texts, correct);
  const hints = useHints({ word: q?.lexemeId ?? null, question: q ? `${q.lexemeId}:${q.caseKey}` : null, ladder });
  const struck = q && !typedRung ? struckOptions(texts, correct, hints.taken) : [];

  useEffect(() => { shownAt.current = Date.now(); setPicked(null); setMark(null); setTyped(""); }, [index]);

  const pick = useCallback(async (i: number) => {
    if (!q || answered || busy) return;
    setBusy(true);
    const isRight = i === q.answer;
    const duration = Date.now() - shownAt.current;
    setPicked(i);
    sound(isRight ? "right" : "wrong");
    if (!isRight) hints.noteMiss();
    if (q.cardId) {
      await grade(
        q.cardId, Math.min(isRight ? 3 : 1, hints.ceiling) as 1 | 2 | 3, duration,
        q.caseKey, isRight ? undefined : q.options[i]!.key,
      );
    }
    setAsked((n) => n + 1);
    if (isRight) setRight((n) => n + 1);
    setBusy(false);
  }, [q, answered, busy, hints, grade, sound]);

  const check = useCallback(async () => {
    if (!q || mark || busy || typed.trim().length === 0) return;
    setBusy(true);
    const marked = markForm({ accepted: q.accepted, slot: q.caseKey, label: q.label, index: q.index }, typed);
    // A hint can only lower what the answer earned.
    const result = { ...marked, rating: Math.min(marked.rating, hints.ceiling) as FlashMark["rating"] };
    const duration = Date.now() - shownAt.current;
    setMark(result);
    sound(result.right ? "right" : "wrong");
    if (!result.right) hints.noteMiss();
    if (q.cardId) {
      const reached = result.wroteSlot && result.wroteSlot !== q.caseKey && isFormSlot(result.wroteSlot)
        ? result.wroteSlot : undefined;
      await grade(q.cardId, result.rating, duration, q.caseKey, result.right ? undefined : reached);
    }
    setAsked((n) => n + 1);
    if (result.right) setRight((n) => n + 1);
    setBusy(false);
  }, [q, mark, busy, typed, hints, grade, sound]);

  const next = useCallback(() => {
    if (!answered) return;
    if (q) {
      look.record({
        of: q.lexemeId, label: "Map", question: `${q.lemma}: ${q.rung === 1 ? q.scene.ask : q.ask}`, answer: correct,
        note: null, questionLang: "et", answerLang: "et", speak: q.sentence,
      });
    }
    setIndex((i) => i + 1);
  }, [answered, q, correct, look]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e)) { e.preventDefault(); look.forward(); }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!inEditable(e.target) && e.key.toLowerCase() === "b" && look.seen.length > 0) { e.preventDefault(); look.open(); return; }
      if (answered) { if (isAdvanceKey(e)) { e.preventDefault(); next(); } return; }
      // Typing a form: Enter checks, and then Enter moves on, one key for the round.
      if (typedRung) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        void check();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) { e.preventDefault(); void pick(n - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, answered, q, typedRung, pick, check, next, look]);

  if (wasEmptyAtStart) {
    return (
      <Page title="Map" lead="See what an ending means, then pick it.">
        <Empty
          title="Nothing to map yet"
          body="It needs nouns with a recorded sentence at your level."
          action={<ButtonLink href="/dictionary" variant="primary">Open the dictionary</ButtonLink>}
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
            That&rsquo;s the round done
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
            {accuracy >= 80
              ? <>You matched {right} of {asked} endings to their pictures.</>
              : <>{right} of {asked}. The ones you missed come back sooner, which is what they need.</>}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile value={right} label="Right" tone="accent" />
          <StatTile value={`${accuracy}%`} label="Accuracy" tone={accuracy >= 85 ? "sky" : "butter"} />
          <StatTile value={asked} label="Endings" tone="sky" />
        </div>
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/practice" size="lg">Back to practice</ButtonLink>
          <ButtonLink href="/review/map" variant="primary" size="lg">Play again</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const wasRight = typedRung ? mark?.right === true : picked === q.answer;
  /* What is said once it is answered: the marker's own line where there is one,
     which is how a wrong ending gets named and a dropped letter gets pointed at. */
  const said = typedRung && mark?.note ? mark.note : null;
  const remaining = questions.length - index;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Map</h1>
      {/* Mounted before there is anything to say, and only its words change: a
          status region that arrives with its sentence already in it is one a
          screen reader may never read out. */}
      <p className="sr-only" role="status">
        {answered ? `${wasRight ? "Right." : "Not that one."} ${correct} is the form.${said ? ` ${said}` : ""}` : ""}
      </p>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession href="/practice" />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div className="grad-accent h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max((index / questions.length) * 100, 2)}%` }}
            role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={questions.length}
            aria-label="Session progress" />
        </div>
        <span className="tnum label-xs rounded-full px-2.5 py-1"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
          {remaining} left
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
        <div className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
          <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
            <Chip tone="accent"><MapIcon size={12} aria-hidden /> Map</Chip>
            <Chip>{q.rung === 1 ? "Picture" : q.rung === 2 ? "Question" : "Type it"}</Chip>
            <span className="ml-auto text-xs" style={{ color: "var(--ink-3)" }}>{right} right</span>
            <StarWord lexemeId={q.lexemeId} starred={q.starred} label={q.lemma} />
          </div>

          {/* The picture is the question on the first rung and the lesson on the
              others, so it comes back once the answer is in. */}
          {(q.rung === 1 || answered) ? (
            <div className="px-6 pt-4">
              <MapPicture scene={q.scene} />
              <p className="mt-1 text-center text-sm" style={{ color: "var(--ink-3)" }}>
                <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{q.lemma}</span>, {q.gloss}
              </p>
            </div>
          ) : (
            <div className="round-stage flex flex-col items-center justify-center gap-2 px-6 text-center">
              <FitText as="p" text={q.lemma} lang="et" className="round-word font-bold tracking-tight" style={{ color: "var(--ink)" }} />
              <p className="text-base" style={{ color: "var(--ink-2)" }}>{q.gloss}</p>
              <p className="mt-2 text-xl font-semibold" style={{ color: "var(--accent-deep)" }}>
                <CaseQuestion question={q.ask} />
              </p>
            </div>
          )}

          {q.rung === 1 && (
            <p className="px-6 pt-4 text-center text-xl font-semibold" style={{ color: "var(--accent-deep)" }}>
              {t(q.scene.ask)}
            </p>
          )}

          {typedRung ? (
            <div className="px-6 py-4">
              <label htmlFor="answer" className="label-xs block" style={{ color: "var(--ink-3)" }}>
                Say it in the form that answers the question
              </label>
              <input
                id="answer" value={typed} lang="et" autoFocus autoComplete="off" autoCapitalize="off"
                spellCheck={false} disabled={answered} onChange={(e) => setTyped(e.target.value)}
                className="field-lg mt-2 w-full text-lg disabled:opacity-70"
                style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
              />
              {!answered && <div className="under-field"><DiacriticBar /></div>}
            </div>
          ) : (
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
                    {out && <span className="sr-only"> (ruled out by a hint)</span>}
                    {answered && isAnswer && <Check size={15} aria-label="Right" />}
                    {answered && isPicked && !isAnswer && <X size={15} aria-label="Your pick" />}
                  </button>
                );
              })}
            </div>
          )}

          {!answered && (
            <div className="border-t px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
              <HintLadder ladder={ladder} taken={hints.taken} onTake={hints.take} open={hints.open}
                label="this word" graded={q.cardId !== null} />
            </div>
          )}

          {answered && (
            <div className="flex flex-col gap-4 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <p className={`verdict-panel ${VERDICT_CLASS[wasRight ? "right" : "wrong"]}`}>
                {/* Where the marker's own line already names the form, it is the whole
                    sentence: saying the answer and then the answer again is noise. */}
                {said && said.includes(correct) ? said : (<>
                  {wasRight ? "Yes. " : "Not that one. "}
                  <span lang="et" className="font-semibold">{correct}</span>
                  {typedRung ? " is the form." : " is what the picture shows."}
                  {said ? ` ${said}` : ""}
                </>)}
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[...q.options].sort((a, b) => MAP_CASES.indexOf(a.key) - MAP_CASES.indexOf(b.key)).map((o) => {
                  const on = o.key === q.caseKey;
                  return (
                    <div key={o.key} className="rounded-[var(--r-lg)] border px-2 py-3 text-center"
                      style={{ background: on ? "var(--accent-soft)" : "var(--surface)", borderColor: on ? "var(--accent)" : "var(--rule)" }}>
                      <p lang="et" className="text-lg font-bold" style={{ color: on ? "var(--accent-deep)" : "var(--ink)" }}>
                        {o.ending ?? o.text}
                      </p>
                      {o.ending
                        ? <p lang="et" className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{o.text}</p>
                        : <p className="text-sm" style={{ color: "var(--ink-3)" }}>one to learn</p>}
                      <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
                        <CaseQuestion question={o.ask} inline />
                      </p>
                    </div>
                  );
                })}
              </div>

              <EstonianSentence
                et={q.sentence} en={q.en} lexemeId={q.lexemeId} canTranslate={canTranslate}
                form={q.form} ask="onArrival" speakLabel="Hear the sentence"
              />
            </div>
          )}

          {typedRung && !answered && (
            <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <Button variant="primary" size="lg" className="w-full" disabled={typed.trim().length === 0 || busy}
                onClick={() => void check()}>
                <Keyboard size={16} aria-hidden /> Check it
                <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          )}

          {answered && (
            <div ref={footer} className="dock-clear border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <Button variant="primary" size="lg" className="w-full" autoFocus onClick={next}>
                Continue
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
