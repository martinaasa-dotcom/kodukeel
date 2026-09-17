/**
 * Whether a sentence somebody rebuilt is an order Estonian actually uses.
 *
 * The sentence builder compared the tiles with the recording and called
 * everything else wrong. That is a claim the recording cannot support: a usage
 * is one Estonian sentence rather than the only one, and the field after the
 * verb in this language is genuinely free. It was reported off the app's own
 * first unit, where `Muidugi tuleb ette näpukaid` rebuilt as
 * `Muidugi tuleb näpukaid ette`, which is what anybody says, was marked wrong
 * under "Not the order Estonian uses here." A learner told their own Estonian
 * is wrong stops trusting the marking, and on a word-order exercise the
 * marking is all there is.
 *
 * So a built sentence is read three ways rather than two: the order the writer
 * chose, another order Estonian allows, and an order it does not. The first
 * two are both right and neither is penalised.
 *
 * **Accepting a permutation is this app making a claim about Estonian**, so
 * only the permutation it can be certain of is accepted and every other order
 * is still refused. One rule, and each of the conditions on it is there
 * because taking it away accepts a sentence nobody says. They were arrived at
 * by reading what the rule accepted rather than by reasoning about Estonian,
 * which is what `npm run audit:order` prints.
 *
 * 1. **A verb particle directly after the finite verb may instead stand at the
 *    end of its clause.** `panen kinni akna` and `panen akna kinni` are both
 *    ordinary Estonian and which one a lexicographer happened to write down
 *    says nothing about the other. The verb is the anchor rather than a
 *    position, because Estonian drops a pronoun subject and puts the verb
 *    first when it does: read positionally, `Pühkisin otsa eest higi` has a
 *    postposition where `Muidugi tuleb ette näpukaid` has a particle, and the
 *    two are the same shape to anything that is counting words.
 * 2. **Half of these words are also adpositions**, and moving one of those
 *    breaks the phrase it heads. An adposition stands next to the nominal it
 *    governs, so `PARTICLES` is in two halves: a word that is never an
 *    adposition moves to the clause end whatever follows it, and a word that
 *    can be one moves only when exactly one word follows, which makes the move
 *    a swap of the last two and can strand no complement. After that swap a
 *    preposition has become the postposition Estonian already uses for the
 *    same phrase, `üle tee` and `tee üle`, `mööda teed` and `teed mööda`.
 * 3. **Nothing is carried past a clause boundary, a joiner or a participle.**
 *    `Nad kõndisid edasi ja jõudsid järveni` does not survive `edasi` being
 *    sent past the `ja`, and `lahti kirjutamata akronüümide` is a participle
 *    standing in front of its noun, which the particle in front of it belongs
 *    to. What the particle is carried past is **every** word from its own
 *    position to the end of the clause, the last one included: written as the
 *    words it passes between, the guard could not see the word the particle
 *    ends up behind, which is how the ordinary Estonian perfect (`oleks lahti
 *    läinud`) walked through the check written for it.
 * 4. **A comma ends a clause only where what follows it has a verb of its
 *    own.** A comma separates a list as often as it ends a clause, and
 *    punctuation cannot tell those apart: in `Sünnipäevapidu oli täis
 *    muusikat, naeratusi ja õnnitlusi` the segment before the comma looks
 *    like a whole clause and is half of one, since `täis` governs a list that
 *    carries on past it. The reading may only ever refuse, and that is not a
 *    style note: written as a fold that made the two segments one clause, it
 *    carried `katki` across the comma in `Kraadiklaas läks katki, elavhõbe
 *    voolas laiali`, because `voolas` is a simple past no rule here derives
 *    and the verb in the second clause was invisible.
 *
 * 5. **A time adverb may stand at either edge of its clause or on either side
 *    of the verb**, which is the second move and was reported the same way
 *    the first was: `Ma loen raamatut täna`, `Ma loen täna raamatut`, `Täna
 *    ma loen raamatut` and `Ma täna loen raamatut` are all said. Those four
 *    positions are not a sample of where the word may go, they are the four
 *    the app can name with no parser at all: the two edges, which need no
 *    reading of anything, and the two slots the verb makes, which split no
 *    phrase because the verb is a boundary on both sides. Anything between
 *    would have to be read off a phrase this cannot see, so `Ma loen
 *    huvitavat raamatut täna` is never offered as `Ma loen huvitavat täna
 *    raamatut`. The last of the four puts the verb third, which a textbook
 *    would mark and a native speaker asked for by name; the mark is a
 *    question for the exercise and the grammar is not.
 *
 *    **Six things refuse it and every one came off the list the audit
 *    prints.** A word beside it that is not a plain word of the dictionary,
 *    because `täna hommikul`, `tänavu veebruaris`, `veel täna` and `alles
 *    nüüd` are one expression each and taking the first word out of one
 *    strands the rest. A participle after it with no verb in front, because
 *    `Eile lõppenud filmifestivali peaauhind` is a prize described rather
 *    than a thing that happened yesterday. The verb ending up first, because
 *    Estonian opens a yes-or-no question that way and `Täna on väljas külm
 *    ilm` came back as `On väljas külm ilm täna`. The slot between `ei` and
 *    its verb, which are one form written in two words. The front of a
 *    clause that asks something, or of one after a comma, or of one opening
 *    on a focus particle, since a question word, a subordinator and a
 *    fronted `küll` are each first for a reason.
 *
 * **One direction only, and it was measured rather than argued.** A particle
 * the writer put at the end stays there, so `Ta pani raamatu ära` rebuilt as
 * `Ta pani ära raamatu` is correct Estonian this refuses. The obvious
 * objection is that the rule should be symmetric, and with the verb known the
 * reverse move looked safe for at least the free half, since nothing there can
 * be an adposition. It was tried and reverted on the reading: 218 reverse
 * moves over the shipped dictionary and the free ones are no better than the
 * bound ones, because **Estonian puts the subject after the verb** whenever
 * something else opens the clause, and the slot straight after the verb is
 * then inside the subject rather than in front of it. `Rahvatarkuse kohaselt
 * võtab maamuna tolm vere kinni` came back as `võtab kinni maamuna tolm vere`,
 * `Tihti on kiibistik koondatud integraallülituse sisse` as `on sisse
 * kiibistik koondatud`, and `Auto tagumine põrkeraud oli vasakult poolt pisut
 * katki` as `oli katki vasakult poolt pisut`. Forward, the particle lands at
 * the clause end, where nothing can be split. So the asymmetry is the shape of
 * the language rather than a gap: what the refusal costs is the marking a
 * learner already had, and accepting those would teach a sentence nobody
 * says.
 *
 * Pure and framework-free, like the rest of `lib/estonian/`. **It writes no
 * Estonian**: every word it names is an uninflected adverb or conjunction, so
 * the lemma is the spelling, each is a request rather than a fact, and
 * `wordOrder.test.ts` asks `prisma/data/forms/` about every one of them,
 * which is the accept list and the question it exists to answer.
 * Which tiles are finite verbs is not its judgment either: the caller hands
 * that in off the dictionary, the way the scene gate is handed its forms.
 */
