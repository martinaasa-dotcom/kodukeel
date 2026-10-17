import type { RawTurn } from "./engine";
import { reconcile, type HeardWord } from "./reconcile";
import { cardVerdict, type SpokenVerdict } from "./verdict";
import { matchPick } from "./matchPick";

/**
 * THE GOLDEN FILE: WHAT THE ENGINE HEARD, AND WHAT THE RULES MADE OF IT
 * (docs/41-fifth-batch.md, VB-3).
 *
 * For each fixture clip, the raw turns the web engine returned, and what the
 * pure layer decides from them: `heard`, `understood`, every word's detail,
 * the D19 verdict against a card whose answer is the clip's own text, and the
 * D20 match against a set of picks. `golden.test.ts` runs the pure layer over
 * the recorded turns and fails where it no longer decides the same, so a
 * change to the hearing rules is a change somebody saw.
 *
 * The native apps' first speech test is to produce this file: their engine,
 * the same model files and the same clips, and the same turns out, which then
 * give the same verdicts because they run this same code (D24). The forms list
 * is not asked here, as offline, so the file depends on nothing but the audio.
 *
 * `npm run asr:golden` records it, against a running server, through the
 * speech bench's file path.
 */
export interface GoldenClip {
  /** The fixture under `scripts/fixtures/speech/` or `public/asr/`. */
  readonly file: string;
  /** What the clip says, as `scripts/make-speech-fixtures.ts` asked TartuNLP to say it. */
  readonly says: string;
  /** What the web engine returned for the whole file, one turn per piece. */
  readonly turns: readonly RawTurn[];
  readonly expect: GoldenExpect;
}

export interface GoldenExpect {
  readonly heard: string;
  readonly understood: string;
  readonly words: readonly HeardWord[];
  /** The verdict against a card whose only accepted answer is the clip's own text. */
  readonly verdict: SpokenVerdict;
  /** The pick the turn matched among `GOLDEN_PICKS`, or null. */
  readonly pick: number | null;
}

export interface Golden {
  readonly engine: string;
  readonly model: string;
  readonly recorded: string;
  readonly clips: readonly GoldenClip[];
}

/** The lines on screen a clip is matched against: the fixtures' own phrases and one none of them says. */
export const GOLDEN_PICKS: readonly string[] = ["Tere!", "Aitäh!", "Kuidas läheb?", "Head aega!"];

/** What the pure layer decides from one clip's turns. Exported so the recorder and the test cannot disagree about it. */
export function decide(turns: readonly RawTurn[], says: string): GoldenExpect {
  const hearings = turns.map((turn) => reconcile(turn));
  const heard = hearings.map((h) => h.heard).filter(Boolean).join(" ");
  const understood = hearings.map((h) => h.understood).filter(Boolean).join(" ");
  const words = hearings.flatMap((h) => h.words);
  const whole = { heard, understood, words, repairs: hearings.flatMap((h) => h.repairs), seconds: hearings.reduce((n, h) => n + h.seconds, 0) };
  return {
    heard,
    understood,
    words,
    verdict: cardVerdict(whole, [says]),
    pick: matchPick(GOLDEN_PICKS, understood).index,
  };
}
