/**
 * WHAT IS NEW AT A LEVEL, SAID ON ITS FIRST LESSON.
 *
 * Each level of lessons asks something the one before did not, and a learner
 * who is not told meets it as a surprise: at B1 the conversation suddenly plays
 * with its words hidden, and a lesson takes forty minutes where A2's took
 * eighteen. So the first lesson of a level says, once and briefly, what has
 * changed and why, which is the step up explained where it happens
 * (`docs/43-lessons.md` §11.2 and §12). A1 has nothing before it and A2 is A1's
 * shape with more in it, so the table starts at B1.
 *
 * English only, in the lesson's own voice, translated in the B1 screens' area.
 * Pure: no React, no Prisma.
 */
export interface LevelNews {
  /** One line saying what the level is for, now. */
  readonly lead: string;
  /** What changes, a line each, the thing first and then what it asks. */
  readonly items: readonly { readonly what: string; readonly why: string }[];
}

export const LEVEL_NEW: Readonly<Record<string, LevelNews>> = {
  B1: {
    lead: "You have the words now. B1 is about catching them at speed and putting them together yourself.",
    items: [
      { what: "You hear it first.", why: "Each conversation plays with its words hidden, and you say what it was about before you read it." },
      { what: "You change sentences.", why: "Practice asks you to turn one sentence into another, and to fix the mix-ups you make most." },
      { what: "You talk for longer.", why: "Retell a short story, or give one answer three times, faster each time." },
      { what: "You write a real text.", why: "Once a part you write a note, a letter or an email, and keep the sentences you get right as cards." },
      { what: "A lesson takes longer.", why: "Most take about twenty-five minutes, and a writing lesson about forty." },
    ],
  },
};

/** What is new, where this lesson is the first core lesson of its level; null elsewhere. */
export function levelNewsFor(lesson: { readonly level: string; readonly n: number; readonly extra?: string }): LevelNews | null {
  if (lesson.n !== 1 || lesson.extra) return null;
  return LEVEL_NEW[lesson.level] ?? null;
}