import { ESTONIAN_WORD, sentenceMatches, sentenceTiles } from "./cloze";
import { finiteFormsFrom, participlesFrom } from "./conjugate";

/**
 * Verb particles that are never adpositions, so nothing governs a case around
 * them and moving one cannot break a phrase.
 *
 * Deliberately the short certain list rather than every adverb in the
 * language, which is the shape `DA_ONLY_VERBS` takes one directory over and
 * for the same reason: a list grown by widening until nothing complained would
 * accept an order somebody has to unlearn. `valmis` and `ringi` were tried and
 * left out, because `valmis maja` is an adjective in front of its noun and
 * `ringi` is also a form of `ring`.
 */
export const FREE_PARTICLES: readonly string[] = [
  "ära", "välja", "sisse", "üles", "maha", "kinni", "lahti", "katki",
  "kokku", "edasi", "laiali", "segi", "lõhki", "pooleks", "eemale", "kaasa",
];

/**
 * Verb particles that are also adpositions, so each moves only as a swap with
 * the one word that follows it.
 *
 * Every one of them is an ordinary postposition with the case it takes as a
 * preposition, which is what makes the swap safe rather than lucky. `alla` and
 * `üle` are the two left out on measurement rather than on principle: both
 * also mean "under" and "over" in front of a quantity, where `langeb alla
 * kümne kraadi` is not a particle verb at all.
 */
export const BOUND_PARTICLES: readonly string[] = [
  "ette", "läbi", "ümber", "mööda", "vastu", "juurde", "peale", "otsa",
  "külge", "kohale", "taha", "kõrvale", "eest", "järele", "tagasi", "täis",
];

export const PARTICLES: readonly string[] = [...FREE_PARTICLES, ...BOUND_PARTICLES];

