"use client";

import { createRef, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Check, Repeat } from "lucide-react";
import { addToDeck, gradeCard } from "@/app/actions";
import { KeepWordChoice, useKeepWord } from "@/components/KeepWord";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, KeyCap, Stat } from "@/components/ui";
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
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";

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
  // Snapshotted once: gradeCard is a Server Action and the page re-renders
  // after every call with a freshly drawn round. See GovernmentSession.
  const [questions] = useState(initialQuestions);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [verdicts, setVerdicts] = useState<AnswerCheck[] | null>(null);
  const [cellsRight, setCellsRight] = useState(0);
  const [tablesRight, setTablesRight] = useState(0);
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
    await addToDeck(question.lexemeId, ["RECOGNITION", "PRODUCTION", "CONJUGATION"], "LOOKUP", deckIds);
    setAdded(question.lexemeId);
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
  const place = useCallback((form: string) => {
    if (verdicts) return;
    setTyped((t) => {
      const at = t.findIndex((v) => v === "");
      if (at < 0) return t;
      return t.map((v, j) => (j === at ? form : v));
    });
  }, [verdicts]);
  const unplace = useCallback((row: number) => {
    if (verdicts) return;
    setTyped((t) => t.map((v, j) => (j === row ? "" : v)));
  }, [verdicts]);

  const check = useCallback(() => {
    if (!question || verdicts) return;
    const marks = question.blanks.map((b, i) => checkAnswer(typed[i] ?? "", b.answer, "et"));
    setVerdicts(marks);
    // A near miss counts as recalled, the way it does in review: a dropped õ is
    // a spelling slip and not a wrong form. A clean table is stricter, since
    // that is the thing being celebrated.
    const right = marks.filter((m) => countsAsRecalled(m.verdict)).length;
    const clean = marks.every((m) => m.verdict === "correct");
    setCellsRight((c) => c + right);
    if (clean) setTablesRight((t) => t + 1);
    // Climbs with the run, the way review does. See lib/audio/feedback.ts.
    run.current = clean ? run.current + 1 : 0;
    sound(clean ? "right" : "wrong", run.current);
    // ADR-016: the same review log as every other mode. Four of five is the
    // table known; less is a lapse worth seeing again.
    if (!clean) hints.noteMiss();
    if (question.cardId) {
      // A hint is paid for: see `lib/questions/hints.ts`. The ceiling is 4 with
      // nothing taken, so a table nobody asked for help on grades as it did.
      const earned = right >= marks.length - 1 ? 3 : 1;
      void gradeCard(question.cardId, Math.min(earned, hints.ceiling) as 1 | 2 | 3, Date.now() - startedAt.current).catch(() => {});
    }
  }, [question, verdicts, typed, sound, hints]);

  const next = useCallback(() => {
    /* The whole table as it was filled in, which is what somebody looking
       back at a verb wants rather than one cell of it. */
    if (question) {
      look.record({
        of: question.cardId ?? question.lexemeId,
        label: "Verb forms",
        question: `${question.lemma}, ${question.translation}`,
        answer: [question.given.value, ...question.blanks.map((b) => b.answer)].join(" · "),
        note: [question.given.person, ...question.blanks.map((b) => b.person)].join(" · "),
        questionLang: "et",
        answerLang: "et",
        speak: question.given.value,
      });
    }
    setIndex((i) => i + 1);
  }, [question, look]);

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
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          Round complete
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
          {tablesRight === questions.length
            ? "Every table clean. You have the endings. What is left is the verbs whose first person you have not met yet."
            : "The endings never change. What trips people is the stem, and that is the one part worth looking up when a table goes wrong."}
        </p>
        <div
          className="mt-8 grid grid-cols-3 gap-6 rounded-lg border p-6"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
        >
          <Stat value={`${tablesRight}/${questions.length}`} label="Tables" />
          <Stat value={`${accuracy}%`} label="Forms right" tone={VERDICT_INK[accuracy >= 80 ? "right" : "nearly"]} />
          <Stat value={`${minutes}m`} label="Time" />
        </div>
        <WayOut className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/review/conjugation">Another round</ButtonLink>
          <ButtonLink href="/" variant="primary">Back to Today</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const group = VERB_GROUP_LABELS[GROUP[question.tense]];
  const derivedOnly = question.blanks.every((b) => b.origin === "DERIVED");

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Conjugation</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession size={19} />
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(index / questions.length) * 100}%`, background: "var(--accent)" }}
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-label="Round progress"
          />
        </div>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {questions.length - index} left
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent"><Repeat size={12} aria-hidden /> <span lang="et">{group.et}</span></Chip>
          {question.cefr && <Chip>{question.cefr}</Chip>}
          {!question.inDeck && <Chip tone="good">new to you</Chip>}
          {/* The corner of the card, which is where somebody looks for this
              the moment a word turns out to be worth keeping. */}
          <div className="ml-auto">
            <StarWord lexemeId={question.lexemeId} starred={question.starred} label={question.lemma} />
          </div>
        </div>

        <div className="px-6 pt-7 text-center">
          <div className="flex items-center justify-center gap-2">
            <p lang="et" className="text-3xl font-semibold" style={{ color: "var(--ink)" }}>
              {question.lemma}
            </p>
            <Speak text={question.lemma} />
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>{question.translation}</p>
          <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
            {question.shape === "match"
              ? "The first person is given. Put each of the other five beside its pronoun."
              : question.tense === "present"
                ? "The first person is given. Type the other five."
                : "The conditional, from the same stem. Type the other five."}
          </p>
        </div>

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
                          className="choice-btn field w-full text-left text-lg"
                          aria-label={typed[i]
                            ? `${blank.person}: ${typed[i]}. Press to put it back.`
                            : `${blank.person}: nothing yet`}
                          onClick={() => (typed[i] ? unplace(i) : undefined)}
                        >
                          {typed[i] ? <Ending stem={question.given.value} form={typed[i]!} /> : (
                            <span aria-hidden style={{ color: "var(--ink-3)" }}>…</span>
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
                            className={`${VERDICT_CLASS[verdictOfCheck(mark.verdict)]} pop-in rounded-[var(--r-sm)] px-1.5 text-lg font-semibold`}
                          >
                            <Ending stem={question.given.value} form={blank.answer} />
                          </span>
                          <Speak text={blank.answer} size={13} />
                          {mark.verdict === "correct" ? (
                            <Check size={15} aria-label="Right" style={{ color: VERDICT_INK.right }} />
                          ) : (
                            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                              {typed[i]?.trim()
                                ? <>You typed <span lang="et">{typed[i]?.trim()}</span>. {mark.verdict === "wrong" ? "" : mark.note}</>
                                : question.shape === "match" ? "Nothing chosen." : "Nothing typed."}
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
          {!revealed && question.shape === "match" && (
            <div className="under-field pl-16">
              <p className="sr-only" id="conjugation-bank">The forms to place</p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="conjugation-bank">
                {bank.map(({ slot, form }) => (
                  <button
                    key={slot}
                    type="button"
                    lang="et"
                    className="choice-btn rounded-full px-3 py-1.5 text-base"
                    disabled={spent.has(slot)}
                    aria-label={spent.has(slot) ? `${form}, placed` : form}
                    onClick={() => place(form)}
                  >
                    {form}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }} aria-live="polite">
          {!revealed ? (
            <Button variant="primary" onClick={check} disabled={question.shape === "match" && !typed.every(Boolean)}>
              Check the table <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : (
            <>
              {derivedOnly && (
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                  Regular endings on the first person.
                </p>
              )}
              <KeepWordChoice keeper={keeper} className="mt-4" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" onClick={next} autoFocus>
                  Next <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
                </Button>
                {!question.inDeck && (
                  <>
                    {keeper.asking && (
                      <Button variant="ghost" onClick={keeper.cancel}>Cancel</Button>
                    )}
                    <Button disabled={added === question.lexemeId || keeper.pending} onClick={keeper.press}>
                      {added === question.lexemeId
                        ? "Added to your deck"
                        : keeper.asking ? "Keep it" : "Add to my deck"}
                    </Button>
                  </>
                )}
                {verdicts.some((m) => m.verdict !== "correct") && (
                  <SuggestFix
                    category="MARKED_WRONG"
                    categories={["MARKED_WRONG", "WRONG_FORM"]}
                    lemma={question.lemma}
                    trigger={`Conjugation of ${question.lemma}, ${group.et}. Expected ${question.blanks.map((b) => b.answer).join(", ")}.`}
                    label="I think that was right"
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
          {tablesRight}/{index + (revealed ? 1 : 0)} tables clean
          {question.shape === "type" ? <> · {ADVANCE_KEY_LABEL} moves down the table</> : <> · tap a form to place it</>}
        </span>
        <LookBackButton {...look.button} disabled={look.looking} keyHint={false} />
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
