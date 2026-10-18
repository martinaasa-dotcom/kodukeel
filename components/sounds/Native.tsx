"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Play, Volume2 } from "lucide-react";
import { onSpeakingChange, playClip, untilQuiet } from "@/lib/audio/clip";
import { nativeClip } from "@/lib/audio/native";
import type { Pace } from "@/lib/audio/pace";
import { useAudioPrefs } from "@/components/AudioPrefs";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";

/**
 * THE NATIVE SPEAKER'S RECORDINGS, AS THINGS A LEARNER PRESSES.
 *
 * A sound is the one part of a language a page cannot show, so on the screens
 * about sounds every piece of Estonian is a control: the letter itself, the
 * word that carries it, and a set of words that differ by one held sound. All
 * three play a recording by id (`lib/audio/native.ts`) at the speed it was
 * said, because what is being taught is how it sounds, not a beginner's
 * slowed-down copy of it.
 *
 * WHAT IS PLAYING IS SHOWN WHERE IT IS PLAYING. One recording at a time is
 * marked live, and the mark goes when the voice stops rather than when the
 * press ends, which is the only way a row of three words played one after
 * another can say which of the three you are hearing. The mark is a ring and
 * a set of bars as well as a color, so it reads without the hue.
 */

let live: string | null = null;
let speaking = false;
let watching = false;
const listeners = new Set<() => void>();
function publish() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  if (!watching) {
    // One listener on the app's voice for the whole page, kept for the life of
    // the tab: it holds two booleans and a set, and dropping it when the last
    // key unmounts would miss the end of a clip that outlived its screen.
    watching = true;
    onSpeakingChange((now) => {
      speaking = now;
      if (!now) live = null;
      publish();
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether this recording is the one being heard right now. */
function useLive(id: string): boolean {
  return useSyncExternalStore(subscribe, () => live === id && speaking, () => false);
}

/** Plays one recording, marking it live. Resolves once it has started, or has failed. */
async function playNative(id: string, pace: Pace): Promise<boolean> {
  live = id;
  publish();
  try {
    // The pace travels like it does to every play, and `rateFor` answers 1 for
    // a clip asked for by id: on these screens the clip is the lesson.
    await playClip({ text: nativeClip(id).text, nativeId: id, pace });
    return true;
  } catch {
    if (live === id) live = null;
    publish();
    return false;
  }
}

/** Plays recordings one after another, a breath apart, the way a teacher reads a list. */
async function playInTurn(ids: readonly string[], pace: Pace): Promise<void> {
  for (const [i, id] of ids.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 380));
    if (!(await playNative(id, pace))) return;
    await untilQuiet(8000);
  }
}

/** The press, and whether its recording is the one being heard. */
function useNative(id: string) {
  const isLive = useLive(id);
  const { pace } = useAudioPrefs();
  const press = () => {
    void playNative(id, pace);
  };
  return { isLive, press };
}

/** Three bars that move while a recording plays, drawn in the ink around them. */
function Bars() {
  return (
    <span className="snd-bars" aria-hidden>
      <span /><span /><span />
    </span>
  );
}

/**
 * A SOUND ON ITS OWN, AS A KEY: the letter large, the recording behind it.
 * `size` is the tile's side, larger where the sound is the subject of the
 * screen and smaller in a grid of thirty-two.
 */
export function SoundKey({ clip, glyph, label, size = "md", loanword }: {
  clip: string;
  /** What is printed on the key. The letter, or the letters, as written. */
  glyph: string;
  /** What a screen reader hears; "Hear the sound ä" when absent. */
  label?: string;
  size?: "sm" | "md" | "lg";
  /** Drawn dashed: a letter Estonian keeps for borrowed words and names. */
  loanword?: boolean;
}) {
  const t = useT();
  const { isLive, press } = useNative(clip);
  return (
    <button
      type="button"
      onClick={press}
      aria-label={label ?? fill(t("Hear the sound {sound}"), { sound: glyph })}
      data-native={clip}
      data-live={isLive || undefined}
      className={`snd-key snd-key-${size} press${loanword ? " snd-key-loan" : ""}`}
    >
      <span lang="et" className="snd-glyph">{glyph}</span>
      <span className="snd-key-cue" aria-hidden>{isLive ? <Bars /> : <Volume2 size={size === "sm" ? 11 : 13} strokeWidth={2.25} />}</span>
    </button>
  );
}

/**
 * A word, as a pill that says it. `mark` is the letters this word is here to
 * show, highlighted where they first occur, so a learner sees which part of
 * `aitäh` the ä is while they hear it.
 */
export function NativeWord({ clip, text, mark, stress, en, size = "md" }: {
  clip: string;
  /** As printed; the recording's own text when absent. */
  text?: string;
  mark?: string;
  /** The word split into syllables, the first said strongest (`te·re`). */
  stress?: readonly string[];
  /** What it means, under it. */
  en?: string;
  size?: "md" | "lg";
}) {
  const t = useT();
  const { isLive, press } = useNative(clip);
  const said = text ?? nativeClip(clip).text;
  return (
    <span className="snd-word-wrap">
      <button
        type="button"
        onClick={press}
        aria-label={fill(t('Hear "{text}" in Estonian'), { text: said })}
        data-native={clip}
        data-live={isLive || undefined}
        className={`snd-word snd-word-${size} press`}
      >
        <span className="snd-word-cue" aria-hidden>{isLive ? <Bars /> : <Volume2 size={14} strokeWidth={2.25} />}</span>
        <span lang="et" className="snd-word-text">
          {stress ? <Syllables parts={stress} /> : <Marked text={said} mark={mark} />}
        </span>
      </button>
      {en && <span className="snd-word-en">{t(en)}</span>}
    </span>
  );
}

function Marked({ text, mark }: { text: string; mark?: string }) {
  const at = mark ? text.toLocaleLowerCase("et").indexOf(mark.toLocaleLowerCase("et")) : -1;
  if (!mark || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="snd-mark">{text.slice(at, at + mark.length)}</mark>
      {text.slice(at + mark.length)}
    </>
  );
}

function Syllables({ parts }: { parts: readonly string[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="snd-dot" aria-hidden />}
          {i === 0 ? <strong className="snd-stress">{part}</strong> : part}
        </span>
      ))}
    </>
  );
}

/**
 * A SET OF WORDS TO HEAR SIDE BY SIDE, and a way to hear them in a row.
 *
 * The difference between `kapp` and `kapis` is the thing being taught, and it
 * is heard best back to back, so the set has one press that plays every word
 * in turn, a breath apart, with each word marked as it is said.
 */
export function HearSet({ words, caption }: {
  words: readonly { readonly clip: string; readonly text?: string; readonly mark?: string; readonly en?: string }[];
  caption?: ReactNode;
}) {
  const t = useT();
  const { pace } = useAudioPrefs();
  const [busy, setBusy] = useState(false);
  return (
    <div className="snd-set" data-hear-set>
      {caption && <p className="snd-set-caption">{caption}</p>}
      <div className="snd-set-row">
        {words.length > 1 && (
          <button
            type="button"
            className="snd-play-all press"
            disabled={busy}
            aria-label={words.length === 2 ? t("Hear both") : t("Hear them in a row")}
            onClick={() => {
              setBusy(true);
              void playInTurn(words.map((w) => w.clip), pace).finally(() => setBusy(false));
            }}
          >
            <Play size={16} aria-hidden fill="currentColor" />
          </button>
        )}
        <span className="snd-set-words">
          {words.map((w) => <NativeWord key={w.clip} clip={w.clip} text={w.text} mark={w.mark} en={w.en} />)}
        </span>
      </div>
    </div>
  );
}
