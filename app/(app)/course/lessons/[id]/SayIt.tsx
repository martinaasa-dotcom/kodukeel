"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Keyboard, Mic } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { MicButton } from "@/components/speech/MicButton";
import { ReadAloud } from "@/components/speech/ReadAloud";
import { useSpeech } from "@/components/speech/useSpeech";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, Note, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { wordsOf, type LessonSpec, type Prompt } from "@/lib/course/lessons";

/**
 * SAY IT: THE HEADLINE OF THE EVENING, AND OPTIONAL (docs/43-lessons.md §2).
 *
 * Three parts. Say tonight's conversation along with the screen, the words
 * lighting as they are heard (`ReadAloud`). Answer questions about yourself
 * out loud. And on a check-in or a part's last lesson, a short role-play with
 * somebody who speaks first.
 *
 * OPTIONAL MEANS ONE PRESS AND NO PENALTY. Two buttons of the same size open
 * the step, "Say it" and "Type it instead tonight", and typing runs the same
 * questions with the keyboard. Saying the conversation along has no typed
 * version, because copying out lines you can see is not practice of anything,
 * so a typed evening goes straight to the questions. The choice lasts the
 * evening.
 *
 * NOTHING IS MARKED, AND THE SOUNDS ARE NEVER JUDGED (ADR-018, ADR-028). The
 * answers are the learner's own, their name and their country, so there is no
 * one right string to compare against: what was heard goes in the box for
 * them to read and change, and one way to say it is shown afterwards beside
 * it. Words light up when they are understood, and an unlit word is only
 * unlit.
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

export function SayIt({ lesson, scene, onComplete }: { lesson: LessonSpec; scene: string | null; onComplete: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<Mode | null>(null);
  const [at, setAt] = useState(0);
  const [over, setOver] = useState(false);
  // The other side's voice: whoever opens tonight's conversation.
  const voice = lesson.cast[lesson.conversation[0]?.who ?? ""] ?? undefined;

  const cards = useMemo<SayCard[]>(() => {
    const answers = lesson.answers.map((prompt, i): SayCard => ({
      kind: "answer", prompt, label: fill(t("About you, {n} of {total}"), { n: String(i + 1), total: String(lesson.answers.length) }),
    }));
    const turns = (lesson.roleplay?.turns ?? []).map((prompt, i): SayCard => ({
      kind: "answer", prompt, label: fill(t("Role-play, {n} of {total}"), { n: String(i + 1), total: String(lesson.roleplay!.turns.length) }),
      scene: i === 0 ? lesson.roleplay!.scene : undefined,
    }));
    return [...(mode === "say" ? [{ kind: "lines" } as SayCard] : []), ...answers, ...turns];
  }, [lesson, mode, t]);

  if (mode === null) {
    return (
      <div className="flex flex-col gap-5" data-say-it="choose">
        <p className="max-w-[60ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {t("Words you've said out loud are the ones you remember. Say the conversation along with the screen, then answer a few questions about yourself out loud. Nobody judges how you sound: the words light up as they're understood, and that's all.")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={() => setMode("type")}>
            <Keyboard size={16} aria-hidden /> {t("Type it instead tonight")}
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
            {mode === "say" ? t("You said tonight's Estonian out loud. That's the step most people skip, and the one that counts.") : t("Done. Tomorrow, try it out loud if you're somewhere you can.")}
          </p>
          {scene && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3" data-lesson-scene={scene}>
              <p className="max-w-[48ch] text-base" style={{ color: "var(--ink-2)" }}>
                {t("The role-play is a real conversation too: they answer whatever you say, in words you've been taught.")}
              </p>
              <ButtonLink href={`/situations/${scene}`}>{t("Have the conversation")} <ArrowRight size={15} aria-hidden /></ButtonLink>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const card = cards[Math.min(at, cards.length - 1)]!;
  const next = () => {
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
      {card.kind === "lines" ? (
        <SayTheLines lesson={lesson} onNext={next} />
      ) : (
        <AnswerCard key={at} card={card} mode={mode} voice={voice} onNext={next} last={at >= cards.length - 1} />
      )}
    </div>
  );
}

/** Part one: every spoken line of tonight's conversation, heard and then said along. */
function SayTheLines({ lesson, onNext }: { lesson: LessonSpec; onNext: () => void }) {
  const t = useT();
  const locale = useLocale();
  const lines = lesson.conversation.filter((l) => l.et);
  return (
    <Card>
      <SectionTitle hint={t("listen, then say it along")}>{t("Say the conversation")}</SectionTitle>
      <ol className="flex flex-col gap-5">
        {lines.map((line, i) => (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="label-xs" style={{ color: "var(--ink-3)" }}>{line.who}</span>
              <Speak text={line.et!} voice={lesson.cast[line.who]} size={16} label={fill(t("Hear {who} say it"), { who: line.who })} />
            </div>
            <ReadAloud line={line.et!} />
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

/** A question about the learner, or one turn of the role-play: answered aloud or typed, then one way to say it. */
function AnswerCard({ card, mode, voice, onNext, last }: {
  card: Extract<SayCard, { kind: "answer" }>;
  mode: Mode;
  voice: string | undefined;
  onNext: () => void;
  last: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const { prompt } = card;
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const expect = useMemo(() => new Set(wordsOf(prompt.model.et).map((w) => w.low)), [prompt.model.et]);
  const speech = useSpeech({ endpoint: true, expect, onHeard: (hearing) => setText(hearing.understood) });
  const mic = mode === "say" && speech.offered;

  const reveal = () => {
    setShown(true);
    requestAnimationFrame(() => nextRef.current?.focus());
  };

  return (
    <Card>
      <SectionTitle hint={card.label}>{prompt.ask ? t("They say") : t("Your turn")}</SectionTitle>
      {card.scene && <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={card.scene} locale={locale} /></p>}
      {prompt.ask && (
        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Speak text={prompt.ask.et} voice={voice} size={18} autoplay />
            <p lang="et" className="text-xl font-bold" style={{ color: "var(--ink)" }}>{prompt.ask.et}</p>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={prompt.ask.en} locale={locale} /></p>
        </div>
      )}
      <p className="text-base font-semibold" style={{ color: "var(--ink)" }}><LessonText text={prompt.cue} locale={locale} /></p>

      <div className="mt-3 flex flex-col gap-3">
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

      {shown && (
        <div className="mt-4 flex flex-col gap-1" role="status">
          <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("One way to say it")}</p>
          <div className="flex items-center gap-3">
            <Speak text={prompt.model.et} size={16} />
            <p lang="et" className="text-lg font-bold" style={{ color: "var(--ink)" }}>{prompt.model.et}</p>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}><LessonText text={prompt.model.en} locale={locale} /></p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {shown ? (
          <Button ref={nextRef} variant="primary" onClick={onNext}>
            {last ? t("Done") : t("Next")} <ArrowRight size={15} aria-hidden />
          </Button>
        ) : (
          <Button variant="primary" onClick={reveal}>
            {t("Show one way to say it")}
          </Button>
        )}
      </div>
    </Card>
  );
}
