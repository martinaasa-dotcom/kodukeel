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
      { lemma: "sünnipäev", et: "Mul on täna sünnipäev.", form: "on" },
      { lemma: "väga", et: "Te olete väga sarnased.", form: "olete" },
    ],
    "Having something is said as it being at you, with -l": [
      { lemma: "oma", et: "Mul on oma maja.", form: "Mul" },
      { lemma: "perekond", et: "Tal on suur perekond.", form: "Tal" },
    ],
    "Feelings, needs and obligations run on the same pattern": [
      { lemma: "uni", et: "Mul on kange uni.", form: "Mul" },
      { lemma: "isu", et: "Tal on hea isu.", form: "Tal" },
    ],
  },
  "present-tense": {
    "Six person endings on a stem": [
      { lemma: "alustama", et: "Alustame tööd esmaspäeval.", form: "Alustame" },
      { lemma: "nädalavahetus", et: "Mida te nädalavahetusel teete?", form: "teete" },
    ],
    "Covers both English presents at once": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "sööb" },
      { lemma: "magama", et: "Karu magab talveund.", form: "magab" },
    ],
    "Does the future as well, since there is no future tense": [
      { lemma: "toimuma", et: "Kontsert toimub homme.", form: "toimub" },
      { lemma: "esindaja", et: "Kahe riigi esindajad kohtuvad homme.", form: "kohtuvad" },
    ],
  },
  negation: {
    "The verb goes back to a bare stem": [
      { lemma: "aeg", et: "Aeg ei peatu.", form: "peatu" },
      { lemma: "leidma", et: "Ma ei leia oma rahakotti.", form: "leia" },
    ],
    "One word covers every person, unlike do not and does not": [
      { lemma: "juuksur", et: "Mulle ei meeldi juuksuris käia.", form: "ei" },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "ei" },
    ],
    "The past is negated differently from the present": [
      { lemma: "isa", et: "Isa ja ema ei olnud kodus.", form: "olnud" },
      { lemma: "juhuslik", et: "Koha valik polnud juhuslik.", form: "polnud" },
    ],
  },
  imperfect: {
    "Built on the second infinitive's stem, with -si- after it": [
      { lemma: "meri", et: "Käisin meres ujumas.", form: "Käisin" },
      { lemma: "mets", et: "Eksisin metsa ära.", form: "Eksisin" },
    ],
    "A short list of common verbs takes -i- instead": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "Jõin" },
      { lemma: "kala", et: "Kala ujus sügavamale.", form: "ujus" },
    ],
    "Used for completed events, however recent": [
      { lemma: "jooma", et: "Jõin tassi kohvi.", form: "Jõin" },
      { lemma: "algus", et: "Ootasime kontserdi algust.", form: "Ootasime" },
    ],
  },
  perfect: {
    "Built from to be, never from to have": [
      { lemma: "kiirabi", et: "Mare on aastaid kiirabis töötanud.", form: "on" },
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "on" },
    ],
    "Used where the result matters more than the event": [
      { lemma: "sügis", et: "Värviline sügis on kätte jõudnud.", form: "jõudnud" },
      { lemma: "käärid", et: "Käärid on nüriks läinud.", form: "läinud" },
    ],
    "The participle never changes for person": [
      { lemma: "eestikeelne", et: "Ta on saanud eestikeelse hariduse.", form: "saanud" },
      { lemma: "traditsioon", et: "Laulupeod on Eestis traditsiooniks saanud.", form: "saanud" },
    ],
  },
  pluperfect: {
    "An event finished before another past event": [
      { lemma: "vistrik", et: "Näkku oli tekkinud uus vistrik.", form: "oli" },
      { lemma: "isand", et: "Kohale olid tulnud tähtsad vaimulikud isandad.", form: "olid" },
    ],
    "Common in stories and in reported speech": [
      { lemma: "nõges", et: "Risuhunnik oli nõgestesse kasvanud.", form: "oli" },
    ],
    "Uses exactly the participle the perfect uses": [
      { lemma: "nõges", et: "Risuhunnik oli nõgestesse kasvanud.", form: "kasvanud" },
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "kasvanud" },
    ],
  },
  conditional: {
    "Hypotheticals and their consequences": [
      { lemma: "elukoht", et: "Hea, kui elukoht asuks töökoha lähedal.", form: "asuks" },
      { lemma: "kündma", et: "Kui oleksin maal edasi, künnaksin traktoriga põldu.", form: "oleksin" },
    ],
    "Softening a request so a stranger does not find it blunt": [
      { lemma: "paluma", et: "Ma tahaksin sinult midagi paluda.", form: "tahaksin" },
      { lemma: "külmik", et: "Tahaksin vana külmiku tasuta ära anda.", form: "Tahaksin" },
    ],
    "Giving advice without issuing an order": [
      { lemma: "hambaarst", et: "Kui hammas valutab, siis peaksid hambaarsti juurde minema.", form: "peaksid" },
      { lemma: "arutama", et: "Neid probleeme tuleks koosolekul arutada.", form: "tuleks" },
    ],
  },
  imperative: {
    "Separate singular and plural forms, unlike English": [
      { lemma: "istuma", et: "Istu minu kõrvale.", form: "Istu" },
      { lemma: "puhas", et: "Peske käed puhtaks.", form: "Peske" },
    ],
    "The plural doubles as the polite form for one person": [
      { lemma: "tualett", et: "Palun öelge, kus siin tualett on.", form: "öelge" },
      { lemma: "saatma", et: "Saatke mulle takso.", form: "Saatke" },
    ],
    "Negated with its own word": [
      { lemma: "vaatama", et: "Ära otse päikesesse vaata!", form: "Ära" },
      { lemma: "rumal", et: "Ära ole rumal!", form: "Ära" },
    ],
  },
  impersonal: {
    "Notices, instructions, official prose and news": [
      { lemma: "magustoit", et: "Dessertveini serveeritakse koos magustoiduga.", form: "serveeritakse" },
      { lemma: "kontrollima", et: "Doonoril kontrollitakse vererõhku.", form: "kontrollitakse" },
    ],
    "Says people did something, without saying which people": [
      { lemma: "nimetama", et: "Kuidas seda asutust nimetatakse?", form: "nimetatakse" },
      { lemma: "hobi", et: "Ratsutamist peetakse kulukaks hobiks.", form: "peetakse" },
    ],
  },
  "past-participle": {
    "Combines with to be for have done and had done": [
      { lemma: "vale", et: "Oled elanud vales.", form: "elanud" },
      { lemma: "jutt", et: "Meil pole sellest juttu olnud.", form: "olnud" },
    ],
    "Describes a noun as having done something": [
      { lemma: "vihik", et: "Ilmunud vihik tegi luuletajale palju rõõmu.", form: "Ilmunud" },
    ],
    "Has an impersonal twin for things done to something": [
      { lemma: "kook", et: "Vanaema küpsetatud kook.", form: "küpsetatud" },
      { lemma: "pilt", et: "Laste joonistatud pildid.", form: "joonistatud" },
    ],
  },
  participles: {
    "Used to describe a noun the way an adjective would": [
      { lemma: "mobiiltelefon", et: "Mobiiltelefoniga tehtud fotod.", form: "tehtud" },
      { lemma: "masin", et: "Masinal kootud vaip.", form: "kootud" },
    ],
    "Carry the perfect and pluperfect with the auxiliary": [
      { lemma: "elanik", et: "Riigi elanike arv on kasvanud.", form: "kasvanud" },
      { lemma: "vistrik", et: "Näkku oli tekkinud uus vistrik.", form: "tekkinud" },
    ],
  },
  politeness: {
    "The plural as a polite singular with strangers": [
      { lemma: "kohv", et: "Kas te soovite teed või kohvi?", form: "soovite" },
      { lemma: "või", et: "Kas te maksate sularahas või ülekandega?", form: "maksate" },
    ],
    "The conditional to soften a request": [
      { lemma: "paluma", et: "Ma tahaksin sinult midagi paluda.", form: "tahaksin" },
      { lemma: "külmik", et: "Tahaksin vana külmiku tasuta ära anda.", form: "Tahaksin" },
    ],
    "Directness is less rude here than English speakers expect": [
      { lemma: "tualett", et: "Palun öelge, kus siin tualett on.", form: "öelge" },
      { lemma: "saatma", et: "Saatke mulle takso.", form: "Saatke" },
    ],
  },
  "time-expressions": {
    "Days, seasons and years take -l; months take -s": [
      { lemma: "teisipäev", et: "Koosolek toimub teisipäeval.", form: "teisipäeval" },
      { lemma: "juuli", et: "Lähen juulis puhkusele.", form: "juulis" },
    ],
    "Duration is expressed differently again": [
      { lemma: "kirurg", et: "Kirurg tegi päeva jooksul kolm operatsiooni.", form: "jooksul" },
      { lemma: "kestma", et: "Film kestis kaks tundi.", form: "tundi" },
    ],
    "From and until each have their own ending": [
      { lemma: "esmaspäev", et: "Käin tööl esmaspäevast reedeni.", form: "esmaspäevast" },
      { lemma: "pääsuke", et: "Pääsuke laulab aprillist augustini.", form: "augustini" },
    ],
  },
  aspect: {
    "A finished action takes a whole object": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto" },
      { lemma: "taldrik", et: "Sõin taldriku tühjaks.", form: "taldriku" },
    ],
    "An unfinished or partial one takes the partitive": [
      { lemma: "tort", et: "Sõin tüki torti.", form: "torti" },
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett" },
    ],
    "Particles reinforce completion": [
      { lemma: "kartul", et: "Palun koori kartulid ära.", form: "ära" },
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", form: "otsa" },
    ],
  },
  infinitives: {
    "The -ma one follows starting, going and having to": [
      { lemma: "kook", et: "Ema hakkab kooki küpsetama.", form: "küpsetama" },
      { lemma: "orkester", et: "Orkester hakkas mängima.", form: "mängima" },
    ],
    "The -da one follows wanting and being able": [
      { lemma: "valuuta", et: "Kus saab valuutat vahetada?", form: "vahetada" },
      { lemma: "võima", et: "Ma võin jälle kõndida!", form: "kõndida" },
    ],
  },
  "particle-verbs": {
    "The particle usually adds completion or direction": [
      { lemma: "veekeetja", et: "Lülita veekeetja sisse.", form: "sisse" },
      { lemma: "tõmbama", et: "Tõmba uks kinni.", form: "kinni" },
    ],
    "Often the difference between doing and finishing": [
      { lemma: "lamp", et: "Lamp põles läbi.", form: "läbi" },
      { lemma: "talu", et: "Talu põles maha.", form: "maha" },
    ],
    "It moves around the sentence rather than staying put": [
      { lemma: "televiisor", et: "Pane televiisor kinni.", form: "kinni" },
      { lemma: "kraan", et: "Keerasin kraani kinni.", form: "kinni" },
    ],
  },
  converb: {
    "Two simultaneous actions without a conjunction": [
      { lemma: "ige", et: "Naerdes paljastusid laiad esihambad ja igemed.", form: "Naerdes" },
      { lemma: "tatt", et: "Mees köhib tatti pritsides.", form: "pritsides" },
    ],
    "Strongly preferred in writing over two joined clauses": [
      { lemma: "pidur", et: "Peo edenedes pidurid kadusid.", form: "edenedes" },
    ],
    "Its subject is understood to be the main clause's": [
      { lemma: "viibima", et: "Ta kuulis juhtunust puhkusel viibides.", form: "viibides" },
      { lemma: "üllatuma", et: "Ta oli auhinnast kuuldes rõõmsalt üllatunud.", form: "kuuldes" },
    ],
  },
  quotative: {
    "Reported speech, rumor and hearsay": [
      { lemma: "tammetõru", et: "Tammetõrude rohkus ennustavat karmi talve.", form: "ennustavat" },
      { lemma: "aus", et: "Aus ülestunnistus pidavat karistust kergendama.", form: "pidavat" },
    ],
    "Can carry doubt, depending on delivery": [
      { lemma: "väitma", et: "Mees väidab end mitte teadvat, kuhu ta auto jättis.", form: "teadvat" },
    ],
  },
  numerals: {
    "After two and up, the counted noun is partitive singular": [
      { lemma: "pirn", et: "Aias kasvab kolm pirni.", form: "pirni" },
      { lemma: "pudel", et: "Ostsin kaks pudelit vett.", form: "pudelit" },
    ],
    "Numbers themselves decline when the phrase is in a case": [
      { lemma: "minut", et: "Buss tuleb viie minuti pärast.", form: "viie" },
      { lemma: "broneerima", et: "Broneerisin laua kahele.", form: "kahele" },
    ],
    "Ordinals are regular and decline too": [
      { lemma: "baar", et: "Hotelli baar asub esimesel korrusel.", form: "esimesel" },
      { lemma: "lennuk", et: "Laps sõidab lennukiga esimest korda.", form: "esimest" },
    ],
  },
  derivation: {
    "An action noun from any verb, entirely regular": [
      { lemma: "võõras", et: "Vabandamine on talle võõras.", form: "Vabandamine" },
    ],
    "Adjectives meaning like it, and meaning without it": [
      { lemma: "idee", et: "Toetan demokraatlikke ideid.", form: "demokraatlikke" },
      { lemma: "abikaasa", et: "Abikaasad on võrdõiguslikud.", form: "võrdõiguslikud" },
    ],
    "A quality noun from an adjective": [
      { lemma: "sõprus", et: "Meid seob ammune sõprus.", form: "sõprus" },
      { lemma: "rikkus", et: "Ega rikkus pole häbiasi.", form: "rikkus" },
    ],
  },
  "word-order": {
    "Endings mark who did what, so order is free for other work": [
      { lemma: "talv", et: "Talvel sadas palju lund.", form: "Talvel" },
      { lemma: "toimuma", et: "Eile toimus mitu õnnetust.", form: "Eile" },
    ],
    "The verb tends to sit second in a main clause": [
      { lemma: "alustama", et: "Homme alustan dieeti.", form: "alustan" },
      { lemma: "kütma", et: "Õhtul kütan sauna.", form: "kütan" },
    ],
  },
  idiom: {
    "Sayings still in daily use": [
      { lemma: "ilu", et: "Ilu peitub vaataja silmades.", form: "silmades" },
      { lemma: "põhimõte", et: "Lähtusin põhimõttest, et topelt ei kärise.", form: "kärise" },
    ],
    "Fixed verb phrases that resist a literal reading": [
      { lemma: "tööline", et: "Häid töölisi otsitakse tikutulega taga.", form: "tikutulega" },
      { lemma: "naer", et: "Olime kõik naerust kõveras.", form: "kõveras" },
    ],
    "Figurative senses of ordinary words": [
      { lemma: "suvi", et: "Suvi on käes.", form: "käes" },
      { lemma: "hambapasta", et: "Hambapasta sai otsa.", form: "otsa" },
    ],
  },
  "adjective-agreement": {
    "Same case and same number as the noun": [
      { lemma: "liha", et: "Ostsin turult värsket liha.", form: "värsket" },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "rasvast" },
    ],
    "For -ni, -na, -ta and -ga the adjective stops at the genitive": [
      { lemma: "aeglane", et: "Aeglase vooluga jõgi.", form: "Aeglase" },
      { lemma: "lõpp", et: "Õnneliku lõpuga film.", form: "Õnneliku" },
    ],
  },
  comparative: {
    "Built on the genitive stem, like nearly everything": [
      { lemma: "väike", et: "Anna väiksem lusikas!", form: "väiksem" },
      { lemma: "parem", et: "Kumb auto on parem?", form: "parem" },
    ],
    "Say than and use the plain form, or drop than and use -st": [
      { lemma: "diisel", et: "Bensiin on kallim kui diisel.", form: "kui" },
    ],
    "A handful of common adjectives are irregular": [
      { lemma: "parem", et: "Kumb auto on parem?", form: "parem" },
    ],
  },
  superlative: {
    "A helper word plus the comparative, which always works": [
      { lemma: "veebruar", et: "Veebruar on tavaliselt aasta kõige külmem kuu.", form: "kõige" },
      { lemma: "ingel", et: "Sa oled mu ingel, mu kõige kallim!", form: "kõige" },
    ],
  },
  future: {
    "A time expression is what makes a sentence future": [
      { lemma: "toimuma", et: "Kontsert toimub homme.", form: "homme" },
      { lemma: "abielupaar", et: "Nendest saab varsti abielupaar.", form: "varsti" },
    ],
    "Verbs of planning and intending carry the rest": [
      { lemma: "kook", et: "Ema hakkab kooki küpsetama.", form: "hakkab" },
      { lemma: "koguma", et: "Kogun raha, et uut autot osta.", form: "Kogun" },
    ],
    "A particle can imply something is going to finish": [
      { lemma: "kütus", et: "Autol hakkab kütus otsa saama.", form: "otsa" },
      { lemma: "pastakas", et: "Pastakas hakkab tühjaks saama.", form: "tühjaks" },
    ],
  },
  object: {
    "A finished action on a whole thing: genitive or plain form": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto" },
      { lemma: "panema", et: "Pane raamat lauale.", form: "raamat" },
    ],
    "Unfinished, or only part of it: partitive": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett" },
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "banaani" },
    ],
    "Anything negated: partitive, always": [
      { lemma: "ulme", et: "Ma ei loe ulmet.", form: "ulmet" },
      { lemma: "sealiha", et: "Ta ei söö rasvast sealiha.", form: "sealiha" },
    ],
  },
  "reported-speech": {
    "A conjunction plus a clause, closest to English": [
      { lemma: "imelik", et: "Imelik, et teda kodus pole.", form: "et" },
      { lemma: "elus", et: "Ma olin viimane, kes teda elusana nägi.", form: "kes" },
    ],
    "Or the quotative, which needs no reporting verb": [
      { lemma: "tammetõru", et: "Tammetõrude rohkus ennustavat karmi talve.", form: "ennustavat" },
    ],
  },
  concession: {
    "Adverbs that carry it across a full stop": [
      { lemma: "kokkuvõttes", et: "Esinemine oli kokkuvõttes siiski rahuldav.", form: "siiski" },
      { lemma: "kõhklema", et: "Mari kõhkles hetke, ent siis otsustas teistega kaasa minna.", form: "ent" },
    ],
  },
  hedging: {
    "Adverbs and adjectives of likelihood": [
      { lemma: "vist", et: "Ema vist magab juba.", form: "vist" },
      { lemma: "vist", et: "Hakkab vist sadama.", form: "vist" },
    ],
    "The quotative, which puts the claim on somebody else": [
      { lemma: "aus", et: "Aus ülestunnistus pidavat karistust kergendama.", form: "pidavat" },
    ],
    "The conditional, which softens a claim as well as a request": [
      { lemma: "elukoht", et: "Hea, kui elukoht asuks töökoha lähedal.", form: "asuks" },
      { lemma: "arutama", et: "Neid probleeme tuleks koosolekul arutada.", form: "tuleks" },
    ],
  },
  cohesion: {
    "Contrast and consequence": [
      { lemma: "tõsi", et: "Kurb, aga tõsi.", form: "aga" },
      { lemma: "välk", et: "Müristab, aga välku ei löö.", form: "aga" },
    ],
    "Ordering and adding: first, also, finally": [
      { lemma: "pühak", et: "Patukotist sai lõpuks pühak.", form: "lõpuks" },
      { lemma: "lehtpuu", et: "Leiliruumi lagi ja seinad, samuti lava on lehtpuust.", form: "samuti" },
    ],
    "Referring back without repeating the noun": [
      { lemma: "kiikuma", et: "Kiikusin toolil ja see läks katki.", form: "see" },
      { lemma: "petma", et: "Ära usu Jaani, ta petab.", form: "ta" },
    ],
  },
  emphasis: {
    "Small particles that mark the focus": [
      { lemma: "kuulama", et: "Kuulake mind ka!", form: "ka" },
      { lemma: "leib", et: "Määri leivale võid ka.", form: "ka" },
    ],
  },
  "rhetorical-questions": {
    "A particle marks a genuine yes or no question": [
      { lemma: "kohv", et: "Kas te soovite teed või kohvi?", form: "Kas" },
      { lemma: "vann", et: "Kas täna vanni teeme?", form: "Kas" },
    ],
  },
  subordination: {
    "Word order shifts inside the clause": [
      { lemma: "firma", et: "Töötan firmas, mis toodab autode varuosi.", form: "mis" },
    ],
  },
  "relative-clause": {
    "Always separated by a comma": [
      { lemma: "nimekiri", et: "Tegin nimekirja asjadest, mida poest tuua.", form: "mida" },
    ],
    "Different pronouns for people and for things": [
      { lemma: "elus", et: "Ma olin viimane, kes teda elusana nägi.", form: "kes" },
      { lemma: "teadus", et: "Bioloogia on teadus, mis uurib elu.", form: "mis" },
    ],
    "Its case is decided inside the relative clause": [
      { lemma: "režissöör", et: "Ta on hea režissöör, kelle filme tasub vaadata.", form: "kelle" },
      { lemma: "nimekiri", et: "Tegin nimekirja asjadest, mida poest tuua.", form: "mida" },
    ],
  },
  government: {
    "The required case is a fact about the verb": [
      { lemma: "uskuma", et: "Ta usub Jumalasse.", form: "Jumalasse" },
      { lemma: "pall", et: "Laps mängib palliga.", form: "palliga" },
    ],
    "Helping, calling, liking and thinking are the traps": [
      { lemma: "juuksur", et: "Mulle ei meeldi juuksuris käia.", form: "Mulle" },
      { lemma: "mõtlema", et: "Millest sa mõtled?", form: "Millest" },
    ],
  },
};