/**
 * Adverbs that name a point in time and may stand anywhere in their clause.
 *
 * Reported by the native speaker this module was written for, in four
 * sentences that are the whole of the rule: `Ma loen raamatut täna`, `Ma loen
 * täna raamatut`, `Täna ma loen raamatut` and `Ma täna loen raamatut` are all
 * said, and the word is in a different place in each. A time adverb governs
 * nothing, heads no phrase and is not gradable, so nothing around it can be
 * stranded by moving it, which is what makes this decidable with no parser at
 * all where the adjacent swap of two ordinary nominals is not.
 *
 * **A point in time rather than a frequency or a degree**, and that is the
 * line the list is drawn on rather than a preference. `tihti`, `harva`,
 * `sageli`, `hilja` and `vara` all take a modifier in front of them, `väga
 * tihti` and `palju hiljem`, and moving one out of that pair strands the word
 * modifying it; you cannot say `väga täna`. `juba` and `veel` are focus
 * particles whose position is the thing they do, `siis` links clauses,
 * `vahel` is also a postposition and `veel` is also the alalütlev of `vesi`.
 * Every one of those is left out on a reason rather than on a feeling, which
 * is the shape `FREE_PARTICLES` takes above.
 *
 * `täna` is the imperative of `tänama` as well as the adverb, and that needs
 * no rule of its own: a clause where it is the verb has no other finite verb
 * in it, `finiteVerb` refuses a spelling with two readings, so the clause
 * fails the one-verb test and nothing moves.
 *
 * `kohe` was on this list and came off it on the reading, which is the only
 * way any of this is settled. It is a time in `Laps jäi kohe magama` and a
 * place in `Protsessori pesa on kohe toiteploki juures`, where it means right
 * beside the thing named after it, and nothing here can tell those apart: the
 * second came back as `Protsessori pesa on toiteploki juures kohe`, which is
 * about when rather than where. It costs four ordinary sentences their
 * alternatives, and a word with two senses is not a word this can move.
 */
export const MOBILE_ADVERBS: readonly string[] = [
  "täna", "homme", "eile", "üleeile", "ülehomme", "praegu", "nüüd", "varsti", "tänavu",
];

/**
 * The conjunctions that open a clause without a comma in front of them.
 *
 * Estonian writes a comma before `et`, `sest`, `kui`, `aga`, `kuid` and every
 * relative pronoun, always, which the course's own conjunctions unit says on
 * its front. These four are the ones it does not, so they are the only ones a
 * boundary read off punctuation alone would miss.
 */
export const CLAUSE_JOINERS: readonly string[] = ["ja", "ning", "või", "ehk"];

/**
 * The particles that lean on the word after them.
 *
 * `veel täna`, `juba eile`, `alles nüüd` and `just praegu` are one adverbial
 * each, and the particle is doing the work: take the time word out and what
 * is left is a particle attached to nothing. They are named here rather than
 * read off the dictionary because half of them are in no entry at all, which
 * is what let `alles nüüd` come apart while `veel täna` held.
 *
 * A request like every other list in this file, so the suite asks the accept
 * list whether each is a word.
 */
export const FOCUS_PARTICLES: readonly string[] = [
  "veel", "juba", "alles", "just", "ikka", "ainult", "isegi", "ometi", "küll",
];

/**
 * Every word either move can pick up.
 *
 * One list, because the reading of the dictionary is narrowed by it: a
 * sentence holding none of these has no alternative order whatever the
 * dictionary says about its verbs, so the app does not ask about its words.
 * That narrowing was written against `PARTICLES` when the particle was the
 * only thing that moved, and when the adverb arrived it was not widened, so
 * `Ma loen raamatut täna` contributed nothing to the query, the reading could
 * not tell which word was the verb, and the move was offered by the audit and
 * by nothing a learner could reach. The list and the narrowing live in one
 * file for that reason.
 */
export const MOVABLE_WORDS: readonly string[] = [...PARTICLES, ...MOBILE_ADVERBS];

const FREE = new Set(FREE_PARTICLES);
const BOUND = new Set(BOUND_PARTICLES);
const JOINERS = new Set(CLAUSE_JOINERS);
const MOBILE = new Set(MOBILE_ADVERBS);
const EITHER = new Set(PARTICLES);
const FOCUS = new Set(FOCUS_PARTICLES);
const NEGATORS = new Set(["ei", "ega"]);
const MOVABLE = new Set(MOVABLE_WORDS);

/** How the built order stands to the one a lexicographer recorded. */
export type OrderReading = "exact" | "variant" | "wrong";

export interface OrderVerdict {
  reading: OrderReading;
  /**
   * The word that sits somewhere else, spelled as the writer spelled it.
   * Null unless the reading is `variant`.
   *
   * At the first position the two orders differ, one of them holds the word
   * that moved and the other holds the word that shifted into its place, and
   * which is which is the direction it went. A word carried **rightward**
   * leaves the recording's word at that position, so the mover is the
   * recording's; a word brought **leftward** arrives there itself, so the
   * mover is the built order's. What tells them apart is the word after it:
   * on a rightward move everything behind has shifted one place forward, so
   * the built order holds at `i` what the recording holds at `i + 1`.
   *
   * Written without that reading it named `näpukaid` for the particle and
   * `Ma` for the adverb, which are the two words that did not move.
   */
  moved: string | null;
  /**
   * Where the writer had that word, relative to where the learner put it.
   *
   * The particle only ever travels one way, so `earlier` was written into the
   * sentence while it was the only move there was. A time adverb goes both
   * ways: somebody who rebuilds `Ma loen raamatut täna` as `Täna ma loen
   * raamatut` has moved the word **forward**, and telling them the writer put
   * it earlier is the one thing on that screen that is checkable and wrong.
   */
  writerPut: "earlier" | "later" | null;
}

