import { after } from "next/server";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";

import { prisma } from "@/lib/db";
import { sentenceReach } from "@/lib/dict/facts";
import { countStoredAnswer, enrichWithinDeadline } from "@/lib/dict/lookup";
import { parseExamples, usableExamples, type Example } from "@/lib/dict/examples";
import { plainerFirst } from "@/lib/dict/plainness";
import { ekilexConfigured } from "@/lib/ekilex/client";
import { backfillClozeCards } from "@/lib/srs/backfill";

/**
 * ONE DICTIONARY ENTRY, AS THE ENTRY SCREEN READS IT, FOR EITHER DOOR.
 *
 * The dictionary page opens an entry and `GET /api/v1/words/{id}` hands one to
 * a phone, and both call `openEntry` (D2 in docs/44-sixth-batch.md): a seeded
 * word upgraded to the forms Ekilex records where a key is set, the cards that
 * upgrade made possible built, the row read with this learner's deck and star,
 * the sentences in the order a beginner reads them, and an answer from the
 * stored copy counted for /impact (D17). Moved out of the page whole, so the
 * entry a phone shows and the entry a browser shows cannot come apart.
 *
 * A sentence somebody refused never arrives: `parseExamples` is the one reader
 * of the column and drops it on every door (`lib/dict/refused.ts`).
 */

export interface EntryForm {
  formType: string;
  value: string;
  isPrincipal: boolean;
  morphCode: string | null;
  morphName: string | null;
  orderIndex: number;
}

export interface EntryView {
  id: string;
  lemma: string;
  translation: string;
  /**
   * The Institute's own Russian and Ukrainian, where Ekilex recorded them.
   *
   * Not a translation this app or a model made: they come from the same
   * response as the forms and the sentences. Null on most of the built
   * expansion, which is drawn from Wiktionary and has none.
   */
  translationRu: string | null;
  translationUk: string | null;
  pos: string;
  cefr: string | null;
  gradation: string;
  gradationNote: string | null;
  government: string | null;
  /**
   * The Institute's semantic type codes, which decide which of the two sets of
   * local cases this word takes and whether it answers `kes?` or `mis?`.
   * See lib/estonian/caseQuestion.ts.
   */
  semanticTypes: string | null;
  notes: string | null;
  definition: string | null;
  provenance: string;
  /**
   * The Ekilex word this entry was read from, or null where Ekilex supplied
   * none of it. Decides whether the entry carries the Institute's credit, and
   * whether opening it counts as an answer from the stored copy.
   */
  ekilexWordId: number | null;
  inDeck: boolean;
  starred: boolean;
  examples: Example[];
  forms: EntryForm[];
}

export interface OpenEntryOptions {
  /**
   * Whether an answer from the stored copy is counted for /impact. False where
   * this render already asked Ekilex live, which counted its own requests, and
   * for a prefetch, since a pointer resting on a link is not a lookup.
   */
  countAnswer: boolean;
  /**
   * Leave out whatever a model wrote: a word Anu suggested (provenance `AI`)
   * is not found, and a sentence a model supplied is not handed over. The web
   * entry draws both and marks them; a phone's entry is the dictionary's alone.
   */
  dictionaryOnly?: boolean;
}

/** The entry, read and upgraded, and whether Ekilex was asked live to do it. */
export async function openEntry(
  ownerId: string,
  id: string,
  options: OpenEntryOptions,
): Promise<{ entry: EntryView | null; fetched: boolean }> {
  let fetched = false;
  // A seeded word about to be displayed: upgrade it to the real forms first.
  if (ekilexConfigured()) {
    const upgraded = await enrichWithinDeadline(id);
    if (upgraded) {
      fetched = true;
      // The sentences that just arrived can support a gap-fill card this word
      // could not have had when it was added to the deck.
      await backfillClozeCards(ownerId, id);
    }
  }
  const entry = await loadEntry(id, ownerId, options.dictionaryOnly === true);
  // Counted in `after()`, so the count costs the reader nothing and still lands.
  /*
    And a learner's own lookups count only so far in a day. The figure goes to
    funders as how often the stored dictionary answered, and a page view is a
    GET a script can repeat, so one account opening one word in a loop
    inflated it without limit.
  */
  if (entry && !fetched && options.countAnswer) {
    after(async () => {
      const room = await checkSharedRateLimit(`ekcount:o:${ownerId}`, COUNTED_PER_DAY, 24 * 60 * 60 * 1000);
      if (room.ok) await countStoredAnswer(entry);
    });
  }
  return { entry, fetched };
}

/** How many of one learner's lookups a day count towards the stored-answer figure. */
const COUNTED_PER_DAY = 200;

async function loadEntry(id: string, ownerId: string, dictionaryOnly: boolean): Promise<EntryView | null> {
  const [lex, reach] = await Promise.all([
    prisma.lexeme.findUnique({
      where: { id },
      include: {
        forms: { orderBy: { orderIndex: "asc" } },
        cards: { where: { ownerId }, select: { id: true } },
        stars: { where: { ownerId }, select: { ownerId: true } },
      },
    }),
    /*
      And how a beginner's word orders its own sentences, so the entry leads
      with the one they can read rather than the one ten characters shorter.
      The entry prints them all, so nothing is hidden by this: what it decides
      is which sentence somebody looking a word up reads first. See
      lib/dict/plainness.ts.
    */
    sentenceReach(),
  ]);
  if (!lex) return null;
  if (dictionaryOnly && lex.provenance === "AI") return null;
  /*
    A row a learner added is theirs to read, and a stranger's only where it is
    already in the stranger's own deck. The search no longer finds another
    learner's own word (`searchLexemes`), and an id in a link is the same door.
  */
  const sourced = lex.provenance === "SEED" || lex.provenance === "EKILEX";
  if (!sourced && lex.editedBy !== ownerId && lex.cards.length === 0) return null;
  // A sentence a learner typed reaches its author and nobody else (`typedReaches`).
  const examples = usableExamples(parseExamples(lex.examples), plainerFirst(lex.cefr, reach), { viewer: ownerId });
  return {
    id: lex.id,
    lemma: lex.lemma,
    translation: lex.translation,
    translationRu: lex.translationRu,
    translationUk: lex.translationUk,
    pos: lex.pos,
    cefr: lex.cefr,
    gradation: lex.gradation,
    gradationNote: lex.gradationNote,
    government: lex.government,
    semanticTypes: lex.semanticTypes,
    notes: lex.notes,
    definition: lex.definition,
    provenance: lex.provenance,
    ekilexWordId: lex.ekilexWordId,
    inDeck: lex.cards.length > 0,
    starred: lex.stars.length > 0,
    // Without `by`: a reviewer's sentence reaches everybody, and their account id need not.
    examples: (dictionaryOnly ? examples.filter((e) => e.source !== "AI") : examples).map(({ by: _by, ...e }) => e),
    forms: lex.forms.map((f) => ({
      formType: f.formType,
      value: f.value,
      isPrincipal: f.isPrincipal,
      morphCode: f.morphCode,
      morphName: f.morphName,
      orderIndex: f.orderIndex,
    })),
  };
}
