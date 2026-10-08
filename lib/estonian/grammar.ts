import { CASES, type CaseSpec } from "./cases";
import { grammarTerm } from "./terms";
import type { CaseKey } from "./types";

/**
 * The reference layer: what each ending is *for*, in English.
 *
 * Every drill in the app can tell a learner they got `toas` wrong. None of them
 * can tell them that -s is the ending that means "in", and that Estonian glues
 * it on where English would reach for a preposition. That gap is where people
 * give up, and a tutor conversation is a poor substitute for a page you can
 * re-read on the bus.
 *
 * WHAT LEADS IS THE ENDING AND WHAT IT MEANS. Not the Latin name, and not the
 * Estonian one either. Nobody working out how to say "in the room" is looking
 * for the inessive; they are looking for -s. The names are on the page, because
 * a learner in a class hears `seesütlev` and a learner with an English grammar
 * reads "inessive", and both have to be able to find their way in. They are the
 * cross-reference. The ending and the plain English word are the identity.
 *
 * Three rules hold this file together:
 *
 * 1. **Nothing here is Estonian.** Not an example, not a form, not a phrase.
 *    The case names and the question words already live in `cases.ts`, taken
 *    from the domain model; everything added here is English prose about
 *    Estonian, which is the one thing the app is allowed to author (ADR-005).
 *    `grammar.test.ts` keeps a tripwire on it: a regex cannot tell prose from a
 *    smuggled form, but Estonian of any length reaches for its own letters.
 * 2. **It is framework-free data.** The page that renders it pairs each note
 *    with real forms out of the learner's own dictionary rows, so the examples
 *    on screen are always attested and always words they are actually studying.
 * 3. **One line per field.** A reference nobody finishes reading has taught
 *    nobody anything, and the version before this one ran to four paragraphs a
 *    case. `summary` is a sentence, `uses` are three short phrases, `watchOut`
 *    is the single mistake worth naming. Anything longer belongs in a lesson.
 */
export interface CaseNote {
  readonly key: CaseKey;
  /**
   * What the ending means, in the fewest English words that are true.
   *
   * This is what the screen leads with. "in", "out of", "with": the word a
   * learner is actually hunting for when they open this page mid-sentence.
   */
  readonly plain: string;
  /** One line: what this case does, in the plainest English available. */
  readonly summary: string;
  /** Where it turns up. Each entry is a use, not an example sentence. */
  readonly uses: readonly string[];
  /** The one mistake an English speaker actually makes with this case. */
  readonly watchOut: string;
  /** How an English speaker can feel their way to it. Omitted where honest. */
  readonly englishHook?: string;
}

/**
 * Ordered as `CASES` is, which is the order every Estonian classroom recites
 * them in. Deviating from it to put "useful" cases first would help nobody who
 * is also taking a course.
 */