/**
 * What the dictionary says about the words of a sentence.
 *
 * Two predicates rather than one, because the two questions are different and
 * both are load-bearing. `finiteVerb` is what anchors the particle, so it has
 * to mean a form carrying a person and a tense: `Ähvardas kõri läbi lõigata`
 * has its finite verb at the front, and `läbi` belongs to the infinitive at
 * the end. `participle` is what the particle may not be sent past.
 *
 * **A participle and not any verb form**, which is a correction to the first
 * version rather than a preference. Written as "any form of any verb" it
 * refused `Kunstnik annab oma nägemuse edasi`, `tahab anda saagalikkust
 * edasi` and `peab leppima järgmise aasta eelarves kokku`, which are all
 * ordinary Estonian: a particle goes past the infinitive it belongs to and
 * lands after its complement. What it may not go past is a participle, where
 * `on ära toodud ka statistilised andmed` does not survive `ära` reaching the
 * end. An intervening *finite* verb needs no rule of its own, since a clause
 * holding two is one this stands down on already.
 *
 * Predicates rather than sets so a caller hands in whatever it already holds
 * and this module cannot reach a database.
 */
export interface OrderContext {
  /**
   * A spelling the dictionary holds as a finite verb form **and as nothing
   * else**. The second half is the whole of it: `kaalu` is the genitive of
   * `kaal` and the imperative of `kaaluma`, so `kui maiasmokk kaalu peale
   * astus` reads as a verb followed by a particle and is a postpositional
   * phrase followed by its verb. It is `readCase`'s discipline one room over,
   * exactly one reading or no claim.
   */
  finiteVerb: (word: string) => boolean;
  /**
   * A spelling the dictionary holds as a participle **and as nothing else**,
   * on the same argument `finiteVerb` makes at length: `oma` is a participle
   * of nothing and a form of `omama`, and reading it as a verb refused a
   * correct sentence.
   */
  participle: (word: string) => boolean;
  /**
   * A spelling the dictionary holds and that is **not** doing adverbial work:
   * not an adverb, not a time case, not a focus particle, not a verb
   * particle.
   *
   * It is the guard on the adverb move and it is asked of the neighbours
   * rather than of the word itself. A time adverb is mobile because it is a
   * whole adverbial on its own, and half the ones in a real corpus are not:
   * `täna hommikul`, `eile õhtul`, `tänavu veebruaris`, `veel täna` and
   * `alles nüüd` are one expression each, so moving the first word of one
   * strands the rest of it. `Ärkasin täna hommikul kell 7` came back as
   * `Ärkasin hommikul kell täna`, which is the fault this exists to refuse.
   *
   * **It asks what the neighbour is rather than what it is not**, and that is
   * the whole of why it works. Written the other way, as "the dictionary does
   * not call this an adverb", it could only refuse a word the dictionary
   * holds: `alles` is in no entry here, so `alles nüüd` came apart while
   * `veel täna` did not, and the rule was really about which words somebody
   * had got round to adding. A neighbour this cannot place blocks the move,
   * so a thin dictionary offers fewer orders rather than wrong ones.
   *
   * The time cases are the half that has to be built: `hommikul` is not an
   * entry, it is `hommik` in the alalütlev, and `veebruaris` is `veebruar` in
   * the seesütlev. **It over-refuses and that is the right side**, since
   * nothing tells `täna hommikul`, which is a phrase, from `nüüd
   * Inglismaal`, which is not, and an order wrongly refused is one nobody was
   * offered while one wrongly accepted is a sentence a learner is taught.
   */
  plainWord: (word: string) => boolean;
}

/** An entry as this module needs to read it, which is every dictionary's shape. */
export interface OrderWord {
  readonly lemma: string;
  readonly pos: string;
  readonly forms: readonly { formType?: string | null; morphCode?: string | null; value: string }[];
}

/**
 * The reading of a dictionary this module works from.
 *
 * One resolver rather than one per caller, which is what `contextFromRows`
 * does for the scene gate and for the reason that file gives: a harness, a
 * lesson and an examination that each built their own would be three answers
 * to which words of a sentence are verbs, and the paper would be marked
 * against a different Estonian from the one it was set in.
 */
