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
   * claimed is reported as unclaimed by `npm run audit:pins` rather
   * than passing quietly.
   */
  readonly slot?: string;
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
    "The verb you'll use in every conversation, and it's irregular": [
      { lemma: "kurb", et: "Olen natuke kurb.", form: "Olen", slot: "VERB:IndPrSg1" },
      { lemma: "õde", et: "Nad on õde ja vend.", form: "on", slot: "VERB:IndPrPl3" },
    ],
    "For \"I have\", you say \"at me is\", with -l on the owner": [
      { lemma: "oma", et: "Mul on oma maja.", form: "Mul", slot: "CASE:ADESSIVE" },
      { lemma: "perekond", et: "Tal on suur perekond.", form: "Tal", slot: "CASE:ADESSIVE" },
    ],
    "Being sleepy or hungry, or having to do something, works the same way": [
      { lemma: "uni", et: "Mul on kange uni.", form: "Mul", slot: "CASE:ADESSIVE" },
      { lemma: "isu", et: "Tal on hea isu.", form: "Tal", slot: "CASE:ADESSIVE" },
    ],
  },
  "present-tense": {
    "One ending each for I, you, he or she, we, you all and they": [
      { lemma: "alustama", et: "Alustame tööd esmaspäeval.", form: "Alustame", slot: "VERB:IndPrPl1" },
      { lemma: "nädalavahetus", et: "Mida te nädalavahetusel teete?", form: "teete", slot: "VERB:IndPrPl2" },
    ],
    "One form for both \"I eat\" and \"I'm eating\"": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "sööb", slot: "VERB:IndPrSg3" },
      { lemma: "magama", et: "Karu magab talveund.", form: "magab", slot: "VERB:IndPrSg3" },
    ],
    "It covers the future too, as in \"the concert is tomorrow\"": [
      { lemma: "toimuma", et: "Kontsert toimub homme.", form: "toimub", slot: "VERB:IndPrSg3" },
      { lemma: "esindaja", et: "Kahe riigi esindajad kohtuvad homme.", form: "kohtuvad", slot: "VERB:IndPrPl3" },
    ],
  },
  negation: {
    "The verb loses its ending and goes back to its shortest shape": [
      { lemma: "aeg", et: "Aeg ei peatu.", form: "peatu", slot: "VERB:IndPrPs_" },
      { lemma: "leidma", et: "Ma ei leia oma rahakotti.", form: "leia", slot: "VERB:IndPrPs_" },
    ],
    "The same \"not\" for everyone, where English juggles don't and doesn't": [
      { lemma: "juuksur", et: "Mulle ei meeldi juuksuris käia.", form: "ei" },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "ei" },
    ],
    "The past says no in a different way from the present": [
      { lemma: "isa", et: "Isa ja ema ei olnud kodus.", form: "olnud", slot: "VERB:PtsPtPs" },
      { lemma: "juhuslik", et: "Koha valik polnud juhuslik.", form: "polnud" },
    ],
  },
  imperfect: {
    "\"I did\" usually ends in -sin, and some common verbs take -in": [
      { lemma: "meri", et: "Käisin meres ujumas.", form: "Käisin", slot: "VERB:IndIpfSg1" },
      { lemma: "mets", et: "Eksisin metsa ära.", form: "Eksisin", slot: "VERB:IndIpfSg1" },
    ],
    "Some very common verbs use -i- instead of -si-": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "Jõin", slot: "VERB:IndIpfSg1" },
      { lemma: "kala", et: "Kala ujus sügavamale.", form: "ujus", slot: "VERB:IndIpfSg3" },
    ],
    "For anything that's over, even if it was five minutes ago": [
      { lemma: "jooma", et: "Jõin tassi kohvi.", form: "Jõin", slot: "VERB:IndIpfSg1" },
      { lemma: "algus", et: "Ootasime kontserdi algust.", form: "Ootasime" },
    ],
  },
  perfect: {
    "Built with \"to be\", never with \"to have\"": [
      { lemma: "kiirabi", et: "Mare on aastaid kiirabis töötanud.", form: "on", slot: "VERB:IndPrSg3" },
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "on", slot: "VERB:IndPrSg3" },
    ],
    "For when the result matters more than when it happened": [
      { lemma: "sügis", et: "Värviline sügis on kätte jõudnud.", form: "jõudnud", slot: "VERB:PtsPtPs" },
      { lemma: "käärid", et: "Käärid on nüriks läinud.", form: "läinud", slot: "VERB:PtsPtPs" },
    ],
    "The -nud word stays the same for every person": [
      { lemma: "eestikeelne", et: "Ta on saanud eestikeelse hariduse.", form: "saanud", slot: "VERB:PtsPtPs" },
      { lemma: "traditsioon", et: "Laulupeod on Eestis traditsiooniks saanud.", form: "saanud", slot: "VERB:PtsPtPs" },
    ],
  },
  pluperfect: {
    "Something that was over before something else happened": [
      { lemma: "vistrik", et: "Näkku oli tekkinud uus vistrik.", form: "oli", slot: "VERB:IndIpfSg3" },
      { lemma: "isand", et: "Kohale olid tulnud tähtsad vaimulikud isandad.", form: "olid" },
    ],
    "Common in stories, and when you retell what someone said": [
      { lemma: "seen", et: "Nikolai oli läinud hommikul metsa seenele ja polnud õhtuks tagasi jõudnud.", form: "oli", slot: "VERB:IndIpfSg3" },
      { lemma: "süüdlane", et: "Politsei oli saanud mitu vihjet võimalike süüdlaste kohta.", form: "oli", slot: "VERB:IndIpfSg3" },
    ],
    "Uses exactly the same -nud word as \"have done\"": [
      { lemma: "nõges", et: "Risuhunnik oli nõgestesse kasvanud.", form: "kasvanud", slot: "VERB:PtsPtPs" },
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "kasvanud", slot: "VERB:PtsPtPs" },
    ],
  },
  conditional: {
    "Wishes and what-ifs: \"if I had time, I'd come\"": [
      { lemma: "elukoht", et: "Hea, kui elukoht asuks töökoha lähedal.", form: "asuks", slot: "VERB:KndPrPs" },
      { lemma: "kündma", et: "Kui oleksin maal edasi, künnaksin traktoriga põldu.", form: "oleksin", slot: "VERB:KndPrSg1" },
    ],
    "Asking nicely: \"I'd like a coffee\", rather than \"I want\"": [
      { lemma: "paluma", et: "Ma tahaksin sinult midagi paluda.", form: "tahaksin", slot: "VERB:KndPrSg1" },
      { lemma: "külmik", et: "Tahaksin vana külmiku tasuta ära anda.", form: "Tahaksin", slot: "VERB:KndPrSg1" },
    ],
    "Giving advice without bossing anyone around": [
      { lemma: "hambaarst", et: "Kui hammas valutab, siis peaksid hambaarsti juurde minema.", form: "peaksid", slot: "VERB:KndPrSg2" },
      { lemma: "arutama", et: "Neid probleeme tuleks koosolekul arutada.", form: "tuleks", slot: "VERB:KndPrPs" },
    ],
  },
  imperative: {
    "One form for one person, another for a group, unlike English": [
      { lemma: "istuma", et: "Istu minu kõrvale.", form: "Istu", slot: "VERB:ImpPrSg2" },
      { lemma: "puhas", et: "Peske käed puhtaks.", form: "Peske", slot: "VERB:ImpPrPl2" },
    ],
    "The group form is also the polite one for a single stranger": [
      { lemma: "tualett", et: "Palun öelge, kus siin tualett on.", form: "öelge", slot: "VERB:ImpPrPl2" },
      { lemma: "saatma", et: "Saatke mulle takso.", form: "Saatke", slot: "VERB:ImpPrPl2" },
    ],
    "\"Don't\" has a little word of its own": [
      { lemma: "vaatama", et: "Ära otse päikesesse vaata!", form: "Ära" },
      { lemma: "muretsema", et: "Ära muretse, kõik läheb hästi.", form: "Ära" },
    ],
  },
  impersonal: {
    "Signs, instructions, forms and the news": [
      { lemma: "magustoit", et: "Dessertveini serveeritakse koos magustoiduga.", form: "serveeritakse" },
      { lemma: "kontrollima", et: "Doonoril kontrollitakse vererõhku.", form: "kontrollitakse" },
    ],
    "Says people did something, without saying which people": [
      { lemma: "nimetama", et: "Kuidas seda asutust nimetatakse?", form: "nimetatakse" },
      { lemma: "hobi", et: "Ratsutamist peetakse kulukaks hobiks.", form: "peetakse" },
    ],
  },
  "past-participle": {
    "With \"to be\" it makes \"have done\" and \"had done\"": [
      { lemma: "vale", et: "Oled elanud vales.", form: "elanud", slot: "VERB:PtsPtPs" },
      { lemma: "alati", et: "Mulle on alati meeldinud tantsida.", form: "meeldinud", slot: "VERB:PtsPtPs" },
    ],
    "Describes something by what it has done, like \"a fallen leaf\"": [
      { lemma: "vihik", et: "Ilmunud vihik tegi luuletajale palju rõõmu.", form: "Ilmunud", slot: "VERB:PtsPtPs" },
      { lemma: "kiirabi", et: "Kukkunud vanainimene vajas kiirabi.", form: "Kukkunud" },
    ],
    "Has a twin in -tud for things done to something": [
      { lemma: "kook", et: "Vanaema küpsetatud kook.", form: "küpsetatud", slot: "VERB:PtsPtPs" },
      { lemma: "pilt", et: "Laste joonistatud pildid.", form: "joonistatud", slot: "VERB:PtsPtPs" },
    ],
  },
  participles: {
    "They describe a noun, the way \"a sleeping baby\" does": [
      { lemma: "mobiiltelefon", et: "Mobiiltelefoniga tehtud fotod.", form: "tehtud", slot: "VERB:PtsPtPs" },
      { lemma: "masin", et: "Masinal kootud vaip.", form: "kootud", slot: "VERB:PtsPtPs" },
    ],
    "With \"to be\", they make \"has done\" and \"had done\"": [
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "kasvanud", slot: "VERB:PtsPtPs" },
      { lemma: "vistrik", et: "Näkku oli tekkinud uus vistrik.", form: "tekkinud", slot: "VERB:PtsPtPs" },
    ],
  },
  politeness: {
    "Calling one stranger \"you\" in the plural, to be polite": [
      { lemma: "kohv", et: "Kas te soovite teed või kohvi?", form: "soovite", slot: "VERB:IndPrPl2" },
      { lemma: "või", et: "Kas te maksate sularahas või ülekandega?", form: "maksate", slot: "VERB:IndPrPl2" },
    ],
    "The \"would\" form, to make a request gentler": [
      { lemma: "paluma", et: "Ma tahaksin sinult midagi paluda.", form: "tahaksin", slot: "VERB:KndPrSg1" },
      { lemma: "külmik", et: "Tahaksin vana külmiku tasuta ära anda.", form: "Tahaksin", slot: "VERB:KndPrSg1" },
    ],
    "Being direct is less rude here than English speakers expect": [
      { lemma: "tualett", et: "Palun öelge, kus siin tualett on.", form: "öelge", slot: "VERB:ImpPrPl2" },
      { lemma: "saatma", et: "Saatke mulle takso.", form: "Saatke", slot: "VERB:ImpPrPl2" },
    ],
  },
  "time-expressions": {
    "Days, seasons and years take -l, and months take -s": [
      { lemma: "teisipäev", et: "Koosolek toimub teisipäeval.", form: "teisipäeval", slot: "CASE:ADESSIVE" },
      { lemma: "juuli", et: "Lähen juulis puhkusele.", form: "juulis", slot: "CASE:INESSIVE" },
    ],
    "\"For how long\" works differently again": [
      { lemma: "kirurg", et: "Kirurg tegi päeva jooksul kolm operatsiooni.", form: "jooksul", slot: "CASE:ADESSIVE" },
      { lemma: "kestma", et: "Film kestis kaks tundi.", form: "tundi", slot: "CASE:PARTITIVE" },
    ],
    "From and until each have their own ending": [
      { lemma: "esmaspäev", et: "Käin tööl esmaspäevast reedeni.", form: "esmaspäevast", slot: "CASE:ELATIVE" },
      { lemma: "pääsuke", et: "Pääsuke laulab aprillist augustini.", form: "augustini", slot: "CASE:TERMINATIVE" },
    ],
  },
  aspect: {
    "Done, and all of it: \"I ate the cake\", the whole cake": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto", slot: "CASE:GENITIVE" },
      { lemma: "taldrik", et: "Sõin taldriku tühjaks.", form: "taldriku", slot: "CASE:GENITIVE" },
    ],
    "Unfinished, or only some: the \"some of it\" ending": [
      { lemma: "tort", et: "Sõin tüki torti.", form: "torti", slot: "CASE:PARTITIVE" },
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett", slot: "CASE:PARTITIVE" },
    ],
    "Small words like \"up\" and \"off\" underline that it's finished": [
      { lemma: "kartul", et: "Palun koori kartulid ära.", form: "ära" },
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", form: "otsa" },
    ],
  },
  infinitives: {
    "The -ma one comes after \"start\", \"go\" and \"have to\"": [
      { lemma: "kook", et: "Ema hakkab kooki küpsetama.", form: "küpsetama", slot: "VERB:Sup" },
      { lemma: "orkester", et: "Orkester hakkas mängima.", form: "mängima", slot: "VERB:Sup" },
    ],
    "The -da one comes after \"want\" and \"can\"": [
      { lemma: "valuuta", et: "Kus saab valuutat vahetada?", form: "vahetada", slot: "VERB:Inf" },
      { lemma: "võima", et: "Haige võib varsti surra.", form: "surra", slot: "VERB:Inf" },
    ],
  },
  "particle-verbs": {
    "The small word usually adds \"all the way\" or a direction": [
      { lemma: "veekeetja", et: "Lülita veekeetja sisse.", form: "sisse", slot: "CASE:PARTITIVE" },
      { lemma: "tõmbama", et: "Tõmba uks kinni.", form: "kinni" },
    ],
    "Often it's the difference between doing and getting it done": [
      { lemma: "lamp", et: "Lamp põles läbi.", form: "läbi" },
      { lemma: "ostma", et: "Etenduse piletid osteti kiiresti ära.", form: "ära" },
    ],
    "It wanders around the sentence instead of staying by the verb": [
      { lemma: "televiisor", et: "Pane televiisor kinni.", form: "kinni" },
      { lemma: "kraan", et: "Keerasin kraani kinni.", form: "kinni" },
    ],
  },
  converb: {
    "Two things at once, with no \"and\" or \"while\" needed": [
      { lemma: "ige", et: "Naerdes paljastusid laiad esihambad ja igemed.", form: "Naerdes" },
      { lemma: "tatt", et: "Mees köhib tatti pritsides.", form: "pritsides" },
    ],
    "Writers much prefer it to two sentences joined up": [
      { lemma: "pidur", et: "Peo edenedes pidurid kadusid.", form: "edenedes" },
      { lemma: "otsustama", et: "Purustuste järgi otsustades võis tegu olla keeristormiga.", form: "otsustades" },
    ],
    "Whoever does it is whoever does the rest of the sentence": [
      { lemma: "viibima", et: "Ta kuulis juhtunust puhkusel viibides.", form: "viibides" },
      { lemma: "üllatuma", et: "Ta oli auhinnast kuuldes rõõmsalt üllatunud.", form: "kuuldes" },
    ],
  },
  quotative: {
    "Rumors, hearsay and things you read somewhere": [
      { lemma: "tammetõru", et: "Tammetõrude rohkus ennustavat karmi talve.", form: "ennustavat" },
      { lemma: "aus", et: "Aus ülestunnistus pidavat karistust kergendama.", form: "pidavat" },
    ],
    "Can sound doubtful, depending on how it's said": [
      { lemma: "väitma", et: "Mees väidab end mitte teadvat, kuhu ta auto jättis.", form: "teadvat" },
      { lemma: "sest", et: "Kohus andis hagi tagasi, sest see olevat puudulikult koostatud.", form: "olevat" },
    ],
  },
  numerals: {
    "From two up, the noun takes the singular \"some of it\" form": [
      { lemma: "pirn", et: "Aias kasvab kolm pirni.", form: "pirni", slot: "CASE:PARTITIVE" },
      { lemma: "pudel", et: "Ostsin kaks pudelit vett.", form: "pudelit", slot: "CASE:PARTITIVE" },
    ],
    "Numbers take endings too, when the noun after them does": [
      { lemma: "minut", et: "Buss tuleb viie minuti pärast.", form: "viie", slot: "CASE:GENITIVE" },
      { lemma: "broneerima", et: "Broneerisin laua kahele.", form: "kahele", slot: "CASE:ALLATIVE" },
    ],
    "First, second and so on are regular, and take endings too": [
      { lemma: "baar", et: "Hotelli baar asub esimesel korrusel.", form: "esimesel", slot: "CASE:ADESSIVE" },
      { lemma: "lennuk", et: "Laps sõidab lennukiga esimest korda.", form: "esimest", slot: "CASE:PARTITIVE" },
    ],
  },
  derivation: {
    "Any verb gives a noun for doing it, like \"reading\"": [
      { lemma: "võõras", et: "Vabandamine on talle võõras.", form: "Vabandamine" },
      { lemma: "harjumus", et: "Suitsetamine on kahjulik harjumus.", form: "Suitsetamine" },
    ],
    "Adjectives meaning \"-ish\" and \"-less\"": [
      { lemma: "arglik", et: "Kõlas arglik koputus.", form: "arglik" },
      { lemma: "abikaasa", et: "Abikaasad on võrdõiguslikud.", form: "võrdõiguslikud" },
    ],
    "An adjective gives a noun for the quality, like \"kindness\"": [
      { lemma: "sõprus", et: "Meid seob ammune sõprus.", form: "sõprus", slot: "CASE:NOMINATIVE" },
      { lemma: "rikkus", et: "Ega rikkus pole häbiasi.", form: "rikkus", slot: "CASE:NOMINATIVE" },
    ],
  },
  "word-order": {
    "Endings show who did what, so the order is free to show emphasis": [
      { lemma: "talv", et: "Talvel sadas palju lund.", form: "Talvel", slot: "CASE:ADESSIVE" },
      { lemma: "toimuma", et: "Varahommikul toimus raske liiklusõnnetus.", form: "Varahommikul" },
    ],
    "The verb usually comes second": [
      { lemma: "alustama", et: "Homme alustan dieeti.", form: "alustan", slot: "VERB:IndPrSg1" },
      { lemma: "kütma", et: "Õhtul kütan sauna.", form: "kütan", slot: "VERB:IndPrSg1" },
    ],
  },
  idiom: {
    "Sayings still in daily use": [
      { lemma: "ilu", et: "Ilu peitub vaataja silmades.", form: "silmades", slot: "CASE:INESSIVE" },
      { lemma: "põhimõte", et: "Lähtusin põhimõttest, et topelt ei kärise.", form: "kärise" },
    ],
    "Fixed phrases that don't mean what their words say": [
      { lemma: "tööline", et: "Häid töölisi otsitakse tikutulega taga.", form: "tikutulega" },
      { lemma: "naer", et: "Olime kõik naerust kõveras.", form: "kõveras" },
    ],
    "Ordinary words used in a picture sense": [
      { lemma: "suvi", et: "Suvi on käes.", form: "käes", slot: "CASE:INESSIVE" },
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", form: "otsa" },
    ],
  },
  "adjective-agreement": {
    "Same ending and same number, one or many, as its noun": [
      { lemma: "liha", et: "Ostsin turult värsket liha.", form: "värsket", slot: "CASE:PARTITIVE" },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "rasvast" },
    ],
    "With -ni, -na, -ta and -ga, only the noun gets the full ending": [
      { lemma: "aeglane", et: "Aeglase vooluga jõgi.", form: "Aeglase", slot: "CASE:GENITIVE" },
      { lemma: "lõpp", et: "Õnneliku lõpuga film.", form: "Õnneliku", slot: "CASE:GENITIVE" },
    ],
  },
  comparative: {
    "Add -m to the form meaning \"of\", the one the endings go on": [
      { lemma: "väike", et: "Anna väiksem lusikas!", form: "väiksem" },
      { lemma: "palk", et: "Eesti keskmine palk on suurem kui Lätis.", form: "suurem" },
    ],
    "Either \"than\" plus the plain word, or no \"than\" and -st": [
      { lemma: "diisel", et: "Bensiin on kallim kui diisel.", form: "kui" },
      { lemma: "oluliselt", et: "Ta on oma abikaasast oluliselt noorem.", form: "abikaasast", slot: "CASE:ELATIVE" },
    ],
    "A few common ones are irregular, like English \"good, better\"": [
      { lemma: "parem", et: "Kumb auto on parem?", form: "parem", slot: "CASE:NOMINATIVE" },
      { lemma: "palju", et: "Täna on enesetunne palju parem.", form: "parem", slot: "CASE:NOMINATIVE" },
    ],
  },
  superlative: {
    "A helper word in front of \"bigger\", which always works": [
      { lemma: "veebruar", et: "Veebruar on tavaliselt aasta kõige külmem kuu.", form: "kõige", slot: "CASE:GENITIVE" },
      { lemma: "ingel", et: "Sa oled mu ingel, mu kõige kallim!", form: "kõige", slot: "CASE:GENITIVE" },
    ],
    "A one-word form, shorter and more literary": [
      { lemma: "linn", et: "Tallinn on Eesti suurim linn.", form: "suurim" },
      { lemma: "sõbranna", et: "Kaisa on minu parim sõbranna.", form: "parim" },
    ],
  },
  future: {
    "A word like \"tomorrow\" is what makes it the future": [
      { lemma: "toimuma", et: "Kontsert toimub homme.", form: "homme" },
      { lemma: "abielupaar", et: "Nendest saab varsti abielupaar.", form: "varsti" },
    ],
    "Verbs like \"plan\" and \"intend\" do the rest": [
      { lemma: "kook", et: "Ema hakkab kooki küpsetama.", form: "hakkab", slot: "VERB:IndPrSg3" },
      { lemma: "kavatsema", et: "Valitsus kavatseb eelarvekulud tõsise kontrolli alla võtta.", form: "kavatseb", slot: "VERB:IndPrSg3" },
    ],
    "A small extra word can say it's going to get finished": [
      { lemma: "kütus", et: "Autol hakkab kütus otsa saama.", form: "otsa" },
      { lemma: "pastakas", et: "Pastakas hakkab tühjaks saama.", form: "tühjaks", slot: "CASE:TRANSLATIVE" },
    ],
  },
  object: {
    "Done, and all of it: the plain word, or the form meaning \"whose\"": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto", slot: "CASE:GENITIVE" },
      { lemma: "panema", et: "Pane raamat lauale.", form: "raamat", slot: "CASE:NOMINATIVE" },
    ],
    "Unfinished, or only part of it: the \"some of it\" ending": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett", slot: "CASE:PARTITIVE" },
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "banaani", slot: "CASE:PARTITIVE" },
    ],
    "After \"not\": always the \"some of it\" ending": [
      { lemma: "ulme", et: "Ma ei loe ulmet.", form: "ulmet", slot: "CASE:PARTITIVE" },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "sealiha", slot: "CASE:PARTITIVE" },
    ],
  },
  "reported-speech": {
    "\"She said that...\" plus a clause, much like English": [
      { lemma: "imelik", et: "Imelik, et teda kodus pole.", form: "et" },
      { lemma: "elus", et: "Ma olin viimane, kes teda elusana nägi.", form: "kes", slot: "CASE:NOMINATIVE" },
    ],
    "Or the -vat form, which needs no \"said\" at all": [
      { lemma: "tammetõru", et: "Tammetõrude rohkus ennustavat karmi talve.", form: "ennustavat" },
      { lemma: "meel", et: "Hiinlased olevat tuntud oma praktilise meele poolest.", form: "olevat" },
    ],
  },
  concession: {
    "Words like \"even so\" that start a new sentence": [
      { lemma: "kokkuvõttes", et: "Esinemine oli kokkuvõttes siiski rahuldav.", form: "siiski" },
      { lemma: "kõhklema", et: "Mari kõhkles hetke, ent siis otsustas teistega kaasa minna.", form: "ent" },
    ],
  },
  hedging: {
    "Words like \"probably\", \"likely\" and \"perhaps\"": [
      { lemma: "vist", et: "Ema vist magab juba.", form: "vist" },
      { lemma: "vist", et: "Hakkab vist sadama.", form: "vist" },
    ],
    "The -vat form, which puts the claim on somebody else": [
      { lemma: "aus", et: "Aus ülestunnistus pidavat karistust kergendama.", form: "pidavat" },
      { lemma: "näiteks", et: "Rooibos leevendavat mitmeid terviseprobleeme, näiteks unetust, pingeid ja peavalu.", form: "leevendavat" },
    ],
    "The \"would\" form, which softens a claim as well as a request": [
      { lemma: "elukoht", et: "Hea, kui elukoht asuks töökoha lähedal.", form: "asuks", slot: "VERB:KndPrPs" },
      { lemma: "arutama", et: "Neid probleeme tuleks koosolekul arutada.", form: "tuleks", slot: "VERB:KndPrPs" },
    ],
  },
  cohesion: {
    "Contrast and result: \"but\", \"so\", \"therefore\"": [
      { lemma: "tõsi", et: "Kurb, aga tõsi.", form: "aga" },
      { lemma: "välk", et: "Müristab, aga välku ei löö.", form: "aga" },
    ],
    "Ordering and adding: first, also, finally": [
      { lemma: "pühak", et: "Patukotist sai lõpuks pühak.", form: "lõpuks", slot: "CASE:TRANSLATIVE" },
      { lemma: "lehtpuu", et: "Leiliruumi lagi ja seinad, samuti lava on lehtpuust.", form: "samuti" },
    ],
    "Pointing back to something without repeating it": [
      { lemma: "kiikuma", et: "Kiikusin toolil ja see läks katki.", form: "see", slot: "CASE:NOMINATIVE" },
      { lemma: "petma", et: "Ära usu Jaani, ta petab.", form: "ta" },
    ],
  },
  emphasis: {
    "Small words that point at what matters most": [
      { lemma: "kuulama", et: "Kuulake mind ka!", form: "ka" },
      { lemma: "leib", et: "Määri leivale võid ka.", form: "ka" },
    ],
  },
  "rhetorical-questions": {
    "A small word at the start marks a real yes or no question": [
      { lemma: "kohv", et: "Kas te soovite teed või kohvi?", form: "Kas" },
      { lemma: "vann", et: "Kas täna vanni teeme?", form: "Kas" },
    ],
  },
  subordination: {
    "The word order changes inside that part": [
      { lemma: "firma", et: "Töötan firmas, mis toodab autode varuosi.", form: "mis", slot: "CASE:NOMINATIVE" },
      { lemma: "hoolima", et: "Sa oled väga tubli, et oma tervisest hoolid.", form: "hoolid", slot: "VERB:IndPrSg2" },
    ],
  },
  "relative-clause": {
    "Always separated by a comma": [
      { lemma: "puu", et: "Metsas on kohti, kus puud ei kasva.", form: "kus" },
      { lemma: "ettevõte", et: "Töötan ettevõttes, mis tegeleb autode remondiga.", form: "mis", slot: "CASE:NOMINATIVE" },
    ],
    "Different pronouns for people and for things": [
      { lemma: "elus", et: "Ma olin viimane, kes teda elusana nägi.", form: "kes", slot: "CASE:NOMINATIVE" },
      { lemma: "teadus", et: "Bioloogia on teadus, mis uurib elu.", form: "mis", slot: "CASE:NOMINATIVE" },
    ],
    "Its ending depends on its job in its own part of the sentence": [
      { lemma: "režissöör", et: "Ta on hea režissöör, kelle filme tasub vaadata.", form: "kelle", slot: "CASE:GENITIVE" },
      { lemma: "nimekiri", et: "Tegin nimekirja asjadest, mida poest tuua.", form: "mida", slot: "CASE:PARTITIVE" },
    ],
  },
  government: {
    "Which ending comes after it is part of learning the verb": [
      { lemma: "uskuma", et: "Ta usub Jumalasse.", form: "Jumalasse", slot: "CASE:ILLATIVE" },
      { lemma: "pall", et: "Laps mängib palliga.", form: "palliga", slot: "CASE:COMITATIVE" },
    ],
    "Helping, calling, liking and thinking are the traps": [
      { lemma: "juuksur", et: "Mulle ei meeldi juuksuris käia.", form: "Mulle", slot: "CASE:ALLATIVE" },
      { lemma: "mõtlema", et: "Millest sa mõtled?", form: "Millest", slot: "CASE:ELATIVE" },
    ],
  },
};

