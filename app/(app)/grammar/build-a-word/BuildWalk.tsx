"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { DrillLink } from "@/components/DrillLink";
import { Speak } from "@/components/Speak";
import { Card, KeyCap, Note, SectionTitle, Stack } from "@/components/ui";
import { splitOnForm } from "@/lib/dict/examples";
import { caseByKey } from "@/lib/estonian/cases";
import { CASE_GROUPS, caseReference } from "@/lib/estonian/grammar";
import { plainAskLine } from "@/lib/estonian/plainAsk";
import type { CaseWalk, WalkForm, WalkSentence, WalkWord } from "@/lib/progress/caseWalk";
import { endingOptions } from "@/lib/questions/caseEndings";
import { rng, seedFrom } from "@/lib/random/seeded";
import { shuffle } from "@/lib/random/shuffle";
import { ADVANCE_KEY_GLYPH, ADVANCE_KEY_LABEL, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { OPTION_CLASS, optionState } from "@/lib/ux/verdict";

/**
 * THE CASE SYSTEM, WALKED THROUGH ONCE, ON A WORD THE READER PICKS.
 *
 * Fourteen cases is the number that makes people put Estonian down, and the
 * reference at `/grammar` cannot answer it: fourteen cards each explaining one
 * ending is the right shape for somebody who already knows which ending they
 * are after, and it is a wall for somebody being introduced to the idea. What
 * the language actually offers is far better news than the number suggests,
 * and it fits in one sentence: three forms are memorized, and the other eleven
 * are the second of those three with a fixed ending glued on, the same ending
 * for every word there is.
 *
 * Three acts, because that sentence has three claims in it and each has to be
 * shown rather than asserted. Which three forms, and what they are for. Which
 * form the endings go on, which is the half everybody gets wrong, since it is
 * not the word you looked up. And then the endings themselves, one at a time,
 * each with what it means and a sentence a lexicographer wrote using it.
 *
 * NOTHING ON THE SCREEN WAS WRITTEN HERE. Every Estonian form comes off
 * `buildCaseTable` through `lib/progress/caseWalk.ts`, every sentence is
 * attested, and every line of English about a case is `lib/estonian/grammar.ts`,
 * which holds no Estonian at all. The endings are suffixes off `CASES`, which
 * is the domain model.
 *
 * AND IT WRITES NOTHING TO THE REVIEW LOG, which is a decision rather than an
 * omission. The last act asks the reader to choose an ending, and the answer to
 * every one of those questions is printed two acts above it on the same screen:
 * grading that would tell the scheduler somebody recalled a form they had just
 * been shown, which is the fault `npm run audit:questions` exists to catch one
 * room over. A first meeting in the learn ladder writes nothing for the same
 * reason. The way out at the end is a round that does grade.
 */
export function BuildWalk({ walk }: { walk: CaseWalk }) {
  const [wordAt, setWordAt] = useState(0);
  const [act, setAct] = useState(0);
  const word = walk.words[wordAt] ?? walk.words[0];
  if (!word) return null;

  return (
    <Stack>
      {/*
        The word chooser stays at the top through all three acts, because the
        argument is that this works on any word and the only way to believe
        that is to press a different one and watch the same thing happen. The
        five are the awkward ones on purpose: see lib/collections/demoWords.ts.
      */}
      <Card>
        <ChoiceGroup label="Pick a word to build" select="one">
          {walk.words.map((w, n) => (
            <ChoiceChip key={w.lemma} selected={n === wordAt} onSelect={() => setWordAt(n)}>
              <span lang="et">{w.lemma}</span>
            </ChoiceChip>
          ))}
        </ChoiceGroup>
        {word.translation && (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-3)" }}>
            <span lang="et">{word.lemma}</span> · {word.translation}
          </p>
        )}
      </Card>

      <ActRail act={act} onGo={setAct} />

      {act === 0 && <Memorise word={word} sentences={walk.sentences} onNext={() => setAct(1)} />}
      {act === 1 && <StackEndings word={word} sentences={walk.sentences} onNext={() => setAct(2)} />}
      {/*
        A FRESH WORD IS A FRESH ROUND, AND `key` IS HOW THAT IS SAID.

        The questions below are about the word on the chooser above, so
        switching words has to clear the answers: leaving them up would mark a
        card the reader is no longer looking at. React keeps a component's
        state while its position in the tree holds still, which is the same
        trap `components/StarWord.tsx` documents about the star in the corner
        of every card. An effect that reset three pieces of state on the way
        past would do it a render late and after the wrong questions had been
        drawn.
      */}
      {act === 2 && <YourTurn key={word.lemma} word={word} />}
    </Stack>
  );
}

