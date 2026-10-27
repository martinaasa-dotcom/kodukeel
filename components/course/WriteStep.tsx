"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowRight, BookmarkPlus, Check, Circle, Loader2, MessageCircleQuestion, PenLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { AnuProse } from "@/components/anu/Prose";
import { SentenceFindings } from "@/components/course/SentenceFindings";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, Note, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";
import { VERDICT_CLASS } from "@/lib/ux/verdict";
import { frameOf, markGap, usesIn, wordCount } from "@/lib/course/lessons/frame";
import type { LessonSpec, WriteTask } from "@/lib/course/lessons/types";
import type { Finding } from "@/lib/course/lessons/sentenceCheck";
import { checkLessonText, keepLessonSentences } from "@/app/actions";

/**
 * WRITE: ONE REAL TEXT A PART (B1 on, docs/43-lessons.md §11.2).
 *
 * Five stages, always in this order, each one the scaffold for the next:
 *
 *   1. Read the model, a text that does the job, its key words marked.
 *   2. Fill in the frame: the same text with those words taken out.
 *   3. Write your own: the same job, with your details, and the key words
 *      ticking themselves off as they appear in it.
 *   4. Have it read: the dictionary first, sentence by sentence, on every
 *      deployment; then Anu on the text as a whole, on request, behind the
 *      guard every graded comment passes, so a note quoting a form nobody can
 *      vouch for is held back whole (`/api/exam/write`, `verify.ts`).
 *   5. Redraft beside the first version, and keep the sentences: each one
 *      holding a word the course taught, spelled as it taught it, becomes a gap
 *      card in the learner's own deck (`keepLessonSentences`).
 *
 * NOTHING HERE IS A MARK. The dictionary's findings say where a spelling is
 * not one it knows; Anu's note is advice. A learner who writes a different
 * text from the model has not got it wrong, which is the whole point of
 * writing your own.
 */
type Stage = "model" | "frame" | "own" | "redraft";
const STAGES: readonly Stage[] = ["model", "frame", "own", "redraft"];

export function WriteStep({ lesson, onDone }: { lesson: LessonSpec; onDone: () => void }) {
  const t = useT();
  const write = lesson.write!;
  const [stage, setStage] = useState<Stage>("model");
  const [draft, setDraft] = useState("");
  const [second, setSecond] = useState("");
  const at = STAGES.indexOf(stage);
  const titles: Record<Stage, string> = {
    model: t("Read the model"),
    frame: t("Fill in the frame"),
    own: t("Write your own"),
    redraft: t("Redraft and keep it"),
  };

  return (
    <div className="flex flex-col gap-5" data-write-step={stage}>
      <ol className="flex flex-wrap gap-2 text-sm font-semibold" aria-label={t("The four stages")}>
        {STAGES.map((s, i) => (
          <li
            key={s}
            aria-current={s === stage ? "step" : undefined}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1"
            style={s === stage
              ? { background: "var(--accent-soft)", color: "var(--accent-deep)", borderColor: "var(--accent)" }
              : i < at ? { background: "var(--sky-soft)", color: "var(--sky-ink)", borderColor: "transparent" }
                : { background: "var(--raised)", color: "var(--ink-2)", borderColor: "transparent" }}
          >
            {i < at && <Check size={12} aria-hidden />} {fill(t("{n}. {step}"), { n: String(i + 1), step: titles[s] })}
          </li>
        ))}
      </ol>
      <Genre write={write} />
      {stage === "model" && <Model lesson={lesson} onNext={() => setStage("frame")} />}
      {stage === "frame" && <Frame write={write} onNext={() => setStage("own")} />}
      {stage === "own" && <Own lesson={lesson} draft={draft} setDraft={setDraft} onNext={() => { setSecond(draft); setStage("redraft"); }} />}
      {stage === "redraft" && <Redraft lesson={lesson} first={draft} second={second} setSecond={setSecond} onDone={onDone} />}
    </div>
  );
}

