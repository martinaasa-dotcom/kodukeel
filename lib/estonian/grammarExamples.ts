import { CASE_NOTES, TOPIC_NOTES } from "./grammar";

/**
 * ONE ATTESTED SENTENCE PER CLAIM THE REFERENCE MAKES.
 *
 * `lib/estonian/grammar.ts` is English prose about Estonian and holds no
 * Estonian at all, which is what stops this app inventing a form inside a
 * sentence about forms. What that bought was a reference nobody could act on.
 * A learner opened the politeness page, read "the plural as a polite singular
 * with strangers", and had no way to find out what that looks like: three
 * abstractions in three boxes, and the one thing that would have taught it,
 * somebody saying it, was nowhere on the screen. It was reported from exactly
 * there, with the ask in one line: every one of these needs a very specific
 * example, and two would be better.
 *
 * The topic page's own header argued the other way, that there is no safe way
 * to illustrate the quotative because "picking sentences whose words end in
 * the right letters would be the app asserting a grammatical analysis it has
 * not verified, which is the same failure as generating a form, wearing a
 * different hat". That is right about a *suffix* and wrong about a *slot*.
 * `Tahaksin` is the conditional first person of `tahtma` because the
 * dictionary derives it from a stored first person that `npm run audit:verbs`
 * checked against Ekilex for all 797 verbs it holds, and `Peske` is the polite
 * imperative of `pesema` because the Institute recorded it. Naming a sentence
 * a lexicographer wrote and a form the dictionary vouches for is choosing, not
 * writing, which is the standing that `BeatSpec.lines` already has one module
 * over (ADR-005).
 *
 * So a pin is two strings and both are checked rather than trusted:
 *
 * 1. `et` is a sentence the shipped dictionary holds, character for character,
 *    and carries a shipped English line. `grammarExamples.test.ts` fails on one
 *    it cannot find, and the reader drops a sentence the live dictionary no
 *    longer holds rather than trusting the text here.
 * 2. `form` is a word of that sentence, and the screen marks it, so a reader
 *    is shown *where* in the line the point is. The test fails on a form the
 *    sentence does not contain.
 *
 * WHAT IS NOT PINNED SAYS SO. A point nothing in the corpus illustrates gets
 * no example rather than a stretched one: "Quotation marks are shaped
 * differently from English ones" is about a glyph, and a sentence carrying one
 * teaches nobody anything about it. `EXAMPLE_GAPS` carries the reason, in the
 * shape `lib/legal/exportCoverage.ts` takes for its exemptions, and the test
 * checks it for staleness both ways: a gap on a point that has since been
 * pinned fails, and so does a point that is in neither list. That is what stops
 * this becoming a list somebody appends a filename to in order to make a check
 * pass.
 */
export interface PinnedExample {
  /**
   * The entry the sentence is recorded under.
   *
   * Not always the word the point is about: `lib/dict/borrow.ts` already lends
   * one word's usages to another and this is the same thing by hand, so the
   * line showing the adessive of `laud` is filed where Ekilex filed it. It is
   * here because `Lexeme.examples` is a JSON column rather than a table, so a
   * screen looking a sentence up by its text would have to read the whole
   * dictionary; with the lemma it is one indexed `findMany`. The test asserts
   * the sentence really is one of that entry's usages, so it cannot rot into a
   * label nobody checks.
   */
  readonly lemma: string;
  /** The sentence exactly as a lexicographer recorded it. Never edited. */
  readonly et: string;
  /**
   * The one word in it that carries the point, marked on screen.
   *
   * A sentence with nothing marked is a sentence a reader has to scan for the
   * thing it was chosen for, and the whole reason this exists is that reading
   * the claim did not teach it.
   */
  readonly form: string;
  /**
   * The slot the marked word fills, where the dictionary can be asked.
   *
   * `CASE:INESSIVE` or `VERB:KndPrSg1`, checked by `readSlot` in
   * `scripts/lib/slotIndex.ts` against the forms the shipped dictionary holds
   * and the ones its own rules derive. A pin on a case page needs none, since
   * the page's own case is the claim; this is for a topic page, where the
   * point is a mood or a tense and nothing about the file says which.
   *
   * It is what stops the argument in the header rotting. Naming a form the
   * dictionary vouches for is choosing rather than writing, and that holds
   * only while somebody checks the vouching: without this, a later edit could
   * swap in a sentence whose "conditional" is an indicative and every test
   * here would still pass, because the sentence is attested and the word is in
   * it.
   *
   * Optional, because plenty of points are not about a slot at all. The
   * quotative and the converb are not stored on any entry, `ei` and `ära` do
   * not inflect, and a point about word order has no form to name. What is not
   * claimed is reported as unclaimed by `npm run audit:grammar-pins` rather
   * than passing quietly.
   */
  readonly slot?: string;
  /**
   * Whether somebody who speaks Estonian has read it against the point.
   *
   * Every mechanical check here is about the sentence: that the dictionary
   * holds it, that it carries English, that it is a sentence, that the marked
   * word is in it and really is the slot claimed. None of them can ask the
   * question that matters most, which is whether the sentence *illustrates*
   * the claim it is filed under. That is a person, and it is the standing
   * `lib/scenes/bank.ts` already states about its own lines.
   *
   * False on all of them, which is the truth. A reviewer flips them one at a
   * time; nothing on screen reads it, because a learner is shown an attested
   * sentence either way and a chip saying "nobody has checked this" would be
   * the app doubting itself in front of the person it is teaching.
   */
  readonly reviewed: boolean;
}

/** Pins for a topic page, keyed by the point's own text. */
export type PointPins = Readonly<Record<string, readonly PinnedExample[]>>;

/**
 * Keyed by topic id, then by the point exactly as `TOPIC_NOTES` words it.
 *
 * By the text rather than by the index, because an index follows a reorder and
 * a point does not: moving one line of `points` would silently hand its
 * examples to its neighbour, which is the one failure nothing on screen would
 * show. The test fails on a key that matches no point.
 */