export const CASE_NOTES: readonly CaseNote[] = [
  {
    key: "NOMINATIVE",
    plain: "the plain word",
    summary: "The word as the dictionary lists it, and whoever is doing the action.",
    uses: [
      "Whoever or whatever is doing the action",
      "The word as you'd look it up",
      "A whole object after a command, or in the plural",
    ],
    watchOut:
      "It's the object after a command, like \"put the book down\". But in \"I bought the book\", the book takes the next form down, the one meaning \"whose\".",
    englishHook: "The dog in \"the dog barks\", exactly as it is.",
  },
  {
    key: "GENITIVE",
    plain: "of, and whose",
    summary: "Whose something is. It's also the base the other eleven endings go onto.",
    uses: [
      "Saying whose something is",
      "A whole object, like the car you bought",
      "The base that the eleven endings below are added to",
    ],
    watchOut:
      "Get this one right and eleven more forms come for free, because they're all built on it. Get it wrong and all eleven go wrong with it.",
    englishHook: "The book's cover, the cover of the book.",
  },
  {
    key: "PARTITIVE",
    plain: "some of it",
    summary: "Some of something, an action that isn't finished, and anything after a number.",
    uses: [
      "Some of a thing rather than all of it",
      "An action you're still in the middle of",
      "After any number above one",
    ],
    watchOut:
      "English doesn't mark any of this, so there's no instinct to lean on at first. The form can't be guessed either, so learn it with each new word.",
    englishHook: "Some water. A book you're reading but haven't finished.",
  },
  {
    key: "ILLATIVE",
    plain: "into",
    summary: "Going into something: a room, a new language, a bad mood.",
    uses: ["Going into a place or a container", "Going into a state or a stretch of time"],
    watchOut:
      "Many everyday words have a second, shorter form, and that's the one people actually say. The dictionary shows it wherever there is one, and both count.",
    englishHook: "Into the room, into the nineties, into a bad mood.",
  },
  {
    key: "INESSIVE",
    plain: "in",
    summary: "Being inside something, and being in a month, a language or a mood.",
    uses: ["Position inside a place", "Being in a state, a language, or a month"],
    watchOut:
      "Estonian and English don't always agree on what counts as inside. Towns and rooms are, but some islands and open places aren't, so learn those as you meet them.",
    englishHook: "In the house, in March, in a good mood.",
  },
  {
    key: "ELATIVE",
    plain: "out of",
    summary: "Coming out of something, and also what a book or a chat is about.",
    uses: [
      "Coming out of a place",
      "What something is made of",
      "What a text or a conversation is about",
    ],
    watchOut:
      "The surprise is \"about\". Talking about history takes the same ending as walking out of a building.",
    englishHook: "Out of the house. A book about history.",
  },
  {
    key: "ALLATIVE",
    plain: "onto, and to a person",
    summary: "Going onto a surface, and the person you give something to.",
    uses: ["Going onto a surface", "The person something is given, said or sent to"],
    watchOut:
      "English says \"to the shop\" and \"to Anna\" with one little word. Estonian asks which kind of \"to\": into something is -sse, onto something or to a person is this one.",
    englishHook: "Onto the table. To a friend, to your teacher.",
  },
  {
    key: "ADESSIVE",
    plain: "on, at, and have",
    summary: "Being on something, and how Estonian says somebody has something.",
    uses: [
      "Position on a surface",
      "Having something: the owner takes this ending",
      "When something happens",
    ],
    watchOut:
      "There's no verb for \"have\". The owner takes this ending and the thing they own becomes the subject, so the sentence feels inside out at first.",
    englishHook: "On the table. \"I have a cat\" comes out as \"at me is a cat\".",
  },
  {
    key: "ABLATIVE",
    plain: "off, and from a person",
    summary: "Coming off a surface, and the person you get something from.",
    uses: ["Coming off a surface", "The person something is taken, bought or asked from"],
    watchOut:
      "Think \"off a table\", not \"out of a box\". That one difference is all that separates this ending from -st.",
    englishHook: "Off the table. From the person who sold it to you.",
  },
  {
    key: "TRANSLATIVE",
    plain: "becoming",
    summary: "Turning into something, what a thing is for, and by when.",
    uses: ["Turning into a state or a role", "What something is for", "A deadline: by when"],
    watchOut:
      "It covers far more than English \"into\". Becoming a teacher, the weather turning cold and being ready by Friday all use this one ending.",
    englishHook: "Turning cold, getting it as a gift, done by Friday.",
  },
  {
    key: "TERMINATIVE",
    plain: "up to",
    summary: "As far as some point: a place, a moment or an amount.",
    uses: ["As far as a place", "Until a moment", "Up to an amount"],
    watchOut:
      "The ending already means \"as far as\", so the extra word people sometimes add when talking says it twice. Harmless, but you don't need it.",
    englishHook: "As far as the church. Right up until Friday.",
  },
  {
    key: "ESSIVE",
    plain: "as",
    summary: "In the role of something, usually for now rather than forever.",
    uses: ["Working as something", "A role or a capacity you are in for now"],
    watchOut:
      "The -ks ending is for getting into a role. This one means you're already in it. Keep those two apart and you've got it.",
    englishHook: "Working as a teacher, for as long as that lasts.",
  },
  {
    key: "ABESSIVE",
    plain: "without",
    summary: "Without something. The exact opposite of \"with\", the next one down.",
    uses: ["The absence of a thing", "Doing something without a tool, a person or permission"],
    watchOut:
      "You won't hear it much out loud, where people tend to use a separate word for \"without\". Learn to recognize it before you worry about using it.",
    englishHook: "Without a coat. Without asking.",
  },
  {
    key: "COMITATIVE",
    plain: "with",
    summary: "With a person, with a tool, and how you got somewhere.",
    uses: ["Together with somebody", "The tool you did it with", "How you got somewhere, like by bus"],
    watchOut:
      "It covers \"with a friend\" and \"with a knife\", which plenty of languages keep apart. It's always -ga, so it's the easiest ending to spot.",
    englishHook: "With a friend, with a fork, and by bus.",
  },
];

export interface CaseReference extends CaseNote {
  readonly spec: CaseSpec;
}

/** The note and the grammatical spec together, which is what a page wants. */
export function caseReference(key: string): CaseReference | undefined {
  const note = CASE_NOTES.find((n) => n.key === key);
  const spec = CASES.find((c) => c.key === key);
  if (!note || !spec) return undefined;
  return { ...note, spec };
}

export function allCaseReferences(): CaseReference[] {
  // Driven by CASES, not by CASE_NOTES, so the traditional order is the one
  // source of truth for it and a missing note is a build-time type error
  // rather than a silently reordered page.
  return CASES.map((spec) => {
    const note = CASE_NOTES.find((n) => n.key === spec.key)!;
    return { ...note, spec };
  });
}

