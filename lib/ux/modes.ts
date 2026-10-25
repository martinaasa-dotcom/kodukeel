/**
 * Every way to practice, once.
 *
 * There were four lists of these. Today carried six tiles with one wording,
 * `/practice` carried eleven modes with another, `components/PracticeModes.tsx`
 * carried seven with a third and no screen rendered it at all, and the command
 * palette carried six more. The same mode was called "60 seconds, weak cards"
 * on one screen and "60 seconds" on the next, Sentences was `accent` here and
 * `blush` there, and adding a mode meant remembering four files, which is how
 * a mode ends up on two screens and missing from the other two.
 *
 * So this is the table and the screens read it. What a mode *is* lives here;
 * what it is like *right now* does not, because that is a database query and
 * this module has none. `/practice` computes "12 ready" or "Best: 38" and
 * hands it in beside the row.
 *
 * Two groups, and the split is how long the thing takes rather than how hard
 * it is: `quick` is a round you can finish waiting for a bus, `targeted` is
 * what you open when you already know what is going wrong.
 *
 * Pure, and the icon is a lucide *name* for the reason `lib/ux/nav.ts` gives.
 */

import type { Tone } from "./nav";

export interface PracticeMode {
  href: string;
  /**
   * The English half of its agreed name, which is `lib/ux/roundNames.ts`'s:
   * a screen draws the Estonian there and this in parentheses after it.
   * `roundNames.test.ts` holds the two equal, so a round renamed in one table
   * and not the other fails rather than being called two things.
   */
  title: string;
  /** Three or four words for what it does. Under the title on a tile. */
  subtitle: string;
  /** The longer reason to press it. Shown where there is room for a paragraph. */
  blurb: string;
  /** A lucide icon name. See components/icons.tsx. */
  icon: string;
  /** Its hue, for its icon. The Games board chooses its own tile colours (`lib/ux/games.ts`). */
  tone: Tone;
  /**
   * What kind of thing it is: a round, or a drill for a named weakness.
   */
  group: "quick" | "targeted";
  /**
   * A standing fact about the mode, for the ones where there is no figure to
   * show. `/practice` prefers a live count when it has one.
   */
  note: string;
  /**
   * Reached from the screen that names the weakness it drills, so the practice
   * menu does not carry a row for it. The same field, with the same meaning, as
   * `Destination.within` in `lib/ux/nav.ts`.
   *
   * Never "hidden". This file already drew the distinction and then ignored it:
   * `targeted` is described above as "what you open when you already know what
   * is going wrong", and all five of them sat on a menu under a heading saying
   * so, which is a list of answers to a question the learner has not been asked
   * yet. A verb government drill is worth pressing on the page explaining verb
   * government, and worth nothing on a menu beside five other things.
   *
   * All of them stay in `PRACTICE_MODES`, so the command palette still goes
   * there and a bookmark still works. The value is where it is reached from,
   * and there is an invariant that the page it names really does link to it.
   */
  within?: string;
}

