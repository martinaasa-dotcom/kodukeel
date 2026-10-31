import { VOICES } from "@/lib/audio/voice";
import { normalisePhrase } from "./ledger";
import type { LessonSpec, Speaker } from "./types";

/**
 * WHO THE LEARNER IS TALKING TO ON SAY IT, AND IN WHOSE VOICE.
 *
 * The questions on Say it were voiced by whoever opened the conversation, and
 * the role-play's partner was named the same way. Where Tom opens, the
 * learner's own stand-in opened, so on a new colleague's first day Kadri asked
 * her questions in Tom's voice; and guessing from the order of speakers named
 * the manager in a team meeting where the role-play is an argument with a
 * colleague (b1-42). So a role-play says who the learner is talking to
 * (`roleplay.who`), every lesson that has one sets it, and every turn of it is
 * that person's, named on the intro and the thread and voiced in their voice.
 *
 * The questions about yourself are not a role-play and are asked by whoever
 * in the conversation would ask them:
 *
 * - An ask that is a line of the conversation, or one sentence of a line, is
 *   voiced by whoever said that line. "Kas jätate sõnumi?" is the last sentence
 *   of Kaja's line, so it is Kaja's, and not the recording that opened the call.
 *   Tom's lines are the exception, since Tom stands in for the learner.
 * - Anything else is asked by the partner: the first speaker who is not Tom and
 *   who speaks after somebody else has spoken, which is what makes them somebody
 *   in the conversation rather than a radio or a recorded message playing before
 *   it starts. Where nobody answers anybody, the first speaker who is not Tom.
 * - Where Tom is the only speaker, as in a voice message he leaves (b1-23), the
 *   learner is the only person in the conversation, so there is nobody to name.
 *   The asks are voiced by the first voice of the app's own list that nobody in
 *   the cast speaks with, which is never the learner's stand-in and, for a
 *   message left for Mari, is Mari's own voice.
 */
export interface OtherSide {
  /** The person the learner answers, named on the role-play's intro and thread, or null where nobody else speaks. */
  readonly partner: Speaker | null;
  /** Who says this question about yourself, or null where nobody but the stand-in speaks. */
  readonly askerOf: (askEt: string) => Speaker | null;
  /** The voice for something said by `who` (a speaker, or null for nobody named). */
  readonly voiceOf: (who: Speaker | null) => string | undefined;
}

export const STAND_IN = "Tom";

/** The sentences of a line, each as `normalisePhrase` reads it. */
function sentencesOf(et: string): string[] {
  return et
    .split(/(?<=[.!?…])\s+/u)
    .map(normalisePhrase)
    .filter((s) => s.length > 0);
}

export function otherSideOf(lesson: Pick<LessonSpec, "conversation" | "cast" | "roleplay">): OtherSide {
  const whole = new Map<string, Speaker>();
  const sentence = new Map<string, Speaker>();
  for (const line of lesson.conversation) {
    if (!line.et || line.who === STAND_IN) continue;
    const key = normalisePhrase(line.et);
    if (!whole.has(key)) whole.set(key, line.who);
    for (const s of sentencesOf(line.et)) if (!sentence.has(s)) sentence.set(s, line.who);
  }
  const speakers = [...new Set(lesson.conversation.map((l) => l.who))].filter((s) => s !== STAND_IN);
  // Somebody who speaks after somebody else has spoken is in the conversation, not playing before it.
  const replies = new Set<Speaker>();
  for (let i = 1; i < lesson.conversation.length; i++) {
    const line = lesson.conversation[i]!;
    const before = lesson.conversation.slice(0, i).some((l) => l.who !== line.who);
    if (before && line.who !== STAND_IN) replies.add(line.who);
  }
  const asker = speakers.find((s) => replies.has(s)) ?? speakers[0] ?? null;
  const partner = lesson.roleplay?.who ?? asker;
  const used = new Set(Object.values(lesson.cast));
  const nobody = VOICES.find((v) => !used.has(v.id))?.id;
  return {
    partner,
    askerOf: (askEt) => whole.get(normalisePhrase(askEt)) ?? sentence.get(normalisePhrase(askEt)) ?? asker,
    voiceOf: (who) => (who === null ? nobody : lesson.cast[who] ?? undefined),
  };
}
