"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Keyboard, Mic } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { nativePart } from "@/lib/audio/native";
import { MicButton } from "@/components/speech/MicButton";
import { ReadAloud } from "@/components/speech/ReadAloud";
import { useSpeech, useSpeechConfig } from "@/components/speech/useSpeech";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, Note, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
// The marker and the tokenizer by their own modules, never the barrel, which
// imports every lesson the course has into this one lesson's browser bundle.
import { NOTES, markOwnAnswer, normalisePhrase, type TypedMark } from "@/lib/course/lessons/practice";
import { hasStandIn, personal } from "@/lib/course/lessons/ownAnswer";
import { wordsOf } from "@/lib/course/lessons/ledger";
import { otherSideOf } from "@/lib/course/lessons/otherSide";
import type { LessonSpec, Prompt } from "@/lib/course/lessons/types";
import { VERDICT_CLASS } from "@/lib/ux/verdict";
import { checkLessonSentence } from "@/app/actions";
import { SentenceFindings } from "@/components/course/SentenceFindings";
import { SayAlongFade, type FadeKept } from "@/components/course/SayAlongFade";
import { RetellIt, type RetellKept } from "@/components/course/RetellIt";
import { AgainFaster, type FasterKept } from "@/components/course/AgainFaster";
import { useKeep } from "@/components/course/useKeep";
import { saysItLonger } from "@/lib/course/lessons/limits";
import type { Finding } from "@/lib/course/lessons/sentenceCheck";

/**
 * SAY IT: THE HEADLINE OF THE EVENING, AND OPTIONAL (docs/43-lessons.md §2).
 *
 * Three parts. Say today's conversation along with the screen, the words
 * lighting as they are heard (`ReadAloud`). Answer questions about yourself
 * out loud. And on a check-in or a part's last lesson, a short role-play with
 * somebody who speaks first.
 *
 * OPTIONAL MEANS ONE PRESS AND NO PENALTY. Two buttons of the same size open
 * the step, "Say it" and "Type it instead today", and typing runs the same
 * questions with the keyboard. Saying the conversation along has no typed
 * version, because copying out lines you can see is not practice of anything,
 * so a typed evening goes straight to the questions. The choice lasts the
 * evening.
 *
 * NOTHING IS GRADED, AND THE SOUNDS ARE NEVER JUDGED (ADR-018, ADR-028).
 * What was heard goes in the box for the learner to read and change, and Check
 * compares it with one way to say it (`AnswerCard` says how far). Many of
 * these answers are the learner's own, their name and their country, so a
 * different answer is never called wrong, and nothing reaches the review log.
 * Words light up when they are understood, and an unlit word is only unlit.
 *
 * ON A CHECK-IN IT IS THE CAPSTONE, AND LOOKS LIKE ONE. A check-in teaches
 * nothing new, so what it asks is the whole conversation with the learner in
 * it: only the role-play turns, one after another, each added to a thread
 * above the next, so the learner sees a conversation building from their own
 * answers rather than five unrelated cards. It was the same cards as the
 * questions about yourself, labeled in small type, and a learner went through
 * the whole evening without noticing there had been a conversation.
 *
 * AND WHERE THE LESSON HAS A CONVERSATION OF ITS OWN, THE END OFFERS IT
 * (`lib/scenes/lessonScenes.ts`). The role-play above is a script with one
 * way to say each turn; the scene is the same situation with somebody who
 * answers whatever was said, held to the words this lesson has taught. It is
 * offered after the step is done rather than inside it, because a link out
 * of the middle of the step is a way of not finishing it.
 */
type Mode = "say" | "type";

type SayCard =
  | { readonly kind: "lines" }
  /* B1 on: the key lines said along and then alone, a story retold, and one answer said faster. */
  | { readonly kind: "fade" }
  | { readonly kind: "retell" }
  | { readonly kind: "faster" }
  | {
    readonly kind: "answer"; readonly prompt: Prompt; readonly label: string; readonly scene?: string; readonly aboutYou: boolean;
    /** Which list the card came from and where, so the server can find its sample (`checkLessonSentence`). */
    readonly which: "answers" | "turns"; readonly index: number;
  };

