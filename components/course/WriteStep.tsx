"use client";

import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookmarkPlus, Check, Circle, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Speak } from "@/components/Speak";
import { AnuTextReading } from "@/components/anu/TextReading";
import { SentenceFindings } from "@/components/course/SentenceFindings";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { Card, SectionTitle } from "@/components/ui";
import { fill, tr } from "@/lib/copy/locale";
import { NOT_REACHED } from "@/lib/copy/values";
import { VERDICT_CLASS } from "@/lib/ux/verdict";
import { frameOf, markGap, usesIn, wordCount } from "@/lib/course/lessons/frame";
import type { LessonSpec, WriteTask } from "@/lib/course/lessons/types";
import type { Finding } from "@/lib/course/lessons/sentenceCheck";
import { checkLessonText, keepLessonSentences } from "@/app/actions";
import { MOST_KEPT, MOST_READ } from "@/lib/course/lessons/limits";
import { forgetWriting, loadWriting, saveWriting, type WriteStage } from "./writeResume";

/**
 * WRITE: ONE REAL TEXT A PART (B1 on, docs/43-lessons.md §11.2).
 *
 * Four stages, always in this order, each one the scaffold for the next, and
 * named in the strip above them:
 *
 *   1. Read the model, a text that does the job, its key words marked.
 *   2. Fill in the frame: the same text with those words taken out.
 *   3. Write your own: the same job, with your details, and the key words
 *      ticking themselves off as they appear in it.
 *   4. Redraft and keep it: the draft is read by the dictionary first,
 *      sentence by sentence, on every deployment, and by Anu on the text as a
 *      whole on request, behind the guard every graded comment passes, so a
 *      note quoting a form nobody can vouch for is held back whole
 *      (`/api/exam/write`, `verify.ts`); the second draft sits beside the
 *      first; and the learner ticks the sentences they are sure of, only one
 *      the dictionary read with nothing to say can be ticked, and each kept
 *      becomes a gap card in their own deck with a word the course taught
 *      taken out (`keepLessonSentences`).
 *
 * WHAT WAS TYPED SURVIVES LEAVING THE STEP. The lesson's step pills are pressable and a
 * phone takes tabs away, so the stage, the frame's gaps, the draft and the
 * second draft are kept on the device per lesson (`writeResume.ts`) and put
 * back on arrival, and forgotten when the learner presses "Done writing".
 *
 * NOTHING HERE IS A MARK. The dictionary's findings say where a spelling is
 * not one it knows; Anu's note is advice. A learner who writes a different
 * text from the model has not got it wrong, which is the whole point of
 * writing your own.
 */
type Stage = WriteStage;
const STAGES: readonly Stage[] = ["model", "frame", "own", "redraft"];

