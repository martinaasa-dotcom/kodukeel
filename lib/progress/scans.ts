import { NEEDS_TRANSLATION } from "@/lib/copy/values";
import { prisma } from "@/lib/db";
import { vouchScanItems } from "@/lib/dict/resolveScan";
import { LIMITS, MAX_SCAN_TITLE } from "@/lib/progress/fieldLimits";
import { guessPos, MAX_ITEMS as SCAN_MAX_ITEMS } from "@/lib/scan/extract";
import { parseItems, sanitiseItems, serialiseItems } from "@/lib/scan/items";
import { visibleLine } from "@/lib/security/visibleText";
import { availableCardTypes, type LexemeForCards } from "@/lib/srs/cards";
import { addCardsFor } from "@/lib/srs/deck";
import { clip } from "@/lib/copy/clip";

/**
 * A PAGE KEPT, AND ITS WORDS PUT IN THE DECK, FOR EITHER DOOR.
 *
 * The bodies of `saveScan` and `addScanToDeck` in app/actions.ts, which
 * `POST /api/v1/scans` and `POST /api/v1/scans/{id}/deck` call too (D2 in
 * docs/44-sixth-batch.md). Each takes the owner as a parameter, which is why it
 * lives here rather than in the `"use server"` file; the allowance a press is
 * charged against and the pages it refreshes stay with each door. What is kept
 * is the list of words somebody ticked. The photograph is never here: the
 * reading (`lib/progress/scanRead.ts`) writes nothing, and nothing here is
 * handed a picture.
 */

/** A string argument, trimmed and cut to length, whatever actually arrived. */
const capped = (value: unknown, max: number): string =>
  clip(typeof value === "string" ? value.trim() : "", max);

/**
 * A page somebody ticked words on, kept, with cards built where they asked.
 *
 * A word that matched the dictionary brings its own principal parts and its
 * retrieved forms, so its cards are built from attested forms and nothing the model
 * wrote survives into them. A word that did not becomes a plain USER entry
 * with recognition and production cards only, exactly like a pasted line: no
 * case-form card, because there are no forms to derive one from.
 */
