/**
 * HOW LONG A CONVERSATION LEAVES A LINE ON THE SCREEN BEFORE IT MOVES ON.
 *
 * A reply that carries a break in time used to land as one burst: the other
 * side's line, its voice starting, and the cover saying "five minutes later"
 * all in the same frame, and after the cover the next question arriving and
 * speaking in the frame the cover left. A learner reported it as everything
 * happening into each other, which it was. A person who says "Hästi." and then
 * walks to the shop leaves the "Hästi." in the air first, and a person you meet
 * five minutes later does not start talking the instant you arrive.
 *
 * So there are two beats, and both are here so they are one decision rather
 * than two numbers typed into a component:
 *
 *   before the break  the line is heard to its end (`untilQuiet`), then left
 *                     on screen long enough to be read, scaled by its length
 *   after the break   the cover fades onto the conversation, the move stays
 *                     in the transcript, and only after a short pause does the
 *                     next line arrive and speak
 *
 * Neither is a wait the learner sits through for nothing: the composer is
 * closed during both because the scene is between two places, which is the
 * rule the cover already keeps, and both are short enough that nobody reaches
 * for a button. Pure, so it is tested rather than tuned by eye.
 */

/** The least a line stays up before the scene moves, however short. */
export const READ_FLOOR_MS = 900;
/** The most, so a long line is never a long stall. */
export const READ_CEILING_MS = 3200;
/** About a comfortable reading pace for a learner, per character. */
export const READ_MS_PER_CHAR = 45;
/**
 * The pause after the cover fades and before the next line arrives. Long
 * enough to read as a beat, short enough not to read as the app stalling.
 */
export const AFTER_BREAK_MS = 800;
/**
 * The longest the conversation waits for a voice to finish. A clip that never
 * reports its end, or a slow network, must not hold the scene.
 */
export const VOICE_CAP_MS = 9000;

/** How long to leave `lines` on screen for reading once they have been heard. */
export function readingPause(lines: readonly string[]): number {
  const chars = lines.reduce((sum, line) => sum + line.trim().length, 0);
  if (chars === 0) return 0;
  return Math.min(READ_CEILING_MS, Math.max(READ_FLOOR_MS, chars * READ_MS_PER_CHAR));
}
