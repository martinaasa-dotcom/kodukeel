import { hidesWords, type Support } from "./conditions";

/**
 * How the other side of a conversation reaches the learner: read, heard and
 * read, or heard alone.
 *
 * A scene spoke in the persona's voice before this existed, and only for a
 * learner who had switched autoplay on in Settings, which is off by default for
 * the reason `lib/audio/voice.ts` gives about review cards in a library. So a
 * conversation was silent unless somebody pressed a speaker on every line, and
 * nothing on the screen said which of the three ways it was being had. This is
 * the one answer to that, chosen on the briefing beside the band and the
 * difficulty, and named in the conversation itself so the learner can see and
 * change it mid-scene.
 *
 *   text    the lines are read. Nothing is played aloud and no speaker is drawn,
 *           which is the honest meaning of "no audio": a speaker on every line
 *           under a label saying there is no sound is a label that is wrong
 *   voice   each line is spoken the moment it arrives, with its words written out
 *   listen  each line is spoken the moment it arrives, and its words wait behind
 *           a press, which is what `support` called "listen" and is now said here
 *
 * WHY IT OVERRIDES THE AUTOPLAY SETTING. That setting answers "should a card
 * read itself unasked", and the answer is no for a card. A conversation in a
 * voice mode is the learner asking, in so many words, on the screen before it
 * starts, so it is no longer unasked. Pressing Start is also the gesture the
 * browser wants before it will play anything.
 *
 * WHY A MISSING ROW IS NOT "text". The usual rule is that a missing row reads as
 * the behavior everybody had, and what everybody had is neither of these: the
 * words with a speaker beside each line and no autoplay. Of the three, `voice`
 * is the nearest that the label can describe truthfully, and it is shown and
 * selected on the briefing before anything plays, so nobody is startled into
 * it. A learner who had already chosen to hear before reading (`support`
 * listen or cold) keeps exactly that.
 *
 * Pure. No React, no Prisma; the setting store holds the value and this says
 * what a valid one is and what it means.
 */
export type SceneVoice = "text" | "voice" | "listen";

export interface SceneVoiceOption {
  readonly id: SceneVoice;
  /** On the card on the briefing, and the mode's name anywhere else. */
  readonly label: string;
  /**
   * On the chip inside the conversation, where three have to sit in one row
   * of a phone's panel. The same words cut down, never different ones: beside
   * "Voice + text", a bare "Voice" already says the words are not there.
   */
  readonly short: string;
  /** Under the card on the briefing. */
  readonly detail: string;
}

export const SCENE_VOICES: readonly SceneVoiceOption[] = [
  {
    id: "text",
    label: "Text only",
    short: "Text",
    detail: "You read each line. Nothing is played aloud.",
  },
  {
    id: "voice",
    label: "Voice and text",
    short: "Voice + text",
    detail: "Each line is spoken as it arrives, with the words written out.",
  },
  {
    id: "listen",
    label: "Voice only",
    short: "Voice",
    detail: "Each line is spoken as it arrives. The words are one press away if you need them.",
  },
];

/** A stored or requested mode, or the one this learner's other settings point at. */
export function sceneVoiceFrom(value: unknown, support: Support): SceneVoice {
  if (value === "text" || value === "voice" || value === "listen") return value;
  return hidesWords(support) ? "listen" : "voice";
}

/** Whether the other side's lines are played aloud as they arrive, and a speaker drawn. */
export function speaksAloud(mode: SceneVoice): boolean {
  return mode !== "text";
}

/** Whether the other side's words wait behind a press. */
export function hidesLines(mode: SceneVoice): boolean {
  return mode === "listen";
}

/** The label for a mode, for a screen. */
export function sceneVoiceLabel(mode: SceneVoice): string {
  return SCENE_VOICES.find((one) => one.id === mode)?.label ?? "";
}
