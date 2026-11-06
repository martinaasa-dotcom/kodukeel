"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
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
import { levelNewsFor, type LevelNews } from "@/lib/course/lessons/levelNew";
import { finishScreens, howExamples, screensOf, type FinishScreen, type LessonScreen } from "@/lib/course/lessons/screens";
import { Quiz } from "./Quiz";
import { SayIt, type SayPlace } from "./SayIt";
import { lessonSceneHref, type ConversationReturn } from "@/lib/scenes/lessonReturn";
import { nameOf } from "@/lib/ux/roundNames";
import { worksheetLink, type LessonWorksheet } from "@/lib/course/lessonWorksheet";
import { ReadText } from "@/components/course/ReadText";
import { NotesTalk } from "@/components/course/NotesTalk";
import type { GlossedToken } from "@/lib/dict/glossed";
import type { VerbExample } from "@/lib/progress/verbExamples";
import { VerbTable } from "@/app/(app)/grammar/topic/[id]/VerbTable";

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

export function LessonRunner({ lesson, practice, review, next, scene, situation = null, worksheet = null, conversation, place, name, due = 0, check = null, part, timeMultiplier, partAt, read = null, notes = null, forms = [] }: {
  /**
   * The transcript of the lesson's talk taken down as notes (C1), glossed as
   * the text to read is; null where there is none, and then a talk it does
   * have is drawn plain.
   */
  notes?: readonly (readonly GlossedToken[])[] | null;
  /**
   * C1: the verbs whose past and polite command the Words step shows in a
   * table at its foot (`withLessonForms`), heard and read and never asked;
   * empty on every other lesson.
   */
  forms?: readonly VerbExample[];
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
  /* Which screen of the step is on (`screens.ts`): a step is a sequence of pages, one thing to do on each. */
  const [screen, setScreen] = useState(0);
  const news = levelNewsFor(lesson);
  const [finished, setFinished] = useState<ReadonlySet<Step>>(new Set());
  const [reached, setReached] = useState(0);
  const [score, setScore] = useState<{ right: number; total: number } | null>(null);
  const [over, setOver] = useState(() => conversation !== null && isCapstone(lesson));
  /* Which page of the finished lesson is on (`finishScreens`). */
  const [finishAt, setFinishAt] = useState(0);
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

  /*
    A step is pressed open on its first screen, and Back from a step's first
    screen lands on the last screen of the step before, which is where the
    learner left it.
  */
  const go = (n: number, toScreen: "first" | "last" = "first") => {
    moved.current = true;
    stopClip();
    if (n >= steps.length) {
      setOver(true);
      save();
    } else {
      setAt(n);
      setScreen(toScreen === "last" ? screensFor(steps[n]!).length - 1 : 0);
      setReached((r) => Math.max(r, n));
    }
  };
  const screensFor = (s: Step): LessonScreen[] => screensOf(s, lesson, { news: Boolean(news), heard, forms: forms.length > 0 });
  /*
    B1's conversation is heard before it is read, and that is held here rather
    than in the step: the step unmounts whenever another is pressed, and coming
    back to reread it is not a reason to have it hidden again. Until it has
    been heard (or shown on purpose), the foot of the screen offers to skip,
    so the step's own "Read it" is its one loud button.
  */
  const [heard, setHeard] = useState(() => !(lesson.listenFor && lesson.listenFor.length > 0));
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
    setScreen(place.screen);
    if (place.heard) setHeard(true);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    if (over) forgetLessonPlace(lesson.id);
    else saveLessonPlace(lesson.id, steps, { at, reached, finished: [...finished], heard, screen });
  }, [lesson.id, steps, at, reached, finished, heard, over, screen]);
  const screens = screensFor(step);
  const si = Math.min(screen, screens.length - 1);
  const current = screens[si]!;
  /* Hearing it first is the one screen of an asking-nothing step that is not done by being open. */
  const done = current === "hear" ? false : !ASKS.has(step) || finished.has(step) || (step === "review" && review.length === 0);
  /* Continue walks the step's screens and then the steps; Back walks them the other way. */
  const forward = () => {
    if (si < screens.length - 1) {
      moved.current = true;
      stopClip();
      setScreen(si + 1);
    } else go(at + 1);
  };
  const backward = () => {
    if (si > 0) {
      moved.current = true;
      stopClip();
      setScreen(si - 1);
    } else if (at > 0) go(at - 1, "last");
  };
  /*
    Pressing on hands the caret to what is now on the screen and brings the
    step to the top of the window, since a screen is taller than a phone.
    Within a step the caret goes to the new screen's own heading, which says
    what this page is for; opening a step, it goes to the step's heading.
    Hearing the conversation replaces its screen with the next one, which is
    the same move; a reload that brings a lesson back moves nothing.
  */
  const screenRef = useRef<HTMLDivElement>(null);
  const lastStep = useRef(at);
  useEffect(() => {
    if (!moved.current) return;
    const sameStep = lastStep.current === at && !over;
    lastStep.current = at;
    const own = sameStep ? screenRef.current?.querySelector<HTMLElement>("h3") : null;
    const target = own ?? heading.current;
    if (own && !own.hasAttribute("tabindex")) {
      own.setAttribute("tabindex", "-1");
      own.classList.add("outline-none");
    }
    target?.focus();
    heading.current?.scrollIntoView({ block: "start" });
  }, [at, over, current, finishAt]);

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
    /*
      THE END OF A LESSON, A PAGE AT A TIME (`finishScreens`). It was one page
      holding the celebration, the words said once more, the conversation, a
      worksheet, a situation out there, the cards waiting in Review, the check
      and the next lesson: eight things and seven buttons, of which a learner
      saw the confetti and the last one. Each is a page of its own now, in the
      order they matter. An offer has its one loud button and a quiet "Not
      now" that steps past it, and the way on is the last page.
    */
    const finishes = finishScreens({
      taught: taught.length,
      conversation: Boolean(scene) && !conversationDone,
      check: Boolean(check && !check.passed),
      worksheet: worksheet !== null,
      situation: situation !== null && !focus,
      due,
    });
    const fi = Math.min(finishAt, finishes.length - 1);
    const here: FinishScreen = finishes[fi]!;
    const onward = () => { moved.current = true; stopClip(); setFinishAt(fi + 1); };
    const notNow = (
      <Button variant="ghost" onClick={onward}>{t("Not now")}</Button>
    );
    /* An offer's page: its heading, a sentence and its one loud button, with "Not now" beside it. */
    const offer = (key: string, data: Record<string, string>, title: ReactNode, body: ReactNode, action: ReactNode, tone = "var(--surface)") => (
      <section key={key} aria-labelledby="lesson-finish" className="mx-auto w-full max-w-2xl rounded-[var(--r-xl)] border px-5 py-6 text-left" style={{ background: tone, borderColor: "var(--edge)" }} {...data}>
        <h2 id="lesson-finish" ref={heading} tabIndex={-1} className="font-display text-xl font-bold outline-none" style={{ color: "var(--ink)" }}>{title}</h2>
        <div className="mt-2 max-w-[56ch] text-base" style={{ color: "var(--ink-2)" }}>{body}</div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {notNow}
          {action}
        </div>
      </section>
    );
    return (
      <Page eyebrow={eyebrow} title={t(lesson.title)} titleLang={lessonTextLang(lesson.title, locale)}>
        <Stack>
          {finishes.length > 1 && (
            <p className="mx-auto flex w-full max-w-2xl items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink-3)" }} data-lesson-screen-count={`${fi + 1}/${finishes.length}`}>
              <span aria-hidden className="flex gap-1">
                {finishes.map((f, i) => (
                  <span key={f} style={{ width: 18, height: 6, borderRadius: 9999, background: i <= fi ? "var(--accent)" : "color-mix(in srgb, var(--ink) 12%, transparent)" }} />
                ))}
              </span>
              {fill(t("Page {n} of {total}"), { n: String(fi + 1), total: String(finishes.length) })}
            </p>
          )}
          {here === "done" && (
            <>
              {/*
                THE LITTLE CONFETTI PAGE. A lesson ends the way every round
                used to: a burst of confetti, the mascot cheering on the night
                panel, and the evening said back.

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
                        width: 28, height: 10, borderRadius: 9999,
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

                {recorded === false && (
                  <Note tone="neutral" className="mt-4">
                    {t("You're reading ahead, so this one isn't ticked yet. It counts when the course reaches it.")}
                  </Note>
                )}
                <div className="mt-8 flex justify-end">
                  <Button variant="primary" onClick={onward}>{t("Continue")} <ArrowRight size={15} aria-hidden /></Button>
                </div>
              </section>
            </>
          )}

          {/* The words met, once more, out loud: the cheapest repetition there is, and the moment somebody is glad of it. */}
          {here === "again" && (
            <section aria-labelledby="lesson-finish" className="mx-auto w-full max-w-2xl rounded-[var(--r-xl)] border px-5 py-6" style={{ background: "var(--surface)", borderColor: "var(--edge)" }} data-lesson-words-done>
              <h2 id="lesson-finish" ref={heading} tabIndex={-1} className="font-display text-xl font-bold outline-none" style={{ color: "var(--ink)" }}>{t("Say them once more")}</h2>
              <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>{t("Press each one, hear it, and say it after.")}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {taught.slice(0, 16).map((et) => (
                  <li key={et} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5" style={{ borderColor: "var(--edge)", background: "var(--raised)" }}>
                    <Speak text={et} size={14} />
                    <span lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{et}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end">
                <Button variant="primary" onClick={onward}>{t("Continue")} <ArrowRight size={15} aria-hidden /></Button>
              </div>
            </section>
          )}

          {/*
            THE CONVERSATION, WHERE THE LESSON HAS ONE, IS THE FIRST OFFER.
            A learner finished lesson 49, which says it ends in holding a
            whole conversation, and found nowhere to have it: the only link
            was a line under the last Say it card, and on a typed evening it
            was easy to scroll past. So the lesson's own scene, played with
            somebody who answers whatever is said in the words taught so far
            (`lib/scenes/lessonScenes.ts`), is a page of its own. Once, and
            not once it has been had.
          */}
          {here === "conversation" && scene && offer(
            "conversation", { "data-lesson-scene-done": scene },
            t("Now have the conversation"),
            t("Somebody speaks first and answers whatever you say, in the words you've learned. Type or say your lines. Nothing is graded, and you can't get it wrong by saying it your own way."),
            <ButtonLink href={capstone ? lessonSceneHref(scene, focus) : `/situations/${scene}`} variant="primary">
              {t("Have the conversation")} <ArrowRight size={15} aria-hidden />
            </ButtonLink>,
            "var(--accent-soft)",
          )}
          {/* The last lesson of a part: the check that closes it, which opens the next part. */}
          {here === "check" && check && offer(
            "check", { "data-lesson-check": check.id },
            check.final ? fill(t("That's the last {level} lesson. Next: the {level} check."), { level: lesson.level }) : t("That's the end of this part. Next: a short check."),
            check.final
              ? fill(t("Questions on everything {level} taught. Pass it to open {next}."), { level: lesson.level, next: LEVELS[levelIndex(lesson.level) + 1] ?? lesson.level })
              : t("Questions on what this part taught. Pass it to open the next part."),
            <ButtonLink href={`/course/check/${check.id}`} variant="primary">{t("Take the check")} <ArrowRight size={15} aria-hidden /></ButtonLink>,
            "var(--butter-soft)",
          )}
          {/*
            A WORKSHEET PAGE ON WHAT THE LESSONS HAVE TAUGHT, FROM B1 ON.
            B1 dealt the worksheet while it was built from units, and lost
            it when every evening became one lesson. It is offered here, in
            the module as well, since it is grammar practice on today's
            words rather than a way out of the evening; the page is held to
            what the lessons have taught so far (`lessonWorksheet.ts`).
          */}
          {here === "worksheet" && worksheet && offer(
            "worksheet", { "data-lesson-worksheet": worksheet.theme ?? "any" },
            <><span lang="et">{WORKBOOK_NAME.et}</span> ({t(WORKBOOK_NAME.en)})</>,
            t("A page of sentences, each with a word to put in the form it needs. Only words you've learned so far."),
            <ButtonLink href={worksheetLink(worksheet)} variant="primary">{t("Fill in a page")} <ArrowRight size={15} aria-hidden /></ButtonLink>,
          )}
          {/*
            AND ONE STEP FURTHER OUT, WHERE THE LESSON REHEARSES AN ERRAND
            (B1 on, `lessonSituations.ts`): the same situation with somebody
            who talks the way people do at that counter, in Situations. Not
            inside a module, where the one way on is the next step and every
            other door stands down; the situations board and Today count it
            as reached from this lesson on, so it is there to open later.
          */}
          {here === "situation" && situation && offer(
            "situation", { "data-lesson-situation": situation.id },
            t("Try it out there"),
            fill(t("The same kind of moment, with somebody who talks the way people really do: {title}."), { title: t(situation.title) }),
            <ButtonLink href={`/situations/${situation.id}`} variant="primary">{t("Open the conversation")} <ArrowRight size={15} aria-hidden /></ButtonLink>,
          )}
          {/*
            WHAT MAKES TODAY'S WORDS STAY IS GOING OVER THEM AGAIN. A learner
            went through all 49 lessons without opening Review once, because
            nothing on this screen said to. Where cards are due, it says so.
          */}
          {here === "review" && offer(
            "review", { "data-lesson-due": String(due) },
            fill(t(due === 1 ? "{n} card is waiting in your reviews." : "{n} cards are waiting in your reviews."), { n: due }),
            t("A few minutes on them now is what makes today's words stick."),
            <ButtonLink href="/review" variant="primary">{t("Review them")} <ArrowRight size={15} aria-hidden /></ButtonLink>,
          )}

          {/* The way on, last and alone. */}
          {here === "next" && (
            <section aria-labelledby="lesson-finish" className="mx-auto w-full max-w-2xl rounded-[var(--r-xl)] border px-5 py-6" style={{ background: "var(--surface)", borderColor: "var(--edge)" }} data-lesson-next>
              <h2 id="lesson-finish" ref={heading} tabIndex={-1} className="font-display text-xl font-bold outline-none" style={{ color: "var(--ink)" }}>{t("Up next")}</h2>
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                {focus && moduleNext ? (
                  moduleNext
                ) : (
                  <>
                    <ButtonLink href="/course/lessons" variant={next ? "ghost" : "primary"}>{t("All lessons")}</ButtonLink>
                    {next && (
                      <ButtonLink variant="primary" href={`/course/lessons/${next.id}`}>
                        {t("Next:")} <LessonText text={next.title} locale={locale} /> <ArrowRight size={15} aria-hidden />
                      </ButtonLink>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* On the screen from the start and empty, so the failure is read when it arrives. */}
          <p className="sr-only" role="status">{saved === false && !saving ? t(saveError) : ""}</p>
          {/* Mounted through the retry, with its button busy, so the caret a keyboard pressed it with stays on it. */}
          {saved === false && (
            <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-3">
              <p className="text-base" style={{ color: "var(--again-ink)" }} aria-hidden>{t(saveError)}</p>
              <Button variant="secondary" size="sm" busy={saving} onClick={() => { retried.current = true; save(); }}>{t("Try again")}</Button>
            </div>
          )}
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
          {/*
            HOW FAR THROUGH THE STEP, where it has more than one page: a page
            that ends with more to come says so, so Continue is not a surprise
            and the last page is not mistaken for the whole step.
          */}
          {screens.length > 1 && (
            <p className="-mt-2 mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink-3)" }} data-lesson-screen-count={`${si + 1}/${screens.length}`}>
              <span aria-hidden className="flex gap-1">
                {screens.map((sc, i) => (
                  <span key={sc} style={{ width: 18, height: 6, borderRadius: 9999, background: i <= si ? "var(--accent)" : "color-mix(in srgb, var(--ink) 12%, transparent)" }} />
                ))}
              </span>
              {fill(t("Page {n} of {total}"), { n: String(si + 1), total: String(screens.length) })}
            </p>
          )}
          <div ref={screenRef} data-lesson-screen={current}>
          {step === "listen" && <Listen lesson={lesson} screen={current} news={news} read={read} notes={notes} onHeard={() => { moved.current = true; setHeard(true); }} />}
          {step === "words" && <Words lesson={lesson} forms={forms} screen={current} />}
          {step === "how" && <How lesson={lesson} screen={current} />}
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
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {at > 0 || si > 0 ? (
            <Button variant="ghost" onClick={backward}>
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
            <Button variant="secondary" onClick={forward}>
              {t("Finish without it")} <ArrowRight size={15} aria-hidden />
            </Button>
          ) : (
            <Button variant={done ? "primary" : "secondary"} onClick={done ? forward : () => go(at + 1)}>
              {done ? (at === steps.length - 1 && si === screens.length - 1 ? t("Finish the lesson") : t("Continue")) : t("Skip this step")} <ArrowRight size={15} aria-hidden />
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

/**
 * A screen's own heading: what this page is for, in a few words. A screen whose
 * component already says what it is (the text to read, the talk to take notes
 * on, the sounds) draws its own and takes none here.
 */
function ScreenTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return <SectionTitle level={3} hint={hint}>{children}</SectionTitle>;
}

/**
 * Step 1, a page at a time (`screensOf`): what is new at this level where the
 * level starts, the conversation heard before it is read (B1 on), the
 * conversation to read, the talk taken down as notes (C1), and the text to
 * read (B2 on). Each was a block on one long page, and the text under the
 * conversation was read as more of the same and scrolled past.
 */
function Listen({ lesson, screen, news, read, notes, onHeard }: {
  lesson: LessonSpec; screen: LessonScreen; news: LevelNews | null;
  read: readonly (readonly GlossedToken[])[] | null; notes: readonly (readonly GlossedToken[])[] | null;
  onHeard: () => void;
}) {
  const t = useT();
  const [english, setEnglish] = useState(true);
  /*
    The text to read holds the questions answered about it, so once shown it
    stays mounted, hidden, while another page of the step is on: Back to the
    conversation and on again does not start it over. The talk taken down as
    notes is not kept that way, since it plays its lines one after another and
    only unmounting stops them (`a-hidden-step-holds-no-microphone.ts`); it
    keeps its notes and answers on the device instead (`loadLessonNotes`).
  */
  const [shown, setShown] = useState<ReadonlySet<LessonScreen>>(() => new Set());
  useEffect(() => {
    setShown((prev) => (prev.has(screen) ? prev : new Set(prev).add(screen)));
  }, [screen]);
  const kept = (s: LessonScreen) => screen === s || shown.has(s);
  const toggle = <EnglishToggle english={english} onToggle={() => setEnglish((on) => !on)} />;

  if (screen === "news" && news) return <LevelNewsScreen level={lesson.level} news={news} />;
  // B1 on, the conversation is heard before it is read (`ListenFirst`).
  if (screen === "hear") {
    return (
      <div data-lesson-hear>
        <ScreenTitle>{t("Hear it first")}</ScreenTitle>
        <ListenFirst lesson={lesson} onRead={onHeard} />
      </div>
    );
  }
  return (
    <>
      {screen === "conversation" && (
        <div>
          <ScreenTitle>{lesson.listenFor && lesson.listenFor.length > 0 ? t("Read what you heard") : t("The conversation")}</ScreenTitle>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-base" style={{ color: "var(--ink-2)" }}>
                {/* At B1 the questions came first, so "nothing is asked" would be false a breath after asking. */}
                {lesson.listenFor && lesson.listenFor.length > 0
                  ? t("Now read what you heard. Press a line to hear it again.")
                  : t("Read it, and press a line to hear it. Nothing is asked yet.")}
              </p>
              {toggle}
            </div>
            {lesson.conversation.some((l) => l.et)
              ? <LessonConversation lines={lesson.conversation} cast={lesson.cast} english={english} quiet />
              : null}
          </Card>
        </div>
      )}
      {/* C1: a talk taken down as notes, with no transcript until its questions are answered (`LessonSpec.notes`). */}
      {lesson.notes && screen === "notes" && (
        <div className="flex flex-col gap-3" data-lesson-notes-screen>
          <div className="flex justify-end">{toggle}</div>
          <NotesTalk lessonId={lesson.id} talk={lesson.notes} tokens={notes} voice={lesson.cast[lesson.notes.speaker]} english={english} />
        </div>
      )}
      {/* B2: a real text, read and never asked about; from C1's third part, asked about (`LessonSpec.read`). */}
      {lesson.read && kept("read") && (
        <div hidden={screen !== "read"} className="flex flex-col gap-3" data-lesson-read-screen>
          <div className="flex justify-end">{toggle}</div>
          <ReadText text={lesson.read} tokens={read} english={english} />
        </div>
      )}
    </>
  );
}

/** What is new at this level, on its first lesson: the step up said where it happens, on a page of its own. */
function LevelNewsScreen({ level, news }: { level: string; news: LevelNews }) {
  const t = useT();
  return (
    <section aria-labelledby="level-new" className="rounded-[var(--r-xl)] border px-5 py-4" style={{ background: "var(--accent-soft)", borderColor: "var(--edge)" }} data-level-new={level}>
      <h3 id="level-new" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{fill(t("What's new at {level}"), { level })}</h3>
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

/** Step 2: everything new today, in one table, with nothing asked; at C1, the forms table on a page of its own after it. */
function Words({ lesson, forms, screen }: { lesson: LessonSpec; forms: readonly VerbExample[]; screen: LessonScreen }) {
  const t = useT();
  if (screen === "forms" && forms.length > 0) return <FormsTable forms={forms} />;
  return (
    <div>
      <ScreenTitle hint={lesson.teaches.length > 0 ? t("press one to hear it") : undefined}>{t("The new words")}</ScreenTitle>
      <NewWords lesson={lesson} />
    </div>
  );
}

/**
 * THE FORMS QUEUE, AT THE FOOT OF A C1 LESSON'S WORDS STEP (docs/43-lessons.md
 * §15.9, C1-8). Twelve verbs the lessons taught, their past and their polite
 * command, which are learned verb by verb: heard and read, never asked, every
 * form off the dictionary (`VerbTable`, the table the past-forms step drew).
 */
function FormsTable({ forms }: { forms: readonly VerbExample[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <section data-lesson-forms>
      <SectionTitle level={3} hint={t("the ones you've met")}>{t("The past of your verbs")}</SectionTitle>
      <p className="mb-3 text-base" style={{ color: "var(--ink-2)" }}>
        {t("Each one makes its past and its polite command its own way. Listen and read them; nothing here is asked.")}
      </p>
      <VerbTable verbs={forms} show="forms" locale={locale} />
    </section>
  );
}

/** The lesson's own new words, in one table. */
function NewWords({ lesson }: { lesson: LessonSpec }) {
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

/**
 * Step 3: the one idea of the evening, shown on today's own lines, a page at a
 * time (`screensOf`): the idea itself with its notes and its table, the sounds,
 * the pairs to hear apart, spelling your name, and where the idea was in
 * today's conversation.
 */
function How({ lesson, screen }: { lesson: LessonSpec; screen: LessonScreen }) {
  const t = useT();
  const locale = useLocale();
  const { how } = lesson;
  const examples = howExamples(lesson).map((i) => lesson.conversation[i]!);
  if (screen === "sounds" && how.sounds && how.sounds.length > 0) return <SoundRows rows={how.sounds} />;
  if (screen === "pairs" && how.listen && how.listen.length > 0) {
    return (
      <section data-lesson-listen>
        <ScreenTitle hint={t("said by a native speaker")}>{t("Hear the difference")}</ScreenTitle>
        <div className="flex flex-col gap-3">
          {how.listen.map((set) => (
            <HearSet key={set.words.map((w) => w.clip).join("|")} words={set.words} />
          ))}
        </div>
      </section>
    );
  }
  if (screen === "spell" && how.spell) {
    return (
      <section className="flex flex-col gap-3" data-lesson-spell>
        <ScreenTitle hint={t("said by a native speaker")}>{t("Spell your name")}</ScreenTitle>
        <p className="text-base" style={{ color: "var(--ink-2)" }}>
          {t("Letters have Estonian names. Type your name and hear it spelled the way you'll say it.")}{" "}
          <Link href="/grammar/sounds#alphabet" className="font-semibold underline" style={{ color: "var(--accent-deep)" }}>{t("The whole alphabet")}</Link>
        </p>
        <SpellIt />
      </section>
    );
  }
  if (screen === "examples" && examples.length > 0) {
    return (
      <section>
        <ScreenTitle hint={t("from today's conversation")}>{t("Where you heard it")}</ScreenTitle>
        <ul className="flex flex-col gap-3">
          {examples.map((line, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <Speak text={line.et!} voice={lesson.cast[line.who]} native={line.who === nativePart(lesson.conversation)} size={15} />
                <span lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{line.et}</span>
              </span>
              <span className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line.en ?? ""} locale={locale} /></span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <div>
    <ScreenTitle>{t("The idea")}</ScreenTitle>
    <div className="flex flex-col gap-6">
      <Card>
        <RuleNote summary={how.point} watchOut={how.watchOut} />
      </Card>
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
    </div>
    </div>
  );
}
