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
    title: "Words you've already met",
    what:
      "One card at a time from your own deck. Some ask what a word means, some ask for the right " +
      "form of it in a real sentence.",
    you: "Answer each one. If there's a box, type your answer. If there isn't, tell us how it went.",
    action: "Start reviewing",
  },
  flashcards: {
    title: "Your words, five different ways",
    what:
      "Words you've already learned, asked as a meaning, a gap in a sentence, a form you hear, or " +
      "a sentence you write yourself.",
    you: "Type each answer and check it. Get a word right five times and it drops out of the round.",
    action: "Start",
  },
  common: {
    title: "The words you'll hear most",
    what:
      "Words from one of four lists of the most common words, counted from film and TV subtitles " +
      "rather than picked by hand.",
    you: "Type the answer. Each word turns up in a different form every time.",
    action: "Start",
  },
  deck: {
    title: "A deck of your own",
    what: "The cards in this deck, one at a time, in the order they're due.",
    you: "Answer each one. If there's a box, type your answer. If there isn't, tell us how it went.",
    action: "Start",
  },
  lookups: {
    title: "Words you looked up",
    what:
      "Words you added yourself, from the dictionary, a photo or a chat with Anu, rather than " +
      "from the course.",
    you: "Type each answer. These are your own words, so nobody else has checked them.",
    action: "Start",
  },
  cloze: {
    title: "Your own Estonian, with gaps",
    what: "Paste in any piece of Estonian, and we'll take words out of its sentences.",
    you: "Type each missing word back in, in the form the sentence needs.",
    action: "Paste something in",
  },
  conjugation: {
    title: "One verb, every person",
    what: "A verb's table with the first person filled in and the rest left empty.",
    you: "Fill in the rest of the table, one box at a time. The first person is your clue.",
    action: "Start",
  },
  "conjugation-match": {
    title: "One verb, every person",
    what: "A verb's table, with all six forms already on the screen, jumbled up.",
    you: "Put each form next to the person it belongs to. No typing needed.",
    action: "Start",
  },
  describe: {
    title: "A picture, and one word to use",
    what: "A little scene with three things in it. One of them is named for you, with the form we're after.",
    you: "Write one sentence about the picture, using that word in that form.",
    action: "Show me the picture",
  },
  dictation: {
    title: "Hear it, write it",
    what: "A real sentence from the dictionary, read aloud. You can replay it and slow it down.",
    you:
      "Type the whole sentence. A missing Estonian letter costs you a little but isn't marked " +
      "wrong, so it's worth reaching for them.",
    action: "Play the first one",
  },
  emoji: {
    title: "Pictures, and the ending each one needs",
    what:
      "Pictures down one side and Estonian words down the other, each word under the question " +
      "it answers.",
    you: "Tap a picture, then the word that goes with it. The clock runs until the board is clear.",
    action: "Start",
  },
  exceptions: {
    title: "Words that break the rules",
    what:
      "Words no rule will get you to. You meet each one first, then type it, then use it in a " +
      "real sentence.",
    you: "Just meeting a word isn't scored. The typing is what counts.",
    action: "Start",
  },
  government: {
    title: "Which case goes with the verb",
    what: "A verb, and four cases it might want. Only one of them is right.",
    you: "Pick it. Nothing to type, and no clock.",
    action: "Start",
  },
  letters: {
    title: "Put the word back together",
    what:
      "You'll see what the word means and hear it read out, with its letters jumbled up on " +
      "tiles.",
    you: "Tap the letters into the right order. Miss once and we'll place the first letter for you.",
    action: "Start",
  },
  listening: {
    title: "Hear a word, pick what it means",
    what:
      "Words read aloud one at a time, with four meanings under each. The word isn't shown until " +
      "you've answered.",
    /* Four is `WRONG + 1` in `lib/questions/distractors.ts`, and a card the
       pool cannot give three wrong answers for is dropped rather than shown
       with fewer, so the number is exact rather than a usual case. The test
       beside this file is the tripwire. */
    you: "Pick the meaning. Play it again as often as you like.",
    action: "Play the first one",
  },
  match: {
    title: "Match the pairs",
    what: "Estonian words and their meanings, jumbled into two columns.",
    you: "Tap one on each side to pair them up. The clock runs until the board is clear.",
    action: "Start",
  },
  pairs: {
    title: "Two words, one sound apart",
    what:
      "Two words that differ only in how long one sound is held, and a recording of one of them.",
    you: "Say which one you heard. You can replay it, and there's no background noise.",
    action: "Play the first one",
  },
  sentences: {
    title: "Put the sentence in order",
    what: "A real sentence, cut up into word tiles and shuffled.",
    you: "Tap the words into order. Often more than one order is right, and we'll accept those too.",
    action: "Start",
  },
  speaking: {
    title: "Say it out loud",
    what: "A meaning, a native recording, and your own voice played back right next to it.",
    you: "Record yourself, listen to both, and decide how it went. No machine scores your accent.",
    action: "Start",
  },
  sprint: {
    title: "As many as you can",
    what: "Cards from your deck against the clock. You flip them rather than type.",
    you: "Go as fast as you can until time's up. Stopping early costs you nothing.",
    action: "Start the clock",
  },
  target: {
    title: "One form, before the clock runs out",
    what:
      "A word and a question, with four forms to choose from. Each hit shaves a little off the " +
      "next clock.",
    you: "Pick the form the question is asking for.",
    action: "Start",
  },
  write: {
    title: "Write your own sentence",
    what: "One word, and the form we'd like you to use it in.",
    you:
      "Write a sentence with it. The dictionary checks whether you used the form, and Anu leaves " +
      "a note on the rest.",
    action: "Start",
  },
  quest: {
    title: "The endings you keep missing",
    what: "Cards from the cases you get wrong most often, against the clock.",
    you: "Answer as many as you can before time runs out.",
    action: "Start",
  },
  sonad: {
    title: "Guess the word",
    what:
      "One six-letter Estonian word a day, and seven tries to find it. Each guess shows which " +
      "letters are right and which are in the wrong spot.",
    you: "Type any real six-letter word and send it. If you're still going near the end, a clue turns up.",
    action: "Start",
  },
  crossword: {
    title: "Today's crossword",
    what:
      "A grid of Estonian words with English clues. Each clue says what kind of word it wants, " +
      "so only one answer fits.",
    you: "Type your answers into the grid, then check it. There's no clock.",
    action: "Start",
  },
  lesson: {
    title: "This unit, one word at a time",
    what: "You meet each of the unit's words first, then use them in real sentences.",
    you: "Meeting a word isn't scored, so take your time reading. Then answer.",
    action: "Start the lesson",
  },
  checkpoint: {
    title: "A checkpoint, not a test",
    what:
      "A short set of questions from across the level. You won't see what you got right until " +
      "the end.",
    you: "Answer each one as best you can and keep going. Leaving one blank is an honest answer.",
    action: "Start",
  },
} as const satisfies Record<string, Briefing>;

/** The briefing for a round, or nothing where a caller names one nobody wrote. */
export function briefingFor(id: string): Briefing | null {
  return (BRIEFINGS as Record<string, Briefing>)[id] ?? null;
}
