import { prisma } from "@/lib/db";
import { exceptionIndex } from "@/lib/dict/facts";
import type { ExceptionFamily } from "@/lib/estonian/exceptions";
import { KIND_NOTES } from "@/lib/estonian/exceptions";
import { FAMILY_ORDER, standingOf, type Standing } from "@/lib/games/exceptionPaths";

/**
 * Where one learner stands in each exception family, read off their own
 * answers and stored nowhere (ADR-014).
 *
 * An answer counts for a family when it was about a word that has an exception
 * of that family AND about the slot that exception lives in: `PARTITIVE` is the
 * slot of a singular exception and of a plural one, so the slot alone cannot
 * say which family an answer belongs to, and the word alone would count a
 * correct plain card of the same word. Rated Good or Easy is right.
 *
 * Bounded and ordered: the newest few thousand answers on the slots the
 * exceptions use, which is what a standing should reflect anyway.
 */
export async function familyStandings(ownerId: string): Promise<Record<ExceptionFamily, Standing>> {
  const index = await exceptionIndex();
  // lexeme -> family -> the slots its exceptions of that family live in
  const bySlot = new Map<string, Map<ExceptionFamily, Set<string>>>();
  const slots = new Set<string>();
  for (const row of index) {
    for (const e of row.exceptions) {
      const family = KIND_NOTES[e.kind].family;
      const perLexeme = bySlot.get(row.id) ?? new Map<ExceptionFamily, Set<string>>();
      const set = perLexeme.get(family) ?? new Set<string>();
      set.add(e.slot);
      perLexeme.set(family, set);
      bySlot.set(row.id, perLexeme);
      slots.add(e.slot);
    }
  }

  const reviews = await prisma.review.findMany({
    where: { ownerId, lexemeId: { not: null }, slot: { in: [...slots] } },
    select: { lexemeId: true, slot: true, rating: true },
    orderBy: [{ reviewedAt: "desc" }, { id: "asc" }],
    take: 5000,
  });

  const tally = new Map<ExceptionFamily, { right: number; total: number }>();
  for (const r of reviews) {
    const perLexeme = r.lexemeId ? bySlot.get(r.lexemeId) : undefined;
    if (!perLexeme || !r.slot) continue;
    for (const [family, set] of perLexeme) {
      if (!set.has(r.slot)) continue;
      const t = tally.get(family) ?? { right: 0, total: 0 };
      t.total += 1;
      if (r.rating >= 3) t.right += 1;
      tally.set(family, t);
    }
  }

  const out = {} as Record<ExceptionFamily, Standing>;
  for (const family of FAMILY_ORDER) {
    const t = tally.get(family) ?? { right: 0, total: 0 };
    out[family] = standingOf(t.right, t.total);
  }
  return out;
}
