"use client";

import { useLocale, useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { answerNote } from "@/lib/copy/answerNote";
import { rich } from "@/components/round/rich";
import { createRef, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useGrade } from "@/components/round/useGrade";
import { Check, Repeat } from "lucide-react";
import { addToDeck } from "@/app/actions";
import { KeepWordChoice, useKeepWord } from "@/components/KeepWord";
import { Button } from "@/components/Button";
import { Chip, KeyCap } from "@/components/ui";
import { EstonianInput } from "@/components/EstonianInput";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { hintLadder } from "@/lib/questions/hints";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { SuggestFix } from "@/components/SuggestFix";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { checkAnswer, countsAsRecalled, type AnswerCheck } from "@/lib/estonian/answer";
import { VERB_GROUP_LABELS } from "@/lib/estonian/morph";
import { VERDICT_CLASS, VERDICT_INK, verdictOfCheck } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, ADVANCE_KEY_LABEL, isAdvanceKey } from "@/lib/ux/advanceKey";
import { RoundDone, type WorthALook } from "@/components/round/RoundDone";
import { RoundProgress } from "@/components/round/RoundProgress";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { FitText } from "@/components/FitText";
import { useSpeech, useSpeechConfig } from "@/components/speech/useSpeech";
import { MicButton } from "@/components/speech/MicButton";
import { micInAnswerBox } from "@/components/speech/answerBoxMic";
import { splitAsked } from "@/lib/speech/chant";
import { heardAsSpelled, repairedInAnswer } from "@/lib/speech/verdict";
import { core, type Hearing } from "@/lib/speech/reconcile";

export type Tense = "present" | "conditional";

/**
 * What the learner does with a row.
 *
 * `type` is the table as a class runs it: the first person given, five to
 * write. `match` is the step before that, for somebody who has just met the
 * pronouns and the endings: the six forms are on the screen and each is put
 * beside its pronoun. It was asked for off the module's second evening, where
 * a beginner who had never been shown `sina` was handed five empty boxes. The
 * marking is the same, the card graded is the same, and the page decides
 * which by level (`page.tsx`): A1 matches, everybody else types.
 */
export type Shape = "type" | "match";

export interface ConjugationQuestion {
  /** The card this question practices, when the verb is already in the deck. */
  cardId: string | null;
  lexemeId: string;
  lemma: string;
  translation: string;
  cefr: string | null;
  inDeck: boolean;
  /** Whether this verb is already one of the learner's favorites. */
  starred: boolean;
  shape: Shape;
  tense: Tense;
  /** The first person, shown: the principal part the rest hang off. */
  given: { person: string; value: string };
  /** The five to type, in table order. */
  blanks: { person: string; code: string; answer: string; origin: "EKILEX" | "STORED" | "DERIVED" }[];
  /** Every row of the table, the given one first, as its pronoun is said: short and long. For the chant. */
  chant: string[][];
}

const GROUP: Record<Tense, "PRESENT" | "CONDITIONAL"> = { present: "PRESENT", conditional: "CONDITIONAL" };

/**
 * A verb table, typed and marked a cell at a time.
 *
 * The whole table is checked at once rather than a row at a time, because
 * running down all six persons without stopping is the skill, and a verdict
 * after every row turns it into five separate questions. Each cell is marked
 * the way a typed review answer is: a dropped õ is named as a dropped õ, a
 * slipped key as a slip, and a wrong form as wrong with the right one beside
 * it. The verdicts are what `checkAnswer` says and nothing else.
 */