/**
 * The four groups, headed by the endings rather than by the names.
 *
 * "Inside: -sse, -s, -st" is a heading somebody can use. "The inside local
 * cases" is a heading somebody has to decode first, and the version of this
 * page that led with the Latin names asked a beginner to hold fourteen of them
 * in their head before a single ending had been explained.
 */
export const CASE_GROUPS: readonly { title: string; blurb: string; keys: readonly CaseKey[] }[] = [
  {
    title: "Three to memorize",
    blurb: "You learn these three with each new word, because no rule gives them to you. The second one matters most: every ending below is added to it.",
    keys: ["NOMINATIVE", "GENITIVE", "PARTITIVE"],
  },
  {
    title: "Inside",
    blurb: "Into, in and out of. For boxes, buildings and towns, and for languages, months and moods too.",
    keys: ["ILLATIVE", "INESSIVE", "ELATIVE"],
  },
  {
    title: "On top",
    blurb: "Onto, on and off. For tables and shelves, for people, and for how Estonian says someone has something.",
    keys: ["ALLATIVE", "ADESSIVE", "ABLATIVE"],
  },
  {
    title: "Five more, one job each",
    blurb: "Becoming, up to, as, without and with. No puzzles here: each ending is one simple idea.",
    keys: ["TRANSLATIVE", "TERMINATIVE", "ESSIVE", "ABESSIVE", "COMITATIVE"],
  },
];

/**
 * The endings a group covers, for the heading over it.
 *
 * Read off the group's own keys rather than typed into the title beside them,
 * which is where they started: a heading is set in `label-xs` and that
 * uppercases, so "Inside: -sse, -s, -st" reached the screen as "-SSE, -S, -ST",
 * which is not what any of those endings is. Deriving them also means the
 * heading cannot come apart from the cards under it.
 */
export function groupEndings(group: { keys: readonly CaseKey[] }): string[] {
  return group.keys.flatMap((key) => {
    const spec = CASES.find((c) => c.key === key);
    return spec && !spec.principal ? [`-${spec.suffix}`] : [];
  });
}

/**
 * The grammar the course teaches beyond the endings.
 *
 * Every unit in the syllabus names the grammar it carries, and before this
 * those names pointed at nothing: a B2 unit could say it taught the impersonal
 * and the app had no page saying what the impersonal was. A course that can
 * only mark an answer wrong is a test with a syllabus attached.
 *
 * Same rules as the case notes, with one addition. `marker` names an ending,
 * because the quotative cannot be explained in English without naming the
 * ending that makes it, and a learner who has met the word "quotative" has not
 * met the thing. A marker is grammatical terminology, not an example: it is
 * never a word, never drilled as an answer, and the page shows real forms out
 * of the dictionary beside it. `grammar.test.ts` holds it to that, so the field
 * cannot quietly become somewhere to write Estonian.
 */
export interface TopicNote {
  readonly id: string;
  readonly title: string;
  /** One line: what it does, in the plainest English available. */
  readonly summary: string;
  /** The ending that carries it, where one does. Terminology, not an example. */
  readonly marker?: string;
  /** What it is for. Each entry is a use, not an example sentence. */
  readonly points: readonly string[];
  /** The one mistake an English speaker actually makes. */
  readonly watchOut: string;
}