/** The same, keyed by case key, then by the use as `CASE_NOTES` words it. */
export const CASE_EXAMPLES: Readonly<Record<string, PointPins>> = {
  NOMINATIVE: {
    "Who or what is doing the verb": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "Ahv" },
      { lemma: "magama", et: "Karu magab talveund.", form: "Karu" },
    ],
    "A whole object, in the plural or after a command": [
      { lemma: "panema", et: "Pane raamat lauale.", form: "raamat" },
      { lemma: "kartul", et: "Palun koori kartulid ära.", form: "kartulid" },
    ],
  },
  GENITIVE: {
    "Saying whose something is": [
      { lemma: "uus", et: "Uue filmi esilinastus.", form: "filmi" },
      { lemma: "klient", et: "Rahulolev klient on iga firma unistus.", form: "firma" },
    ],
    "A finished, whole object": [
      { lemma: "odav", et: "Ostsin odava auto.", form: "auto" },
      { lemma: "taldrik", et: "Sõin taldriku tühjaks.", form: "taldriku" },
    ],
  },
  PARTITIVE: {
    "Some of a thing rather than all of it": [
      { lemma: "vesi", et: "Jõin klaasi vett.", form: "vett" },
      { lemma: "tort", et: "Sõin tüki torti.", form: "torti" },
    ],
    "An action still going on": [
      { lemma: "ahv", et: "Ahv sööb banaani.", form: "banaani" },
      { lemma: "algus", et: "Ootasime kontserdi algust.", form: "algust" },
    ],
    "After any number above one": [
      { lemma: "kott", et: "Kolm kotti kartuleid.", form: "kotti" },
    ],
  },
  ILLATIVE: {
    "Going into a place or a container": [
      { lemma: "vihik", et: "Kirjuta ülesanne vihikusse.", form: "vihikusse" },
      { lemma: "trepp", et: "See trepp viib keldrisse.", form: "keldrisse" },
    ],
    "Going into a state or a stretch of time": [
      { lemma: "õnnetus", et: "Buss sattus õnnetusse.", form: "õnnetusse" },
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
      { lemma: "lõuna", et: "Ta magas lõunani.", form: "lõunani" },
      { lemma: "näitus", et: "Näitus jääb avatuks sügiseni.", form: "sügiseni" },
    ],
    "Up to an amount": [
      { lemma: "arv", et: "Arvud ühest kümneni.", form: "kümneni" },
    ],
  },
  ESSIVE: {
    "Working as something": [
      { lemma: "juuksur", et: "Ta töötab juuksurina.", form: "juuksurina" },
      { lemma: "arhitekt", et: "Ema töötab arhitektina.", form: "arhitektina" },
    ],
    "A role or a capacity you are in for now": [
      { lemma: "vallaline", et: "Marie suri vallalisena.", form: "vallalisena" },
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
    "How you got there": [
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
    "a pattern across words rather than one sentence, and the exceptions area lists the words it happens to",
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
  "topic:superlative|A one-word form, shorter and more literary":
    "the corpus holds no short superlative in a sentence a beginner could read, so the helper-word form is the one shown above",
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
