/**
 * WHICH OF A WORD'S RECORDED SENTENCES A BEGINNER SHOULD BE SHOWN.
 *
 * `usableExamples` sorts the attested sentences shortest first, and its own
 * header argues for it: a first example that fits on one line is worth more to
 * a beginner than a subtler one that runs to three. That is true about length
 * and it is not true about difficulty, because Ekilex records a usage to
 * illustrate a word **to a reader who already speaks Estonian**. What shortest
 * selects for is the noun phrase and the idiom, which is the opposite of what a
 * beginner needs. Measured over the shipped dictionary, of the 1,268 words
 * banded A1 or A2 that are shown a sentence at all, 445 were shown something
 * with no finite verb in it (`Hööveldamata lauad.`, `Noored ja haritud
 * inimesed.`, `Laste joonistatud pildid.`) and 724 something carrying a
 * spelling no A1 or A2 word reaches (`Papagoi pääses lahtise akna kaudu
 * välja.` for `aken`, `Isa suri ööl vastu laupäeva.` for `öö`). 421 of the
 * 1,268, a third, were plain on both counts.
 *
 * The fix costs nothing, because the better sentence is nearly always already
 * there: 746 of those words carry one among their own usages and were simply
 * not being shown it. `tere` is the whole argument in one entry. It has two
 * recorded usages, `No tere, Juhan.` and `Tere, mina olen Katrin.`, and the
 * first is shorter, so the first unit anybody opens taught hello with a
 * discourse particle this dictionary has no entry for, spelled exactly like
 * the English word for the opposite of yes. It was reported by somebody
 * reading it.
 *
 * SO THIS RANKS, AND IT MAY NEVER REFUSE. Every sentence here has already
 * passed `usableExamples` and `naturalSentence`; all this decides is which one
 * a screen leads with. A word whose only sentence is hard keeps it, because the
 * alternative is a word with no sentence at all, and "no example sentence for
 * this one yet" on a word the dictionary has a perfectly good sentence for is
 * a worse screen than a hard example. That is `aroundFirst`'s rule one
 * directory over, for its reason: ordering is safe on a pool somebody owns and
 * filtering is not.
 *
 * AND THE BAND IS THE WORD'S, NOT THE LEARNER'S. Which sentence teaches `aken`
 * best is a fact about the shared dictionary, so it is cached with the other
 * facts and is the same for everybody; reading the learner's own level here
 * would make the sentence on a shared entry page depend on who is looking, and
 * would put something keyed on a person into a file asserted to hold nothing
 * of the kind. A word the Institute bands A1 or A2 is a word a beginner meets,
 * whoever else also meets it, and a B1 reader is not harmed by a plainer
 * sentence for `tere`. Above A2 the ranking stands down entirely and shortest
 * first is kept: a B1 word is met by somebody who can read a subordinate
 * clause, and churning what every B1 card is cut from buys nothing anybody
 * reported.
 *
 * Pure: entries in, a comparator out. No Prisma, no clock, and no Estonian
 * written anywhere in it (ADR-005) — every signal is a count over spellings the
 * dictionary already holds.
 */
import { derivedVerbForms, isFiniteVerbCode, pres1sgFrom } from "@/lib/estonian/conjugate";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { gapForms } from "@/lib/estonian/gapForms";
import { buildCaseTable, stemsFromParts } from "@/lib/estonian/derive";
import { LEVELS, type Level } from "@/lib/collections/syllabus/index";
import type { Example } from "@/lib/dict/examples";

/**
 * The bands whose words are taught with the plainest sentence available.
 *
 * A1 and A2, because that is where a learner cannot yet read past a word they
 * do not have, and because a beginner shown a participle phrase concludes the
 * language is the problem. Stated as the highest band that gets the treatment
 * rather than as a list, so `plainerFirst` can answer for any band it is given.
 */
export const PLAIN_UP_TO: Level = "A2";

/** One entry, as much of it as ranking needs. The shape `borrow.ts` takes. */
export interface PlainEntry {
  readonly lemma: string;
  readonly pos: string;
  readonly cefr: string | null;
  readonly forms: readonly { readonly formType: string; readonly value: string; readonly morphCode?: string | null }[];
}

/**
 * What the dictionary can say about a spelling, for every spelling it reaches.
 *
 * Two questions, and a screen needs both: can this app vouch for the word at
 * all, and is it one a beginner could have met. They are different failures.
 * `papagoi` is in the dictionary and is a B2 bird; `no` is in no entry at any
 * band, so a learner who stops on it cannot even look it up. The second is the
 * worse of the two and is weighted as such below.
 */