export const TOPIC_NOTES: readonly TopicNote[] = [
  // ── The verb, tense and mood ─────────────────────────────────────────────
  {
    id: "olema",
    title: "To be, and having things",
    summary: "There's no verb for \"have\". You say the thing is \"at you\" instead.",
    points: [
      "The verb you'll use in every conversation, and it's irregular",
      "For \"I have\", you say \"at me is\", with -l on the owner",
      "Being sleepy or hungry, or having to do something, works the same way",
    ],
    watchOut:
      "You'll reach for a \"have\" that isn't there. Instead the owner gets -l and the thing stays as it is: literally \"at me is a car\".",
  },
  {
    id: "present-tense",
    title: "Talking about now",
    summary: "One form covers \"I write\", \"I'm writing\" and even \"I'll write\".",
    points: [
      "One ending each for I, you, he or she, we, you all and they",
      "One form for both \"I eat\" and \"I'm eating\"",
      "It covers the future too, as in \"the concert is tomorrow\"",
    ],
    watchOut:
      "Knock -ma off the dictionary word and you won't always get the present. That's why each verb is learned with its \"I\" form, and the rest follow from it.",
  },
  {
    id: "negation",
    title: "Saying no",
    summary: "One small word does \"not\" for everybody, and the verb drops its ending.",
    points: [
      "The verb loses its ending and goes back to its shortest shape",
      "The same \"not\" for everyone, where English juggles don't and doesn't",
      "The past says no in a different way from the present",
    ],
    watchOut:
      "It's tempting to put \"not\" in front of the usual form. Estonian strips the ending off instead, so it's the pronoun that tells you who.",
  },
  {
    id: "imperfect",
    title: "Saying what happened",
    summary: "The past for anything that happened and is over. Every story is told in it.",
    points: [
      "\"I did\" usually ends in -sin, and some common verbs take -in",
      "Some very common verbs use -i- instead of -si-",
      "For anything that's over, even if it was five minutes ago",
    ],
    watchOut:
      "Build the past from the -ma word, not from the present. Which verbs take -i-, and what \"she did\" looks like, you learn one verb at a time.",
  },
  {
    id: "perfect",
    title: "Done, and it still matters",
    summary: "Like \"I have eaten\": \"to be\" plus the -nud word, for things that still matter now.",
    marker: "-nud",
    points: [
      "Built with \"to be\", never with \"to have\"",
      "For when the result matters more than when it happened",
      "The -nud word stays the same for every person",
    ],
    watchOut:
      "Where English says \"I have eaten\", Estonian uses \"to be\" plus the -nud word. There's no \"have\" in it at all, so don't go looking for one.",
  },
  {
    id: "pluperfect",
    title: "Done before something else",
    summary: "Like \"I had eaten\": the same -nud word, with \"to be\" in the past.",
    marker: "-nud",
    points: [
      "Something that was over before something else happened",
      "Common in stories, and when you retell what someone said",
      "Uses exactly the same -nud word as \"have done\"",
    ],
    watchOut:
      "Only \"to be\" goes into the past. The -nud word stays exactly as it was, and trying to put it in the past as well is the classic slip.",
  },
  {
    id: "future",
    title: "Talking about the future",
    summary: "There's no future tense. The present plus a word like \"tomorrow\" does the whole job.",
    points: [
      "A word like \"tomorrow\" is what makes it the future",
      "Verbs like \"plan\" and \"intend\" do the rest",
      "A small extra word can say it's going to get finished",
    ],
    watchOut:
      "Don't go hunting for a future tense, because there isn't one. Words like \"tomorrow\" and verbs like \"plan\" do the job instead.",
  },
  {
    id: "conditional",
    title: "Would, could, should",
    summary: "One ending that turns a sentence into a \"what if\", or makes a request polite.",
    marker: "-ksi-",
    points: [
      "Wishes and what-ifs: \"if I had time, I'd come\"",
      "Asking nicely: \"I'd like a coffee\", rather than \"I want\"",
      "Giving advice without bossing anyone around",
    ],
    watchOut:
      "This is how you're polite as much as how you say \"would\". What's fine between friends can sound blunt to a stranger, and this ending is the fix.",
  },
  {
    id: "imperative",
    title: "Telling somebody to do it",
    summary: "Telling someone to do something, with one form for one person and another for more.",
    points: [
      "One form for one person, another for a group, unlike English",
      "The group form is also the polite one for a single stranger",
      "\"Don't\" has a little word of its own",
    ],
    watchOut:
      "Using the singular with somebody you've just met sounds like an order. With a stranger, the plural is the safe choice.",
  },
  {
    id: "quotative",
    title: "Passing on what you heard",
    summary: "A verb ending that means \"apparently\": you pass it on without vouching for it.",
    marker: "-vat",
    points: [
      "Rumors, hearsay and things you read somewhere",
      "Common in the news, where who said it matters",
      "Can sound doubtful, depending on how it's said",
    ],
    watchOut:
      "English needs a word like \"apparently\". Estonian does it with a verb ending, so it's easy to read straight past it and take a rumor as fact.",
  },
  {
    id: "impersonal",
    title: "Said without naming who",
    summary: "Like \"people say\" or \"it's done\": someone does it, and the sentence doesn't say who.",
    marker: "-takse",
    points: [
      "Signs, instructions, forms and the news",
      "Says people did something, without saying which people",
      "Works in the past as well as the present",
    ],
    watchOut:
      "In English, \"the door was opened by the wind\" is fine. This form has no room for a \"by whom\", and it always means people did it, never the wind.",
  },
  {
    id: "participles",
    title: "Verb words that describe things",
    summary: "Verb forms that describe a noun, like \"a broken window\", and help build \"have done\".",
    marker: "-nud",
    points: [
      "Four in all, roughly \"reading\", \"having read\", \"to be read\" and \"read\"",
      "They describe a noun, the way \"a sleeping baby\" does",
      "With \"to be\", they make \"has done\" and \"had done\"",
    ],
    watchOut:
      "They're everywhere in written Estonian and rare in beginner courses. That's why reading suddenly feels harder than talking around the middle levels.",
  },
  {
    id: "past-participle",
    title: "The -nud form",
    summary: "The word behind \"have done\" and \"had done\", and a describing word in its own right.",
    marker: "-nud",
    points: [
      "With \"to be\" it makes \"have done\" and \"had done\"",
      "Describes something by what it has done, like \"a fallen leaf\"",
      "Has a twin in -tud for things done to something",
    ],
    watchOut:
      "It never changes shape, even in front of a noun, so it's one of the few words that ignores the endings completely. Its cousins in -v and -tav do change, and that's where people mix them up.",
  },
  {
    id: "converb",
    title: "The -des form",
    summary: "\"While doing\": two things at once, folded into one sentence.",
    marker: "-des",
    points: [
      "Two things at once, with no \"and\" or \"while\" needed",
      "Writers much prefer it to two sentences joined up",
      "Whoever does it is whoever does the rest of the sentence",
    ],
    watchOut:
      "The -des part borrows its \"who\" from the rest of the sentence. Give the two halves different people and the sentence ends up saying something you didn't mean.",
  },
  {
    id: "infinitives",
    title: "The two infinitives",
    summary: "There are two, and each verb decides which one it wants after it.",
    marker: "-ma",
    points: [
      "The -ma one comes after \"start\", \"go\" and \"have to\"",
      "The -da one comes after \"want\" and \"can\"",
      "Learn both with each verb, because one won't give you the other",
    ],
    watchOut:
      "Even the everyday verb for \"must\" takes the -ma one. English has just one \"to do\", so there's no instinct to fall back on. Learn the pairing with the verb.",
  },
  {
    id: "particle-verbs",
    title: "Verbs with a small word in front",
    summary: "Estonian's phrasal verbs. A little word can change the meaning completely.",
    points: [
      "The small word usually adds \"all the way\" or a direction",
      "Often it's the difference between doing and getting it done",
      "It wanders around the sentence instead of staying by the verb",
    ],
    watchOut:
      "Just like English phrasal verbs, the meaning often isn't the sum of the parts. Look up the verb on its own and you may get the wrong answer.",
  },
  {
    id: "aspect",
    title: "Finished or not",
    summary: "Whether an action got finished shows in the object's ending, not in the tense.",
    points: [
      "Done, and all of it: \"I ate the cake\", the whole cake",
      "Unfinished, or only some: the \"some of it\" ending",
      "Small words like \"up\" and \"off\" underline that it's finished",
    ],
    watchOut:
      "English shows this with the tense and Estonian with an ending, so the two never line up. It's the hardest single thing to carry over, so go easy on yourself.",
  },

  // ── The noun phrase ──────────────────────────────────────────────────────
  {
    id: "object",
    title: "Whole thing, or part of it",
    summary: "Is the object all of it and done, or just some of it and still going?",
    points: [
      "Done, and all of it: the plain word, or the form meaning \"whose\"",
      "Unfinished, or only part of it: the \"some of it\" ending",
      "After \"not\": always the \"some of it\" ending",
    ],
    watchOut:
      "This isn't about politeness or emphasis, and it isn't optional. It changes what the sentence means, and it's the main thing separating a B1 speaker from an A2 one.",
  },
  {
    id: "adjective-agreement",
    title: "Adjectives copy their noun",
    summary: "In \"in the big house\" both words take the ending. That's true for ten of the fourteen.",
    points: [
      "Same ending and same number, one or many, as its noun",
      "With -ni, -na, -ta and -ga, only the noun gets the full ending",
      "A few borrowed adjectives never change at all",
    ],
    watchOut:
      "Every adjective you learn is really a whole set of forms. Leaving it in its dictionary form next to a noun with an ending is the classic beginner giveaway.",
  },
  {
    id: "comparative",
    title: "Comparing things",
    summary: "Add -m to the same base the endings use, and \"big\" becomes \"bigger\".",
    marker: "-m",
    points: [
      "Add -m to the form meaning \"of\", the one the endings go on",
      "Either \"than\" plus the plain word, or no \"than\" and -st",
      "A few common ones are irregular, like English \"good, better\"",
    ],
    watchOut:
      "Both ways are right. The mistake is mixing them: keeping the word for \"than\" and putting the other thing in -st as well.",
  },
  {
    id: "superlative",
    title: "The most",
    summary: "Two ways to say it: a helper word in front, or one ending on the end.",
    points: [
      "A helper word in front of \"bigger\", which always works",
      "A one-word form, shorter and more literary",
      "Both are common and neither is wrong",
    ],
    watchOut:
      "Not every adjective has the one-word form you can work out, so when you're unsure, the two-word version is the safe bet.",
  },
  {
    id: "numerals",
    title: "Numbers and what follows them",
    summary: "Counting is easy, until you notice the thing you're counting stays singular.",
    points: [
      "From two up, the noun takes the singular \"some of it\" form",
      "Numbers take endings too, when the noun after them does",
      "First, second and so on are regular, and take endings too",
    ],
    watchOut:
      "After a number the noun stays singular, which will look wrong to an English speaker for a long time. It's singular with the \"some of it\" ending, not a plural.",
  },
  {
    id: "gradation",
    title: "Words that change in the middle",
    summary: "The middle of a word can shift from form to form, and only some of that shows in writing.",
    points: [
      "One kind swaps consonants, and you can see it on the page",
      "The other is a longer or shorter sound the spelling hides",
      "Which words do it is something you learn word by word",
    ],
    watchOut:
      "The app can only see spelling, so it tells you about the written changes and stays quiet about the rest. A word can change out loud and look identical on the page.",
  },
  {
    id: "derivation",
    title: "Building words from words",
    summary: "A handful of endings turn verbs into nouns, nouns into adjectives and back.",
    marker: "-mine",
    points: [
      "Any verb gives a noun for doing it, like \"reading\"",
      "An adjective gives a noun for the quality, like \"kindness\"",
      "Adjectives meaning \"-ish\" and \"-less\"",
    ],
    watchOut:
      "Six endings make thousands of words readable without a dictionary, which is the quickest win at B2. The trap is assuming the meaning is always the sum of the parts.",
  },
  {
    id: "nominalisation",
    title: "Turning a clause into a thing",
    summary: "A whole clause squeezed into one noun. It's what makes formal Estonian so dense.",
    marker: "-mine",
    points: [
      "One noun stands in for a whole \"that\" or \"when\" clause",
      "The doer goes in front, in the form that means \"whose\"",
      "Standard in academic, legal and official writing",
    ],
    watchOut:
      "This is the biggest single difference between B2 and C1 writing. Overdo it and you get the officialese Estonians grumble about as loudly as anybody.",
  },

  // ── The sentence ─────────────────────────────────────────────────────────
  {
    id: "government",
    title: "Verbs that demand an ending",
    summary: "Many verbs insist on a particular ending, and it's rarely the one English suggests.",
    points: [
      "Which ending comes after it is part of learning the verb",
      "Helping, calling, liking and thinking are the traps",
      "The dictionary shows it as a question word, like \"whom?\"",
    ],
    watchOut:
      "The English preposition points you at the wrong ending, and nothing about the verb hints at the right one. People trip on this for years, so learn it with the verb.",
  },
  {
    id: "word-order",
    title: "Word order",
    summary: "Freer than English, but not a free-for-all. The order carries the emphasis.",
    points: [
      "Endings show who did what, so the order is free to show emphasis",
      "The verb usually comes second",
      "The new or important bit usually goes last",
    ],
    watchOut:
      "Because almost any order is grammatical, you can write sentences that are correct but put the weight in the wrong place. It's a C1 skill, not a rule to memorize.",
  },
  {
    id: "subordination",
    title: "Joining clauses",
    summary: "A linking word, a clause, and a comma you can't leave out.",
    points: [
      "A comma always goes before \"that\", \"because\" and friends",
      "The word order changes inside that part",
      "Long chains of them are normal in writing, rarer out loud",
    ],
    watchOut:
      "Estonian commas follow the grammar, not the places you'd pause reading aloud, so English instincts go wrong both ways.",
  },
  {
    id: "relative-clause",
    title: "Which and who",
    summary: "\"Which\" and \"who\" take the ending their own clause needs, not the noun's.",
    points: [
      "Different pronouns for people and for things",
      "Its ending depends on its job in its own part of the sentence",
      "Always separated by a comma",
    ],
    watchOut:
      "The classic mistake is matching the pronoun to the noun it points back to. Ask what job it's doing in its own clause instead.",
  },
  {
    id: "reported-speech",
    title: "Reporting what somebody said",
    summary: "Either \"that\" plus a clause, or the -vat form with no extra clause at all.",
    points: [
      "\"She said that...\" plus a clause, much like English",
      "Or the -vat form, which needs no \"said\" at all",
      "The tense does not shift back the way English does",
    ],
    watchOut:
      "English turns \"she says she's tired\" into \"she said she was tired\". Estonian keeps the tense as it was, and shifting it changes the meaning.",
  },
  {
    id: "concession",
    title: "Granting a point",
    summary: "Although, nevertheless, even so. Agreeing with half before you disagree.",
    points: [
      "Words like \"although\" that start a clause",
      "Words like \"even so\" that start a new sentence",
      "The backbone of any essay that argues a point",
    ],
    watchOut:
      "They look interchangeable in a dictionary but aren't. Some start a clause and some only link sentences, and swapping them breaks the punctuation.",
  },
  {
    id: "hedging",
    title: "Probably, rather than definitely",
    summary: "Saying something is likely without waffling about it.",
    points: [
      "Words like \"probably\", \"likely\" and \"perhaps\"",
      "The \"would\" form, which softens a claim as well as a request",
      "The -vat form, which puts the claim on somebody else",
    ],
    watchOut:
      "Academic Estonian hedges more than academic English, and in different places. Translate an English hedge directly and it comes out somewhere between vague and evasive.",
  },
  {
    id: "cohesion",
    title: "Holding a text together",
    summary: "The linking words that turn a pile of sentences into something people can read.",
    points: [
      "Ordering and adding: first, also, finally",
      "Contrast and result: \"but\", \"so\", \"therefore\"",
      "Pointing back to something without repeating it",
    ],
    watchOut:
      "A text can be correct sentence by sentence and still hard to follow. This separates a C1 essay from a B2 one far more than vocabulary does.",
  },
  {
    id: "emphasis",
    title: "Emphasis",
    summary: "Where you put a word decides what the sentence is stressing.",
    points: [
      "Move a word to the front to stress it",
      "Small words that point at what matters most",
      "Word order does what English does by stressing a word out loud",
    ],
    watchOut:
      "English stresses with the voice and keeps the order fixed. Say an English-shaped sentence with English stress here and it stresses nothing.",
  },
  {
    id: "rhetorical-questions",
    title: "Questions that aren't really questions",
    summary: "Asking to make a point, and the little word that marks a real question.",
    points: [
      "A small word at the start marks a real yes or no question",
      "Leave it out and just raise your voice, and it sounds different",
      "Common in speeches and opinion writing",
    ],
    watchOut:
      "The little question word is easy to drop, and dropping it can make a plain question sound like you can't believe it.",
  },
  {
    id: "punctuation",
    title: "Where the commas go",
    summary: "Commas here follow the grammar, not the pause. The rules are stricter than English.",
    points: [
      "A comma before \"that\" or \"because\", pause or no pause",
      "Rules for lists and for asides",
      "Quotation marks are shaped differently from English ones",
    ],
    watchOut:
      "Putting a comma where you'd pause is an English habit. Estonian puts them where the grammar changes, so the habit gives you the same errors every time.",
  },

  // ── Register and use ─────────────────────────────────────────────────────
  {
    id: "politeness",
    title: "Politeness",
    summary: "It comes from the verb form and which \"you\" you pick, not from piling on \"please\".",
    points: [
      "Calling one stranger \"you\" in the plural, to be polite",
      "The \"would\" form, to make a request gentler",
      "Being direct is less rude here than English speakers expect",
    ],
    watchOut:
      "Estonian is more direct than English, and English-style softeners can sound insincere. The \"would\" form does what a pile of qualifiers does in English.",
  },
  {
    id: "register",
    title: "Reading the room",
    summary: "The same thing said formally, neutrally or among friends.",
    points: [
      "Written Estonian that sounds quite unlike speech",
      "Officialese, a style of its own that everybody pokes fun at",
      "Spoken forms that are fine out loud and wrong in an essay",
    ],
    watchOut:
      "It's not about knowing more words. A C1 speaker knows three ways to say something and picks one. A B2 speaker knows one and uses it everywhere.",
  },
  {
    id: "collocation",
    title: "Words that go together",
    summary: "Which verb goes with which noun, where habit decides rather than a rule.",
    points: [
      "Pairs fixed by habit, like English \"make a mistake\"",
      "Words that mean the same but can't swap places",
      "The last thing learned, the first thing noticed",
    ],
    watchOut:
      "Every word can be right and the sentence still sound translated. Dictionaries are weakest here, which is why real example sentences help most.",
  },
  {
    id: "idiom",
    title: "Idiom",
    summary: "Fixed expressions that do not mean the sum of their words.",
    points: [
      "Sayings still in daily use",
      "Fixed phrases that don't mean what their words say",
      "Ordinary words used in a picture sense",
    ],
    watchOut:
      "Translate an idiom word by word and you land somewhere between baffling and funny. Meet them whole, in context.",
  },
  {
    id: "irony",
    title: "Irony",
    summary: "Meaning the opposite on purpose, and hearing it done to you.",
    points: [
      "Carried by tone of voice, understatement and context",
      "Understatement is the most common kind here",
      "Rarely signaled, so you have to pick up on it",
    ],
    watchOut:
      "It's the last thing a learner picks up and the easiest to get wrong. Irony nobody notices comes across as rudeness, or as a mistake.",
  },
  {
    id: "nuance",
    title: "Choosing between near-synonyms",
    summary: "Two words a dictionary translates the same way, and which one the sentence wants.",
    points: [
      "Told apart by how formal, how strong or how loaded they are",
      "Shades a bilingual dictionary flattens",
      "Learned from real sentences, not from definitions",
    ],
    watchOut:
      "When a dictionary gives two words the same English, it's telling you about English. The difference usually shows in the words each one keeps company with.",
  },
  {
    id: "variation",
    title: "Nobody speaks the textbook",
    summary: "Region, age and setting all show in how people actually talk.",
    points: [
      "Regional dialects, some quite far from the standard",
      "The gap between written Estonian and how people talk",
      "Older and literary forms you still meet reading",
    ],
    watchOut:
      "Textbook Estonian is one variety among several. A form that isn't in your book doesn't mean somebody made a mistake.",
  },
  {
    id: "time-expressions",
    title: "Saying when",
    summary: "Time is told with endings, and the ending depends on the unit of time.",
    points: [
      "Days, seasons and years take -l, and months take -s",
      "\"For how long\" works differently again",
      "From and until each have their own ending",
    ],
    watchOut:
      "There are no prepositions to lean on, so an English time phrase gives no hint which ending to use. You learn them one unit of time at a time.",
  },
];

