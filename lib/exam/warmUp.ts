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
import type { ExamLevel } from "./spec";

export const OPENING_CONVERSATION: readonly string[] = [
  "Say who you are and where you live.",
  "Say what your day looks like, at work, at school or at home.",
  "Say how long you have been learning Estonian, and why.",
  "Say one thing you like to do in your free time.",
];

/**
 * What the opening asks at each level.
 *
 * The B2 paper opens with a minute about your work or your studies, and the
 * C1 paper with introducing yourself and saying where you work, so a
 * candidate rehearsing for either rehearses what their own paper opens with.
 * The levels below share the everyday opening above.
 */
const OPENING_BY_LEVEL: Partial<Record<ExamLevel, readonly string[]>> = {
  B2: [
    "Say who you are, in a sentence or two.",
    "Talk for about a minute about your work or your studies: what you do, and what you like about it.",
    "Say how Estonian comes into your work or your studies.",
  ],
  C1: [
    "Introduce yourself, in a minute or two.",
    "Say where you work, what you do there and what a usual week looks like.",
    "Say how your work has changed in the last few years, and what you expect next.",
  ],
};

export function openingConversation(level: ExamLevel): readonly string[] {
  return OPENING_BY_LEVEL[level] ?? OPENING_CONVERSATION;
}
