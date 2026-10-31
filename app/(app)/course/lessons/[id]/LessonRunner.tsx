"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { EnglishToggle } from "@/components/course/EnglishToggle";
import { StepPills } from "@/components/course/StepPills";
import { forgetLessonPlace, loadLessonPlace, saveLessonPlace } from "@/components/course/lessonResume";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Braced } from "@/components/Braced";
import { RuleNote } from "@/components/RuleNote";
import { Speak } from "@/components/Speak";
import { nativePart } from "@/lib/audio/native";
import { stopClip } from "@/lib/audio/clip";
import { useLocale, useT } from "@/components/Locale";
import { LessonText, lessonTextLang } from "@/components/course/LessonText";
import { Card, Note, Page, SectionTitle, Stack, StatTile } from "@/components/ui";
import { LessonConversation } from "@/components/course/LessonConversation";
import { Confetti } from "@/components/Confetti";
import { Mascot } from "@/components/brand";
import { fill, tr } from "@/lib/copy/locale";
import type { LessonSpec, PracticeItem, Taught } from "@/lib/course/lessons";
import { lessonLabel } from "@/lib/course/lessons/label";
import { LEVELS, levelIndex } from "@/lib/collections/syllabus/types";
import { finishLesson } from "@/app/actions";
import { useModuleFocus, useModuleNext } from "@/components/course/moduleFocus";
import { NOT_REACHED } from "@/lib/copy/values";
import { HearSet } from "@/components/sounds/Native";
import { SoundRows } from "@/components/sounds/SoundRows";
import { SpellIt } from "@/components/sounds/SpellIt";
import { ListenFirst } from "@/components/course/ListenFirst";
import { WriteStep } from "@/components/course/WriteStep";
import { levelNewsFor } from "@/lib/course/lessons/levelNew";
import { Quiz } from "./Quiz";
import { SayIt, type SayPlace } from "./SayIt";
import { lessonSceneHref, type ConversationReturn } from "@/lib/scenes/lessonReturn";
import { nameOf } from "@/lib/ux/roundNames";
import { worksheetLink, type LessonWorksheet } from "@/lib/course/lessonWorksheet";
import { ReadText } from "@/components/course/ReadText";
import type { GlossedToken } from "@/lib/dict/glossed";

/**
 * ONE LESSON, ITS STEPS ALWAYS IN THIS ORDER (docs/43-lessons.md §1).
 *
 * Listen, Words and How it works ask nothing and grade nothing: a learner
 * meets the whole idea before anybody asks them a thing about it, which is
 * the change the plan was written for. Practice, Say it and Review ask, out of
 * what has been taught and nothing else, and a part's writing evening puts
 * Write straight after Practice.
 *
 * A learner always knows where they are, because the steps are listed at
 * the top with the one they are on marked, in words as well as in color. A
 * step can always be left: the button at the foot says "Continue" once the
 * step is done and "Skip this step" before, so nobody is held in a room, and
 * the steps that ask nothing are done the moment they are open.
 *
 * Pressing on moves the caret to the new step's heading, which a screen
 * reader reads out, and brings it to the top of the window, because a step is
 * taller than a phone and arriving halfway down the next one is how a press
 * reads as broken.
 *
 * "Finish the lesson" is the press that records it (`finishLesson`): the
 * evening is ticked and the lesson's words go into the deck, so Review repeats
 * them. Opened from today's module, the way on from the finished lesson is the
 * module's own; opened from the list of lessons, it is the next lesson.
 */
const STEPS = ["listen", "words", "how", "practise", "say", "review"] as const;
/**
 * A WRITING EVENING HAS A SEVENTH STEP, BETWEEN PRACTICE AND SAY IT (B1 on).
 * Each B1 part writes one real text, and its writing evening reads a model,
 * fills in the frame and writes the learner's own (`WriteStep`). It sits after
 * Practice because the frame is practice of the same forms with more around
 * them, and before Say it because a text written is easier to say.
 */
const WRITING_STEPS = ["listen", "words", "how", "practise", "write", "say", "review"] as const;
type Step = (typeof WRITING_STEPS)[number];

/**
 * A CHECK-IN ENDS ON THE CONVERSATION, NOT IN THE MIDDLE OF THE EVENING.
 *
 * A check-in or the end of a part teaches nothing new: its whole point is
 * putting the part together by holding a conversation. In the ordinary order
 * that conversation was step five of six, drawn as the same cards as the
 * questions about yourself and followed by a review quiz, so the capstone
 * read as one more round of speaking and the evening ended on flashcards. So
 * for those lessons the review comes first and the conversation is the last
 * thing, which is also what "finish the lesson" then follows.
 */
const CAPSTONE_STEPS: readonly Step[] = ["listen", "words", "how", "practise", "review", "say"];
const CAPSTONE_WRITING_STEPS: readonly Step[] = ["listen", "words", "how", "practise", "write", "review", "say"];

