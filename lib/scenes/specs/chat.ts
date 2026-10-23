/**
 * TODAY'S CHAT: A CONVERSATION WHOSE TOPIC IS TODAY'S WORDS
 * (docs/41-fifth-batch.md, VB-11; ADR-025 amendment 4).
 *
 * Every other scene is an errand with fixed beats, written once and read by
 * everybody: a counter, a call, a stairwell. They teach a situation, and they
 * do not give the words an evening has just taught a second life in somebody's
 * mouth. This does: a few minutes at the end of an evening with a neighbor who
 * asks about the things today's words are for, so the learner uses them
 * while they are fresh. It is the retrieval the closing review asks for, in a
 * conversation instead of on a card.
 *
 * SO ITS BEATS ARE NOT IN THIS FILE. A greeting, then one beat per word built
 * when the run opens, each asking for that word in any form the dictionary
 * holds (read as every requirement is read, slips and all), then a goodbye
 * that ends it. It is not an open chatbot: it has the goodbye beat and stops
 * there, the other side's lines are composed inside a closed list and pass the
 * same gate every scene line passes, and a deployment with no model never
 * offers it at all, because the bank cannot hold lines for words nobody knew
 * in advance (`chatOffered` in `lib/progress/chat.ts`).
 *
 * WHAT THIS FILE MAY WRITE. English, and lemmas that are requests: the words a
 * chat asks for are a day's own words, which a unit teaches and the Ekilex
 * harvest vouched for, and the few it needs to greet and part are the shared
 * tables every scene already uses. Nothing here is a sentence or a form
 * (ADR-005), and `chat.test.ts` reads this file for an Estonian letter.
 *
 * Pure: no React, no Next, no Prisma, no clock.
 */
import type { BeatSpec, SceneSpec } from "../types";
import { ASIDES, CLOSING_WORDS, FALLBACK_PHRASE, FAREWELLS, FEELINGS, HELLOS, LOST, REACTIONS } from "./shared";

/** The id every chat run is stored under. It is in no catalog: a chat is built per evening. */
export const CHAT_ID = "chat";

/**
 * At most four of today's words, which is about two minutes and about one
 * cent on the scene chain: a chat longer than that is a second evening.
 */
export const CHAT_WORDS = 4;

/**
 * An evening has to have met at least this many new words to offer a chat.
 * Fewer is an evening of revision, and a conversation about one word is a
 * flashcard with small talk round it.
 */
export const CHAT_MIN_NEW = 3;

/** One word a chat asks for: the lemma, and the meaning the learner is told in English. */
export interface ChatWord {
  readonly lemma: string;
  /** The dictionary's own English, first sense. Never Estonian. */
  readonly gloss: string;
}

/**
 * Everything a chat run is rebuilt from, stored on the run's draw so the
 * route, the finish and the debrief read the conversation the learner had
 * (`StoredDraw.chat`). What it does not store is the closed list, which is a
 * fact about the course the evening sits in and is read back from it.
 */
export interface ChatPlan {
  readonly programmeId: string;
  readonly dayId: string;
  /** The unit the evening's words come from, which is the claim this conversation leans on. */
  readonly unitId: string;
  readonly words: readonly ChatWord[];
  /**
   * The English meaning of one word the learner used well in their last chat,
   * where there was one, for the opening stage direction ("last time you
   * talked about the weather"). The meaning and never the learner's own
   * Estonian: a model repeating somebody's Estonian back would repeat their
   * mistakes in a native speaker's voice.
   */
  readonly remembered: string | null;
}

/**
 * The English a chat fills in, as templates, so a line the server built can be
 * read in the learner's interface language (`sceneTemplates`, `onScreen`).
 */
export const CHAT_TEMPLATES = {
  goal: "Use the word for \"{word}\".",
  ask: "They ask you something that lets you use the word for \"{word}\".",
  remember: "They remember you talked about \"{before}\" last time, then ask you something that lets you use the word for \"{word}\".",
} as const;

/** What a template says with its values in, which is all `fill` does elsewhere. */
function filled(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
}

/** The beat ids a chat's words are asked on, in order. */
export function wordBeatId(n: number): string {
  return `word-${n}`;
}

/**
 * WHAT THE OTHER SIDE MAY NEED TO SAY THAT TONIGHT DID NOT TEACH.
 *
 * The machinery every reply is built out of: hello and goodbye, the repair
 * phrase, the acknowledgments and the reactions to news, and the two halves
 * of "I don't know". A scene gets these from the units every scene declares
 * (`COMMON`); a chat declares no units, so it names them from the same shared
 * tables rather than typing any of them again.
 */
export function chatMachinery(): string[] {
  const words = new Set<string>([...HELLOS, ...CLOSING_WORDS, ...FAREWELLS, FALLBACK_PHRASE, ...LOST.verbs]);
  for (const list of Object.values(REACTIONS)) for (const word of list) words.add(word);
  for (const feel of Object.values(FEELINGS)) words.add(feel.word);
  for (const parts of Object.values(ASIDES)) for (const part of parts) words.add(part.lemma);
  return [...words];
}

