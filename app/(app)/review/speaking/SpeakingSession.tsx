"use client";

import { EnterKeyCap } from "@/components/KeyCaps";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnotherRound } from "@/components/round/AnotherRound";
import { useGrade } from "@/components/round/useGrade";
import { Headphones, Mic, Pause, Play, Volume2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { Recorder } from "@/components/Recorder";
import { Chip, Empty, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { SpeakPair } from "@/components/Speak";
import { StarWord } from "@/components/StarWord";
import { EstonianInput } from "@/components/EstonianInput";
import { GapMeaning } from "@/components/GapMeaning";
import { useResumeCard } from "@/components/useResumeCard";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { useOffline } from "@/components/OfflineProvider";
import { MicButton } from "@/components/speech/MicButton";
import { useSpeech } from "@/components/speech/useSpeech";
import { useSpokenBox } from "@/components/speech/SpokenBox";
import { inEditable, isAdvanceKey } from "@/lib/ux/advanceKey";
import { VERDICT_CLASS, verdictOfCheck } from "@/lib/ux/verdict";
import { FullEntry, WayOut } from "@/components/round/RoundExit";
import { RoundProgress } from "@/components/round/RoundProgress";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { gapMeaning } from "@/lib/copy/gapMeaning";
import { lineWords, lightUp, shareLit } from "@/lib/speech/lightUp";
import { core } from "@/lib/speech/reconcile";
import { playClip, playHeard, untilQuiet } from "@/lib/audio/clip";
import type { AnswerCheck } from "@/lib/estonian/answer";
import {
  acceptedFor, checkSpoken, ratingFor, spokenVerdict, stepsFor, type SpeakingItem, type SpeakingStep,
} from "@/lib/games/speaking";

/**
 * SAY IT OUT LOUD, THREE WAYS, AND HEAR WHAT CAME ACROSS (docs/41-fifth-batch.md VB-5).
 *
 * Each line is said along with a native recording, then said back from the
 * recording alone, then said from its English meaning, which is the one step
 * that is a recall and the one that may grade. What the recognizer heard is
 * shown in words and can be read back in a native voice; it says which words
 * came across and never how a sound was made (ADR-028). A recall heard as
 * spelled grades the word's production card Good; anything else fills the
 * box, and Check marks it as a typed answer would; a miss writes nothing,
 * because a machine's mishearing may not send a card back to the start
 * (`lib/games/speaking.ts`).
 *
 * Every step works with the microphone denied: the line can be said with
 * nobody listening and the steps moved on with a press, and the recall is
 * typed into the same box (section 3).
 *
 * HANDS-FREE runs the first two steps over the whole round with nothing to
 * press: the recording plays, the microphone opens when it ends (D14), what
 * was heard lights the line, and it moves on. Nothing is graded, because
 * nothing is recalled. The screen is kept awake, because mobile Safari takes
 * the microphone away from a page whose screen has locked; on a computer the
 * tab keeps listening in the background, and a headset's buttons pause and
 * skip through Media Session.
 */
export function SpeakingSession({ items: initialItems }: { items: SpeakingItem[] }) {
  const grade = useGrade();
  const t = useT();
  const { voice, pace } = useAudioPrefs();
  const { online } = useOffline();
  const [items] = useState(initialItems);
  const { initialIndex, remember: rememberCard } = useResumeCard(initialItems.map((c) => ({ id: c.key })));
  const [index, setIndex] = useState(initialIndex);
  const [stepAt, setStepAt] = useState(0);
  const [handsFree, setHandsFree] = useState(false);
  const [paused, setPaused] = useState(false);
  const [said, setSaid] = useState(0);
  const [recalled, setRecalled] = useState(0);
  const startedAt = useRef(Date.now());
  const shownAt = useRef(Date.now());

  const item = items[index];
  const steps = stepsFor(handsFree);
  const step: SpeakingStep = steps[Math.min(stepAt, steps.length - 1)]!;
  const finished = !item;
  const look = useLookBack();

  useEffect(() => { rememberCard(item ? { id: item.key } : undefined); }, [rememberCard, item]);

  /* What the shadowing steps heard, as text and as the model's own reading. */
  const [lit, setLit] = useState<{ understood: string; heard: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const words = useMemo(() => (item ? lineWords(item.et) : []), [item]);
  const expect = useMemo(() => new Set(words.map((w) => core(w.text)).filter(Boolean)), [words]);

  /* The recall: a box the microphone or the keyboard fills, marked on Check. */
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<AnswerCheck | null>(null);
  const [graded, setGraded] = useState<"good" | "hard" | "none" | null>(null);
  const accepted = useMemo(() => (item ? acceptedFor(item) : []), [item]);

  const moveOn = useRef<() => void>(() => {});
  const handsFreeRef = useRef(false);
  handsFreeRef.current = handsFree && !paused;
  /* What hands-free could not do, said rather than stopping silently (VB-5's trip hazards). */
  const [wakeRefused, setWakeRefused] = useState(false);
  const [backgroundStop, setBackgroundStop] = useState(false);

  const shadow = useSpeech({
    endpoint: true,
    expect,
    onHeard: (hearing) => {
      setLit({ understood: hearing.understood, heard: hearing.heard });
      setRevealed(true);
      setSaid((n) => n + 1);
      if (handsFreeRef.current) setTimeout(() => moveOn.current(), HANDS_FREE_PAUSE_MS);
    },
    onNothing: () => {
      if (handsFreeRef.current) setTimeout(() => moveOn.current(), HANDS_FREE_PAUSE_MS);
    },
  });

  const writeGrade = useCallback(async (rating: 2 | 3, spoken: boolean) => {
    if (!item?.cardId) return;
    await grade(item.cardId, rating, Date.now() - shownAt.current, undefined, undefined, spoken);
  }, [item, grade]);

  const box = useSpokenBox({
    accepted,
    always: true,
    keepAudio: true,
    judge: (hearing) => (item ? spokenVerdict(item, hearing) : { kind: "fill", text: hearing.understood }),
    onGood: (text) => {
      if (!item || check) return;
      setTyped(text);
      const marked = checkSpoken(item, text);
      setCheck({ ...marked, verdict: "correct", suggestedRating: 3, note: "" });
      setSaid((n) => n + 1);
      setRecalled((n) => n + 1);
      setGraded(item.cardId ? "good" : "none");
      void writeGrade(3, true);
    },
    onFill: (text) => {
      setTyped(text);
      setSaid((n) => n + 1);
    },
  });

  const resetStep = () => {
    setLit(null);
    setRevealed(false);
    setTyped("");
    setCheck(null);
    setGraded(null);
    shadow.cancel();
    box.reset();
  };

  const next = () => {
    if (!item) return;
    if (stepAt + 1 < steps.length) {
      setStepAt((s) => s + 1);
      resetStep();
      return;
    }
    look.record({
      of: item.key,
      label: t("Speaking"),
      question: item.en,
      answer: item.et,
      note: null,
      questionLang: "en",
      answerLang: "et",
      speak: item.et,
    });
    resetStep();
    setStepAt(0);
    setIndex((i) => i + 1);
    shownAt.current = Date.now();
  };
  moveOn.current = next;

  const checkTyped = () => {
    if (!item || check || !typed.trim()) return;
    const marked = checkSpoken(item, typed);
    setCheck(marked);
    const rating = ratingFor(marked, box.spoken && box.carriesRepair(typed));
    if (rating === 3) setRecalled((n) => n + 1);
    if (rating && item.cardId) {
      setGraded(rating === 3 ? "good" : "hard");
      void writeGrade(rating, box.spoken);
    } else {
      setGraded("none");
    }
  };

  /* Hands-free: the recording, then the microphone when it ends (D14), then on. */
  useEffect(() => {
    if (!handsFree || paused || !item) return;
    let gone = false;
    void (async () => {
      try {
        const outcome = await playClip({ text: item.et, voice, pace }, { unasked: true });
        if (outcome === "blocked") {
          setPaused(true);
          setBackgroundStop(typeof document !== "undefined" && document.hidden);
          return;
        }
      } catch {
        // No recording to play: the line is on the screen, and they say it anyway.
      }
      await untilQuiet(15_000);
      if (!gone) void shadow.start();
    })();
    return () => { gone = true; };
    // A new line or step starts the loop again; the hooks' own identities do not.
  }, [handsFree, paused, index, stepAt]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The screen stays on while hands-free runs, or the round says it will not. */
  useEffect(() => {
    if (!handsFree || finished) return;
    let lock: { release(): Promise<void> } | null = null;
    let gone = false;
    const ask = async () => {
      const wake = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock;
      if (!wake) { setWakeRefused(true); return; }
      try {
        lock = await wake.request("screen");
        if (gone) void lock.release();
        setWakeRefused(false);
      } catch {
        setWakeRefused(true);
      }
    };
    void ask();
    // A wake lock is let go when the page is hidden; take it again when it comes back.
    const onVisible = () => { if (document.visibilityState === "visible") void ask(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [handsFree, finished]);

  /* A headset's own buttons, and the media keys on a computer, through Media Session. */
  useEffect(() => {
    if (!handsFree || !item || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    try {
      session.metadata = new MediaMetadata({ title: item.et, artist: "Kodukeel", album: t("Speaking") });
      session.setActionHandler("pause", () => { setPaused(true); shadow.cancel(); });
      session.setActionHandler("play", () => setPaused(false));
      session.setActionHandler("nexttrack", () => moveOn.current());
    } catch {
      // A browser that knows the API and not one of the actions simply has fewer buttons.
    }
    return () => {
      try {
        session.setActionHandler("pause", null);
        session.setActionHandler("play", null);
        session.setActionHandler("nexttrack", null);
        session.metadata = null;
      } catch {
        // Nothing to undo.
      }
    };
  }, [handsFree, item, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const startHandsFree = () => {
    resetStep();
    setStepAt(0);
    setPaused(false);
    setBackgroundStop(false);
    setHandsFree(true);
  };
  const stopHandsFree = () => {
    shadow.cancel();
    resetStep();
    setStepAt(0);
    setHandsFree(false);
    setPaused(false);
  };

  /* The keyboard: Enter moves on wherever there is one thing to do next. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || look.looking || handsFree) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (inEditable(e.target)) return;
      if (e.target instanceof HTMLElement && e.target.closest("button, a, summary, [role=button]")) return;
      if (!isAdvanceKey(e) || e.repeat) return;
      if (step === "meaning" && !check) return;
      e.preventDefault();
      moveOn.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, look.looking, handsFree, step, check]);

  if (items.length === 0) {
    return (
      <Page title={t("Speaking")} lead={t("Say it out loud, then hear what came across.")}>
        <Empty
          title={t("Nothing to say yet")}
          body={t("This uses words from your deck, so learn a few first and come back.")}
          action={<ButtonLink href="/learn" variant="primary">{t("Open the learning path")}</ButtonLink>}
        />
      </Page>
    );
  }

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="night pop-in rounded-[var(--r-xl)] border px-6 py-10 text-center md:py-12">
          <Mascot size={68} mood="cheer" className="float mx-auto" />
          <h1 className="font-display mt-5 text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={{ color: "var(--ink)" }}>
            {t("Well spoken")}
          </h1>
          {/* The assurance stays: a fact about a microphone somebody just used. */}
          <p className="mx-auto mt-2 max-w-[46ch] text-base" style={{ color: "var(--ink-2)" }}>
            {t("Your voice never left this device.")}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile value={said} label={t("Said aloud")} tone="accent" />
          <StatTile value={recalled} label={t("From memory")} tone="sky" />
          <StatTile value={fill(t("{n}m"), { n: minutes })} label={t("Time")} tone="butter" />
        </div>
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/practice" size="lg">{t("Try something else")}</ButtonLink>
          <ButtonLink href="/" size="lg">{t("Back to Today")}</ButtonLink>
          <AnotherRound variant="primary" size="lg">{t("Another round")}</AnotherRound>
        </WayOut>
      </div>
    );
  }

  const litFlags = lightUp(words, step === "meaning" ? "" : shadow.listening ? shadow.partial : lit?.understood ?? "");
  const share = shareLit(litFlags);
  const showLine = step === "along" || revealed || (step === "back" && handsFree && !!lit);
  const meaning = item.isSentence && item.target !== item.et
    ? gapMeaning({ en: item.en, answer: item.target, cue: null })
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      <h1 className="sr-only">{t("Speaking")}</h1>
      <RoundProgress done={index} total={items.length} />

      {look.panel ? <LookBackCard {...look.panel} /> : (
      <div
        className="relative flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
        data-speaking-step={step}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent"><Mic size={12} aria-hidden /> {t(STEP_TITLE[step])}</Chip>
          <span className="text-sm tnum" style={{ color: "var(--ink-3)" }}>
            {fill(t("Step {n} of {total}"), { n: steps.indexOf(step) + 1, total: steps.length })}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <FullEntry lemma={item.lemma} icon={false} />
            {item.lexemeId && <StarWord lexemeId={item.lexemeId} starred={item.starred} label={item.lemma} />}
          </div>
        </div>

        <div className="round-stage flex flex-col items-center justify-center gap-5 px-6 text-center">
          {step === "along" && (
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Listen, and say it along with them")}</p>
          )}
          {step === "back" && (
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Listen, then say it back")}</p>
          )}
          {step === "meaning" && (
            <p className="label-xs" style={{ color: "var(--ink-3)" }}>{t("Say this in Estonian")}</p>
          )}

          {step === "meaning" && meaning && !check && <GapMeaning meaning={meaning} className="text-2xl font-bold leading-snug tracking-tight" />}
          {step === "meaning" && (!meaning || check) && (
            <p lang="en" className="text-2xl font-bold leading-snug tracking-tight" style={{ color: "var(--ink)" }}>
              {item.en}
            </p>
          )}
          {step === "meaning" ? null : showLine ? (
            <p lang="et" className="text-2xl font-semibold leading-relaxed" style={{ color: "var(--ink)" }} data-read-aloud>
              {words.map((w, i) => (
                <span key={`${i}-${w.text}`}>
                  <span className="read-aloud-word" data-lit={litFlags[i] ? "true" : "false"}>{w.text}</span>
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-md" style={{ color: "var(--ink-2)" }}>{t("The words are hidden until you have said them.")}</p>
          )}

          {step !== "meaning" && (
            <SpeakPair key={`${item.key}-${step}`} text={item.et} size={17} autoplay={!handsFree} />
          )}

          {step !== "meaning" && !handsFree && (
            <div className="flex flex-col items-center gap-2">
              <MicButton speech={shadow} label={step === "along" ? t("Say it along") : t("Say it back")} shortcut showPartial={false} size="lg" />
              <p className="text-sm" style={{ color: "var(--ink-2)" }} role="status">
                {lit
                  ? words.length === 1
                    ? share === 1 ? t("Heard. That's the word.") : t("That wasn't heard as the word this time. Say it again whenever you like.")
                    : share === 1 ? t("Every word was heard.") : fill(t("{n} of {total} words were heard."), { n: litFlags.filter(Boolean).length, total: words.length })
                  : ""}
              </p>
            </div>
          )}

          {step === "meaning" && (
            <div className="flex w-full max-w-sm flex-col items-center gap-3">
              {!check && <MicButton speech={box.speech} label={t("Answer out loud")} shortcut showPartial size="lg" />}
              <div className="w-full text-left">
                <label htmlFor="speaking-answer" className="label-xs mb-2 block" style={{ color: "var(--ink-3)" }}>
                  {t("Or type it")}
                </label>
                <EstonianInput
                  id="speaking-answer"
                  value={typed}
                  onChange={(text) => { if (!check) setTyped(text); }}
                  onEnter={checkTyped}
                  ariaLabel={t("Your answer")}
                  disabled={!!check}
                  large
                />
                {box.spoken && !check && (
                  <p className="mt-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
                    {t("This is what was heard. Change anything that is not what you said, then check it.")}
                  </p>
                )}
              </div>
            </div>
          )}

          <div aria-live="polite" className="w-full max-w-sm">
            {step === "meaning" && check && (
              <div className="flex flex-col items-center gap-3">
                <p className={`${check.verdict === "correct" ? "pop-in" : "shake"} ${VERDICT_CLASS[verdictOfCheck(check)]} verdict-panel w-full`}>
                  {gradedLine(t, graded, check, box.spoken)}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 rounded-[var(--r-lg)] px-5 py-3" style={{ background: "var(--accent-soft)" }}>
                  <p lang="et" className="text-xl font-semibold" style={{ color: "var(--accent-deep)" }}>{item.et}</p>
                  <SpeakPair text={item.et} size={16} autoplay />
                </div>
              </div>
            )}
          </div>

          {/* Hear what came across, and hear yourself: two presses, never automatic. */}
          {!handsFree && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {heardText(step, lit, box.hearing?.heard ?? null) && online && (
                <HearItHeard text={heardText(step, lit, box.hearing?.heard ?? null)!} voice={voice} pace={pace} />
              )}
              {step === "meaning" && <Recorder audio={box.speech.audio} />}
            </div>
          )}

          {handsFree && (
            <HandsFreePanel
              paused={paused}
              wakeRefused={wakeRefused}
              backgroundStop={backgroundStop}
              listening={shadow.listening}
              onToggle={() => {
                if (paused) { setBackgroundStop(false); setPaused(false); }
                else { setPaused(true); shadow.cancel(); }
              }}
            />
          )}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          {handsFree ? (
            <Button variant="primary" size="lg" className="w-full" onClick={stopHandsFree}>
              {t("Stop hands-free")}
            </Button>
          ) : step === "meaning" && !check ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="lg" onClick={() => { setCheck(checkSpoken(item, "")); setGraded("none"); }}>
                {t("Show me")}
              </Button>
              <Button variant="primary" size="lg" className="flex-1" disabled={!typed.trim()} onClick={checkTyped}>
                {t("Check")}
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="lg" className="w-full" onClick={next}>
              {step === "meaning" || stepAt + 1 >= steps.length ? t("Next line") : t("Next step")} <EnterKeyCap className="ml-1" />
            </Button>
          )}
        </div>
      </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm" style={{ color: "var(--ink-3)" }}>
        {!handsFree && !finished && (
          <button
            type="button"
            className="tap-tint inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold"
            style={{ color: "var(--accent-deep)" }}
            onClick={startHandsFree}
            data-hands-free
          >
            <Headphones size={15} aria-hidden /> {t("Hands-free")}
          </button>
        )}
        {said > 0 && <span>{fill(t("{n} said aloud"), { n: said })}</span>}
        <LookBackButton {...look.button} disabled={look.looking} />
      </div>
    </div>
  );
}

/** How long hands-free waits after a line before the next, so it does not run on top of the learner. */
const HANDS_FREE_PAUSE_MS = 1200;

const STEP_TITLE: Record<SpeakingStep, string> = {
  along: "Say it with them",
  back: "Say it back",
  meaning: "Say it from the meaning",
};

/** The text a read-back plays: `heard`, the model's own words, never the repaired reading. */
function heardText(step: SpeakingStep, lit: { heard: string } | null, boxHeard: string | null): string | null {
  const text = step === "meaning" ? boxHeard : lit?.heard ?? null;
  return text && text.trim() ? text.trim() : null;
}

function gradedLine(
  t: (english: string) => string, graded: "good" | "hard" | "none" | null, check: AnswerCheck, spoken: boolean,
): string {
  if (check.verdict === "correct") return spoken ? t("Heard, and right.") : t("Right.");
  if (graded === "hard") return t("Nearly. It counts, and the word comes back a little sooner.");
  return t("Not this time. Nothing is written down for a miss here, so say it again whenever you like.");
}

/** The read-back of what was heard, in a native voice. Drawn only with a network. */
function HearItHeard({ text, voice, pace }: { text: string; voice: string; pace: ReturnType<typeof useAudioPrefs>["pace"] }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <button
      type="button"
      className="press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
      style={{ borderColor: "var(--rule)", background: "var(--raised)", color: "var(--ink-2)" }}
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={() => {
        setBusy(true);
        void playHeard({ text, voice, pace })
          .catch(() => setFailed(true))
          .finally(() => setBusy(false));
      }}
      data-hear-heard
    >
      <Volume2 size={14} aria-hidden /> {t("Hear what was heard")}
    </button>
  );
}

/** Hands-free's own panel: the whole of it is the pause, and it says what it cannot do. */
function HandsFreePanel({ paused, wakeRefused, backgroundStop, listening, onToggle }: {
  paused: boolean; wakeRefused: boolean; backgroundStop: boolean; listening: boolean; onToggle: () => void;
}) {
  const t = useT();
  const fine = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="choice-btn flex min-h-[7rem] w-full flex-col items-center justify-center gap-2 rounded-[var(--r-lg)] px-4 py-5 text-md font-semibold"
        aria-pressed={paused}
        data-hands-free-pause
      >
        {paused ? <Play size={28} aria-hidden /> : <Pause size={28} aria-hidden />}
        {paused ? t("Paused. Tap anywhere here to carry on.") : listening ? t("Listening. Tap anywhere here to pause.") : t("Tap anywhere here to pause.")}
      </button>
      <p className="text-sm" style={{ color: "var(--hard-ink)" }} role="status">
        {backgroundStop ? t("The browser held back the sound in this background tab. Bring the tab forward to carry on.") : ""}
        {backgroundStop && wakeRefused ? " " : ""}
        {wakeRefused ? t("This browser would not keep the screen on, so the round stops when the screen sleeps.") : ""}
      </p>
      {!wakeRefused && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {fine
            ? t("The screen stays on. On a computer it keeps listening in a background tab, and your browser shows the microphone is on.")
            : t("The screen stays on, so the phone can go in a pocket. Nothing here is marked.")}
        </p>
      )}
    </div>
  );
}
