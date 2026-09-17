"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { DrillLink } from "@/components/DrillLink";
import { Speak } from "@/components/Speak";
import { CaseQuestion } from "@/components/CaseQuestion";
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
  /*
    How far the reader has got, which is what turns a row of three buttons into
    a route somebody is walking rather than three unrelated tabs. It never goes
    down: stepping back to read the first part again does not un-visit the
    second, and a check that appeared and then vanished would read as a bug.
  */
  const [furthest, setFurthest] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const jumped = useRef(false);

  const go = useCallback((n: number) => {
    setAct(n);
    setFurthest((f) => Math.max(f, n));
    jumped.current = true;
  }, []);

  /*
    PRESSING A STEP GOES TO IT.

    Reported by the reader, and the words are worth keeping: pressing the
    second step "didn't go there automatically and it didn't feel intuitive".
    It was doing exactly what it said, and nothing moved. The steps sit at the
    top of a page taller than a screen, so somebody deep in the first part who
    presses the second one swaps the content of a region they are scrolled past
    and is left looking at the same paragraph: the press reads as broken rather
    than as navigation, which is worse than a control that does nothing at all.

    So the region comes to the top of the window and the part's own heading
    takes focus, which is the same press answered twice, once for a pointer and
    once for a keyboard or a screen reader. `preventScroll` because the scroll
    above is the considered one and focus would otherwise redo it from the
    heading rather than from the steps, leaving them off the top of the screen.

    Only on a press: a first render is not a navigation, and a page that
    scrolled itself on arrival would take the reader past the title of the
    thing they just opened.
  */
  useEffect(() => {
    if (!jumped.current) return;
    jumped.current = false;
    top.current?.scrollIntoView({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  }, [act]);

  const word = walk.words[wordAt] ?? walk.words[0];
  if (!word) return null;
  const here = ACTS[act] ?? ACTS[0]!;

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

      <div ref={top} className="scroll-mt-4">
        <ActRail act={act} furthest={furthest} onGo={go} />
        {/*
          WHICH OF THE THREE YOU ARE IN, SAID IN WORDS RATHER THAN IN A TINT.

          The steps above mark the current one the way every chosen control in
          this app is marked, and on a screen you arrive at by pressing one of
          them that is not enough on its own: the reader has just jumped, and
          what they need first is confirmation that the jump landed. It is also
          the heading this region never had, so the page went from its title
          straight into prose, and the part somebody pressed had nothing for a
          screen reader to announce on the way in.
        */}
        <h2
          ref={heading}
          tabIndex={-1}
          className="mt-6 text-xl font-bold outline-none"
          style={{ color: "var(--ink)" }}
        >
          <span className="label-xs mb-1 block" style={{ color: "var(--accent-deep)" }}>
            Step {act + 1} of {ACTS.length}
          </span>
          {here.title}
        </h2>
      </div>

      {act === 0 && <Memorise word={word} sentences={walk.sentences} onNext={() => go(1)} />}
      {act === 1 && <StackEndings word={word} sentences={walk.sentences} onNext={() => go(2)} />}
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

/**
 * The three parts, and the hint that says what each one costs the reader.
 *
 * The title leads the accessible name and nothing is printed in front of it,
 * because the numeral is decoration for the eye: a screen reader is told "2 of
 * 3" by the radio group it is in, and hearing "2. 2 of 3. Stack an ending" is
 * the same number three times.
 */
const ACTS = [
  { title: "Three to learn", hint: "What is stored, and why it is only three" },
  { title: "Stack an ending", hint: "The other eleven, one at a time" },
  { title: "Your turn", hint: "Pick the ending. Nothing is written down" },
] as const;

/**
 * Where the reader is, how far they have got, and every part reachable from
 * every part.
 *
 * THREE STEPS RATHER THAN THREE TABS, WHICH IS WHAT THEY READ AS.
 *
 * A numbered box with a title in it is the shape of a progress indicator, so
 * that is what the reader took them for: something reporting on the page
 * rather than something to press. The tint marking the current one is the
 * app's own and is right, and on this row it was doing all of the work, since
 * three boxes that differ by a wash are three boxes.
 *
 * So the numeral says which state it is in as an object, which is the rule the
 * palette states about every hue in the app: the one you are on is the accent
 * filled, one you have been past carries a tick, and one ahead of you is the
 * raised ground everything unvisited here sits on. Nothing is locked, because
 * a reader who wants the endings before the explanation is allowed them, and a
 * step ahead being pressable is exactly why it may not look like a report.
 */
function ActRail({ act, furthest, onGo }: {
  act: number;
  furthest: number;
  onGo: (n: number) => void;
}) {
  return (
    <ChoiceGroup ariaLabel="Which part to read" select="one" className="grid gap-2 sm:grid-cols-3">
      {ACTS.map((a, n) => {
        const on = n === act;
        // Been past rather than merely visited: the part you are standing in
        // is not one you have finished with.
        const done = n < furthest;
        return (
          <button
            key={a.title}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onGo(n)}
            data-on={on ? "" : undefined}
            data-state={on ? "here" : done ? "done" : "ahead"}
            className="choice-btn choice-card flex min-w-0 flex-col items-start gap-1 rounded-[var(--r-lg)] px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2">
              <span
                className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                /*
                  `--accent-deep` rather than `--accent`, which is the material
                  `.choice-chip[data-on]` is painted in one file over: the ink
                  on a solid accent is measured against the deep one, and a
                  hue's own `-ink` on its plain fill is the pairing
                  `scripts/test-invariants.ts` refuses outright.
                */
                style={on
                  ? { background: "var(--accent-deep)", color: "var(--accent-ink)" }
                  : done
                    ? { background: "var(--accent-soft)", color: "var(--accent-deep)" }
                    : { background: "var(--raised)", color: "var(--ink-3)" }}
                aria-hidden
              >
                {done ? <Check size={13} strokeWidth={3} /> : n + 1}
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{a.title}</span>
            </span>
            <span className="text-xs leading-snug" style={{ color: "var(--ink-3)" }}>{a.hint}</span>
          </button>
        );
      })}
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

      {/*
        One radio group rather than three toggle buttons. These are three
        readings of one question and a screen reader hearing "3 of 3" is
        hearing the truth, where `aria-pressed` on each would announce three
        unrelated switches and cost three tab stops. It is the argument
        `components/Choice.tsx` makes at the top of its own file.
      */}
      <ChoiceGroup ariaLabel="Which of the three to explain" select="one" className="grid gap-2 sm:grid-cols-3">
        {word.principal.map((form, n) => {
          const ref = caseReference(form.key);
          const isStem = form.value === word.genitive;
          return (
            <button
              key={form.key}
              type="button"
              role="radio"
              aria-checked={n === at}
              onClick={() => setAt(n)}
              data-on={n === at ? "" : undefined}
              className={`choice-btn choice-card flex min-w-0 flex-col items-start gap-1 rounded-[var(--r-lg)] px-4 py-3 text-left ${isStem ? "stem-row" : ""}`}
            >
              <span className="flex w-full items-baseline justify-between gap-2">
                <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                  <span lang="et">{ref?.spec.et}</span>
                  {" · "}
                  <CaseQuestion question={form.question} inline />
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
      </ChoiceGroup>

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

/**
 * WHAT THE WORD THAT WAS JUST BUILT MEANS, IN THE FEWEST ENGLISH WORDS TRUE.
 *
 * Reported by the reader off the second part, and the gap is exactly where
 * they said it was. The card puts `raamatu + -lt = raamatult` up in three
 * boxes, and the next thing it says about that word is four lines further
 * down, under a heading reading "off, and from a person". Both are right and
 * neither is the question somebody watching an ending arrive is asking, which
 * is what the word now means. Sitting under the build line it closes the
 * arithmetic: the stem, the ending, the word, and the word in English.
 *
 * Composed in `lib/estonian/caseReading.ts` out of a frame per case and the
 * entry's own gloss, never here, and null wherever nothing honest fits: a
 * person is not a surface, a gloss is sometimes a list, and the seeded stems
 * carry no gloss at all. `data-reading` carries the phrase for the same reason
 * `data-build` carries the arithmetic, so a suite reads a fact about the line
 * rather than counting hops through the markup.
 *
 * The deeper explanation stays exactly where it was. This is the sentence in
 * front of it rather than a replacement for it.
 */
function Reading({ of }: { of: WalkForm }) {
  /*
    AND WHERE THERE IS NO READING BECAUSE NOBODY SAYS THE FORM, THAT IS THE
    SENTENCE, RATHER THAN A BLANK.

    The card draws all eleven, because a table of forms is a reference and the
    dictionary entry prints the whole of it. That left three rows on `mees` and
    `sõber` showing a form under "Being inside something, and being in a month
    or a mood", with nothing anywhere saying that Estonian puts a person on the
    other set: a learner reading that card comes away saying `mehes`, which is
    the fault `lib/estonian/caseQuestion.ts` exists for, on the one screen whose
    job is explaining the system. `caseFits` had reached every card builder in
    the app and never reached the explanation.

    It points at "on top", which is the heading over those endings on this very
    screen (`CASE_GROUPS`), rather than naming them: the reader can look up.
    `caseIsUnsaidFor` is the one predicate for this and it asks for positive
    evidence, so `toale` is never called unsaid.
  */
  if (of.unsaid) {
    return (
      <p className="mt-3 text-base" data-unsaid={of.unsaid} style={{ color: "var(--ink-2)" }}>
        <span className="font-bold" style={{ color: "var(--ink)" }}>Nobody says this one.</span>{" "}
        {/*
          "a person" only where the word is one. The row fires for a `-maa`
          word too, which is a country rather than somebody, and the first
          version of this line said "a person" about both: the osastav fault
          one commit earlier, committed inside the fix for it. What is left
          names no class, so it stays true whatever the reason turns out to be.
        */}
        Estonian puts {of.unsaid === "person" ? "a person" : "this word"} on the endings under{" "}
        “On top” instead.
      </p>
    );
  }
  if (!of.reading) return null;
  return (
    <p
      className="mt-3 flex flex-wrap items-baseline gap-x-2"
      data-reading={of.reading}
    >
      <span className="text-sm" style={{ color: "var(--ink-3)" }}>which means</span>
      <span className="text-xl font-bold" style={{ color: "var(--ink)" }}>
        “{of.reading}”
      </span>
    </p>
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
      <Reading of={form} />
      <p className="mt-2 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {ref.summary}
      </p>
      {ref.englishHook && (
        <p className="mt-1.5 max-w-[62ch] text-sm" style={{ color: "var(--ink-3)" }}>
          In English: {ref.englishHook}
        </p>
      )}
      {/*
        The name a class uses and the question it answers, with what that
        question asks. No Latin: "the genitive" is a translation of a
        translation to somebody who has met neither name, and `CaseQuestion`
        is the one drawing of the half they can act on.
      */}
      <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>
        <span lang="et">{ref.spec.et}</span>
        {" · "}
        <CaseQuestion question={form.question} inline />
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
      {/*
        A BORROWED SENTENCE SAYS SO BEFORE IT IS READ, NOT AFTER.

        Ekilex records a handful of usages per word and this screen asks about
        fourteen cases, so most rows are a sentence filed under some other
        word: the panel is headed `raamatu` and the line under it was
        `Puhkus algab kuu aja pärast`, with `aja` marked. Everything about that
        is true, the case is the one being explained, and for a moment it reads
        as though `aja` were the form above it. The source line underneath said
        so and said it too late.
      */}
      {borrowed && (
        <p className="mb-1.5 text-xs" style={{ color: "var(--ink-3)" }}>
          The same case, on another word:
        </p>
      )}
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
          ? <><span lang="et">{borrowed}</span>{sentence.translation ? `, ${sentence.translation}` : ""}, recorded in Ekilex.</>
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

  const endings = useRef<HTMLDivElement>(null);
  const step = useCallback(() => setAt((n) => (n + 1) % Math.max(forms.length, 1)), [forms.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      /*
        THE KEY BELONGS TO THE FOCUSED CONTROL FIRST.

        Written without this, the handler took Enter off the primary button:
        the reader tabs to "Try one yourself", presses Enter, and the ending
        steps while the press is swallowed by the `preventDefault` under it,
        because a window listener runs before the browser activates a button.
        A shortcut that eats the one button on the screen is worse than no
        shortcut.

        So a focused button, link or disclosure keeps its own key, and the
        endings are the exception: they are radios, Enter does nothing on a
        radio natively, and they are the control the hint is written under.
        Space is left alone everywhere, since that is how a focused radio is
        chosen.
      */
      if (e.key === " ") return;
      const inEndings = target ? endings.current?.contains(target) : false;
      if (!inEndings && target?.closest("button, a, summary, [role=radio]")) return;
      if (inEditable(e.target)) return;
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
          {/*
            THE THREE PIECES CARRY WHAT THEY ARE, RATHER THAN WHERE THEY SIT.

            `scripts/test-teaching.mjs` asks this line the one question that
            matters, whether the form on the right really is the stem on the
            left with those letters on the end, and a suite that answered it by
            counting hops through the markup would go blind the day a box moves
            and waive itself while it did. That is the fault `data-rung` was
            added for one module over: a fact about the line, on the line.
          */}
          <div
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"
            data-build
            data-stem={word.genitive ?? ""}
            data-ending={form.stored ? "" : form.suffix}
            data-built={form.value}
            data-stored={form.stored ? "" : undefined}
          >
            <span
              className="stem-row rounded-[var(--r)] px-4 py-2"
              style={{ background: "var(--surface)" }}
            >
              <span lang="et" className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
                {word.genitive}
              </span>
            </span>
            {/* The glyph for the eye and the word for a reader, since "toa
                sisseütlev tuppa" read out with the operators hidden is three
                words with no arithmetic in them. */}
            <span className="text-2xl" style={{ color: "var(--ink-3)" }} aria-hidden>+</span>
            <span className="sr-only">plus</span>
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
            <span className="sr-only">makes</span>
            <span key={`${word.lemma}-${form.key}-out`} className="settle flex items-center gap-2">
              <span lang="et" className="text-3xl font-bold" style={{ color: "var(--ink)" }}>
                <WithEnding value={form.value} suffix={form.stored ? "" : form.suffix} />
              </span>
              <Speak text={form.value} label={`Hear ${form.value}`} size={17} />
            </span>
          </div>
          <Reading of={form} />
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
          {/*
            ONE GROUP ACROSS THE THREE HEADINGS, NOT ONE PER HEADING.

            The eleven are one set of options with the reference's own grouping
            drawn over them, so a group apiece would say there are three
            questions here and leave the arrow keys stopping at the end of each
            row. `ChoiceGroup` finds its options at any depth, so the headings
            sit inside it and the reading stays "4 of 11".
          */}
          <div ref={endings}>
            <ChoiceGroup ariaLabel="Which ending" select="one" className="flex flex-col gap-3">
              {CASE_GROUPS.filter((g) => g.keys.some((k) => !caseByKey(k)?.principal)).map((group) => (
                <div key={group.title}>
                  <p className="mb-1.5 text-xs" style={{ color: "var(--ink-3)" }}>{group.title}</p>
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </div>
              ))}
            </ChoiceGroup>
          </div>
          {/*
            THE KEY THE HINT NAMES, DRAWN AS A BUTTON.

            Eleven endings in three groups is a set to hunt through, and the
            one way to walk them in order was a keyboard shortcut written in
            six-point type above them: on a phone, where this app is measured,
            there is no such key at all. A control that does what the shortcut
            does makes the card a thing you can crank, which is the whole of
            what the second part is for. It is quiet on purpose, because the
            loud button on this screen is the one that leads out of it
            (`components/Button.tsx`), and a focused button keeps its own Enter,
            so pressing it repeatedly walks the eleven either way.
          */}
          <button
            type="button"
            onClick={step}
            className="tap-tint mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold"
            style={{ color: "var(--accent-deep)" }}
          >
            Next ending <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      </div>

      {ref && (
        <Card>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-bold" style={{ color: "var(--accent-deep)" }}>{ref.plain}</span>
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              <span lang="et">{ref.spec.et}</span>
              {" · "}
              <CaseQuestion question={form.question} inline />
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

/**
 * What the answer means, in the same words the second part used.
 *
 * The case's own `plain` is a fact about the ending ("off, and from a person")
 * and the reading is a fact about the word in front of the reader ("off the
 * book"). Both are true and only one of them answers "so what did I just
 * spell", which is the question somebody who has just typed an ending has.
 * `plain` is what is left where the dictionary gave no gloss to put in a
 * frame, which is the sentence this line carried before the reading existed.
 */
function Means({ form, ref_ }: { form: WalkForm; ref_: ReturnType<typeof caseReference> }) {
  return form.reading ? <>“{form.reading}”</> : <>{ref_?.plain}</>;
}

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
        <p className="mt-1 text-sm" data-ask={form.question} style={{ color: "var(--ink-3)" }}>
          <CaseQuestion question={form.question} inline />
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
              is <span lang="et">{form.value}</span>, which means <Means form={form} ref_={ref} />.
            </>
          ) : (
            <>
              Not that one. It is <span lang="et">{form.value}</span>, the stem with{" "}
              <span lang="et">-{form.suffix}</span> on it, which means <Means form={form} ref_={ref} />.
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