function Genre({ write }: { write: WriteTask }) {
  const locale = useLocale();
  return (
    <div className="flex items-start gap-3 rounded-[var(--r-lg)] px-4 py-3" style={{ background: "var(--accent-soft)" }}>
      <PenLine size={18} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--accent-deep)" }} />
      <div>
        <p className="text-lg font-bold" style={{ color: "var(--ink)" }}><LessonText text={write.genre} locale={locale} /></p>
        <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={write.purpose} locale={locale} /></p>
      </div>
    </div>
  );
}

/** Stage 1: the model, its key words marked, each sentence heard on a press. */
function Model({ lesson, onNext }: { lesson: LessonSpec; onNext: () => void }) {
  const t = useT();
  const locale = useLocale();
  const write = lesson.write!;
  const frame = useMemo(() => frameOf(write), [write]);
  const [english, setEnglish] = useState(true);
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("The marked words are what this kind of text turns on. You'll write them yourself next.")}</p>
        <Button variant="ghost" size="sm" onClick={() => setEnglish((on) => !on)} aria-pressed={!english}>
          {english ? t("Hide the English") : t("Show the English")}
        </Button>
      </div>
      <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border px-5 py-4" style={{ borderColor: "var(--edge)", background: "var(--surface)" }} data-write-model>
        {frame.map((line, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <p lang="et" className="text-lg leading-relaxed" style={{ color: "var(--ink)" }}>
              <Speak text={write.model[i]!.et} size={14} />{" "}
              {line.parts.map((p, j) => p.kind === "text"
                ? <Fragment key={j}>{p.text}</Fragment>
                : <mark key={j} className="rounded px-1 font-bold" style={{ background: "var(--butter-soft)", color: "var(--ink)" }}>{p.answer}</mark>)}
            </p>
            {english && <p className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line.en} locale={locale} /></p>}
          </div>
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("The key words")}>
        {write.uses.map((u) => (
          <li key={u.et} className="rounded-full border px-3 py-1 text-base" style={{ borderColor: "var(--edge)", background: "var(--raised)" }}>
            <span lang="et" className="font-bold" style={{ color: "var(--ink)" }}>{u.et}</span>{" "}
            <span style={{ color: "var(--ink-2)" }}><LessonText text={u.en} locale={locale} /></span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={onNext}>{t("Fill in the frame")} <ArrowRight size={15} aria-hidden /></Button>
      </div>
    </Card>
  );
}

/** Stage 2: the model with its key words taken out, written back in. */
function Frame({ write, onNext }: { write: WriteTask; onNext: () => void }) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const frame = useMemo(() => frameOf(write), [write]);
  const gaps = frame.flatMap((l) => l.parts.filter((p) => p.kind === "gap"));
  const [typed, setTyped] = useState<readonly string[]>(() => gaps.map(() => ""));
  const [checked, setChecked] = useState(false);
  const marks = gaps.map((g, i) => markGap(typed[i] ?? "", g.kind === "gap" ? g.answer : ""));
  const right = marks.filter((m) => m !== "wrong").length;

  return (
    <Card>
      <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}>{t("The same text, with its key words taken out. Write them back in. The English under each gap says which.")}</p>
      <div className="flex flex-col gap-4" data-write-frame>
        {frame.map((line, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p lang="et" className="text-lg leading-loose" style={{ color: "var(--ink)" }}>
              {line.parts.map((p, j) => {
                if (p.kind === "text") return <Fragment key={j}>{p.text}</Fragment>;
                const mark = checked ? marks[p.n]! : null;
                return (
                  <span key={j} className="inline-flex flex-col align-top">
                    <input
                      lang="et"
                      className={`field inline-block px-2 py-0.5 text-lg ${mark ? VERDICT_CLASS[mark] : ""}`}
                      style={{ width: `${Math.max(6, p.answer.length + 2)}ch` }}
                      value={typed[p.n] ?? ""}
                      readOnly={checked}
                      aria-label={fill(t("Gap {n}: {meaning}"), { n: String(p.n + 1), meaning: p.en })}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      onChange={(e) => setTyped((all) => all.map((v, k) => (k === p.n ? e.target.value : v)))}
                    />
                    <span className="text-sm" style={{ color: "var(--ink-3)" }}><LessonText text={p.en} locale={locale} /></span>
                    {checked && mark !== "right" && <span lang="et" className="text-sm font-bold" style={{ color: "var(--ink)" }}>{p.answer}</span>}
                  </span>
                );
              })}
            </p>
          </div>
        ))}
      </div>
      {!checked && <div className="under-field"><DiacriticBar /></div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold" role="status" style={{ color: "var(--ink)" }}>
          {checked ? fill(t("{n} of {total} written back."), { n: String(right), total: String(gaps.length) }) : ""}
        </p>
        {checked ? (
          <Button variant="primary" onClick={onNext}>{t("Write your own")} <ArrowRight size={15} aria-hidden /></Button>
        ) : (
          <Button variant="primary" onClick={() => { setChecked(true); sound(right === gaps.length ? "right" : "wrong"); }}>{t("Check it")}</Button>
        )}
      </div>
    </Card>
  );
}

/** Stage 3: the learner's own text, with the key words ticking off as they appear. */
function Own({ lesson, draft, setDraft, onNext }: { lesson: LessonSpec; draft: string; setDraft: (s: string) => void; onNext: () => void }) {
  const t = useT();
  const locale = useLocale();
  const write = lesson.write!;
  const ticks = usesIn(draft, write.uses);
  const words = wordCount(draft);
  const enough = words >= write.least;

  return (
    <Card>
      <SectionTitle hint={fill(t("{n} words or more"), { n: String(write.least) })}><LessonText text={write.task} locale={locale} /></SectionTitle>
      <textarea
        lang="et"
        className="field min-h-[180px] w-full text-lg leading-relaxed"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={t("Your text, in Estonian")}
        spellCheck={false}
        data-write-draft
      />
      <div className="under-field"><DiacriticBar /></div>
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--scale-track)" }} aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (words / write.least) * 100)}%`, background: "var(--scale-3)", transition: "width 0.2s" }} />
          </div>
          <span className="tabular-nums text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{fill(t("{n} of {total} words"), { n: String(words), total: String(write.least) })}</span>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label={t("Try to use")} data-write-uses>
          {write.uses.map((u, i) => (
            <li key={u.et} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base" style={{ background: ticks[i] ? "var(--sky-soft)" : "var(--raised)", color: ticks[i] ? "var(--sky-ink)" : "var(--ink-2)" }} data-lit={ticks[i] ? "true" : "false"}>
              {ticks[i] ? <Check size={14} aria-hidden /> : <Circle size={11} aria-hidden />}
              <span lang="et" className="font-semibold">{u.et}</span>
              <span className="sr-only">{ticks[i] ? t("used") : t("not used yet")}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Your details, your text. The model is one way; yours doesn't have to match it.")}</p>
        <Button variant={enough ? "primary" : "secondary"} onClick={onNext} disabled={words < 5}>
          {t("Have it read")} <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

interface AnuNote { comment: string; rule: string; aiAvailable: boolean; withheld?: string[]; quotaMessage?: string }

/** Stages 4 and 5: the reading, the second draft beside the first, and the sentences kept. */
function Redraft({ lesson, first, second, setSecond, onDone }: { lesson: LessonSpec; first: string; second: string; setSecond: (s: string) => void; onDone: () => void }) {
  const t = useT();
  const [findings, setFindings] = useState<readonly { sentence: string; findings: readonly Finding[] }[] | null>(null);
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<AnuNote | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kept, setKept] = useState<{ kept: number; already: number } | null>(null);
  const [keeping, setKeeping] = useState(false);

  const read = (text: string) => {
    setReading(true);
    setError(null);
    checkLessonText(lesson.id, text)
      .then((r) => { if (r.ok) setFindings(r.sentences); else setError(t(r.error)); })
      .catch(() => setError(t(NOT_REACHED)))
      .finally(() => setReading(false));
  };
  const ask = async () => {
    setAsking(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/write", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: second || first, level: lesson.level }) });
      const body = await res.json();
      if (!res.ok) setError(body.error ? t(body.error) : t("We couldn't read that."));
      else setNote(body as AnuNote);
    } catch {
      setError(t("Anu needs a connection to read it. Your text is still here."));
    } finally {
      setAsking(false);
    }
  };
  const keep = () => {
    setKeeping(true);
    keepLessonSentences(lesson.id, second || first)
      .then((r) => { if (r.ok) setKept({ kept: r.kept, already: r.already }); else setError(t(r.error)); })
      .catch(() => setError(t(NOT_REACHED)))
      .finally(() => setKeeping(false));
  };
  const noted = findings?.filter((s) => s.findings.length > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle hint={t("no model, nothing graded")}>{t("The dictionary reads it")}</SectionTitle>
        {findings === null ? (
          <Button onClick={() => read(second || first)} disabled={reading}>
            {reading ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Reading")}</> : t("Read my text")}
          </Button>
        ) : (
          <div className="flex flex-col gap-4" data-write-findings>
            <p className="text-base font-semibold" role="status" style={{ color: "var(--ink)" }}>
              {noted === 0
                ? t("Every word is one the dictionary knows. The rest is how you said it, which is yours.")
                : fill(t("{n} of {total} sentences have something to look at."), { n: String(noted), total: String(findings.length) })}
            </p>
            {findings.filter((s) => s.findings.length > 0).map((s) => (
              <div key={s.sentence} className="flex flex-col gap-2">
                <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{s.sentence}</p>
                <SentenceFindings findings={s.findings} />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => read(second || first)} disabled={reading}>{t("Read it again")}</Button>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint={t("on request")}>{t("Anu reads it")}</SectionTitle>
        {note ? (
          note.comment
            ? <AnuProse text={note.comment} className="text-md" />
            : note.aiAvailable
              ? <Note tone="neutral"><ShieldCheck size={14} className="mr-1.5 inline" aria-hidden />{t("Anu used an Estonian word the dictionary couldn't check, so we've held her note back. We only show an Estonian word in feedback when we can check it.")}</Note>
              : <Note tone="neutral">{note.quotaMessage ? t(note.quotaMessage) : t("Anu's comments need a model, and this deployment has none. The dictionary's reading above is all there is here.")}</Note>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={ask} disabled={asking}>
              {asking ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Reading")}</> : <><MessageCircleQuestion size={15} aria-hidden /> {t("Ask Anu to read it")}</>}
            </Button>
            <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Whether the text holds together, and one thing to do better.")}</span>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint={t("first draft beside it")}>{t("Your second draft")}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{t("First draft")}</p>
            <p lang="et" className="whitespace-pre-wrap rounded-[var(--r-md)] px-3 py-2 text-base leading-relaxed" style={{ background: "var(--raised)", color: "var(--ink-2)" }} data-write-first>{first}</p>
          </div>
          <div>
            <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{t("Second draft")}</p>
            <textarea lang="et" className="field min-h-[160px] w-full text-base leading-relaxed" value={second} onChange={(e) => setSecond(e.target.value)} aria-label={t("Your second draft, in Estonian")} spellCheck={false} data-write-second />
            <div className="under-field"><DiacriticBar /></div>
          </div>
        </div>
      </Card>

      <Card tone="sky">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-[52ch]">
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{t("Keep your sentences for review")}</p>
            <p className="text-base" style={{ color: "var(--ink-2)" }}>
              {kept
                ? kept.kept > 0
                  ? fill(t(kept.kept === 1 ? "1 of your sentences is in your reviews now, with one word to fill in." : "{n} of your sentences are in your reviews now, each with one word to fill in."), { n: String(kept.kept) })
                  : kept.already > 0 ? t("You kept these already.") : t("None of these sentences has a word from the course in it yet to fill in.")
                : t("Each sentence comes back in review with one word you were taught taken out. Your sentence, your deck.")}
            </p>
          </div>
          {!kept && (
            <Button onClick={keep} disabled={keeping || wordCount(second || first) < 5}>
              {keeping ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <BookmarkPlus size={15} aria-hidden />} {t("Keep them")}
            </Button>
          )}
        </div>
      </Card>

      {error && <p className="text-base" role="alert" style={{ color: "var(--blush-ink)" }}>{error}</p>}
      <div className="flex justify-end">
        <Button variant="primary" onClick={onDone}>{t("Done writing")} <ArrowRight size={15} aria-hidden /></Button>
      </div>
    </div>
  );
}
