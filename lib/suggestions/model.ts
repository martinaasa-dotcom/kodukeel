/**
 * What a learner can report, what they can propose, and how it is grouped.
 *
 * PURE ON PURPOSE. This module is the shared vocabulary between the button on
 * a dead end, the server action that stores what it sent, and the review queue
 * that acts on it. It touches no database and no React, so every rule in it
 * can be stated as a test rather than as a screenshot.
 *
 * Two ideas hold the whole feature up.
 *
 * **A category decides what accepting means.** Four of the eight carry a
 * machine-applicable proposal: a missing word becomes an entry, a wrong gloss
 * becomes a translation, a wrong principal part becomes a form, a bad example
 * is dropped. The other four are reports of something a person has to go and
 * look at, and they say so rather than pretending an "Accept" button will fix
 * a grammar page. An admin panel whose accept button sometimes changes nothing
 * and never says which time is which is worse than no panel.
 *
 * **A group is the unit of review, not a row.** Sign-up is open by default and
 * every failure in the app now offers this button, so one dead link is one
 * report from everybody who met it. `groupKeyFor` is what turns four hundred
 * rows into one line saying "four hundred people", and it is deliberately
 * blunt: over-grouping two similar reports costs a reviewer one extra read,
 * under-grouping costs them four hundred.
 *
 * Nothing here writes Estonian, and neither does anything downstream of it. A
 * patch's Estonian is typed by the person sending it, which is the standard
 * the hand-edit path has always met (ADR-005): the model is never in this
 * loop at all.
 */

import { isPrincipalFormType } from "@/lib/estonian/types";

/** The eight things that can go wrong, as a learner would name them. */
export const SUGGESTION_CATEGORIES = {
  MISSING_WORD: {
    label: "Missing word",
    /** Shown to the learner above the form. */
    lead: "A word that should be in the dictionary and is not.",
    /** The queue groups by what a reviewer would do about it, not by severity. */
    group: "Dictionary",
    /** What accepting does. `null` means a person has to go and change something.  */
    applies: "CREATE_WORD",
  },
  WRONG_MEANING: {
    label: "Wrong meaning",
    lead: "The English on this entry is the wrong sense, or is not what the word means.",
    group: "Dictionary",
    applies: "SET_TRANSLATION",
  },
  WRONG_FORM: {
    label: "Wrong form",
    lead: "One of the principal parts is wrong.",
    group: "Dictionary",
    applies: "SET_FORM",
  },
  WRONG_EXAMPLE: {
    label: "Unhelpful example",
    lead: "An example sentence on this entry is wrong or misleading.",
    group: "Dictionary",
    applies: "DROP_EXAMPLE",
  },
  /*
    A WRONG TRANSLATION IS NOT AN UNHELPFUL SENTENCE, and until the English
    shipped there was no way to tell the two apart because there was no English
    to be wrong. `prisma/data/example-english.json` now says what all 16,037 of
    the dictionary's sentences mean and no person has read one of them, so a
    learner spotting a bad line had exactly one category to reach for and its
    remedy is `DROP_EXAMPLE`: it would delete the lexicographer's Estonian over
    a fault in our English, which is the one thing this app may never do to an
    attested sentence.
  */
  WRONG_TRANSLATION: {
    label: "Wrong translation",
    lead: "The English under an example sentence does not say what the Estonian says.",
    group: "Dictionary",
    applies: "CLEAR_TRANSLATION",
  },
  MARKED_WRONG: {
    label: "Marked wrong",
    lead: "The app marked your answer wrong and you think it was right.",
    group: "Marking",
    applies: null,
  },
  WRONG_CONTENT: {
    label: "Wrong explanation",
    lead: "Something a page teaches is wrong, unclear or out of date.",
    group: "Teaching",
    applies: null,
  },
  BROKEN: {
    label: "Something broke",
    lead: "A screen failed, or something did not do what it said it would.",
    group: "Faults",
    applies: null,
  },
  OTHER: {
    label: "Something else",
    lead: "Anything that does not fit the rest.",
    group: "Faults",
    applies: null,
  },
} as const;

export type SuggestionCategory = keyof typeof SUGGESTION_CATEGORIES;

export const CATEGORY_KEYS = Object.keys(SUGGESTION_CATEGORIES) as SuggestionCategory[];