export function ConjugationSession({ questions: initialQuestions }: { questions: ConjugationQuestion[] }) {
  const t = useT();
  const locale = useLocale();
  const grade = useGrade();
  // Snapshotted once: gradeCard is a Server Action and the page re-renders
  // after every call with a freshly drawn round. See GovernmentSession.
  const [questions] = useState(initialQuestions);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [verdicts, setVerdicts] = useState<AnswerCheck[] | null>(null);
  /* The row a learner tapped to say where the next form goes (matching). */
  const [target, setTarget] = useState<number | null>(null);
  const [cellsRight, setCellsRight] = useState(0);
  const [tablesRight, setTablesRight] = useState(0);
  /* Every form that came out wrong, as the table says it, for the last screen. */
  const [missed, setMissed] = useState<WorthALook[]>([]);
  const [added, setAdded] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const sound = useFeedbackSound();
  const run = useRef(0);

  const question = questions[index];
  /* The way back to the verb before this one. See `lib/ux/lookBack.ts`. */
  const look = useLookBack();
  /*
    Asked here too, mid-round, because a learner with shelves named who keeps a
    word from a drill has the same claim on choosing where it goes as one who
    keeps it from the dictionary. It costs a press only once there is a shelf
    to choose between, and `useKeepWord` closes the question when the word
    underneath it changes.
  */
  const keeper = useKeepWord(question?.lexemeId ?? null, async (deckIds) => {
    if (!question) return;
    const result = await addToDeck(question.lexemeId, ["RECOGNITION", "PRODUCTION", "CONJUGATION"], "LOOKUP", deckIds).catch(() => null);
    if (result?.ok) setAdded(question.lexemeId);
  });
  const finished = !question;
  const revealed = verdicts !== null;

  // One ref per blank, remade per question, so Enter can walk down the table.
  /*
    The forms to put beside the pronouns, in a fixed shuffle per question, so a
    re-render never reorders the chips under a finger. Shuffled here rather
    than sent, since the answers are already on the question.
  */
  /*
    The forms to put beside the pronouns, in a fixed shuffle per question, so a
    re-render never reorders the chips under a finger. KEYED BY SLOT RATHER
    THAN BY SPELLING, because a table can hold one spelling twice: `olema` is
    `on` for `ta` and `on` for `nad`, and a bank keyed on the word had one
    chip for two rows and a duplicate React key. Each chip knows which row it
    came from, and a chip is spent when that row's form has been placed.
  */
  const bank = useMemo<{ slot: number; form: string }[]>(() => {
    if (!question || question.shape !== "match") return [];
    const seed = [...question.lexemeId].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    return question.blanks
      .map((b, slot) => ({ slot, form: b.answer, key: ((seed * (slot + 1) * 2654435761) >>> 0) }))
      .sort((a, b) => a.key - b.key || a.slot - b.slot)
      .map(({ slot, form }) => ({ slot, form }));
  }, [question]);

  const inputs = useMemo<RefObject<HTMLInputElement | null>[]>(
    () => (question ? question.blanks.map(() => createRef<HTMLInputElement>()) : []),
    [question],
  );

  useEffect(() => {
    setTyped(question ? question.blanks.map(() => "") : []);
    setVerdicts(null);
    setTarget(null);
    setAdded(null);
    // Focus the first blank once the row has drawn. A matched table has no
    // box to focus; its chips are buttons and the first one takes the caret
    // by being first in the order.
    if (question?.shape === "match") return;
    const t = window.setTimeout(() => inputs[0]?.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [index, question, inputs]);

  /*
    THE WAY OUT OF BEING STUCK, ON A TABLE OF FIVE.

    The ladder is over the **first** cell rather than whichever one has focus.
    A table is answered top to bottom, so the first empty cell is where
    somebody stuck is standing, and reading the focused one would mean a ladder
    that resets itself every time the caret moves, on the one round where the
    caret moves five times a question.

    The stem handed over is the shared opening of the first person and the form
    asked for, which is `sharedStart`, the same rule the ending chip beside the
    answer already uses. So the ending rung names exactly the letters that chip
    lights up.
  */
  const first = question?.blanks[0];
  const ladder = question && first
    ? hintLadder({
      answer: first.answer,
      stems: [first.answer.slice(0, sharedStart(question.given.value, first.answer))],
    })
    : [];
  const hints = useHints({
    word: question?.lemma ?? null,
    question: question ? `${question.lemma}:${question.tense}` : null,
    ladder,
  });

  /*
    MATCHING: A CHIP FILLS THE FIRST EMPTY ROW, AND A FILLED ROW HANDS ITS
    CHIP BACK. One gesture each way, so a wrong placement costs one tap to
    undo, and the same `typed` array the typed shape marks: the marker cannot
    tell the two shapes apart, which is the point.
  */
  /*
    Which chips are spent: as many chips of a spelling as there are rows
    holding it, so placing one `on` leaves the other on offer.
  */
  const spent = useMemo(() => {
    const used = new Set<number>();
    const counts = new Map<string, number>();
    for (const v of typed) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    for (const chip of bank) {
      const left = counts.get(chip.form) ?? 0;
      if (left > 0) {
        used.add(chip.slot);
        counts.set(chip.form, left - 1);
      }
    }
    return used;
  }, [typed, bank]);
  /*
    The row the next form lands in: the one the learner tapped if it is still
    empty, otherwise the first empty row. It is drawn, so nobody has to guess.
  */
  const active = useMemo(() => {
    if (target !== null && typed[target] === "") return target;
    const first = typed.findIndex((v) => v === "");
    return first < 0 ? null : first;
  }, [target, typed]);
  const place = useCallback((form: string) => {
    if (verdicts || active === null) return;
    setTyped((t) => t.map((v, j) => (j === active ? form : v)));
    setTarget(null);
  }, [verdicts, active]);
  const unplace = useCallback((row: number) => {
    if (verdicts) return;
    setTyped((t) => t.map((v, j) => (j === row ? "" : v)));
    // The form handed back leaves its row open for the next pick.
    setTarget(row);
  }, [verdicts]);

  /** What the last chant put in each row (null where it filled none), and what it was heard as. */
  const chantFill = useRef<{ rows: readonly (string | null)[]; hearing: Hearing } | null>(null);

  const check = useCallback((values: readonly string[] = typed, spoken = false) => {
    if (!question || verdicts) return;
    /*
      A chant that filled the table is written as said aloud only where every
      row is still what was heard (D4), and a row still holding a form the
      dictionary repaired writes nothing at all, whatever else was edited (D13).
    */
    const chanted = chantFill.current;
    const same = (i: number) => chanted?.rows[i] != null && (values[i] ?? "").trim() === chanted.rows[i]!.trim();
    const saidAloud = spoken || (!!chanted && question.blanks.every((_, i) => same(i)));
    const repaired = !!chanted && question.blanks.some((_, i) => same(i) && repairedInAnswer(chanted.hearing, chanted.rows[i]!));
    // A form placed in the wrong row of the matching table is another person of
    // the same verb, so every miss there would read as close: only a typed miss
    // can be most of the way there (`nearMiss`).
    const marks = question.blanks.map((b, i) => {
      const mark = checkAnswer(values[i] ?? "", b.answer, "et");
      return question.shape === "match" ? { ...mark, close: false } : mark;
    });
    setVerdicts(marks);
    // A near miss counts as recalled, the way it does in review: a dropped õ is
    // a spelling slip and not a wrong form. A clean table is stricter, since
    // that is the thing being celebrated.
    const right = marks.filter((m) => countsAsRecalled(m.verdict)).length;
    const clean = marks.every((m) => m.verdict === "correct");
    setCellsRight((c) => c + right);
    if (clean) setTablesRight((t) => t + 1);
    const wrong = question.blanks.filter((_, i) => !countsAsRecalled(marks[i]!.verdict));
    if (wrong.length > 0) {
      setMissed((m) => [...m, ...wrong.map((b) => ({
        et: `${b.person} ${b.answer}`,
        lemma: question.lemma,
        note: <><span lang="et">{question.lemma}</span>, {question.translation}</>,
      }))]);
    }
    // Climbs with the run, the way review does. See lib/audio/feedback.ts.
    run.current = clean ? run.current + 1 : 0;
    sound(clean ? "right" : "wrong", run.current);
    // ADR-016: the same review log as every other mode. Four of five is the
    // table known; less is a lapse worth seeing again.
    if (!clean) hints.noteMiss();
    if (question.cardId && !repaired) {
      // A hint is paid for: see `lib/questions/hints.ts`. The ceiling is 4 with
      // nothing taken, so a table nobody asked for help on grades as it did.
      const earned = right >= marks.length - 1 ? 3 : 1;
      // A table chanted whole and heard as spelled is written as spoken (D4); one edited after is typed.
      void grade(question.cardId, Math.min(earned, hints.ceiling) as 1 | 2 | 3, Date.now() - startedAt.current, undefined, undefined, saidAloud);
    }
  }, [question, verdicts, typed, sound, hints, grade]);

  /*
    THE TABLE AS A CHANT (docs/41-fifth-batch.md, VB-8).

    A class drills the present tense out loud, all six persons in one breath,
    and this round asked for it typed because nothing could hear it. Said now,
    the transcript is cut back into the rows at the pronouns heard, or in
    order where none were (`lib/speech/chant.ts`), and each row lands in its
    own box, where the round's own marker checks it exactly as it checks a
    typed one. A table heard whole, every form right and heard as it is
    spelled, is marked at once and can only be a Good (D19); anything else
    waits in the boxes for the learner to look at, change and check, so the
    machine never grades a table down on what it misheard (D4).

    Only on the typed table, and only once the learner has downloaded the
    model and kept the microphone in answer boxes (D6): on the matching table
    the forms are already on the screen to be placed.
  */
  const speechConfig = useSpeechConfig();
  const [chantNote, setChantNote] = useState("");
  const chantExpect = useMemo(() => new Set(
    question ? [question.given.value, ...question.blanks.map((b) => b.answer), ...question.chant.flat()].map((w) => w.toLocaleLowerCase("et")) : [],
  ), [question]);
  const heardChant = useCallback((hearing: Hearing) => {
    if (!question || verdicts || question.shape !== "type") return;
    // The first row is on the screen already, so a chant of the five asked is read as well as one of all six.
    const rows = splitAsked(hearing.understood, question.chant);
    const filled = rows.filter((row) => row !== null).length;
    if (filled === 0) {
      setChantNote(t("We couldn't tell which row each form was for. Say them with the pronouns, or type them."));
      return;
    }
    const next = typed.map((value, i) => rows[i] ?? value);
    setTyped(next);
    chantFill.current = { rows, hearing };
    const whole = rows.every((row, i) => row !== null && checkAnswer(row, question.blanks[i]!.answer, "et").verdict === "correct");
    if (whole && hearing.words.every((w) => heardAsSpelled(w, chantExpect.has(core(w.text))))) {
      setChantNote("");
      check(next, true);
      return;
    }
    setChantNote(fill(t("Heard {n} of {total} rows. Look them over, change any, then check the table."), { n: filled, total: rows.length }));
    const firstOpen = rows.findIndex((row) => row === null);
    inputs[firstOpen >= 0 ? firstOpen : 0]?.current?.focus();
  }, [question, verdicts, typed, check, chantExpect, inputs, t]);
  const speech = useSpeech({ endpoint: true, expect: chantExpect, onHeard: heardChant });
  const chantOffered = question?.shape === "type" && micInAnswerBox(speech, speechConfig);
  useEffect(() => { setChantNote(""); chantFill.current = null; }, [index]);

  const next = useCallback(() => {
    /* The whole table as it was filled in, which is what somebody looking
       back at a verb wants rather than one cell of it. */
    if (question) {
      look.record({
        of: question.cardId ?? question.lexemeId,
        label: t("Verb forms"),
        question: `${question.lemma}, ${question.translation}`,
        answer: [question.given.value, ...question.blanks.map((b) => b.answer)].join(", "),
        note: [question.given.person, ...question.blanks.map((b) => b.person)].join(", "),
        questionLang: "et",
        answerLang: "et",
        speak: question.given.value,
      });
    }
    setIndex((i) => i + 1);
  }, [question, look, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || !question) return;
      /*
        The Enter that checks the table is pressed inside the last input, and
        React flushes that discrete event synchronously: by the time it
        bubbles to the window the table is marked, this listener has been
        re-registered with `revealed` true, and it would move to the next verb
        before anybody had seen a single mark. So a key from a field belongs
        to the field. The same guard ReviewSession carries, for the same event.
      */
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // A chip is a button, and either advance key on a focused button
      // presses it: the button's own click is the answer, and reading the key
      // here as well would place a form and check the table in one press.
      if (e.target instanceof HTMLButtonElement) return;
      if (revealed && isAdvanceKey(e)) {
        e.preventDefault();
        next();
      } else if (!revealed && question.shape === "match" && isAdvanceKey(e) && typed.every(Boolean)) {
        e.preventDefault();
        check();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, question, revealed, next, typed, check]);

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const cells = questions.reduce((n, q) => n + q.blanks.length, 0);
    const accuracy = cells ? Math.round((cellsRight / cells) * 100) : 0;
    return (
      <RoundDone
        title={t("That’s the round done")}
        line={tablesRight === questions.length
          ? t("Every table spotless. You've got the endings down. All that's left is meeting more verbs.")
          : t("Here's the good news: the endings are the same for every verb. What catches people out is the part they're stuck onto, so when a table goes wrong, look the verb up.")}
        figures={[
          { value: `${tablesRight}/${questions.length}`, label: t("Tables") },
          { value: `${accuracy}%`, label: t("Forms right") },
          { value: fill(t("{n}m"), { n: minutes }), label: t("Time") },
        ]}
        missed={missed}
        celebrate={tablesRight === questions.length}
      />
    );
  }

  const group = VERB_GROUP_LABELS[GROUP[question.tense]];
  const derivedOnly = question.blanks.every((b) => b.origin === "DERIVED");

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">{t("Conjugation")}</h1>
      <RoundProgress done={index} total={questions.length} />

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent"><Repeat size={12} aria-hidden /> <span lang="et">{group.et}</span></Chip>
          {question.cefr && <Chip>{question.cefr}</Chip>}
          {!question.inDeck && <Chip tone="good">{t("new to you")}</Chip>}
          {/* The corner of the card, which is where somebody looks for this
              the moment a word turns out to be worth keeping. */}
          <div className="ml-auto">
            <StarWord lexemeId={question.lexemeId} starred={question.starred} label={question.lemma} />
          </div>
        </div>

        <div className="px-6 pt-7 text-center">
          <div className="flex items-center justify-center gap-2">
            <FitText as="p" text={question.lemma} max="var(--text-3xl)" lang="et" className="font-semibold" style={{ color: "var(--ink)" }} />
            <Speak text={question.lemma} />
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>{question.translation}</p>
          <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
            {question.shape === "match"
              ? t("We've filled in the first one for you. Tap a form to drop it into the highlighted row, or tap a row first to choose where it goes.")
              : question.tense === "present"
                ? t("We've filled in the first one for you. Type the other five.")
                : t("This time it's the \"would\" form, as in \"I would go\". Type the other five.")}
          </p>
          {chantOffered && !revealed && (
            <div className="mt-4 flex flex-col items-center gap-2" data-chant>
              <MicButton speech={speech} label={t("Say the table out loud")} shortcut />
              <p className="max-w-prose text-sm" style={{ color: "var(--ink-2)" }} role="status">
                {chantNote || t("Or say all six in one go, the way a class chants them, pronouns and all.")}
              </p>
            </div>
          )}
        </div>

        {!revealed && question.shape === "match" && (
          <div className="match-bank mx-6 mt-5 p-4">
            <p className="label-xs mb-3 text-center" style={{ color: "var(--accent-deep)" }} id="conjugation-bank">
              {t("Tap a form to place it")}
            </p>
            <div className="flex flex-wrap justify-center gap-3" role="group" aria-labelledby="conjugation-bank">
              {bank.map(({ slot, form }) => (
                <button
                  key={slot}
                  type="button"
                  lang="et"
                  className="choice-btn match-chip rounded-full px-5 py-2 text-lg"
                  disabled={spent.has(slot)}
                  aria-label={spent.has(slot) ? fill(t("{letter}, placed"), { letter: form }) : form}
                  onClick={() => place(form)}
                >
                  {form}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto px-6 py-5">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td lang="et" className="w-16 py-2 pr-3 text-base" style={{ color: "var(--ink-2)" }}>
                  {question.given.person}
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span lang="et" className="text-lg font-bold" style={{ color: "var(--accent-deep)" }}>
                      {question.given.value}
                    </span>
                    <Speak text={question.given.value} size={13} />
                  </span>
                </td>
              </tr>
              {question.blanks.map((blank, i) => {
                const mark = verdicts?.[i];
                return (
                  <tr key={blank.code} className="ending-row" style={{ borderTop: "1px solid var(--rule-soft)" }}>
                    <td lang="et" className="w-16 py-2 pr-3 text-base" style={{ color: "var(--ink-2)" }}>
                      {blank.person}
                    </td>
                    <td className="py-2">
                      {!mark && question.shape === "match" ? (
                        <button
                          type="button"
                          lang={typed[i] ? "et" : undefined}
                          className="choice-btn match-slot flex w-full items-center justify-between gap-3 text-left text-lg"
                          data-empty={typed[i] ? undefined : ""}
                          data-active={active === i ? "" : undefined}
                          aria-label={typed[i]
                            ? fill(t("{person}: {form}. Press to put it back."), { person: blank.person, form: typed[i] })
                            // "Goes here" is on the slot when it is the one in play, so the name says it too (WCAG 2.5.3).
                            : `${fill(t("{person}: nothing yet"), { person: blank.person })}${active === i ? `, ${t("Goes here")}` : ""}`}
                          aria-current={active === i ? "true" : undefined}
                          onClick={() => (typed[i] ? unplace(i) : setTarget(i))}
                        >
                          {typed[i] ? <Ending stem={question.given.value} form={typed[i]!} /> : (
                            <span aria-hidden>…</span>
                          )}
                          {!typed[i] && active === i && (
                            <span className="text-sm font-semibold" aria-hidden>{t("Goes here")}</span>
                          )}
                        </button>
                      ) : !mark ? (
                        <EstonianInput
                          compact
                          bar={false}
                          value={typed[i] ?? ""}
                          ariaLabel={`${question.lemma}, ${blank.person}`}
                          inputRef={inputs[i]}
                          onChange={(next) => setTyped((t) => t.map((v, j) => (j === i ? next : v)))}
                          onEnter={() => {
                            const following = inputs[i + 1]?.current;
                            if (following) following.focus();
                            else check();
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            lang="et"
                            className={`${VERDICT_CLASS[verdictOfCheck(mark)]} pop-in rounded-[var(--r-sm)] px-1.5 text-lg font-semibold`}
                          >
                            <Ending stem={question.given.value} form={blank.answer} />
                          </span>
                          <Speak text={blank.answer} size={13} />
                          {mark.verdict === "correct" ? (
                            <Check size={15} aria-label={t("Right")} style={{ color: VERDICT_INK.right }} />
                          ) : (
                            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                              {typed[i]?.trim()
                                ? <>{rich(t("You typed {form}."), { form: <span lang="et">{typed[i]?.trim()}</span> })} {mark.verdict === "wrong" ? "" : answerNote(mark.note, locale)}</>
                                : question.shape === "match" ? t("Nothing chosen.") : t("Nothing typed.")}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/*
            One row of keys for the whole table rather than one under each of
            the five fields, which drew the same six keys five times over. The
            shared bar types into whichever field has focus, and falls back to
            the first while nothing does.
          */}
          {!revealed && question.shape === "type" && (
            <div className="under-field pl-16">
              <DiacriticBar standalone={false} fallbackRef={inputs[0]} />
            </div>
          )}
          {!revealed && question.shape === "type" && (
            <div className="mt-4">
              <HintLadder
                ladder={ladder}
                taken={hints.taken}
                onTake={hints.take}
                open={hints.open}
                label={question.lemma}
              />
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }} aria-live="polite">
          {!revealed ? (
            <Button variant="primary" onClick={() => check()} disabled={question.shape === "match" && !typed.every(Boolean)}>
              {t("Check the table")} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : (
            <>
              {derivedOnly && (
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                  {t("We worked these out from the regular endings, not from the dictionary.")}
                </p>
              )}
              <KeepWordChoice keeper={keeper} className="mt-4" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" onClick={next} autoFocus>
                  {t("Next")} <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                </Button>
                {!question.inDeck && (
                  <>
                    {keeper.asking && (
                      <Button variant="ghost" onClick={keeper.cancel}>{t("Cancel")}</Button>
                    )}
                    <Button disabled={added === question.lexemeId || keeper.pending} onClick={keeper.press}>
                      {added === question.lexemeId
                        ? t("Added to your deck")
                        : keeper.asking ? t("Keep it") : t("Add to my deck")}
                    </Button>
                  </>
                )}
                {verdicts.some((m) => m.verdict !== "correct") && (
                  <SuggestFix
                    category="MARKED_WRONG"
                    categories={["MARKED_WRONG", "WRONG_FORM"]}
                    lemma={question.lemma}
                    trigger={`Conjugation of ${question.lemma}, ${group.et}. Expected ${question.blanks.map((b) => b.answer).join(", ")}.`}
                    label={t("I think that was right")}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs" style={{ color: "var(--ink-3)" }}>
        <span>
          {/* A tally of nought out of nought is not a score, it is noise
              under the first table, so the line opens on the instruction and
              the count arrives with the first table checked. */}
          {/* The matching shape says "Tap a form to place it" over its own
              bank, so the footer does not say it a second time: it keeps the
              tally alone, without the comma that led into the instruction. */}
          {question.shape === "type"
            ? <>
                {index + (revealed ? 1 : 0) > 0 && <>{fill(t("{n} of {total} tables perfect,"), { n: tablesRight, total: index + (revealed ? 1 : 0) })} </>}
                {fill(t("{key} moves down the table"), { key: ADVANCE_KEY_LABEL })}
              </>
            : index + (revealed ? 1 : 0) > 0 && fill(t("{n} of {total} tables perfect"), { n: tablesRight, total: index + (revealed ? 1 : 0) })}
        </span>
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}

/**
 * A form with the part a person adds lit up: what `algan` and `algad` share is
 * the stem, and the letters after it are the ending the table is teaching.
 * Read off the two strings rather than off the rule, so a stored irregular
 * form (`olen`, `on`) is shown honestly with whatever it does not share.
 */
/**
 * How much of a form the person ending has not touched.
 *
 * Pulled out of `Ending` below because the hint ladder asks the same question:
 * which letters of `loeb` are the stem `loen` was built on. Two copies of it
 * would be two answers to what counts as the ending of a verb in one file, and
 * the one nobody was watching would be the hint.
 */
function sharedStart(stem: string, form: string): number {
  let shared = 0;
  while (shared < stem.length && shared < form.length && stem[shared] === form[shared]) shared += 1;
  return shared;
}

function Ending({ stem, form }: { stem: string; form: string }) {
  const shared = sharedStart(stem, form);
  // A form that shares nothing, or everything, has no ending worth lighting.
  if (shared === 0 || shared === form.length) return <>{form}</>;
  return (
    <>
      {form.slice(0, shared)}
      <span className="ending">{form.slice(shared)}</span>
    </>
  );
}