export interface PlainReach {
  /** The easiest band any entry claiming this spelling sits at, as a `LEVELS` index. */
  readonly bandOf: ReadonlyMap<string, number>;
  /** Spellings that are a finite verb of some entry: is this a sentence at all? */
  readonly finite: ReadonlySet<string>;
}

/**
 * Where an unbanded entry counts as sitting.
 *
 * The Wiktionary expansion writes no CEFR code for 2,075 of the 6,153 entries
 * the dictionary ships, and reading that absence as A1 would vouch for the
 * whole tail as beginner vocabulary. B1 is the same floor `dictionaryRows`
 * applies to a harvested word with no code, and it is the cautious direction
 * here: it can only ever rank a sentence lower.
 */
const UNBANDED = LEVELS.indexOf("B1");

/**
 * Every spelling the dictionary reaches, with the easiest band that reaches it.
 *
 * Built off `gapForms`, which is the one answer to what spellings a word has:
 * every stored form, the ten regular cases on the genitive stem, and a verb's
 * persons off the stored first person. The simple past is the one shape no
 * rule gets to, so a verb also claims its stored past third person the way
 * `claimIndex` does, since `sõitsime` and `käisime` are ordinary A1 Estonian
 * and reading them as unknown vocabulary is how a check starts refusing the
 * sentences it was written to prefer.
 *
 * AND THE PLURAL OBLIQUES, WHICH `gapForms` DOES NOT REACH AND WHICH THIS HAS
 * TO. `gapForms` walks `CASES` through `caseAnswer`, and that is the singular:
 * the plural obliques are suffixes on the genitive *plural*, which is stored
 * rather than derivable. So without them `meestel` and `naistel` are spellings
 * no entry claims, which is the class `no` is in, and they are the adessive
 * plural of two of the first words the course teaches. The first version of
 * this file charged them 8 apiece and the damage was exactly what the ranking
 * exists to prevent: `inimene` was handed `Noored ja haritud inimesed.`, a noun
 * phrase, over `Ma olen täiesti tavaline inimene.`, because the sentence was
 * carrying two ordinary plurals and the phrase was carrying none.
 *
 * Through `buildCaseTable` rather than by joining a suffix here, because
 * `lib/estonian/derive.ts` is the one module allowed to do that and is where
 * the exceptions live: a word whose genitive plural is not stored gets a gap
 * rather than an invented form, which is ADR-005 and is also what keeps this
 * from vouching for spellings nobody writes.
 *
 * Widest claim wins, and that is deliberate: a spelling two entries reach is
 * ranked at the easier of the two, because a beginner who recognises it
 * recognises it. This is the opposite of `claimIndex`'s rule, where an
 * ambiguous spelling is refused outright, and the reason is the direction of
 * the error. There a wrong claim builds a wrong card; here it only moves a
 * sentence up an ordering, so over-reach costs a slightly harder example and
 * under-reach costs a good sentence being passed over.
 */
export function plainReach(entries: readonly PlainEntry[]): PlainReach {
  const bandOf = new Map<string, number>();
  const finite = new Set<string>();

  const claim = (spelling: string, band: number) => {
    const clean = spelling.trim().toLocaleLowerCase("et");
    if (!clean) return;
    const held = bandOf.get(clean);
    if (held === undefined || band < held) bandOf.set(clean, band);
  };

  for (const entry of entries) {
    const at = entry.cefr ? LEVELS.indexOf(entry.cefr as Level) : -1;
    const band = at >= 0 ? at : UNBANDED;

    for (const spelling of gapForms(entry).keys()) claim(spelling, band);

    if (entry.pos !== "VERB") {
      const parts: Record<string, string> = {};
      for (const form of entry.forms) parts[form.formType] = form.value;
      for (const derived of buildCaseTable(stemsFromParts(parts))) {
        if (derived.plural) claim(derived.plural, band);
      }
      continue;
    }

    const past = entry.forms.find((f) => f.formType === "PAST_1SG")?.value;
    if (past) {
      finite.add(past.toLocaleLowerCase("et"));
      if (past.toLocaleLowerCase("et").endsWith("in")) {
        const third = past.slice(0, -2);
        claim(third, band);
        finite.add(third.toLocaleLowerCase("et"));
      }
    }

    const pres = pres1sgFrom(entry.forms);
    if (pres) finite.add(pres.toLocaleLowerCase("et"));
    /*
      Through `derivedVerbForms` rather than by joining an ending to a stem
      here: that module is the one place allowed to make a person of a verb,
      and it is also where the exceptions live, so `olema` gets no present
      from a rule and `on` arrives as a stored form instead.
    */
    for (const derived of derivedVerbForms({ lemma: entry.lemma, pres1sg: pres ?? undefined })) {
      finite.add(derived.value.toLocaleLowerCase("et"));
      claim(derived.value, band);
    }
    /*
      And the stored forms the rule cannot reach, but only the ones that can
      head a clause. The table is mostly the ones that cannot: 322 past
      participles and 318 present participles against 319 simple pasts, so
      taking every coded form would have told this that `Laste joonistatud
      pildid.` has a verb in it, which is the one shape the check is for.
    */
    for (const form of entry.forms) {
      const code = form.morphCode
        ?? (form.formType.startsWith("EKILEX:") ? form.formType.slice(7) : null);
      if (isFiniteVerbCode(code)) finite.add(form.value.toLocaleLowerCase("et"));
    }
  }

  return { bandOf, finite };
}