/**
 * One turn already taken: what they said, and what the learner answered, or
 * the model line where they asked to be shown one with nothing in the box.
 * The thread says which, because "You answered" over a line the app wrote is
 * a small lie told at the moment the screen says they held the conversation.
 */
interface Taken {
  readonly ask: string;
  readonly said: string;
  readonly shown: boolean;
}

/**
 * WHERE THE STEP WAS, KEPT BY THE RUNNER WHILE THE STEP IS AWAY. Say it is
 * unmounted when the learner steps to another step, because that is what
 * closes its microphone and ends a story or a race still playing; what it
 * had reached is handed back when it comes back, so stepping away to reread
 * the table is not starting again. That is the way it is being done, the
 * card, the turns of a role-play, and what the learner did inside a card
 * (`kept`): the retelling in the box and how often the story was heard, the
 * goes of "Again, faster", the fade's round and line, and the words typed
 * into a question's box. What is not kept is a microphone still listening or
 * a go still on the clock, which end with the step.
 */
export interface SayPlace {
  readonly mode: "say" | "type" | null;
  readonly at: number;
  readonly over: boolean;
  readonly taken: readonly { readonly ask: string; readonly said: string; readonly shown: boolean }[];
  readonly kept: CardsKept;
}

/** What each card had done, by card: one of each B1 card, and an answer's text by its place in its list. */
export interface CardsKept {
  readonly retell?: RetellKept;
  readonly faster?: FasterKept;
  readonly fade?: FadeKept;
  readonly answers?: Readonly<Record<string, string>>;
}

/** The key an answer card's text is kept under: which list it came from, and where in it. */
export const answerKey = (card: { readonly which: "answers" | "turns"; readonly index: number }) => `${card.which}:${card.index}`;

