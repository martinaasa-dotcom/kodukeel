/**
 * WHAT THE QUESTION GAME HAS LEARNED FROM BEING ASKED.
 *
 * Every "Ei tea" that comes from a word the game could not read is reported
 * (`reportTwentyGap` in `app/actions.ts`). Once the forms list says the word is
 * real Estonian, a model is asked once, for everybody, what that word asks of a
 * thing ("Is it juicy?") and how each of the things the game can be thinking of
 * answers it. The answers are stored and handed to every later round, so the
 * next learner who asks gets a yes, a no or a sometimes.
 *
 * This file is the pure half: the shape of a learned word, the prompt, and the
 * reading of what came back. It holds no Estonian beyond the headwords it is
 * handed, and the model is never asked to write any: it names English meanings
 * and answers yes, no or sometimes about things whose English it is told
 * (ADR-005). What it answers is facts about the world, the same kind of fact
 * `twentyWorld.ts` holds by hand, and an admin can retire any of it.
 *
 * Pure: no React, no Prisma.
 */

import type { Answer, Said } from "./twenty";

/** A word the game learned to answer, as a round hands it to `ask`. */
export interface LearnedWord {
  /** The headword the forms list names. */
  lemma: string;
  /** Spellings that are this word, lower case, the headword among them. */
  spellings: readonly string[];
  /** What the word asks, in English and in the two other languages a screen can show. */
  en: string;
  ru: string | null;
  uk: string | null;
  /** Thing headword to its answer. A thing the model did not name answers "Ei tea", free. */
  answers: Readonly<Record<string, Exclude<Answer, "unknown">>>;
}

/** A spelling worth reporting: one word of letters, of a length a word has. */
const SPELLING = /^[a-zäöõüšž]{2,30}$/;

/** The reportable words out of what the game could not read: lower case, deduplicated, letters only. */
export function reportable(words: readonly string[]): string[] {
  const out = new Set<string>();
  for (const w of words) {
    const s = w.normalize("NFC").toLowerCase().trim();
    if (SPELLING.test(s)) out.add(s);
  }
  return [...out].slice(0, 4);
}

/** How a learned word is said back: its own question, in the reader's language where the model gave one. */
export function learnedSaid(word: LearnedWord): Said {
  return { en: word.en, local: { ru: word.ru, uk: word.uk } };
}

/** A thing as the model is told it: the headword and its English. */
export interface ThingLine {
  lemma: string;
  en: string;
}

export const LEARN_SYSTEM = [
  "You help a language learning game of twenty questions.",
  "A learner asked a yes or no question about a hidden thing, and the question used one Estonian word the game had no facts for.",
  "You say in English what that word asks about a thing, and then, for each thing on the list, whether the honest answer is yes, no or sometimes.",
  "Answer as an ordinary person would about an ordinary example of each thing: a lemon is sour, an apple is juicy, a stone is not.",
  "Answer about the thing itself, never about something it makes, lives in or is used with: a spider is not sticky because its web is.",
  "Say yes only where nearly anybody would agree. Use sometimes where it really goes either way, never as a way of not deciding.",
  "Reply with JSON only, in exactly the shape you are given. Never write Estonian.",
].join(" ");

/** The question put to the model about one word. */
export function learnPrompt(word: { lemma: string; gloss: string | null; pos: string | null }, things: readonly ThingLine[]): string {
  const hint = word.gloss ? ` The dictionary gives its English as "${word.gloss}".` : "";
  const pos = word.pos ? ` It is filed as ${word.pos.toLowerCase()}.` : "";
  return [
    `The Estonian word is "${word.lemma}".${hint}${pos}`,
    "Write the yes or no question this word asks about a thing, as a learner would mean it, in English (\"Is it juicy?\", \"Does it bite?\"), and the same question in Russian and in Ukrainian.",
    "If you do not know the word, or it says nothing that could be true or false of a thing, reply {\"unknown\": true}.",
    "Then sort every thing below into yes, no and sometimes, by its Estonian headword exactly as written.",
    "",
    "Things:",
    ...things.map((t) => `${t.lemma} (${t.en})`),
    "",
    "Reply as:",
    "{\"en\": \"Is it ...?\", \"ru\": \"...?\", \"uk\": \"...?\", \"yes\": [\"...\"], \"no\": [\"...\"], \"sometimes\": [\"...\"]}",
  ].join("\n");
}

const ESTONIAN_LETTER = /[õäöüšž]/i;
const CYRILLIC = /^[\p{Script=Cyrillic}\p{P}\p{Zs}0-9]+$/u;

/** A question line the screen may show: one short question, in the language claimed, no Estonian. */
function questionLine(raw: unknown, cyrillic: boolean): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s+/g, " ").trim();
  if (s.length < 4 || s.length > 90 || !s.endsWith("?") || ESTONIAN_LETTER.test(s)) return null;
  if (cyrillic && !CYRILLIC.test(s)) return null;
  // English, asked about the thing: "Is it juicy?", "Does it bite?".
  if (!cyrillic && (!/^[A-Za-z][A-Za-z ,'’\-]*\?$/.test(s) || !/\b(?:it|its|they|them)\b/i.test(s))) return null;
  return s;
}

/**
 * What came back, read strictly, or null.
 *
 * A thing named under two answers is dropped from both, a name that is not a
 * thing is ignored, and the whole reply is refused unless it sorts most of the
 * things: a model that answered a dozen of three hundred has not answered.
 */
export function readLearned(text: string, things: readonly string[]): Omit<LearnedWord, "lemma" | "spellings"> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (body.unknown === true) return null;
  const en = questionLine(body.en, false);
  if (!en) return null;
  const known = new Set(things);
  const seen = new Map<string, Exclude<Answer, "unknown">[]>();
  for (const answer of ["yes", "no", "sometimes"] as const) {
    const list = body[answer];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item !== "string") continue;
      const lemma = item.trim();
      if (!known.has(lemma)) continue;
      const held = seen.get(lemma) ?? [];
      if (!held.includes(answer)) held.push(answer);
      seen.set(lemma, held);
    }
  }
  const answers: Record<string, Exclude<Answer, "unknown">> = {};
  for (const [lemma, held] of seen) if (held.length === 1) answers[lemma] = held[0]!;
  if (Object.keys(answers).length < Math.ceil(things.length * 0.8)) return null;
  return { en, ru: questionLine(body.ru, true), uk: questionLine(body.uk, true), answers };
}

/** Spelling to learned word, for `ask` to look a word up in once per question. */
export function learnedBySpelling(words: readonly LearnedWord[] | undefined): ReadonlyMap<string, LearnedWord> {
  const map = new Map<string, LearnedWord>();
  for (const w of words ?? []) {
    map.set(w.lemma, w);
    for (const s of w.spellings) if (!map.has(s)) map.set(s, w);
  }
  return map;
}
