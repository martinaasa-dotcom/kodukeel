/**
 * WHAT IS ABOUT TO HAPPEN, SAID BEFORE IT HAPPENS.
 *
 * Every round in this app used to open on its first question. That is fine
 * for somebody who has played it before and is a wall for everybody else:
 * the picture board deals six tiles and a clock, the letter round deals a
 * row of scrambled tiles, the writing round deals a word and a box, and in
 * each case the learner works out what is wanted by getting the first one
 * wrong. It was reported that way, in the learner's own terms: before a task
 * starts, say what will be on the screen and what I am supposed to do with
 * it, and let me press something to say I have read it.
 *
 * So a round opens on a screen that says both, and nothing of the round is
 * on it. The learn ladder already had one (`showMeetIntro`, and the second
 * screen where its own question changes partway through), written for the
 * same report; this is that screen made general, so the twenty-odd rounds
 * cannot each answer "what is this" in their own words.
 *
 * TWO SENTENCES, AND THEY ANSWER DIFFERENT QUESTIONS. `what` is what will be
 * on the screen: the pictures, the clock, the box. `you` is what the learner
 * does about it. Splitting them is what stops the screen becoming a
 * paragraph nobody finishes, and it is what the report asked for: "you will
 * be introduced 5 new words" and "just look at them, nothing needs to be
 * written" are two facts, and the second is the one somebody is anxious
 * about.
 *
 * EVERY TIME, NOT ONCE. A briefing remembered across rounds is a briefing
 * the second learner on a shared laptop never sees, and this is a screen
 * that prepares somebody for the next ten minutes rather than an explainer
 * they have read. It is one press, and the key that moves every other card
 * forward moves this too.
 *
 * NO ESTONIAN IN HERE, which is `lib/estonian/grammar.ts`'s standing one
 * directory over and is asserted the same way: what a round is called is
 * English, and every Estonian word a learner meets still comes off the
 * dictionary.
 */

export interface Briefing {
  /** What this round is, in a few words. The heading. */
  title: string;
  /** What will be on the screen. One sentence. */
  what: string;
  /** What the learner does about it. One sentence. */
  you: string;
  /** The button. A few words, and it never says "OK". */
  action: string;
}

export type BriefingId = keyof typeof BRIEFINGS;

