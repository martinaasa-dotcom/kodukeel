/**
 * THE THINGS IN A PHOTO, NAMED IN ENGLISH AND LOOKED UP IN ESTONIAN
 * (docs/41-fifth-batch.md, VB-13).
 *
 * The words a learner sees every day, in their own kitchen and on their own
 * street, are the words worth learning first. The scanner already reads a
 * photographed page through a model and lets the dictionary decide what to
 * believe (ADR-021); this points the same pipe at things rather than text.
 *
 * THE MODEL WRITES NO ESTONIAN AT ALL. It is asked for the English names of
 * what it can see, and this module refuses anything that is not plain English
 * letters, so a reply that slipped into Estonian, or anything else, adds
 * nothing. Each name is then looked up on the dictionary's English side
 * (`lib/progress/things.ts`), and only an entry the dictionary vouches for is
 * offered: the Estonian on screen, and on any card made from it, is the
 * dictionary's own headword, never a word the model wrote.
 *
 * Pure, like `extract.ts` beside it, so a hostile reply is tested over
 * fixtures rather than against whatever a provider felt like sending.
 */
import { extractJson } from "./extract";

/** Up to this many things from one photo: a room's worth, and a list somebody can tick through. */
export const MAX_THINGS = 12;

/** The longest English name taken seriously: "washing machine", "chest of drawers". */
const MAX_NAME_CHARS = 32;

/** Plain English letters, with the space and hyphen a compound noun is written with. */
const ENGLISH_NAME = /^[a-z][a-z' -]*[a-z]$/;

export const THINGS_PROMPT = [
  "You are looking at a photograph somebody took of their surroundings: a room, a kitchen, a",
  "street, a desk, a shop shelf.",
  "",
  `Your only job is to name, in English, up to ${MAX_THINGS} everyday objects you can clearly see.`,
  "",
  "Rules:",
  "1. English only. Never write a word in Estonian or any other language.",
  "2. One plain noun for each thing, in the singular, the word a dictionary would list:",
  '   "chair", "window", "cup". No adjectives, no colours, no brand names.',
  "3. Name things, not people, and nothing you are unsure of.",
  "4. The most noticeable things first. Each thing once.",
  "",
  'Answer with JSON only, in this shape: {"things":["table","chair","window"]}',
  "No prose, no code fence, no commentary.",
].join("\n");

/** The user turn; the instruction is the system prompt so it can be cached. */
export const NAME_THESE_THINGS = "Name the everyday things in this photo, in English.";

/** A name as it is looked up: lower case, the article off, the spaces tidied. */
export function tidyName(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(a|an|the|some)\s+/, "")
    .replace(/[.!?]+$/, "");
}

/**
 * The English names in a reply, at most `MAX_THINGS`, each once.
 *
 * Anything that is not plain English letters is dropped on its own: an
 * Estonian word with a diacritic, a word in another script, a number, a
 * sentence. A name without a diacritic that happens to be Estonian would only
 * fail to find an English gloss, so it costs a row and never a card.
 */
export function parseThingsReply(reply: string): string[] {
  const parsed = extractJson(reply);
  const container = parsed && typeof parsed === "object" ? (parsed as { things?: unknown; objects?: unknown }) : null;
  const rows = Array.isArray(container?.things) ? container.things : Array.isArray(container?.objects) ? container.objects : [];
  const out: string[] = [];
  for (const row of rows) {
    if (typeof row !== "string") continue;
    const name = tidyName(row);
    if (name.length < 2 || name.length > MAX_NAME_CHARS || !ENGLISH_NAME.test(name)) continue;
    if (name.split(" ").length > 3) continue;
    if (out.includes(name)) continue;
    out.push(name);
    if (out.length >= MAX_THINGS) break;
  }
  return out;
}

/** One dictionary entry a thing could be, as the confirmation screen shows it. */
export interface ThingEntry {
  readonly lexemeId: string;
  readonly lemma: string;
  readonly translation: string;
  readonly pos: string;
  readonly cefr: string | null;
}

/** A thing in the photo: its English name, a picture where the app has one, and the entries it could be. */
export interface Thing {
  readonly english: string;
  readonly picture: string | null;
  /** Leading entry first; empty where the dictionary vouches for none, and the row says so in English. */
  readonly entries: readonly ThingEntry[];
}

/**
 * Which of several entries leads, and which are offered beside it.
 *
 * The brief's rule, from its trip hazard: an English name maps to several
 * Estonian entries more often than not ("table" is `laud` and `tabel`), so the
 * entry whose *first* sense is the name leads, a noun before anything else, a
 * graded word before an ungraded one, and the rest stay on the screen to be
 * chosen. Nothing is dropped and nothing is picked silently.
 */
export function orderEntries<T extends ThingEntry>(entries: readonly (T & { readonly sense: "first" | "later" })[]): T[] {
  const rank = (e: T & { readonly sense: "first" | "later" }) =>
    (e.sense === "first" ? 0 : 4) + (e.pos === "NOUN" ? 0 : 2) + (e.cefr ? 0 : 1);
  return [...entries]
    .sort((a, b) => rank(a) - rank(b) || a.lemma.localeCompare(b.lemma, "et") || a.lexemeId.localeCompare(b.lexemeId))
    .map(({ sense: _sense, ...entry }) => entry as unknown as T);
}