export const TOPIC_EXAMPLES: Readonly<Record<string, PointPins>> = {
  olema: {
    "The one verb you cannot avoid, and one of the few irregular ones": [
      { lemma: "sünnipäev", et: "Mul on täna sünnipäev.", form: "on", slot: "VERB:IndPrSg3", reviewed: false },
      { lemma: "väga", et: "Te olete väga sarnased.", form: "olete", slot: "VERB:IndPrPl2", reviewed: false },
    ],
    "Having something is said as it being at you, with -l": [
      { lemma: "oma", et: "Mul on oma maja.", form: "Mul", slot: "CASE:ADESSIVE", reviewed: false },
      { lemma: "perekond", et: "Tal on suur perekond.", form: "Tal", slot: "CASE:ADESSIVE", reviewed: false },
    ],
    "Feelings, needs and obligations run on the same pattern": [
      { lemma: "uni", et: "Mul on kange uni.", form: "Mul", slot: "CASE:ADESSIVE", reviewed: false },
      { lemma: "isu", et: "Tal on hea isu.", form: "Tal", slot: "CASE:ADESSIVE", reviewed: false },
    ],
  },
  "present-tense": {
    "Six person endings on a stem": [
      { lemma: "alustama", et: "Alustame tööd esmaspäeval.", form: "Alustame", slot: "VERB:IndPrPl1", reviewed: false },
      { lemma: "nädalavahetus", et: "Mida te nädalavahetusel teete?", form: "teete", slot: "VERB:IndPrPl2", reviewed: false },
    ],
    "Covers both English presents at once": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "sööb", slot: "VERB:IndPrSg3", reviewed: false },
      { lemma: "magama", et: "Karu magab talveund.", form: "magab", slot: "VERB:IndPrSg3", reviewed: false },
    ],
    "Does the future as well, since there is no future tense": [
      { lemma: "toimuma", et: "Kontsert toimub homme.", form: "toimub", slot: "VERB:IndPrSg3", reviewed: false },
      { lemma: "esindaja", et: "Kahe riigi esindajad kohtuvad homme.", form: "kohtuvad", slot: "VERB:IndPrPl3", reviewed: false },
    ],
  },
  negation: {
    "The verb goes back to a bare stem": [
      { lemma: "aeg", et: "Aeg ei peatu.", form: "peatu", slot: "VERB:IndPrPs_", reviewed: false },
      { lemma: "leidma", et: "Ma ei leia oma rahakotti.", form: "leia", slot: "VERB:IndPrPs_", reviewed: false },
    ],
    "One word covers every person, unlike do not and does not": [
      { lemma: "juuksur", et: "Mulle ei meeldi juuksuris käia.", form: "ei", reviewed: false },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "ei", reviewed: false },
    ],
    "The past is negated differently from the present": [
      { lemma: "isa", et: "Isa ja ema ei olnud kodus.", form: "olnud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "juhuslik", et: "Koha valik polnud juhuslik.", form: "polnud", reviewed: false },
    ],
  },
  imperfect: {
    "Built on the second infinitive's stem, with -si- after it": [
      { lemma: "meri", et: "Käisin meres ujumas.", form: "Käisin", slot: "VERB:IndIpfSg1", reviewed: false },
      { lemma: "mets", et: "Eksisin metsa ära.", form: "Eksisin", slot: "VERB:IndIpfSg1", reviewed: false },
    ],
    "A short list of common verbs takes -i- instead": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "Jõin", slot: "VERB:IndIpfSg1", reviewed: false },
      { lemma: "kala", et: "Kala ujus sügavamale.", form: "ujus", slot: "VERB:IndIpfSg3", reviewed: false },
    ],
    "Used for completed events, however recent": [
      { lemma: "jooma", et: "Jõin tassi kohvi.", form: "Jõin", slot: "VERB:IndIpfSg1", reviewed: false },
      { lemma: "algus", et: "Ootasime kontserdi algust.", form: "Ootasime", reviewed: false },
    ],
  },
  perfect: {
    "Built from to be, never from to have": [
      { lemma: "kiirabi", et: "Mare on aastaid kiirabis töötanud.", form: "on", slot: "VERB:IndPrSg3", reviewed: false },
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "on", slot: "VERB:IndPrSg3", reviewed: false },
    ],
    "Used where the result matters more than the event": [
      { lemma: "sügis", et: "Värviline sügis on kätte jõudnud.", form: "jõudnud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "käärid", et: "Käärid on nüriks läinud.", form: "läinud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
    "The participle never changes for person": [
      { lemma: "eestikeelne", et: "Ta on saanud eestikeelse hariduse.", form: "saanud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "traditsioon", et: "Laulupeod on Eestis traditsiooniks saanud.", form: "saanud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
  },
  pluperfect: {
    "An event finished before another past event": [
      { lemma: "vistrik", et: "Näkku oli tekkinud uus vistrik.", form: "oli", slot: "VERB:IndIpfSg3", reviewed: false },
      { lemma: "isand", et: "Kohale olid tulnud tähtsad vaimulikud isandad.", form: "olid", reviewed: false },
    ],
    "Common in stories and in reported speech": [
      { lemma: "seen", et: "Nikolai oli läinud hommikul metsa seenele ja polnud õhtuks tagasi jõudnud.", form: "oli", slot: "VERB:IndIpfSg3", reviewed: false },
      { lemma: "süüdlane", et: "Politsei oli saanud mitu vihjet võimalike süüdlaste kohta.", form: "oli", slot: "VERB:IndIpfSg3", reviewed: false },
    ],
    "Uses exactly the participle the perfect uses": [
      { lemma: "nõges", et: "Risuhunnik oli nõgestesse kasvanud.", form: "kasvanud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "kasvanud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
  },
  conditional: {
    "Hypotheticals and their consequences": [
      { lemma: "elukoht", et: "Hea, kui elukoht asuks töökoha lähedal.", form: "asuks", slot: "VERB:KndPrPs", reviewed: false },
      { lemma: "kündma", et: "Kui oleksin maal edasi, künnaksin traktoriga põldu.", form: "oleksin", slot: "VERB:KndPrSg1", reviewed: false },
    ],
    "Softening a request so a stranger does not find it blunt": [
      { lemma: "paluma", et: "Ma tahaksin sinult midagi paluda.", form: "tahaksin", slot: "VERB:KndPrSg1", reviewed: false },
      { lemma: "külmik", et: "Tahaksin vana külmiku tasuta ära anda.", form: "Tahaksin", slot: "VERB:KndPrSg1", reviewed: false },
    ],
    "Giving advice without issuing an order": [
      { lemma: "hambaarst", et: "Kui hammas valutab, siis peaksid hambaarsti juurde minema.", form: "peaksid", slot: "VERB:KndPrSg2", reviewed: false },
      { lemma: "arutama", et: "Neid probleeme tuleks koosolekul arutada.", form: "tuleks", slot: "VERB:KndPrPs", reviewed: false },
    ],
  },
  imperative: {
    "Separate singular and plural forms, unlike English": [
      { lemma: "istuma", et: "Istu minu kõrvale.", form: "Istu", slot: "VERB:ImpPrSg2", reviewed: false },
      { lemma: "puhas", et: "Peske käed puhtaks.", form: "Peske", slot: "VERB:ImpPrPl2", reviewed: false },
    ],
    "The plural doubles as the polite form for one person": [
      { lemma: "tualett", et: "Palun öelge, kus siin tualett on.", form: "öelge", slot: "VERB:ImpPrPl2", reviewed: false },
      { lemma: "saatma", et: "Saatke mulle takso.", form: "Saatke", slot: "VERB:ImpPrPl2", reviewed: false },
    ],
    "Negated with its own word": [
      { lemma: "vaatama", et: "Ära otse päikesesse vaata!", form: "Ära", reviewed: false },
      { lemma: "rumal", et: "Ära ole rumal!", form: "Ära", reviewed: false },
    ],
  },
  impersonal: {
    "Notices, instructions, official prose and news": [
      { lemma: "magustoit", et: "Dessertveini serveeritakse koos magustoiduga.", form: "serveeritakse", reviewed: false },
      { lemma: "kontrollima", et: "Doonoril kontrollitakse vererõhku.", form: "kontrollitakse", reviewed: false },
    ],
    "Says people did something, without saying which people": [
      { lemma: "nimetama", et: "Kuidas seda asutust nimetatakse?", form: "nimetatakse", reviewed: false },
      { lemma: "hobi", et: "Ratsutamist peetakse kulukaks hobiks.", form: "peetakse", reviewed: false },
    ],
  },
  "past-participle": {
    "Combines with to be for have done and had done": [
      { lemma: "vale", et: "Oled elanud vales.", form: "elanud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "jutt", et: "Meil pole sellest juttu olnud.", form: "olnud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
    "Describes a noun as having done something": [
      { lemma: "vihik", et: "Ilmunud vihik tegi luuletajale palju rõõmu.", form: "Ilmunud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
    "Has an impersonal twin for things done to something": [
      { lemma: "kook", et: "Vanaema küpsetatud kook.", form: "küpsetatud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "pilt", et: "Laste joonistatud pildid.", form: "joonistatud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
  },
  participles: {
    "Used to describe a noun the way an adjective would": [
      { lemma: "mobiiltelefon", et: "Mobiiltelefoniga tehtud fotod.", form: "tehtud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "masin", et: "Masinal kootud vaip.", form: "kootud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
    "Carry the perfect and pluperfect with the auxiliary": [
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "kasvanud", slot: "VERB:PtsPtPs", reviewed: false },
      { lemma: "vistrik", et: "Näkku oli tekkinud uus vistrik.", form: "tekkinud", slot: "VERB:PtsPtPs", reviewed: false },
    ],
  },
  politeness: {
    "The plural as a polite singular with strangers": [
      { lemma: "kohv", et: "Kas te soovite teed või kohvi?", form: "soovite", slot: "VERB:IndPrPl2", reviewed: false },
      { lemma: "või", et: "Kas te maksate sularahas või ülekandega?", form: "maksate", slot: "VERB:IndPrPl2", reviewed: false },
    ],
    "The conditional to soften a request": [
      { lemma: "paluma", et: "Ma tahaksin sinult midagi paluda.", form: "tahaksin", slot: "VERB:KndPrSg1", reviewed: false },
      { lemma: "külmik", et: "Tahaksin vana külmiku tasuta ära anda.", form: "Tahaksin", slot: "VERB:KndPrSg1", reviewed: false },
    ],
    "Directness is less rude here than English speakers expect": [
      { lemma: "tualett", et: "Palun öelge, kus siin tualett on.", form: "öelge", slot: "VERB:ImpPrPl2", reviewed: false },
      { lemma: "saatma", et: "Saatke mulle takso.", form: "Saatke", slot: "VERB:ImpPrPl2", reviewed: false },
    ],
  },
  "time-expressions": {
    "Days, seasons and years take -l; months take -s": [
      { lemma: "teisipäev", et: "Koosolek toimub teisipäeval.", form: "teisipäeval", slot: "CASE:ADESSIVE", reviewed: false },
      { lemma: "juuli", et: "Lähen juulis puhkusele.", form: "juulis", slot: "CASE:INESSIVE", reviewed: false },
    ],
    "Duration is expressed differently again": [
      { lemma: "kirurg", et: "Kirurg tegi päeva jooksul kolm operatsiooni.", form: "jooksul", slot: "CASE:ADESSIVE", reviewed: false },
      { lemma: "kestma", et: "Film kestis kaks tundi.", form: "tundi", slot: "CASE:PARTITIVE", reviewed: false },
    ],
    "From and until each have their own ending": [
      { lemma: "esmaspäev", et: "Käin tööl esmaspäevast reedeni.", form: "esmaspäevast", slot: "CASE:ELATIVE", reviewed: false },
      { lemma: "pääsuke", et: "Pääsuke laulab aprillist augustini.", form: "augustini", slot: "CASE:TERMINATIVE", reviewed: false },
    ],
  },
  aspect: {
    "A finished action takes a whole object": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto", slot: "CASE:GENITIVE", reviewed: false },
      { lemma: "taldrik", et: "Sõin taldriku tühjaks.", form: "taldriku", slot: "CASE:GENITIVE", reviewed: false },
    ],
    "An unfinished or partial one takes the partitive": [
      { lemma: "tort", et: "Sõin tüki torti.", form: "torti", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett", slot: "CASE:PARTITIVE", reviewed: false },
    ],
    "Particles reinforce completion": [
      { lemma: "kartul", et: "Palun koori kartulid ära.", form: "ära", reviewed: false },
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", form: "otsa", reviewed: false },
    ],
  },
  infinitives: {
    "The -ma one follows starting, going and having to": [
      { lemma: "kook", et: "Ema hakkab kooki küpsetama.", form: "küpsetama", slot: "VERB:Sup", reviewed: false },
      { lemma: "orkester", et: "Orkester hakkas mängima.", form: "mängima", slot: "VERB:Sup", reviewed: false },
    ],
    "The -da one follows wanting and being able": [
      { lemma: "valuuta", et: "Kus saab valuutat vahetada?", form: "vahetada", slot: "VERB:Inf", reviewed: false },
      { lemma: "võima", et: "Ma võin jälle kõndida!", form: "kõndida", slot: "VERB:Inf", reviewed: false },
    ],
  },
  "particle-verbs": {
    "The particle usually adds completion or direction": [
      { lemma: "veekeetja", et: "Lülita veekeetja sisse.", form: "sisse", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "tõmbama", et: "Tõmba uks kinni.", form: "kinni", reviewed: false },
    ],
    "Often the difference between doing and finishing": [
      { lemma: "lamp", et: "Lamp põles läbi.", form: "läbi", reviewed: false },
      { lemma: "talu", et: "Talu põles maha.", form: "maha", slot: "CASE:ILLATIVE", reviewed: false },
    ],
    "It moves around the sentence rather than staying put": [
      { lemma: "televiisor", et: "Pane televiisor kinni.", form: "kinni", reviewed: false },
      { lemma: "kraan", et: "Keerasin kraani kinni.", form: "kinni", reviewed: false },
    ],
  },
  converb: {
    "Two simultaneous actions without a conjunction": [
      { lemma: "ige", et: "Naerdes paljastusid laiad esihambad ja igemed.", form: "Naerdes", reviewed: false },
      { lemma: "tatt", et: "Mees köhib tatti pritsides.", form: "pritsides", reviewed: false },
    ],
    "Strongly preferred in writing over two joined clauses": [
      { lemma: "pidur", et: "Peo edenedes pidurid kadusid.", form: "edenedes", reviewed: false },
    ],
    "Its subject is understood to be the main clause's": [
      { lemma: "viibima", et: "Ta kuulis juhtunust puhkusel viibides.", form: "viibides", reviewed: false },
      { lemma: "üllatuma", et: "Ta oli auhinnast kuuldes rõõmsalt üllatunud.", form: "kuuldes", reviewed: false },
    ],
  },
  quotative: {
    "Reported speech, rumor and hearsay": [
      { lemma: "tammetõru", et: "Tammetõrude rohkus ennustavat karmi talve.", form: "ennustavat", reviewed: false },
      { lemma: "aus", et: "Aus ülestunnistus pidavat karistust kergendama.", form: "pidavat", reviewed: false },
    ],
    "Can carry doubt, depending on delivery": [
      { lemma: "väitma", et: "Mees väidab end mitte teadvat, kuhu ta auto jättis.", form: "teadvat", reviewed: false },
    ],
  },
  numerals: {
    "After two and up, the counted noun is partitive singular": [
      { lemma: "pirn", et: "Aias kasvab kolm pirni.", form: "pirni", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "pudel", et: "Ostsin kaks pudelit vett.", form: "pudelit", slot: "CASE:PARTITIVE", reviewed: false },
    ],
    "Numbers themselves decline when the phrase is in a case": [
      { lemma: "minut", et: "Buss tuleb viie minuti pärast.", form: "viie", slot: "CASE:GENITIVE", reviewed: false },
      { lemma: "broneerima", et: "Broneerisin laua kahele.", form: "kahele", slot: "CASE:ALLATIVE", reviewed: false },
    ],
    "Ordinals are regular and decline too": [
      { lemma: "baar", et: "Hotelli baar asub esimesel korrusel.", form: "esimesel", slot: "CASE:ADESSIVE", reviewed: false },
      { lemma: "lennuk", et: "Laps sõidab lennukiga esimest korda.", form: "esimest", slot: "CASE:PARTITIVE", reviewed: false },
    ],
  },
  derivation: {
    "An action noun from any verb, entirely regular": [
      { lemma: "võõras", et: "Vabandamine on talle võõras.", form: "Vabandamine", reviewed: false },
    ],
    "Adjectives meaning like it, and meaning without it": [
      { lemma: "idee", et: "Toetan demokraatlikke ideid.", form: "demokraatlikke", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "abikaasa", et: "Abikaasad on võrdõiguslikud.", form: "võrdõiguslikud", reviewed: false },
    ],
    "A quality noun from an adjective": [
      { lemma: "sõprus", et: "Meid seob ammune sõprus.", form: "sõprus", slot: "CASE:NOMINATIVE", reviewed: false },
      { lemma: "rikkus", et: "Ega rikkus pole häbiasi.", form: "rikkus", slot: "CASE:NOMINATIVE", reviewed: false },
    ],
  },
  "word-order": {
    "Endings mark who did what, so order is free for other work": [
      { lemma: "talv", et: "Talvel sadas palju lund.", form: "Talvel", slot: "CASE:ADESSIVE", reviewed: false },
      { lemma: "toimuma", et: "Eile toimus mitu õnnetust.", form: "Eile", reviewed: false },
    ],
    "The verb tends to sit second in a main clause": [
      { lemma: "alustama", et: "Homme alustan dieeti.", form: "alustan", slot: "VERB:IndPrSg1", reviewed: false },
      { lemma: "kütma", et: "Õhtul kütan sauna.", form: "kütan", slot: "VERB:IndPrSg1", reviewed: false },
    ],
  },
  idiom: {
    "Sayings still in daily use": [
      { lemma: "ilu", et: "Ilu peitub vaataja silmades.", form: "silmades", slot: "CASE:INESSIVE", reviewed: false },
      { lemma: "põhimõte", et: "Lähtusin põhimõttest, et topelt ei kärise.", form: "kärise", reviewed: false },
    ],
    "Fixed verb phrases that resist a literal reading": [
      { lemma: "tööline", et: "Häid töölisi otsitakse tikutulega taga.", form: "tikutulega", reviewed: false },
      { lemma: "naer", et: "Olime kõik naerust kõveras.", form: "kõveras", reviewed: false },
    ],
    "Figurative senses of ordinary words": [
      { lemma: "suvi", et: "Suvi on käes.", form: "käes", slot: "CASE:INESSIVE", reviewed: false },
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", form: "otsa", reviewed: false },
    ],
  },
  "adjective-agreement": {
    "Same case and same number as the noun": [
      { lemma: "liha", et: "Ostsin turult värsket liha.", form: "värsket", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "rasvast", reviewed: false },
    ],
    "For -ni, -na, -ta and -ga the adjective stops at the genitive": [
      { lemma: "aeglane", et: "Aeglase vooluga jõgi.", form: "Aeglase", slot: "CASE:GENITIVE", reviewed: false },
      { lemma: "lõpp", et: "Õnneliku lõpuga film.", form: "Õnneliku", slot: "CASE:GENITIVE", reviewed: false },
    ],
  },
  comparative: {
    "Built on the genitive stem, like nearly everything": [
      { lemma: "väike", et: "Anna väiksem lusikas!", form: "väiksem", reviewed: false },
      { lemma: "palk", et: "Eesti keskmine palk on suurem kui Lätis.", form: "suurem", reviewed: false },
    ],
    "Say than and use the plain form, or drop than and use -st": [
      { lemma: "diisel", et: "Bensiin on kallim kui diisel.", form: "kui", reviewed: false },
      { lemma: "oluliselt", et: "Ta on oma abikaasast oluliselt noorem.", form: "abikaasast", slot: "CASE:ELATIVE", reviewed: false },
    ],
    "A handful of common adjectives are irregular": [
      { lemma: "parem", et: "Kumb auto on parem?", form: "parem", slot: "CASE:NOMINATIVE", reviewed: false },
      { lemma: "palju", et: "Täna on enesetunne palju parem.", form: "parem", slot: "CASE:NOMINATIVE", reviewed: false },
    ],
  },
  superlative: {
    "A helper word plus the comparative, which always works": [
      { lemma: "veebruar", et: "Veebruar on tavaliselt aasta kõige külmem kuu.", form: "kõige", slot: "CASE:GENITIVE", reviewed: false },
      { lemma: "ingel", et: "Sa oled mu ingel, mu kõige kallim!", form: "kõige", slot: "CASE:GENITIVE", reviewed: false },
    ],
    "A one-word form, shorter and more literary": [
      { lemma: "linn", et: "Tallinn on Eesti suurim linn.", form: "suurim", reviewed: false },
      { lemma: "sõbranna", et: "Kaisa on minu parim sõbranna.", form: "parim", reviewed: false },
    ],
  },
  future: {
    "A time expression is what makes a sentence future": [
      { lemma: "toimuma", et: "Kontsert toimub homme.", form: "homme", reviewed: false },
      { lemma: "abielupaar", et: "Nendest saab varsti abielupaar.", form: "varsti", reviewed: false },
    ],
    "Verbs of planning and intending carry the rest": [
      { lemma: "kook", et: "Ema hakkab kooki küpsetama.", form: "hakkab", slot: "VERB:IndPrSg3", reviewed: false },
      { lemma: "koguma", et: "Kogun raha, et uut autot osta.", form: "Kogun", slot: "VERB:IndPrSg1", reviewed: false },
    ],
    "A particle can imply something is going to finish": [
      { lemma: "kütus", et: "Autol hakkab kütus otsa saama.", form: "otsa", reviewed: false },
      { lemma: "pastakas", et: "Pastakas hakkab tühjaks saama.", form: "tühjaks", slot: "CASE:TRANSLATIVE", reviewed: false },
    ],
  },
  object: {
    "A finished action on a whole thing: genitive or plain form": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto", slot: "CASE:GENITIVE", reviewed: false },
      { lemma: "panema", et: "Pane raamat lauale.", form: "raamat", slot: "CASE:NOMINATIVE", reviewed: false },
    ],
    "Unfinished, or only part of it: partitive": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "banaani", slot: "CASE:PARTITIVE", reviewed: false },
    ],
    "Anything negated: partitive, always": [
      { lemma: "ulme", et: "Ma ei loe ulmet.", form: "ulmet", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "sealiha", slot: "CASE:PARTITIVE", reviewed: false },
    ],
  },
  "reported-speech": {
    "A conjunction plus a clause, closest to English": [
      { lemma: "imelik", et: "Imelik, et teda kodus pole.", form: "et", reviewed: false },
      { lemma: "elus", et: "Ma olin viimane, kes teda elusana nägi.", form: "kes", slot: "CASE:NOMINATIVE", reviewed: false },
    ],
    "Or the quotative, which needs no reporting verb": [
      { lemma: "tammetõru", et: "Tammetõrude rohkus ennustavat karmi talve.", form: "ennustavat", reviewed: false },
    ],
  },
  concession: {
    "Adverbs that carry it across a full stop": [
      { lemma: "kokkuvõttes", et: "Esinemine oli kokkuvõttes siiski rahuldav.", form: "siiski", reviewed: false },
      { lemma: "kõhklema", et: "Mari kõhkles hetke, ent siis otsustas teistega kaasa minna.", form: "ent", reviewed: false },
    ],
  },
  hedging: {
    "Adverbs and adjectives of likelihood": [
      { lemma: "vist", et: "Ema vist magab juba.", form: "vist", reviewed: false },
      { lemma: "vist", et: "Hakkab vist sadama.", form: "vist", reviewed: false },
    ],
    "The quotative, which puts the claim on somebody else": [
      { lemma: "aus", et: "Aus ülestunnistus pidavat karistust kergendama.", form: "pidavat", reviewed: false },
    ],
    "The conditional, which softens a claim as well as a request": [
      { lemma: "elukoht", et: "Hea, kui elukoht asuks töökoha lähedal.", form: "asuks", slot: "VERB:KndPrPs", reviewed: false },
      { lemma: "arutama", et: "Neid probleeme tuleks koosolekul arutada.", form: "tuleks", slot: "VERB:KndPrPs", reviewed: false },
    ],
  },
  cohesion: {
    "Contrast and consequence": [
      { lemma: "tõsi", et: "Kurb, aga tõsi.", form: "aga", reviewed: false },
      { lemma: "välk", et: "Müristab, aga välku ei löö.", form: "aga", reviewed: false },
    ],
    "Ordering and adding: first, also, finally": [
      { lemma: "pühak", et: "Patukotist sai lõpuks pühak.", form: "lõpuks", slot: "CASE:TRANSLATIVE", reviewed: false },
      { lemma: "lehtpuu", et: "Leiliruumi lagi ja seinad, samuti lava on lehtpuust.", form: "samuti", reviewed: false },
    ],
    "Referring back without repeating the noun": [
      { lemma: "kiikuma", et: "Kiikusin toolil ja see läks katki.", form: "see", slot: "CASE:NOMINATIVE", reviewed: false },
      { lemma: "petma", et: "Ära usu Jaani, ta petab.", form: "ta", reviewed: false },
    ],
  },
  emphasis: {
    "Small particles that mark the focus": [
      { lemma: "kuulama", et: "Kuulake mind ka!", form: "ka", reviewed: false },
      { lemma: "leib", et: "Määri leivale võid ka.", form: "ka", reviewed: false },
    ],
  },
  "rhetorical-questions": {
    "A particle marks a genuine yes or no question": [
      { lemma: "kohv", et: "Kas te soovite teed või kohvi?", form: "Kas", reviewed: false },
      { lemma: "vann", et: "Kas täna vanni teeme?", form: "Kas", reviewed: false },
    ],
  },
  subordination: {
    "Word order shifts inside the clause": [
      { lemma: "firma", et: "Töötan firmas, mis toodab autode varuosi.", form: "mis", slot: "CASE:NOMINATIVE", reviewed: false },
    ],
  },
  "relative-clause": {
    "Always separated by a comma": [
      { lemma: "puu", et: "Metsas on kohti, kus puud ei kasva.", form: "kus", reviewed: false },
      { lemma: "ettevõte", et: "Töötan ettevõttes, mis tegeleb autode remondiga.", form: "mis", slot: "CASE:NOMINATIVE", reviewed: false },
    ],
    "Different pronouns for people and for things": [
      { lemma: "elus", et: "Ma olin viimane, kes teda elusana nägi.", form: "kes", slot: "CASE:NOMINATIVE", reviewed: false },
      { lemma: "teadus", et: "Bioloogia on teadus, mis uurib elu.", form: "mis", slot: "CASE:NOMINATIVE", reviewed: false },
    ],
    "Its case is decided inside the relative clause": [
      { lemma: "režissöör", et: "Ta on hea režissöör, kelle filme tasub vaadata.", form: "kelle", slot: "CASE:GENITIVE", reviewed: false },
      { lemma: "nimekiri", et: "Tegin nimekirja asjadest, mida poest tuua.", form: "mida", slot: "CASE:PARTITIVE", reviewed: false },
    ],
  },
  government: {
    "The required case is a fact about the verb": [
      { lemma: "uskuma", et: "Ta usub Jumalasse.", form: "Jumalasse", slot: "CASE:ILLATIVE", reviewed: false },
      { lemma: "pall", et: "Laps mängib palliga.", form: "palliga", slot: "CASE:COMITATIVE", reviewed: false },
    ],
    "Helping, calling, liking and thinking are the traps": [
      { lemma: "juuksur", et: "Mulle ei meeldi juuksuris käia.", form: "Mulle", slot: "CASE:ALLATIVE", reviewed: false },
      { lemma: "mõtlema", et: "Millest sa mõtled?", form: "Millest", slot: "CASE:ELATIVE", reviewed: false },
    ],
  },
};

/** The same, keyed by case key, then by the use as `CASE_NOTES` words it. */
export const CASE_EXAMPLES: Readonly<Record<string, PointPins>> = {
  NOMINATIVE: {
    "Who or what is doing the verb": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "Ahv", reviewed: false },
      { lemma: "magama", et: "Karu magab talveund.", form: "Karu", reviewed: false },
    ],
    "A whole object, in the plural or after a command": [
      { lemma: "panema", et: "Pane raamat lauale.", form: "raamat", reviewed: false },
      { lemma: "kartul", et: "Palun koori kartulid ära.", form: "kartulid", reviewed: false },
    ],
  },
  GENITIVE: {
    "Saying whose something is": [
      { lemma: "uus", et: "Uue filmi esilinastus.", form: "filmi", reviewed: false },
      { lemma: "klient", et: "Rahulolev klient on iga firma unistus.", form: "firma", reviewed: false },
    ],
    "A finished, whole object": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto", slot: "CASE:GENITIVE", reviewed: false },
      { lemma: "taldrik", et: "Sõin taldriku tühjaks.", form: "taldriku", reviewed: false },
    ],
  },
  PARTITIVE: {
    "Some of a thing rather than all of it": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett", reviewed: false },
      { lemma: "tort", et: "Sõin tüki torti.", form: "torti", slot: "CASE:PARTITIVE", reviewed: false },
    ],
    "An action still going on": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "banaani", slot: "CASE:PARTITIVE", reviewed: false },
      { lemma: "algus", et: "Ootasime kontserdi algust.", form: "algust", reviewed: false },
    ],
    "After any number above one": [
      { lemma: "kott", et: "Kolm kotti kartuleid.", form: "kotti", reviewed: false },
    ],
  },
  ILLATIVE: {
    "Going into a place or a container": [
      { lemma: "vihik", et: "Kirjuta ülesanne vihikusse.", form: "vihikusse", reviewed: false },
      { lemma: "trepp", et: "See trepp viib keldrisse.", form: "keldrisse", reviewed: false },
    ],
    "Going into a state or a stretch of time": [
      { lemma: "õnnetus", et: "Buss sattus õnnetusse.", form: "õnnetusse", reviewed: false },
    ],
  },
  ADESSIVE: {
    "Position on a surface": [
      { lemma: "söök", et: "Söök on laual.", form: "laual", reviewed: false },
      { lemma: "diivan", et: "Eva oli diivanil röötsakil.", form: "diivanil", reviewed: false },
    ],
    "Having something: the owner takes this ending": [
      { lemma: "oma", et: "Mul on oma maja.", form: "Mul", reviewed: false },
      { lemma: "perekond", et: "Tal on suur perekond.", form: "Tal", reviewed: false },
    ],
    "When something happens": [
      { lemma: "teisipäev", et: "Koosolek toimub teisipäeval.", form: "teisipäeval", reviewed: false },
      { lemma: "reede", et: "Kontsert toimub reedel.", form: "reedel", reviewed: false },
    ],
  },
  ABLATIVE: {
    "Coming off a surface": [
      { lemma: "korjama", et: "Korjasin peenralt lilli.", form: "peenralt", reviewed: false },
      { lemma: "tramm", et: "Kopli tramm sõitis rööbastelt maha.", form: "rööbastelt", reviewed: false },
    ],
    "The person something is taken, bought or asked from": [
      { lemma: "paluma", et: "Pead vanematelt luba paluma.", form: "vanematelt", reviewed: false },
    ],
  },
  TRANSLATIVE: {
    "Turning into a state or a role": [
      { lemma: "puhas", et: "Peske käed puhtaks.", form: "puhtaks", reviewed: false },
      { lemma: "pliiats", et: "Pliiats hakkab nüriks minema.", form: "nüriks", reviewed: false },
    ],
    "What something is for": [
      { lemma: "šokolaad", et: "Sain kingituseks tahvli šokolaadi.", form: "kingituseks", reviewed: false },
      { lemma: "riis", et: "Lõunaks oli kanafilee riisiga.", form: "Lõunaks", reviewed: false },
    ],
    "A deadline: by when": [
      { lemma: "neljapäev", et: "Töö valmib neljapäevaks.", form: "neljapäevaks", reviewed: false },
      { lemma: "lõpetama", et: "Pean töö homseks lõpetama.", form: "homseks", reviewed: false },
    ],
  },
  TERMINATIVE: {
    "As far as a place": [
      { lemma: "kõndima", et: "Nad kõndisid edasi ja jõudsid järveni.", form: "järveni", reviewed: false },
      { lemma: "poolteist", et: "Linnani on poolteist kilomeetrit.", form: "Linnani", reviewed: false },
    ],
    "Until a moment": [
      { lemma: "lõuna", et: "Ta magas lõunani.", form: "lõunani", reviewed: false },
      { lemma: "näitus", et: "Näitus jääb avatuks sügiseni.", form: "sügiseni", reviewed: false },
    ],
    "Up to an amount": [
      { lemma: "arv", et: "Arvud ühest kümneni.", form: "kümneni", reviewed: false },
    ],
  },
  ESSIVE: {
    "Working as something": [
      { lemma: "juuksur", et: "Ta töötab juuksurina.", form: "juuksurina", reviewed: false },
      { lemma: "arhitekt", et: "Ema töötab arhitektina.", form: "arhitektina", reviewed: false },
    ],
    "A role or a capacity you are in for now": [
      { lemma: "vallaline", et: "Marie suri vallalisena.", form: "vallalisena", reviewed: false },
    ],
  },
  ABESSIVE: {
    "The absence of a thing": [
      { lemma: "supermarket", et: "Ilma autota pole supermarketisse mõtet minna.", form: "autota", reviewed: false },
      { lemma: "kulgema", et: "Rasedus kulges probleemideta.", form: "probleemideta", reviewed: false },
    ],
    "Doing something without a tool, a person or permission": [
      { lemma: "kõrvaklapid", et: "Kasutasin juhtmeta kõrvaklappe.", form: "juhtmeta", reviewed: false },
      { lemma: "paus", et: "Mees rääkis peaaegu pausideta.", form: "pausideta", reviewed: false },
    ],
  },
  COMITATIVE: {
    "Together with somebody": [
      { lemma: "kohvik", et: "Käisin sõbrannaga kohvikus.", form: "sõbrannaga", reviewed: false },
      { lemma: "foto", et: "Fotol on Mari tütrega.", form: "tütrega", reviewed: false },
    ],
    "The tool you did it with": [
      { lemma: "pall", et: "Laps mängib palliga.", form: "palliga", reviewed: false },
      { lemma: "lusikas", et: "Suppi süüakse lusikaga.", form: "lusikaga", reviewed: false },
    ],
    "How you got there": [
      { lemma: "jalgratas", et: "Käin tööl jalgrattaga.", form: "jalgrattaga", reviewed: false },
      { lemma: "tramm", et: "Sõitsin trammiga koju.", form: "trammiga", reviewed: false },
    ],
  },
  INESSIVE: {
    "Position inside a place": [
      { lemma: "meri", et: "Käisin meres ujumas.", form: "meres", reviewed: false },
      { lemma: "tuli", et: "Süütasin ahjus tule.", form: "ahjus", reviewed: false },
    ],
    "Being in a state, a language, or a month": [
      { lemma: "detsember", et: "Detsembris on jõulud.", form: "Detsembris", reviewed: false },
      { lemma: "vale", et: "Oled elanud vales.", form: "vales", reviewed: false },
    ],
  },
  ELATIVE: {
    "Coming out of a place": [
      { lemma: "laev", et: "Laev väljub sadamast.", form: "sadamast", reviewed: false },
      { lemma: "buss", et: "Me jäime bussist maha.", form: "bussist", reviewed: false },
    ],
    "What something is made of": [
      { lemma: "oder", et: "Odrast saab karaskit.", form: "Odrast", reviewed: false },
    ],
    "What a text or a conversation is about": [
      { lemma: "mõtlema", et: "Millest sa mõtled?", form: "Millest", reviewed: false },
      { lemma: "surm", et: "Saime teate isa surmast.", form: "surmast", reviewed: false },
    ],
  },
  ALLATIVE: {
    "Going onto a surface": [
      { lemma: "panema", et: "Pane raamat lauale.", form: "lauale", reviewed: false },
      { lemma: "tool", et: "Külaline istus toolile.", form: "toolile", reviewed: false },
    ],
    "The person something is given, said or sent to": [
      { lemma: "vann", et: "Tegin lapsele vanni.", form: "lapsele", reviewed: false },
    ],
  },
};

/**
 * Points that ship with no example, and why.
 *
 * Keyed `topic:<id>|<point>` and `case:<KEY>|<use>`. A reason is a sentence
 * somebody can disagree with, never a filename: "nothing attested" is not one,
 * because it does not say whether anybody looked.
 */
export const EXAMPLE_GAPS: Readonly<Record<string, string>> = {
  "topic:participles|Four of them: active and impersonal, present and past":
    "a count of how many there are rather than a thing a sentence does, and the three points beside it are where each one is shown",
  "topic:impersonal|Has its own forms across the tenses":
    "a claim about the whole table of forms, which one sentence in one tense cannot show",
  "topic:infinitives|Both are stored, because neither predicts the other":
    "a fact about the lexicon rather than about a sentence: the two points above it are where each infinitive is shown at work",
  "topic:government|The dictionary records it as the question the verb answers":
    "about what the dictionary stores rather than about Estonian, and the entry's own government block is where a learner reads it",
  "case:NOMINATIVE|The form you look a word up under":
    "about how the dictionary is indexed rather than about a sentence, and every entry on every page demonstrates it",
  "case:GENITIVE|The stem every ending below needs":
    "a claim about the eleven cases built on it, which the build-a-word walk shows on a word the reader picks",
  "topic:gradation|The written kind changes consonants and can be spotted":
    "the change is between two forms of one word and a pin holds one sentence, so what shows it is the entry's own principal parts and the exceptions area beside them",
  "topic:gradation|The other kind is a change in length that spelling hides":
    "spelling does not record it, so no written sentence can show it; the minimal pairs round plays the difference instead",
  "topic:gradation|Which words do it is a property of the word":
    "a fact about the dictionary, which the entry's own gradation chip names word by word",
  "topic:word-order|New information tends to go last":
    "a contrast between two orders of one sentence, and a pin holds one sentence rather than a pair",
  "topic:emphasis|Move a word to the front to stress it":
    "the same sentence in two orders is what shows this, and a pin holds one of them",
  "topic:emphasis|Word order stands in for the stress English puts in the voice":
    "a comparison with spoken English, which nothing written in Estonian can carry on its own",
  "topic:rhetorical-questions|Leaving it out, with question intonation, reads differently":
    "the point is what changes when the particle goes, so it needs the pair, and the corpus records only the written form",
  "topic:rhetorical-questions|Common in speeches and opinion writing":
    "a claim about where the form turns up rather than about what it means",
  "topic:reported-speech|The tense does not shift back the way English does":
    "a contrast with English tense agreement, which needs the English original beside it",
  "topic:concession|Conjunctions that subordinate a concession":
    "the dictionary records kuigi almost only in its other sense, not very, so nothing attested shows the conjunction",
  "topic:concession|The core move of any argued essay":
    "about how an argument is built rather than about a sentence, and no single line is an argument",
  "topic:subordination|The comma before a subordinate clause is compulsory":
    "the point is a comma somebody left out, and every recorded sentence has it",
  "topic:subordination|Chains of clauses are normal in writing, rare in speech":
    "a claim about how often a shape turns up in two registers, which one sentence cannot carry",
  "topic:quotative|Common in news writing, where the source matters":
    "about where the mood is used rather than what it does, and the dictionary records usages rather than the writing around them",
  "topic:adjective-agreement|A few borrowed adjectives never change at all":
    "a short list of words rather than a rule, and the dictionary has no sentence that shows one failing to agree",
  "topic:superlative|Both are common and neither is wrong":
    "a claim about two forms being interchangeable, which needs the same sentence said both ways",
  "topic:nominalisation|An action noun replaces a subordinate clause":
    "the point is the clause it replaces, so it needs the pair rather than the result",
  "topic:nominalisation|The doer becomes a genitive in front of it":
    "only legible beside the clause it was rewritten from, which no recorded usage carries",
  "topic:nominalisation|Standard in academic, legal and official writing":
    "about which register the shape belongs to, and the dictionary records the sentence rather than where it was written",
  "topic:punctuation|A comma before a subordinate clause, pause or no pause":
    "the rule is about where a comma may not be left out, and every recorded sentence already follows it",
  "topic:punctuation|Rules for lists and for asides":
    "a rule about marks rather than words, so a sentence obeying it shows nothing a reader could notice",
  "topic:punctuation|Quotation marks are shaped differently from English ones":
    "about the shape of a glyph, which a sentence carries without teaching anybody to reach for it",
  "topic:register|A written standard noticeably unlike speech":
    "the point is the distance between two ways of saying one thing, and a pin holds one of them",
  "topic:register|Officialese, which is its own much-mocked style":
    "a style rather than a construction, and one sentence out of it reads as ordinary prose",
  "topic:register|Spoken forms that are correct and wrong in an essay":
    "the dictionary records the written standard, so the spoken form this is about is not in the corpus",
  "topic:collocation|Pairings fixed by convention rather than by grammar":
    "what teaches a pairing is the wrong one beside it, and this app may not write the wrong one",
  "topic:collocation|Near-synonyms that do not swap in context":
    "needs the swap that does not work, which would be Estonian nobody wrote",
  "topic:collocation|The last thing learned, the first thing noticed":
    "about how the thing is acquired rather than about the language",
  "topic:irony|Carried by intonation, understatement and context":
    "intonation and context are what carry it, and a recorded sentence arrives without either",
  "topic:irony|Understatement is the commonest form here":
    "reading it as understatement needs the situation it was said in, which a usage does not record",
  "topic:irony|Rarely flagged, so it has to be inferred":
    "the point is the absence of a marker, which no sentence can show by itself",
  "topic:nuance|Separated by register, strength or connotation":
    "a difference between two words, so it needs both, and the dictionary files a usage under one",
  "topic:nuance|Shades a bilingual dictionary flattens":
    "about what a translation leaves out, which the English under a sentence would leave out too",
  "topic:nuance|Settled by reading real usage, not definitions":
    "advice about how to learn the thing rather than a construction to see",
  "topic:variation|Regional dialects, some quite far from the standard":
    "the dictionary records the standard, so nothing dialectal is in the corpus to point at",
  "topic:variation|The gap between the written standard and speech":
    "a distance between two registers, and what is recorded is one end of it",
  "topic:variation|Older and literary forms you still meet reading":
    "the corpus is contemporary usage, so the older forms this is about are not in it",
};

/** The key a gap is filed under. One spelling, so the two readers agree. */
export function gapKey(kind: "topic" | "case", id: string, point: string): string {
  return `${kind}:${id}|${point}`;
}

/** Every point the reference makes, in one list, for the checks over it. */
export function everyPoint(): { kind: "topic" | "case"; id: string; point: string }[] {
  return [
    ...TOPIC_NOTES.flatMap((t) =>
      t.points.map((point) => ({ kind: "topic" as const, id: t.id, point })),
    ),
    ...CASE_NOTES.flatMap((c) =>
      c.uses.map((point) => ({ kind: "case" as const, id: c.key, point })),
    ),
  ];
}

/** What is pinned against one point, or nothing. */
export function examplesFor(
  kind: "topic" | "case", id: string, point: string,
): readonly PinnedExample[] {
  const table = kind === "topic" ? TOPIC_EXAMPLES : CASE_EXAMPLES;
  return table[id]?.[point] ?? [];
}