/** The words of a sentence, lowercased, on the boundary the rest of the app splits on. */
function wordsOf(sentence: string): string[] {
  return [...sentence.matchAll(ESTONIAN_WORD)].map((m) => m[0].toLocaleLowerCase("et"));
}

/**
 * What a sentence costs a learner at `limit`. Lower is plainer.
 *
 * A cost rather than a chain of tie-breaks, and that is measured rather than
 * tidy. Ranked lexicographically on vocabulary first and length last, `inimene`
 * moved from `Noored ja haritud inimesed.` to `See ei ole viimane kord, kui
 * viirus hüppab loomalt inimesele.`: every word within reach and far too long
 * to be a first example. Weighing them against each other keeps the mean at
 * 4.1 words against the 3.5 shortest-first gives, while taking the share of
 * plain sentences from 33% to 57%.
 *
 * The four signals, in the order their weights say they matter:
 *
 * - **A spelling no entry reaches** (8). The learner cannot look it up, so
 *   there is nowhere for them to go. `no`, `noh` and `nojah` are all in this
 *   class, and so is every proper noun and every abbreviation.
 * - **No finite verb** (`NO_VERB`). `Hööveldamata lauad.` is a phrase, and a
 *   gap cut from a phrase asks for a form with no sentence around it to say
 *   why. Swept rather than chosen: at 0 the lead is a phrase for 322 of the
 *   1,269 beginners' words, at 6 for 183, at 12 for 129, and past 12 it
 *   flattens (116 at 16, 108 at 20, 105 at 30) while the mean length keeps
 *   climbing. 12 is the knee, and it buys that 30% for a tenth of a word.
 * - **A spelling above the band** (4 each). Known to the dictionary, not to
 *   this reader.
 * - **A clause boundary** (2 each) and **each word** (1). Two things to hold
 *   in your head rather than one, and length.
 */
/** What a sentence with no finite verb in it costs. Swept; see the header. */
const NO_VERB = 12;

export function plainnessCost(sentence: string, reach: PlainReach, limit: number): number {
  const words = wordsOf(sentence);
  let cost = words.length;
  if (!words.some((w) => reach.finite.has(w))) cost += NO_VERB;
  for (const word of words) {
    const band = reach.bandOf.get(word);
    if (band === undefined) cost += 8;
    else if (band > limit) cost += 4;
  }
  return cost + (sentence.match(/,/g)?.length ?? 0) * 2;
}

/**
 * The comparator `usableExamples` applies to a word's attested sentences, or
 * nothing at all where the word is above the bands this is for.
 *
 * Returning `undefined` rather than an identity comparator is what keeps the
 * standing-down honest: a caller that passes this straight through leaves
 * `usableExamples` on exactly the order it had, rather than on a stable sort
 * that happens to agree today.
 */
export function plainerFirst(
  cefr: string | null,
  reach: PlainReach,
): ((a: Example, b: Example) => number) | undefined {
  const at = cefr ? LEVELS.indexOf(cefr as Level) : -1;
  const limit = LEVELS.indexOf(PLAIN_UP_TO);
  if (at < 0 || at > limit) return undefined;

  const cache = new Map<string, number>();
  const cost = (et: string) => {
    const held = cache.get(et);
    if (held !== undefined) return held;
    const made = plainnessCost(et, reach, limit);
    cache.set(et, made);
    return made;
  };
  // Length settles a tie so the order is total: two sentences costing the same
  // must not be left to whatever order the column happened to hold.
  return (a, b) => cost(a.et) - cost(b.et) || a.et.length - b.et.length;
}
