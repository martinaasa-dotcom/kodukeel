/**
 * The conversation the real spoken part opens with, as prompts to rehearse.
 *
 * The Board's own description of every level's speaking test begins with a
 * general introductory conversation between the examiner and the candidates,
 * held the way people talk when they first meet (`harnoEt` in
 * `lib/exam/official.ts`). The mock paper's speaking tasks stand in for the two
 * tasks after it, and nothing stood in for the opening, which is the minute
 * that sets the nerves for the rest.
 *
 * These are prompts in English for the candidate to answer out loud in
 * Estonian. Nothing marks, records or stores the answer: marking speech is the
 * one thing this app will not pretend to do (ADR-018). And no Estonian is
 * written here, so the app cannot hand over a sentence to recite.
 */
export const OPENING_CONVERSATION: readonly string[] = [
  "Say who you are and where you live.",
  "Say what you do during the day, at work, at school or at home.",
  "Say how long you have been learning Estonian, and why.",
  "Say one thing you like doing in your free time.",
];
