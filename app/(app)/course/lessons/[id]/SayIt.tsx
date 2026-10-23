"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Keyboard, Mic } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { nativePart } from "@/lib/audio/native";
import { MicButton } from "@/components/speech/MicButton";
import { ReadAloud } from "@/components/speech/ReadAloud";
import { useSpeech } from "@/components/speech/useSpeech";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, Note, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
// The marker and the tokenizer by their own modules, never the barrel, which
// imports every lesson the course has into this one lesson's browser bundle.
import { markPhrase, normalisePhrase, type TypedMark } from "@/lib/course/lessons/practice";
import { wordsOf } from "@/lib/course/lessons/ledger";
import type { LessonSpec, Prompt } from "@/lib/course/lessons/types";
import { VERDICT_CLASS } from "@/lib/ux/verdict";

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
  | { readonly kind: "answer"; readonly prompt: Prompt; readonly label: string; readonly scene?: string };

/** One turn already taken: what they said, and what the learner answered. */
interface Taken {
  readonly ask: string;
  readonly said: string;
}

export function SayIt({ lesson, scene, capstone, onComplete }: { lesson: LessonSpec; scene: string | null; capstone: boolean; onComplete: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<Mode | null>(null);
  const [at, setAt] = useState(0);
  const [over, setOver] = useState(false);
  const [taken, setTaken] = useState<readonly Taken[]>([]);
  // The other side's voice: whoever opens today's conversation.
  const opener = lesson.conversation[0]?.who ?? "";
  const voice = lesson.cast[opener] ?? undefined;

  const cards = useMemo<SayCard[]>(() => {
    const answers = lesson.answers.map((prompt, i): SayCard => ({
      kind: "answer", prompt, label: fill(t("About you, {n} of {total}"), { n: String(i + 1), total: String(lesson.answers.length) }),
    }));
    const turns = (lesson.roleplay?.turns ?? []).map((prompt, i): SayCard => ({
      kind: "answer", prompt, label: fill(t("Role-play, {n} of {total}"), { n: String(i + 1), total: String(lesson.roleplay!.turns.length) }),
      scene: i === 0 ? lesson.roleplay!.scene : undefined,
    }));
    // The capstone is the conversation alone: the questions about yourself were the practice.
    if (capstone) return turns;
    return [...(mode === "say" ? [{ kind: "lines" } as SayCard] : []), ...answers, ...turns];
  }, [lesson, mode, t, capstone]);

  if (mode === null) {
    return (
      <div className="flex flex-col gap-5" data-say-it="choose">
        <p className="max-w-[60ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {capstone
            ? fill(t("This is the whole conversation, with you in it. {who} speaks first and you answer as yourself, out loud or typed, one turn at a time. Each turn is added to the conversation, so by the end you've held all of it."), { who: opener })
            : t("Words you've said out loud are the ones you remember. Say the conversation along with the screen, then answer a few questions about yourself out loud. A word lights up when it's understood, even said with an accent, so play yourself back beside the recording to hear how it sounded.")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
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
          <p role="status" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {capstone
              ? t("You held the whole conversation.")
              : mode === "say" ? t("You said today's Estonian out loud. That's the step most people skip, and the one that counts.") : t("Done. Tomorrow, try it out loud if you're somewhere you can.")}
          </p>
          {capstone && taken.length > 0 && (
            <div className="mt-4">
              <Thread taken={taken} who={opener} voice={voice} title={t("Your conversation")} />
            </div>
          )}
          {scene && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3" data-lesson-scene={scene}>
              <p className="max-w-[48ch] text-base" style={{ color: "var(--ink-2)" }}>
                {capstone
                  ? fill(t("That one followed a script. Now have it for real: {who} answers whatever you say, in words you've been taught."), { who: opener })
                  : t("The role-play is a real conversation too: they answer whatever you say, in words you've been taught.")}
              </p>
              <ButtonLink href={`/situations/${scene}`}>{t("Have the conversation")} <ArrowRight size={15} aria-hidden /></ButtonLink>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const card = cards[Math.min(at, cards.length - 1)]!;
  const next = (said?: string) => {
    if (capstone && card.kind === "answer" && card.prompt.ask) {
      setTaken((all) => [...all, { ask: card.prompt.ask!.et, said: (said ?? "").trim() || card.prompt.model.et }]);
    }
    if (at >= cards.length - 1) {
      setOver(true);
      onComplete();
      return;
    }
    setAt((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-4" data-say-it={at + 1}>
      {mode === "type" && at === 0 && (
        <Note>{t("Typing works too. Speaking is what brings the words out when you need them, so try it aloud tomorrow if you can.")}</Note>
      )}
      {capstone && taken.length > 0 && <Thread taken={taken} who={opener} voice={voice} title={t("The conversation so far")} />}
      {card.kind === "lines" ? (
        <SayTheLines lesson={lesson} onNext={() => next()} />
      ) : (
        <AnswerCard key={at} card={card} mode={mode} voice={voice} onNext={next} last={at >= cards.length - 1} />
      )}
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
      <SectionTitle hint={t("listen, then say it along")}>{t("Say the conversation")}</SectionTitle>
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
 * that, and an answer most of the way to the model is painted nearly, like
 * every other screen (`mark.close`). Anything else is not called wrong, because these answers are the
 * learner's own (their name, their town) and the model is one way among many.
 * Nothing is graded either way (ADR-028). A spoken answer that is the model,
 * a slip of it or their line back checks itself the moment it is heard.
 */
function AnswerCard({ card, mode, voice, onNext, last }: {
  card: Extract<SayCard, { kind: "answer" }>;
  mode: Mode;
  voice: string | undefined;
  onNext: (said: string) => void;
  last: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const { prompt } = card;
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const [mark, setMark] = useState<TypedMark | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const expect = useMemo(() => new Set(wordsOf(prompt.model.et).map((w) => w.low)), [prompt.model.et]);
  const said = normalisePhrase(text);
  const isEcho = (value: string) => prompt.ask !== undefined && normalisePhrase(value) === normalisePhrase(prompt.ask.et);
  // Their own line said back, which is the mistake this card used to invite.
  const echo = mark !== null && mark.verdict === "wrong" && isEcho(text);

  const reveal = (value: string = text) => {
    const m = normalisePhrase(value).length > 0 ? markPhrase(value, [prompt.model.et]) : null;
    if (m && m.verdict !== "wrong") sound("right");
    setMark(m);
    setShown(true);
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
      setText(hearing.understood);
      if (shown) return;
      const m = markPhrase(hearing.understood, [prompt.model.et]);
      if (m.verdict !== "wrong" || isEcho(hearing.understood)) reveal(hearing.understood);
    },
  });
  const mic = mode === "say" && speech.offered;

  return (
    <Card>
      <SectionTitle hint={card.label}><LessonText text={prompt.cue} locale={locale} /></SectionTitle>
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

      <div className="flex flex-col gap-3">
        <span className="label-xs" style={{ color: "var(--ink-3)" }}>{t("You say")}</span>
        {mic && (
          <div className="flex flex-wrap items-center gap-3">
            <MicButton speech={speech} label={t("Say it")} />
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

      <div className="mt-4 flex flex-col gap-3" role="status" aria-live="polite">
        {shown && mark !== null && (mark.verdict !== "wrong" || mark.close) && (
          <div className={`verdict-panel ${VERDICT_CLASS[mark.verdict === "wrong" ? "nearly" : mark.verdict]}`}>
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
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("One way to say it")}</p>
            <div className="flex items-center gap-3">
              <Speak text={prompt.model.et} size={16} />
              <p lang="et" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{prompt.model.et}</p>
            </div>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={prompt.model.en} locale={locale} /></p>
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
              <span className="label-xs block" style={{ color: "var(--ink-3)" }}>{t("You answered")}</span>
              <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{turn.said}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
