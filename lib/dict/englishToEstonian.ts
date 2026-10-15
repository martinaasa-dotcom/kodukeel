import { singleFlight } from "@/lib/cache/singleFlight";
import { englishVariants, looksEnglish, normaliseEnglish } from "./english";

/**
 * AN ENGLISH WORD THE DICTIONARY HAS NO ENTRY FOR YET.
 *
 * The dictionary can be searched in English, and the English it searches is
 * the glosses beside the six thousand entries it holds. Ekilex holds a hundred
 * and sixty thousand, and a reader key carries no English for any of them, so
 * an English word for something the course never taught had nowhere to go: a
 * learner wanted the word for `championship`, typed it, and was told nothing
 * was found, while `meistrivõistlused` was one Ekilex request away and was
 * fetched the moment they searched for it in Estonian instead.
 *
 * Wiktionary's English entries carry translation tables, and the Estonian row
 * of a table is a lexicographer's answer to exactly this question, under the
 * same licence the built dictionary's glosses already come from (CC BY-SA 4.0,
 * credited on /terms and in `LICENSE`). So the dead end asks it.
 *
 * WIKTIONARY PROPOSES AND THE DICTIONARY DECIDES, which is ADR-021's rule about
 * a photographed page and the door every other outside source comes through.
 * What this returns is a list of candidate spellings and nothing more. The
 * caller keeps only a spelling the forms list (Ekilex and Vabamorf, guessing
 * off) or the dictionary itself recognizes as a headword, nothing is stored,
 * and what a learner opens by pressing one is Ekilex's own entry through the
 * ordinary live lookup. Nothing a Wiktionary editor typed reaches a card.
 *
 * One request per English word, two where the translations live on a subpage,
 * at most once a day per instance, with a deadline, and silent on every
 * failure: a dead end that could not ask is the dead end it was before.
 */

const PAGE = "https://en.wiktionary.org/w/index.php";
const UA = "Kodukeel/0.1 (personal Estonian learning tool)";

/** How long one English word's answer is reused. Translation tables change slowly. */
const HOLD_MS = 24 * 60 * 60 * 1_000;

/** Answers held per instance. A few hundred English words is a busy day. */
const HELD_MAX = 500;

/**
 * How long the dead end waits for Wikimedia. A miss already shows the
 * dictionary's own suggestions without this, so it is worth a moment and not
 * worth a page.
 */
const DEADLINE_MS = 2_500;

/** One Estonian word a translation table names, and the sense it names it for. */
export interface Translation {
  word: string;
  /** The table's own heading, "competition to determine a champion", or null where it has none. */
  sense: string | null;
}

/** What one page said: translations, and whether the real table is on a subpage. */
export interface TranslationPage {
  translations: Translation[];
  subpage: boolean;
}

