/**
 * TWO CHOICES ABOUT SPEAKING, EACH THE LEARNER'S (docs/41-fifth-batch.md, VB-2).
 *
 * "Send what I say straight away" skips the countdown ring that gives somebody
 * two and a half seconds to touch the box before a lit line is sent (D20). Off
 * by default: the ring is how a misheard line is caught by the person who said
 * it, and somebody fluent enough not to need it can say so.
 *
 * "Show the microphone in answer boxes" decides whether a microphone appears
 * where speaking is not the task, which is every box that takes an Estonian
 * answer (D6). On by default, and it only ever applies once the model is on the
 * device: nobody meets a microphone in an answer box before choosing speech
 * somewhere. Whether the model is downloaded is read from where it is kept,
 * never stored here.
 */
export type OnOff = "on" | "off";

export const DEFAULT_SEND_AT_ONCE: OnOff = "off";
export const DEFAULT_MIC_IN_BOXES: OnOff = "on";

export function sendAtOnceFrom(value: string | undefined | null): boolean {
  return (value === "on" || value === "off" ? value : DEFAULT_SEND_AT_ONCE) === "on";
}

export function micInBoxesFrom(value: string | undefined | null): boolean {
  return (value === "on" || value === "off" ? value : DEFAULT_MIC_IN_BOXES) === "on";
}