/**
 * The grammar beyond the endings, grouped the way a course groups it.
 *
 * A flat list of forty points headed by English tense names is not how anybody
 * meets this language. Estonian sorts the same material by what kind of word is
 * doing the work, and then, inside the verb, by mood, tense, voice and person as
 * four separate axes rather than as one row of English-shaped tenses. The
 * headings are English because everything in this file is; the Estonian name for
 * each group lives in `terms.ts` beside the terms themselves.
 */
export const TOPIC_GROUPS: readonly { id: string; title: string; blurb: string; ids: readonly string[] }[] = [
  {
    id: "verb",
    title: "The verb",
    blurb: "Now and before, \"have done\" and \"had done\", and the forms for polite requests, orders and hearsay.",
    ids: [
      "olema", "present-tense", "negation", "imperfect", "perfect", "pluperfect", "future",
      "conditional", "imperative", "quotative", "impersonal", "participles", "past-participle",
      "converb", "infinitives", "particle-verbs", "aspect",
    ],
  },
  {
    id: "noun-phrase",
    title: "Words that take endings",
    blurb: "Nouns, adjectives and numbers: how they change, and how much of a thing you mean.",
    ids: [
      "object", "adjective-agreement", "comparative", "superlative", "numerals", "gradation",
      "derivation", "nominalisation",
    ],
  },
  {
    id: "sentence",
    title: "The sentence",
    blurb: "How sentences join up, what a verb demands after it, and where the commas go.",
    ids: [
      "government", "word-order", "subordination", "relative-clause", "reported-speech",
      "concession", "hedging", "cohesion", "emphasis", "rhetorical-questions", "punctuation",
    ],
  },
  {
    id: "use",
    title: "Sounding like a person",
    blurb: "The part no rule covers: which of three correct ways to say something fits the moment.",
    ids: [
      "politeness", "register", "collocation", "idiom", "irony", "nuance", "variation",
      "time-expressions",
    ],
  },
];