/** The same, keyed by case key, then by the use as `CASE_NOTES` words it. */
export const CASE_EXAMPLES: Readonly<Record<string, PointPins>> = {
  NOMINATIVE: {
    "Whoever or whatever is doing the action": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "Ahv" },
      { lemma: "magama", et: "Karu magab talveund.", form: "Karu" },
    ],
    "A whole object after a command, or in the plural": [
      { lemma: "panema", et: "Pane raamat lauale.", form: "raamat" },
      { lemma: "kartul", et: "Palun koori kartulid ära.", form: "kartulid" },
    ],
  },
  GENITIVE: {
    "Saying whose something is": [
      { lemma: "uus", et: "Uue filmi esilinastus.", form: "filmi" },
      { lemma: "klient", et: "Rahulolev klient on iga firma unistus.", form: "firma" },
    ],
    "A whole object, like the car you bought": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto", slot: "CASE:GENITIVE" },
      { lemma: "taldrik", et: "Sõin taldriku tühjaks.", form: "taldriku" },
    ],
  },
  PARTITIVE: {
    "Some of a thing rather than all of it": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett" },
      { lemma: "tort", et: "Sõin tüki torti.", form: "torti", slot: "CASE:PARTITIVE" },
    ],
    "An action you're still in the middle of": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "banaani", slot: "CASE:PARTITIVE" },
      { lemma: "algus", et: "Ootasime kontserdi algust.", form: "algust" },
    ],
    "After any number above one": [
      { lemma: "neli", et: "Autol on neli ratast.", form: "ratast" },
      { lemma: "pere", et: "Nende peres on viis last.", form: "last" },
    ],
  },
  ILLATIVE: {
    "Going into a place or a container": [
      { lemma: "vihik", et: "Kirjuta ülesanne vihikusse.", form: "vihikusse" },
      { lemma: "trepp", et: "See trepp viib keldrisse.", form: "keldrisse" },
    ],
    "Going into a state or a stretch of time": [
      { lemma: "õnnetus", et: "Buss sattus õnnetusse.", form: "õnnetusse" },
      { lemma: "vajuma", et: "Lapsuke vajus unne.", form: "unne" },
    ],
  },
  ADESSIVE: {
    "Position on a surface": [
      { lemma: "söök", et: "Söök on laual.", form: "laual" },
      { lemma: "diivan", et: "Eva oli diivanil röötsakil.", form: "diivanil" },
    ],
    "Having something: the owner takes this ending": [
      { lemma: "oma", et: "Mul on oma maja.", form: "Mul" },
      { lemma: "perekond", et: "Tal on suur perekond.", form: "Tal" },
    ],
    "When something happens": [
      { lemma: "teisipäev", et: "Koosolek toimub teisipäeval.", form: "teisipäeval" },
      { lemma: "reede", et: "Kontsert toimub reedel.", form: "reedel" },
    ],
  },
  ABLATIVE: {
    "Coming off a surface": [
      { lemma: "korjama", et: "Korjasin peenralt lilli.", form: "peenralt" },
      { lemma: "tramm", et: "Kopli tramm sõitis rööbastelt maha.", form: "rööbastelt" },
    ],
    "The person something is taken, bought or asked from": [
      { lemma: "paluma", et: "Pead vanematelt luba paluma.", form: "vanematelt" },
      { lemma: "pärand", et: "Ta sai vanaemalt pärandiks korteri.", form: "vanaemalt" },
    ],
  },
  TRANSLATIVE: {
    "Turning into a state or a role": [
      { lemma: "puhas", et: "Peske käed puhtaks.", form: "puhtaks" },
      { lemma: "pliiats", et: "Pliiats hakkab nüriks minema.", form: "nüriks" },
    ],
    "What something is for": [
      { lemma: "šokolaad", et: "Sain kingituseks tahvli šokolaadi.", form: "kingituseks" },
      { lemma: "riis", et: "Lõunaks oli kanafilee riisiga.", form: "Lõunaks" },
    ],
    "A deadline: by when": [
      { lemma: "neljapäev", et: "Töö valmib neljapäevaks.", form: "neljapäevaks" },
      { lemma: "lõpetama", et: "Pean töö homseks lõpetama.", form: "homseks" },
    ],
  },
  TERMINATIVE: {
    "As far as a place": [
      { lemma: "kõndima", et: "Nad kõndisid edasi ja jõudsid järveni.", form: "järveni" },
      { lemma: "poolteist", et: "Linnani on poolteist kilomeetrit.", form: "Linnani" },
    ],
    "Until a moment": [
      { lemma: "varahommik", et: "Ta töötab varahommikust hilisõhtuni.", form: "hilisõhtuni" },
      { lemma: "näitus", et: "Näitus jääb avatuks sügiseni.", form: "sügiseni" },
    ],
    "Up to an amount": [
      { lemma: "arv", et: "Arvud ühest kümneni.", form: "kümneni" },
      { lemma: "viisteist", et: "Päeval tõuseb temperatuur viieteist kraadini.", form: "kraadini" },
    ],
  },
  ESSIVE: {
    "Working as something": [
      { lemma: "juuksur", et: "Ta töötab juuksurina.", form: "juuksurina" },
      { lemma: "arhitekt", et: "Ema töötab arhitektina.", form: "arhitektina" },
    ],
    "A role or a capacity you are in for now": [
      { lemma: "vallaline", et: "Marie suri vallalisena.", form: "vallalisena" },
      { lemma: "terve", et: "Majaelanikud pääsesid põlengust tervena.", form: "tervena" },
    ],
  },
  ABESSIVE: {
    "The absence of a thing": [
      { lemma: "supermarket", et: "Ilma autota pole supermarketisse mõtet minna.", form: "autota" },
      { lemma: "kulgema", et: "Rasedus kulges probleemideta.", form: "probleemideta" },
    ],
    "Doing something without a tool, a person or permission": [
      { lemma: "kõrvaklapid", et: "Kasutasin juhtmeta kõrvaklappe.", form: "juhtmeta" },
      { lemma: "paus", et: "Mees rääkis peaaegu pausideta.", form: "pausideta" },
    ],
  },
  COMITATIVE: {
    "Together with somebody": [
      { lemma: "kohvik", et: "Käisin sõbrannaga kohvikus.", form: "sõbrannaga" },
      { lemma: "foto", et: "Fotol on Mari tütrega.", form: "tütrega" },
    ],
    "The tool you did it with": [
      { lemma: "pall", et: "Laps mängib palliga.", form: "palliga" },
      { lemma: "lusikas", et: "Suppi süüakse lusikaga.", form: "lusikaga" },
    ],
    "How you got somewhere, like by bus": [
      { lemma: "jalgratas", et: "Käin tööl jalgrattaga.", form: "jalgrattaga" },
      { lemma: "tramm", et: "Sõitsin trammiga koju.", form: "trammiga" },
    ],
  },
  INESSIVE: {
    "Position inside a place": [
      { lemma: "meri", et: "Käisin meres ujumas.", form: "meres" },
      { lemma: "tuli", et: "Süütasin ahjus tule.", form: "ahjus" },
    ],
    "Being in a state, a language, or a month": [
      { lemma: "detsember", et: "Detsembris on jõulud.", form: "Detsembris" },
      { lemma: "vale", et: "Oled elanud vales.", form: "vales" },
    ],
  },
  ELATIVE: {
    "Coming out of a place": [
      { lemma: "laev", et: "Laev väljub sadamast.", form: "sadamast" },
      { lemma: "buss", et: "Me jäime bussist maha.", form: "bussist" },
    ],
    "What something is made of": [
      { lemma: "oder", et: "Odrast saab karaskit.", form: "Odrast" },
      { lemma: "kampsun", et: "Ta kannab villast kampsunit.", form: "villast" },
    ],
    "What a text or a conversation is about": [
      { lemma: "mõtlema", et: "Millest sa mõtled?", form: "Millest" },
      { lemma: "surm", et: "Saime teate isa surmast.", form: "surmast" },
    ],
  },
  ALLATIVE: {
    "Going onto a surface": [
      { lemma: "panema", et: "Pane raamat lauale.", form: "lauale" },
      { lemma: "tool", et: "Külaline istus toolile.", form: "toolile" },
    ],
    "The person something is given, said or sent to": [
      { lemma: "vann", et: "Tegin lapsele vanni.", form: "lapsele" },
      { lemma: "musu", et: "Tüdruk andis poisile musu.", form: "poisile" },
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
  "topic:participles|Four in all, roughly \"reading\", \"having read\", \"to be read\" and \"read\"":
    "it's a count, not something a sentence does, and the three points beside it show each one",
  "topic:impersonal|Works in the past as well as the present":
    "it's about the whole table of forms, and one sentence in one tense can't show that",
  "topic:infinitives|Learn both with each verb, because one won't give you the other":
    "it's a fact about the dictionary, not a sentence. The two points above show each infinitive at work",
  "topic:government|The dictionary shows it as a question word, like \"whom?\"":
    "it's about what the dictionary stores, not about Estonian. Each entry's own government block shows it",
  "case:NOMINATIVE|The word as you'd look it up":
    "it's about how the dictionary is sorted, not about a sentence, and every entry on every page already shows it",
  "case:GENITIVE|The base that the eleven endings below are added to":
    "it's about the eleven cases built on this form, and the build-a-word walk shows that on a word you pick",
  "topic:gradation|One kind swaps consonants, and you can see it on the page":
    "the change happens between two forms of one word, and a pin holds one sentence. The entry's own forms and the exceptions area show it instead",
  "topic:gradation|The other is a longer or shorter sound the spelling hides":
    "spelling doesn't record it, so no written sentence can show it. The minimal pairs round lets you hear the difference instead",
  "topic:gradation|Which words do it is something you learn word by word":
    "it's a fact about each word, and the gradation chip on every entry names it word by word",
  "topic:word-order|The new or important bit usually goes last":
    "it's a contrast between two orders of one sentence, and a pin holds one sentence, not a pair",
  "topic:emphasis|Move a word to the front to stress it":
    "you only see it with the same sentence in two orders, and a pin holds just one of them",
  "topic:emphasis|Word order does what English does by stressing a word out loud":
    "it's a comparison with how English uses the voice, and a written Estonian sentence can't carry that alone",
  "topic:rhetorical-questions|Leave it out and just raise your voice, and it sounds different":
    "the point is what changes when the little word goes, so it needs both versions, and the dictionary only records the written one",
  "topic:rhetorical-questions|Common in speeches and opinion writing":
    "it's about where this turns up, not about what it means, so one sentence can't show it",
  "topic:reported-speech|The tense does not shift back the way English does":
    "it's a contrast with English, so it would need the English original sitting beside it",
  "topic:concession|Words like \"although\" that start a clause":
    "the dictionary records kuigi almost only in its other meaning, not very, so no recorded sentence shows it as a conjunction",
  "topic:concession|The backbone of any essay that argues a point":
    "it's about how an argument is built, and no single line is an argument",
  "topic:subordination|A comma always goes before \"that\", \"because\" and friends":
    "the point is a comma somebody forgot, and every recorded sentence already has it",
  "topic:subordination|Long chains of them are normal in writing, rarer out loud":
    "it's about how often a shape turns up in writing and in speech, which one sentence can't show",
  "topic:quotative|Common in the news, where who said it matters":
    "it's about where the mood gets used, and the dictionary keeps the sentence without the article around it",
  "topic:adjective-agreement|A few borrowed adjectives never change at all":
    "it's a short list of words rather than a rule, and the dictionary has no sentence showing one refusing to change",
  "topic:superlative|Both are common and neither is wrong":
    "it says two forms are interchangeable, which needs the same sentence said both ways",
  "topic:nominalisation|One noun stands in for a whole \"that\" or \"when\" clause":
    "the point is the clause it replaces, so you'd need both versions, not just the result",
  "topic:nominalisation|The doer goes in front, in the form that means \"whose\"":
    "it only makes sense next to the clause it was rewritten from, and no recorded sentence comes with that",
  "topic:nominalisation|Standard in academic, legal and official writing":
    "it's about which kind of writing the shape belongs to, and the dictionary doesn't record where a sentence was written",
  "topic:punctuation|A comma before \"that\" or \"because\", pause or no pause":
    "the rule is about where a comma can't be left out, and every recorded sentence already follows it",
  "topic:punctuation|Rules for lists and for asides":
    "it's a rule about punctuation marks, so a sentence that follows it shows nothing you'd notice",
  "topic:punctuation|Quotation marks are shaped differently from English ones":
    "it's about the shape of a mark, and a sentence can carry one without teaching anybody how to type it",
  "topic:register|Written Estonian that sounds quite unlike speech":
    "the point is the distance between two ways of saying one thing, and a pin holds only one of them",
  "topic:register|Officialese, a style of its own that everybody pokes fun at":
    "it's a whole style rather than one construction, and a single sentence of it just reads as ordinary prose",
  "topic:register|Spoken forms that are fine out loud and wrong in an essay":
    "the dictionary records the written standard, so the spoken forms this is about aren't in it",
  "topic:collocation|Pairs fixed by habit, like English \"make a mistake\"":
    "what teaches a pairing is the wrong one beside it, and this app never writes Estonian of its own",
  "topic:collocation|Words that mean the same but can't swap places":
    "it needs the swap that doesn't work, which would mean writing Estonian nobody ever said",
  "topic:collocation|The last thing learned, the first thing noticed":
    "it's about how people pick this up, not about the language itself",
  "topic:irony|Carried by tone of voice, understatement and context":
    "tone of voice and situation carry it, and a recorded sentence arrives without either",
  "topic:irony|Understatement is the most common kind here":
    "you only hear understatement in the situation it was said in, and the dictionary doesn't record that",
  "topic:irony|Rarely signalled, so you have to pick up on it":
    "the point is that nothing marks it, and no sentence can show an absence on its own",
  "topic:nuance|Told apart by how formal, how strong or how loaded they are":
    "it's a difference between two words, so it needs both, and the dictionary files a sentence under just one",
  "topic:nuance|Shades a bilingual dictionary flattens":
    "it's about what a translation leaves out, and the English under a sentence would leave it out too",
  "topic:nuance|Learned from real sentences, not from definitions":
    "it's advice on how to learn this, not something you can see in a sentence",
  "topic:variation|Regional dialects, some quite far from the standard":
    "the dictionary records standard Estonian, so there's nothing dialectal in it to point at",
  "topic:variation|The gap between written Estonian and how people talk":
    "it's the distance between writing and speech, and what gets recorded is only one end of it",
  "topic:variation|Older and literary forms you still meet reading":
    "the dictionary records Estonian as it's used today, so the older forms this is about aren't in it",
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
