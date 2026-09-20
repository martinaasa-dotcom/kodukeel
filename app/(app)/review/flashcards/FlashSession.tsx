"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { gradeCard } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { SpeakPair } from "@/components/Speak";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { Chip, KeyCap, Meter, Stat } from "@/components/ui";
import { useOffline } from "@/components/OfflineProvider";
import { StarWord } from "@/components/StarWord";
import { enqueueGrade } from "@/lib/offline/db";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { GapMeaning } from "@/components/GapMeaning";
import { gapCue, gapMeaning } from "@/lib/copy/gapMeaning";
import { splitOnForm } from "@/lib/dict/examples";
import { askLine, isForm, markFlash, plainAskFor, type FlashMark, type FlashTask } from "@/lib/games/flash";
import { hintLadder } from "@/lib/questions/hints";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { MAX_SENTENCE_CHARS } from "@/lib/estonian/writing";
import { asksInEnglish } from "@/lib/games/flash";
import { caseByKey } from "@/lib/estonian/cases";
import { VERDICT_CLASS, VERDICT_INK, verdictOfRating } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";

/** A task, plus where the word stands, which is the thing the round is moving. */
export interface FlashPrompt extends FlashTask {
  progress: { correct: number; needCorrect: number; slots: number; needSlots: number };
  /** Whether this word is already one of the learner's favorites. */
  starred: boolean;
}

/**
 * THE ROUND.
 *
 * One word, one form, one of five shapes, and a box. It renders its own runner
 * rather than `ReviewSession` because the two ask different questions: a review
 * card is a front and a back, and three of these shapes have no back to turn
 * over. What it does share is everything that would be a bug to reimplement,
 * which is the grading path: `gradeCard`, the durable outbox behind it, the
 * learner's own voice and feedback sounds, and the letter bar.
 *
 * The mark is worked out here rather than on the server, and everything it
 * needs travels with the task. That is the same arrangement every review card
 * has always had, since a card carries its own answer, and it is what lets a
 * round carry on when the connection goes: the grade goes to the outbox and is
 * replayed with the slot it was about (ADR-015).
 */