export function orderContextFrom(words: Iterable<OrderWord>): OrderContext {
  const finite = new Set<string>();
  const participles = new Set<string>();
  const nominal = new Set<string>();
  const known = new Set<string>();
  const adverbial = new Set<string>([...MOBILE, ...EITHER, ...FOCUS]);
  for (const word of words) {
    const spellings = [word.lemma, ...word.forms.map((f) => f.value)].map((v) => v.toLowerCase());
    if (word.pos === "VERB") {
      for (const v of participlesFrom(word.forms)) participles.add(v);
      for (const v of finiteFormsFrom(word.lemma, word.forms)) finite.add(v);
      for (const v of spellings) known.add(v);
      for (const v of finiteFormsFrom(word.lemma, word.forms)) known.add(v);
    } else {
      for (const v of spellings) nominal.add(v);
      for (const v of spellings) known.add(v);
      if (word.pos === "ADVERB") for (const v of spellings) adverbial.add(v);
      /*
        The alalütlev and the seesütlev, which are the two cases Estonian says
        a time in: `hommikul` and `esmaspäeval` take one, `veebruaris` and
        `mais` the other. Both are derived rather than stored, so neither is in
        any entry's form list and both are built here off the genitive, the way
        every other reader of a case builds one.

        The endings are a bare `l` and a bare `s`, which is what keeps this
        from reaching the cases beside them: `polikliinikusse` is an illative
        and `ajakirjast` an elative, and neither is a genitive stem with one
        letter on it.
      */
      for (const form of word.forms) {
        if (form.formType !== "GEN_SG" && form.formType !== "GEN_PL") continue;
        const stem = form.value.toLowerCase();
        adverbial.add(`${stem}l`);
        adverbial.add(`${stem}s`);
      }
    }
  }
  return {
    finiteVerb: (w) => {
      const lower = w.toLowerCase();
      return finite.has(lower) && !nominal.has(lower);
    },
    participle: (w) => {
      const lower = w.toLowerCase();
      return participles.has(lower) && !nominal.has(lower);
    },
    plainWord: (w) => {
      const lower = w.toLowerCase();
      return known.has(lower) && !adverbial.has(lower);
    },
  };
}

/**
 * The spellings a caller has to ask the dictionary about.
 *
 * Pure and here rather than in the reader, so it cannot fall behind the lists
 * it is narrowing by: it is every word of every sentence that holds something
 * either move can pick up, and nothing at all from the rest. A sentence with
 * none of them keeps its one order whatever any entry says, and asking about
 * its words is work for an answer already known. The examination is what
 * makes that worth doing rather than the lesson, since a paper is built from
 * a pool of 500 entries and rebuilt again to mark it.
 */
export function wordsWorthAsking(sentences: readonly string[]): string[] {
  const words = new Set<string>();
  for (const sentence of sentences) {
    const tokens = [...sentence.matchAll(ESTONIAN_WORD)].map((t) => t[0].toLowerCase());
    if (!tokens.some((t) => MOVABLE.has(t))) continue;
    for (const token of tokens) words.add(token);
  }
  return [...words];
}

/**
 * The tiles of a sentence, grouped by clause.
 *
 * `sentenceTiles` drops punctuation, so the grouping is read off the original
 * text. A comma is the boundary and the conjunctions are not, which is the
 * opposite of the first version of this and was settled by reading what it
 * accepted: `ja` joins two clauses in `Nad kõndisid edasi ja jõudsid järveni`
 * and two adjectives in `Mees nägi välja rõõsa ja ümarik`, and nothing here
 * can tell those apart. Both are answered instead by refusing a move that
 * would carry a particle past a joiner at all, which costs the rule a few
 * sentences and cannot be wrong about either.
 */
export function sentenceClauses(original: string): string[][] {
  const clauses: string[][] = [[]];
  let cursor = 0;
  for (const token of original.matchAll(ESTONIAN_WORD)) {
    const between = original.slice(cursor, token.index);
    if (/[,;:!?]/.test(between) && clauses[clauses.length - 1]!.length > 0) clauses.push([]);
    clauses[clauses.length - 1]!.push(token[0]);
    cursor = token.index + token[0].length;
  }
  return clauses.filter((c) => c.length > 0);
}

/**
 * A participle by its ending, for a verb the dictionary does not hold.
 *
 * `OrderContext.participle` is the real answer and stays the first one asked,
 * and it can only answer about a word the dictionary has an entry for. The
 * four sentences that got past it are the ordinary Estonian perfect on a verb
 * nobody has looked up: `Leib on ära hallitanud`, `Hobune on ära kärvanud`,
 * `Laudatäis lehmi on ära kõngenud`, `Esiratta pidur oli kinni kiilunud`. The
 * guard exists for exactly that shape and could not see one of them.
 *
 * So the ending is the backstop. `nud`, `tud` and `dud` are the past
 * participle and `mata` is the one the module's own header names, `lahti
 * kirjutamata akronüümide`, which no dictionary here holds either, so until
 * now the guard had never fired on the example justifying it. None of the
 * four is a case ending or a person ending, so a word carrying one is a
 * participle or it is nothing Estonian builds.
 *
 * **It over-refuses on purpose**, which is the trade `claimIndex` states one
 * directory over: a spelling wrongly read as a participle costs an
 * alternative order nobody was offered anyway, and one missed teaches a
 * learner that `Leib on hallitanud ära` is a sentence. It is a suffix rather
 * than a word, so this file still writes no Estonian.
 */
