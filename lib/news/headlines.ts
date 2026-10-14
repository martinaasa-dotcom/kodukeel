/**
 * The Estonian somebody is reading today, before anything believes a word of it.
 *
 * The dictionary's "Try" row used to be twelve rows off the top of an
 * alphabetical list, so every learner on every day was offered `aasialane`,
 * `aatomipomm` and `aberratsioon`. Nobody looks up an aberration. The row is
 * meant to say "here is what this dictionary is for", and it was saying "here
 * is where the table starts".
 *
 * A news feed is the cheapest honest source of words that are actually in the
 * air today, and this is the half of reading one that a machine can do without
 * touching the network: pull the headlines out of the XML, and pull the words
 * out of the headlines.
 *
 * IT DECIDES NOTHING. Every string that leaves here is a *candidate*, exactly
 * as `lib/scan/extract.ts` produces candidates from a photograph, and for the
 * same reason: this is text from outside the app, and outside text does not
 * get to add Estonian to anything. `lib/dict/suggest.ts` hands each one to
 * `matchEstonianForm`, which offers it only if the dictionary recognizes the
 * exact spelling, a stored form, or a regular case of the genitive stem. A
 * headline could be about a company nobody has heard of and the worst that can
 * happen is that no word from it is offered.
 *
 * Pure and framework-free, so the parsing can be tested over a fixture rather
 * than over whatever the news happens to be this morning.
 */

/** How much XML is worth reading. A feed is tens of kilobytes; this is a cap on a surprise. */
const MAX_XML = 400_000;

/** Headlines to read. The front page is the topical part; page four is not. */
const MAX_HEADLINES = 60;

/**
 * A sentence boundary, for deciding which capital letters are ordinary.
 *
 * A headline capitalizes its first word, and Estonian capitalizes proper nouns
 * and very little else, so a capital *inside* a sentence is the one reliable
 * signal that a token is a name. `Politico: Prantsusmaa ja Saksamaa tegid
 * ettepaneku Kallase rolli tugevdada` has to lose four words and keep three,
 * and the colon is what makes `Prantsusmaa` sentence-initial rather than
 * mid-sentence, which is why this splits on one.
 */
const SENTENCE_BREAK = /[.:!?…]+/u;

/** Any run of characters that is not a letter separates two words. */
const WORD_BREAK = /[^\p{L}\p{M}]+/u;

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