const ACTS = [
  { title: "Three to learn", hint: "What has to be memorized, and why it is only three" },
  { title: "Stack an ending", hint: "The other eleven, one at a time, in real sentences" },
  { title: "Your turn", hint: "Pick the ending. Nothing here is written down" },
] as const;

/** Where the reader is, and every act reachable from every act. */
function ActRail({ act, onGo }: { act: number; onGo: (n: number) => void }) {
  return (
    <ChoiceGroup ariaLabel="Which part to read" select="one" className="grid gap-2 sm:grid-cols-3">
      {ACTS.map((a, n) => (
        <button
          key={a.title}
          type="button"
          role="radio"
          aria-checked={n === act}
          onClick={() => onGo(n)}
          data-on={n === act ? "" : undefined}
          className="choice-btn choice-card flex min-w-0 flex-col items-start gap-1 rounded-[var(--r-lg)] px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2">
            <span
              className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
              aria-hidden
            >
              {n + 1}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{a.title}</span>
          </span>
          <span className="text-xs leading-snug" style={{ color: "var(--ink-3)" }}>{a.hint}</span>
        </button>
      ))}
    </ChoiceGroup>
  );
}

/* ─────────────────────────────────────────────── act one ── */

/**
 * The three that are stored, and what each one is actually for.
 *
 * Pressing one explains it rather than revealing it. A reveal would be a
 * guessing game about a word the reader has never seen, and there is nothing
 * to work out: these three are stored precisely because no rule reaches them.
 * What is worth pressing is the question each one answers and the job it does,
 * which is the thing a table of three forms never says.
 */
function Memorise({ word, sentences, onNext }: {
  word: WalkWord;
  sentences: CaseWalk["sentences"];
  onNext: () => void;
}) {
  const [at, setAt] = useState(1);
  const shown = word.principal[at] ?? word.principal[0];

  return (
    <Stack>
      <Card tone="accent">
        <p className="text-base leading-relaxed" style={{ color: "var(--ink)" }}>
          Estonian stores three forms of every word. Not fourteen. The rest are worked out from the
          second one, and that is the whole of the trick.
        </p>
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        {word.principal.map((form, n) => {
          const ref = caseReference(form.key);
          const isStem = form.value === word.genitive;
          return (
            <button
              key={form.key}
              type="button"
              onClick={() => setAt(n)}
              aria-pressed={n === at}
              data-on={n === at ? "" : undefined}
              className={`choice-btn choice-card flex min-w-0 flex-col items-start gap-1 rounded-[var(--r-lg)] px-4 py-3 text-left ${isStem ? "stem-row" : ""}`}
            >
              <span className="flex w-full items-baseline justify-between gap-2">
                <span lang="et" className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {ref?.spec.et} · {form.question}
                </span>
                {n === at && <Check size={14} aria-hidden style={{ color: "var(--accent-deep)" }} />}
              </span>
              <span lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>
                {form.value}
              </span>
              {isStem && (
                <span className="text-2xs font-semibold" style={{ color: "var(--accent-deep)" }}>
                  the one the endings go on
                </span>
              )}
            </button>
          );
        })}
      </div>

      {shown && (
        <FormPanel
          word={word}
          form={shown}
          /*
            This word's own sentence where the dictionary has one, and a real
            sentence in the same case from another word where it does not.
            Ekilex records a handful of usages per entry and this screen asks
            about fourteen cases, so most rows would otherwise be a form with
            nothing behind it. The row says which word the borrowed one is
            filed under, because a sentence about `abikaasa` under a heading
            about `raamat` would be the screen quietly changing the subject.
          */
          sentence={shown.sentence ?? sentences[shown.key] ?? null}
        />
      )}

      <Note tone="neutral">
        Nothing works these three out. They are held per word in the dictionary, and this app never
        invents one.
      </Note>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="primary" onClick={onNext}>
          Now the other eleven <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Stack>
  );
}