const PARTICIPLE_ENDINGS = ["nud", "tud", "dud", "mata"];

function looksLikeAParticiple(word: string): boolean {
  const lower = word.toLowerCase();
  return PARTICIPLE_ENDINGS.some((ending) => lower.length > ending.length && lower.endsWith(ending));
}

/**
 * Whether the segment after this one carries on the same clause.
 *
 * **A comma is a list separator as often as it is a clause boundary**, and
 * `sentenceClauses` cannot tell those apart because it reads punctuation and
 * nothing else. In `Sünnipäevapidu oli täis muusikat, naeratusi ja
 * õnnitlusi` the split leaves `Sünnipäevapidu oli täis muusikat`, which is a
 * whole clause to look at and is half of one: `täis` governs a list that
 * carries on past the comma. The swap inside it offered `oli muusikat täis
 * naeratusi ja õnnitlusi`, which strands the rest of the list behind the word
 * governing it, and it was the only thing the audit printed that nobody would
 * say.
 *
 * What tells the two apart is a finite verb, which the dictionary is already
 * handing in: a segment holding none is not a clause of its own, so the
 * segment before it does not end where the comma does and its last word is
 * not the end of anything.
 *
 * **It may only ever refuse.** Written the other way, as a fold that made the
 * two segments one clause, it moved the particle to the end of the *merged*
 * run, and that is worse than the fault it was fixing: the second clause of
 * `Kraadiklaas läks katki, elavhõbe voolas laiali` holds `voolas`, a simple
 * past no rule here derives, so the dictionary could not see the verb in it,
 * the two segments merged, and `katki` was carried across the comma into a
 * clause it has no business in. The rule is that nothing crosses a comma, and
 * a reading of what is on the other side of one can take an order away and
 * never add one.
 */
/**
 * Whether the segment before this one has already ended.
 *
 * `endsItsClause`'s twin, and needed only by the adverb move, which is the
 * one that can travel leftward: a particle only ever moves to the end of its
 * clause, so it can never cross the boundary on this side. A segment whose
 * predecessor holds no finite verb is a continuation of it, so its first
 * position is the middle of a clause rather than the start of one.
 */
function opensItsClause(segments: string[][], index: number, dict: OrderContext): boolean {
  const previous = segments[index - 1];
  if (!previous) return true;
  return previous.some((w) => dict.finiteVerb(w));
}

function endsItsClause(segments: string[][], index: number, dict: OrderContext): boolean {
  const next = segments[index + 1];
  if (!next) return true;
  return next.some((w) => dict.finiteVerb(w));
}

/**
 * Every order of this sentence the app is prepared to call Estonian, the
 * writer's own first.
 *
 * At most one particle moves. Two moving at once is not a shape any of this
 * was measured on, and a rule allowing several is one nobody can check by
 * reading a screen.
 *
 * **The whole of it was drawn by reading what it accepted** over the 9,464
 * sentences the shipped dictionary can set as this exercise, which is the only
 * way any of these conditions could have been arrived at. Each one is in the
 * list because taking it out accepts a sentence nobody says, and the run after
 * the last of them offers 40 alternative orders, every one of them Estonian.
 */
export function acceptedOrders(original: string, dict: OrderContext): string[][] {
  const clauses = sentenceClauses(original);
  /*
    A QUESTION OPENS ON ITS QUESTION WORD, so nothing may be put in front of
    one. `Kus sa praegu töötad?` came back as `Praegu kus sa töötad` and `Mida
    me täna teeme?` as `Täna mida me teeme`, and Estonian fronts an
    interrogative in both. The mark is read off the sentence rather than the
    word, because the interrogatives are a long list that inflects and the
    punctuation is one character that cannot be wrong about itself. It costs a
    declarative clause inside a sentence that also asks something, which is
    the safe side of a rule about where a word may go.
  */
  const asks = original.includes("?");
  const orders: string[][] = [clauses.flat()];

  clauses.forEach((clause, clauseIndex) => {
    /*
      ONE FINITE VERB, OR THE APP DOES NOT KNOW WHICH WORD IS THE VERB. Two
      candidates in one clause is a clause this cannot read, so it stands down
      rather than taking the first. The commoner shape of the same doubt is one
      spelling that is a verb and a noun at once, and `OrderContext.finiteVerb`
      is where that one is refused.
    */
    const verbs = clause.map((w, i) => (dict.finiteVerb(w) ? i : -1)).filter((i) => i >= 0);
    if (verbs.length !== 1) return;
    const verb = verbs[0]!;
    const offer = (moved: string[]) =>
      orders.push(clauses.flatMap((c, i) => (i === clauseIndex ? moved : c)));

    particleMove(clause, verb, clauses, clauseIndex, dict, offer);
    adverbMoves(clause, verb, clauses, clauseIndex, dict, asks, offer);
  });

  return orders;
}

/**
 * The particle directly after the verb, standing at the end of its clause.
 *
 * Rules 1 to 4 of this module's header, one move, in the one direction the
 * reading supports.
 */