export function FlashSession({ prompts: initialPrompts }: { prompts: FlashPrompt[] }) {
  /*
    Snapshotted once. `gradeCard` is a Server Action and Next re-renders this
    route's Server Component after every call, which would hand down a freshly
    drawn round and change the question under somebody still reading their
    feedback. Every mode that grades froze its queue for this reason.
  */
  const [prompts] = useState(initialPrompts);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [mark, setMark] = useState<FlashMark | null>(null);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [heardLost, setHeardLost] = useState(false);
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const sound = useFeedbackSound();
  const { refresh: refreshOutbox } = useOffline();

  const task = prompts[index];
  const finished = !task;
  /*
    The way back to the word before this one. `lib/ux/lookBack.ts` is the rule
    and says why it is not undo: nothing here grades, reorders or requeues.
  */
  const look = useLookBack();

  /*
    A `heard` task with no sound is asked the plain way rather than abandoned.

    The browser refuses to play on a page nobody has touched yet, which is not
    a failure and leaves the button in place to be pressed; a clip that cannot
    be fetched at all takes the button away, and that is this. Falling back to
    the lemma and the form asks the same slot with the same answer, which is
    the one thing that has to survive: the round is about the word.
  */
  const shape = task?.shape === "heard" && heardLost ? "inflect" : task?.shape;

  /*
    THE WAY OUT OF BEING STUCK, ON THE ROUND THAT ASKS THE HARDEST QUESTIONS.

    Every shape but `build` wants one form of one word, which is exactly what
    `hintLadder` uncovers. `build` wants a sentence of the learner's own, so
    there is nothing to uncover: the answer is not a string this round holds,
    it is whatever they write, and a ladder over `value` would be handing them
    a form to paste rather than a sentence to compose.

    The suffix comes off the case's own table where this is a case, which is
    what lets the ending be named on a round holding no principal parts. Keyed
    on the word and the slot together, because this round asks one word in
    several forms in a sitting and being stuck on the kaasaütlev is not being
    stuck on the seesütlev.
  */
  const ladder = shape === "build" || !task
    ? []
    : hintLadder({
      answer: task.value,
      stems: [task.lemma],
      suffix: caseByKey(task.slot)?.suffix,
    });
  const hints = useHints({
    word: task?.lexemeId ?? null,
    // The slot too: this round asks one word in several forms in a sitting, and
    // being stuck on the kaasaütlev is not being stuck on the seesütlev.
    question: task?.id ?? null,
    ladder,
  });

  const check = useCallback(async () => {
    if (!task || mark) return;
    const marked = markFlash(task, typed);
    /*
      A hint is paid for: see `lib/questions/hints.ts`. `Math.min` rather than a
      branch, so a hint can only lower what the answer earned, and the ceiling
      is 4 until a rung is taken, so a round nobody asked for help on is graded
      exactly as it was. The note the learner reads is the marker's own and is
      untouched: what changed is what the scheduler is told, which is the whole
      point of charging for it.
    */
    const result = { ...marked, rating: Math.min(marked.rating, hints.ceiling) as FlashMark["rating"] };
    setMark(result);
    sound(result.right ? "right" : "wrong", result.right ? streak + 1 : 0);
    if (result.right) { setRight((n) => n + 1); setStreak((s) => s + 1); } else setStreak(0);
    if (!result.right) hints.noteMiss();

    const duration = Date.now() - shownAt.current;
    const answeredAt = new Date().toISOString();
    /*
      The ending they reached for instead, which this round has always known
      and has only ever said out loud. `markFlash` names it to print "That is
      the seestütlev. This one wanted the seesütlev.", and that sentence was
      the whole life of the fact: it left the screen with the card.

      Only where it differs from what was asked, since `markFlash` also
      returns the asked slot on a clean hit and on a typo. `writeGrade` checks
      that again rather than trusting it, because this is a public endpoint.
    */
    const reached = result.wroteSlot && result.wroteSlot !== task.slot
      ? result.wroteSlot
      : undefined;
    try {
      const res = await gradeCard(
        task.cardId, result.rating, duration, answeredAt, task.slot, reached,
      );
      if (!res.ok) throw new Error(res.error);
    } catch {
      // The grade is still a fact about something the learner did, and the slot
      // is half of what makes it worth recording here: replayed without it, an
      // answer about the kaasaütlev would go down as an answer about whatever
      // the card happens to be.
      await enqueueGrade({
        id: crypto.randomUUID(),
        cardId: task.cardId,
        rating: result.rating,
        durationMs: duration,
        reviewedAt: Date.parse(answeredAt),
        slot: task.slot,
        reachedSlot: reached,
      });
      refreshOutbox();
    }
  }, [task, typed, mark, sound, streak, refreshOutbox, hints]);

  const next = useCallback(() => {
    /*
      One choke point, so the record cannot fall behind the round. What is
      kept is the question as it was drawn, which for a gap and a heard task
      is the sentence rather than the lemma, and the form it turned out to be.
    */
    if (task) {
      look.record({
        of: task.id,
        label: task.label,
        question: task.gapped ?? task.sentence ?? task.lemma,
        answer: task.shown.join(" / ") || task.value,
        note: task.gapped || task.sentence ? `${task.lemma}, ${task.translation}` : task.translation,
        questionLang: "et",
        answerLang: "et",
        speak: task.value,
      });
    }
    setMark(null);
    setTyped("");
    setHeardLost(false);
    setIndex((i) => i + 1);
    shownAt.current = Date.now();
  }, [task, look]);

  /*
    Enter checks, and then Enter moves on. One key for the whole round, which
    is what makes a typed round fast enough to be worth doing on a phone.
    `build` is a textarea and takes the modifier, since a sentence sometimes
    wants a line break.
  */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* While a look back is on screen the round is not, so its keys are not
         either: a stray Enter over an older word would move the round on. */
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e) && !inEditable(e.target)) { e.preventDefault(); look.forward(); }
        return;
      }
      if (e.key.toLowerCase() === "b" && !inEditable(e.target) && look.seen.length > 0) {
        e.preventDefault();
        look.open();
        return;
      }
      if (mark) { if (isAdvanceKey(e)) { e.preventDefault(); next(); } return; }
      if (e.key !== "Enter") return;
      if (shape === "build" && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      void check();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mark, next, check, shape, look]);

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          Round complete
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
          Every answer counted toward the word it was about.
        </p>
        <div
          className="mt-8 grid grid-cols-3 gap-6 rounded-lg border p-6"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
        >
          <Stat value={prompts.length} label="Asked" />
          <Stat
            value={`${Math.round((right / prompts.length) * 100)}%`}
            label="Right"
            tone={VERDICT_INK[right === prompts.length ? "right" : "nearly"]}
          />
          <Stat value={`${minutes}m`} label="Time" />
        </div>
        <WayOut className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/review/flashcards">Another round</ButtonLink>
          <ButtonLink href="/words/mastery" variant="primary">Where your words stand</ButtonLink>
        </WayOut>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      {/* The heading a session screen has no room to draw. Every mode carries
          one: the empty state had a heading and the round did not, so an
          accessibility run that met an empty deck saw one and passed. */}
      <h1 className="sr-only">Flash cards</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession href="/practice" size={19} />
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(index / prompts.length) * 100}%`, background: "var(--accent)" }}
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={prompts.length}
            aria-label="Round progress"
          />
        </div>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {prompts.length - index} left
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div
          className="flex flex-wrap items-center gap-2 border-b px-6 py-3"
          style={{ borderColor: "var(--rule-soft)" }}
        >
          <Chip tone="accent">{askLine({ ...task, shape: shape ?? task.shape })}</Chip>
          {task.provenance === "derived" && <Chip>worked out from the stem</Chip>}
          {/* The corner of the card, which is where somebody looks for this the
              moment a word turns out to be worth keeping. */}
          <div className="ml-auto">
            <StarWord lexemeId={task.lexemeId} starred={task.starred} label={task.lemma} />
          </div>
        </div>

        <div className="px-6 py-8">
          <Question task={task} shape={shape ?? task.shape} onNoAudio={() => setHeardLost(true)} />

          <div className="mt-7">
            <label htmlFor="answer" className="label-xs block" style={{ color: "var(--ink-3)" }}>
              {shape === "build" ? "Your sentence" : "Your answer"}
            </label>
            {shape === "build" ? (
              <textarea
                id="answer"
                value={typed}
                lang="et"
                rows={3}
                maxLength={MAX_SENTENCE_CHARS}
                disabled={!!mark}
                autoFocus
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Kirjuta oma lause siia…"
                className="field-lg mt-2 w-full resize-none text-md disabled:opacity-70"
                style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
              />
            ) : (
              <input
                id="answer"
                value={typed}
                lang="et"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={!!mark}
                onChange={(e) => setTyped(e.target.value)}
                className="field-lg mt-2 w-full text-lg disabled:opacity-70"
                style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink)" }}
              />
            )}
            {!mark && <div className="under-field"><DiacriticBar /></div>}
            {!mark && (
              <div className="mt-4">
                <HintLadder
                  ladder={ladder}
                  taken={hints.taken}
                  onTake={hints.take}
                  open={hints.open}
                  label={task.lemma}
                />
              </div>
            )}
          </div>

          {mark && <Feedback task={task} mark={mark} />}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          {!mark ? (
            <Button
              variant="primary"
              className="w-full py-3"
              disabled={typed.trim().length === 0}
              onClick={() => void check()}
            >
              Check it <KeyCap className="ml-1">{shape === "build" ? `⌘ ${ADVANCE_KEY_GLYPH}` : ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : (
            <Button variant="primary" className="w-full py-3" onClick={next} autoFocus>
              Next <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          )}
        </div>
      </div>
      )}

      <div className="mt-4 flex justify-center text-2xs" style={{ color: "var(--ink-3)" }}>
        <LookBackButton {...look.button} disabled={look.looking} keyHint={false} />
      </div>

      <Standing task={task} />
    </div>
  );
}

/** What the learner is looking at, which is a different thing in each shape. */
function Question({
  task, shape, onNoAudio,
}: { task: FlashPrompt; shape: FlashTask["shape"]; onNoAudio: () => void }) {
  const meaning = (
    <p className="text-base" style={{ color: "var(--ink-2)" }}>{task.translation}</p>
  );
  const word = (
    <p lang="et" className="text-3xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
      {task.lemma}
    </p>
  );

  if (shape === "recall") {
    return (
      <div>
        <p className="text-3xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
          {task.translation}
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
          {task.pos.toLowerCase()}
        </p>
      </div>
    );
  }

  if (shape === "gap") {
    return (
      <div>
        <p lang="et" className="text-xl font-semibold leading-snug" style={{ color: "var(--ink)" }}>
          {task.gapped}
        </p>
        {/*
          WHAT THE MISSING WORD MEANS, AND WHERE THE DICTIONARY CAN, THE WHOLE
          LINE WITH THAT MEANING MARKED INSIDE IT.

          "The missing word means four" says what the word is and nothing about
          the sentence it is missing from, which is the report this pass
          started from one round over. Where the dictionary has the line, it is
          the better sentence of the two and says the same thing: it names the
          meaning and puts it where the gap is. Where it has none, the sentence
          above stands, which is what every gap card said before this.
          `lib/copy/gapMeaning.ts` is the one rule, including its two refusals.
        */}
        {(() => {
          const meaning = gapMeaning({
            en: task.sentenceEn, answer: task.value, cue: task.translation,
          });
          /*
            AND THE GLOSS STAYS WHEREVER THE SENTENCE DID NOT TAKE ITS PLACE.

            One rule for both halves (`gapCue`): a marked line is this gloss
            printed in context, so saying it again underneath is the same word
            twice, and an unmarked line is a sentence whose English happens not
            to carry the gloss as a whole word, where the cue is the only thing
            naming it. This round passes no lemma, deliberately: the meaning
            rather than the dictionary form is what makes it harder than the
            gap-fill card review already has, since printing the dictionary
            form beside a gap wanting the dictionary form hands the answer
            over. That was 2,468 cards once.
          */
          const cue = gapCue({ hint: task.translation, lemma: null, marked: meaning?.marked ?? false });
          if (!meaning && !cue) return null;
          return (
            <div className="mt-4">
              {meaning && <GapMeaning meaning={meaning} />}
              {cue && (
                <p className="text-base" style={{ color: "var(--ink-2)" }}>
                  The missing word means <strong style={{ color: "var(--ink)" }}>{cue}</strong>.
                </p>
              )}
            </div>
          );
        })()}
        <SlotLine task={task} />
      </div>
    );
  }

  if (shape === "heard") {
    return (
      <div>
        {word}
        {meaning}
        <div className="mt-6 flex items-center gap-3">
          <SpeakPair
            text={task.sentence ?? task.lemma}
            size={22}
            className="px-1 py-1"
            label="Play the sentence"
            slowLabel="Play the sentence slowly"
            onUnavailable={onNoAudio}
            autoplay
          />
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            Play it, then type the form of {task.lemma} you hear.
          </span>
        </div>
      </div>
    );
  }

  // `inflect` and `build` both ask for a named form of a word on the screen.
  return (
    <div>
      {word}
      {meaning}
      <SlotLine task={task} />
      {shape === "build" && !plainAskFor(task) && (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          Write one sentence of your own with it in that form.
        </p>
      )}
    </div>
  );
}

/**
 * What the card wants, and then what that thing is called.
 *
 * IN THAT ORDER, WHICH IS THE WHOLE OF WHAT CHANGED. This used to lead with
 * `lihtminevik · ma` at 24px in the accent, with the English name under it, and
 * a learner drove a round and reported that they could not tell what it wanted
 * them to do. Both names were on the screen and neither is an instruction: a
 * name is a thing you look up, and somebody who has to look it up mid card has
 * already lost the sentence they were building.
 *
 * So the plain sentence leads and the names sit under it, in one quiet line, as
 * the cross-reference CLAUDE.md has always said they are. Nothing is dropped:
 * a learner who is also sitting a course still reads `lihtminevik · ma` and
 * `the simple past` on the same card, which is what lets them follow their own
 * teacher. Where a slot has no plain reading the name leads exactly as before,
 * because `plainAsk` is deliberately partial and an invented sentence would be
 * worse than the name it replaced.
 */
function SlotLine({ task }: { task: FlashPrompt }) {
  const english = asksInEnglish(task.slot);
  const plain = plainAskFor(task);
  return (
    <div className="mt-5">
      {plain ? (
        <>
          <p className="text-xl font-semibold leading-snug" style={{ color: "var(--ink)" }}>
            {plain}
          </p>
          <p lang="et" className="mt-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
            {task.label}
            {english && <span lang="en"> · the {english}</span>}
          </p>
        </>
      ) : (
        <>
          <p lang="et" className="text-2xl font-semibold" style={{ color: "var(--accent-deep)" }}>
            {task.label}
          </p>
          {english && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>the {english}</p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * WHAT HAPPENED, PAINTED THE WAY THE REST OF THE APP PAINTS IT.
 *
 * This was a solid `--butter` panel with `--ink-2` running across it, which is
 * two rules broken at once and one of them only in the dark. Every hue in this
 * palette is a pair: the fill is what a bar or a button is painted, the tint is
 * what a panel is painted, and each has an ink drawn to sit on its own tint
 * (docs/14-design-system.md). `--butter` is the fill, #cf9114, so the box was a
 * slab of gold with body text set in a color chosen for a white card; in the
 * dark theme `--butter` is #ffcd6e and `--butter-ink` resolves to the same
 * value, so the heading was bright yellow on bright yellow. Every other
 * feedback panel in the app was already right: the cloze round, listening,
 * sprint and pairs all paint `<hue>-soft` and write in `<hue>-ink`.
 *
 * AND THREE OUTCOMES RATHER THAN TWO, because the round already knew about
 * three. `markFlash` returns a middle rating for the right word in the wrong
 * ending, which is the near miss this round exists to catch, and the screen
 * flattened it into the same box as a blank. The palette has one color for
 * "nearly" and one for "missed" and they mean exactly those two things, so the
 * box now says which without anybody reading a word. It says it in words too,
 * since a hue is never the only thing carrying a distinction here.
 */
function Feedback({ task, mark }: { task: FlashPrompt; mark: FlashMark }) {
  const spec = caseByKey(task.slot);
  const english = asksInEnglish(task.slot);
  /*
    Recalled, nearly, or missed. `mark.right` with the middle rating is a
    diacritic somebody dropped or a slip of one letter, which `checkAnswer`
    counts as produced, so it reads as the recall it was.
  */
  const verdict = mark.right ? "right" : verdictOfRating(mark.rating);
  const head = { right: "That is it", nearly: "Nearly", wrong: "Not this time" }[verdict];

  return (
    <div className="mt-6" aria-live="polite">
      <div className={`${VERDICT_CLASS[verdict]} verdict-panel flex items-start gap-2.5`}>
        {mark.right
          ? <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
          : <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />}
        <p className="text-base">
          <strong className="font-semibold">{head}.</strong>
          {mark.note && <> {mark.note}</>}
        </p>
      </div>

      {/* The answer itself, on the card rather than on the tint: it is the one
          thing worth reading twice, and a form is read letter by letter. */}
      <div
        className="mt-4 rounded-md border px-3.5 py-3"
        style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
      >
        {/* `data-flash-answer` and `data-flash-slot` are how `scripts/test-flash.mjs`
            learns the form the dictionary holds without copying the app's own
            derivation into the test. They used to be read off a `label: form`
            line the panel no longer prints. */}
        <p
          lang="et"
          data-flash-answer=""
          className="text-xl font-semibold leading-tight"
          style={{ color: "var(--ink)" }}
        >
          {task.shown.join(" / ")}
        </p>
        {/*
          Only where the slot names a form. `task.label` for PRODUCTION is
          "saying it", the English word for the whole round rather than a
          cross-reference to anything, so it read as a caption that answers
          nothing: `plainAskFor` already draws this line for the recall shape
          (a clause under it would ask the question twice), and this panel is
          the same question one screen later.
        */}
        {isForm(task.slot) && (
          <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
            <span lang="et" data-flash-slot="">{task.label}</span>
            {english && <> · the {english}</>}
          </p>
        )}
      </div>

      {task.sentence && (
        <>
          <p lang="et" className="mt-4 text-base leading-snug" style={{ color: "var(--ink-2)" }}>
            {/* The spelling the sentence itself carries, which is not always the
                one the slot leads with: `tuppa` and `toasse` are both the
                illative and a lexicographer writes whichever the sentence
                wanted. */}
            {splitOnForm(task.sentence, task.sentenceForm ?? task.value)
              .map((part, i) =>
                part.match
                  ? <strong key={i} style={{ color: "var(--ink)" }}>{part.text}</strong>
                  : <span key={i}>{part.text}</span>,
              )}
          </p>
          {/*
            Always offered rather than gated on a page-side check: this file
            and everything under lib/games/flash.ts may not reach a provider,
            since whether a form is right is the dictionary's answer alone
            (`npm run test:invariants`). A deployment with no model simply
            answers the press with a refusal, through the same server action
            every other sentence translation goes through.
          */}
          <SentenceTranslation
            key={task.sentence}
            lexemeId={task.lexemeId}
            et={task.sentence}
            en={task.sentenceEn}
            canTranslate
          />
        </>
      )}

      <p className="mt-4 text-xs" style={{ color: "var(--ink-3)" }}>
        {task.provenance === "ekilex"
          ? "This form is the one the dictionary records."
          : "This form is worked out from the stem the dictionary records."}{" "}
        {spec && (
          <Link
            href={`/grammar/${task.slot.toLowerCase()}`}
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--accent-deep)" }}
          >
            What the {spec.et} is for
          </Link>
        )}
      </p>
    </div>
  );
}

/** How far this word is from being done, which is the thing the round moves. */
function Standing({ task }: { task: FlashPrompt }) {
  const { correct, needCorrect, slots, needSlots } = task.progress;
  const pct = Math.round(
    Math.min(1, Math.min(correct / needCorrect, slots / Math.max(1, needSlots))) * 100,
  );
  return (
    <div className="mt-4">
      <Meter pct={pct} label={`${task.lemma} toward mastered`} />
      {/*
          Two facts, and each carries its target only while it is unmet. It read
          "6 of 5 right" on the first word of the first real round, which is a
          line the learner has to work out rather than read: over the count and
          short of the variety is the ordinary state of a word this round is
          about, and it is what the sentence has to say plainly.
        */}
      <p className="mt-2 text-center text-xs" style={{ color: "var(--ink-3)" }}>
        <span lang="et">{task.lemma}</span>:{" "}
        {correct >= needCorrect
          ? `right ${correct} times`
          : `right ${correct} of ${needCorrect} times`}
        {slots >= needSlots
          ? `, in ${slots} ${slots === 1 ? "form" : "forms"}.`
          : `, in ${slots} of the ${needSlots} ${needSlots === 1 ? "form" : "forms"} it needs.`}
      </p>
    </div>
  );
}
