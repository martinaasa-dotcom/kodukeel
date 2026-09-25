"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGrade } from "@/components/round/useGrade";
import { Check, Ear, Loader2, Volume2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { Chip, KeyCap, Stat } from "@/components/ui";
import { Speak } from "@/components/Speak";
import { playClip } from "@/lib/audio/clip";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { VOICES } from "@/lib/audio/voice";
import { OPTION_CLASS, VERDICT_INK, optionState } from "@/lib/ux/verdict";
import { ADVANCE_KEY_GLYPH, isAdvanceKey } from "@/lib/ux/advanceKey";
import { EndSession, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";

export interface PairQuestion {
  /** The form that is actually played. */
  heard: string;
  /** The card this practices, when the word heard is already in the deck. */
  cardId: string | null;
  options: { value: string; lemma: string; translation: string; formLabel: string }[];
  sameWord: boolean;
  longer: string;
  letter: string | null;
}

/**
 * Hear one of two words that differ only in the length of a sound, and say which.
 *
 * This is the drill the app could not offer before, for a reason worth stating:
 * the distinction it teaches is one Estonian *writing* only half records, so no
 * amount of reading practice conveys it. It only became possible because the
 * speech proxy already existed and was already verified end to end.
 */
export function PairsSession({ questions: initialQuestions }: { questions: PairQuestion[] }) {
  const grade = useGrade();
  /*
    Snapshotted once on mount, never updated from later props. gradeCard() is a
    Server Action and Next refreshes this route's Server Component after every
    call, which hands down a freshly computed question set: the word under the
    learner's feedback would change while they were still reading it. The set
    the page found on first load is the only one this session should know
    about. ReviewSession froze its queue for the same reason; these four modes
    started grading in this change and inherited the hazard with it.
  */
  const [questions] = useState(initialQuestions);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  /*
    The browser would not autoplay, which is a fact about the gesture and not
    about the audio. Separate from `audioFailed` because the two want opposite
    screens: one is "there is nothing to hear", the other is "press the button
    that is already on this page".
  */
  const [needsPress, setNeedsPress] = useState(false);
  const startedAt = useRef(Date.now());

  const question = questions[index];
  /* The way back to the pair before this one. See `lib/ux/lookBack.ts`. */
  const look = useLookBack();
  const finished = !question;
  const revealed = picked !== null;

  /*
    A different reader for each pair, walked from a random start the way the
    listening round does it. A length contrast learned in one voice is that
    voice's contrast; the point of the drill is to hear it from anybody. The
    room and the rate stay clean here on purpose: this round is about a
    difference one consonant long, and café noise would take away the very
    thing it asks about.
  */
  const prefs = useAudioPrefs();
  const [voiceStart] = useState(() => Math.floor(Math.random() * VOICES.length));
  const voice = VOICES[(voiceStart + index) % VOICES.length]?.id ?? prefs.voice;
  // How fast this learner hears Estonian (lib/audio/pace.ts). A dependency of
  // the play below rather than read inside it, so a learner who changes it
  // mid-round gets the new pace on the next word rather than on the next visit.
  const pace = prefs.pace;
  const play = useCallback(async (text: string, slow = false, unasked = false) => {
    try {
      setPlaying(true);
      /*
        Shared with `Speak` rather than a ref of its own. A ref's clips became
        unreachable when the round ended and were still held by the browser,
        because nothing revoked them: a listening round meets a dozen new
        words a minute and every one of them stayed. `fetchClip` is the one
        reader of that cache and the one place the key is built.
      */
      const outcome = await playClip({ text, slow, voice, pace }, { unasked });
      setNeedsPress(outcome === "blocked");
    } catch {
      /*
        AN AUTOPLAY THAT FAILED IS NOT A CLIP THAT IS GONE, which the comment
        above already argues for the blocked case and did not carry all the
        way through: a thrown error on the unasked play, a cold start or a
        slow first round trip to TartuNLP rather than a refused gesture,
        still ended the whole drill on a word nobody had pressed anything
        for. `needsPress` puts the same manual button back that the blocked
        case already draws, so a real press gets a real try rather than a
        screen blaming the connection over one unlucky autoplay.
      */
      if (unasked) setNeedsPress(true);
      else setAudioFailed(true);
    } finally {
      setPlaying(false);
    }
  }, [voice, pace]);

  /*
    Play as soon as the question appears: this is a listening drill, and making
    someone press play before every item is friction with no purpose.

    `unasked` is what stops that being the end of the drill. Every browser
    refuses a gesture-less `play()` and every phone is that case on arrival, so
    this call catching it as a failure replaced the whole round with a screen
    blaming the connection, on the platform this app is measured on. It asks
    for a press instead, on the button that was already there.
  */
  useEffect(() => {
    if (!question) return;
    void play(question.heard, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const choose = useCallback((value: string) => {
    if (!question || picked) return;
    setPicked(value);
    const right = value.toLowerCase() === question.heard.toLowerCase();
    if (right) setCorrect((c) => c + 1);
    // ADR-016: the same review log as every other mode.
    if (question.cardId) void grade(question.cardId, right ? 3 : 1, 0);
  }, [question, picked, grade]);

  const next = useCallback(() => {
    /* Which of the two was actually played, which is the one thing a learner
       wants back on a round they cannot re-read: the panel plays it again. */
    if (question) {
      const heard = question.options.find((o) => o.value === question.heard);
      look.record({
        of: question.cardId ?? question.heard,
        label: "Minimal pairs",
        question: question.options.map((o) => o.value).join("  ·  "),
        answer: question.heard,
        note: heard ? `${heard.lemma}, ${heard.translation}` : null,
        questionLang: "et",
        answerLang: "et",
        speak: question.heard,
      });
    }
    setPicked(null);
    setIndex((i) => i + 1);
  }, [question, look]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || !question) return;
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e)) { e.preventDefault(); look.forward(); }
        return;
      }
      if (e.key.toLowerCase() === "b" && look.seen.length > 0) { e.preventDefault(); look.open(); return; }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); void play(question.heard); return; }
      if (revealed && isAdvanceKey(e)) { e.preventDefault(); next(); return; }
      if (revealed) return;
      const option = question.options[Number(e.key) - 1];
      if (option) { e.preventDefault(); choose(option.value); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, question, revealed, choose, next, play, look]);

  if (audioFailed) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
          No audio, no drill
        </h1>
        <p className="mx-auto mt-2 max-w-[44ch] text-base" style={{ color: "var(--ink-2)" }}>
          This exercise is all about what a word sounds like, so without audio there&rsquo;s nothing
          to show you. It needs a connection to work.
        </p>
        <WayOut className="mt-6 flex justify-center">
          <ButtonLink href="/" variant="primary">Back to Today</ButtonLink>
        </WayOut>
      </div>
    );
  }

  if (finished) {
    const accuracy = Math.round((correct / questions.length) * 100);
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          Round complete
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--ink-2)" }}>
          In Estonian, length changes the word: <span lang="et">maja</span> and{" "}
          <span lang="et">majja</span> are different words, not the same word said twice. Ears take
          longer than eyes.
        </p>
        <div
          className="mt-8 grid grid-cols-3 gap-6 rounded-lg border p-6"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
        >
          <Stat value={questions.length} label="Heard" />
          <Stat value={`${accuracy}%`} label="Right" tone={VERDICT_INK[accuracy >= 80 ? "right" : "nearly"]} />
          <Stat value={`${minutes}m`} label="Time" />
        </div>
        <WayOut className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/review/pairs">Another round</ButtonLink>
          <ButtonLink href="/" variant="primary">Back to Today</ButtonLink>
        </WayOut>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      {/* The heading a session screen has no room to draw. Same line as every
          other mode: the start screen and the finished screen each carry one
          and the round itself did not. */}
      <h1 className="sr-only">Minimal pairs</h1>
      <div className="mb-6 flex items-center justify-between gap-4">
        <EndSession size={19} />
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(index / questions.length) * 100}%`, background: "var(--accent)" }}
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-label="Round progress"
          />
        </div>
        <span className="tnum text-sm" style={{ color: "var(--ink-3)" }}>
          {questions.length - index} left
        </span>
      </div>

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent"><Ear size={12} aria-hidden /> Which did you hear?</Chip>
          {question.sameWord && <Chip>same word, two cases</Chip>}
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-10">
          <button
            type="button"
            onClick={() => void play(question.heard)}
            disabled={playing}
            // The same correction as the hint below, and the one that matters
            // more: a screen reader announces this button and nothing else on
            // the card, so "Play again" before anything has played is the only
            // thing that reader is told.
            aria-label={needsPress ? "Play the word" : "Play again"}
            className="press flex h-20 w-20 items-center justify-center rounded-full transition-ui hover:scale-[1.02] disabled:hover:scale-100"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {playing
              ? <Loader2 size={30} className="animate-spin" aria-hidden />
              : <Volume2 size={30} aria-hidden />}
          </button>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            {/* "Play again" is a lie before anything has played, which is
                every arrival on a browser that blocks autoplay. */}
            {needsPress ? "Tap to hear it" : "Play again"} <KeyCap>R</KeyCap> · or hear it{" "}
            <span className="inline-flex items-center align-middle">
              <Speak text={question.heard} slow voice={voice} label="Hear it slowly" />
            </span>{" "}
            slowly
          </p>
        </div>

        <div className="px-4 pb-4">
          {/* `choice-grid` rather than `sm:grid-cols-2`: at 768 two columns
              gave "seitsetteist" 101px of the 115 it needs, drawn across two
              lines. See the class in app/globals.css. */}
          <div className="choice-grid">
            {question.options.map((option, i) => {
              const isAnswer = option.value.toLowerCase() === question.heard.toLowerCase();
              const isPicked = option.value === picked;
              /*
                Once revealed, the shared vocabulary paints the option
                (lib/ux/verdict.ts). The ink, not the hue: `--good` set as
                text on `--good-soft` measures 2.23:1 on the light theme and
                `--again` on its own tint 2.50:1, which is what the token block
                in globals.css says will happen. Four screens had written that
                by hand before the classes existed, which is why they exist.
              */
              const state = revealed ? OPTION_CLASS[optionState(isAnswer, isPicked)] : "";

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={revealed}
                  onClick={() => choose(option.value)}
                  className={`choice-btn ${state} flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left disabled:cursor-default`}
                  style={revealed ? undefined : { "--choice-bg": "var(--raised)", color: "var(--ink)" } as React.CSSProperties}
                >
                  {/* Neither of these fades any more. The key hint is one
                      character, which axe declines to rule on, and it measured
                      1.62 to 4.12; the gloss under the word measured 1.90 to
                      3.85 once the tone above it was corrected. */}
                  <KeyCap>{i + 1}</KeyCap>
                  <span className="min-w-0">
                    <span lang="et" className="block text-lg font-semibold">{option.value}</span>
                    <span className="block text-xs">
                      {option.formLabel} of {option.lemma} · {option.translation}
                    </span>
                  </span>
                  {revealed && isAnswer && <Check size={16} className="ml-auto shrink-0" aria-label="Right" />}
                </button>
              );
            })}
          </div>
        </div>

        {revealed && (
          <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {question.letter
                ? <>The two only differ in how long the <strong lang="et">{question.letter}</strong> sounds.
                    The doubled spelling, <strong lang="et">{question.longer}</strong>, is the longer one.</>
                : <>The two only differ in length.</>}
              {question.sameWord && " Both are forms of the same word. Here the length shows the grammar, not a different meaning."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {question.options.map((o) => (
                <span key={o.value} className="flex items-center gap-1.5">
                  <span lang="et" className="text-base" style={{ color: "var(--ink)" }}>{o.value}</span>
                  <Speak text={o.value} voice={voice} />
                </span>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={next} autoFocus>
                Next <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      {/*
        The verdict in words, in a region that is on the page before there is
        anything to say. The panel under the card used to carry `aria-live`
        itself and arrived with the reveal, so its first words were never read
        out, and none of them said whether the pick was right.
      */}
      <p className="sr-only" role="status">
        {revealed && question && (
          picked?.toLowerCase() === question.heard.toLowerCase()
            ? "Right."
            : <>Not this time. It was <span lang="et">{question.heard}</span>.</>
        )}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs" style={{ color: "var(--ink-3)" }}>
        <span>{correct}/{index + (revealed ? 1 : 0)} right · keys 1 to 2 to answer</span>
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}
