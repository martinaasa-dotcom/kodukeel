"use client";

import { createRef, useMemo, useRef, useState, type RefObject } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { EstonianInput } from "@/components/EstonianInput";
import { Chip, KeyCap, Stat } from "@/components/ui";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { SENTENCES_PER_PICTURE } from "@/lib/collections/pictures";
import { looksLikeSentence } from "@/lib/estonian/writing";
import type { PictureMark, SentenceMark } from "@/lib/games/picture";
import type { GradedPicture } from "@/lib/tutor/grader";
import type { WithholdReason } from "@/lib/tutor/verify";
import { ADVANCE_KEY_GLYPH } from "@/lib/ux/advanceKey";
import { VERDICT_CLASS, verdictOfCredit, type Verdict } from "@/lib/ux/verdict";
import { useLocale, useT } from "@/components/Locale";
import { fill, type Locale } from "@/lib/copy/locale";
import { quoted } from "@/lib/copy/values";

export interface PicturePrompt {
  pictureId: string;
  title: string;
  /** The scene, a row of emoji at a time. */
  rows: string[];
  /** What is drawn, in English, for a reader who cannot see it. */
  alt: string;
  /** A model sentence about this picture, shown before the learner writes. */
  example: { et: string; en: string };
}

interface Reveal {
  things: { emoji: string; lemma: string; translation: string; used: boolean }[];
  example: { et: string; en: string };
}

interface Marked {
  mark: PictureMark;
  reveal: Reveal;
  graded: GradedPicture | null;
  aiAvailable: boolean;
  quotaMessage?: string;
  withheld?: string[];
  withheldReason?: WithholdReason | null;
}

/** A box is done when it holds a sentence, which is what lets the learner move on. */
const filled = (text: string) => looksLikeSentence(text.trim());

/**
 * Five boxes about one picture.
 *
 * The learner cannot check until every box holds a sentence, and the screen
 * says how many do, so there is never a question of whether the round counted
 * what they wrote. What comes back is two authorities that stay apart, the
 * arrangement `/review/write` settled on: what the dictionary can decide
 * (spelled, about the picture, not a repeat) is certain, and what Anu says
 * about the grammar is a model's opinion and is labelled as one.
 *
 * NOTHING IS GRADED INTO THE REVIEW LOG. There is no card behind a picture,
 * and a row about a card that does not exist would tell the scheduler
 * something that did not happen.
 */
