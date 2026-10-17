import type { SpeechConfig, Speech } from "./useSpeech";

/**
 * WHETHER A MICROPHONE GOES BESIDE AN ANSWER BOX ON THIS SCREEN (docs/41-fifth-batch.md, D6).
 *
 * Where speaking is not the task, which is every round that takes a typed
 * answer, the microphone is drawn only once the learner has said yes to speech
 * somewhere else by downloading the model, and only while Settings' "Show the
 * microphone in answer boxes" is on. Nobody meets a microphone in a box before
 * choosing speech. "Loading" counts as downloaded, since it is what a press on
 * a downloaded model goes through, and a button that vanished under the press
 * that loaded it would be worse than none.
 *
 * Where speaking is the task (a conversation, the Speaking round, the numbers
 * round, the meet rung), a screen asks `speech.offered` alone and does not
 * read this.
 */
export function micInAnswerBox(speech: Pick<Speech, "offered" | "phase">, config: Pick<SpeechConfig, "inBoxes">): boolean {
  return speech.offered && config.inBoxes && (speech.phase === "ready" || speech.phase === "loading");
}
