"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hash } from "lucide-react";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, Empty, KeyCap, Page, StatTile } from "@/components/ui";
import { EstonianInput } from "@/components/EstonianInput";
import { Speak } from "@/components/Speak";
import { AnotherRound } from "@/components/round/AnotherRound";
import { WayOut } from "@/components/round/RoundExit";
import { RoundProgress } from "@/components/round/RoundProgress";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { useQueueGrades } from "@/components/round/useGrade";
import { useFeedbackSound } from "@/components/AudioPrefs";
import { useSpeech } from "@/components/speech/useSpeech";
import { MicButton } from "@/components/speech/MicButton";
import { ClockFace } from "@/components/speech/ClockFace";
import { recordNumberGrades } from "@/app/actions";
import { VERDICT_CLASS, type Verdict } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import { heardAsSpelled } from "@/lib/speech/verdict";
import { core, type Hearing } from "@/lib/speech/reconcile";
import { CLOCK_LEMMA } from "@/lib/scenes/props";
import { EURO_LEMMA, markNumber, numberLemmas, wordsRecalled, type NumberItem, type NumberMark } from "@/lib/games/numbers";

export interface NumbersItem {
  readonly key: string;
  readonly item: NumberItem;
  /** The item in digits, as it is printed. */
  readonly shown: string;
  /** The digits TartuNLP reads it from, or null where its shape is shown and not played (D10). */
  readonly spoken: string | null;
}

/** What one answer came to. */
interface Answered {
  readonly mark: NumberMark;
  readonly verdict: Verdict;
  /** The number words this answer grades, Good, by lemma. */
  readonly graded: readonly string[];
  readonly said: boolean;
}

/**
 * ARVUD, PLAYED (docs/41-fifth-batch.md, VB-7).
 *
 * One thing at a time: a price tag, a clock face, a time on a timetable or a
 * number. The learner says it, or types it in words or digits, and the answer
 * is read by the scene parsers and compared with the number, never with a
 * spelling of it. Then the right answer is shown in digits and, where
 * TartuNLP was measured reading that shape well, played (D10).
 *
 * The microphone is always offered where speech is (D6), since saying it is
 * the task; without one, or with it refused, the round is a typed one and
 * nothing else changes. A spoken answer heard as spelled and right is marked
 * at once; anything else fills the box for the learner to check or change,
 * and is marked when they press Check (D4, D19). No clock runs (D9).
 *
 * WHAT IT GRADES. The number words a right answer recalled, Good, where the
 * learner holds the word's production card; a spoken word only where it was
 * heard as it is spelled and not repaired (D13), a typed word only where it
 * was spelled with its letters. A wrong answer, or one in digits, writes
 * nothing, so the round never grades down. The whole round is handed in once
 * at the end (`recordNumberGrades`), and a round left half way writes
 * nothing, which is ADR-016's rule for an abandoned round.
 */
