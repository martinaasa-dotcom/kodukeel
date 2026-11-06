"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { Speak } from "@/components/Speak";
import { MicButton } from "@/components/speech/MicButton";
import { useSpeech } from "@/components/speech/useSpeech";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { lineWords, lightUp } from "@/lib/speech/lightUp";
import { nativePart } from "@/lib/audio/native";
import { fadePlan, passLead, type FadePass } from "@/lib/course/lessons/fade";
import type { LessonSpec } from "@/lib/course/lessons/types";
import { useKeep } from "@/components/course/useKeep";
import { VERDICT_CLASS } from "@/lib/ux/verdict";

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
/** Which line of which round the fade had reached, kept while Say it is away (`useKeep`). */
export interface FadeKept {
  readonly at: number;
  /** How each line went, by its place in the plan, so the progress strip keeps its marks too. */
  readonly results?: Readonly<Record<number, LineResult>>;
}

/** What came of saying a line: every word came across, or only some of them. */
export type LineResult = "all" | "some";

export function SayAlongFade({ lesson, partAt, onDone, kept, onKeep }: { lesson: LessonSpec; partAt: number; onDone: () => void; kept?: FadeKept; onKeep?: (kept: FadeKept) => void }) {
  const t = useT();
  const locale = useLocale();
  const plan = useMemo(() => fadePlan(lesson, partAt), [lesson, partAt]);
  const [at, setAt] = useState(kept?.at ?? 0);
  const [results, setResults] = useState<Readonly<Record<number, LineResult>>>(kept?.results ?? {});
  useKeep(useMemo(() => ({ at, results }), [at, results]), onKeep);
  const step = plan[Math.min(at, plan.length - 1)]!;
  const native = nativePart(lesson.conversation);
  const last = at >= plan.length - 1;
  // Counted inside the round, so round 2 reads "Line 1 of 4" rather than "Line 5 of 12".
  const inRound = plan.filter((p) => p.pass === step.pass).length;
  const lineInRound = plan.slice(0, at + 1).filter((p) => p.pass === step.pass).length;
  const here = Math.min(at, plan.length - 1);
  // Once every word of a line has come across it stays that way, so a later "some" never undoes an "all".
  const record = useCallback((result: LineResult) => {
    setResults((r) => (r[here] === result || r[here] === "all" ? r : { ...r, [here]: result }));
  }, [here]);

  return (
    <Card>
      <SectionTitle level={3}>{t("Say it along, then alone")}</SectionTitle>
      <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}>
        {{
          first: t("Hear the line, then say it with the words in front of you."),
          firstHidden: t("Hear the line, then say it. Some of its words are already gone: each comes back when it's heard."),
          more: t("Now more of the line is gone. Say the whole line: a word comes back when it's heard."),
          still: t("The line is still gone. Say it again from memory: a word comes back when it's heard."),
          last: t("Now say it with nothing on the screen but the English."),
        }[passLead(plan, Math.min(at, plan.length - 1))]}
      </p>
      <FadeProgress plan={plan} at={here} results={results} />
      <FadeLine
        key={at}
        line={step.et}
        en={step.en}
        hidden={step.hidden}
        voice={lesson.cast[step.who]}
        native={step.who === native}
        who={step.who}
        locale={locale}
        onResult={record}
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {/* Read out as Next brings each line, since the caret stays on Next and nothing else says the line, or the round, changed. */}
        <p className="text-sm" role="status" style={{ color: "var(--ink-3)" }}>{fill(t("Round {r}, line {n} of {total}"), { r: String(step.pass), n: String(lineInRound), total: String(inRound) })}</p>
        <Button variant="primary" onClick={() => (last ? onDone() : setAt((n) => n + 1))}>
          {last ? t("Done") : t("Next")} <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

/**
 * WHERE YOU ARE, AND HOW EACH LINE WENT. The three rounds side by side, each
 * named for what it asks rather than numbered alone, and under each a segment
 * per line: the one being said ringed, one where every word came across in
 * sky with the round's numeral ticked once every line of it did, one where only some
 * did in butter, one still ahead left plain. It replaced three bare pills,
 * which said which round it was and nothing about the line or how any of it
 * had gone, so a learner could not tell from the screen whether the last line
 * had worked. Never color alone: the numeral carries a tick, the segment a
 * thickness, and the words beside it (`role="status"` below and the verdict
 * under the line) say the rest.
 */
function FadeProgress({ plan, at, results }: { plan: readonly FadePass[]; at: number; results: Readonly<Record<number, LineResult>> }) {
  const t = useT();
  const step = plan[at]!;
  const names: Record<FadePass["pass"], string> = {
    1: t("Along"),
    2: t("Words fade"),
    3: t("English only"),
  };
  return (
    <div className="mb-5 flex flex-col gap-2" data-fade-progress>
      <ol className="grid grid-cols-3 gap-3" aria-label={t("The three rounds")}>
        {([1, 2, 3] as const).map((pass) => {
          const lines = plan.map((p, i) => ({ p, i })).filter(({ p }) => p.pass === pass);
          const current = pass === step.pass;
          const done = pass < step.pass;
          const allCame = lines.length > 0 && lines.every(({ i }) => results[i] === "all");
          // A round is ticked only where every line of it came across: walked past is not the same as done well.
          const state = current ? "current" : done ? (allCame ? "done" : "passed") : "ahead";
          return (
            <li key={pass} className="flex min-w-0 flex-col gap-2" aria-current={current ? "step" : undefined} data-round={state}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="fade-round-num" data-state={state} aria-hidden>
                  {state === "done" ? <Check size={14} strokeWidth={3} /> : pass}
                </span>
                <span className="sr-only">{fill(t("Round {n} of 3"), { n: String(pass) })}: {names[pass]}{done && allCame ? `, ${t("every word came across")}` : ""}</span>
                {/* A phone has a third of a card per round, so it names the current round once under the strip instead. */}
                <span className="hidden whitespace-nowrap text-sm font-semibold sm:inline" style={{ color: current ? "var(--ink)" : "var(--ink-3)" }} aria-hidden>{names[pass]}</span>
              </div>
              <div className="flex gap-1" aria-hidden>
                {lines.map(({ i }) => (
                  <span key={i} className="fade-seg" data-now={i === at ? "true" : undefined} data-result={results[i] ?? (i < at ? "skipped" : "none")} />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-sm font-semibold sm:hidden" style={{ color: "var(--ink)" }} aria-hidden>{fill(t("Round {n} of 3"), { n: String(step.pass) })}: {names[step.pass]}</p>
    </div>
  );
}

function FadeLine({ line, en, hidden, voice, native, who, locale, onResult }: {
  line: string; en: string; hidden: readonly boolean[]; voice: string | undefined; native: boolean; who: string; locale: ReturnType<typeof useLocale>; onResult: (result: LineResult) => void;
}) {
  const t = useT();
  const words = useMemo(() => lineWords(line), [line]);
  const expect = useMemo(() => new Set(words.map((w) => w.text.toLocaleLowerCase("et"))), [words]);
  const [heard, setHeard] = useState("");
  // Every try of this line so far, so a word that came back stays back when the learner tries again.
  const [before, setBefore] = useState<readonly boolean[]>(() => words.map(() => false));
  const [shown, setShown] = useState(false);
  // "Show the line" goes once pressed, so the caret goes to the line it showed.
  const lineRef = useRef<HTMLParagraphElement>(null);
  const showing = useRef(false);
  useEffect(() => {
    if (shown && showing.current) { showing.current = false; lineRef.current?.focus(); }
  }, [shown]);
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
  // A dash said between two halves of a line is not a word, so it is not counted as one that came across.
  const counted = words.map((w, i) => ({ word: /\p{L}/u.test(w.text), lit: lit[i] ?? false })).filter((w) => w.word);
  const anyHidden = hidden.some(Boolean);
  const cameAcross = counted.filter((w) => w.lit).length;
  const settled = heard !== "" && !speech.listening;
  const result: LineResult | null = settled ? (cameAcross === counted.length ? "all" : "some") : null;
  useEffect(() => { if (result) onResult(result); }, [result, onResult]);

  return (
    <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border px-4 py-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }} data-fade-line data-result={result ?? undefined}>
      <div className="flex items-center gap-2">
        <span className="label-xs" style={{ color: "var(--ink-3)" }}>{who}</span>
        <Speak text={line} voice={voice} native={native} size={16} label={fill(t("Hear {who} say it"), { who })} />
      </div>
      <p ref={lineRef} tabIndex={-1} lang="et" className="text-xl font-semibold leading-relaxed outline-none" style={{ color: "var(--ink)" }}>
        {words.map((w, i) => {
          const gone = hidden[i] && !shown && !lit[i];
          return (
            <span key={`${i}-${w.text}`}>
              {gone
                ? <span className="fade-word" style={{ minWidth: `${Math.max(2, w.text.length)}ch` }}><span className="sr-only" lang={locale}>{t("a word to say")}</span>{"\u00a0".repeat(Math.max(2, w.text.length))}</span>
                : hidden[i] ? <span className="fade-word" data-back="true">{w.text}</span> : <span className="read-aloud-word" data-lit={lit[i] ? "true" : "false"} data-missed={result === "some" && !lit[i] && /\p{L}/u.test(w.text) ? "true" : undefined}>{w.text}</span>}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </p>
      <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={en} locale={locale} /></p>
      <div className="flex flex-wrap items-center gap-3">
        {speech.offered
          ? <MicButton speech={speech} label={t("Say it")} showPartial={false} fallback="none" />
          : <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Say it out loud anyway. Nobody's listening but you.")}</p>}
        {anyHidden && !shown && (
          <Button variant="ghost" size="sm" onClick={() => { showing.current = true; setShown(true); }}><Eye size={14} aria-hidden /> {t("Show the line")}</Button>
        )}
      </div>
      {/* Mounted empty and filled, since a status region that arrives holding its words is often not read. */}
      <div role="status">
        {result === "all" && (
          <p className={`verdict-panel ${VERDICT_CLASS.right} flex items-center gap-2 font-semibold`}>
            <Check size={18} strokeWidth={3} aria-hidden /> {t("Every word came across.")}
          </p>
        )}
        {result === "some" && (
          <p className={`verdict-panel ${VERDICT_CLASS.nearly} flex items-start gap-2`}>
            <RotateCcw size={18} className="mt-0.5" aria-hidden />
            <span>
              <span className="font-semibold">{fill(t("{n} of {total} words came across."), { n: cameAcross, total: counted.length })}</span>{" "}
              {t("The underlined ones weren't heard. Say it again, or carry on.")}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