export const PRACTICE_MODES: readonly PracticeMode[] = [
  {
    /*
      A card of its own on `/practice` under "Your words", with the learner's
      decks as choices inside it, which is why it carries `within` and is not
      one of the skill tiles.

      `targeted` is the honest group for it too. It is not a round you play for
      five minutes whatever state your deck is in, it is what you open when you
      know which words are not sticking, which is what the group means.
    */
    href: "/review/flashcards", title: "Flash cards", subtitle: "Words you've met",
    icon: "Layers", tone: "accent", group: "targeted", note: "Typed, varied",
    within: "/practice",
    blurb:
      "Words you already know, asked in ways your daily review never does. Type what you hear " +
      "in a sentence, fill a gap knowing only what it means, or write a sentence of your own. " +
      "Get a word right five times, three different ways, and it's done.",
  },
  {
    /*
      THE EXERCISE EVERY COURSE BOOK IS MADE OF, AND A CARD FOR THAT REASON.

      A numbered page of real sentences, each with a word in brackets and a
      line to write its form on, the first one filled in as an example: the
      homework every Estonian class sets, and the one exercise where a learner
      has to read a whole sentence and work out what job the missing word is
      doing before writing its ending. A card of its own on `/practice`, with
      its themes as choices inside it, for the
      reason Flash cards is one: there is a choice to make in it. See
      `lib/games/workbook.ts`.
    */
    href: "/review/workbook", title: "Workbook", subtitle: "Fill in the right form",
    icon: "BookOpen", tone: "butter", group: "targeted", note: "A page of real sentences",
    within: "/practice",
    blurb:
      "A page from a course book, set from your own words: pick the right form, write it, or " +
      "choose the word from a box. Check the page, fix what's wrong with a hint, then read it " +
      "back corrected.",
  },
  {
    /*
      The same round as Flash cards, pointed at one of the four frequency
      lists instead of at the whole deck, so its four lists are a row of
      choices inside the Flash cards card rather than a tile of their own.

      Its own route is the index at `/review/common`, which is where the
      palette lands and where the counts are. `/practice` draws the four
      buttons straight onto its card, so pressing one is one press.
    */
    href: "/review/common", title: "Most common words", subtitle: "The ones you hear most",
    icon: "TrendingUp", tone: "sky", group: "targeted", note: "Four lists",
    within: "/practice",
    blurb:
      "Four lists of the hundred words Estonians say most, counted from real films and TV. Learn " +
      "these and you'll catch a good share of any conversation. Each word comes back with a new " +
      "ending every time.",
  },
  {
    /*
      Folded under the Review card on `/practice`, since it is the other thing
      somebody's own log says is worth doing today. It stays in the table so
      the palette finds it.
    */
    href: "/quest", title: "Daily task", subtitle: "Your weak spots",
    icon: "Target", tone: "accent", group: "targeted", note: "From your log",
    within: "/practice",
    blurb:
      "A short round on the endings you get wrong most, picked from your own answers. It counts " +
      "like any other practice, so whatever you miss comes back sooner.",
  },
  {
    href: "/review/letters", title: "Letters", subtitle: "Unscramble a word", icon: "Blocks", tone: "accent",
    group: "targeted", note: "Eight words",
    within: "/games",
    blurb:
      "A word you know, with its letters jumbled. Hear it, then tap them back in order. You can play it from your very first five words.",
  },
  {
    /*
      Letter names, the one thing a learner needs them for: a word comes down
      the line spelled the Estonian way, in the native speaker's recordings.
    */
    href: "/review/spelled", title: "Letter by letter", subtitle: "Spelled down the phone", icon: "Phone", tone: "accent",
    group: "targeted", note: "Six words",
    within: "/games",
    blurb:
      "A word you know, spelled out letter by letter the way Estonians spell a name on the phone. Write it down.",
  },
  {
    /*
      Numbers said out loud, which nothing in the app drilled on their own
      (docs/41-fifth-batch.md, VB-7). Named the way Tähed and Sõnad are, in
      the language it is played in, with the English on the subtitle. A drill
      on the A2 rotation and a round on Practice; the microphone is always
      offered here, since saying it is the task, and typing works the same.
    */
    href: "/review/numbers", title: "Numbers", subtitle: "Prices, times, numbers",
    icon: "Hash", tone: "sky", group: "targeted", note: "Ten, said or typed",
    within: "/practice",
    blurb:
      "A price tag, a clock on the wall, a timetable, a number. Say it in Estonian, or type it, and hear it said back.",
  },
  {
    href: "/sonad", title: "Words", subtitle: "Guess the day's word",
    icon: "CircleDot", tone: "sky", group: "targeted", note: "Six letters, seven guesses",
    within: "/games",
    blurb:
      "One Estonian word at your level, six letters long, and a new one every morning. Every " +
      "guess tells you which letters are in the right spot, which are in the word somewhere " +
      "else, and which aren't in it at all.",
  },
  {
    /*
      Named the way Sõnad is, in the language it is played in. `ristsõna` is
      the word a shop in Tallinn prints on the puzzle book, and a learner who
      meets it here can read it on one. The English name is not dropped, it
      moves to the subtitle, which is where every screen already puts what a
      mode does: the title says what this is called and the line under it says
      what it is, which is the shape the grammar screens take with a case.

      That also keeps it findable both ways. The palette folds both sides, so
      `ristsona` off a keyboard with no õ lands on the title, and `crossword`
      lands on the subtitle, which the palette searches too. Which is why the
      subtitle spends the whole 24-character budget `nav.test.ts` sets: it is
      carrying the English name now as well as saying what the round does.
    */
    href: "/crossword", title: "Crossword", subtitle: "Crossword, English clues",
    icon: "Grid3x3", tone: "butter", group: "targeted", note: "A new grid daily",
    within: "/games",
    blurb:
      "Seven Estonian words at your level, crossing each other, with clues in English. You know " +
      "what you want to say and you hunt for the word.",
  },
  {
    href: "/review/map", title: "Where?", subtitle: "See what an ending means",
    icon: "Map", tone: "sky", group: "targeted", note: "Pictures, no clock",
    within: "/games",
    blurb:
      "A row of emoji: somebody walking into a house, a present going to a girl, a caterpillar " +
      "turning into a butterfly, and three forms of one word. Only the ending tells them apart, and " +
      "the picture is what it means. Afterwards you read a real sentence using it. Now and then a " +
      "ball sits under, behind or on top of something, and you pick the place word that says where.",
  },
  {
    /*
      Words that look alike and are not the same word: kuulma and kuulama,
      ostma and otsima. Reached from Practice and from the grammar page that
      explains the three kinds, which links a group straight into it. See
      `lib/collections/twins.ts`.
    */
    href: "/review/twins", title: "Twins", subtitle: "Tell look-alikes apart",
    icon: "Scale", tone: "blush", group: "targeted", note: "Ten pairs, no clock",
    within: "/games",
    blurb:
      "Two or three words that look alike, a real sentence with one of them missing, and what " +
      "the sentence means in English. Pick the one the writer used, then see the other one in a " +
      "sentence of its own.",
  },
  {
    /*
      A verb and one small word that changes what it means: läks katki is a
      vase breaking, not a vase going anywhere. Five at a time, seen, matched
      and filled in a real sentence. Reached from Practice. See
      `lib/estonian/sayings.ts` and `lib/games/sayings.ts`.
    */
    href: "/review/sayings", title: "Expressions", subtitle: "Pairs that fool you",
    icon: "Quote", tone: "butter", group: "targeted", note: "Five at a time, no clock",
    within: "/games",
    blurb:
      "A verb and one small word that change what it means. Take each pair apart word by word, " +
      "guess what it means, then match five of them, place them in a situation and fill in the " +
      "missing word in a real sentence.",
  },
  {
    /*
      Compounds with honest names (a turtle is a shield frog, a bat a leather
      mouse) and words that only look or sound English. Five at a time, taken apart,
      guessed and named. Reached from Practice. See `lib/estonian/literally.ts`
      and `lib/games/wordplay.ts`.
    */
    href: "/review/wordplay", title: "Wordplay", subtitle: "Words with honest names",
    icon: "Smile", tone: "butter", group: "targeted", note: "Five at a time, no clock",
    within: "/games",
    blurb:
      "Compound words read piece by piece, like a bat that's a leather mouse, and words that " +
      "only look or sound English. Take each one apart, guess what it means, then name it from what it says.",
  },
  {
    /*
      Twenty questions, which is the classic game against a machine: it holds a
      thing in mind and the learner has twenty yes or no questions to name it.
      The Estonian is the learner's own, a whole question typed with the forms
      it needs, and every question comes back with what the game took it to
      mean and a plain tip where the sentence could be better. See
      `lib/games/twenty.ts`. A game, so it sits with the other games on
      `/practice`; it grades nothing, for the reason Say what you see does not.
    */
    href: "/review/twenty", title: "20 Questions", subtitle: "Twenty questions",
    icon: "MessageCircleQuestion", tone: "blush", group: "targeted", note: "Ask in Estonian",
    within: "/games",
    blurb:
      "I'm thinking of something. Ask yes or no questions in Estonian, like kas see on suur? " +
      "You get twenty, and a tip whenever a question could be put better.",
  },
  {
    href: "/review/match", title: "Pairs", subtitle: "Pair words and meanings", icon: "Grid2x2", tone: "sky",
    group: "targeted", note: "No time yet", within: "/games",
    blurb: "Eight words and eight meanings, all jumbled up. Pair them off as fast as you can.",
  },
  {
    href: "/review/sentences", title: "Sentences", subtitle: "Put a sentence in order", icon: "Puzzle", tone: "accent",
    group: "targeted", note: "Needs sentences", within: "/games",
    blurb: "A real Estonian sentence, cut up and shuffled. Tap the words back into order.",
  },
  {
    href: "/review/listening", title: "Listening", subtitle: "What did you hear?", icon: "Headphones",
    tone: "blush", group: "quick", note: "Twenty words",
    blurb: "Hear a word without seeing it, then pick what it means. Good for training your ear.",
  },
  {
    href: "/review/dictation", title: "Dictation", subtitle: "Hear it, write it", icon: "Ear", tone: "butter",
    group: "quick", note: "Needs sentences",
    blurb: "Hear a sentence and write it down, with every õ, ä, ö and ü in its place.",
  },
  {
    href: "/review/speaking", title: "Pronunciation", subtitle: "Say it out loud", icon: "Mic", tone: "sky",
    group: "quick", note: "Then hear it said",
    blurb: "Say a word along with a native speaker, say it back, then say it from its meaning. You see which words were heard.",
  },
  {
    /*
      The picture game and the conversation game, which turned out to be one
      thing: a situation, and the learner producing Estonian about it. See
      `lib/collections/scenes.ts` for why the picture is emoji rather than the
      cartoon artwork that was asked for, and why that is the better answer
      rather than the cheaper one. It is a quick round now: two or three
      scenes, five sentences each, which is the writing part of the state
      examination in miniature.
    */
    href: "/review/describe", title: "Describing a picture", subtitle: "Five sentences",
    icon: "Eye", tone: "accent", group: "quick", note: "Two or three scenes",
    blurb:
      "A scene made of emoji. Write five sentences about what you see, one in each box. We check " +
      "that each one is about the scene and that the Estonian is right, and tell you what to fix.",
  },
  {
    href: "/review/write", title: "Writing", subtitle: "Your own sentence", icon: "PenLine", tone: "sky",
    group: "targeted", note: "You write it",
    blurb:
      "Write a sentence using a word with the ending we ask for. The dictionary checks the " +
      "ending itself, so your mark is right even when Anu isn't around.",
    within: "/grammar/[case]",
  },
  {
    href: "/review/government", title: "Verb cases", subtitle: "Which case a verb takes", icon: "Scale",
    tone: "blush", group: "targeted", note: "Multiple choice",
    blurb:
      "Aitan sind, but helistan sulle. English gives you no hint which case a verb wants, so " +
      "you learn it verb by verb, and this is where you practice that.",
    within: "/grammar/topic/government",
  },
  {
    href: "/review/openers", title: "What next?", subtitle: "Hear the ending coming", icon: "Shuffle",
    tone: "accent", group: "targeted", note: "Choose, then type",
    blurb:
      "Mulle meeldib pasta, but ma tahan pastat. The first words of a sentence decide the form of " +
      "its last word, and this is where you learn to hear that.",
    within: "/games",
  },
  {
    href: "/review/pairs", title: "Long or short", subtitle: "Long sound or short?", icon: "Ear", tone: "sky",
    group: "targeted", note: "Needs audio", within: "/grammar/topic/gradation",
    blurb:
      "Maja or majja? The difference is how long you hold one sound, and spelling only half shows it.",
  },
  {
    href: "/review/cloze", title: "Your own text", subtitle: "Paste in any Estonian",
    icon: "ScissorsLineDashed", tone: "butter", group: "targeted", note: "Your own text",
    blurb:
      "Paste in an article or your homework. We blank out the words you've learned, and you " +
      "fill them back in the way the writer had them.",
    within: "/dictionary",
  },
  {
    href: "/review/conjugation", title: "Conjugation", subtitle: "One verb, six people", icon: "Repeat",
    tone: "accent", group: "targeted", note: "Six persons", within: "/grammar/topic/present-tense",
    blurb:
      "One verb, with the \"I\" form given. You fill in the other five people, picking them at " +
      "A1 and typing them from A2. At B1 the \"would\" forms join in.",
  },
  {
    /*
      The one drill whose subject is a list of words rather than a shape of
      question. `within` is the reference page that names them, which is the
      screen a learner is standing on when the question occurs to them, and it
      is where the same words are readable rather than asked.
    */
    href: "/review/exceptions", title: "Exceptions", subtitle: "Words that break rules",
    icon: "TriangleAlert", tone: "butter", group: "targeted", note: "Typed, three rungs",
    within: "/grammar/exceptions",
    blurb:
      "Tuppa, not toasse. Words that don't follow the usual pattern, so you just have to know " +
      "them. Meet each one, type it, then use it in a real sentence.",
  },
  {
    /*
      Reached from the deck it is a slice of, which is where somebody is
      standing when they wonder what happened to the word they looked up.

      It is `targeted` in the strict sense the group means: you open it because
      you already know what is going wrong, and what is going wrong is that the
      review queue introduces unseen cards oldest first, so a word added out of
      curiosity waits behind the whole course backlog. `commonFirst` fixed the
      ordering for the words the corpus counts; this is for the ones it has
      never heard of, which is most of what anybody looks up.
    */
    href: "/review/lookups", title: "Words you looked up", subtitle: "Words you added",
    icon: "BookmarkCheck", tone: "sky", group: "targeted", note: "From your own adds",
    blurb:
      "Every word you added yourself, from the dictionary, a photo, a pasted list or Anu. You " +
      "picked them, so here they get a turn without waiting behind the course.",
    within: "/words",
  },
  {
    href: "/review/clinic", title: "Tricky words", subtitle: "Words you keep missing", icon: "Stethoscope",
    tone: "blush", group: "targeted", note: "From your log",
    blurb:
      "The few cards you keep getting wrong, with a look at why. Sort them out here before " +
      "they pile up.",
    within: "/progress",
  },
];

/**
 * The rounds Practice offers as skills: hearing, writing down, saying and
 * describing. Every game carries `within: "/games"` and is drawn by the
 * Games board (`lib/ux/games.ts`), and the cards with a choice inside them
 * carry `within: "/practice"`, so what is left with no `within` is the skill
 * tiles. The command palette searches every mode either way.
 */
export const QUICK_MODES = PRACTICE_MODES.filter((m) => m.group === "quick" && !m.within);

/**
 * Every mode reached from a screen that names it rather than from a menu, and
 * where each is reached from: a game from the Games board, a word card from
 * Practice, and a drill from the page that names the thing it drills (the
 * clinic under the cards they keep failing, the verb government drill under
 * the page explaining rektsioon, writing under the case it asks for).
 */
export const TARGETED_MODES = PRACTICE_MODES.filter((m) => m.within);

/** Whichever mode drills a given thing, for the page that names it. */
export function modeAt(href: string): PracticeMode | undefined {
  return PRACTICE_MODES.find((m) => m.href === href);
}
