"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSingleKeys } from "@/components/SingleKeys";
import { mayActOnKey } from "@/lib/ux/shortcuts";
import { useFocusAnswer } from "@/components/round/useFocusAnswer";
import { RetypeBox, useRetype } from "@/components/round/Retype";
import { PARTS } from "@/lib/copy/values";
import { Check, Keyboard, Map as MapIcon, X } from "lucide-react";
import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { answerNote } from "@/lib/copy/answerNote";
import { rich } from "@/components/round/rich";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page } from "@/components/ui";
import { CaseQuestion } from "@/components/CaseQuestion";
import { EstonianSentence } from "@/components/EstonianSentence";
import { DiacriticBar } from "@/components/DiacriticBar";
import { FitText } from "@/components/FitText";
import { StarWord } from "@/components/StarWord";
import { MapPicture } from "@/components/round/MapScene";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { useGrade } from "@/components/round/useGrade";
import { EndSession } from "@/components/round/RoundExit";
import { RoundDone } from "@/components/round/RoundDone";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { useKeepInView } from "@/components/round/useKeepInView";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { hintLadder, narrowLadder, struckOptions } from "@/lib/questions/hints";
import { OPTION_CLASS, VERDICT_CLASS, optionState, verdictOfMark } from "@/lib/ux/verdict";
import { MAP_CASES } from "@/lib/games/map";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { markForm, type FlashMark } from "@/lib/games/flash";
import { caseByKey } from "@/lib/estonian/cases";
import { isFormSlot } from "@/lib/srs/slots";
import { PlaceCard } from "@/components/round/PlaceCard";
import type { PlaceQuestion, RoundQuestion } from "@/lib/progress/map";

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
  questions: RoundQuestion[];
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
  const locale = useLocale();
  const [asked, setAsked] = useState(0);
  /* What came out wrong, in the order it was asked, for the last screen. */
  const [missed, setMissed] = useState<RoundQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [mark, setMark] = useState<FlashMark | null>(null);
  /* A typed answer short of a clean hit is typed again before the card lets
     go. Held beside `mark` because a hint lowers the mark's rating, and a
     right answer that cost a hint is not a miss. */
  const [owesRetype, setOwesRetype] = useState(false);
  const shownAt = useRef(Date.now());

  const q = questions[index];
  /* The case question in play, or nothing where it is a place question, which
     is a card of its own (`PlaceCard`) with its own keys. */
  const cq = q?.kind === "case" ? q : undefined;
  const look = useLookBack();
  const finished = !q;
  const answered = picked !== null || mark !== null;
  const answerBox = useRef<HTMLInputElement>(null);
  useFocusAnswer(answerBox, !answered && !look.looking, index);

  const typedRung = cq?.rung === 3;
  const retype = useRetype(cq ? cq.accepted.join(PARTS) : "", cq ? `${cq.lexemeId}:${cq.caseKey}:${index}` : "");
  const needsRetype = typedRung && owesRetype && !retype.ok;
  const footer = useKeepInView<HTMLDivElement>(answered ? index : null);

  /*
    The way out of being stuck is crossing one option out, worst rival first,
    which leaves the pair worth telling apart standing longest. A hint is paid
    for: it caps the grade (`lib/questions/hints.ts`).
  */
  const texts = cq ? cq.options.map((o) => o.text) : [];
  const correct = cq ? cq.options[cq.answer]!.text : "";
  const ladder = !cq ? []
    : typedRung
      /* Nothing to cross out when nothing is offered, so the top rung uncovers
         the form from the end, where the ending is, the way the flash round does. */
      ? hintLadder({ answer: correct, stems: [cq.lemma], suffix: caseByKey(cq.caseKey)?.suffix })
      : narrowLadder(texts, correct);
  const hints = useHints({ word: cq?.lexemeId ?? null, question: cq ? `${cq.lexemeId}:${cq.caseKey}` : null, ladder });
  const struck = cq && !typedRung ? struckOptions(texts, correct, hints.taken) : [];

  useEffect(() => { shownAt.current = Date.now(); setPicked(null); setMark(null); setOwesRetype(false); setTyped(""); }, [index]);

  const pick = useCallback(async (i: number) => {
    if (!cq || answered || busy) return;
    setBusy(true);
    const isRight = i === cq.answer;
    const duration = Date.now() - shownAt.current;
    setPicked(i);
    sound(isRight ? "right" : "wrong");
    if (!isRight) { hints.noteMiss(); setMissed((m) => [...m, cq]); }
    if (cq.cardId) {
      await grade(
        cq.cardId, Math.min(isRight ? 3 : 1, hints.ceiling) as 1 | 2 | 3, duration,
        cq.caseKey, isRight ? undefined : cq.options[i]!.key,
      );
    }
    setAsked((n) => n + 1);
    if (isRight) setRight((n) => n + 1);
    setBusy(false);
  }, [cq, answered, busy, hints, grade, sound]);

  const check = useCallback(async () => {
    if (!cq || mark || busy || typed.trim().length === 0) return;
    setBusy(true);
    const marked = markForm({ accepted: cq.accepted, slot: cq.caseKey, label: cq.label, index: cq.index }, typed);
    // A hint can only lower what the answer earned.
    const result = { ...marked, rating: Math.min(marked.rating, hints.ceiling) as FlashMark["rating"] };
    const duration = Date.now() - shownAt.current;
    setMark(result);
    setOwesRetype(marked.rating < 3);
    sound(result.right ? "right" : "wrong");
    if (!result.right) { hints.noteMiss(); setMissed((m) => [...m, cq]); }
    if (cq.cardId) {
      const reached = result.wroteSlot && result.wroteSlot !== cq.caseKey && isFormSlot(result.wroteSlot)
        ? result.wroteSlot : undefined;
      await grade(cq.cardId, result.rating, duration, cq.caseKey, result.right ? undefined : reached);
    }
    setAsked((n) => n + 1);
    if (result.right) setRight((n) => n + 1);
    setBusy(false);
  }, [cq, mark, busy, typed, hints, grade, sound]);

  /* Both kinds of card leave through here, so a look back has the last one of
     either. */
  const advance = useCallback((done: RoundQuestion, answer: string) => {
    look.record({
      of: done.lexemeId, label: t("Map"),
      question: `${done.lemma}: ${done.kind === "case" && done.rung !== 1 ? done.ask : t(done.scene.ask)}`,
      answer, note: null, questionLang: "et", answerLang: "et", speak: done.sentence,
    });
    setIndex((i) => i + 1);
  }, [look, t]);

  const next = useCallback(() => {
    if (!answered || needsRetype || !cq) return;
    advance(cq, correct);
  }, [answered, cq, correct, advance, needsRetype]);

  const placeAnswered = useCallback((isRight: boolean) => {
    if (!q) return;
    setAsked((n) => n + 1);
    if (isRight) setRight((n) => n + 1);
    else setMissed((m) => [...m, q]);
  }, [q]);

  const singleKeys = useSingleKeys();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e)) { e.preventDefault(); look.forward(); }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!mayActOnKey(e, singleKeys)) return;
      if (!inEditable(e.target) && e.key.toLowerCase() === "b" && look.seen.length > 0) { e.preventDefault(); look.open(); return; }
      /* A place question listens for its own keys. */
      if (!cq) return;
      /* A miss waits for its retype, which the box handles itself on Enter, and
         a key from that box is the box's: its render and effects are flushed
         inside the keydown, so `needsRetype` already reads false by now. */
      if (answered) { if (!needsRetype && !inEditable(e.target) && isAdvanceKey(e)) { e.preventDefault(); next(); } return; }
      // Typing a form: Enter checks, and then Enter moves on, one key for the round.
      if (typedRung) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        void check();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= cq.options.length) { e.preventDefault(); void pick(n - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [singleKeys, finished, answered, cq, typedRung, pick, check, next, look, needsRetype]);

  if (wasEmptyAtStart) {
    return (
      <Page title={t("Map")} lead={t("See what an ending means, then pick it.")}>
        <Empty
          title={t("Nothing to map yet")}
          body={t("It needs nouns with a recorded sentence at your level.")}
          action={<ButtonLink href="/dictionary" variant="primary">{t("Open the dictionary")}</ButtonLink>}
        />
      </Page>
    );
  }

  if (finished) {
    const accuracy = asked > 0 ? Math.round((right / asked) * 100) : 0;
    return (
      <RoundDone
        title={t("That’s the round done")}
        line={accuracy >= 80
          ? fill(t("You matched {n} of {total} endings to their pictures."), { n: right, total: asked })
          : fill(t("{n} of {total}. The ones you missed come back sooner."), { n: right, total: asked })}
        figures={[
          { value: right, label: t("Right") },
          { value: `${accuracy}%`, label: t("Accuracy") },
          { value: asked, label: t("Endings") },
        ]}
        missed={missed.map((m) => ({
          et: m.options[m.answer]?.text ?? m.form,
          lemma: m.lemma,
          note: <><span lang="et">{m.lemma}</span>, {m.gloss}</>,
        }))}
        again={t("Play again")}
      />
    );
  }

  const mq = q.kind === "case" ? q : null;
  const wasRight = mq !== null && (typedRung ? mark?.right === true : picked === mq.answer);
  /* What is said once it is answered: the marker's own line where there is one,
     which is how a wrong ending gets named and a dropped letter gets pointed at. */
  const said = typedRung && mark?.note ? answerNote(mark.note, locale) : null;
  const remaining = questions.length - index;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">{t("Map")}</h1>
      {/* Mounted before there is anything to say, and only its words change: a
          status region that arrives with its sentence already in it is one a
          screen reader may never read out. */}
      <p className="sr-only" role="status">
        {answered ? `${wasRight ? t("Right.") : t("Not that one.")} ${fill(t("{form} is the form."), { form: correct })}${said ? ` ${said}` : ""}` : ""}
      </p>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession href="/practice" />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div className="grad-accent h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max((index / questions.length) * 100, 2)}%` }}
            role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={questions.length}
            aria-label={t("Session progress")} />
        </div>
        <span className="tnum label-xs rounded-full px-2.5 py-1"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
          {fill(t("{n} left"), { n: remaining })}
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
        <div className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
          <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
            <Chip tone="accent"><MapIcon size={12} aria-hidden /> {t("Map")}</Chip>
            <Chip>{!mq ? t("Place") : mq.rung === 1 ? t("Picture") : mq.rung === 2 ? t("Question") : t("Type it")}</Chip>
            <span className="ml-auto text-xs" style={{ color: "var(--ink-3)" }}>{fill(t("{n} right"), { n: right })}</span>
            <StarWord lexemeId={q.lexemeId} starred={q.starred} label={q.lemma} />
          </div>

          {!mq && (
            <PlaceCard key={index} q={q as PlaceQuestion} index={index} paused={look.looking} canTranslate={canTranslate}
              onAnswered={placeAnswered} onNext={() => advance(q, (q as PlaceQuestion).options[(q as PlaceQuestion).answer]!.text)} />
          )}
          {mq && (<>
          {/* The picture is the question on the first rung and the lesson on the
              others, so it comes back once the answer is in. */}
          {(mq.rung === 1 || answered) ? (
            <div className="px-6 pt-4">
              <MapPicture scene={mq.scene} />
              <p className="mt-1 text-center text-sm" style={{ color: "var(--ink-3)" }}>
                <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{mq.lemma}</span>, {mq.gloss}
              </p>
            </div>
          ) : (
            <div className="round-stage flex flex-col items-center justify-center gap-2 px-6 text-center">
              <FitText as="p" text={mq.lemma} lang="et" className="round-word font-bold tracking-tight" style={{ color: "var(--ink)" }} />
              <p className="text-base" style={{ color: "var(--ink-2)" }}>{mq.gloss}</p>
              <p className="mt-2 text-xl font-semibold" style={{ color: "var(--accent-deep)" }}>
                <CaseQuestion question={mq.ask} />
              </p>
            </div>
          )}

          {mq.rung === 1 && (
            <p className="px-6 pt-4 text-center text-xl font-semibold" style={{ color: "var(--accent-deep)" }}>
              {t(mq.scene.ask)}
            </p>
          )}

          {typedRung ? (
            <div className="px-6 py-4">
              <label htmlFor="answer" className="label-xs block" style={{ color: "var(--ink-3)" }}>
                {t("Say it in the form that answers the question")}
              </label>
              <input
                id="answer" ref={answerBox} value={typed} lang="et" autoFocus autoComplete="off" autoCapitalize="off"
                spellCheck={false} disabled={answered} onChange={(e) => setTyped(e.target.value)}
                className="field-lg mt-2 w-full text-lg disabled:opacity-70"
                style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
              />
              {!answered && <div className="under-field"><DiacriticBar /></div>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 px-6 py-4 lg:grid-cols-3">
              {mq.options.map((o, i) => {
                const isAnswer = i === mq.answer;
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
          )}

          {!answered && (
            <div className="border-t px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
              <HintLadder ladder={ladder} taken={hints.taken} onTake={hints.take} open={hints.open}
                label="this word" graded={mq.cardId !== null} />
            </div>
          )}

          {answered && (
            <div className="flex flex-col gap-4 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <p className={`verdict-panel ${VERDICT_CLASS[typedRung && mark ? verdictOfMark(mark) : wasRight ? "right" : "wrong"]}`}>
                {/* Where the marker's own line already names the form, it is the whole
                    sentence: saying the answer and then the answer again is noise. */}
                {said && said.includes(correct) ? said : (<>
                  {wasRight ? t("Yes.") : t("Not that one.")}{" "}
                  {rich(t(typedRung ? "{form} is the form." : "{form} is what the picture shows."), {
                    form: <span lang="et" data-answer="" className="font-semibold">{correct}</span>,
                  })}
                  {said ? ` ${said}` : ""}
                </>)}
              </p>

              {typedRung && owesRetype && <RetypeBox retype={retype} />}

              <div className="grid grid-cols-3 gap-2">
                {[...mq.options].sort((a, b) => MAP_CASES.indexOf(a.key) - MAP_CASES.indexOf(b.key)).map((o) => {
                  const on = o.key === mq.caseKey;
                  return (
                    <div key={o.key} className="rounded-[var(--r-lg)] border px-2 py-3 text-center"
                      style={{ background: on ? "var(--accent-soft)" : "var(--surface)", borderColor: on ? "var(--accent)" : "var(--rule)" }}>
                      <p lang="et" className="text-lg font-bold" style={{ color: on ? "var(--accent-deep)" : "var(--ink)" }}>
                        {o.ending ?? o.text}
                      </p>
                      {o.ending
                        ? <p lang="et" className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{o.text}</p>
                        : <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("one to learn")}</p>}
                      <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
                        <CaseQuestion question={o.ask} inline />
                      </p>
                    </div>
                  );
                })}
              </div>

              <EstonianSentence
                et={mq.sentence} en={mq.en} lexemeId={mq.lexemeId} canTranslate={canTranslate}
                form={mq.form} ask="onArrival" speakLabel={t("Hear the sentence")}
              />
            </div>
          )}

          {typedRung && !answered && (
            <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <Button variant="primary" size="lg" className="w-full" disabled={typed.trim().length === 0 || busy}
                onClick={() => void check()}>
                <Keyboard size={16} aria-hidden /> {t("Check it")}
                <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          )}

          {answered && (
            <div ref={footer} className="dock-clear border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
              <Button variant="primary" size="lg" className="w-full" autoFocus onClick={needsRetype ? retype.check : next}>
                {needsRetype ? t("Check it again") : t("Continue")}
                <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          )}
          </>)}
        </div>
      )}

      <div className="mt-4 flex justify-center text-2xs" style={{ color: "var(--ink-3)" }}>
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}
