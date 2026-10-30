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
export async function shareOwnWord(
  ownerId: string, lexemeId: string,
): Promise<{ ok: true; repeat: boolean } | { ok: false; error: string }> {
  const word = lexemeId
    ? await prisma.lexeme.findUnique({
        where: { id: lexemeId },
        select: {
          lemma: true, pos: true, translation: true, provenance: true, approvedAt: true, editedBy: true,
          forms: { where: { isPrincipal: true }, select: { formType: true, value: true } },
        },
      })
    : null;
  if (!word) return { ok: false, error: "That word isn't in the dictionary any more." };
  if (isShared(word)) return { ok: false, error: "That word is already in everybody's dictionary." };
  if (word.editedBy !== ownerId) return { ok: false, error: "Only the person who added that word can suggest it." };

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
