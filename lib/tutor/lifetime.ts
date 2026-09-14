/**
 * HOW LONG A CONVERSATION WITH ANU LASTS, WHICH IS A DAY.
 *
 * Anu used to remember everything: the thirty most recent turns came back on
 * every visit, whatever their age, and the route sent up to twenty of them to
 * the model on every question. That is a tutor who opens Tuesday's lesson by
 * re-reading last month's, and it costs the same on every turn whether or
 * not the old context helps. The operator asked for the opposite: a
 * conversation is a sitting, it is over the next day, and Anu starts fresh.
 *
 * Twenty-four hours rather than a calendar day, because a question at 23:50
 * and its answer at 00:05 are one conversation. It is a rule about the rows
 * rather than the screen: `lib/tutor/history.ts` reads nothing older than
 * this, and `app/api/tutor/route.ts` deletes what is older the next time the
 * learner speaks to her, so the table holds a day of conversation and no
 * more. `docs/25-data-retention.md` and `/privacy` say the same thing, and an
 * invariant holds the three together.
 *
 * Pure: no React, no Next, no Prisma, and the clock is handed in.
 */
export const CONVERSATION_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** The instant before which a turn with Anu is forgotten. */
export function conversationCutoff(now: Date): Date {
  return new Date(now.getTime() - CONVERSATION_LIFETIME_MS);
}
