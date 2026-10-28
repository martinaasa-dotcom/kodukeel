"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/Button";
import { Speak } from "@/components/Speak";
import { MicButton } from "@/components/speech/MicButton";
import { useSpeech } from "@/components/speech/useSpeech";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { lineWords, lightUp, shareLit } from "@/lib/speech/lightUp";
import { nativePart } from "@/lib/audio/native";
import { fadePlan, type FadePass } from "@/lib/course/lessons/fade";
import type { LessonSpec } from "@/lib/course/lessons/types";

/**
 * SAY ALONG, THEN ALONE (B1 on, docs/43-lessons.md §11.2, Talk).
 *
 * The evening's key lines, said three times each. The first time with every
 * word on the screen; the second with tonight's words taken out, so the
 * endings the evening was about have to come from memory; the third with the
 * whole line gone and only its English left. A word that was hidden comes
 * back the moment it is heard, which is the reward and the check at once: the
 * line fills itself in as it is said.
 *
 * WHAT LIGHTS A WORD IS THAT IT WAS UNDERSTOOD, never how it sounded
 * (ADR-018, ADR-028), and a word left dark is only dark: "Show the line" is
 * always there, and moving on is never refused. Speech only, like saying the
 * conversation along at A1 and A2, since typing a line you were just shown is
 * not practice of anything.
 */
export function SayAlongFade({ lesson, partAt, onDone }: { lesson: LessonSpec; partAt: number; onDone: () => void }) {
  const t = useT();
  const locale = useLocale();
  const plan = useMemo(() => fadePlan(lesson, partAt), [lesson, partAt]);
  const [at, setAt] = useState(0);
  const step = plan[Math.min(at, plan.length - 1)]!;
  const native = nativePart(lesson.conversation);
  const last = at >= plan.length - 1;

  return (
    <Card>
      <SectionTitle hint={fill(t("Round {n} of 3"), { n: String(step.pass) })}>{t("Say it along, then alone")}</SectionTitle>
      <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}>
        {step.pass === 1
          ? step.hidden.some(Boolean)
            ? t("Hear the line, then say it. Today's words are already gone: each comes back when it's heard.")
            : t("Hear the line, then say it with the words in front of you.")
          : step.pass === 2
            ? t("Now today's words are gone. Say the whole line: a word comes back when it's heard.")
            : t("Now say it with nothing on the screen but the English.")}
      </p>
      <PassMeter pass={step.pass} />
      <FadeLine
        key={at}
        line={step.et}
        en={step.en}
        hidden={step.hidden}
        voice={lesson.cast[step.who]}
        native={step.who === native}
        who={step.who}
        locale={locale}
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>{fill(t("Line {n} of {total}"), { n: String(at + 1), total: String(plan.length) })}</p>
        <Button variant="primary" onClick={() => (last ? onDone() : setAt((n) => n + 1))}>
          {last ? t("Done") : t("Next")} <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

/** Three dots for the three rounds, the one being said filled. */
function PassMeter({ pass }: { pass: FadePass["pass"] }) {
  return (
    <div className="mb-4 flex gap-1.5" aria-hidden>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            width: 36, height: 8, borderRadius: 999,
            background: n <= pass ? "var(--accent)" : "color-mix(in srgb, var(--ink) 10%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

function FadeLine({ line, en, hidden, voice, native, who, locale }: {
  line: string; en: string; hidden: readonly boolean[]; voice: string | undefined; native: boolean; who: string; locale: ReturnType<typeof useLocale>;
}) {
  const t = useT();
  const words = useMemo(() => lineWords(line), [line]);
  const expect = useMemo(() => new Set(words.map((w) => w.text.toLocaleLowerCase("et"))), [words]);
  const [heard, setHeard] = useState("");
  // Every try of this line so far, so a word that came back stays back when the learner tries again.
  const [before, setBefore] = useState<readonly boolean[]>(() => words.map(() => false));
  const [shown, setShown] = useState(false);
  const speech = useSpeech({
    endpoint: true,
    expect,
    onHeard: (h) => {
      setHeard(h.understood);
      setBefore((was) => lightUp(words, h.understood).map((now, i) => now || (was[i] ?? false)));
    },
  });
  const now = lightUp(words, speech.listening ? speech.partial : heard);
  const lit = now.map((l, i) => l || (before[i] ?? false));
  const share = shareLit(lit);
  const anyHidden = hidden.some(Boolean);

  return (
    <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border px-4 py-4" style={{ borderColor: "var(--edge)", background: "var(--raised)" }} data-fade-line>
      <div className="flex items-center gap-2">
        <span className="label-xs" style={{ color: "var(--ink-3)" }}>{who}</span>
        <Speak text={line} voice={voice} native={native} size={16} label={fill(t("Hear {who} say it"), { who })} />
      </div>
      <p lang="et" className="text-xl font-semibold leading-relaxed" style={{ color: "var(--ink)" }}>
        {words.map((w, i) => {
          const gone = hidden[i] && !shown && !lit[i];
          return (
            <span key={`${i}-${w.text}`}>
              {gone
                ? <span className="fade-word" style={{ minWidth: `${Math.max(2, w.text.length)}ch` }}><span className="sr-only" lang={locale}>{t("a word to say")}</span>{"\u00a0".repeat(Math.max(2, w.text.length))}</span>
                : hidden[i] ? <span className="fade-word" data-back="true">{w.text}</span> : <span className="read-aloud-word" data-lit={lit[i] ? "true" : "false"}>{w.text}</span>}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </p>
      <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={en} locale={locale} /></p>
      <div className="flex flex-wrap items-center gap-3">
        {speech.offered
          ? <MicButton speech={speech} label={t("Say it")} showPartial={false} />
          : <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Say it out loud anyway. Nobody's listening but you.")}</p>}
        {anyHidden && !shown && (
          <Button variant="ghost" size="sm" onClick={() => setShown(true)}><Eye size={14} aria-hidden /> {t("Show the line")}</Button>
        )}
        {heard && !speech.listening && (
          <p className="text-sm" role="status" style={{ color: "var(--ink-2)" }}>
            {share === 1 ? t("Every word came across.") : fill(t("{n} of {total} words came across."), { n: lit.filter(Boolean).length, total: words.length })}
          </p>
        )}
      </div>
    </div>
  );
}