export function NumbersSession({ items: initialItems, cardFor }: {
  items: readonly NumbersItem[];
  /** The learner's production card for each number word they hold, by lemma. */
  cardFor: Readonly<Record<string, string>>;
}) {
  const t = useT();
  const [items] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Answered[]>([]);
  const [sent, setSent] = useState(false);
  const queue = useQueueGrades();
  const look = useLookBack();
  const current = items[index];

  const graded = useMemo(() => [...new Set(results.flatMap((r) => r.graded))], [results]);
  // A word graded off an answer said aloud is written as spoken (D4); one typed, or said and edited, is not.
  const saidAloud = useMemo(() => new Set(results.filter((r) => r.said).flatMap((r) => r.graded)), [results]);

  const settled = useCallback((answer: Answered) => setResults((r) => [...r, answer]), []);

  const next = useCallback(() => {
    if (current) {
      const last = results[results.length - 1];
      look.record({
        of: current.key,
        label: "Arvud",
        question: current.shown,
        answer: current.shown,
        note: last?.mark.read && !last.mark.right ? fill(t("You said {said}."), { said: last.mark.read }) : null,
        questionLang: "en",
        answerLang: "en",
        speak: current.spoken,
      });
    }
    setIndex((i) => i + 1);
  }, [current, results, look, t]);

  // The round is handed in once, when it ends. A word is graded at most once a round.
  const finished = items.length > 0 && index >= items.length;
  useEffect(() => {
    if (!finished || sent) return;
    setSent(true);
    const rows = graded
      .map((lemma) => ({ cardId: cardFor[lemma], spoken: saidAloud.has(lemma) }))
      .filter((row): row is { cardId: string; spoken: boolean } => !!row.cardId)
      .map((row) => ({ id: crypto.randomUUID(), ...row }));
    if (rows.length === 0) return;
    void recordNumberGrades(rows)
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
      })
      .catch(() => queue(rows.map((row) => ({ id: row.id, cardId: row.cardId, rating: 3, durationMs: 0, reviewedAt: Date.now(), ...(row.spoken ? { spoken: true } : {}) }))));
  }, [finished, sent, graded, saidAloud, cardFor, queue]);

  if (items.length === 0) {
    return (
      <Page title="Arvud" lead={t("Prices, clock times and numbers, said out loud.")}>
        <Empty
          title={t("No numbers to say yet")}
          body={t("This opens once you've met the numbers. They're one of the first units of the course.")}
          action={<ButtonLink href="/learn" variant="primary">{t("Meet some words")}</ButtonLink>}
        />
      </Page>
    );
  }

  if (!current) {
    const right = results.filter((r) => r.mark.right).length;
    const aloud = results.filter((r) => r.said).length;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={{ color: "var(--ink)" }}>
            {right === results.length ? t("Every number right") : fill(t("{n} of {total} right"), { n: right, total: results.length })}
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
            {graded.length > 0
              ? fill(t("{n} number words counted toward your reviews."), { n: graded.filter((l) => cardFor[l]).length })
              : t("Answers in digits are marked but don't count toward your reviews. Say them, or type the words, and they do.")}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile value={right} label={t("Right")} tone="sky" />
          <StatTile value={aloud} label={t("Said out loud")} tone="accent" />
          <StatTile value={results.length} label={t("Numbers")} tone="butter" />
        </div>
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">{t("Back to Today")}</ButtonLink>
          <AnotherRound variant="primary" size="lg">{t("Another round")}</AnotherRound>
        </WayOut>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">Arvud</h1>
      <RoundProgress done={index} total={items.length} label={t("Session progress")} />
      {look.panel && <LookBackCard {...look.panel} />}
      <div hidden={look.looking}>
        <Card key={current.key} entry={current} onSettled={settled} onNext={next} />
      </div>
      {look.seen.length > 0 && (
        <div className="mt-4 flex justify-center">
          <LookBackButton {...look.button} disabled={look.looking} />
        </div>
      )}
    </div>
  );
}

/** Every number word and the two words a time and a price are said with, for the dictionary's repairs. */
const EXPECT: ReadonlySet<string> = new Set([
  CLOCK_LEMMA, EURO_LEMMA,
  ...Array.from({ length: 101 }, (_, n) => numberLemmas(n) ?? []).flat(),
]);

