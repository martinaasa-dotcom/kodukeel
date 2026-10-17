import type { TranscribedPiece } from "./engine";
import { core, reconcile, type Hearing, type HeardWord } from "./reconcile";
import { SPEECH_SETTINGS as S } from "./settings";

/**
 * A RECORDING SOMEBODY OPENED ON THE READING PAGE, AS TEXT (docs/41-fifth-batch.md, VB-12).
 *
 * The Estonian a learner most needs to follow is a voice message: from a
 * landlord, a colleague, a child's teacher. The page decodes it in the
 * browser, the engine hears it on the device in pieces cut at its pauses, and
 * this is what turns those pieces into something the reading page can show:
 * one line per piece, with where in the recording it was, so each line can be
 * played again from the recording itself.
 *
 * Nothing here keeps anything (D16): no audio and no transcript leave this
 * module except as the caller hands them on, and the one place the transcript
 * goes is the reading page's own glossing, which keeps nothing either. And a
 * transcript is never Estonian the app vouches for (D10): it is what a
 * machine heard, shown as that, so nothing here builds a card or an example.
 */

/** A recording longer than this is heard up to here and the page says so (`SPEECH_SETTINGS.maxFileSeconds`). */
export const MAX_RECORDING_SECONDS = S.maxFileSeconds;

/**
 * The largest file opened at all. A voice message is well under a megabyte a
 * minute; this bounds a file nobody meant to open, such as an hour of WAV,
 * before the browser decodes the whole of it into memory.
 */
export const MAX_RECORDING_BYTES = 60 * 1024 * 1024;

/**
 * How often the machine is wrong on a word, measured (section 0 of the batch
 * doc): 8.3% and 7.7% on TalTech's held-out quiet recordings, 11.2% and 11.0%
 * with café talk under them. The note at the top of a transcript says the quiet
 * figure as "one word in twelve" and that it is worse with noise behind.
 */
export const WORDS_WRONG_QUIET = 0.083;
export const WORDS_WRONG_NOISY = 0.112;

/** "One word in twelve", as the note says it. */
export function oneIn(share: number): number {
  return Math.round(1 / share);
}

/** One line of a transcript: what was heard, and where in the recording it was. */
export interface HeardLine {
  readonly hearing: Hearing;
  /** Seconds into the recording. */
  readonly from: number;
  readonly to: number;
}

/**
 * The pieces as lines, in order, with nothing heard left out and the
 * hesitation marks taken off. No repair is made, because nobody knows what a
 * stranger's message could hold: `expect` is empty, so `understood` is what
 * the model heard less its filled pauses. `known` is the forms list's answer
 * where it was asked, which decides which words were heard least surely.
 *
 * Capped at `maxChars` of text, whole lines only, so the transcript fits the
 * reading page's own limit and a line is never cut in the middle.
 */
export function transcriptLines(
  pieces: readonly TranscribedPiece[],
  { known, maxChars }: { readonly known?: (word: string) => boolean | undefined; readonly maxChars: number },
): { readonly lines: HeardLine[]; readonly cut: boolean } {
  const lines: HeardLine[] = [];
  let used = 0;
  let cut = false;
  for (const piece of pieces) {
    const hearing = reconcile(piece.turn, { known });
    if (!hearing.understood.trim()) continue;
    const length = hearing.understood.length + 2;
    if (used + length > maxChars) {
      cut = true;
      break;
    }
    used += length;
    lines.push({ hearing, from: piece.from, to: piece.to });
  }
  return { lines, cut };
}

/**
 * Which tokens of a glossed line are words the machine was least sure of.
 *
 * The glossing splits the line into runs of letters and the spaces between;
 * the hearing has the same words in the same order. They are walked together
 * by their cores, looking a few words ahead where the two split a word
 * differently (a hyphen, a number), so one disagreement costs a mark and
 * never shifts every mark after it.
 */
export function doubtfulTokens(
  tokens: readonly { readonly text: string; readonly word: boolean }[],
  words: readonly HeardWord[],
): Set<number> {
  const out = new Set<number>();
  let at = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (!token.word) continue;
    const c = core(token.text);
    if (!c) continue;
    for (let ahead = at; ahead < Math.min(words.length, at + 4); ahead++) {
      if (core(words[ahead]!.text) !== c) continue;
      if (words[ahead]!.unsure) out.add(i);
      at = ahead + 1;
      break;
    }
  }
  return out;
}

/** A recording's sound for one line, cut from the decoded samples. */
export function sliceOf(samples: Float32Array, rate: number, line: { readonly from: number; readonly to: number }): Float32Array {
  const from = Math.max(0, Math.floor(line.from * rate));
  const to = Math.min(samples.length, Math.ceil(line.to * rate));
  return samples.subarray(from, Math.max(from, to));
}

/** Mixes every channel into one, which is what the recognizer hears and what is played back. */
export function mono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]!;
  const length = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(length);
  for (const channel of channels) for (let i = 0; i < length; i++) out[i] = (out[i] ?? 0) + channel[i]! / channels.length;
  return out;
}

/**
 * The format Safari opens only partly. Messaging apps save voice notes as Opus
 * in an Ogg container, and a browser that cannot decode one says so through
 * this rather than through a failure nobody can read (VB-12's trip hazard).
 */
export function isOggOpus(name: string, type: string): boolean {
  return /\.(ogg|oga|opus)$/i.test(name) || /^audio\/(ogg|opus)/i.test(type);
}

/** Whether a dropped or picked file is worth trying as a recording at all. */
export function looksLikeAudio(name: string, type: string): boolean {
  return type.startsWith("audio/") || type === "video/webm" || type === "video/mp4"
    || /\.(mp3|m4a|aac|wav|ogg|oga|opus|webm|flac|amr|3gp|mp4)$/i.test(name);
}

/** Minutes and seconds, as a voice message's length is shown: "1:07". */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