export function isCategory(value: string): value is SuggestionCategory {
  return Object.hasOwn(SUGGESTION_CATEGORIES, value);
}

/** The queue's tabs, in reading order, each with the categories under it. */
export const CATEGORY_GROUPS = ["Dictionary", "Marking", "Teaching", "Faults"] as const;
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

export function categoriesInGroup(group: CategoryGroup): SuggestionCategory[] {
  return CATEGORY_KEYS.filter((key) => SUGGESTION_CATEGORIES[key].group === group);
}

export const SUGGESTION_STATUSES = ["OPEN", "ACCEPTED", "DECLINED"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export function isStatus(value: string): value is SuggestionStatus {
  return (SUGGESTION_STATUSES as readonly string[]).includes(value);
}

/**
 * How long each field may be.
 *
 * Generous for the note, because "tell us what is wrong" and then a 140
 * character box is a question you did not want the answer to. Tight for
 * everything that ends up in the dictionary, matching the limits the hand-edit
 * path already applies.
 */
export const SUGGESTION_LIMITS = {
  note: 2000,
  lemma: 80,
  translation: 200,
  form: 80,
  sentence: 400,
  context: 200,
  trigger: 400,
  decision: 500,
} as const;

// ───────────────────────────────── Patches ─────────────────────────────────

export interface CreateWordPatch {
  kind: "CREATE_WORD";
  lemma: string;
  pos: string;
  translation: string;
  /** Principal parts only, keyed by form type. Empty is allowed. */
  forms: Record<string, string>;
}

export interface SetTranslationPatch {
  kind: "SET_TRANSLATION";
  lexemeId: string;
  translation: string;
}

export interface SetFormPatch {
  kind: "SET_FORM";
  lexemeId: string;
  formType: string;
  value: string;
}

export interface DropExamplePatch {
  kind: "DROP_EXAMPLE";
  lexemeId: string;
  /** The sentence to drop, matched exactly. Never an index: examples reorder. */
  sentence: string;
}

/**
 * Clears the English off one sentence, and touches nothing else.
 *
 * Deliberately not a correction. A reviewer accepting this is saying the line
 * was wrong, not writing a better one: the Estonian stays exactly as the
 * lexicographer recorded it, the sentence keeps its place on the entry, and
 * `en` goes back to null, which is the honest "not yet" every sentence was in
 * before the table was built. `SentenceTranslation` then asks for one again on
 * a deployment that has a model, and a keyless one shows the word-by-word
 * gloss, which is what it showed before.
 */
export interface ClearTranslationPatch {
  kind: "CLEAR_TRANSLATION";
  lexemeId: string;
  /** The sentence whose English is wrong, matched exactly. Never an index. */
  sentence: string;
}

export type Patch =
  | CreateWordPatch | SetTranslationPatch | SetFormPatch | DropExamplePatch | ClearTranslationPatch;

/** The parts of speech a proposal may name. Same set the dictionary uses. */
export const PATCH_POS = ["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PRONOUN", "PHRASE", "OTHER"] as const;

const trimmed = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/**
 * Reads a stored patch, or returns null.
 *
 * Null is the honest answer for a report with nothing mechanical behind it,
 * and it is also the answer for a malformed one — the queue then shows the
 * note and offers no accept-and-apply button, rather than offering one that
 * would half-write a row. Nothing downstream may guess at a missing field.
 */
/**
 * The entry a missing-word report would write over, if the dictionary has one.
 *
 * One rule for the two places that ask: the queue, which marks the row blocked
 * and draws no Accept button, and `applyPatch`, which refuses. The queue alone
 * was not enough, because its page is deliberately not revalidated between
 * clicks, so a page loaded before a live lookup stored the word still offered
 * the button and the accept overwrote the gloss every learner reads.
 *
 * Any entry of that lemma and that part of speech, compared without case,
 * rather than the entry the app leads with: `@@unique` is on `(lemma, pos)`, so
 * a lemma can carry an adjective and a noun, and the report names one of them.
 */
export function createWordClash<T extends { lemma: string; pos: string }>(
  patch: Pick<CreateWordPatch, "lemma" | "pos">,
  entries: readonly T[],
): T | undefined {
  const lemma = patch.lemma.toLowerCase();
  return entries.find((e) => e.lemma.toLowerCase() === lemma && e.pos === patch.pos);
}

export function parsePatch(json: string | null | undefined): Patch | null {
  if (!json) return null;
  try {
    return parsePatchValue(JSON.parse(json));
  } catch {
    return null;
  }
}

/** The same, for a proposal that arrived as an object rather than as a column. */
export function parsePatchValue(raw: unknown): Patch | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  switch (value.kind) {
    case "CREATE_WORD": {
      const lemma = trimmed(value.lemma, SUGGESTION_LIMITS.lemma);
      const translation = trimmed(value.translation, SUGGESTION_LIMITS.translation);
      const pos = trimmed(value.pos, 20).toUpperCase();
      if (!lemma || !translation) return null;
      if (!(PATCH_POS as readonly string[]).includes(pos)) return null;
      /*
        ONLY THE PRINCIPAL PARTS, WHICH IS ALSO ALL `applyPatch` WILL TAKE.

        Each value was capped at 80 characters and every *key* was copied, so
        an object with a hundred thousand keys survived into
        `JSON.stringify(patch)` and was stored on the row. The body cap is
        16 MB and `sendSuggestion` allows twenty a minute, which is about
        300 MB a minute into the one table a reviewer has to page through, on
        a deployment where signing up is open. Eleven keys is the ceiling
        because eleven is what a word has, and a patch naming anything else is
        refused rather than quietly trimmed: it is not a correction anybody
        could accept, so saying so is more use than storing it.
      */
      const forms: Record<string, string> = {};
      const given = value.forms;
      if (given && typeof given === "object") {
        for (const [key, formValue] of Object.entries(given as Record<string, unknown>)) {
          if (!isPrincipalFormType(key.toUpperCase())) return null;
          const text = trimmed(formValue, SUGGESTION_LIMITS.form);
          if (text) forms[key.toUpperCase()] = text;
        }
      }
      return { kind: "CREATE_WORD", lemma, pos, translation, forms };
    }
    case "SET_TRANSLATION": {
      const lexemeId = trimmed(value.lexemeId, 64);
      const translation = trimmed(value.translation, SUGGESTION_LIMITS.translation);
      if (!lexemeId || !translation) return null;
      return { kind: "SET_TRANSLATION", lexemeId, translation };
    }
    case "SET_FORM": {
      const lexemeId = trimmed(value.lexemeId, 64);
      const formType = trimmed(value.formType, 40).toUpperCase();
      const formValue = trimmed(value.value, SUGGESTION_LIMITS.form);
      if (!lexemeId || !formType || !formValue) return null;
      return { kind: "SET_FORM", lexemeId, formType, value: formValue };
    }
    case "CLEAR_TRANSLATION": {
      const lexemeId = trimmed(value.lexemeId, 64);
      const sentence = trimmed(value.sentence, SUGGESTION_LIMITS.sentence);
      if (!lexemeId || !sentence) return null;
      return { kind: "CLEAR_TRANSLATION", lexemeId, sentence };
    }
    case "DROP_EXAMPLE": {
      const lexemeId = trimmed(value.lexemeId, 64);
      const sentence = trimmed(value.sentence, SUGGESTION_LIMITS.sentence);
      if (!lexemeId || !sentence) return null;
      return { kind: "DROP_EXAMPLE", lexemeId, sentence };
    }
    default:
      return null;
  }
}