export function DescribeSession({ prompts: initialPrompts, aiAvailable }: {
  prompts: PicturePrompt[]; aiAvailable: boolean;
}) {
  /*
    Snapshotted once, so a re-render of the route cannot change the picture
    under somebody who is mid-sentence.
  */
  const [prompts] = useState(initialPrompts);
  const t = useT();
  const [index, setIndex] = useState(0);
  const [texts, setTexts] = useState<string[]>(() => Array.from({ length: SENTENCES_PER_PICTURE }, () => ""));
  const [busy, setBusy] = useState(false);
  const [marked, setMarked] = useState<Marked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState(0);
  const [written, setWritten] = useState(0);
  const startedAt = useRef(Date.now());
  const inputs = useMemo<RefObject<HTMLInputElement | null>[]>(
    () => Array.from({ length: SENTENCES_PER_PICTURE }, () => createRef<HTMLInputElement>()),
    [],
  );

  const prompt = prompts[index];
  const finished = !prompt;
  /* The way back to the picture before this one. See `lib/ux/lookBack.ts`. */
  const look = useLookBack();

  const done = texts.filter(filled).length;
  const ready = done === SENTENCES_PER_PICTURE;

  async function submit() {
    if (!prompt || busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pictureId: prompt.pictureId, sentences: texts.map((t) => t.trim()) }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body.index === "number"
          ? fill(t("Sentence {n} needs at least three words."), { n: body.index + 1 })
          : body.error ? t(body.error) : t("Sorry, we couldn't mark that one. Try again?"));
        return;
      }
      const result = body as Marked;
      setMarked(result);
      setSound((n) => n + result.mark.sound);
      setWritten((n) => n + SENTENCES_PER_PICTURE);
    } catch {
      setError(t("You're offline, so we can't mark it yet. Your sentences are safe here."));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (prompt) {
      look.record({
        of: prompt.pictureId,
        label: t(prompt.title),
        question: t(prompt.alt),
        answer: texts.map((t) => t.trim()).join(" "),
        note: null,
        questionLang: "en",
        answerLang: "et",
        speak: null,
      });
    }
    setMarked(null);
    setTexts(Array.from({ length: SENTENCES_PER_PICTURE }, () => ""));
    setError(null);
    setIndex((i) => i + 1);
    // The first box of the next picture, once it has rendered.
    queueMicrotask(() => inputs[0]?.current?.focus());
  }

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          {t("That’s the round done")}
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
          {t("Describing what’s in front of you is as close to real talking as a screen gets.")}
        </p>
        <div
          className="mt-8 grid grid-cols-3 gap-6 rounded-lg border p-6"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
        >
          <Stat value={written} label={t("Sentences")} />
          <Stat value={sound} label={t("Spelled and on topic")} />
          <Stat value={fill(t("{n}m"), { n: minutes })} label={t("Time")} />
        </div>
        <WayOut className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/review/describe">{t("Another round")}</ButtonLink>
          <ButtonLink href="/" variant="primary">{t("Back to Today")}</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const last = index === prompts.length - 1;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      {/* The heading a session screen has no room to draw. */}
      <h1 className="sr-only">{t("Say what you see")}</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession size={19} />
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(index / prompts.length) * 100}%`, background: "var(--accent)" }}
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={prompts.length}
            aria-label={t("Round progress")}
          />
        </div>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {fill(t("{n} left"), { n: prompts.length - index })}
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent">{t(prompt.title)}</Chip>
          <span className="tnum ml-auto text-xs" style={{ color: "var(--ink-3)" }}>
            {fill(t("Picture {n} of {total}"), { n: index + 1, total: prompts.length })}
          </span>
        </div>

        <div className="round-pad px-6">
          {/*
            THE PICTURE. Emoji laid out as a scene, on the lavender the rest of
            the app calls its own, so it reads as a picture rather than a row
            of icons. Decoration in the sense a photograph on a worksheet is:
            the meaning reaches a reader who cannot see it through the English
            sentence, never through alt text naming Estonian words.
          */}
          <div
            className="rounded-[var(--r-lg)] px-3 py-5 text-center"
            style={{ background: "var(--accent-soft)" }}
          >
            <p className="sr-only">{t(prompt.alt)}</p>
            <div aria-hidden className="flex flex-col items-center gap-1.5" style={{ fontSize: "clamp(34px, 11vw, 52px)", lineHeight: 1.15 }}>
              {prompt.rows.map((row, i) => (
                <div key={i} className="whitespace-nowrap">{row}</div>
              ))}
            </div>
          </div>

          <p className="mt-5 text-base font-semibold" style={{ color: "var(--ink)" }}>
            {t("Write five sentences about this picture.")}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {t("Say what you see and what might be going on. Use your imagination: who are they, what are they doing?")}
          </p>

          <div
            className="mt-4 rounded-[var(--r)] border px-4 py-3"
            style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
          >
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("An example of the kind of sentence we mean")}</p>
            <p lang="et" className="mt-1.5 text-md font-semibold" style={{ color: "var(--ink)" }}>{prompt.example.et}</p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--ink-3)" }}>{t(prompt.example.en)}</p>
          </div>

          <ol
            className="mt-5 flex flex-col gap-2.5"
            aria-label={t("Your five sentences")}
            onKeyDown={(e) => {
              // Anywhere in the five boxes, as the button under them says.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); }
            }}
          >
            {texts.map((text, i) => {
              const sentenceMark = marked?.mark.sentences[i];
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="tnum mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: filled(text) ? "var(--good-soft)" : "var(--raised)",
                      color: filled(text) ? "var(--good-ink)" : "var(--ink-3)",
                    }}
                  >
                    {filled(text) ? <Check size={13} /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <EstonianInput
                      bar={false}
                      id={`sentence-${i + 1}`}
                      ariaLabel={fill(t("Sentence {n} of {total}"), { n: i + 1, total: SENTENCES_PER_PICTURE })}
                      inputRef={inputs[i]}
                      value={text}
                      autoFocus={i === 0}
                      disabled={!!marked || busy}
                      placeholder={`${i + 1}.`}
                      onChange={(next) => setTexts((t) => t.map((v, j) => (j === i ? next : v)))}
                      onEnter={() => {
                        const following = inputs[i + 1]?.current;
                        if (following) following.focus();
                        else if (ready) void submit();
                      }}
                    />
                    {sentenceMark && marked && (
                      <SentenceFeedback
                        mark={sentenceMark}
                        note={marked.graded?.sentences[i]}
                        graded={marked.graded !== null}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {!marked && <div className="under-field"><DiacriticBar standalone={false} fallbackRef={inputs[0]} /></div>}

          {error && (
            <p role="alert" className="mt-3 text-sm" style={{ color: "var(--again-ink)" }}>{error}</p>
          )}

          {marked && <Summary marked={marked} aiAvailable={aiAvailable} />}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          {!marked ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                className="w-full py-3"
                disabled={busy || !ready}
                onClick={() => void submit()}
              >
                {busy
                  ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Marking…")}</>
                  : <>{t("Check my sentences")} <KeyCap className="ml-1">{`⌘ ${ADVANCE_KEY_GLYPH}`}</KeyCap></>}
              </Button>
              <p className="text-center text-xs" style={{ color: "var(--ink-3)" }} aria-live="polite">
                {ready ? t("All five written. Ready when you are.") : fill(t("{done} of {total} written. Each one needs at least three words."), { done, total: SENTENCES_PER_PICTURE })}
              </p>
            </div>
          ) : (
            <Button variant="primary" className="w-full py-3" onClick={next} autoFocus>
              {last ? t("Finish") : t("Next picture")}
            </Button>
          )}
        </div>
      </div>
      )}

      <div className="mt-4 flex justify-center text-2xs" style={{ color: "var(--ink-3)" }}>
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}

/** How a sentence stood, in the palette's three words. */
function verdictFor(mark: SentenceMark, note: { verdict: "correct" | "almost" | "wrong" } | undefined): Verdict {
  if (!mark.sound) return "wrong";
  if (!note) return "right";
  return verdictOfCredit(note.verdict === "correct" ? 1 : note.verdict === "almost" ? 0.5 : 0);
}

/** What is said under one box once the five are marked. */
function SentenceFeedback({ mark, note, graded }: {
  mark: SentenceMark;
  note: { verdict: "correct" | "almost" | "wrong"; comment: string; rule: string } | undefined;
  graded: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const verdict = verdictFor(mark, note);
  const lines: string[] = [];
  if (!mark.isSentence) lines.push(t("That's not quite a sentence yet. Try three words or more."));
  if (mark.unknown.length > 0) {
    lines.push(
      fill(t("We couldn't find {words} in the dictionary. Check the spelling, and the {letters}."), {
        words: mark.unknown.map((w) => quoted(w, locale)).join(", "),
        letters: fill(t("{a}, {b}, {c} and {d}"), { a: "õ", b: "ä", c: "ö", d: "ü" }),
      }),
    );
  }
  if (mark.repeated) lines.push(t("You already wrote this one. Try saying something different about the picture."));
  if (mark.isSentence && mark.mentions.length === 0) {
    lines.push(t("We couldn't match this to anything in the picture. Name something you can see: a person, an animal or an object."));
  }
  if (mark.sound && !note && !graded) lines.push(t("Every word is spelled right and it's about the picture."));
  const Icon = verdict === "right" ? Check : CircleAlert;

  return (
    <div className={`${VERDICT_CLASS[verdict]} verdict-panel mt-2 flex items-start gap-2.5`} aria-live="polite">
      <Icon size={15} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {note?.comment && <p>{note.comment}</p>}
        {note?.rule && <p className="mt-1">{note.rule}</p>}
        {lines.map((line) => <p key={line} className={note?.comment ? "mt-1" : undefined}>{line}</p>)}
        {!mark.tidy && mark.isSentence && (
          <p className="mt-1">{t("Start with a capital letter and finish with a period.")}</p>
        )}
        {!note?.comment && lines.length === 0 && mark.tidy && <p>{t("Spelled right and about the picture.")}</p>}
      </div>
    </div>
  );
}

/**
 * What went well, what to work on, and what was in the picture.
 *
 * The first two come from the model where there is one and from the counts
 * where there is not, so the learner is never left with a score and no
 * direction. The things in the picture are told last, with the ones they used
 * ticked, because naming them beforehand would have been most of the
 * exercise.
 */
function Summary({ marked, aiAvailable }: { marked: Marked; aiAvailable: boolean }) {
  const t = useT();
  const locale = useLocale();
  const { mark, reveal, graded, quotaMessage, withheld, withheldReason } = marked;
  const total = mark.sentences.length;

  const spelling = mark.sentences.filter((s) => s.unknown.length > 0).length;
  const offTopic = mark.sentences.filter((s) => s.isSentence && s.mentions.length === 0).length;
  const repeated = mark.sentences.filter((s) => s.repeated).length;
  const untidy = mark.sentences.filter((s) => s.isSentence && !s.tidy).length;

  const wentWell = graded?.wentWell
    || (mark.sound > 0
      ? fill(t("{n} of your {total} sentences are spelled right and about the picture."), { n: mark.sound, total })
      : t("You wrote all five, which is the hardest part to start."));
  const workOn = graded?.workOn
    || [
      spelling > 0 ? sentencesLine(locale, t, spelling, "spelling") : "",
      offTopic > 0 ? sentencesLine(locale, t, offTopic, "topic") : "",
      repeated > 0 ? t("Saying something new in each sentence.") : "",
      untidy > 0 ? t("A capital at the start and a period at the end.") : "",
    ].filter(Boolean).join(" ");

  return (
    <div className="mt-6 flex flex-col gap-3" aria-live="polite">
      <div className="rounded-md border px-3.5 py-3" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
        <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("What went well")}</p>
        <p className="mt-1.5 text-base" style={{ color: "var(--ink)" }}>{wentWell}</p>
        {workOn && (
          <>
            <p className="label-xs mt-3" style={{ color: "var(--ink-3)" }}>{t("What to work on")}</p>
            <p className="mt-1.5 text-base" style={{ color: "var(--ink)" }}>{workOn}</p>
          </>
        )}
        {graded && <p className="mt-3 text-xs" style={{ color: "var(--ink-3)" }}>{t("Notes from Anu. The spelling and picture checks come from the dictionary.")}</p>}
      </div>

      <div className="rounded-md border px-3.5 py-3" style={{ borderColor: "var(--rule)", background: "var(--raised)" }}>
        <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("What was in the picture")}</p>
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {reveal.things.map((thing) => (
            <li key={thing.lemma} className="flex items-baseline gap-2 text-base">
              <span aria-hidden className="text-lg leading-none">{thing.emoji}</span>
              <strong lang="et" style={{ color: "var(--ink)" }}>{thing.lemma}</strong>
              <span style={{ color: "var(--ink-3)" }}>{thing.translation}</span>
              {thing.used && <Check size={13} aria-label={t("you used this one")} style={{ color: "var(--good-ink)" }} />}
            </li>
          ))}
        </ul>
      </div>

      {withheld && withheld.length > 0 && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {withheldReason === "unvouched-word"
            ? t("We hid one of Anu's notes. It used a word we couldn't confirm as Estonian. The spelling check comes from the dictionary, so you can trust that.")
            : t("We hid one of Anu's notes. It used an Estonian form we couldn't confirm, and a wrong form is worse than no note. The spelling check comes from the dictionary, so you can trust that.")}
        </p>
      )}
      {!aiAvailable && !graded && (
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {quotaMessage ? t(quotaMessage) : t("Anu isn't around right now, so we only checked spelling and whether each sentence is about the picture. Word order and endings need her.")}
        </p>
      )}
    </div>
  );
}

/**
 * "Spelling: 2 sentences had a word we couldn't find." English keeps the line
 * it always printed; Russian and Ukrainian get the count in its own plural.
 */
function sentencesLine(locale: Locale, t: (english: string) => string, n: number, which: "spelling" | "topic"): string {
  if (locale === "en") {
    const s = `${n} sentence${n === 1 ? "" : "s"}`;
    return which === "spelling"
      ? `Spelling: ${s} had a word we couldn't find.`
      : `Staying on the picture: ${s} didn't name anything in it.`;
  }
  return fill(t(which === "spelling"
    ? "Spelling: sentences with a word we couldn't find: {n}."
    : "Staying on the picture: sentences that named nothing in it: {n}."), { n });
}
