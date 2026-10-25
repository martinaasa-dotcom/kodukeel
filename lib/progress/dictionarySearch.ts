import { knownAs as knownLemmas } from "@/lib/dict/known";
import { lookupAndStore } from "@/lib/dict/lookup";
import { searchLexemes, type SearchHit } from "@/lib/dict/search";
import { ekilexConfigured } from "@/lib/ekilex/client";

/**
 * A DICTIONARY SEARCH, FOR EITHER DOOR.
 *
 * The dictionary page and `GET /api/v1/dictionary` both call this (D2 in
 * docs/44-sixth-batch.md): the local search, then the forms list where the
 * spelling typed is a form of a headword, then Ekilex asked live where a key
 * is set. Moved out of the page whole, so a phone and a browser searching one
 * spelling find the same entries in the same order.
 */
export interface DictionarySearch {
  hits: SearchHit[];
  /** The headwords the forms list says the spelling belongs to, where nothing matched it directly. */
  knownAs: string[];
  /** Whether Ekilex was asked live and answered, so this render already counted its requests. */
  fetched: boolean;
}

/**
 * The first few headwords a spelling may belong to, and not all of them,
 * because a spelling can belong to several: `koolis` is the seesütlev of
 * `kool` and a person of `koolma`, and the list is ordered with the likeliest
 * first. Each one is a query and each one below is a request to a free
 * academic service, so the cap is what stops an ambiguous spelling costing
 * five of each.
 */
const WORTH_TRYING = 3;

export async function searchDictionary(ownerId: string, query: string): Promise<DictionarySearch> {
  const q = query;
  let hits = q ? await searchLexemes(q, undefined, ownerId) : [];

  /*
    NOTHING LOCALLY, SO ASK WHICH WORD THAT SPELLING IS A FORM OF.

    The search strips a case ending to find a genitive stem and a person
    ending to find a first person, and that reaches every form the dictionary
    holds. It reaches nothing for a word the dictionary has no entry for, and
    that is where a form used to become a dead end twice over: `põhjas` is not
    a headword, so Ekilex's search answered nothing for it too, and the screen
    said nothing was found about the seesütlev of `põhi`. The forms list
    (`lib/dict/forms.ts`) says which headwords a spelling belongs to, so the
    live lookup below asks for the word rather than for the form.
  */
  const knownAs = q && hits.length === 0 ? await knownLemmas(q) : [];
  for (const lemma of knownAs.slice(0, WORTH_TRYING)) {
    if (hits.length > 0 || lemma === q.trim()) break;
    hits = await searchLexemes(lemma, undefined, ownerId);
  }

  // Still nothing: ask Ekilex, store what comes back, and search again. The
  // second lookup of the same word never leaves the machine. The headword
  // first, since that is what Ekilex is keyed on, then the spelling as typed.
  let fetched = false;
  if (q && hits.length === 0 && ekilexConfigured()) {
    for (const wanted of [...knownAs.slice(0, WORTH_TRYING), q]) {
      const found = await lookupAndStore(ownerId, wanted);
      if (found) {
        hits = await searchLexemes(found.lemma, undefined, ownerId);
        fetched = true;
        break;
      }
    }
  }
  return { hits, knownAs, fetched };
}