function Card({ entry, onSettled, onNext }: {
  entry: NumbersItem;
  onSettled: (answer: Answered) => void;
  onNext: () => void;
}) {
  const t = useT();
  const sound = useFeedbackSound();
  const [text, setText] = useState("");
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [live, setLive] = useState("");
  /** What speech put in the box, so Check can tell a spoken answer from one edited after. */
  const heardRef = useRef<Hearing | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { item } = entry;

  const settle = useCallback((answer: string, hearing: Hearing | null) => {
    const mark = markNumber(item, answer);
    let words = mark.right ? wordsRecalled(answer) : [];
    if (hearing) {
      // A spoken word grades only where it was heard as it is spelled and not repaired (D13, D19).
      const asSpelled = new Set(hearing.words.filter((w) => heardAsSpelled(w, EXPECT.has(core(w.text)))).map((w) => core(w.text)));
      words = words.filter((lemma) => asSpelled.has(lemma) || [...asSpelled].some((w) => w.startsWith(lemma)));
    }
    const verdict: Verdict = mark.right ? (mark.folded.length > 0 ? "nearly" : "right") : "wrong";
    sound(mark.right ? "right" : "wrong");
    setLive(mark.right
      ? fill(t("Right. {answer}."), { answer: entry.shown })
      : mark.read
        ? fill(t("You said {said}. It's {answer}."), { said: mark.read, answer: entry.shown })
        : fill(t("It's {answer}."), { answer: entry.shown }));
    const result: Answered = { mark, verdict, graded: words, said: hearing !== null };
    setAnswered(result);
    onSettled(result);
  }, [item, entry.shown, sound, t, onSettled]);

  const speech = useSpeech({
    endpoint: true,
    expect: EXPECT,
    onHeard: (hearing) => {
      if (answered) return;
      const said = hearing.understood.trim();
      if (!said) return;
      heardRef.current = hearing;
      setText(said);
      const mark = markNumber(item, said);
      const numberWords = hearing.words.filter((w) => EXPECT.has(core(w.text)) || /^euro/.test(core(w.text)));
      // Right and every number word heard as it is spelled: marked at once. Anything else waits in the box.
      if (mark.right && numberWords.length > 0 && numberWords.every((w) => heardAsSpelled(w, true))) settle(said, hearing);
      else inputRef.current?.focus();
    },
  });

  const check = useCallback(() => {
    if (answered || !text.trim()) return;
    const hearing = heardRef.current && heardRef.current.understood.trim() === text.trim() ? heardRef.current : null;
    settle(text, hearing);
  }, [answered, text, settle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!answered) return;
      if (e.target instanceof HTMLInputElement) return;
      if (isAdvanceKey(e)) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, onNext]);

  const prompt =
    item.kind === "count" ? t("Say the number.")
    : item.kind === "price" ? t("How much is it?")
    : item.face === "analog" ? t("What time is it on the clock?")
    : t("When does it leave?");

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
        <Chip tone="accent"><Hash size={12} aria-hidden /> Arvud</Chip>
        <span className="ml-auto text-xs" style={{ color: "var(--ink-3)" }}>
          {item.kind === "price" ? t("A price") : item.kind === "count" ? t("A number") : item.face === "analog" ? t("A clock") : t("A timetable")}
        </span>
      </div>

      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
        <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{prompt}</p>
        <Shown entry={entry} label={t("A clock showing {time}")} />

        {!answered ? (
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <MicButton speech={speech} label={t("Say it out loud")} shortcut size="lg" />
            <div className="w-full text-left">
              <EstonianInput
                value={text}
                onChange={(next) => {
                  setText(next);
                }}
                id="number-answer"
                ariaLabel={t("Your answer, in words or digits")}
                placeholder={t("Or type it")}
                inputRef={inputRef}
                onEnter={check}
                large
              />
            </div>
          </div>
        ) : (
          <div className={`${VERDICT_CLASS[answered.verdict]} verdict-panel pop-in w-full max-w-md text-left`} data-numbers-verdict={answered.verdict}>
            <p className="font-semibold">
              {answered.mark.right
                ? answered.verdict === "nearly"
                  ? t("Right number. Mind the letters: the word has an õ, ä, ö or ü in it.")
                  : t("Right.")
                : answered.mark.read
                  ? fill(t("You said {said}."), { said: answered.mark.read })
                  : t("That wasn't a number we could read.")}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <span>{fill(t("It's {answer}."), { answer: entry.shown })}</span>
              {entry.spoken && (
                <Speak
                  text={entry.spoken}
                  autoplay
                  size={16}
                  label={t("Hear it said")}
                  className="press flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                />
              )}
            </p>
            {item.kind === "clock" && item.face === "analog" && (
              <p className="mt-1 text-sm">
                {fill(t("A clock face has no afternoon, so {morning} and {afternoon} both count."), {
                  morning: `${String(item.hour % 12).padStart(2, "0")}:${String(item.minute).padStart(2, "0")}`,
                  afternoon: `${(item.hour % 12) + 12}:${String(item.minute).padStart(2, "0")}`,
                })}
              </p>
            )}
            {answered.mark.right && answered.graded.length === 0 && (
              <p className="mt-1 text-sm">{t("In digits, so no word was practised. Say it or type the words next time.")}</p>
            )}
          </div>
        )}
        <p className="sr-only" aria-live="polite">{live}</p>
      </div>

      <div className="flex items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
        {answered ? (
          <Button variant="primary" size="lg" className="w-full" onClick={onNext} autoFocus>
            {t("Continue")}
            <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        ) : (
          <Button variant="primary" size="lg" className="w-full" onClick={check} disabled={!text.trim()}>
            {t("Check")}
            <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
          </Button>
        )}
      </div>
    </div>
  );
}

/** The thing to say: a tag, a face, a timetable line or a number. Digits only (D10). */
function Shown({ entry, label }: { entry: NumbersItem; label: string }) {
  const { item } = entry;
  if (item.kind === "clock" && item.face === "analog") {
    return <ClockFace hour={item.hour} minute={item.minute} label={fill(label, { time: entry.shown })} />;
  }
  if (item.kind === "clock") {
    return (
      <p className="numbers-board font-display text-4xl font-bold tabular-nums" data-shown={entry.shown}>
        {entry.shown}
      </p>
    );
  }
  if (item.kind === "price") {
    return (
      <p className="numbers-tag font-display text-4xl font-bold tabular-nums" data-shown={entry.shown}>
        {entry.shown}
      </p>
    );
  }
  return (
    <p className="numbers-count font-display text-5xl font-bold tabular-nums" style={{ color: "var(--ink)" }} data-shown={entry.shown}>
      {entry.shown}
    </p>
  );
}