export function WriteStep({ lesson, onDone }: { lesson: LessonSpec; onDone: () => void }) {
  const t = useT();
  const write = lesson.write!;
  const gapCount = useMemo(() => frameOf(write).flatMap((l) => l.parts.filter((p) => p.kind === "gap")).length, [write]);
  const [stage, setStage] = useState<Stage>("model");
  /* Whether the stage is changing because a button was pressed, so the caret
     moves on a press and never on a draft picked up from the device, whose
     stage is set before the first effects have run. */
  const pressed = useRef(false);
  const goTo = (next: Stage) => {
    pressed.current = true;
    setStage(next);
  };
  const [frameTyped, setFrameTyped] = useState<readonly string[]>(() => Array.from({ length: gapCount }, () => ""));
  const [frameChecked, setFrameChecked] = useState(false);
  const [draft, setDraft] = useState("");
  const [second, setSecond] = useState("");
  const [looked, setLooked] = useState(false);

  /*
    Picked up from the device before the first paint, so the draft somebody
    was writing is the one drawn, and never during render, since the server
    has no device to read. Once, on arrival.
  */
  useLayoutEffect(() => {
    const saved = loadWriting(lesson.id);
    if (saved) {
      setStage(saved.stage);
      if (saved.frame.length === gapCount) {
        setFrameTyped(saved.frame);
        setFrameChecked(saved.frameChecked);
      }
      setDraft(saved.draft);
      setSecond(saved.second);
    }
    setLooked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!looked) return;
    // Nothing typed and nothing moved past is nothing to lose.
    if (stage === "model" && !draft && !second && frameTyped.every((g) => g === "")) return;
    saveWriting(lesson.id, { stage, frame: [...frameTyped], frameChecked, draft, second });
  }, [looked, lesson.id, stage, frameTyped, frameChecked, draft, second]);

  const at = STAGES.indexOf(stage);
  const titles: Record<Stage, string> = {
    model: t("Read the model"),
    frame: t("Fill in the frame"),
    own: t("Write your own"),
    redraft: t("Redraft and keep it"),
  };
  const done = () => {
    forgetWriting(lesson.id);
    onDone();
  };
  /* Each stage replaces the one whose button was just pressed, so the caret
     goes to the stage now current, which says its name, rather than to the
     page. Not on arrival: opening the step is not moving through it. */
  const currentRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!pressed.current) return;
    pressed.current = false;
    currentRef.current?.focus();
  }, [stage]);

  return (
    <div className="flex flex-col gap-5" data-write-step={stage}>
      <ol className="flex flex-wrap gap-2 text-sm font-semibold" aria-label={t("The four stages")}>
        {STAGES.map((s, i) => (
          <li
            key={s}
            ref={s === stage ? currentRef : undefined}
            tabIndex={s === stage ? -1 : undefined}
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
      {stage === "model" && <Model lesson={lesson} onNext={() => goTo("frame")} />}
      {stage === "frame" && (
        <Frame
          write={write}
          typed={frameTyped}
          setTyped={setFrameTyped}
          checked={frameChecked}
          setChecked={setFrameChecked}
          onNext={() => goTo("own")}
        />
      )}
      {stage === "own" && <Own lesson={lesson} draft={draft} setDraft={setDraft} onNext={() => { if (!second) setSecond(draft); goTo("redraft"); }} />}
      {stage === "redraft" && <Redraft lesson={lesson} first={draft} second={second} setSecond={setSecond} onDone={done} />}
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
            {/* The speaker's label is English, so the Estonian is the span beside it rather than the whole line. */}
            <p className="text-lg leading-relaxed" style={{ color: "var(--ink)" }}>
              <Speak text={write.model[i]!.et} size={14} />{" "}
              <span lang="et">
                {line.parts.map((p, j) => p.kind === "text"
                  ? <Fragment key={j}>{p.text}</Fragment>
                  : <mark key={j} className="rounded px-1 font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>{p.answer}</mark>)}
              </span>
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
function Frame({ write, typed, setTyped, checked, setChecked, onNext }: {
  write: WriteTask;
  typed: readonly string[];
  setTyped: (update: (all: readonly string[]) => readonly string[]) => void;
  checked: boolean;
  setChecked: (checked: boolean) => void;
  onNext: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const sound = useFeedbackSound();
  const frame = useMemo(() => frameOf(write), [write]);
  const gaps = frame.flatMap((l) => l.parts.filter((p) => p.kind === "gap"));
  const marks = gaps.map((g, i) => markGap(typed[i] ?? "", g.kind === "gap" ? g.answer : ""));
  const right = marks.filter((m) => m !== "wrong").length;

  return (
    <Card>
      <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}>{t("The same text, with its key words taken out. Write them back in. The English under each gap says which.")}</p>
      <div className="flex flex-col gap-4" data-write-frame>
        {frame.map((line, i) => (
          <div key={i} className="flex flex-col gap-1">
            {/* Each gap carries its English under it, so the Estonian is marked span by span rather than on the line. */}
            <p className="text-lg leading-loose" style={{ color: "var(--ink)" }}>
              {line.parts.map((p, j) => {
                if (p.kind === "text") return <span key={j} lang="et">{p.text}</span>;
                const mark = checked ? marks[p.n]! : null;
                return (
                  <span key={j} className="inline-flex flex-col align-top">
                    <input
                      lang="et"
                      className={`field inline-block px-2 py-0.5 text-lg ${mark ? VERDICT_CLASS[mark] : ""}`}
                      style={{ width: `${Math.max(6, p.answer.length + 2)}ch` }}
                      value={typed[p.n] ?? ""}
                      readOnly={checked}
                      aria-invalid={mark === "wrong" ? true : undefined}
                      aria-label={fill(t("Gap {n}: {meaning}"), { n: String(p.n + 1), meaning: tr(locale, p.en) })}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      onChange={(e) => { const value = e.target.value; setTyped((all) => gaps.map((_, k) => (k === p.n ? value : all[k] ?? ""))); }}
                    />
                    <span className="text-sm" style={{ color: "var(--ink-3)" }}><LessonText text={p.en} locale={locale} /></span>
                    {/* Said in words as well as in the gap's color, since nearly and wrong are one hue apart. */}
                    {mark === "right" && (
                      <span className="text-sm font-semibold" style={{ color: "var(--good-ink)" }}><Check size={13} className="mr-1 inline" aria-hidden />{t("Right")}</span>
                    )}
                    {mark !== null && mark !== "right" && (
                      <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                        {mark === "nearly" ? t("Nearly") : t("Not quite")}: <b lang="et" style={{ color: "var(--ink)" }}>{p.answer}</b>
                      </span>
                    )}
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

/**
 * The fewest words worth having read at all: a reading of three words says
 * nothing. Below `write.least`, which is what "long enough" means, so a short
 * text can still be read and is only not the primary way on.
 */
const READ_FROM = 5;

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
        {/* The count is read on demand, not on every keystroke: what is announced is the one moment it matters. */}
        <p className="sr-only" role="status">{words >= write.least ? t("That's long enough to go on.") : ""}</p>
        <div className="flex items-center gap-3">
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
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>{t("Write about your own life. It doesn't have to match the model.")}</p>
        <Button variant={enough ? "primary" : "secondary"} onClick={onNext} disabled={words < READ_FROM}>
          {t("Have it read")} <ArrowRight size={15} aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

interface Read {
  /** The text the dictionary read, so a draft changed since is never kept off a stale reading. */
  readonly text: string;
  readonly sentences: readonly { sentence: string; findings: readonly Finding[]; card: { before: string; answer: string; after: string } | null }[];
  /** Pieces under three words, not read as sentences. */
  readonly short: number;
  /** Sentences past the ones read. */
  readonly beyond: number;
  /** The draft ran past the longest text read, so its end was never looked at. */
  readonly cut: boolean;
}

/** Stages 4 and 5: the reading, the second draft beside the first, and the sentences kept. */
function Redraft({ lesson, first, second, setSecond, onDone }: { lesson: LessonSpec; first: string; second: string; setSecond: (s: string) => void; onDone: () => void }) {
  const t = useT();
  const id = useId();
  const [read, setRead] = useState<Read | null>(null);
  // "Read my text" is replaced by what was found, so the caret goes to the finding's own line.
  const findingsRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (read) findingsRef.current?.focus(); }, [read]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());
  const [kept, setKept] = useState<{ kept: number; already: number; refused: number } | null>(null);
  const keptRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (kept) keptRef.current?.focus(); }, [kept]);
  const [keeping, setKeeping] = useState(false);
  // The second draft is what is read, seeded from the first on the way in; emptied, there is nothing to read rather than the first again.
  const current = second;
  const stale = read !== null && read.text !== current;

  const readIt = (text: string) => {
    setReading(true);
    setError(null);
    checkLessonText(lesson.id, text)
      .then((r) => {
        if (!r.ok) { setError(t(r.error)); return; }
        setRead({ text, sentences: r.sentences, short: r.short, beyond: r.beyond, cut: r.cut });
        // Ticked by default: the sentences the dictionary found nothing in that make a card, as many as a draft keeps.
        const clean = r.sentences.flatMap((s, i) => (s.card ? [i] : [])).slice(0, MOST_KEPT);
        setTicked(new Set(clean));
        setKept(null);
      })
      .catch(() => setError(t(NOT_REACHED)))
      .finally(() => setReading(false));
  };
  const keep = () => {
    if (!read || stale) return;
    setKeeping(true);
    setError(null);
    keepLessonSentences(lesson.id, read.sentences.filter((_, i) => ticked.has(i)).map((s) => s.sentence))
      .then((r) => { if (r.ok) setKept({ kept: r.kept, already: r.already, refused: r.refused }); else setError(t(r.error)); })
      .catch(() => setError(t(NOT_REACHED)))
      .finally(() => setKeeping(false));
  };
  const toggle = (i: number) => setTicked((all) => {
    const next = new Set(all);
    if (next.has(i)) next.delete(i);
    else if (next.size < MOST_KEPT) next.add(i);
    return next;
  });
  const noted = read?.sentences.filter((s) => s.findings.length > 0).length ?? 0;
  const total = read ? read.sentences.length + read.short + read.beyond : 0;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle hint={t("spelling and common slips")}>{t("The dictionary reads it")}</SectionTitle>
        {read === null ? (
          <Button onClick={() => readIt(current)} disabled={reading || current.trim() === ""}>
            {reading ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Reading")}</> : t("Read my text")}
          </Button>
        ) : (
          <div className="flex flex-col gap-4" data-write-findings>
            <p ref={findingsRef} tabIndex={-1} className="text-base font-semibold outline-none" role="status" style={{ color: "var(--ink)" }}>
              {noted === 0
                ? t("The dictionary found nothing to point out. It checks spelling and the commonest slips, not every ending.")
                : fill(t("{n} of {total} sentences have something to look at."), { n: String(noted), total: String(read.sentences.length) })}
            </p>
            {read.cut && (
              <p className="text-base" style={{ color: "var(--ink-2)" }}>
                {t("Your text runs past what one reading takes, so its end wasn't read. Shorten it and read it again.")}
              </p>
            )}
            {read.sentences.length < total && (
              <p className="text-base" style={{ color: "var(--ink-2)" }}>
                {fill(t("It read {n} of your {total} sentences. It skips anything under three words, and stops after {max}."), {
                  n: String(read.sentences.length), total: String(total), max: String(MOST_READ),
                })}
              </p>
            )}
            {read.sentences.map((s, i) => s.findings.length > 0 && (
              <div key={i} className="flex flex-col gap-2">
                <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>{s.sentence}</p>
                <SentenceFindings findings={s.findings} />
              </div>
            ))}
            {stale && <p className="text-base" style={{ color: "var(--ink-2)" }}>{t("You've changed your text since the dictionary read it.")}</p>}
            <div>
              <Button variant={stale ? "secondary" : "ghost"} size="sm" onClick={() => readIt(current)} disabled={reading || current.trim() === ""}>
                {reading ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Reading")}</> : t("Read it again")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint={t("on request")}>{t("Anu reads it")}</SectionTitle>
        <AnuTextReading
          text={current}
          level={lesson.level}
          heading={t("Anu's read it. It's advice, and nothing here is marked.")}
          invite={t("Whether the text holds together, and one thing to do better.")}
          offline={t("Anu needs a connection to read it. Your text is still here.")}
        />
      </Card>

      <Card>
        <SectionTitle hint={t("first draft beside it")}>{t("Your second draft")}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{t("First draft")}</p>
            <p lang="et" className="whitespace-pre-wrap rounded-[var(--r)] px-3 py-2 text-base leading-relaxed" style={{ background: "var(--raised)", color: "var(--ink-2)" }} data-write-first>{first}</p>
          </div>
          <div>
            <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{t("Second draft")}</p>
            <textarea lang="et" className="field min-h-[160px] w-full text-base leading-relaxed" value={second} onChange={(e) => setSecond(e.target.value)} aria-label={t("Your second draft, in Estonian")} spellCheck={false} data-write-second />
            <div className="under-field"><DiacriticBar /></div>
          </div>
        </div>
      </Card>

      <Card tone="sky">
        <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{t("Keep your sentences for review")}</p>
        {kept ? (
          // The fieldset whose button was pressed is gone: the caret goes to what came of it, which reading it out says.
          <p ref={keptRef} tabIndex={-1} className="text-base outline-none" style={{ color: "var(--ink-2)" }}>
            {kept.kept > 0
              ? fill(t(kept.kept === 1 ? "1 of your sentences is in your reviews now, with one word to fill in." : "{n} of your sentences are in your reviews now, each with one word to fill in."), { n: String(kept.kept) })
              : kept.already > 0 ? t("You kept these already.")
                // Every one refused on the server's own reading is that, and not a sentence with no course word in it.
                : kept.refused > 0 ? t("None could be kept: the dictionary found something to point out in each of them. Read the text again and tick the ones it passes.")
                  : t("None of these sentences has a word from the course in it yet to fill in.")}
            {kept.refused > 0 && (kept.kept > 0 || kept.already > 0) && <> {t("Some couldn't be kept, because the dictionary found something to point out in them.")}</>}
          </p>
        ) : read === null || stale ? (
          <p className="text-base" style={{ color: "var(--ink-2)" }}>
            {read === null
              ? t("Have the dictionary read your text first. Then tick the sentences you're sure of.")
              : t("Read it again, then tick the sentences you're sure of.")}
          </p>
        ) : (
          <fieldset className="mt-1 flex flex-col gap-3" data-write-keep>
            <legend className="text-base" style={{ color: "var(--ink-2)" }}>
              {t("Tick the sentences you're sure of. Each comes back in review with the marked word to fill in.")}
            </legend>
            {/* A box greyed for being one too many says why, or it reads as broken. */}
            {ticked.size >= MOST_KEPT && (
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>{fill(t("That's {n}, the most you can keep from one text."), { n: String(MOST_KEPT) })}</p>
            )}
            <ul className="flex flex-col gap-1">
              {read.sentences.map((s, i) => {
                const blocked = s.findings.length > 0 || !s.card;
                return (
                  <li key={i}>
                    <label htmlFor={`${id}-${i}`} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-base leading-relaxed" style={{ color: blocked ? "var(--ink-3)" : "var(--ink)" }}>
                      <input
                        id={`${id}-${i}`}
                        type="checkbox"
                        checked={!blocked && ticked.has(i)}
                        disabled={blocked || (!ticked.has(i) && ticked.size >= MOST_KEPT)}
                        onChange={() => toggle(i)}
                        className="mt-1.5 h-4 w-4 shrink-0"
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <span className="flex flex-col">
                        <span lang="et">{s.card ? <Marked {...s.card} /> : s.sentence}</span>
                        {s.findings.length > 0
                          ? <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("The dictionary found something here. Put it right first.")}</span>
                          : !s.card && <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t("No word from the course to take out.")}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end">
              <Button onClick={keep} disabled={keeping || ticked.size === 0}>
                {keeping ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <BookmarkPlus size={15} aria-hidden />} {t("Keep them")}
              </Button>
            </div>
          </fieldset>
        )}
      </Card>

      {error && <p className="text-base" role="alert" style={{ color: "var(--blush-ink)" }}>{error}</p>}
      <div className="flex justify-end">
        <Button variant="primary" onClick={onDone}>{t("Done writing")} <ArrowRight size={15} aria-hidden /></Button>
      </div>
    </div>
  );
}

/** A kept sentence with the word that will be taken out of it marked in place. */
function Marked({ before, answer, after }: { before: string; answer: string; after: string }) {
  return (
    <>
      {before}
      <b className="rounded px-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>{answer}</b>
      {after}
    </>
  );
}