/** One case, explained: what it is for, and the word wearing it. */
function FormPanel({ word, form, sentence }: {
  word: WalkWord;
  form: WalkForm;
  sentence: WalkSentence | null;
}) {
  const ref = caseReference(form.key);
  if (!ref) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span lang="et" className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
          {form.value}
        </span>
        {form.alsoRight && (
          <span lang="et" className="text-lg" style={{ color: "var(--ink-3)" }}>
            / {form.alsoRight}
          </span>
        )}
        <Speak text={form.value} label={`Hear ${form.value}`} />
        <span className="ml-auto text-md font-bold" style={{ color: "var(--accent-deep)" }}>
          {ref.plain}
        </span>
      </div>
      <p className="mt-2 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {ref.summary}
      </p>
      {ref.englishHook && (
        <p className="mt-1.5 max-w-[62ch] text-sm" style={{ color: "var(--ink-3)" }}>
          In English: {ref.englishHook}
        </p>
      )}
      <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
        <span lang="et">{ref.spec.et}</span>
        {" · "}
        <span lang="et">{form.question}</span>
        {" · "}
        {ref.spec.en}
      </p>
      {sentence && <Attested sentence={sentence} lemma={word.lemma} />}
    </Card>
  );
}

/**
 * A sentence somebody wrote, with the form marked inside it.
 *
 * The row that does the teaching. A gloss makes a case a label and a case
 * inside a sentence is a case doing its job, which is `components/WordIntro.tsx`'s
 * own argument about a word. Nothing is edited: `splitOnForm` finds the form
 * and the sentence is otherwise printed as recorded.
 */
