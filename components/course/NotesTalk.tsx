"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, NotebookPen, Pause, Play } from "lucide-react";
import { Button } from "@/components/Button";
import { ChoiceCard, ChoiceGroup } from "@/components/Choice";
import { DiacriticBar } from "@/components/DiacriticBar";
import { GlossedSentence } from "@/components/GlossedSentence";
import { Speak } from "@/components/Speak";
import { useAudioPrefs, useFeedbackSound } from "@/components/AudioPrefs";
import { useLocale, useT } from "@/components/Locale";
import { LessonText } from "@/components/course/LessonText";
import { DialectNote } from "@/components/course/DialectNote";
import { useLinePlayer } from "@/components/course/useLinePlayer";
import { loadLessonNotes, saveLessonNotes, type NotesKept } from "@/components/course/lessonResume";
import { Card, SectionTitle } from "@/components/ui";
import { fill } from "@/lib/copy/locale";
import type { GlossedToken } from "@/lib/dict/glossed";
// By its own module, never the barrel, which imports every lesson the course has.
import { markPhrase } from "@/lib/course/lessons/practice";
import type { NotesTalk as NotesTalkSpec } from "@/lib/course/lessons/types";
import { OPTION_CLASS, optionState, VERDICT_CLASS } from "@/lib/ux/verdict";

/**
 * A TALK TAKEN DOWN AS NOTES (C1, `LessonSpec.notes`, docs/43-lessons.md §15.7).
 *
 * The C1 paper's lecture, which the mock exam cannot set: a guest on the
 * morning show talks, a line after another, and the learner takes notes with
 * no words on the screen. The play control honors `hearings` and goes once
 * the talk has been heard as often as it may be, as a story told once does
 * (`RetellIt`); a play stopped halfway carries on from the line it stopped at,
 * so a ten-minute talk is not started over for a stop. Then the questions,
 * which the notes should answer: a word or two typed and marked as a typed
 * phrase is (`markPhrase`), or a choice. Only after them the transcript, with
 * the words the lessons have not taught underlined to their entries as a text
 * read is, and the author's key ideas beside the learner's own notes.
 *
 * THE NOTES STAY ON THE DEVICE. They are kept with the lesson's place in the
 * tab (`lessonResume.ts`) so a reload does not lose them, and never sent.
 * NOTHING IS GRADED: a question about a talk is about listening, not about a
 * word, and the review log is for words (ADR-016).
 */