/*
  A reference past the last code point is left as it was written, because
  `String.fromCodePoint` throws on one, and a throw here took every headline in
  the feed with it for the sake of one malformed title.
*/
const MAX_CODE_POINT = 0x10ffff;
const character = (code: number, whole: string) =>
  Number.isFinite(code) && code <= MAX_CODE_POINT ? String.fromCodePoint(code) : whole;

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return character(Number.parseInt(body.slice(2), 16), whole);
    }
    if (body.startsWith("#")) {
      return character(Number.parseInt(body.slice(1), 10), whole);
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * The headlines in an RSS document.
 *
 * Read out of `<item>` blocks rather than by matching every `<title>` in the
 * file, because the first `<title>` in an RSS feed is the channel's own name
 * and it is the one title in there that is never news.
 *
 * A regex rather than an XML parser: this reads one well-known field out of a
 * document whose only job is to carry it, an entire parser is a dependency,
 * and anything malformed enough to defeat this returns no headlines, which is
 * a case the caller has to handle anyway.
 */
export function parseHeadlines(xml: string): string[] {
  const source = xml.slice(0, MAX_XML);
  const out: string[] = [];

  for (const item of source.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(item[0]);
    if (!title?.[1]) continue;
    const text = decodeEntities(
      title[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"),
    ).trim()
      // One spelling of each letter. A feed that sends `õ` as `o` plus a
      // combining tilde matches no dictionary row, which holds the composed
      // form, and reads as a word nobody could vouch for.
      .normalize("NFC");
    if (text) out.push(text);
    if (out.length >= MAX_HEADLINES) break;
  }

  return out;
}

/** One news item: what it says, a line more of it, and where it is. */
export interface NewsItem {
  title: string;
  /** The feed's own summary, a sentence or two, or empty. */
  description: string;
  /** The article, or null where the feed gave none worth linking to. */
  link: string | null;
  /** When the feed says it was published, in milliseconds, or null where it does not say. */
  at: number | null;
}

/** The text of one field of an item, decoded and in one spelling of each letter. */
function field(item: string, name: string): string {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(item);
  if (!match?.[1]) return "";
  return decodeEntities(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

/**
 * The items in an RSS document, for the good news card, which wants the
 * summary and the link as well as the headline. Same rules as
 * `parseHeadlines`: items only, never the channel's own title, and a cap on a
 * surprise. A link is kept only where it is an https address, because it is
 * printed as a link on the learner's home page and a feed is outside text.
 * The publication date is read as well, because a card headed "today" may not
 * show last week's news, and ERR's science feed reaches back nine days.
 */
export function parseNewsItems(xml: string): NewsItem[] {
  const source = xml.slice(0, MAX_XML);
  const out: NewsItem[] = [];
  for (const item of source.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const title = field(item[0], "title");
    if (!title) continue;
    const href = field(item[0], "link");
    let link: string | null = null;
    try {
      link = href && new URL(href).protocol === "https:" ? new URL(href).toString() : null;
    } catch {
      link = null;
    }
    const published = Date.parse(field(item[0], "pubDate"));
    out.push({ title, description: field(item[0], "description"), link, at: Number.isFinite(published) ? published : null });
    if (out.length >= MAX_HEADLINES) break;
  }
  return out;
}

/**
 * The words in those headlines worth asking the dictionary about.
 *
 * Two things are dropped and both are about names rather than about quality,
 * because quality is the dictionary's call and not this function's:
 *
 * A token capitalized mid-sentence is a proper noun. Estonian capitalizes
 * names and sentence openings and almost nothing else, so this is close to
 * exact, and it is also the difference between offering somebody `kallas`,
 * meaning a shore, because a politician called Kallas was in the news.
 *
 * A token in full capitals is an abbreviation. `ERR` and `EL` are not words
 * anybody looks up, and lower-casing them would hand the matcher something
 * that could collide with a real lemma.
 *
 * Everything else goes through in the order it first appeared, deduplicated,
 * because the first headline is the biggest story and the row can only hold a
 * dozen words.
 */
export function headlineWords(headlines: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const headline of headlines) {
    for (const sentence of headline.split(SENTENCE_BREAK)) {
      const words = sentence.split(WORD_BREAK).filter(Boolean);
      words.forEach((word, index) => {
        if (word.length < 2) return;
        if (word === word.toLocaleUpperCase("et")) return;
        if (index > 0 && word[0] !== word[0]!.toLocaleLowerCase("et")) return;
        const lower = word.toLocaleLowerCase("et");
        if (seen.has(lower)) return;
        seen.add(lower);
        out.push(lower);
      });
    }
  }

  return out;
}

/**
 * A headline split into the runs a reader sees: words, and whatever sits
 * between them. Every character of the headline comes back in order, so a
 * screen can join the pieces and print exactly what the feed said while
 * treating the words as things to look up. `word` is a run of letters; the
 * rest is spaces, digits and punctuation, kept as one piece each.
 */
export interface HeadlineToken {
  text: string;
  word: boolean;
}

export function tokenise(headline: string): HeadlineToken[] {
  const out: HeadlineToken[] = [];
  // A combining mark belongs to the letter before it: split on it and a
  // decomposed `sõna` is two words, `so` and `na`, each looked up alone.
  for (const match of headline.matchAll(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu)) {
    const text = match[0];
    out.push({ text, word: /\p{L}/u.test(text) });
  }
  return out;
}
