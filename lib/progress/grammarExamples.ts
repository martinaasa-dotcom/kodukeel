import { prisma } from "@/lib/db";
import { parseExamples } from "@/lib/dict/examples";
import { CASE_NOTES, TOPIC_NOTES } from "@/lib/estonian/grammar";
import { examplesFor, type PinnedExample } from "@/lib/estonian/grammarExamples";

/**
 * The pinned sentences for one reference page, read out of the dictionary.
 *
 * `lib/estonian/grammarExamples.ts` names a sentence and the entry it is
 * recorded under; this is what turns that into something a screen can draw.
 * Two things are deliberately read from the database rather than from the
 * shipped table beside the pins:
 *
 * `en`, because a screen reads `Example.en` and nothing else. The shipped
 * translations are joined onto the row by the seed, and `lib/dict/exampleEnglish.ts`
 * has a closed list of four readers, all of them writers: the two halves of
 * the seed, the repair, and the live Ekilex mapper. A page reaching past the
 * column would be a fifth answer to what a sentence means, and the one that
 * goes stale is the copy nobody is watching.
 *
 * And `lexemeId`, so a sentence whose English has not landed can still be
 * asked for and stored the way every other screen asks (`SentenceTranslation`).
 * On a seeded deployment that never fires, because every pin is asserted to
 * carry a shipped English line, but a deployment seeded before the table
 * existed has rows without one and this is the path that repairs them.
 *
 * ONE QUERY PER PAGE, whatever the page holds: the lemmas of every pin on it
 * go into a single `findMany`, for the reason the deck build reads its words
 * once. A grammar page is not a hot path and it is not a reason to make one.
 *
 * A pin the live dictionary no longer holds is dropped rather than drawn from
 * the text here, which is the rule `BeatSpec.lines` already states: the file
 * is a request against the dictionary and the dictionary is the authority.
 */
export interface ResolvedExample {
  /** The sentence as recorded. */
  et: string;
  /** What it means, out of the row. Null where the deployment holds none yet. */
  en: string | null;
  /** The word carrying the point, marked on screen. */
  form: string;
  /** The entry it hangs off, so a missing translation can be asked for. */
  lexemeId: string;
}

/** Every point of one page with its sentences, keyed by the point's own text. */
export async function pinnedExamples(
  kind: "topic" | "case", id: string,
): Promise<Map<string, ResolvedExample[]>> {
  const points =
    kind === "topic"
      ? (TOPIC_NOTES.find((t) => t.id === id)?.points ?? [])
      : (CASE_NOTES.find((c) => c.key === id)?.uses ?? []);

  const wanted = new Map<string, PinnedExample[]>();
  for (const point of points) {
    const pins = examplesFor(kind, id, point);
    if (pins.length > 0) wanted.set(point, [...pins]);
  }
  if (wanted.size === 0) return new Map();

  const lemmas = [...new Set([...wanted.values()].flat().map((p) => p.lemma))];
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas } },
    // A lemma can carry two entries (`hall` is frost and grey), and which of
    // them holds the sentence is decided by looking rather than by ordering.
    select: { id: true, lemma: true, examples: true },
    orderBy: { id: "asc" },
  });

  const found = new Map<string, { id: string; en: string | null }>();
  for (const row of rows) {
    for (const ex of parseExamples(row.examples)) {
      if (!found.has(ex.et)) found.set(ex.et, { id: row.id, en: ex.en ?? null });
    }
  }

  const out = new Map<string, ResolvedExample[]>();
  for (const [point, pins] of wanted) {
    const resolved = pins.flatMap((pin) => {
      const hit = found.get(pin.et);
      return hit ? [{ et: pin.et, en: hit.en, form: pin.form, lexemeId: hit.id }] : [];
    });
    if (resolved.length > 0) out.set(point, resolved);
  }
  return out;
}