function particleMove(
  clause: string[],
  verb: number,
  clauses: string[][],
  clauseIndex: number,
  dict: OrderContext,
  offer: (moved: string[]) => void,
): void {
  const at = verb + 1;
  const word = clause[at];
  if (word === undefined) return;
  const lower = word.toLowerCase();
  const free = FREE.has(lower);
  if (!free && !BOUND.has(lower)) return;

  const last = clause.length - 1;
  if (at === last) return; // already at the end: there is no move
  if (!free && at !== last - 1) return; // a swap of the last two, or nothing

  /*
    EVERY WORD THE PARTICLE IS CARRIED PAST, WHICH INCLUDES THE LAST ONE.
    Written as `slice(at + 1, last)` the guard read the words the particle
    passes *between* rather than the words it passes, and the one it left out
    is the word it ends up behind. That is the commonest shape there is:
    Estonian writes its perfect as the particle then the participle, so `Ei
    puudunud palju, et tuumasõda oleks lahti läinud` came back as `oleks
    läinud lahti` with the participle guard never asked about `läinud`. The
    guard exists for `on ära toodud ka statistilised andmed`, where the
    participle happens not to be last, and could not fire on the sentence
    shape it is actually about.
  */
  const over = clause.slice(at + 1);
  if (over.some((w) => JOINERS.has(w.toLowerCase()))) return; // never past a joiner
  if (over.some((w) => dict.participle(w) || looksLikeAParticiple(w))) return; // never past a participle
  if (!endsItsClause(clauses, clauseIndex, dict)) return; // the comma is a list, not an end

  offer([...clause.slice(0, at), ...clause.slice(at + 1), word]);
}

/**
 * A time adverb at either edge of its clause, or on either side of the verb.
 *
 * Those four positions are not a sample of where the word may stand, they are
 * the four the app can name without a parser, and they are exactly the four
 * the report gave: two edges, which need no reading of anything, and the two
 * slots the verb itself makes, which split no phrase because the verb is a
 * boundary on both sides. Any other position would have to be read off a
 * phrase this module cannot see, which is why `Ma loen huvitavat raamatut
 * täna` is never offered as `Ma loen huvitavat täna raamatut`.
 *
 * The clause has to be a whole one on both sides, where the particle move
 * asks only about the end: this is the move that can travel leftward, so the
 * comma before it matters as much as the comma after it.
 *
 * And the adverb is never put between the verb and a particle belonging to
 * it. `Ma panen kinni akna täna` is not offered as `Ma panen täna kinni
 * akna`: the other three positions say the same thing and none of them walks
 * into the middle of a particle verb.
 */
function adverbMoves(
  clause: string[],
  verb: number,
  clauses: string[][],
  clauseIndex: number,
  dict: OrderContext,
  asks: boolean,
  offer: (moved: string[]) => void,
): void {
  if (!opensItsClause(clauses, clauseIndex, dict)) return;
  if (!endsItsClause(clauses, clauseIndex, dict)) return;

  clause.forEach((word, at) => {
    if (at === verb) return;
    if (!MOBILE.has(word.toLowerCase())) return;
    /*
      A WHOLE ADVERBIAL ON ITS OWN, OR IT IS PART OF ONE. `täna hommikul`,
      `eile õhtul` and `veel täna` are each one expression, and taking the
      first word out of one leaves the rest of it stranded where the adverb
      used to be.
    */
    const before = clause[at - 1];
    const after = clause[at + 1];
    if (before !== undefined && !dict.plainWord(before)) return;
    if (after !== undefined && !dict.plainWord(after)) return;
    /*
      AND A PARTICIPLE AFTER IT IS AN ATTRIBUTE UNLESS THE VERB IS IN FRONT.
      `Eile lõppenud Berliini filmifestivali peaauhind` is a prize described
      as having ended yesterday, one phrase standing in front of its noun, and
      taking `eile` out of it leaves a sentence about nothing. What tells that
      from the ordinary perfect is the auxiliary: in `on tänavu võitnud` the
      finite verb is the word before the adverb, and in the attribute there is
      no finite verb in front of it at all.
    */
    if (after !== undefined && at !== verb + 1
      && (dict.participle(after) || looksLikeAParticiple(after))) return;

    const rest = [...clause.slice(0, at), ...clause.slice(at + 1)];
    const seat = at < verb ? verb - 1 : verb; // where the verb sits once the adverb is out
    const behindTheVerb = rest[seat + 1];
    for (const slot of [0, seat, seat + 1, rest.length]) {
      if (slot === at) continue; // the order the writer chose
      if (slot === 0 && asks) continue; // nothing stands in front of a question word
      /*
        And nothing is fronted inside a clause that follows a comma. What
        opens one is a subordinator, `et` or `kui` or `sest` or a relative
        pronoun, and every one of them has to come first: `Nõder sulg ei suuda
        kirjeldada, mis nüüd juhtus` came back as `kirjeldada nüüd mis juhtus`
        on a sentence with no question mark in it to read. The first clause of
        a sentence has nothing in front of it by definition.
      */
      if (slot === 0 && clauseIndex !== 0) continue;
      /*
        And nothing stands in front of a focus particle that opens the clause.
        `Küll sa oled täna tubli!` puts `küll` first to do exactly that, so
        `Täna küll sa oled tubli` takes the emphasis off the word carrying it.
      */
      if (slot === 0 && FOCUS.has((clause[0] ?? "").toLowerCase())) continue;
      if (slot === seat + 1 && behindTheVerb !== undefined
        && EITHER.has(behindTheVerb.toLowerCase())) continue;
      /*
        AND THE VERB DOES NOT END UP FIRST, unless the writer put it there.
        Estonian opens a yes-or-no question with the verb, so an adverb taken
        off the front of a clause it was the whole of leaves a statement
        reading as a question: `Täna on väljas külm ilm` came back as `On
        väljas külm ilm täna` and `Eile oli ilus ilm` as `Oli ilus ilm eile`,
        which are both questions and neither is the sentence. A clause the
        writer already opened with the verb keeps every position, since
        nothing about it changes.
      */
      if (slot !== 0 && seat === 0 && verb !== 0) continue;
      /*
        AND NOTHING GOES BETWEEN THE NEGATOR AND ITS VERB. `ei` and the verb
        after it are one form of the Estonian verb written in two words, so
        `Rühma töö tulemused ei kajastu kohe` came back as `ei kohe kajastu`
        and `Täna kirikut ei ole` as `kirikut ei täna ole`. `ära` is not on
        this footing and is deliberately absent: `Ära kohe vasta` is the
        sentence a lexicographer recorded.
      */
      if (slot === seat && NEGATORS.has((rest[seat - 1] ?? "").toLowerCase())) continue;
      offer([...rest.slice(0, slot), word, ...rest.slice(slot)]);
    }
  });
}