export function SayIt({ lesson, scene, sceneHref, capstone, name, timeMultiplier, partAt, onComplete, place, onPlace }: { lesson: LessonSpec; scene: string | null; sceneHref: string | null; capstone: boolean; name: string | null; timeMultiplier: number; partAt: number; onComplete: () => void; place: SayPlace | null; onPlace: (place: SayPlace) => void }) {
  const t = useT();
  const [mode, setMode] = useState<Mode | null>(place?.mode ?? null);
  const [at, setAt] = useState(place?.at ?? 0);
  const [over, setOver] = useState(place?.over ?? false);
  const [taken, setTaken] = useState<readonly Taken[]>(place?.taken ?? []);
  const [kept, setKept] = useState<CardsKept>(place?.kept ?? {});
  useEffect(() => { onPlace({ mode, at, over, taken, kept }); }, [mode, at, over, taken, kept, onPlace]);
  const keepRetell = useCallback((retell: RetellKept) => setKept((k) => ({ ...k, retell })), []);
  const keepFaster = useCallback((faster: FasterKept) => setKept((k) => ({ ...k, faster })), []);
  const keepFade = useCallback((fade: FadeKept) => setKept((k) => ({ ...k, fade })), []);
  const keepAnswer = useCallback((key: string, text: string) => setKept((k) => ({ ...k, answers: { ...k.answers, [key]: text } })), []);
  /*
    Each card replaces the one whose button was just pressed, and so does the
    end. A card that put the caret somewhere of its own on arrival keeps it
    (a child's effect runs before this one); otherwise the card takes it, so
    a keyboard is never left on the page between the fade, the answers, the
    story and the race.
  */
  const cardRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(at);
  /* The caret goes to the new card's heading, or the line the other side says,
     rather than to the whole column: focusing that reads the conversation so
     far over again on every turn. */
  const focusLead = () => {
    if (cardRef.current?.contains(document.activeElement)) return;
    const lead = leadRef.current?.querySelector<HTMLElement>("h2, h3, [data-their-line]") ?? cardRef.current;
    if (!lead) return;
    if (lead.tabIndex < 0 && !lead.hasAttribute("tabindex")) {
      lead.setAttribute("tabindex", "-1");
      lead.classList.add("outline-none");
    }
    lead.focus();
  };
  useEffect(() => {
    if (shownAt.current === at) return;
    shownAt.current = at;
    focusLead();
  }, [at]);
  useEffect(() => {
    if (over) doneRef.current?.focus();
  }, [over]);
  // Choosing to say or type replaces the two buttons, so the caret goes to the first card rather than the page.
  useEffect(() => {
    if (mode !== null) focusLead();
  }, [mode]);
  /*
    The other side (`otherSideOf`): the role-play is with the person it names,
    and every one of its turns is in their voice; a question about yourself is
    asked by whoever says it in the conversation, never the learner's stand-in.
  */
  const side = useMemo(() => otherSideOf(lesson), [lesson]);
  const opener = side.partner ?? "";
  const voice = side.voiceOf(side.partner);
  const voiceOfAsk = (card: Extract<SayCard, { kind: "answer" }>) =>
    card.which === "turns" ? voice : card.prompt.ask ? side.voiceOf(side.askerOf(card.prompt.ask.et)) : undefined;

  const speechConfig = useSpeechConfig();
  const cards = useMemo<SayCard[]>(() => {
    const answers = lesson.answers.map((prompt, i): SayCard => ({
      kind: "answer", prompt, label: fill(t("About you, {n} of {total}"), { n: String(i + 1), total: String(lesson.answers.length) }), aboutYou: true,
      which: "answers", index: i,
    }));
    const turns = (lesson.roleplay?.turns ?? []).map((prompt, i): SayCard => ({
      kind: "answer", prompt, label: fill(t("Role-play, {n} of {total}"), { n: String(i + 1), total: String(lesson.roleplay!.turns.length) }),
      scene: i === 0 ? lesson.roleplay!.scene : undefined,
      // And one about themselves says so, since their name and country are theirs.
      aboutYou: /yourself|your own|your name|about you/i.test(prompt.cue) || hasStandIn(prompt.model.et),
      which: "turns", index: i,
    }));
    // The capstone is the conversation alone: the questions about yourself were the practice.
    if (capstone) return turns;
    /*
      FROM B1 THE STEP IS LONGER THAN ONE LINE (docs/43-lessons.md §11.2).
      Saying the conversation along becomes saying its key lines along and
      then alone, and after the questions about yourself come the story to
      retell and the answer said faster, where the lesson has them. Typed,
      the fading lines are skipped for the reason the read-along is, and the
      other two run in the box.
    */
    const b = saysItLonger(lesson.level);
    const opening: SayCard[] = mode === "say" ? [{ kind: b ? "fade" : "lines" }] : [];
    const longer: SayCard[] = [
      ...(lesson.retell ? [{ kind: "retell" } as SayCard] : []),
      ...(lesson.faster ? [{ kind: "faster" } as SayCard] : []),
    ];
    return [...opening, ...answers, ...longer, ...turns];
  }, [lesson, mode, t, capstone]);

  if (mode === null) {
    const config = speechConfig;
    const hears = config.modelBase !== null && config.unavailable === null;
    return (
      <div className="flex flex-col gap-5" data-say-it="choose">
        <p className="max-w-[60ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {capstone
            ? fill(t("This is the whole conversation, with you in it. {who} speaks first and you answer as yourself, out loud or typed, one turn at a time. Each turn is added to the conversation, so by the end you've held all of it."), { who: opener })
            : saysItLonger(lesson.level)
              // Named for what this lesson holds, the story or the race, rather than "one or the other".
              ? lesson.retell
                ? t("Say today's key lines along and then alone, answer questions about yourself, then tell a short story back in your own words.")
                : lesson.faster
                  ? t("Say today's key lines along and then alone, answer questions about yourself, then give one answer three times, faster each time.")
                  : t("Say today's key lines along and then alone, then answer questions about yourself.")
              : t("Say the conversation along with the screen, then answer a few questions about yourself out loud.")}
          {/* The lighting is promised only where this device can hear: elsewhere the lines are said aloud with nothing listening. */}
          {hears && <>{" "}{saysItLonger(lesson.level) ? t("A word lights up when it's understood.") : t("A word lights up when it's understood, even said with an accent, so play yourself back beside the recording to hear how it sounded.")}</>}
        </p>
        {/* Side by side the loud one is last in the row; stacked on a phone it leads the column. */}
        <div className="flex flex-col-reverse gap-3 sm:grid sm:grid-cols-2">
          <Button size="lg" onClick={() => setMode("type")}>
            <Keyboard size={16} aria-hidden /> {t("Type it instead today")}
          </Button>
          <Button size="lg" variant="primary" onClick={() => setMode("say")}>
            <Mic size={16} aria-hidden /> {t("Say it")}
          </Button>
        </div>
      </div>
    );
  }

  if (over) {
    return (
      <div data-say-it="done">
        <Card tone="sky">
          <p ref={doneRef} tabIndex={-1} className="text-lg font-semibold outline-none" style={{ color: "var(--ink)" }}>
            {capstone
              ? t("You held the whole conversation.")
              : mode === "say" ? t("You said today's Estonian out loud.") : t("Done. Tomorrow, try it out loud if you're somewhere you can.")}
          </p>
          {capstone && taken.length > 0 && (
            <div className="mt-4">
              <Thread taken={taken} who={opener} voice={voice} title={t("Your conversation")} />
            </div>
          )}
          {scene && sceneHref && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3" data-lesson-scene={scene}>
              <p className="max-w-[48ch] text-base" style={{ color: "var(--ink-2)" }}>
                {capstone
                  ? fill(t("That one followed a script. Now have it for real: {who} answers whatever you say, in words you've been taught."), { who: opener })
                  : t("In the role-play they answer whatever you say, in words you've been taught.")}
              </p>
              <ButtonLink href={sceneHref} variant={capstone ? "primary" : undefined}>{t("Have the conversation")} <ArrowRight size={15} aria-hidden /></ButtonLink>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const card = cards[Math.min(at, cards.length - 1)]!;
  const next = (said?: string) => {
    if (capstone && card.kind === "answer" && card.prompt.ask) {
      const own = (said ?? "").trim();
      setTaken((all) => [...all, { ask: card.prompt.ask!.et, said: own || personal(card.prompt.model.et, name), shown: own.length === 0 }]);
    }
    if (at >= cards.length - 1) {
      setOver(true);
      onComplete();
      return;
    }
    setAt((n) => n + 1);
  };

  return (
    <div ref={cardRef} tabIndex={-1} className="flex flex-col gap-4 outline-none" data-say-it={at + 1}>
      {mode === "type" && at === 0 && (
        <Note>{t("Typing works too. Speaking is what brings the words out when you need them, so try it aloud tomorrow if you can.")}</Note>
      )}
      {capstone && taken.length > 0 && <Thread taken={taken} who={opener} voice={voice} title={t("The conversation so far")} />}
      <div ref={leadRef} className="flex flex-col">
      {card.kind === "lines" ? (
        <SayTheLines lesson={lesson} onNext={() => next()} />
      ) : card.kind === "fade" ? (
        <SayAlongFade lesson={lesson} partAt={partAt} onDone={() => next()} kept={kept.fade} onKeep={keepFade} />
      ) : card.kind === "retell" ? (
        <RetellIt retell={lesson.retell!} voice={lesson.cast[lesson.retell!.who]} typed={mode === "type"} onDone={() => next()} kept={kept.retell} onKeep={keepRetell} />
      ) : card.kind === "faster" ? (
        <AgainFaster faster={lesson.faster!} voice={side.voiceOf(side.askerOf(lesson.faster!.ask.et))} typed={mode === "type"} multiplier={timeMultiplier} onDone={() => next()} kept={kept.faster} onKeep={keepFaster} />
      ) : (
        <AnswerCard key={at} lessonId={lesson.id} card={card} mode={mode} voice={voiceOfAsk(card)} name={name} onNext={next} last={at >= cards.length - 1} typed={kept.answers?.[answerKey(card)] ?? ""} onType={keepAnswer} />
      )}
      </div>
    </div>
  );
}

/** Part one: every spoken line of today's conversation, heard and then said along. */
function SayTheLines({ lesson, onNext }: { lesson: LessonSpec; onNext: () => void }) {
  const t = useT();
  const locale = useLocale();
  const lines = lesson.conversation.filter((l) => l.et);
  const played = nativePart(lesson.conversation);
  return (
    <Card>
      <SectionTitle level={3} hint={t("listen, then say it along")}>{t("Say the conversation")}</SectionTitle>
      <ol className="flex flex-col gap-5">
        {lines.map((line, i) => (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="label-xs" style={{ color: "var(--ink-3)" }}>{line.who}</span>
              <Speak text={line.et!} voice={lesson.cast[line.who]} native={line.who === played} size={16} label={fill(t("Hear {who} say it"), { who: line.who })} />
            </div>
            {/* The comparison says what it is for once, on the first line, rather than under every line of the list. */}
            <ReadAloud line={line.et!} voice={lesson.cast[line.who]} native={line.who === played} compareHint={i === 0} />
            <p className="text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={line.en ?? ""} locale={locale} /></p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="primary" onClick={onNext}>
          {t("Next")} <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

/**
 * A question about the learner, or one turn of the role-play: answered aloud
 * or typed, then checked against one way to say it.
 *
 * THE TASK IS THE HEADING, AND THEIR LINE IS A BUBBLE UNDER IT. The other
 * side's Estonian used to lead at 20px bold under "They say", with the task a
 * size smaller below it, so the eye landed on `Aitäh!` and a learner said it
 * back, which was reported off this card. What to do is the one thing the
 * card is for, so it is the `h2`; what they said is context, drawn quieter as
 * a speech bubble.
 *
 * AND CHECK MEANS CHECK. The button only ever revealed the model, so an
 * answer heard and typed into the box was met with nothing. It compares now
 * with `markPhrase`, the Practise step's own marker: the model's words are
 * "that's it", a slip is "nearly", and repeating their line back is named as
 * that. Anything else is never painted as a near miss or called wrong, because
 * these answers are the learner's own (their name, their town) and the model is
 * one way among many: it is shown as one way to say it, and the dictionary
 * reads what they wrote.
 * Nothing is graded either way (ADR-028). A spoken answer that is the model,
 * a slip of it or their line back checks itself the moment it is heard.
 */
function AnswerCard({ lessonId, card, mode, voice, name, onNext, last, typed, onType }: {
  lessonId: string;
  card: Extract<SayCard, { kind: "answer" }>;
  mode: Mode;
  voice: string | undefined;
  name: string | null;
  onNext: (said: string) => void;
  last: boolean;
  /** What was in the box when Say it last stepped away, and where to report it (`CardsKept.answers`). */
  typed: string;
  onType: (key: string, text: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const { prompt } = card;
  // The model with the learner's own name in it, where it named Tom.
  const model = { et: personal(prompt.model.et, name) };
  const [text, setText] = useState(typed);
  const [shown, setShown] = useState(false);
  const key = answerKey(card);
  useKeep(text, useCallback((value: string) => onType(key, value), [onType, key]));
  const [mark, setMark] = useState<TypedMark | null>(null);
  // What the dictionary found in an answer that is not the sample, or null until it answers.
  const [found, setFound] = useState<readonly Finding[] | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const expect = useMemo(() => new Set(wordsOf(model.et).map((w) => w.low)), [model.et]);
  const said = normalisePhrase(text);
  const isEcho = (value: string) => prompt.ask !== undefined && normalisePhrase(value) === normalisePhrase(prompt.ask.et);
  // Their own line said back, which is the mistake this card used to invite.
  const echo = mark !== null && mark.verdict === "wrong" && isEcho(text);

  /* The microphone, for `reveal` to close: Check takes the button away, so a turn still open would go on listening with nothing on screen to stop it. */
  const listeningRef = useRef<{ listening: boolean; stop: () => void } | null>(null);
  const reveal = (value: string = text) => {
    if (listeningRef.current?.listening) listeningRef.current.stop();
    const m = normalisePhrase(value).length > 0 ? markOwnAnswer(value, prompt.model.et, name, prompt.also) : null;
    if (m && m.verdict !== "wrong") sound("right");
    setMark(m);
    setShown(true);
    /*
      AN ANSWER THAT IS NOT THE SAMPLE IS READ BY THE DICTIONARY, so a
      different sentence is told whether it is Estonian rather than only that
      it differs. A slip of the sample has its note above, and a letter out on a
      long word is read too, since that letter may be an ending. No model and nothing graded (`checkLessonSentence`). A
      request that never lands leaves the card as it was.
    */
    if (m && (m.verdict === "wrong" || m.note === NOTES.letterOut) && !isEcho(value)) {
      void checkLessonSentence(lessonId, card.which, card.index, value)
        .then((result) => { if (result.ok) setFound(result.findings); })
        .catch(() => null);
    }
    requestAnimationFrame(() => nextRef.current?.focus());
  };

  // A heard answer that is the model, or a slip of it, or their own line back,
  // checks itself: making somebody press Check on "that's it" is a press for
  // nothing. Anything else stays in the box, since it may be the recognizer's
  // mishearing or the learner's own answer, and Check is theirs to press.
  const speech = useSpeech({
    endpoint: true,
    expect,
    onHeard: (hearing) => {
      // Once checked, the box is read-only and its answer is what Next sends, so nothing heard may change it.
      if (shown) return;
      setText(hearing.understood);
      const m = markOwnAnswer(hearing.understood, prompt.model.et, name, prompt.also);
      if (m.verdict !== "wrong" || isEcho(hearing.understood)) reveal(hearing.understood);
    },
  });
  useEffect(() => { listeningRef.current = speech; });
  const mic = mode === "say" && speech.offered && !shown;

  return (
    <Card>
      <SectionTitle level={3} hint={card.label}><LessonText text={prompt.cue} locale={locale} /></SectionTitle>
      {card.scene && <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={card.scene} locale={locale} /></p>}
      {prompt.ask && (
        <div className="mb-5 flex flex-col gap-1.5" data-their-line>
          <span className="label-xs" style={{ color: "var(--ink-3)" }}>{t("They say")}</span>
          <div className="inline-flex max-w-full items-start gap-2 self-start rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ background: "var(--raised)" }}>
            <Speak text={prompt.ask.et} voice={voice} size={16} autoplay />
            <div className="min-w-0">
              <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{prompt.ask.et}</p>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}><LessonText text={prompt.ask.en} locale={locale} /></p>
            </div>
          </div>
        </div>
      )}

      {/*
        WHAT TO SAY, IN ENGLISH, BEFORE ANYTHING IS ASKED. A learner on lesson
        8 had no idea the card wanted a line from the conversation they had
        just heard, and was then shown it as the answer. The English of one way
        to answer is the instruction: say this in Estonian. An answer about
        themselves says so, because their name and their country are theirs.
      */}
      <div className="mb-5 rounded-[var(--r-lg)] px-4 py-3" style={{ background: "var(--accent-soft)" }} data-say-target>
        <p className="label-xs" style={{ color: "var(--accent-deep)" }}>{t("Say this in Estonian")}</p>
        <p className="mt-1 text-lg font-semibold" style={{ color: "var(--ink)" }}>“<LessonText text={prompt.model.en} locale={locale} name={name} />”</p>
        {card.aboutYou && (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {hasStandIn(prompt.model.et) && !name ? t("Use your own name and your own details.") : t("Make it true for you: your own details are right.")}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <span className="label-xs" style={{ color: "var(--ink-3)" }}>{t("You say")}</span>
        {mic && (
          <div className="flex flex-wrap items-center gap-3">
            <MicButton speech={speech} label={t("Say it")} fallback="box" />
            <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("What's heard goes in the box, for you to change.")}</span>
          </div>
        )}
        <input
          lang="et"
          className="field w-full"
          value={text}
          readOnly={shown}
          aria-label={mic ? t("What you said, in Estonian") : t("Your answer, in Estonian")}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !shown) {
              e.preventDefault();
              reveal();
            }
          }}
        />
        {!shown && <div className="under-field"><DiacriticBar /></div>}
      </div>

      {/* Mounted empty and filled: the dictionary's reading lands a moment after the verdict, often after the caret has gone to Next. */}
      <div role="status" aria-live="polite" className={shown && found !== null ? "mt-4" : undefined}>
        {shown && found !== null && <SentenceFindings findings={found} announced="region" />}
      </div>
      <div className="mt-4 flex flex-col gap-3" role="status" aria-live="polite">
        {shown && mark !== null && mark.verdict !== "wrong" && (
          <div className={`verdict-panel ${VERDICT_CLASS[mark.verdict]}`}>
            <p>{t(mark.note)}</p>
          </div>
        )}
        {shown && echo && (
          <div className="verdict-panel" style={{ background: "var(--raised)", color: "var(--ink)" }}>
            <p>{t("That's what they said to you. Your line answers it.")}</p>
          </div>
        )}
        {shown && mark?.verdict !== "right" && (
          <div className="flex flex-col gap-1">
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>
              {mark?.verdict === "wrong" ? t("One way to say it. Yours can be different.") : t("One way to say it")}
            </p>
            <div className="flex items-center gap-3">
              {/* Transient where it carries the learner's own name, which may not go into the shared clip store. */}
              <Speak text={model.et} size={16} transient={model.et !== prompt.model.et} />
              <p lang="et" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{model.et}</p>
            </div>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={prompt.model.en} locale={locale} name={name} /></p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {shown ? (
          <Button ref={nextRef} variant="primary" onClick={() => onNext(text)}>
            {last ? t("Done") : t("Next")} <ArrowRight size={15} aria-hidden />
          </Button>
        ) : (
          <>
            {said.length === 0 && (
              <Button variant="ghost" onClick={() => reveal()}>{t("Show one way to say it")}</Button>
            )}
            <Button variant="primary" onClick={() => reveal()} disabled={said.length === 0}>{t("Check it")}</Button>
          </>
        )}
      </div>
    </Card>
  );
}

/**
 * The conversation so far: what they said, and what the learner answered,
 * as a thread. It is what makes five turns one conversation, and it is drawn
 * with the other side leading and the learner's own words on the right.
 */
function Thread({ taken, who, voice, title }: { taken: readonly Taken[]; who: string; voice: string | undefined; title: string }) {
  const t = useT();
  return (
    <section aria-label={title} data-say-thread>
      <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{title}</p>
      <ol className="flex flex-col gap-2">
        {taken.map((turn, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            <div className="inline-flex max-w-[85%] items-start gap-2 self-start rounded-2xl rounded-tl-sm px-3.5 py-2" style={{ background: "var(--raised)" }}>
              <Speak text={turn.ask} voice={voice} size={14} label={fill(t("Hear {who} say it"), { who })} />
              <div className="min-w-0">
                <span className="label-xs block" style={{ color: "var(--ink-3)" }}>{who}</span>
                <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{turn.ask}</p>
              </div>
            </div>
            <div className="max-w-[85%] self-end rounded-2xl rounded-tr-sm px-3.5 py-2" style={{ background: "var(--accent-soft)" }}>
              <span className="label-xs block" style={{ color: "var(--ink-3)" }}>{turn.shown ? t("One way to say it") : t("You answered")}</span>
              <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{turn.said}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
