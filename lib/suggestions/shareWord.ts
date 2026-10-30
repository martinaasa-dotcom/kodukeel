import { prisma } from "@/lib/db";
import { clip } from "@/lib/copy/clip";
import { isShared } from "@/lib/dict/shared";
import { isPrincipalFormType } from "@/lib/estonian/types";
import { SUGGESTION_LIMITS, groupKeyFor, parsePatchValue } from "./model";
import { recordSuggestion } from "./record";

/**
 * A LEARNER ASKING FOR THEIR OWN WORD TO GO INTO EVERYBODY'S DICTIONARY.
 *
 * A word somebody types with the add-a-word form is theirs to study at once
 * and nobody else's to read (`isShared`), because the dictionary is shared and
 * sign-up is open: a stranger's spelling and a stranger's meaning cannot be
 * put in front of every learner on their say-so. What they can do is ask, and
 * this is the asking. It files the same missing-word report the button on the
 * dictionary's dead end files, carrying what they typed, so a reviewer passes
 * it in one press (`applyPatch`) and it is this very row that is passed, cards
 * and all, rather than a second entry beside it.
 *
 * Grouped on the lemma rather than on the row, so everybody who adds the same
 * missing word is one line in the queue saying how many people want it.
 *
 * Only the author's own word, and only while it is still theirs alone: a word
 * already shared has nothing to ask for, and somebody else's private word is
 * not this learner's to put forward. The owner is a parameter, so this lives
 * here rather than in the `"use server"` file.
 */
/** The columns a request is built from, read once for one word or for a page of them. */
const WORD_FIELDS = {
  id: true, lemma: true, pos: true, translation: true, provenance: true, approvedAt: true, editedBy: true,
  forms: { where: { isPrincipal: true }, select: { formType: true, value: true } },
} as const;

type WordRow = {
  id: string; lemma: string; pos: string; translation: string;
  provenance: string; approvedAt: Date | null; editedBy: string | null;
  forms: { formType: string; value: string }[];
};

/** Why a word cannot be put forward by this learner, or null where it can. */
function refusalFor(ownerId: string, word: WordRow | null | undefined): string | null {
  if (!word) return "That word isn't in the dictionary any more.";
  if (isShared(word)) return "That word is already in everybody's dictionary.";
  if (word.editedBy !== ownerId) return "Only the person who added that word can suggest it.";
  return null;
}

/** Files the request for one word this learner may put forward. */
async function fileRequest(ownerId: string, word: WordRow): Promise<{ ok: true; repeat: boolean } | { ok: false; error: string }> {
  const proposal = parsePatchValue({
    kind: "CREATE_WORD",
    lemma: word.lemma,
    pos: word.pos,
    translation: word.translation,
    forms: Object.fromEntries(
      word.forms.filter((f) => isPrincipalFormType(f.formType) && f.value).map((f) => [f.formType, f.value]),
    ),
  });
  if (!proposal) return { ok: false, error: "That word can't be suggested as it is. Check its meaning and what kind of word it is." };

  const { repeat } = await recordSuggestion(ownerId, {
    category: "MISSING_WORD",
    groupKey: groupKeyFor({ category: "MISSING_WORD", lemma: word.lemma, patch: proposal }),
    note: "",
    context: clip(`/dictionary?q=${word.lemma}`, SUGGESTION_LIMITS.context),
    trigger: null,
    lemma: word.lemma,
    lexemeId: null,
    patch: JSON.stringify(proposal),
  });
  return { ok: true, repeat };
}

export async function shareOwnWord(
  ownerId: string, lexemeId: string,
): Promise<{ ok: true; repeat: boolean } | { ok: false; error: string }> {
  const word = lexemeId
    ? await prisma.lexeme.findUnique({ where: { id: lexemeId }, select: WORD_FIELDS })
    : null;
  const refused = refusalFor(ownerId, word);
  if (refused || !word) return { ok: false, error: refused ?? "That word isn't in the dictionary any more." };
  return fileRequest(ownerId, word);
}

