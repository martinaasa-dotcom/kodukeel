/**
 * AN ENGLISH WORD IS LOOKED UP THE WAY IT WAS MEANT, NOT THE WAY IT WAS SPELLED.
 *
 * A learner asked for the word they had wanted in a conversation, typed
 * `championship`, and was told the dictionary had nothing. The entry was there,
 * glossed "championships", because Ekilex files the word as a plural. Nobody
 * looking a word up thinks about whether the gloss beside it happens to be
 * singular, and a dictionary that makes them is the dictionary making them
 * feel stupid about a choice somebody else made.
 *
 * So a query is read as every shape English could have it in: singular and
 * plural, the bare verb under `-ing` and `-ed`, and the British and American
 * spellings of the same word. **Nothing here is ever printed**, which is what
 * makes guessing safe, exactly as `englishShapes` in `lib/copy/gapMeaning.ts`
 * argues: a shape is a key to look for inside a gloss somebody actually wrote,
 * and a shape nobody wrote matches nothing and disappears. A wrong guess costs
 * a match that was not going to happen anyway.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */

/** The commonest English plurals no ending reaches, both ways round. */
const IRREGULAR: Readonly<Record<string, string>> = {
  person: "people", child: "children", man: "men", woman: "women",
  foot: "feet", tooth: "teeth", mouse: "mice", goose: "geese",
  life: "lives", knife: "knives", wife: "wives", leaf: "leaves", half: "halves",
  shelf: "shelves", wolf: "wolves", thief: "thieves", loaf: "loaves",
};
const SINGULAR_OF: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(IRREGULAR).map(([one, many]) => [many, one]),
);

/** Words whose final `s` is not a plural, so stripping it would invent a word. */
const NOT_PLURAL = /(?:ss|us|is|news|series|species)$/;

/** Leading words a gloss or a query carries that say nothing about the meaning. */
const LEAD = /^(?:to|a|an|the)\s+/;

/** What an English query may be made of. Anything else is not read as English. */
const ENGLISH = /^[a-z][a-z' -]*$/;

/**
 * The query, lowercased, with its leading article or infinitive marker taken
 * off and its spaces collapsed. The one reading every comparison here starts
 * from, so a gloss and a query are normalized the same way.
 */
export function normaliseEnglish(text: string): string {
  let out = text.trim().toLowerCase().replace(/\s+/g, " ");
  // Twice, for "to be a" and "the a" shapes that turn up in glosses.
  out = out.replace(LEAD, "").replace(LEAD, "");
  return out.replace(/[!?.]+$/, "").trim();
}

/** Whether a query could be English at all: letters an English keyboard has, and nothing else. */
export function looksEnglish(query: string): boolean {
  const q = normaliseEnglish(query);
  return q.length >= 2 && ENGLISH.test(q);
}

/** The ending shapes one English word could be standing in for. */
function wordShapes(word: string): string[] {
  const out = new Set<string>([word]);
  if (word.length < 3) return [...out];

  const add = (w: string) => { if (w.length >= 2) out.add(w); };

  // Plural to singular, and singular to plural.
  if (SINGULAR_OF[word]) add(SINGULAR_OF[word]);
  if (IRREGULAR[word]) add(IRREGULAR[word]);
  if (word.endsWith("ies") && word.length > 4) add(`${word.slice(0, -3)}y`);
  if (/(?:s|x|z|ch|sh)es$/.test(word)) add(word.slice(0, -2));
  if (word.endsWith("s") && !NOT_PLURAL.test(word)) add(word.slice(0, -1));
  if (/(?:s|x|z|ch|sh)$/.test(word)) add(`${word}es`);
  else if (/[^aeiou]y$/.test(word)) add(`${word.slice(0, -1)}ies`);
  else if (!word.endsWith("s")) add(`${word}s`);

  // A verb under `-ing` or `-ed`: the bare form, with the doubled consonant
  // undone and the silent `e` put back, since `running`, `liked` and `hoped`
  // are what a learner writes and `run`, `like` and `hope` are what a gloss says.
  for (const ending of ["ing", "ed"]) {
    if (!word.endsWith(ending) || word.length < ending.length + 3) continue;
    const stem = word.slice(0, -ending.length);
    add(stem);
    add(`${stem}e`);
    if (/([^aeiou])\1$/.test(stem)) add(stem.slice(0, -1));
    if (ending === "ed" && stem.endsWith("i")) add(`${stem.slice(0, -1)}y`);
  }
  if (word.endsWith("ied") && word.length > 4) add(`${word.slice(0, -3)}y`);

  // British and American spellings of one word. Both directions, because the
  // gloss was written by whoever wrote it and the query by whoever is asking.
  const swaps: [RegExp, string][] = [
    [/our$/, "or"], [/or$/, "our"],
    [/ise$/, "ize"], [/ize$/, "ise"],
    [/isation$/, "ization"], [/ization$/, "isation"],
    [/yse$/, "yze"], [/yze$/, "yse"],
    [/tre$/, "ter"], [/ter$/, "tre"],
    [/ogue$/, "og"],
  ];
  for (const shape of [...out]) {
    for (const [from, to] of swaps) if (from.test(shape)) add(shape.replace(from, to));
  }
  return [...out];
}

/**
 * Every shape an English query could be standing for, the query itself first.
 *
 * A phrase inflects its last word, which is where English puts its endings:
 * `post offices` is `post office` and `getting up` is not a plural of anything,
 * so only the head is varied and the rest is kept as typed.
 */
export function englishVariants(query: string): string[] {
  const q = normaliseEnglish(query);
  if (!q) return [];
  if (!ENGLISH.test(q)) return [q];
  const words = q.split(" ");
  const head = words.pop()!;
  const before = words.length ? `${words.join(" ")} ` : "";
  return wordShapes(head).map((shape) => before + shape);
}

/**
 * The senses of a gloss, as a query would be compared against them: split on
 * the comma, semicolon, slash and "or" a gloss is written with, the qualifier
 * in brackets dropped, and the article and the infinitive marker off.
 *
 * Its own split rather than `looseSenses`, which reads a gloss the same
 * generous way, because that module sits beside the substitution relation and
 * the search is on the answer side of the line drawn round it (see
 * `lib/dict/synonyms.ts`). Two dozen characters of splitting are cheaper than
 * a door through that line.
 */
export function glossHeads(translation: string): string[] {
  const out: string[] = [];
  for (const piece of translation.replace(/\([^)]*\)/g, " ").split(/\s*[,;/]\s*|\s+or\s+/i)) {
    const head = normaliseEnglish(piece);
    if (head.length >= 2 && !out.includes(head)) out.push(head);
  }
  return out;
}

/**
 * Whether an English query names one of a gloss's senses, allowing for the
 * shape it was typed in. `first` where it is the sense the entry leads with,
 * which is the stronger claim, and `later` where it is one further along.
 */
export function englishMatch(query: string, translation: string): "first" | "later" | null {
  const variants = new Set(englishVariants(query));
  if (variants.size === 0) return null;
  const heads = glossHeads(translation);
  const at = heads.findIndex((head) => variants.has(head));
  if (at < 0) return null;
  return at === 0 ? "first" : "later";
}
