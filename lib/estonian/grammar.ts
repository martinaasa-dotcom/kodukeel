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
    summary: "The word just as the dictionary gives it, and whoever is doing the verb.",
    uses: [
      "Who or what is doing the verb",
      "The form you look a word up under",
      "A whole object, in the plural or after a command",
    ],
    watchOut:
      "It can also be a whole object, but only in the plural or after a command. One whole thing takes the possessive form instead, the one that answers “whose?”.",
    englishHook: "The subject, right where English would put it.",
  },
  {
    key: "GENITIVE",
    plain: "of, and whose",
    summary: "Whose it is. It's also the stem the other eleven endings get glued onto.",
    uses: [
      "Saying whose something is",
      "A finished, whole object",
      "The stem every ending below needs",
    ],
    watchOut:
      "Learn this one form and eleven more come free. Get it wrong and all eleven go wrong with it, which is why it turns up so often in your cards.",
    englishHook: "The cover of the book, the book's cover.",
  },
  {
    key: "PARTITIVE",
    plain: "some of it",
    summary: "Some of a thing, an action that isn't finished, or what follows a number.",
    uses: [
      "Some of a thing rather than all of it",
      "An action still going on",
      "After any number above one",
    ],
    watchOut:
      "English marks none of this, so you have no instinct to lean on yet. You can't guess the form either, so it's learned with each word.",
    englishHook: "Some water. I was reading a book and hadn't finished it.",
  },
  {
    key: "ILLATIVE",
    plain: "into",
    summary: "Going into something: a room, a language, a decade, a mood.",
    uses: ["Going into a place or a container", "Going into a state or a stretch of time"],
    watchOut:
      "Lots of everyday words also have a short form, and that's the one people actually say. The dictionary shows it wherever there is one.",
    englishHook: "into the room, into the nineties, into a bad mood.",
  },
  {
    key: "INESSIVE",
    plain: "in",
    summary: "Being inside something, and being in a month or a mood.",
    uses: ["Position inside a place", "Being in a state, a language, or a month"],
    watchOut:
      "Estonian and English don't always agree on what counts as inside. Towns and rooms are, some islands and open places aren't, and you learn those one by one.",
    englishHook: "in the house, in March, in a good mood.",
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
      "English says \"to\" for places and people alike, so this ending and -sse both look like \"to\". Estonian wants to know: inside, or on top?",
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
      "There's no verb for \"have\". The owner takes this ending and the thing they own becomes the subject, so the sentence comes out inside out.",
    englishHook: "On the table. \"I have\" comes out as \"at me there is\".",
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
    englishHook: "Into, as, for, and by Friday.",
  },
  {
    key: "TERMINATIVE",
    plain: "up to",
    summary: "As far as some point: a place, a moment or an amount.",
    uses: ["As far as a place", "Until a moment", "Up to an amount"],
    watchOut:
      "The ending already means \"as far as\", so the extra word people sometimes add in speech says it twice. Harmless, but you don't need it.",
    englishHook: "As far as the church. Right up until Friday.",
  },
  {
    key: "ESSIVE",
    plain: "as",
    summary: "In the role of something, usually for now rather than forever.",
    uses: ["Working as something", "A role or a capacity you are in for now"],
    watchOut:
      "The -ks ending gets you into a role. This one means you're already in it. Keep those two apart and you've got it.",
    englishHook: "Working as a teacher, for as long as that lasts.",
  },
  {
    key: "ABESSIVE",
    plain: "without",
    summary: "Without something. The exact opposite of \"with\", the next one down.",
    uses: ["The absence of a thing", "Doing something without a tool, a person or permission"],
    watchOut:
      "You won't hear it much in speech, where people tend to add a separate word for \"without\". Learn to recognize it before you worry about using it.",
    englishHook: "Without a coat. Without asking.",
  },
  {
    key: "COMITATIVE",
    plain: "with",
    summary: "With a person, with a tool, and how you got there.",
    uses: ["Together with somebody", "The tool you did it with", "How you got there"],
    watchOut:
      "It covers \"with a friend\" and \"with a knife\", which plenty of languages keep apart. It never changes shape either, so it's the easiest ending to spot.",
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
    blurb: "No endings to learn here. You pick these three up with each word, and everything else is built on the second one.",
    keys: ["NOMINATIVE", "GENITIVE", "PARTITIVE"],
  },
  {
    title: "Inside",
    blurb: "Into, in, out of. Containers, buildings, languages, months and moods.",
    keys: ["ILLATIVE", "INESSIVE", "ELATIVE"],
  },
  {
    title: "On top",
    blurb: "Onto, on, off. Tables, people, times of day, and how Estonian says somebody has something.",
    keys: ["ALLATIVE", "ADESSIVE", "ABLATIVE"],
  },
  {
    title: "Five more, one job each",
    blurb: "Becoming, up to, as, without, with. Nothing to puzzle out here: each ending means one thing.",
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
      "The one verb you cannot avoid, and one of the few irregular ones",
      "Having something is said as it being at you, with -l",
      "Feelings, needs and obligations run on the same pattern",
    ],
    watchOut:
      "There's no \"have\" to reach for, so an English sentence won't translate word for word. The owner takes the -l ending and the thing they own stays plain.",
  },
  {
    id: "present-tense",
    title: "Talking about now",
    summary: "One form covers \"I write\", \"I'm writing\" and even \"I'll write\".",
    points: [
      "Six person endings on a stem",
      "Covers both English presents at once",
      "Does the future as well, since there is no future tense",
    ],
    watchOut:
      "You can't always read the present stem off the dictionary form, which is why the \"I\" form is learned for each verb rather than worked out.",
  },
  {
    id: "negation",
    title: "Saying no",
    summary: "One little word for \"not\", and the verb drops its ending altogether.",
    points: [
      "The verb goes back to a bare stem",
      "One word covers every person, unlike do not and does not",
      "The past is negated differently from the present",
    ],
    watchOut:
      "It's tempting to put \"not\" in front of the usual form. Estonian strips the ending off instead, so only the pronoun tells you who.",
  },
  {
    id: "imperfect",
    title: "Saying what happened",
    summary: "The past for anything that happened and is over. Every story is told in it.",
    points: [
      "Built on the second infinitive's stem, with -si- after it",
      "A short list of common verbs takes -i- instead",
      "Used for completed events, however recent",
    ],
    watchOut:
      "The past stem comes from the second infinitive, not the present. Which verbs take -i-, and what happens to the stem for \"he\" and \"she\", you learn verb by verb.",
  },
  {
    id: "perfect",
    title: "Done, and it still matters",
    summary: "\"To be\" plus the -nud form, for when what happened still matters now.",
    marker: "-nud",
    points: [
      "Built from to be, never from to have",
      "Used where the result matters more than the event",
      "The participle never changes for person",
    ],
    watchOut:
      "Estonian builds this with \"to be\", never \"to have\", so copying the English pattern will lead you astray.",
  },
  {
    id: "pluperfect",
    title: "Done before something else",
    summary: "The same -nud form, with \"to be\" moved into the past.",
    marker: "-nud",
    points: [
      "An event finished before another past event",
      "Common in stories and in reported speech",
      "Uses exactly the participle the perfect uses",
    ],
    watchOut:
      "Only \"to be\" moves into the past. Putting the -nud form into the past as well is the usual overcorrection.",
  },
  {
    id: "future",
    title: "Talking about the future",
    summary: "There's no future tense. The present plus a word like \"tomorrow\" does the whole job.",
    points: [
      "A time expression is what makes a sentence future",
      "Verbs of planning and intending carry the rest",
      "A particle can imply something is going to finish",
    ],
    watchOut:
      "Don't go hunting for a future tense to conjugate, because there isn't one. Time words and verbs like \"plan\" do all the work here.",
  },
  {
    id: "conditional",
    title: "Would, could, should",
    summary: "One ending that turns a sentence into a \"what if\", or makes a request polite.",
    marker: "-ksi-",
    points: [
      "Hypotheticals and their consequences",
      "Softening a request so a stranger does not find it blunt",
      "Giving advice without issuing an order",
    ],
    watchOut:
      "This is how you're polite as much as how you say \"would\". What's fine between friends can sound blunt to a stranger, and this ending is the fix.",
  },
  {
    id: "imperative",
    title: "Telling somebody to do it",
    summary: "Telling and inviting, with one form for one person and another for several.",
    points: [
      "Separate singular and plural forms, unlike English",
      "The plural doubles as the polite form for one person",
      "Negated with its own word",
    ],
    watchOut:
      "Using the singular with somebody you've just met sounds like an order. With a stranger, the plural is the safe choice.",
  },
  {
    id: "quotative",
    title: "Passing on what you heard",
    summary: "A whole verb form for passing something on without vouching for it.",
    marker: "-vat",
    points: [
      "Reported speech, rumor and hearsay",
      "Common in news writing, where the source matters",
      "Can carry doubt, depending on delivery",
    ],
    watchOut:
      "English needs a word like \"apparently\". Estonian does it with a verb ending, so it's easy to read straight past it and take a rumor as fact.",
  },
  {
    id: "impersonal",
    title: "Said without naming who",
    summary: "Somebody did it, and the sentence doesn't say who. It isn't quite the passive.",
    marker: "-takse",
    points: [
      "Notices, instructions, official prose and news",
      "Says people did something, without saying which people",
      "Has its own forms across the tenses",
    ],
    watchOut:
      "The English passive lets you add \"by whom\", and lets the wind blow a door open. This form has no room for a doer and always means people did it.",
  },
  {
    id: "participles",
    title: "Participles",
    summary: "Verb forms that work like adjectives, and the building blocks of the compound tenses.",
    marker: "-nud",
    points: [
      "Four of them: active and impersonal, present and past",
      "Used to describe a noun the way an adjective would",
      "Carry the perfect and pluperfect with the auxiliary",
    ],
    watchOut:
      "They're everywhere in written Estonian and rare in beginner courses. That's why reading feels harder than talking once you reach the middle levels.",
  },
  {
    id: "past-participle",
    title: "The -nud form",
    summary: "What the perfect tenses are built from, and an adjective in its own right.",
    marker: "-nud",
    points: [
      "Combines with to be for have done and had done",
      "Describes a noun as having done something",
      "Has an impersonal twin for things done to something",
    ],
    watchOut:
      "It never changes shape, not even in front of a noun, so it's one of the few words that ignores case completely. The present participles do change, and that's where people mix them up.",
  },
  {
    id: "converb",
    title: "The -des form",
    summary: "\"While doing\": two things at once, folded into one sentence.",
    marker: "-des",
    points: [
      "Two simultaneous actions without a conjunction",
      "Strongly preferred in writing over two joined clauses",
      "Its subject is understood to be the main clause's",
    ],
    watchOut:
      "Its subject is borrowed from the main clause. Give the two halves different subjects and you get a correct sentence that means something you didn't intend.",
  },
  {
    id: "infinitives",
    title: "The two infinitives",
    summary: "There are two, and each verb decides which one it wants after it.",
    marker: "-ma",
    points: [
      "The -ma one follows starting, going and having to",
      "The -da one follows wanting and being able",
      "Both are stored, because neither predicts the other",
    ],
    watchOut:
      "The everyday verb for \"must\" takes the -ma one. English has only one infinitive, so there's no instinct to fall back on. Learn the pairing along with the verb.",
  },
  {
    id: "particle-verbs",
    title: "Verbs with a small word in front",
    summary: "Estonian's phrasal verbs. A little word can change the meaning completely.",
    points: [
      "The particle usually adds completion or direction",
      "Often the difference between doing and finishing",
      "It moves around the sentence rather than staying put",
    ],
    watchOut:
      "Just like English phrasal verbs, the meaning often isn't the sum of the parts. Look up the verb on its own and you may get the wrong answer.",
  },
  {
    id: "aspect",
    title: "Finished or not",
    summary: "Whether an action got finished shows in the object's ending, not in the tense.",
    points: [
      "A finished action takes a whole object",
      "An unfinished or partial one takes the partitive",
      "Particles reinforce completion",
    ],
    watchOut:
      "English shows this with tense and Estonian with an ending, so the two never line up. It's the hardest single thing to carry over, so go easy on yourself.",
  },

  // ── The noun phrase ──────────────────────────────────────────────────────
  {
    id: "object",
    title: "Whole thing, or part of it",
    summary: "Is the object all of it and done, or just some of it and still going?",
    points: [
      "A finished action on a whole thing: genitive or plain form",
      "Unfinished, or only part of it: partitive",
      "Anything negated: partitive, always",
    ],
    watchOut:
      "This isn't about politeness or emphasis, and it isn't optional. It changes what the sentence means, and it's the main thing separating a B1 speaker from an A2 one.",
  },
  {
    id: "adjective-agreement",
    title: "Adjectives copy their noun",
    summary: "An adjective takes the same ending as its noun, for ten of the fourteen.",
    points: [
      "Same case and same number as the noun",
      "For -ni, -na, -ta and -ga the adjective stops at the genitive",
      "A few borrowed adjectives never change at all",
    ],
    watchOut:
      "Every adjective you learn is really a whole set of forms. Leaving it in its dictionary form next to a noun with an ending is the classic beginner giveaway.",
  },
  {
    id: "comparative",
    title: "Comparing things",
    summary: "Put -m on the same stem the case endings use, and big turns into bigger.",
    marker: "-m",
    points: [
      "Built on the genitive stem, like nearly everything",
      "Say than and use the plain form, or drop than and use -st",
      "A handful of common adjectives are irregular",
    ],
    watchOut:
      "Both ways are right. The mistake is mixing them: keeping the word for \"than\" and putting the other thing in -st as well.",
  },
  {
    id: "superlative",
    title: "The most",
    summary: "Two ways to say it: a helper word in front, or one ending on the end.",
    points: [
      "A helper word plus the comparative, which always works",
      "A one-word form, shorter and more literary",
      "Both are common and neither is wrong",
    ],
    watchOut:
      "Not every adjective has the one-word form you can work out, so when you're unsure, the two-word version is the safe bet.",
  },
  {
    id: "numerals",
    title: "Numbers and what follows them",
    summary: "Counting is easy until you notice the counted thing stays singular.",
    points: [
      "After two and up, the counted noun is partitive singular",
      "Numbers themselves decline when the phrase is in a case",
      "Ordinals are regular and decline too",
    ],
    watchOut:
      "After a number the noun stays singular, which will look wrong to an English speaker for a long time. It's singular with the \"some of it\" ending, not a plural.",
  },
  {
    id: "gradation",
    title: "Stems that change under you",
    summary: "The stem itself shifts from form to form, and only some of that shows in the spelling.",
    points: [
      "The written kind changes consonants and can be spotted",
      "The other kind is a change in length that spelling hides",
      "Which words do it is a property of the word",
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
      "An action noun from any verb, entirely regular",
      "A quality noun from an adjective",
      "Adjectives meaning like it, and meaning without it",
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
      "An action noun replaces a subordinate clause",
      "The doer becomes a genitive in front of it",
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
      "The required case is a fact about the verb",
      "Helping, calling, liking and thinking are the traps",
      "The dictionary records it as the question the verb answers",
    ],
    watchOut:
      "The English preposition points you at the wrong ending, and nothing about the verb hints at the right one. People trip on this for years, so learn it with the verb.",
  },
  {
    id: "word-order",
    title: "Word order",
    summary: "Freer than English, but not a free-for-all. The order carries the emphasis.",
    points: [
      "Endings mark who did what, so order is free for other work",
      "The verb tends to sit second in a main clause",
      "New information tends to go last",
    ],
    watchOut:
      "Because almost any order is grammatical, you can write sentences that are correct but put the weight in the wrong place. It's a C1 skill, not a rule to memorize.",
  },
  {
    id: "subordination",
    title: "Joining clauses",
    summary: "A linking word, a clause, and a comma you can't leave out.",
    points: [
      "The comma before a subordinate clause is compulsory",
      "Word order shifts inside the clause",
      "Chains of clauses are normal in writing, rare in speech",
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
      "Its case is decided inside the relative clause",
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
      "A conjunction plus a clause, closest to English",
      "Or the quotative, which needs no reporting verb",
      "The tense does not shift back the way English does",
    ],
    watchOut:
      "There's no shifting the tense back the way English does it. Do it anyway and the sentence ends up saying something different.",
  },
  {
    id: "concession",
    title: "Granting a point",
    summary: "Although, nevertheless, even so. Agreeing with half before you disagree.",
    points: [
      "Conjunctions that subordinate a concession",
      "Adverbs that carry it across a full stop",
      "The core move of any argued essay",
    ],
    watchOut:
      "They look interchangeable in a dictionary but aren't. Some start a clause and some only link sentences, and swapping them breaks the punctuation.",
  },
  {
    id: "hedging",
    title: "Probably, rather than definitely",
    summary: "Saying something is likely without waffling about it.",
    points: [
      "Adverbs and adjectives of likelihood",
      "The conditional, which softens a claim as well as a request",
      "The quotative, which puts the claim on somebody else",
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
      "Contrast and consequence",
      "Referring back without repeating the noun",
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
      "Small particles that mark the focus",
      "Word order stands in for the stress English puts in the voice",
    ],
    watchOut:
      "English stresses with the voice and keeps the order fixed. Say an English-shaped sentence with English stress here and it stresses nothing.",
  },
  {
    id: "rhetorical-questions",
    title: "Questions that are not questions",
    summary: "Asking to make a point, and the little word that marks a real question.",
    points: [
      "A particle marks a genuine yes or no question",
      "Leaving it out, with question intonation, reads differently",
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
      "A comma before a subordinate clause, pause or no pause",
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
      "The plural as a polite singular with strangers",
      "The conditional to soften a request",
      "Directness is less rude here than English speakers expect",
    ],
    watchOut:
      "Estonian is more direct than English, and English-style softeners can sound insincere. The \"would\" form does what a pile of qualifiers does in English.",
  },
  {
    id: "register",
    title: "Reading the room",
    summary: "The same thing said formally, neutrally or among friends.",
    points: [
      "A written standard noticeably unlike speech",
      "Officialese, which is its own much-mocked style",
      "Spoken forms that are correct and wrong in an essay",
    ],
    watchOut:
      "It's not about knowing more words. A C1 speaker knows three ways to say something and picks one. A B2 speaker knows one and uses it everywhere.",
  },
  {
    id: "collocation",
    title: "Words that go together",
    summary: "Which verb goes with which noun, where habit decides rather than a rule.",
    points: [
      "Pairings fixed by convention rather than by grammar",
      "Near-synonyms that do not swap in context",
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
      "Fixed verb phrases that resist a literal reading",
      "Figurative senses of ordinary words",
    ],
    watchOut:
      "Translate an idiom word by word and you land somewhere between baffling and funny. Meet them whole, in context.",
  },
  {
    id: "irony",
    title: "Irony",
    summary: "Meaning the opposite on purpose, and hearing it done to you.",
    points: [
      "Carried by intonation, understatement and context",
      "Understatement is the commonest form here",
      "Rarely flagged, so it has to be inferred",
    ],
    watchOut:
      "It's the last thing a learner picks up and the easiest to get wrong. Irony nobody notices comes across as rudeness, or as a mistake.",
  },
  {
    id: "nuance",
    title: "Choosing between near-synonyms",
    summary: "Two words a dictionary translates the same way, and which one the sentence wants.",
    points: [
      "Separated by register, strength or connotation",
      "Shades a bilingual dictionary flattens",
      "Settled by reading real usage, not definitions",
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
      "The gap between the written standard and speech",
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
      "Days, seasons and years take -l; months take -s",
      "Duration is expressed differently again",
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
    blurb: "Two tenses the verb makes on its own, two built with a helper, and the moods that work across all four.",
    ids: [
      "olema", "present-tense", "negation", "imperfect", "perfect", "pluperfect", "future",
      "conditional", "imperative", "quotative", "impersonal", "participles", "past-participle",
      "converb", "infinitives", "particle-verbs", "aspect",
    ],
  },
  {
    id: "noun-phrase",
    title: "Words that take endings",
    blurb: "What the endings attach to, and how much of a thing a sentence is talking about.",
    ids: [
      "object", "adjective-agreement", "comparative", "superlative", "numerals", "gradation",
      "derivation", "nominalisation",
    ],
  },
  {
    id: "sentence",
    title: "The sentence",
    blurb: "How clauses join, what a verb demands of what follows it, and where the commas go.",
    ids: [
      "government", "word-order", "subordination", "relative-clause", "reported-speech",
      "concession", "hedging", "cohesion", "emphasis", "rhetorical-questions", "punctuation",
    ],
  },
  {
    id: "use",
    title: "Sounding like a person",
    blurb: "The part no rule covers: which of three correct ways to say it fits the room.",
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