export async function saveScanFor(ownerId: string, raw: unknown) {
  const input = (raw !== null && typeof raw === "object" ? raw : {}) as { title?: unknown; items?: unknown; addCards?: unknown };
  const sent = sanitiseItems(input.items, SCAN_MAX_ITEMS);
  if (sent.length === 0) {
    return { ok: false as const, error: "Check at least one word on that page first." };
  }
  // What the dictionary says about each spelling, asked again here rather
  // than taken from the request: see `vouchScanItems`.
  const items = await vouchScanItems(sent);

  const title = capped(input.title, MAX_SCAN_TITLE) || "A page";

  /*
    Every id here came from `vouchScanItems` rather than from the request.
    Reading them back still means a row can only ever point at a Lexeme that
    exists, and a row the dictionary would not vouch for is treated as a new
    word rather than silently attaching cards to whatever holds some id.
  */
  const claimed = items.map((i) => i.lexemeId).filter((id): id is string => id !== null);
  /*
    With the paradigm attached, because the card-building branch below needs it
    and used to ask for it a second time, once per word. A page carries up to
    `MAX_ITEMS` words: that was sixty round trips for rows this query already
    had, plus another sixty for the words it did not.
  */
  const known = claimed.length
    ? await prisma.lexeme.findMany({ where: { id: { in: claimed } }, include: { forms: true } })
    : [];
  const byId = new Map(known.map((l) => [l.id, l]));

  /*
    And one question for every word the dictionary would not vouch for, asked
    before the loop rather than inside it. The key is `(lemma, pos)`, which is
    `Lexeme`'s own unique key, so a word that is already there under another
    learner's hand is found rather than re-created. `createMany` with
    `skipDuplicates` then writes only what is genuinely new, and the count it
    returns is what `created` used to tally one row at a time.
  */
  let created = 0;
  const unvouched = new Map<string, { lemma: string; pos: string; en: string }>();
  // What a ticked word would be filed under if the dictionary does not already
  // hold it. `(lemma, pos)` is `Lexeme`'s own unique key, so this is the same
  // question the loop below asks and the same one the write below settles.
  const keyOf = (et: string) => {
    const lemma = visibleLine(et, LIMITS.lemma);
    const pos = guessPos(lemma);
    return { lemma, pos, key: `${lemma}|${pos}` };
  };
  for (const item of items) {
    if (item.lexemeId && byId.has(item.lexemeId)) continue;
    const { lemma, pos, key } = keyOf(item.et);
    if (!unvouched.has(key)) unvouched.set(key, { lemma, pos, en: item.en });
  }

  const byKey = new Map<string, (typeof known)[number]>();
  if (unvouched.size) {
    const rows = await prisma.lexeme.findMany({
      where: { OR: [...unvouched.values()].map((w) => ({ lemma: w.lemma, pos: w.pos })) },
      include: { forms: true },
    });
    for (const row of rows) byKey.set(`${row.lemma}|${row.pos}`, row);

    const missing = [...unvouched.entries()].filter(([key]) => !byKey.has(key));
    if (missing.length) {
      const written = await prisma.lexeme.createMany({
        data: missing.map(([, w]) => ({
          lemma: w.lemma,
          pos: w.pos,
          translation: visibleLine(w.en, LIMITS.translation) || NEEDS_TRANSLATION,
          provenance: "USER" as const,
          editedBy: ownerId,
          editedAt: new Date(),
        })),
        skipDuplicates: true,
      });
      created = written.count;
      const fresh = await prisma.lexeme.findMany({
        where: { OR: missing.map(([, w]) => ({ lemma: w.lemma, pos: w.pos })) },
        include: { forms: true },
      });
      for (const row of fresh) byKey.set(`${row.lemma}|${row.pos}`, row);
    }
  }

  const stored: typeof items = [];
  let cards = 0;
  const carded = new Set<string>();

  for (const item of items) {
    const vouched = item.lexemeId ? byId.get(item.lexemeId) : undefined;
    // Not in the dictionary, and ticked anyway. Stored as the learner's own
    // entry, attributed to them, with the page's gloss as its English.
    const row = vouched ?? byKey.get(keyOf(item.et).key);
    if (!row) {
      // Nothing to point at: the write above lost a race with a hand edit.
      // Kept on the page as an unmatched word rather than dropped.
      stored.push({ ...item, lexemeId: null, lemma: null, translation: null });
      continue;
    }

    stored.push({ ...item, lexemeId: row.id, lemma: row.lemma, translation: row.translation });

    // Only what the word can actually support. A hand-added entry has no
    // forms, so asking for a case-form card would produce nothing; a matched
    // one may carry every form and deserves the lot.
    if (input.addCards && !carded.has(row.id)) {
      carded.add(row.id);
      const result = await addCardsFor(
        ownerId, row.id, availableCardTypes(row as LexemeForCards), "SCAN",
      );
      if (result.ok) cards += result.added ?? 0;
    }
  }

  const scan = await prisma.scan.create({
    data: { ownerId, title, items: serialiseItems(stored) },
    select: { id: true },
  });

  return { ok: true as const, id: scan.id, words: stored.length, cards, created };
}

/** Adds every word on a saved page that is not in the deck yet. */
export async function addScanToDeckFor(ownerId: string, scanIdIn: unknown) {
  const scanId = typeof scanIdIn === "string" ? scanIdIn : "";
  const scan = await prisma.scan.findFirst({
    where: { id: scanId, ownerId },
    select: { items: true },
  });
  if (!scan) return { ok: false as const, error: "That page isn't here any more." };

  const items = parseItems(scan.items, SCAN_MAX_ITEMS);

  /*
    One query for the words, not sixty.

    A page carries up to `MAX_ITEMS` words and this asked the dictionary about
    each one on its own, with its whole paradigm attached. None of those reads
    depends on what the previous word did: they are the same question sixty
    times over, and a deployment asks it through a pooler while somebody
    watches the button they just pressed. `importWords` and the offline replay
    had the same shape for the same reason.

    The `addCardsFor` below stays per word, because that one is the write and
    it takes an advisory lock on (owner, word) to keep a double tap from
    building two decks.
  */
  const wanted = [...new Set(items.map((i) => i.lexemeId).filter((id): id is string => !!id))];
  const byId = new Map(
    (wanted.length
      ? await prisma.lexeme.findMany({ where: { id: { in: wanted } }, include: { forms: true } })
      : []
    ).map((l) => [l.id, l]),
  );

  let added = 0;
  for (const id of wanted) {
    const lexeme = byId.get(id);
    if (!lexeme) continue;
    const result = await addCardsFor(
      ownerId, lexeme.id, availableCardTypes(lexeme as LexemeForCards), "SCAN",
    );
    if (result.ok) added += result.added ?? 0;
  }

  return { ok: true as const, added, words: items.length };
}