export function NotesTalk({ lessonId, talk, tokens, voice, english }: {
  lessonId: string;
  talk: NotesTalkSpec;
  /** The transcript with the dictionary under its untaught words (`LessonView.notes`), or null for plain lines. */
  tokens: readonly (readonly GlossedToken[])[] | null;
  /** The speaker's voice, off the lesson's cast. */
  voice: string | undefined;
  english: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const prefs = useAudioPrefs();
  const sound = useFeedbackSound();
  const player = useLinePlayer();
  const blank = useMemo<NotesKept>(() => ({ notes: "", plays: 0, at: 0, answers: talk.questions.map(() => ""), checked: false }), [talk]);
  const [kept, setKept] = useState<NotesKept>(blank);
  const [unheard, setUnheard] = useState(false);
  /* Read once after mount, since the server rendered the empty notes and a first render that disagreed would not hydrate. */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const back = loadLessonNotes(lessonId, talk.questions.length);
    if (back) setKept(back);
  }, [lessonId, talk.questions.length]);
  useEffect(() => {
    if (restored.current) saveLessonNotes(lessonId, kept);
  }, [lessonId, kept]);
  const set = (change: Partial<NotesKept>) => setKept((k) => ({ ...k, ...change }));

  const heardOut = kept.plays >= talk.hearings;
  const partway = kept.at > 0;
  const play = async () => {
    const from = kept.at;
    const run = await player.toggle(
      talk.lines.slice(from).map((line) => ({ text: line.et, voice, pace: prefs.pace })),
      { gapMs: 350, onLine: (i) => set({ at: from + i }) },
    );
    if (!run) return;
    if (run.heard === 0 && from === 0) { setUnheard(true); set({ at: 0 }); return; }
    setUnheard(false);
    // Stopped partway, the talk carries on from that line; heard to the end, it counts as heard once.
    if (run.stopped) return;
    setKept((k) => ({ ...k, plays: k.plays + 1, at: 0 }));
  };

  /* Checking replaces the button with the marks, so the caret goes to the transcript it opened. */
  const afterRef = useRef<HTMLDivElement>(null);
  const checking = useRef(false);
  useEffect(() => {
    if (kept.checked && checking.current) { checking.current = false; afterRef.current?.focus(); }
  }, [kept.checked]);
  const marks = talk.questions.map((q, i) => {
    const given = kept.answers[i] ?? "";
    if (q.kind === "choice") return given === "" ? null : Number(given) === q.answer ? "right" as const : "wrong" as const;
    if (given.trim() === "") return null;
    // A typed answer most of the way there is painted nearly, as every typed mark is (`close`).
    const mark = markPhrase(given, q.accept);
    return mark.verdict === "wrong" && mark.close ? "nearly" as const : mark.verdict;
  });
  const check = () => {
    checking.current = true;
    set({ checked: true });
    sound(marks.every((m) => m === "right") ? "right" : "wrong");
  };
  const right = marks.filter((m) => m === "right").length;

  return (
    <Card>
      <div data-lesson-notes>
        <SectionTitle level={3} hint={talk.hearings === 1 ? t("heard once") : t("heard twice")}>
          <span className="inline-flex items-center gap-2">
            <NotebookPen size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />
            <span lang="et">{talk.title.et}</span>
          </span>
        </SectionTitle>
        <p className="mb-1 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={talk.title.en} locale={locale} /></p>
        <p className="mb-4 text-base" style={{ color: "var(--ink-2)" }}>
          {fill(t(talk.hearings === 1
            ? "{who} gives a talk on the morning show. You'll hear it once, with no words on the screen, so take notes as you listen."
            : "{who} gives a talk on the morning show. You'll hear it twice, with no words on the screen, so take notes as you listen."), { who: talk.speaker })}
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          {(!heardOut || player.playing) && (
            <Button variant={kept.plays === 0 ? "primary" : "secondary"} onClick={play}>
              {player.playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
              {player.playing ? t("Stop") : partway ? t("Carry on listening") : kept.plays === 0 ? t("Hear the talk") : t("Hear it again")}
            </Button>
          )}
          <span className="text-sm" style={{ color: "var(--ink-3)" }} role="status">
            {unheard
              ? t("The voice didn't come through just now. Answer from what you know, then read the talk.")
              : player.playing ? fill(t("Line {n} of {total}"), { n: String(kept.at + 1), total: String(talk.lines.length) })
                : heardOut ? (talk.hearings === 1 ? t("Heard once. Now answer from your notes.") : t("Heard twice. Now answer from your notes."))
                  : kept.plays > 0 ? t("Heard once. You can hear it once more.")
                    : partway ? t("Stopped partway. It carries on from where you were.") : null}
          </span>
        </div>

        <label className="label-xs mb-2 block" htmlFor={`notes-${lessonId}`} style={{ color: "var(--ink-3)" }}>{t("Your notes")}</label>
        <textarea
          id={`notes-${lessonId}`}
          className="field min-h-[140px] w-full"
          value={kept.notes}
          onChange={(e) => set({ notes: e.target.value })}
          spellCheck={false}
        />
        <div className="under-field"><DiacriticBar /></div>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>{t("Your notes stay on this device and are never sent.")}</p>

        <section aria-labelledby={`notes-q-${lessonId}`} className="mt-6 flex flex-col gap-5" data-notes-questions>
          <h4 id={`notes-q-${lessonId}`} className="text-lg font-bold" style={{ color: "var(--ink)" }}>{t("What your notes should answer")}</h4>
          {talk.questions.map((q, i) => (
            <div key={`${i}:${q.q.et}`} data-notes-question={i + 1}>
              <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{fill(t("Question {n} of {total}"), { n: String(i + 1), total: String(talk.questions.length) })}</p>
              <p lang="et" className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{q.q.et}</p>
              <p className="mb-3 text-base" style={{ color: "var(--ink-2)" }}><LessonText text={q.q.en} locale={locale} /></p>
              {q.kind === "choice" && !kept.checked ? (
                /* Picked and changed freely until the answers are checked, as a form is. */
                <ChoiceGroup ariaLabel={q.q.et} select="one" className="choice-grid">
                  {q.options.map((o, j) => (
                    <ChoiceCard
                      key={`${j}:${o.et}`}
                      selected={kept.answers[i] === String(j)}
                      onSelect={() => set({ answers: kept.answers.map((a, k) => (k === i ? String(j) : a)) })}
                      title={o.et}
                      titleLang="et"
                    />
                  ))}
                </ChoiceGroup>
              ) : q.kind === "choice" ? (
                <ChoiceGroup ariaLabel={q.q.et} select="one" answer className="choice-grid">
                  {q.options.map((o, j) => {
                    const picked = kept.answers[i] === String(j);
                    return (
                      <button
                        key={`${j}:${o.et}`}
                        type="button"
                        role="radio"
                        aria-checked={picked}
                        disabled
                        className={`choice-btn rounded-[var(--r-lg)] border px-4 py-3 text-left text-base font-semibold ${OPTION_CLASS[optionState(j === q.answer, picked)]}`}
                      >
                        <span lang="et">{o.et}</span>
                        <span className="mt-0.5 block text-sm font-normal" style={{ color: "var(--ink-2)" }}><LessonText text={o.en} locale={locale} /></span>
                      </button>
                    );
                  })}
                </ChoiceGroup>
              ) : (
                <>
                  <input
                    lang="et"
                    className="field w-full"
                    value={kept.answers[i] ?? ""}
                    disabled={kept.checked}
                    aria-label={fill(t("Your answer to question {n}, in Estonian"), { n: String(i + 1) })}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    onChange={(e) => set({ answers: kept.answers.map((a, k) => (k === i ? e.target.value : a)) })}
                  />
                  {kept.checked && (
                    <div className={`verdict-panel mt-2 ${VERDICT_CLASS[marks[i] ?? "wrong"]}`}>
                      <p>
                        {marks[i] === "right" ? t("That's it.") : marks[i] === "nearly" ? t("Nearly.") : marks[i] === null ? t("Nothing typed.") : t("Not quite.")}{" "}
                        <span lang="et" className="font-bold">{q.accept[0]}</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </section>

        {!kept.checked && (
          <div className="mt-5 flex justify-end">
            <Button variant={heardOut || unheard ? "primary" : "secondary"} onClick={check}>
              <Check size={15} aria-hidden /> {t("Check my answers")}
            </Button>
          </div>
        )}

        {kept.checked && (
          <div ref={afterRef} tabIndex={-1} className="mt-6 flex flex-col gap-6 outline-none" data-notes-after>
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }} role="status">
              {fill(t("{n} of {total} answered from the talk."), { n: String(right), total: String(talk.questions.length) })}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--edge)", background: "var(--surface)" }} data-notes-ideas>
                <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("The key ideas")}</p>
                <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-base" style={{ color: "var(--ink)" }}>
                  {talk.keyIdeas.map((k) => <li key={k.en}><LessonText text={k.en} locale={locale} /></li>)}
                </ol>
              </div>
              <div className="rounded-[var(--r-lg)] border px-4 py-3" style={{ borderColor: "var(--edge)", background: "var(--raised)" }} data-notes-mine>
                <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Your notes")}</p>
                <p lang="et" className="whitespace-pre-wrap text-base" style={{ color: "var(--ink)" }}>
                  {kept.notes.trim() || <span lang={locale} style={{ color: "var(--ink-3)" }}>{t("You took no notes this time.")}</span>}
                </p>
              </div>
            </div>
            <div>
              <p className="label-xs mb-1" style={{ color: "var(--ink-3)" }}>{t("The talk")}</p>
              <p className="mb-3 text-base" style={{ color: "var(--ink-2)" }}>{t("The underlined words are new. Press one to see what it means.")}</p>
              <ol className="flex flex-col gap-4" data-notes-transcript>
                {talk.lines.map((line, i) => {
                  const glossed = tokens?.[i];
                  return (
                    <li key={`${i}:${line.et}`} className="flex flex-col gap-1">
                      {glossed && glossed.length > 0 ? (
                        <GlossedSentence tokens={[...glossed]} sentence={line.et} prose offerTurnOff={false} />
                      ) : (
                        <span className="flex items-start gap-2">
                          <Speak text={line.et} voice={voice} size={15} label={t("Hear the sentence")} />
                          <span lang="et" className="text-lg" style={{ color: "var(--ink)" }}>{line.et}</span>
                        </span>
                      )}
                      <DialectNote et={line.et} />
                      {english && <span className="text-base" style={{ color: "var(--ink-2)" }}><LessonText text={line.en} locale={locale} /></span>}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