/**
 * True when a proposal belongs to the category it arrived under.
 *
 * The category is what the queue filters, counts and reasons by; the patch is
 * what gets written to the shared dictionary. A row where those two disagree
 * would be filed under "wrong explanation" and, on accept, create a word.
 * Every server action is a public endpoint, so this cannot be left to the
 * form that submitted it.
 *
 * No proposal always fits. Somebody who says "this gloss is the wrong sense"
 * and cannot think of a better one has still told us the most useful half,
 * and a form that refuses to send without a rewrite collects nothing.
 */
export function patchFitsCategory(category: SuggestionCategory, patch: Patch | null): boolean {
  if (patch === null) return true;
  return SUGGESTION_CATEGORIES[category].applies === patch.kind;
}

// ───────────────────────────────── Grouping ────────────────────────────────

/**
 * Folds a value to the form two people reporting the same thing would share.
 *
 * Case and surrounding space only. Diacritics are left alone: `saar` and
 * `säär` are two words, and folding them together in a dictionary queue would
 * merge two reports that are about different entries.
 */
function fold(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Enough of a failure message to tell two of them apart, and no more. */
function shorten(value: string): string {
  return fold(value).replace(/\d+/g, "#").slice(0, 80);
}

/**
 * The screen, with the row it was looking at taken out.
 *
 * `/exam/result/<uuid>` is one screen, not one screen per sitting, and a fault
 * on it is one fault however many people meet it on their own paper. Only a
 * segment that is unmistakably an id is flattened: all digits, or long enough
 * and carrying a digit. `/exam/b2` and `/grammar/inessive` survive, because a
 * level and a case genuinely are different screens.
 */
function foldPath(value: string): string {
  const path = fold(value).split("?")[0] ?? "";
  return path
    .split("/")
    .map((segment) =>
      /^\d+$/.test(segment) || (segment.length >= 8 && /\d/.test(segment)) ? "#" : segment,
    )
    .join("/");
}

/**
 * The key that makes four hundred reports one line in the queue.
 *
 * Keyed on the thing being reported rather than on what was written about it,
 * because the note is where two people describing one fault differ most. For
 * a word that means the entry or the lemma; for a fault it means the screen
 * and the message, with digits flattened so two runs of the same error with
 * different ids still land together.
 */
export function groupKeyFor(input: {
  category: SuggestionCategory;
  lexemeId?: string | null;
  lemma?: string | null;
  context?: string | null;
  trigger?: string | null;
  patch?: Patch | null;
}): string {
  const { category } = input;
  const subject =
    input.lexemeId ? `lex:${input.lexemeId}`
    : input.lemma ? `lemma:${fold(input.lemma)}`
    : null;

  if (category === "WRONG_FORM" && input.patch?.kind === "SET_FORM") {
    return `${category}|${subject ?? "?"}|${input.patch.formType}`;
  }
  if (category === "WRONG_TRANSLATION" && input.patch?.kind === "CLEAR_TRANSLATION") {
    // Grouped on the sentence, like the category beside it: everybody who
    // reports the same bad line is reporting one thing.
    return `${category}|${subject ?? "?"}|${shorten(input.patch.sentence)}`;
  }
  if (category === "WRONG_EXAMPLE" && input.patch?.kind === "DROP_EXAMPLE") {
    return `${category}|${subject ?? "?"}|${shorten(input.patch.sentence)}`;
  }
  if (subject) return `${category}|${subject}`;

  return `${category}|${foldPath(input.context ?? "")}|${shorten(input.trigger ?? "")}`;
}

// ──────────────────────────────── Rendering ────────────────────────────────

/** One reviewable change, in the two halves an admin has to compare. */
export interface PatchSummary {
  /** What accepting will do, in a few words. */
  action: string;
  /** The field being changed, named the way the dictionary names it. */
  field: string;
  /** What is there now. Filled in by the queue, which is the only side that knows. */
  before?: string;
  /** What the learner proposes. */
  after: string;
}

export function summarisePatch(patch: Patch): PatchSummary {
  switch (patch.kind) {
    case "CLEAR_TRANSLATION":
      return {
        action: "Take the English off this sentence",
        field: "example translation",
        after: patch.sentence,
      };
    case "CREATE_WORD":
      return {
        action: "Add this word to the dictionary",
        field: `${patch.lemma} · ${patch.pos.toLowerCase()}`,
        after: patch.translation,
      };
    case "SET_TRANSLATION":
      return { action: "Change the English on this entry", field: "translation", after: patch.translation };
    case "SET_FORM":
      return { action: "Change a principal part", field: patch.formType, after: patch.value };
    case "DROP_EXAMPLE":
      return { action: "Remove this example sentence", field: "example", after: patch.sentence };
  }
}

/**
 * What the learner is told after sending one.
 *
 * Deliberately not "thanks for your feedback". It says where the thing went
 * and what will happen to it, because the whole reason somebody bothered is
 * that they had already met one dead end.
 */
export function acknowledgement(category: SuggestionCategory): string {
  const applies = SUGGESTION_CATEGORIES[category].applies !== null;
  return applies
    ? "Sent to the Kodukeel team. Someone reviews it, and if it stands it goes straight into the dictionary for everybody."
    : "Sent to the Kodukeel team. Someone reads every one of these, and this one goes to whoever can change it.";
}
