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
    title: "The words that are due today",
    what:
      "Words you've met before, back just as you're about to forget them. Some cards ask what a " +
      "word means, others ask you to fill a gap in a real sentence.",
    you: "Type your answer where there's a box. Where there isn't, think of it, turn the card over and say whether you had it.",
    action: "Start reviewing",
  },
  /*
    THE SAME ROUND, OPENED AS THE LAST STEP OF AN EVENING.

    Read inside a module, "Words you've met before, back just as you're about
    to forget them" was said about words met ten minutes earlier, and "fill a
    gap in a real sentence" to a beginner the course asks for no gap at all.
    What the round is there is the evening's own look back, and it ends the
    evening.
  */
  closing: {
    title: "Tonight's words, one more time",
    what:
      "A few quick questions on the words you've just learned, and any older ones that are due today.",
    you: "Type your answer where there's a box, or pick one where there's a choice. Then the evening's done.",
    action: "Start",
  },
  /* What a word is asked depends on how well it has settled (`lib/games/flash.ts`),
     so a beginner's first round is "how do you say this" five times over and
     the title may not promise five ways. It said "get a word right five times
     and it's done for today" too, which is the mastery bar rather than the
     round: a round asks each word once. */
  flashcards: {
    title: "Your words, asked a new way",
    what:
      "Words you've already met, one at a time: from their meaning, as a form in a sentence, " +
      "read out to you, or for a sentence of your own, depending on how well each has settled.",
    you: "Type each answer and check it. Each time a word comes back right, it's asked a harder way next time.",
    action: "Start",
  },
  common: {
    title: "The words you'll hear most",
    what:
      "Words from one of the lists of what Estonians say most, counted from real films and TV " +
      "rather than picked by us.",
    you: "Type each answer. A word comes back with a new ending each time, so you learn it the way it's really used.",
    action: "Start",
  },
  deck: {
    title: "Your own deck",
    what: "The cards you put in this deck, one at a time, the most overdue first.",
    you: "Type your answer where there's a box. Where there isn't, think of it, turn the card over and say whether you had it.",
    action: "Start",
  },
  lookups: {
    title: "Words you looked up",
    what:
      "The words you added yourself, from the dictionary, a photo or a chat with Anu, instead of " +
      "the ones the course gave you.",
    you: "Type each answer. You picked these, so they get their turn now instead of waiting behind the course.",
    action: "Start",
  },
  cloze: {
    title: "Your own Estonian, with gaps",
    what: "Paste in anything in Estonian, an article or your homework, and we'll blank out words you've learned.",
    you: "Type each missing word back in, the way the writer had it.",
    action: "Paste something in",
  },
  conjugation: {
    title: "One verb, all six people",
    what: "A verb with the \"I\" form filled in and the other five boxes empty.",
    you: "Fill in the rest, one box at a time. The \"I\" form is your clue.",
    action: "Start",
  },
  "conjugation-match": {
    title: "One verb, all six people",
    what: "A verb's six forms, already on the screen but jumbled up.",
    you: "Put each form next to the person it goes with. There's nothing to type.",
    action: "Start",
  },
  describe: {
    title: "Say what you see",
    what: "A little scene with three things in it. We'll name one of them and tell you which ending it needs.",
    you: "Write one sentence about the picture using that word, with that ending.",
    action: "Show me the picture",
  },
  dictation: {
    title: "Hear it, write it",
    what: "A real sentence read out loud. Play it again as often as you like, and slow it down if it's fast.",
    you:
      "Type the whole sentence. Forgetting a dot or a squiggle on a letter costs you a little but " +
      "won't be marked wrong, so it's worth trying.",
    action: "Play the first one",
  },
  exceptions: {
    title: "The words that break the rules",
    what:
      "Words that don't do what the usual pattern says. You'll see each one first, then type it, " +
      "then put it in a real sentence.",
    you: "Just have a look at the first step, nothing's scored there. After that, the typing counts.",
    action: "Start",
  },
  government: {
    title: "Which case does this verb want?",
    what: "A verb, and four cases it might take. Only one is right.",
    you: "Pick it. There's nothing to type and no clock.",
    action: "Start",
  },
  letters: {
    title: "Put the word back together",
    what:
      "A word you know, read out loud with its meaning shown, and its letters jumbled up on " +
      "tiles.",
    you: "Tap the letters in the right order. Miss once and we'll put the first letter in for you.",
    action: "Start",
  },
  listening: {
    title: "Hear a word, pick what it means",
    what:
      "One word at a time, read out loud by a different voice each time, with four meanings to " +
      "choose from. You won't see it written until you've answered.",
    /* Four is `WRONG + 1` in `lib/questions/distractors.ts`, and a card the
       pool cannot give three wrong answers for is dropped rather than shown
       with fewer, so the number is exact rather than a usual case. The test
       beside this file is the tripwire. */
    you: "Pick the meaning. Play the word again as often as you like.",
    action: "Play the first one",
  },
  match: {
    title: "Match the pairs",
    /* The board deals words and meanings into one grid, Estonian on the lilac
       tiles, so "one column each" described a layout the round does not draw. */
    what: "Estonian words and their meanings, all mixed up together on one board.",
    you: "Tap a word, then its meaning, to pair them. The clock runs until the board is empty.",
    action: "Start",
  },
  pairs: {
    title: "Long or short",
    what:
      "Two words that sound almost the same, except one sound is held a little longer. You'll " +
      "hear one of them.",
    you: "Say which one you heard. Play it again if you need to, it's recorded in a quiet room.",
    action: "Play the first one",
  },
  sentences: {
    title: "Put the sentence back in order",
    what: "A real sentence, cut up into words and shuffled.",
    you: "Tap the words into order. Estonian often allows more than one order, and we'll accept those too.",
    action: "Start",
  },
  speaking: {
    title: "Say it out loud",
    what: "A word to say, a recording of a native speaker saying it, and your own voice played back beside it.",
    you: "Record yourself, listen to both, and decide how close you got. No machine grades your accent.",
    action: "Start",
  },
  sprint: {
    title: "As many as you can",
    what: "Cards from your deck against the clock. You turn them over instead of typing.",
    you: "Go as fast as you can until time's up. Stopping early costs you nothing.",
    action: "Start the clock",
  },
  target: {
    title: "Hit the right ending",
    what:
      "A word, a question, and four answers to pick from, mostly the same word with different " +
      "endings. Every hit makes the next clock a little shorter.",
    you: "Tap the one the question is asking for.",
    action: "Start",
  },
  write: {
    title: "Write your own sentence",
    what: "One word, and the ending we'd like you to give it.",
    you:
      "Write a sentence with it. The dictionary checks the ending, and Anu leaves you a note " +
      "on the rest.",
    action: "Start",
  },
  quest: {
    title: "The endings you keep missing",
    what: "Cards from the cases you get wrong most, picked from your own answers, against the clock.",
    you: "Answer as many as you can before time runs out.",
    action: "Start",
  },
  sonad: {
    title: "Guess today's word",
    what:
      "One six-letter Estonian word a day, and seven tries to find it. After each guess, the " +
      "letters show whether they're in the right spot, somewhere else, or not in the word at all.",
    you: "Type any real six-letter word and send it. If it's getting close to the end, we'll slip you a clue.",
    action: "Start",
  },
  crossword: {
    title: "Today's crossword",
    what:
      "Estonian words crossing each other, with English clues. Each clue also says whether it " +
      "wants a noun, a verb or so on, so only one word fits.",
    you: "Fill in the grid, then check it. Take as long as you like.",
    action: "Start",
  },
  lesson: {
    title: "This unit, one word at a time",
    what: "You'll meet each of the unit's words first, then use them in real sentences.",
    you: "Meeting a word isn't scored, so take your time with it. Then answer.",
    action: "Start the lesson",
  },
  checkpoint: {
    title: "A checkpoint, not a test",
    what:
      "A short set of questions from across the level. You'll find out how you did at the end, " +
      "not after each one.",
    you: "Answer each one as best you can and keep going. Leaving one blank is an honest answer.",
    action: "Start",
  },
} as const satisfies Record<string, Briefing>;

/** The briefing for a round, or nothing where a caller names one nobody wrote. */
export function briefingFor(id: string): Briefing | null {
  return (BRIEFINGS as Record<string, Briefing>)[id] ?? null;
}
