/**
 * WHAT IS NEW AT A LEVEL, SAID ON ITS FIRST LESSON.
 *
 * Each level of lessons asks something the one before did not, and a learner
 * who is not told meets it as a surprise: at B1 the conversation suddenly plays
 * with its words hidden, and a lesson takes forty minutes where A2's took
 * eighteen. So the first lesson of a level says, once and briefly, what has
 * changed and why, which is the step up explained where it happens
 * (`docs/43-lessons.md` §11.2, §12 and §15.5). A1 has nothing before it and A2 is A1's
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
      { what: "You write a real text.", why: "Once a part you write a note, a letter, an email, a story, a forum post or an application, and keep the sentences you get right as cards." },
      { what: "A lesson takes longer.", why: "Most take about twenty-five minutes, and a writing lesson about forty." },
    ],
  },
  B2: {
    lead: "You can get things done in Estonian now. B2 is about living in it: following people at full speed, and keeping the conversation in Estonian.",
    items: [
      { what: "People talk to each other.", why: "The conversation isn't for you: you follow friends, colleagues and neighbors talking among themselves, at full speed." },
      { what: "You read real texts.", why: "Each lesson has a chat, a message, a headline or a letter to read, with its new words underlined to the dictionary." },
      { what: "You work words out.", why: "A word you haven't been taught, but whose parts you know, is yours to work out before the dictionary tells you." },
      { what: "It gets harder part by part.", why: "From the third part you hear the conversation on a phone or in a café, the story only once, and you get less time to answer." },
      { what: "You keep it in Estonian.", why: "Each part ends in a conversation where somebody switches to English, and you carry on in Estonian." },
    ],
  },
  /*
    C1 (docs/43-lessons.md §15.5 to §15.7), each line checked against the
    lessons the day C1 became the course: 35 of the 49 ask which room, seven
    from the second part on are a talk taken down as notes, a read text is
    asked about from the third part, and a lesson runs to 34 minutes on
    average and a writing one to between 43 and 51.
  */
  C1: {
    lead: "You live in Estonian now. C1 is about being yourself in it: as funny, as precise and as firm as in your own language.",
    items: [
      { what: "You hear what was meant.", why: "People interrupt each other at full speed, and the questions ask what was meant as well as what was said." },
      { what: "You take notes.", why: "From the second part, some lessons swap the conversation for a talk on the morning show, which you take down as notes." },
      { what: "You answer about what you read.", why: "From the third part, the text you read comes with questions, in the shapes the C1 paper uses." },
      { what: "You choose the room.", why: "The same thing said to a friend, to a colleague and in writing, and you say which one fits." },
      { what: "A lesson takes longer.", why: "Most take about thirty-five minutes, and a writing lesson about fifty." },
    ],
  },
};

/** What is new, where this lesson is the first core lesson of its level; null elsewhere. */
export function levelNewsFor(lesson: { readonly level: string; readonly n: number; readonly extra?: string }): LevelNews | null {
  if (lesson.n !== 1 || lesson.extra) return null;
  return LEVEL_NEW[lesson.level] ?? null;
}
