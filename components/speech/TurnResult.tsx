"use client";

import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { fillNodes } from "@/components/fillNodes";
import type { LineClarity, LineWord } from "@/lib/speech/lightUp";
import { CompareVoices } from "./CompareVoices";
import { HeardAs } from "./HeardAs";

/**
 * WHAT CAME OF A TURN, IN ONE QUIET BLOCK UNDER THE LINE.
 *
 * Every screen that lights a line as it is said used to finish a turn with
 * its own stack: a count of the words understood, a "Heard:" line, a button
 * reading the heard words back in a native voice, the comparison card with a
 * title, and a sentence under it saying the ear checks the sound. Five things
 * saying one thing, and a learner reported the screen as cluttered and the
 * read-back as useless beside "hear yourself, then them", which it is: the
 * comparison already plays the turn itself.
 *
 * So there is one block and it says one thing at a time. The lit line above
 * it already shows which words came across, so the visible sentence is only
 * the part the line cannot show: "Every word was understood" where it all
 * lit, and otherwise what was heard instead. The count is still read out,
 * in a status a screen reader hears. Under it, a word heard as another
 * spelling (`HeardAs`), and the one comparison (`CompareVoices`), which is
 * the whole of the sound check (`docs/41-fifth-batch.md` section 8c).
 */
export function TurnResult({ words, lit, clarity, understood, audio, text, silent, voice, native, align = "center" }: {
  /** The line's words, as `lineWords` splits them. */
  readonly words: readonly LineWord[];
  /** Which of them lit. */
  readonly lit: readonly boolean[];
  /** How each came across, or null before it is known. */
  readonly clarity: LineClarity | null;
  /** What the recognizer understood, as text. */
  readonly understood: string;
  /** The turn's audio, kept for the comparison. */
  readonly audio: Float32Array | null;
  /** The line the native recording says. */
  readonly text: string;
  /** The turn ended with nothing said: no comparison to offer. */
  readonly silent?: boolean;
  readonly voice?: string;
  readonly native?: boolean;
  readonly align?: "start" | "center";
}) {
  const t = useT();
  const spoken = words.filter((w) => w.key);
  const litCount = words.filter((w, i) => w.key && lit[i]).length;
  const all = spoken.length > 0 && litCount === spoken.length;
  const single = spoken.length === 1;
  const count = all
    ? single ? (clarity?.clarity.includes("close") ? t("Understood.") : t("Understood. That's the word.")) : t("Every word was understood.")
    : single ? t("That wasn't heard as the word this time. Say it again whenever you like.")
    : fill(t("{n} of {total} words were understood."), { n: litCount, total: spoken.length });
  const heard = understood.trim();
  const center = align === "center";

  return (
    <div className={`turn-after flex flex-col gap-2.5 ${center ? "items-center text-center" : "items-start"}`} data-turn-result>
      <p className="sr-only" role="status">{count}</p>
      {/* Visible: only what the lit line cannot show. */}
      <p className="text-sm" style={{ color: "var(--ink-2)" }} aria-hidden data-heard-line>
        {all || !heard
          ? count
          : fillNodes(t("Heard: {text}"), { text: <span lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{heard}</span> })}
      </p>
      {clarity && <HeardAs line={words} clarity={clarity} />}
      {!silent && <CompareVoices audio={audio} text={text} voice={voice} native={native} align={align} />}
    </div>
  );
}