const TOPICS_BY_ID = new Map(TOPIC_NOTES.map((t) => [t.id, t]));

export function grammarTopic(id: string): TopicNote | undefined {
  return TOPICS_BY_ID.get(id);
}

/**
 * Everything the course can name as a grammar point, cases included.
 *
 * A unit names its grammar with one flat list of ids, so a case and a mood have
 * to be resolvable the same way. Cases keep their own richer note; this is the
 * shared shape a link and a heading need.
 */
export interface GrammarPoint {
  id: string;
  /** The name a course uses for it: the Estonian term wherever there is one. */
  title: string;
  /** True when `title` is Estonian, so a renderer can mark it up as such. */
  estonian: boolean;
  /** The plain English line that goes under the name. */
  english: string;
  summary: string;
  /** Where the reference page for it lives. */
  href: string;
}

export function grammarPoint(id: string): GrammarPoint | undefined {
  const topic = TOPICS_BY_ID.get(id);
  if (topic) {
    const term = grammarTerm(id);
    return {
      id,
      title: term?.et ?? topic.title,
      estonian: term !== undefined,
      english: topic.title,
      summary: topic.summary,
      href: `/grammar/topic/${id}`,
    };
  }

  const spec = CASES.find((c) => c.key.toLowerCase() === id.toLowerCase());
  const note = spec && CASE_NOTES.find((n) => n.key === spec.key);
  if (spec && note) {
    return {
      id,
      title: spec.et,
      estonian: true,
      /*
        THE FIELD SAYS ENGLISH AND HELD THE ESTONIAN QUESTION.

        A unit's grammar chip draws `title` marked up as Estonian and this
        under it with no `lang` at all, so a case put `kelles? milles? kus?`
        into a slot documented as "the plain English line that goes under the
        name": a screen reader said Estonian with English sounds, and a
        learner who had not met the question words was handed three more
        instead of a reading. `asksEn` is what those ask, off the same
        table the dictionary and the reference read.
      */
      english: spec.asksEn,
      summary: note.summary,
      href: `/grammar/${spec.key.toLowerCase()}`,
    };
  }
  return undefined;
}