/** The translation templates a table writes an Estonian word with. */
const TRANSLATION = /\{\{\s*(?:t|t\+|tt|tt\+|t-check|t\+check|t-simple)\s*\|\s*et\s*\|([^|}]+)/g;

/** A plain wikilink, which an older table row uses instead of a template. */
const LINK = /\[\[([^\]|#]+)(?:[^\]]*)\]\]/g;

/**
 * Estonian translations off an English Wiktionary page, in the page's order.
 *
 * Only from the `==English==` section, since a page titled `kind` also holds
 * German, and only from tables whose sense somebody has written: a
 * `{{checktrans-top}}` table is Wiktionary's own list of rows nobody has
 * placed under a meaning yet, so a word in it is a guess that the page itself
 * calls unchecked.
 */
export function estonianTranslations(wikitext: string): TranslationPage {
  const english = /(?:^|\n)==\s*English\s*==\s*\n([\s\S]*?)(?=\n==[^=]|$)/.exec(wikitext);
  const body = english?.[1] ?? "";
  const subpage = /\{\{\s*see translation subpage/i.test(body);

  const translations: Translation[] = [];
  const seen = new Set<string>();
  let sense: string | null = null;
  let checked = false;

  for (const line of body.split("\n")) {
    const top = /^\{\{\s*(trans-top|checktrans-top)\s*(?:\|([^}]*))?\}\}/.exec(line);
    if (top) {
      checked = top[1] === "trans-top";
      sense = checked ? senseOf(top[2] ?? "") : null;
      continue;
    }
    if (/^\{\{\s*trans-bottom/.test(line)) {
      checked = false;
      sense = null;
      continue;
    }
    if (!checked) continue;
    const row = /^\*:?\s*Estonian\s*:(.*)$/.exec(line);
    if (!row) continue;

    const words: string[] = [];
    for (const m of row[1]!.matchAll(TRANSLATION)) words.push(m[1]!);
    if (words.length === 0) for (const m of row[1]!.matchAll(LINK)) words.push(m[1]!);
    for (const raw of words) {
      const word = raw.trim();
      // A real Estonian headword is letters, a hyphen and the occasional
      // space; anything else is markup that came through, and is dropped
      // rather than offered.
      if (!/^[\p{L}][\p{L} -]*$/u.test(word) || seen.has(word)) continue;
      seen.add(word);
      translations.push({ word, sense });
    }
  }
  return { translations, subpage };
}

/** The sense a `{{trans-top}}` names: its last parameter that is not `id=`, with links unwrapped. */
function senseOf(params: string): string | null {
  const parts = params.split("|").map((p) => p.trim()).filter((p) => p && !/^\w+=/.test(p));
  const last = parts.at(-1);
  if (!last) return null;
  return last.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?/g, "").trim() || null;
}

const held = new Map<string, { value: Translation[]; until: number }>();

/** The raw wikitext of one page, or null on any failure at all. */
async function fetchPage(title: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`${PAGE}?title=${encodeURIComponent(title)}&action=raw`, {
      headers: { "user-agent": UA },
      signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** One page, and its translation subpage where the table lives there. */
async function translationsOf(title: string, signal: AbortSignal): Promise<Translation[]> {
  const text = await fetchPage(title, signal);
  if (!text) return [];
  const page = estonianTranslations(text);
  if (page.translations.length > 0 || !page.subpage) return page.translations;
  const sub = await fetchPage(`${title}/translations`, signal);
  return sub ? estonianTranslations(sub).translations : [];
}

/**
 * The Estonian words Wiktionary gives for an English query, unvetted.
 *
 * Tries the query as typed and then its singular, since a learner who wanted
 * the word for "championships" is asking about the entry `championship`, and
 * an English page for a plural carries no table. Two pages at most.
 *
 * The caller decides which of these the dictionary vouches for; nothing here
 * knows or cares whether a word is Estonian.
 */
export async function estonianFor(query: string): Promise<Translation[]> {
  if (!looksEnglish(query)) return [];
  const asTyped = normaliseEnglish(query);
  const now = Date.now();
  const cached = held.get(asTyped);
  if (cached && now < cached.until) return cached.value;

  return singleFlight(`wiktionary:en:${asTyped}`, async () => {
    const signal = AbortSignal.timeout(DEADLINE_MS);
    // The query, then the other shapes it could have, nearest first: a
    // plural's singular, a gerund's bare verb. Two pages and no more, because
    // each is a request to somebody else's service.
    const titles = englishVariants(asTyped).slice(0, 2);
    let value: Translation[] = [];
    for (const title of titles) {
      value = await translationsOf(title, signal);
      if (value.length > 0 || signal.aborted) break;
    }
    // A miss is held too, for the same day, so retyping the same English word
    // does not ask Wikimedia again. Not when the deadline ran out, since that
    // is a fact about the network rather than about the word.
    if (!signal.aborted) {
      if (held.size >= HELD_MAX) {
        const oldest = held.keys().next().value;
        if (oldest !== undefined) held.delete(oldest);
      }
      held.set(asTyped, { value, until: Date.now() + HOLD_MS });
    }
    return value;
  });
}