export const BRIEFINGS = {
  review: {
    title: "Words you have already met",
    what:
      "One card at a time, drawn from your own deck. Some ask what a word means, some ask for " +
      "one of its forms in a sentence somebody wrote.",
    you: "Answer each one. Where there is a box, type it; where there is not, say how it went.",
    action: "Start reviewing",
  },
  flashcards: {
    title: "Your words, asked five ways",
    what:
      "Words review has already taught you, asked as a meaning, a gap in a sentence, a form you " +
      "hear, or a sentence you write yourself.",
    you: "Type each answer and check it. A word leaves once you have had it right five times.",
    action: "Start",
  },
  common: {
    title: "The words you hear most",
    what:
      "Words off one of the four frequency lists, counted over film and television subtitles " +
      "rather than picked by hand.",
    you: "Type the answer. Each word comes up in a different form every time.",
    action: "Start",
  },
  deck: {
    title: "A deck of your own",
    what: "The cards in this deck, one at a time, in the order the scheduler wants them.",
    you: "Answer each one. Where there is a box, type it; where there is not, say how it went.",
    action: "Start",
  },
  lookups: {
    title: "Words you looked up",
    what:
      "Words you added yourself, off an entry, a photograph or a question you put to Anu, rather " +
      "than off the course.",
    you: "Type each answer. These are your own words, so nobody else has checked them.",
    action: "Start",
  },
  cloze: {
    title: "Your own Estonian, with gaps",
    what: "You paste in a passage, and we take one word out of the sentences in it.",
    you: "Type the missing word back in, in the form the sentence needs.",
    action: "Paste something",
  },
  conjugation: {
    title: "One verb, every person",
    what: "A verb's table with the first person filled in and the other rows empty.",
    you: "Type the rest of the table, one box at a time. The first person is your clue.",
    action: "Start",
  },
  "conjugation-match": {
    title: "One verb, every person",
    what: "A verb's table, with all six forms already on the screen and out of order.",
    you: "Put each form beside the person it belongs to. There is nothing to type.",
    action: "Start",
  },
  describe: {
    title: "A picture, and one word to use",
    what: "Three things in a scene. One of them is named for you, with the form we want.",
    you: "Write one sentence about the picture using that word in that form.",
    action: "Show me the picture",
  },
  dictation: {
    title: "Hear it, write it",
    what: "A sentence a lexicographer recorded, read aloud. You can play it again and slow it down.",
    you:
      "Type the whole sentence. Dropping the Estonian letters is marked down rather than counted " +
      "wrong, so it is worth reaching for them.",
    action: "Play the first one",
  },
  emoji: {
    title: "Pictures, and the ending each one wants",
    what:
      "Pictures down one side and Estonian forms down the other, each form under the question " +
      "it answers.",
    you: "Tap a picture, then the form that belongs to it. The clock runs until the board is clear.",
    action: "Start",
  },
  exceptions: {
    title: "Words that break the pattern",
    what:
      "Words whose form no rule gets you to. You meet each one first, then type it, then use it " +
      "in a sentence somebody wrote.",
    you: "Nothing is written down while you are meeting a word. The typing is where it counts.",
    action: "Start",
  },
  government: {
    title: "Which case the verb takes",
    what: "A verb, and four cases it could be asking for. Only one of them is the one it takes.",
    you: "Pick it. There is nothing to type and no clock.",
    action: "Start",
  },
  letters: {
    title: "Put the word back together",
    what:
      "The meaning is on the screen and the word is read out, with its letters on tiles in the " +
      "wrong order.",
    you: "Tap the letters into order. A first miss places the first letter for you.",
    action: "Start",
  },
  listening: {
    title: "Hear a word, pick what it means",
    what:
      "One word at a time, spoken, with four meanings under it. The word itself is not written " +
      "down until you have answered.",
    /* Four is `WRONG + 1` in `lib/questions/distractors.ts`, and a card the
       pool cannot give three wrong answers for is dropped rather than shown
       with fewer, so the number is exact rather than a usual case. The test
       beside this file is the tripwire. */
    you: "Pick the meaning. You can play it again as often as you like.",
    action: "Play the first one",
  },
  match: {
    title: "Match the pairs",
    what: "Estonian words and their meanings, shuffled into two columns.",
    you: "Tap one on each side to pair them. The clock runs until the board is clear.",
    action: "Start",
  },
  pairs: {
    title: "Two words, one sound apart",
    what:
      "Two words that differ only in how long one sound is held, and a recording of one of them.",
    you: "Say which one you heard. You can play it again, and the room stays quiet.",
    action: "Play the first one",
  },
  sentences: {
    title: "Put the sentence in order",
    what: "A sentence somebody recorded, cut into tiles and shuffled.",
    you: "Tap the words into order. More than one order is often right, and both are marked right.",
    action: "Start",
  },
  speaking: {
    title: "Say it out loud",
    what: "A meaning, a native recording, and your own voice played straight back beside it.",
    you: "Record yourself, listen to both, and say how it went. No machine scores your accent.",
    action: "Start",
  },
  sprint: {
    title: "As many as you can",
    what: "Cards from your deck against a clock, flipped rather than typed.",
    you: "Answer as fast as you can until the time goes. Nothing is lost if you stop early.",
    action: "Start the clock",
  },
  target: {
    title: "One form, before the clock runs out",
    what:
      "A word and a question, with four forms to choose from. Every hit takes a little off the " +
      "next clock.",
    you: "Pick the form the question is asking for.",
    action: "Start",
  },
  write: {
    title: "Write a sentence of your own",
    what: "One word, and the form we want you to use it in.",
    you:
      "Write a sentence using it. Whether you used the form is checked against the dictionary; " +
      "the rest is a note from Anu.",
    action: "Start",
  },
  quest: {
    title: "The endings you keep missing",
    what: "Cards drawn from the cases you get wrong most, against a clock.",
    you: "Answer as many as you can before the time goes.",
    action: "Start",
  },
  sonad: {
    title: "Guess the word",
    what:
      "One six-letter Estonian word a day, and seven tries at it. Each guess says which letters " +
      "were right and which were in the wrong place.",
    you: "Type a real six-letter word and send it. A clue arrives if you are still going late on.",
    action: "Start",
  },
  crossword: {
    title: "Today's crossword",
    what:
      "A grid of Estonian words with English clues. Each clue says what kind of word it wants, " +
      "so there is only one answer that fits.",
    you: "Type the answers into the grid, then check it. There is no clock.",
    action: "Start",
  },
  lesson: {
    title: "This unit, one word at a time",
    what:
      "You meet each of the unit's words first, and then the lesson asks you to use them in " +
      "sentences somebody recorded.",
    you: "Nothing is written down while you are meeting a word. Read them, then answer.",
    action: "Start the lesson",
  },
  checkpoint: {
    title: "A checkpoint, not a test",
    what:
      "A short set of questions from across the level. Nothing is marked in front of you: the " +
      "answers are held back until the end.",
    you: "Answer each one as best you can and press on. A blank answer is an honest answer.",
    action: "Start",
  },
} as const satisfies Record<string, Briefing>;

/** The briefing for a round, or nothing where a caller names one nobody wrote. */
export function briefingFor(id: string): Briefing | null {
  return (BRIEFINGS as Record<string, Briefing>)[id] ?? null;
}