/**
 * How many words one press may put forward. A scanned page holds up to sixty
 * and a paste up to five hundred, and a reviewer reads every one of them, so a
 * press asks for a page's worth and the rest wait for the next one.
 */
export const MAX_SHARED_AT_ONCE = 60;

/**
 * THE SAME REQUEST FOR A WHOLE PAGE OR A WHOLE PASTE.
 *
 * The scanner and the importer write a learner's words in bulk, so the asking
 * is in bulk too: one read for every word, then one request per word that is
 * the learner's own and not yet everybody's, each through `recordSuggestion`
 * because that is the write with the lock that keeps a double press to one
 * report. A word that is not theirs to put forward is counted and passed over
 * rather than failing the press, since a page can hold a word another learner
 * typed first.
 */
export async function shareOwnWords(
  ownerId: string, lexemeIds: readonly string[],
): Promise<{ ok: true; sent: number; again: number; passed: number; left: number }> {
  const unique = [...new Set(lexemeIds.filter((id) => typeof id === "string" && id))];
  const asked = unique.slice(0, MAX_SHARED_AT_ONCE);
  const words = asked.length
    ? await prisma.lexeme.findMany({ where: { id: { in: asked } }, select: WORD_FIELDS, orderBy: { id: "asc" } })
    : [];
  let sent = 0;
  let again = 0;
  let passed = asked.length - words.length;
  for (const word of words) {
    if (refusalFor(ownerId, word)) { passed += 1; continue; }
    const result = await fileRequest(ownerId, word);
    if (!result.ok) passed += 1;
    else if (result.repeat) again += 1;
    else sent += 1;
  }
  return { ok: true, sent, again, passed, left: unique.length - asked.length };
}

/**
 * Which of a learner's own words could still be put forward: theirs, not yet
 * everybody's, and with no open request from them already. One read for the
 * words and one for the requests, for a page of them at once.
 */
export async function wordsToSuggest(ownerId: string, lexemeIds: readonly string[]): Promise<string[]> {
  const unique = [...new Set(lexemeIds.filter(Boolean))];
  if (unique.length === 0) return [];
  // The learner's own and not yet everybody's, which is `refusalFor` as a query.
  const words = await prisma.lexeme.findMany({
    where: { id: { in: unique }, editedBy: ownerId, provenance: { in: ["USER", "AI"] }, approvedAt: null },
    select: { id: true, lemma: true, pos: true },
    orderBy: { id: "asc" },
  });
  if (words.length === 0) return [];
  const keyOf = (w: { lemma: string; pos: string }) => {
    const proposal = parsePatchValue({ kind: "CREATE_WORD", lemma: w.lemma, pos: w.pos, translation: "-", forms: {} });
    return proposal ? groupKeyFor({ category: "MISSING_WORD", lemma: w.lemma, patch: proposal }) : null;
  };
  const keys = words.map((w) => keyOf(w)).filter((k): k is string => k !== null);
  const open = new Set((keys.length
    ? await prisma.suggestion.findMany({
        where: { ownerId, status: "OPEN", category: "MISSING_WORD", groupKey: { in: keys } },
        select: { groupKey: true },
        orderBy: { id: "asc" },
      })
    : []).map((s) => s.groupKey));
  return words.filter((w) => { const key = keyOf(w); return key !== null && !open.has(key); }).map((w) => w.id);
}

/**
 * Whether this learner has an open request for their own word, read by the
 * entry so it can say the word is waiting rather than offer to ask again.
 */
export async function wordAwaitingReview(ownerId: string, lemma: string, pos: string): Promise<boolean> {
  const proposal = parsePatchValue({ kind: "CREATE_WORD", lemma, pos, translation: "-", forms: {} });
  if (!proposal) return false;
  const open = await prisma.suggestion.findFirst({
    where: {
      ownerId, status: "OPEN", category: "MISSING_WORD",
      groupKey: groupKeyFor({ category: "MISSING_WORD", lemma, patch: proposal }),
    },
    select: { id: true },
  });
  return open !== null;
}