/**
 * How a built sentence stands to the recorded one.
 *
 * `exact` is the writer's own order and `variant` is another order Estonian
 * allows. Both are right. The alternatives are handed in rather than worked
 * out here, because the dictionary is what decides them and the three screens
 * that mark this exercise do their marking where there is none: the
 * examination rebuilds its paper to mark it and may not open a socket to do
 * it, and the lesson marks in the browser.
 */
export function readOrder(
  built: readonly string[],
  original: string,
  alsoRight: readonly string[],
): OrderVerdict {
  if (sentenceMatches(built, original)) return { reading: "exact", moved: null, writerPut: null };
  const target = sentenceTiles(original);
  const lowered = target.map((w) => w.toLowerCase());
  for (const order of alsoRight) {
    if (!sentenceMatches(built, order)) continue;
    const tiles = sentenceTiles(order);
    const at = tiles.findIndex((w, i) => w.toLowerCase() !== lowered[i]);
    if (at < 0) return { reading: "variant", moved: null, writerPut: null };
    /*
      The recording's word at that position and the built order's are the two
      candidates, and this module knows which words it moves, so it asks
      rather than infers. A swap of two neighbours is genuinely ambiguous from
      the positions alone, since `Ma loen raamatut täna` and `Ma loen täna
      raamatut` differ by `täna` going one place left or `raamatut` one place
      right, and only the list says which of those this offered.
    */
    const recorded = target[at];
    const wrote = tiles[at];
    const moves = (w: string | undefined) =>
      w !== undefined && (MOBILE.has(w.toLowerCase()) || EITHER.has(w.toLowerCase()));
    if (moves(recorded) !== moves(wrote)) {
      return moves(recorded)
        ? { reading: "variant", moved: recorded ?? null, writerPut: "earlier" }
        : { reading: "variant", moved: wrote ?? null, writerPut: "later" };
    }
    // Neither is a word this moves, or both are: read it off the shift instead.
    return wrote?.toLowerCase() === lowered[at + 1]
      ? { reading: "variant", moved: recorded ?? null, writerPut: "earlier" }
      : { reading: "variant", moved: wrote ?? null, writerPut: "later" };
  }
  return { reading: "wrong", moved: null, writerPut: null };
}

/** Whether the built order counts as right. A variant is never penalised. */
export function orderIsRight(reading: OrderReading): boolean {
  return reading !== "wrong";
}

/**
 * The alternative orders as a caller stores them beside the sentence.
 *
 * The writer's own order is dropped, since that is the sentence itself and
 * carrying it twice is a second copy of the answer for somebody to get wrong.
 */
export function alsoRightOrders(original: string, dict: OrderContext): string[] {
  // Deduplicated, because two words of one clause can reach the same order.
  return [...new Set(acceptedOrders(original, dict).slice(1).map((order) => order.join(" ")))];
}
