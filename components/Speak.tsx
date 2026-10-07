"use client";

import { Volume2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { inEditable } from "@/lib/ux/advanceKey";
import { SpaceKeyCap } from "./KeyCaps";
import { playClip } from "@/lib/audio/clip";
import type { Condition } from "@/lib/audio/conditions";
import { useAudioPrefs } from "./AudioPrefs";

/**
 * Pronunciation button.
 *
 * Audio comes from TartuNLP's Estonian neural TTS via our own proxy, because the
 * browser's speechSynthesis has no dependable et-EE voice — it fails silently, or
 * reads Estonian in an English accent. If the proxy cannot produce audio the button
 * disappears rather than sitting there doing nothing.
 *
 * The voice is the learner's own, read from the shell (components/AudioPrefs.tsx),
 * and `autoplay` reads the clip aloud the moment the button appears, once, if
 * they have that switched on. A browser refuses to play sound on a page nobody
 * has touched yet, and that refusal is not a fault in the service: it leaves the
 * button in place to be pressed, where a clip that could not be fetched at all
 * takes the button away.
 */
export function Speak({
  text, slow, label, size = 15, className, style, onUnavailable, onPlay, disabled, children, autoplay, voice: askedVoice, condition, rate, spaceKey,
}: {
  text: string; slow?: boolean; label?: string;
  /** A playback rate other than the clip's own, with the pitch held (`LEARNING_RATE`). */
  rate?: number;
  /**
   * The room and the rate it is heard in, for the rounds that vary them
   * (`lib/audio/conditions.ts`). Absent means clean, which is every other
   * screen.
   */
  condition?: Condition;
  /**
   * A voice other than the learner's own, by its identifier. For the
   * listening round, which changes speaker from word to word the way the
   * examination does; everywhere else the setting decides.
   */
  voice?: string;
  /** Icon size in px, plus className/style overrides for a bigger tap target (e.g. Listening mode). */
  size?: number; className?: string; style?: CSSProperties;
  /**
   * Called when the audio could not be produced and this button is about to
   * remove itself. Most screens can lose a pronunciation button silently; the
   * ones built *on* the audio (Listening, Dictation) cannot, and need to offer
   * something else instead of a dead end.
   */
  onUnavailable?: () => void;
  /**
   * Called when a play actually starts, which is what the exam counts.
   *
   * The listening part of the state examination plays each recording twice, so
   * the mock has to count plays, and it has to count the ones that happened: an
   * increment on the click would charge somebody for a request that failed and
   * left them with nothing to hear. Fired after `play()` resolves, so a clip
   * that would not load costs no play and takes the `onUnavailable` path
   * instead.
   */
  onPlay?: () => void;
  /** Held shut, for the pause before a listening task and for a spent budget. */
  disabled?: boolean;
  /**
   * What the button draws when it is not loading. The speaker icon by default;
   * a word where the icon would be ambiguous, which is what `SpeakPair` needs
   * for its slow half.
   */
  children?: ReactNode;
  /**
   * Read it aloud as soon as this appears, if the learner's setting allows.
   * For the moment a word is met and the moment an answer is shown, which are
   * the two moments hearing it does the most, and never for a sentence with a
   * hole in it. Counts as a play for `onPlay`, since it is one.
   */
  autoplay?: boolean;
  /**
   * Space plays this clip, and the button says so with a Space key beside it.
   *
   * ONLY WHERE SPACE HAS NOTHING ELSE TO DO. Most rounds use it to move on or
   * to say "not yet", and a key that did two things would play a clip when
   * somebody meant to carry on, so the screen that draws this says when it
   * is free: before an answer, not after. `"silent"` binds the key and draws
   * no cap, for a screen that has its own place to say it. The key is a
   * letter inside a text box and belongs to a control that has the keyboard,
   * so neither is taken; and a held key plays once.
   */
  spaceKey?: boolean | "silent";
}) {
  const [state, setState] = useState<"idle" | "loading" | "gone">("idle");
  const prefs = useAudioPrefs();
  const voice = askedVoice ?? prefs.voice;
  // How fast this learner hears Estonian, off their own level. Read here rather
  // than taken as a prop, so a screen cannot draw a speaker that plays at a
  // pace the learner did not choose. See lib/audio/pace.ts.
  const pace = prefs.pace;
  const wanted = prefs.autoplay;
  const played = useRef<string | null>(null);

  const play = async (unasked = false) => {
    try {
      setState("loading");
      /*
        The clip is here and the browser would not play it, which on a page
        nobody has touched yet is the autoplay policy and not the service.
        Leave the button to be pressed. A press is a user gesture and will be
        allowed, so the same error on a press is genuinely something else.

        That distinction was written here and only here, and the minimal-pairs
        round paid for it: its own copy of this caught both and told a learner
        their connection was down. `playClip` is the one answer now.
      */
      const outcome = await playClip({ text, slow, voice, condition, rate, pace }, { unasked });
      setState("idle");
      if (outcome === "played") onPlay?.();
    } catch {
      /*
        AN AUTOPLAY THAT FAILED IS NOT A CLIP THAT IS GONE.
        `unasked` covers more than the blocked-autoplay case above catches: a
        cold start, a slow first round trip to TartuNLP, a rate limit answered
        while nobody had asked for anything yet. On a word's very first
        meeting the autoplay fires before the learner has done anything at
        all, so a single unlucky request there used to remove the only way to
        hear the word. That is what was reported against üks, the first word
        first run ever shows, and every learner's first autoplay is exactly
        this unraced. A press the learner made themselves is the one signal
        worth reading as "this clip cannot be produced"; a request nobody
        asked for failing once is not, so it leaves the button standing
        rather than taking it away.
      */
      if (unasked) {
        setState("idle");
        return;
      }
      setState("gone");
      onUnavailable?.();
    }
  };

  /* The latest `play`, so the key listener never closes over a stale one. */
  const playRef = useRef(play);
  playRef.current = play;
  const busy = state === "loading";
  const keyed = Boolean(spaceKey) && !disabled && state !== "gone";
  useEffect(() => {
    if (!keyed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (inEditable(e.target)) return;
      // A control that has the keyboard answers its own Space.
      if (e.target instanceof HTMLElement && e.target.closest("button, a, summary, select, [role=button], [role=radio]")) return;
      e.preventDefault();
      if (!busy) void playRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyed, busy]);

  useEffect(() => {
    if (!autoplay || wanted !== "on" || disabled) return;
    const key = `${text}|${slow ? 1 : 0}|${voice}|${condition?.id ?? ""}|${pace.id}`;
    if (played.current === key) return;
    played.current = key;
    void play(true);
    // `play` closes over the props it needs; re-running on them would replay
    // the same clip on an unrelated re-render, which `played` also guards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, wanted, disabled, text, slow, voice, condition?.id, pace.id]);

  /*
    A BUTTON THAT HAS GONE SAYS SO, TO THE ONE READER WHO CANNOT SEE IT GO.
    Taking it away is deliberate (a dead speaker is worse than none), and a
    sighted reader sees the gap. A screen reader whose focus was on it is left
    on the page with nothing said, so a quiet status stands where it was.
  */
  if (state === "gone") return <span role="status" className="sr-only">No audio for this one.</span>;

  const loading = state === "loading";

  const button = (
    <button
      type="button"
      aria-keyshortcuts={spaceKey ? "Space" : undefined}
      /*
        NOT `disabled` WHILE ITS OWN CLIP LOADS. The press is what starts the
        load, and a browser moves focus off a control the moment it is
        disabled, so every press dropped the caret on the body. It says it is
        busy instead and ignores a second press. `disabled` is the caller's,
        for a pause or a spent budget, which is not a press of this button.
      */
      onClick={() => { if (!loading) void play(); }}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      aria-label={label ?? `Hear "${text}"${slow ? " slowly" : ""} in Estonian`}
      className={className ?? "press inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--raised)]"}
      style={{ color: "var(--ink-3)", opacity: disabled ? 0.4 : undefined, ...style }}
    >
      {loading
        ? <Loader2 size={size} className="animate-spin" aria-hidden />
        : children ?? <Volume2 size={size} strokeWidth={2} aria-hidden />}
    </button>
  );
  if (spaceKey !== true) return button;
  return (
    <span className="inline-flex items-center gap-1.5">
      {button}
      <SpaceKeyCap />
    </span>
  );
}

/**
 * The two speeds, as one control.
 *
 * Normal and slow were two identical speaker buttons sitting side by side, and
 * an icon repeated with nothing to tell the copies apart reads as a rendering
 * fault rather than as a choice. It was also unanswerable: the only way to find
 * out what the second one did was to press it, since the difference was carried
 * by a `title` attribute, and a phone has no hover. That is the rule dictation
 * met first, one layer down: a distinction the learner has to act on is carried
 * in words, never by a hue or a hover.
 *
 * So: one pill, a divider, and the slow half says "Slow". One control with two
 * speeds, legible without pressing anything.
 *
 * The pair goes away as a pair. Both halves ask the same service for the same
 * sentence, so a failure is a fact about the service rather than about a speed,
 * and letting one half vanish on its own would leave a stray divider against a
 * lone button.
 */
export function SpeakPair({
  text, label, slowLabel, disabled, onPlay, onUnavailable, size = 15, className = "", autoplay, voice, spaceKey,
}: {
  text: string;
  /** A voice other than the learner's own, as on `Speak`; both halves read in it. */
  voice?: string;
  label?: string;
  slowLabel?: string;
  disabled?: boolean;
  size?: number;
  className?: string;
  onPlay?: () => void;
  onUnavailable?: () => void;
  /** Reads the normal-speed half aloud on appearing, as `Speak` does. */
  autoplay?: boolean;
  /** Space plays the normal-speed half, as on `Speak`; the slow half keeps its button. */
  spaceKey?: boolean;
}) {
  const [gone, setGone] = useState(false);
  if (gone) return <span role="status" className="sr-only">No audio for this one.</span>;

  const lost = () => {
    setGone(true);
    onUnavailable?.();
  };

  const half = "press tap-tint inline-flex items-center justify-center rounded-full";

  const pair = (
    <span
      className={`inline-flex items-center rounded-full border ${className}`}
      style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
    >
      <Speak
        text={text}
        size={size}
        label={label ?? `Hear "${text}" in Estonian`}
        disabled={disabled}
        onPlay={onPlay}
        onUnavailable={lost}
        autoplay={autoplay}
        voice={voice}
        spaceKey={spaceKey ? "silent" : undefined}
        className={`${half} px-2.5 py-1.5`}
        style={{ color: "var(--ink-2)" }}
      />
      <span aria-hidden className="h-4 w-px shrink-0" style={{ background: "var(--rule)" }} />
      <Speak
        text={text}
        slow
        size={size}
        label={slowLabel ?? `Hear "${text}" slowly in Estonian`}
        disabled={disabled}
        onPlay={onPlay}
        onUnavailable={lost}
        voice={voice}
        className={`${half} gap-1 whitespace-nowrap px-2.5 py-1.5 text-xs font-semibold`}
        style={{ color: "var(--ink-3)" }}
      >
        Slow
      </Speak>
    </span>
  );
  if (!spaceKey) return pair;
  return (
    <span className="inline-flex items-center gap-1.5">
      {pair}
      <SpaceKeyCap />
    </span>
  );
}