function Attested({ sentence, lemma }: { sentence: WalkSentence; lemma: string }) {
  const borrowed = sentence.lemma && sentence.lemma !== lemma ? sentence.lemma : null;
  return (
    <div className="mt-4 rounded-[var(--r)] p-3.5" style={{ background: "var(--raised)" }}>
      <p lang="et" className="text-base leading-relaxed" style={{ color: "var(--ink)" }}>
        {splitOnForm(sentence.et, sentence.form).map((part, n) => (
          <span
            key={n}
            className={part.match ? "font-bold" : undefined}
            style={part.match ? { color: "var(--accent-deep)" } : undefined}
          >
            {part.text}
          </span>
        ))}
      </p>
      {sentence.en && (
        <p className="mt-1.5 text-sm" style={{ color: "var(--ink-2)" }}>{sentence.en}</p>
      )}
      <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
        {borrowed
          ? <>Recorded under <span lang="et">{borrowed}</span>{sentence.translation ? `, ${sentence.translation}` : ""}. From Ekilex.</>
          : <>Recorded against this word in Ekilex.</>}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────── act two ── */

/**
 * The stem, and eleven endings to stack onto it.
 *
 * The build line is the argument in one object: the second memorized form on
 * the left, the ending arriving on the right, and the whole word underneath.
 * Pressing an ending swaps what arrives; the key that advances every card in
 * this app walks through all eleven in order, because eleven presses to see
 * eleven endings is a reader working the controls rather than reading.
 *
 * `.stem-row`, `.ending-row` and `.ending` are the stylesheet's, and the
 * wrapper carries `case-explorer` so a pointer over an ending lights the stem
 * it was glued onto. One rule for one idea rather than a second copy of it:
 * the landing page's own card makes exactly this argument and those classes
 * are how it makes it (`app/globals.css`).
 */
function StackEndings({ word, sentences, onNext }: {
  word: WalkWord;
  sentences: CaseWalk["sentences"];
  onNext: () => void;
}) {
  const [at, setAt] = useState(0);
  const forms = word.derived;
  const form = forms[at] ?? forms[0];

  const step = useCallback(() => setAt((n) => (n + 1) % Math.max(forms.length, 1)), [forms.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      /*
        Space on a focused chip presses the chip, which is the browser's job
        and is what the reader meant: the row below is a set of radios and a
        press is how one is chosen. Enter is the key the button advertises and
        it is free on every control here, so the two do not fight. A text box
        is `isAdvanceKey`'s own exception and there is none on this screen.
      */
      if (e.key === " " && target?.closest("button, [role=radio]")) return;
      if (!isAdvanceKey(e)) return;
      e.preventDefault();
      step();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  if (!form) return null;
  const ref = caseReference(form.key);
  const sentence = form.sentence ?? sentences[form.key] ?? null;

  return (
    <Stack>
      <div className="case-explorer flex flex-col gap-4">
        <Card tone="accent">
          <p className="label-xs" style={{ color: "var(--accent-deep)" }}>The form everything is built on</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className="stem-row rounded-[var(--r)] px-4 py-2"
              style={{ background: "var(--surface)" }}
            >
              <span lang="et" className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
                {word.genitive}
              </span>
            </span>
            <span className="text-2xl" style={{ color: "var(--ink-3)" }} aria-hidden>+</span>
            <span
              key={`${word.lemma}-${form.key}`}
              className="pop-in rounded-[var(--r)] px-4 py-2"
              style={{ background: "var(--surface)" }}
            >
              <span lang="et" className="text-2xl font-bold" style={{ color: "var(--accent-deep)" }}>
                {form.stored ? ref?.spec.et : `-${form.suffix}`}
              </span>
            </span>
            <span className="text-2xl" style={{ color: "var(--ink-3)" }} aria-hidden>=</span>
            <span key={`${word.lemma}-${form.key}-out`} className="settle flex items-center gap-2">
              <span lang="et" className="text-3xl font-bold" style={{ color: "var(--ink)" }}>
                <WithEnding value={form.value} suffix={form.stored ? "" : form.suffix} />
              </span>
              <Speak text={form.value} label={`Hear ${form.value}`} size={17} />
            </span>
          </div>
          {form.stored && (
            <p className="mt-3 max-w-[62ch] text-sm" style={{ color: "var(--ink-2)" }}>
              This one is the exception, and the dictionary holds it: no ending on the stem produces
              it, so it is learned rather than worked out.
            </p>
          )}
          {form.alsoRight && (
            <p className="mt-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
              <span lang="et">{form.alsoRight}</span> is right too, and both are taught as a pair.
            </p>
          )}
        </Card>

        <div>
          <SectionTitle
            hint={<span className="inline-flex items-center gap-1.5" style={{ textTransform: "none" }}>
              <KeyCap>{ADVANCE_KEY_GLYPH}</KeyCap> {ADVANCE_KEY_LABEL} steps through them
            </span>}
          >
            Try an ending
          </SectionTitle>
          <div className="flex flex-col gap-3">
            {CASE_GROUPS.filter((g) => g.keys.some((k) => !caseByKey(k)?.principal)).map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 text-xs" style={{ color: "var(--ink-3)" }}>{group.title}</p>
                <ChoiceGroup ariaLabel={group.title} select="one">
                  {group.keys.map((key) => {
                    const n = forms.findIndex((f) => f.key === key);
                    const row = forms[n];
                    if (!row) return null;
                    return (
                      <span key={key} className="ending-row">
                        <ChoiceChip selected={n === at} onSelect={() => setAt(n)}>
                          <span lang="et">{row.stored ? row.value : `-${row.suffix}`}</span>
                        </ChoiceChip>
                      </span>
                    );
                  })}
                </ChoiceGroup>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ref && (
        <Card>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-bold" style={{ color: "var(--accent-deep)" }}>{ref.plain}</span>
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              <span lang="et">{ref.spec.et}</span>
              {" · "}
              <span lang="et">{form.question}</span>
              {" · "}
              {ref.spec.en}
            </span>
          </div>
          <p className="mt-2 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {ref.summary}
          </p>
          {ref.englishHook && (
            <p className="mt-1.5 max-w-[62ch] text-sm" style={{ color: "var(--ink-3)" }}>
              In English: {ref.englishHook}
            </p>
          )}
          {sentence
            ? <Attested sentence={sentence} lemma={word.lemma} />
            : (
              <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
                No recorded sentence for this one yet.
              </p>
            )}
          <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
            Watch out: {ref.watchOut}
          </p>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="primary" onClick={onNext}>
          Try one yourself <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Stack>
  );
}

/** The form with its ending underlined, where the ending really is the ending. */
function WithEnding({ value, suffix }: { value: string; suffix: string }) {
  if (!suffix || !value.endsWith(suffix) || value.length <= suffix.length) return <>{value}</>;
  return (
    <>
      {value.slice(0, value.length - suffix.length)}
      <span className="ending">{suffix}</span>
    </>
  );
}

/* ───────────────────────────────────────────── act three ── */

/** How many endings to ask about. Short enough to finish standing up. */
const QUESTIONS = 4;

/**
 * Pick the ending.
 *
 * Options rather than a box, because the claim being checked is that the
 * endings are a fixed short list and picking one out of four is exactly that
 * question. It is also a measurement rather than a self-grade, which is the
 * rule this app holds everywhere it can mark an answer itself.
 *
 * ONLY A CASE THE WORD ACTUALLY TAKES. `askable` is `caseFits` upstream, so a
 * person is never asked for the inside trio and nobody is invited to produce
 * `sõbras`. And never a case the dictionary holds an exception for: `tuppa` is
 * not `toa` plus an ending, so asking for the ending would be asking for a
 * form nobody says.
 */
function YourTurn({ word }: { word: WalkWord }) {
  const asks = useMemo(() => {
    const pool = word.derived.filter((f) => f.askable);
    return shuffle(pool, rng(seedFrom(word.lemma))).slice(0, QUESTIONS);
  }, [word]);

  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);

  const form = asks[at];
  const spec = form ? caseByKey(form.key) : undefined;
  const options = useMemo(() => {
    if (!spec) return [];
    return shuffle(endingOptions(spec), rng(seedFrom(`${word.lemma}:${spec.key}`)));
  }, [spec, word.lemma]);

  const pick = useCallback((suffix: string) => {
    if (!form) return;
    setPicked((already) => {
      if (already !== null) return already;
      if (suffix === form.suffix) setRight((n) => n + 1);
      return suffix;
    });
  }, [form]);

  /*
    The numerals on the options are keys, so the keys press them. A numeral
    drawn as a cap and bound to nothing is the app promising a shortcut it
    does not have, which is the rule one file over in `lib/ux/advanceKey.ts`.
  */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inEditable(e.target)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > options.length) return;
      const option = options[n - 1];
      if (option) pick(option.suffix);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, pick]);

  if (asks.length === 0 || !form || !spec) {
    return (
      <Card>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          This word keeps its endings in the dictionary rather than working them out. Pick another
          word above and the questions come back.
        </p>
      </Card>
    );
  }

  const done = at >= asks.length - 1 && picked !== null;
  const ref = caseReference(form.key);
  const ask = plainAskLine(form.key);

  const next = () => {
    setPicked(null);
    setAt((n) => Math.min(n + 1, asks.length - 1));
  };

  return (
    <Stack>
      <Card>
        <p className="label-xs" style={{ color: "var(--ink-3)" }}>
          Question {at + 1} of {asks.length}
        </p>
        <p className="mt-2 text-lg font-bold" style={{ color: "var(--ink)" }}>
          {ask ?? `Which ending makes the ${ref?.spec.et}?`}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
          <span lang="et">{form.question}</span>
          {word.translation && <> · <span lang="et">{word.lemma}</span>, {word.translation}</>}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-[var(--r)] px-3.5 py-2" style={{ background: "var(--raised)" }}>
            <span lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>
              {word.genitive}
            </span>
          </span>
          <span className="text-xl" style={{ color: "var(--ink-3)" }} aria-hidden>+</span>
          <span className="text-xl font-bold" style={{ color: "var(--ink-3)" }}>?</span>
        </div>

        <ChoiceGroup
          ariaLabel="Which ending"
          select="one"
          className="mt-4 grid gap-2 sm:grid-cols-2"
        >
          {options.map((option, i) => {
            const isAnswer = option.suffix === form.suffix;
            const state = picked === null ? null : optionState(isAnswer, option.suffix === picked);
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={option.suffix === picked}
                disabled={picked !== null}
                onClick={() => pick(option.suffix)}
                className={`choice-btn flex items-center gap-3 rounded-[var(--r-lg)] px-4 py-3 text-left ${state ? OPTION_CLASS[state] : ""}`}
              >
                <KeyCap>{i + 1}</KeyCap>
                <span lang="et" className="text-lg font-bold">-{option.suffix}</span>
              </button>
            );
          })}
        </ChoiceGroup>

        {/*
          The verdict, said out loud: a tint changing colour is nothing at all
          to a screen reader, which is the rule every marking screen in this
          app follows.

          One live region, one sentence, and what it says is the correction
          rather than a verdict word: a reader who picked the wrong ending
          needs the right one rather than a grade. Written as elements rather
          than as one string so the Estonian in it carries `lang`, which is
          what stops a screen reader saying `raamatusse` with English phonics
          to somebody learning how it sounds.
        */}
        <p role="status" aria-live="polite" className="mt-4 text-base" style={{ color: "var(--ink-2)" }}>
          {picked === null ? "" : picked === form.suffix ? (
            <>
              Yes. <span lang="et">{word.genitive}</span> plus <span lang="et">-{form.suffix}</span>{" "}
              is <span lang="et">{form.value}</span>, which means {ref?.plain}.
            </>
          ) : (
            <>
              Not that one. It is <span lang="et">{form.value}</span>, the stem with{" "}
              <span lang="et">-{form.suffix}</span> on it, which means {ref?.plain}.
            </>
          )}
        </p>

        {picked !== null && !done && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <Button variant="primary" onClick={next}>
              Next <ArrowRight size={15} aria-hidden />
            </Button>
          </div>
        )}
      </Card>

      {done && (
        <>
          {/*
            NOT A VERDICT TILE, WHICH IS WHAT IT WAS.

            Painted mint it read as a pass, over a count that can be one in
            four, on the one screen in the app that says out loud it is not a
            test. The count is worth printing, because somebody who got one is
            owed the number rather than a shrug; what it may not do is wear the
            colour this palette gives to a recalled answer.
          */}
          <Card>
            <p className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              {right} of {asks.length} endings
            </p>
            <p className="mt-2 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Nothing here was written down. It is an explanation rather than a test, and the round
              below is the one that counts towards what you know.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <Button onClick={() => { setAt(0); setPicked(null); setRight(0); }}>
                <RotateCcw size={15} aria-hidden /> Again
              </Button>
            </div>
          </Card>
          <DrillLink href="/review/target" />
        </>
      )}
    </Stack>
  );
}