/**
 * Which of today's words a chat asks for, and in what order.
 *
 * A word nobody can say is dropped rather than made unanswerable: `readable`
 * is whether the forms list can read any form of it, which the progress layer
 * resolves. Then the words the two of them have not talked about yet come
 * first, so the next chat is about something else where it can be, and the
 * evening's own order holds inside each half.
 */
export function chatWords(
  candidates: readonly ChatWord[],
  talked: ReadonlySet<string>,
  readable: (lemma: string) => boolean,
): ChatWord[] {
  const seen = new Set<string>();
  const usable = candidates.filter((word) => {
    if (seen.has(word.lemma) || !word.gloss.trim() || !readable(word.lemma)) return false;
    /*
      And a word spelled the same in English is no question: "use the word
      for 'number'" over `number` is the answer printed in the objective,
      which is the fault `audit:questions` exists for one room over.
    */
    if (spelledIn(word.gloss, word.lemma)) return false;
    seen.add(word.lemma);
    return true;
  });
  const fresh = usable.filter((word) => !talked.has(word.lemma));
  const again = usable.filter((word) => talked.has(word.lemma));
  return [...fresh, ...again].slice(0, CHAT_WORDS);
}

/** Whether the English carries the Estonian word itself, as a whole word, in any case. */
function spelledIn(gloss: string, lemma: string): boolean {
  return gloss.toLowerCase().split(/[^\p{L}]+/u).includes(lemma.toLowerCase());
}

function wordBeat(word: ChatWord, n: number, remembered: string | null): BeatSpec {
  return {
    id: wordBeatId(n),
    goal: filled(CHAT_TEMPLATES.goal, { word: word.gloss }),
    /*
      The composer's direction and the stage direction both: ask something
      whose natural answer uses the word. English, from the learner's side
      as every `they` is, and naming the meaning rather than the word, since
      a stage direction a learner reads that spelled the word would be the
      answer printed over the question. The model is told the word itself
      through `elicits`, which reaches the prompt and no screen.
    */
    they: n === 1 && remembered
      ? filled(CHAT_TEMPLATES.remember, { before: remembered, word: word.gloss })
      : filled(CHAT_TEMPLATES.ask, { word: word.gloss }),
    move: "ask",
    /*
      No topic: the topic check holds a composed line to the beat's own
      words, and the one word this beat is about is the one word the other
      side may not say. `elicits` is what keeps the line on it instead.
    */
    topic: [],
    elicits: word.lemma,
    needs: [{ kind: "lemma", oneOf: [word.lemma] }],
    required: true,
    patience: 2,
    shape: "word",
  };
}

/**
 * The scene, built for one evening.
 *
 * `taught` is every lemma the evenings have taught through this one
 * (`scopeFor`), and with today's words and the machinery above it is the
 * closed list the other side composes inside (`SceneSpec.lemmas`), so a chat
 * on the fourth evening of A1 speaks the Estonian somebody has had four
 * evenings of.
 */
export function chatScene(plan: ChatPlan, taught: readonly string[]): SceneSpec {
  const beats: BeatSpec[] = [
    {
      id: "greet",
      goal: "Say hello back.",
      they: "Your neighbor stops on the stairs and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    ...plan.words.map((word, i) => wordBeat(word, i + 1, plan.remembered)),
    {
      id: "close",
      goal: "Say goodbye.",
      they: "They say goodbye and go on up.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ];
  const words = plan.words.map((_, i) => wordBeatId(i + 1));
  return {
    id: CHAT_ID,
    title: "Today's chat",
    place: "The stairs of your building, with your neighbor",
    tests: plan.unitId,
    units: [],
    lemmas: [...new Set([...taught, ...plan.words.map((w) => w.lemma), ...chatMachinery()])],
    register: "sina",
    role: "Your neighbor catches you on the stairs on your way home and stops for a chat. They'll ask about the things today's words are for.",
    props: [],
    curveballs: [],
    beats,
    outcomes: [
      {
        id: "talked",
        when: ["greet", ...words, "close"],
        says: "Every one of today's words got used on somebody.",
      },
      /*
        Any one word used, not the first: a beat the learner could not answer
        is let go and the next word asked, so somebody who missed the first
        word and used the other three was told the neighbor "had to dash off
        before you got far", which is the opposite of what happened. One
        outcome per word, each waiting on that word alone, and the first that
        fits is taken (`outcomeOf`).
      */
      ...words.map((id) => ({
        id: `some-${id}`,
        when: [id],
        says: "Some of today's words got an outing. The rest come round again in your reviews.",
      })),
      {
        id: "dashed",
        when: ["greet"],
        says: "They had to dash off before you got far. Today's words will keep until your reviews.",
      },
      { id: "left", when: [], says: "You went on up. There'll be another chat after the next evening." },
    ],
  };
}
