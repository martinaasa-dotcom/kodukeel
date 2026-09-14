import { prisma } from "@/lib/db";
import { candidatesFor } from "@/lib/dict/resolveScan";
import { matchEstonianForm } from "@/lib/dict/search";
import { MAX_QUESTION_WORDS, questionWords, type WordFacts } from "@/lib/tutor/words";

/**
 * What the dictionary holds for the words a question is about.
 *
 * The tokens come from `questionWords` and the dictionary decides which of
 * them are its: each is vouched through `matchEstonianForm` at the confidence
 * a photographed page has to clear (ADR-021), so `toas` reaches `tuba` and
 * "what" reaches nothing. One candidate read for all of them, the way the
 * scanner and the chat's own trailing check already do it, then one read of
 * the entries that matched. A miss costs nothing but the read: an empty list
 * is an empty block.
 */
export async function wordsInQuestion(
  messages: readonly { role: string; content: string }[],
): Promise<WordFacts[]> {
  const tokens = questionWords(messages);
  if (tokens.length === 0) return [];
  const candidates = await candidatesFor(tokens);
  const ids: string[] = [];
  const asked = new Map<string, string[]>();
  for (const token of tokens) {
    const hit = matchEstonianForm(candidates, token);
    if (!hit) continue;
    if (!ids.includes(hit.id)) {
      if (ids.length >= MAX_QUESTION_WORDS) break;
      ids.push(hit.id);
    }
    asked.set(hit.id, [...(asked.get(hit.id) ?? []), token]);
  }
  if (ids.length === 0) return [];
  const rows = await prisma.lexeme.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, lemma: true, pos: true, translation: true, government: true, gradationNote: true,
      forms: { select: { formType: true, value: true }, orderBy: [{ formType: "asc" }, { id: "asc" }] },
    },
  });
  // In the order the question named them, which `in` does not promise.
  return ids
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map(({ id, ...facts }) => ({ ...facts, asked: asked.get(id) ?? [] }));
}