/** Whether this evening is the one that puts a part together. */
const isCapstone = (lesson: LessonSpec) => lesson.kind !== "lesson" && lesson.roleplay !== undefined;

const STEP_TITLE: Record<Step, string> = {
  listen: "Listen",
  words: "Words",
  how: "How it works",
  practise: "Practice",
  write: "Write",
  say: "Say it",
  review: "Review",
};

/** The worksheet's agreed name, Estonian first (`lib/ux/roundNames.ts`). */
const WORKBOOK_NAME = nameOf("/review/workbook") ?? { et: "Töövihik", en: "Workbook" };

/** Every step not on this list asks nothing, and is finished by being open. */
const ASKS: ReadonlySet<Step> = new Set(["practise", "write", "say", "review"]);

export function LessonRunner({ lesson, practice, review, next, scene, situation = null, worksheet = null, conversation, place, name, due = 0, check = null, part, timeMultiplier, partAt, read = null }: {
  lesson: LessonSpec;
  /**
   * The lesson's text to read (B2 on), a line at a time, with the dictionary
   * under the words the lessons have not taught yet (`lib/progress/lessonView.ts`).
   * Null where the lesson has none, and then a text it does have is drawn plain.
   */
  read?: readonly (readonly GlossedToken[])[] | null;
  /** How much longer than the standard a timed go runs for this learner (`lib/ux/roundClock.ts`). */
  timeMultiplier: number;
  /** Which part of its level the lesson is in, counted from 1: the fade starts harder later on (`fade.ts`). */
  partAt: number;
  practice: readonly PracticeItem[];
  review: readonly PracticeItem[];
  next: { id: string; title: string } | null;
  /** The lesson's own conversation, where it has one (`sceneForLesson`). */
  scene: string | null;
  /** A conversation out there the lesson rehearses, from the catalog (`lessonSituations.ts`). */
  situation?: { id: string; title: string } | null;
  /** From B1, the worksheet page the finished lesson offers (`lib/course/lessonWorksheet.ts`), or null. */
  worksheet?: LessonWorksheet | null;
  /**
   * Back from the lesson's own conversation: `done` from its debrief, `left`
   * from its way out. The scripted conversation was held before the link was
   * offered, so either opens the lesson on its finish and records it; only
   * `done` stops offering the real one again.
   */
  conversation: ConversationReturn | null;
  /** Where this lesson sits among its level's lessons, for the finish. */
  place: { at: number; of: number };
  /** The learner's own first name, for a model answer about them (`ownAnswer.ts`). */
  name: string | null;
  /** Cards due in the learner's reviews now, for the nudge on the finished screen. */
  due?: number;
  /** The check that closes this lesson's part, where this is its last lesson. */
  check?: { id: string; final: boolean; passed: boolean } | null;
  /** The part this lesson is in, lesson by lesson, for "4 of 8" and the track on the finish. */
  part: { title: string; lessons: readonly { id: string; label: string; title: string; done: boolean }[] };
}) {
  const t = useT();
  const locale = useLocale();
  const focus = useModuleFocus();
  const moduleNext = useModuleNext();
  const [at, setAt] = useState(0);
  const news = levelNewsFor(lesson);
  const [finished, setFinished] = useState<ReadonlySet<Step>>(new Set());
  const [reached, setReached] = useState(0);
  const [score, setScore] = useState<{ right: number; total: number } | null>(null);
  const [over, setOver] = useState(() => conversation !== null && isCapstone(lesson));
  /* Whether the finished lesson reached the server: null until it has been tried. */
  const [saved, setSaved] = useState<boolean | null>(null);
  /* What a failed save said: the server's own refusal where it gave one, and only a press that never arrived reads as the connection. */
  const [saveError, setSaveError] = useState<string>(NOT_REACHED);
  /* Whether finishing it counted toward the course, or was a lesson read ahead of it. */
  const [recorded, setRecorded] = useState<boolean | null>(null);
  const [saving, startSaving] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const capstone = isCapstone(lesson);
  const steps: readonly Step[] = lesson.write
    ? capstone ? CAPSTONE_WRITING_STEPS : WRITING_STEPS
    : capstone ? CAPSTONE_STEPS : STEPS;
  const step = steps[at]!;
  const titleOf = (s: Step) => (capstone && s === "say" ? "Conversation" : STEP_TITLE[s]);

  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start" });
  }, [at, over]);
  /* A retry that lands takes its button away, so the caret goes back to the finished screen's heading, which reads it. */
  const retried = useRef(false);
  useEffect(() => {
    if (saved !== true || !retried.current) return;
    retried.current = false;
    heading.current?.focus();
  }, [saved]);

  const finish = (s: Step) => setFinished((prev) => new Set(prev).add(s));
  const save = () => startSaving(async () => {
    const result = await finishLesson(lesson.id).catch(() => null);
    setSaved(Boolean(result?.ok));
    setSaveError(result && !result.ok ? result.error : NOT_REACHED);
    setRecorded(result?.ok ? result.recorded : null);
  });
  // Back from the conversation, the lesson is over and is saved the way a finished one is.
  const savedOnArrival = useRef(false);
  useEffect(() => {
    if (conversation === null || !isCapstone(lesson) || savedOnArrival.current) return;
    savedOnArrival.current = true;
    save();
    // Once, on arrival: `save` is the same press the Finish button makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    PRACTICE AND REVIEW KEEP THEIR PLACE WHEN THE LEARNER STEPS AWAY. The step
    list is the way back to the table halfway through Practice, and a step
    drawn only while it is current started again from its first question on
    the way back. A quiz holds no microphone and plays one clip at a time, so
    it stays mounted, hidden, once it has been on the screen; one never shown
    is not mounted, so nothing in it plays to an empty room, and stepping
    away stops the clip in the air.
  */
  const [shown, setShown] = useState<ReadonlySet<Step>>(() => new Set());
  useEffect(() => {
    setShown((prev) => (prev.has(step) ? prev : new Set(prev).add(step)));
  }, [step]);
  const kept = (s: Step) => step === s || shown.has(s);
  /*
    SAY IT IS THE EXCEPTION, and goes when the learner steps away: it holds a
    microphone and lines that play one after another, and only its going
    closes those. Its place is kept here instead (`SayPlace`).
  */
  const sayPlace = useRef<SayPlace | null>(null);
  const keepSayPlace = useCallback((p: SayPlace) => { sayPlace.current = p; }, []);

  const go = (n: number) => {
    moved.current = true;
    stopClip();
    if (n >= steps.length) {
      setOver(true);
      save();
    } else {
      setAt(n);
      setReached((r) => Math.max(r, n));
    }
  };
  /*
    B1's conversation is heard before it is read, and that is held here rather
    than in the step: the step unmounts whenever another is pressed, and coming
    back to reread it is not a reason to have it hidden again. Until it has
    been heard (or shown on purpose), the foot of the screen offers to skip,
    so the step's own "Read it" is its one loud button.
  */
  const [heard, setHeard] = useState(() => !(lesson.listenFor && lesson.listenFor.length > 0));
  /* Heard before a reload rather than on this screen: nothing was pressed, so nothing takes the caret. */
  const [heardOnReload, setHeardOnReload] = useState(false);
  /*
    A RELOAD PICKS THE LESSON UP WHERE IT WAS (`lessonResume.ts`): read once
    after mount, since the server rendered step 1 and a first render that
    disagreed with it would not hydrate; written on every move after that.
  */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (over) return;
    const place = loadLessonPlace(lesson.id, steps);
    if (!place) return;
    setAt(place.at);
    setReached(place.reached);
    setFinished(new Set(place.finished as Step[]));
    if (place.heard) { setHeard(true); setHeardOnReload(true); }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    if (over) forgetLessonPlace(lesson.id);
    else saveLessonPlace(lesson.id, steps, { at, reached, finished: [...finished], heard });
  }, [lesson.id, steps, at, reached, finished, heard, over]);
  const done = step === "listen" ? heard : !ASKS.has(step) || finished.has(step) || (step === "review" && review.length === 0);

  const inPart = part.lessons.findIndex((l) => l.id === lesson.id);
  const partEnd = inPart === part.lessons.length - 1;
  const eyebrow = (
    <span>
      {lesson.level}, <LessonText text={part.title} locale={locale} />, {fill(t("Lesson {n}"), { n: lessonLabel(lesson) })}
    </span>
  );

  if (over) {
    const taught = lesson.teaches.flatMap((item) => (item.kind === "verb" ? [item.et, item.first] : [item.et]));
    const conversationDone = conversation === "done";
    return (
      <Page eyebrow={eyebrow} title={t(lesson.title)} titleLang={lessonTextLang(lesson.title, locale)}>
        <Stack>
          {/*
            THE LITTLE CONFETTI PAGE. A lesson ends the way every round
            used to: a burst of confetti, the mascot cheering on the night
            panel, and the evening said back, then the way on.

            WHAT IS SAID BACK IS THE EVENING, NOT THE APP: the words met, the
            practice and where this lesson sits in its part, with the lesson
            just done lit on the track. The end of a part says so in the
            heading, because finishing a part is a thing a person tells
            somebody.
          */}
          <Confetti count={partEnd ? 80 : 40} />
          <section aria-labelledby="lesson-done" className="mx-auto w-full max-w-2xl" data-lesson-done>
            <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
              <Mascot size={68} mood="cheer" className="float mx-auto" />
              <h2
                id="lesson-done"
                ref={heading}
                tabIndex={-1}
                className="font-display mt-5 text-2xl font-bold leading-tight tracking-tight md:text-3xl"
                style={{ color: "var(--ink)", textWrap: "balance" }}
              >
                {partEnd
                  ? <>{t("Part done:")} <LessonText text={part.title} locale={locale} /></>
                  : t("Lesson done")}
              </h2>
              <p className="mx-auto mt-2 max-w-[44ch] text-base" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>
                <LessonText text={lesson.goal} locale={locale} />
              </p>
            </div>

            {/* The part, lesson by lesson, with this one lit. */}
            <div className="mt-6 rounded-[var(--r-xl)] border px-5 py-4" style={{ background: "var(--surface)", borderColor: "var(--edge)" }} data-part-track>
              <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                {fill(t("{n} of {total} in"), { n: String(inPart + 1), total: String(part.lessons.length) })}{" "}
                <LessonText text={part.title} locale={locale} />
              </p>
              <ol className="mt-3 flex flex-wrap gap-1.5" aria-label={t("The lessons of this part")}>
                {part.lessons.map((l, i) => {
                  const here = i === inPart;
                  const past = here || l.done;
                  return (
                    <li
                      key={l.id}
                      className={here ? "pop-in" : undefined}
                      // In the reader's language, its marks dropped since a tooltip draws none.
                      title={`${l.label}. ${tr(locale, l.title).replace(/[{}[\]]/g, "")}`}
                      style={{
                        width: 28, height: 10, borderRadius: 999,
                        background: past ? "var(--accent)" : "color-mix(in srgb, var(--ink) 10%, transparent)",
                        boxShadow: here ? "0 0 0 3px var(--accent-soft)" : undefined,
                      }}
                    >
                      <span className="sr-only">{l.label}. <LessonText text={l.title} locale={locale} />: {past ? t("Done") : t("Ahead")}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {lesson.teaches.length > 0
                ? <StatTile value={lesson.teaches.length} label={t("new to say")} tone="accent" />
                : <StatTile value={wordsUsed(lesson)} label={t("words put to use")} tone="accent" />}
              <StatTile value={lesson.conversation.filter((l) => l.et).length} label={t("lines heard")} tone="accent" />
              {score
                ? <StatTile value={`${score.right}/${score.total}`} label={t("right first time")} tone="accent" />
                : <StatTile value={lessonLabel(lesson)} label={fill(t("{level} lesson"), { level: lesson.level })} hint={fill(t("of {total}"), { total: String(place.of) })} tone="accent" />}
            </div>

            {/* The words met, once more, out loud: the cheapest repetition there is, and the moment somebody is glad of it. */}
            {taught.length > 0 && (
              <div className="mt-4 rounded-[var(--r-xl)] border px-5 py-4" style={{ background: "var(--surface)", borderColor: "var(--edge)" }} data-lesson-words-done>
                <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>{t("Say them once more")}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {taught.slice(0, 16).map((et) => (
                    <li key={et} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5" style={{ borderColor: "var(--edge)", background: "var(--raised)" }}>
                      <Speak text={et} size={14} />
                      <span lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{et}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recorded === false && (
              <Note tone="neutral" className="mt-4">
                {t("You're reading ahead, so this one isn't ticked yet. It counts when the course reaches it.")}
              </Note>
            )}

            {/*
              THE CONVERSATION, WHERE THE LESSON HAS ONE, IS THE NEXT THING.
              A learner finished lesson 49, which says it ends in holding a
              whole conversation, and found nowhere to have it: the only link
              was a line under the last Say it card, and on a typed evening it
              was easy to scroll past. So the lesson's own scene, played with
              somebody who answers whatever is said in the words taught so far
              (`lib/scenes/lessonScenes.ts`), is a card of its own here. Once,
              and not once it has been had.
            */}
            {scene && !conversationDone && (
              <div className="mt-6 rounded-[var(--r-xl)] border px-5 py-5 text-left" style={{ background: "var(--accent-soft)", borderColor: "var(--edge)" }} data-lesson-scene-done={scene}>
                <p className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>{t("Now have the conversation")}</p>
                <p className="mt-1 max-w-[56ch] text-base" style={{ color: "var(--ink-2)" }}>
                  {t("Somebody speaks first and answers whatever you say, in the words you've learned. Type or say your lines. Nothing is graded, and you can't get it wrong by saying it your own way.")}
                </p>
                <div className="mt-4">
                  <ButtonLink href={capstone ? lessonSceneHref(scene, focus) : `/situations/${scene}`} variant={(focus && moduleNext) || (check && !check.passed) ? "secondary" : "primary"}>
                    {t("Have the conversation")} <ArrowRight size={15} aria-hidden />
                  </ButtonLink>
                </div>
              </div>
            )}
            {/*
              A WORKSHEET PAGE ON WHAT THE LESSONS HAVE TAUGHT, FROM B1 ON.
              B1 dealt the worksheet while it was built from units, and lost
              it when every evening became one lesson. It is offered here, in
              the module as well, since it is grammar practice on tonight's
              words rather than a way out of the evening; the page is held to
              what the lessons have taught so far (`lessonWorksheet.ts`).
            */}
            {worksheet && (
              <div className="mt-4 rounded-[var(--r-xl)] border px-5 py-4 text-left" style={{ background: "var(--surface)", borderColor: "var(--edge)" }} data-lesson-worksheet={worksheet.theme ?? "any"}>
                <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  <span lang="et">{WORKBOOK_NAME.et}</span> ({t(WORKBOOK_NAME.en)})
                </p>
                <p className="mt-1 max-w-[56ch] text-base" style={{ color: "var(--ink-2)" }}>
                  {t("A page of sentences, each with a word to put in the form it needs. Only words you've learned so far.")}
                </p>
                <div className="mt-3"><ButtonLink href={worksheetLink(worksheet)}>{t("Fill in a page")} <ArrowRight size={15} aria-hidden /></ButtonLink></div>
              </div>
            )}
            {/*
              AND ONE STEP FURTHER OUT, WHERE THE LESSON REHEARSES AN ERRAND
              (B1 on, `lessonSituations.ts`): the same situation with somebody
              who talks the way people do at that counter, in Situations. Not
              inside a module, where the one way on is the next step and every
              other door stands down; the situations board and Today count it
              as reached from this lesson on, so it is there to open later.
            */}
            {situation && !focus && (
              <div className="mt-4 rounded-[var(--r-xl)] border px-5 py-4 text-left" style={{ background: "var(--surface)", borderColor: "var(--edge)" }} data-lesson-situation={situation.id}>
                <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>{t("Try it out there")}</p>
                <p className="mt-1 max-w-[56ch] text-base" style={{ color: "var(--ink-2)" }}>
                  {fill(t("The same kind of moment, with somebody who talks the way people really do: {title}."), { title: t(situation.title) })}
                </p>
                <div className="mt-3"><ButtonLink href={`/situations/${situation.id}`}>{t("Open the conversation")} <ArrowRight size={15} aria-hidden /></ButtonLink></div>
              </div>
            )}
            {/*
              WHAT MAKES TODAY'S WORDS STAY IS GOING OVER THEM AGAIN. A learner
              went through all 49 lessons without opening Review once, because
              nothing on this screen said to. Where cards are due, it says so.
            */}
            {due > 0 && (
              <div className="mt-4 rounded-[var(--r-xl)] border px-5 py-4 text-left" style={{ background: "var(--surface)", borderColor: "var(--edge)" }} data-lesson-due={due}>
                <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  {fill(t(due === 1 ? "{n} card is waiting in your reviews." : "{n} cards are waiting in your reviews."), { n: due })}
                </p>
                <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
                  {t("A few minutes on them now is what makes today's words stick.")}
                </p>
                <div className="mt-3"><ButtonLink href="/review">{t("Review them")} <ArrowRight size={15} aria-hidden /></ButtonLink></div>
              </div>
            )}
            {/* The last lesson of a part: the check that closes it, which opens the next part. */}
            {check && !check.passed && (
              <div className="mt-4 rounded-[var(--r-xl)] border px-5 py-4 text-left" style={{ background: "var(--butter-soft)", borderColor: "var(--edge)" }} data-lesson-check={check.id}>
                <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  {check.final ? fill(t("That's the last {level} lesson. Next: the {level} check."), { level: lesson.level }) : t("That's the end of this part. Next: a short check.")}
                </p>
                <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
                  {check.final
                    ? fill(t("Questions on everything {level} taught. Pass it to open {next}."), { level: lesson.level, next: LEVELS[levelIndex(lesson.level) + 1] ?? lesson.level })
                    : t("Questions on what this part taught. Pass it to open the next part.")}
                </p>
                <div className="mt-3"><ButtonLink href={`/course/check/${check.id}`} variant="primary">{t("Take the check")} <ArrowRight size={15} aria-hidden /></ButtonLink></div>
              </div>
            )}
            {/* On the screen from the start and empty, so the failure is read when it arrives. */}
            <p className="sr-only" role="status">{saved === false && !saving ? t(saveError) : ""}</p>
            {/* Mounted through the retry, with its button busy, so the caret a keyboard pressed it with stays on it. */}
            {saved === false && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <p className="text-base" style={{ color: "var(--again-ink)" }} aria-hidden>{t(saveError)}</p>
                <Button variant="secondary" size="sm" busy={saving} onClick={() => { retried.current = true; save(); }}>{t("Try again")}</Button>
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {focus && moduleNext ? (
                moduleNext
              ) : (
                <>
                  <ButtonLink href="/course/lessons">{t("All lessons")}</ButtonLink>
                  {next && (
                    <ButtonLink variant={(scene && !conversationDone) || (check && !check.passed) ? "secondary" : "primary"} href={`/course/lessons/${next.id}`}>
                      {t("Next:")} <LessonText text={next.title} locale={locale} /> <ArrowRight size={15} aria-hidden />
                    </ButtonLink>
                  )}
                </>
              )}
            </div>
          </section>
        </Stack>
      </Page>
    );
  }

  return (
    <Page eyebrow={eyebrow} title={t(lesson.title)} titleLang={lessonTextLang(lesson.title, locale)} lead={t(lesson.goal)} leadLang={lessonTextLang(lesson.goal, locale)}>
      <Stack>
        {/*
          THE STEPS (SIX, OR SEVEN ON A WRITING EVENING), AND THE WAY BACK TO ANY OF THEM. A step already
          reached is a button, so somebody halfway through Practice who wants
          the table again presses How it works rather than Back three times;
          a step ahead is drawn and not pressable, since skipping is what the
          button at the foot is for and says so.
        */}
        {/*
          WHAT IS NEW AT THIS LEVEL, ON ITS FIRST LESSON AND ITS FIRST STEP
          (`levelNew.ts`): the step up explained where it happens, once.
        */}
        {news && at === 0 && (
          <section aria-labelledby="level-new" className="rounded-[var(--r-xl)] border px-5 py-4" style={{ background: "var(--accent-soft)", borderColor: "var(--edge)" }} data-level-new={lesson.level}>
            <h2 id="level-new" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{fill(t("What's new at {level}"), { level: lesson.level })}</h2>
            <p className="mt-1 max-w-[62ch] text-base" style={{ color: "var(--ink-2)" }}>{t(news.lead)}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {news.items.map((item) => (
                <li key={item.what} className="flex items-start gap-2 text-base">
                  <Check size={16} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--accent-deep)" }} />
                  <span><span className="font-semibold" style={{ color: "var(--ink)" }}>{t(item.what)}</span>{" "}<span style={{ color: "var(--ink-2)" }}>{t(item.why)}</span></span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <nav aria-label={t("Today's steps")}>
          {/* A step is done where it was finished, not where the foot's "Skip this step" passed it. */}
          <div data-lesson-steps>
            <StepPills
              pills={steps.map((s, i) => {
                const reachedIt = i < at || i <= reached;
                const finishedIt = s === "listen" ? heard : ASKS.has(s) ? finished.has(s) || (s === "review" && review.length === 0) : reachedIt && i !== at;
                const state = i === at ? "here" : finishedIt ? "done" : reachedIt ? "visited" : "ahead";
                return { key: s, state, label: fill("{n}. {step}", { n: String(i + 1), step: t(titleOf(s)) }), onPress: () => go(i) };
              })}
            />
          </div>
        </nav>

        <section aria-labelledby="lesson-step">
          <h2 id="lesson-step" ref={heading} tabIndex={-1} className="mb-4 text-xl font-bold scroll-mt-24" style={{ color: "var(--ink)" }}>
            {fill(t("Step {n} of {total}: {step}"), { n: String(at + 1), total: String(steps.length), step: t(titleOf(step)) })}
          </h2>
          {step === "listen" && <Listen lesson={lesson} read={read} heard={heard} heardOnReload={heardOnReload} onHeard={() => setHeard(true)} />}
          {step === "words" && <Words lesson={lesson} />}
          {step === "how" && <How lesson={lesson} />}
          {kept("practise") && <div hidden={step !== "practise"}><Quiz key="practise" level={3} items={practice} onFinished={(result) => { setScore((first) => first ?? result); finish("practise"); }} /></div>}
          {step === "write" && lesson.write && <WriteStep lesson={lesson} onDone={() => { finish("write"); go(at + 1); }} />}
          {step === "say" && <SayIt lesson={lesson} timeMultiplier={timeMultiplier} partAt={partAt} scene={scene} sceneHref={scene ? lessonSceneHref(scene, focus) : null} capstone={capstone} name={name} onComplete={() => finish("say")} place={sayPlace.current} onPlace={keepSayPlace} />}
          {kept("review") && (review.length > 0
            ? <div hidden={step !== "review"}><Quiz key="review" level={3} items={review} review onFinished={() => finish("review")} /></div>
            : step === "review" && (
              <Card>
                <p className="text-base" style={{ color: "var(--ink-2)" }}>
                  {t("This is your first lesson, so there's nothing older to go over yet. From the next one, this is where earlier words come back.")}
                </p>
              </Card>
            ))}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {at > 0 ? (
            <Button variant="ghost" onClick={() => go(at - 1)}>
              <ArrowLeft size={15} aria-hidden /> {t("Back")}
            </Button>
          ) : <span />}
          {/*
            ON A CAPSTONE WITH A CONVERSATION OF ITS OWN, THE CONVERSATION IS
            THE FINALE. Once the scripted turns are held, "Have the
            conversation" in the step above is the loud button, so finishing
            here is the quiet choice and says what it skips: one primary per
            screen, and it is the one the part was building to.
          */}
          {capstone && scene && step === "say" && done ? (
            <Button variant="secondary" onClick={() => go(at + 1)}>
              {t("Finish without it")} <ArrowRight size={15} aria-hidden />
            </Button>
          ) : (
            <Button variant={done ? "primary" : "secondary"} onClick={() => go(at + 1)}>
              {done ? (at === steps.length - 1 ? t("Finish the lesson") : t("Continue")) : t("Skip this step")} <ArrowRight size={15} aria-hidden />
            </Button>
          )}
        </div>
      </Stack>
    </Page>
  );
}

/**
 * How many different words today's conversation used. The figure for an
 * evening that teaches nothing new (a check-in, the end of a part), where
 * "0 new to say" would be the first thing on the finish screen.
 */
function wordsUsed(lesson: LessonSpec): number {
  const words = new Set<string>();
  for (const line of lesson.conversation) {
    for (const w of (line.et ?? "").toLocaleLowerCase("et").split(/[^\p{L}]+/u)) if (w) words.add(w);
  }
  return words.size;
}

/** Step 1: the conversation, in the cast's voices, with the English under each line. */
function Listen({ lesson, read, heard, heardOnReload, onHeard }: { lesson: LessonSpec; read: readonly (readonly GlossedToken[])[] | null; heard: boolean; heardOnReload: boolean; onHeard: () => void }) {
  const t = useT();
  const [english, setEnglish] = useState(true);
  /* Pressing "Read it" replaces the card the button was on, so the caret goes
     to the line saying what is on screen now rather than to the page. Only on
     that change: a lesson read from the start has nothing to hand over. */
  const leadRef = useRef<HTMLParagraphElement>(null);
  const wasHeard = useRef(heard);
  useEffect(() => {
    // Only a listen heard on this screen hands the caret on; a reload that brings the step back already heard moves nothing.
    if (heard && !wasHeard.current && !heardOnReload) leadRef.current?.focus();
    wasHeard.current = heard;
  }, [heard, heardOnReload]);
  // B1 on, the conversation is heard before it is read (`ListenFirst`).
  if (!heard) return <ListenFirst lesson={lesson} onRead={onHeard} />;
  return (
    <div className="flex flex-col gap-6">
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p ref={leadRef} tabIndex={-1} className="text-base outline-none" style={{ color: "var(--ink-2)" }}>
          {/* At B1 the questions came first, so "nothing is asked" would be false a breath after asking. */}
          {lesson.listenFor && lesson.listenFor.length > 0
            ? t("Now read what you heard. Press a line to hear it again.")
            : t("Read it, and press a line to hear it. Nothing is asked yet.")}
        </p>
        <EnglishToggle english={english} onToggle={() => setEnglish((on) => !on)} />
      </div>
      <LessonConversation lines={lesson.conversation} cast={lesson.cast} english={english} quiet />
    </Card>
    {/* B2: a real text, after the transcript, read and never asked about (`LessonSpec.read`). */}
    {lesson.read && <ReadText text={lesson.read} tokens={read} english={english} />}
    </div>
  );
}

/** What a taught item is, in a few words, for the Words table. */
function kindOf(item: Taught, t: (english: string) => string): string | null {
  if (item.kind === "phrase") return item.et.includes(" ") ? t("phrase") : null;
  /* The omastav and the past are forms that more are built on (A2), so they say which. */
  if (item.kind === "form" && item.stem) return fill(t("omastav (2nd form) of {lemma}: the endings go on it"), { lemma: item.of });
  if (item.kind === "form" && item.past) return fill(t("lihtminevik, ma (past, I did), of {lemma}"), { lemma: item.of });
  if (item.kind === "form") return fill(t("a form of {lemma}"), { lemma: item.of });
  if (item.kind === "verb") return t("a verb: its ma-tegevusnimi (-ma) and olevik (I form)");
  return null;
}

/**
 * Neighbors that mean the same thing share a row, so the long and the short
 * form read as one word with two spellings (`mina`, `ma`) rather than as two
 * words to learn.
 */
function rowsOf(items: readonly Taught[]): Taught[][] {
  const rows: Taught[][] = [];
  for (const item of items) {
    const last = rows[rows.length - 1];
    if (last && last[0]!.en === item.en && last[0]!.kind === item.kind) last.push(item);
    else rows.push([item]);
  }
  return rows;
}

/** Step 2: everything new tonight, in one table, with nothing asked. */
function Words({ lesson }: { lesson: LessonSpec }) {
  const t = useT();
  const locale = useLocale();
  if (lesson.teaches.length === 0) {
    return (
      <Card>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {t("No new words today. Everything in this lesson is something you've already met, put together.")}
        </p>
      </Card>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[var(--r-lg)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
      <table className="w-full min-w-[320px] text-base" data-lesson-words>
        <thead>
          <tr style={{ color: "var(--ink-3)" }}>
            <th scope="col" className="label-xs px-4 py-3 text-left">{t("Estonian")}</th>
            <th scope="col" className="label-xs px-4 py-3 text-left">{t("In English")}</th>
          </tr>
        </thead>
        <tbody>
          {rowsOf(lesson.teaches).map((row) => {
            const kind = kindOf(row[0]!, t);
            return (
              <tr key={row[0]!.et} className="border-t" style={{ borderColor: "var(--edge)" }}>
                <td className="px-4 py-3 align-top">
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {row.flatMap((item) => (item.kind === "verb" ? [item.et, item.first] : [item.et])).map((et) => (
                      <span key={et} className="flex items-center gap-2">
                        <Speak text={et} size={15} />
                        <span lang="et" className="font-bold" style={{ color: "var(--ink)" }}>{et}</span>
                      </span>
                    ))}
                  </span>
                  {kind && <span className="mt-0.5 block text-sm" style={{ color: "var(--ink-3)" }}><Braced text={kind} /></span>}
                </td>
                <td className="px-4 py-3 align-top" style={{ color: "var(--ink-2)" }}>
                  <LessonText text={row[0]!.en} locale={locale} />
                  {row[0]!.kind === "verb" && (
                    <span className="mt-0.5 block"><span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{row[0]!.first}</span>: <LessonText text={row[0]!.firstEn} locale={locale} /></span>
                  )}
                  {/* B1: a verb is learned with the case it wants, so the Words table says it. */}
                  {(row[0]!.kind === "verb" || row[0]!.kind === "word") && row[0]!.asks && (
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }} data-asks>
                      <LessonText text={row[0]!.asks} locale={locale} />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Step 3: the one idea of the evening, shown on today's own lines. */
function How({ lesson }: { lesson: LessonSpec }) {
  const t = useT();
  const locale = useLocale();
  const { how } = lesson;
  const examples = (how.examples ?? []).map((i) => lesson.conversation[i]).filter((l) => l?.et);
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <RuleNote summary={how.point} watchOut={how.watchOut} />
      </Card>
      {how.sounds && how.sounds.length > 0 && <SoundRows rows={how.sounds} />}
      {how.notes && how.notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {how.notes.map((note) => (
            <li key={note} className="text-base leading-relaxed" style={{ color: "var(--ink)" }}><LessonText text={note} locale={locale} /></li>
          ))}
        </ul>
      )}
      {how.table && (
        <div className="overflow-x-auto rounded-[var(--r-lg)] border" style={{ borderColor: "var(--edge)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}>
          <table className="w-full min-w-[320px] text-base" data-lesson-table>
            <thead>
              <tr style={{ color: "var(--ink-3)" }}>
                {how.table.head.map((h, i) => (
                  <th key={i} scope="col" className="label-xs px-4 py-3 text-left"><LessonText text={h} locale={locale} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {how.table.rows.map((row, r) => (
                <tr key={r} className="border-t" style={{ borderColor: "var(--edge)" }}>
                  {row.map((cell, c) => (
                    <td key={c} className="px-4 py-3 align-top">
                      {"et" in cell
                        ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Speak text={cell.et} size={14} />
                            <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{cell.et}</span>
                          </span>
                        )
                        : <span style={{ color: "var(--ink-2)" }}><LessonText text={cell.en} locale={locale} /></span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {how.listen && how.listen.length > 0 && (
        <section data-lesson-listen>
          <SectionTitle level={3} hint={t("said by a native speaker")}>{t("Hear the difference")}</SectionTitle>
          <div className="flex flex-col gap-3">
            {how.listen.map((set) => (
              <HearSet key={set.words.map((w) => w.clip).join("|")} words={set.words} />
            ))}
          </div>
        </section>
      )}
      {how.spell && (
        <section className="flex flex-col gap-3" data-lesson-spell>
          <SectionTitle level={3} hint={t("said by a native speaker")}>{t("Spell your name")}</SectionTitle>
          <p className="text-base" style={{ color: "var(--ink-2)" }}>
            {t("Letters have Estonian names. Type your name and hear it spelled the way you'll say it.")}{" "}
            <Link href="/grammar/sounds#alphabet" className="font-semibold underline" style={{ color: "var(--accent-deep)" }}>{t("The whole alphabet")}</Link>
          </p>
          <SpellIt />
        </section>
      )}
      {examples.length > 0 && (
        <section>
          <SectionTitle level={3} hint={t("from today's conversation")}>{t("Where you heard it")}</SectionTitle>
          <ul className="flex flex-col gap-3">
            {examples.map((line, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <Speak text={line!.et!} voice={lesson.cast[line!.who]} native={line!.who === nativePart(lesson.conversation)} size={15} />
                  <span lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{line!.et}</span>
                </span>
                <span className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line!.en ?? ""} locale={locale} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
