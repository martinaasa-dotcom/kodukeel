/**
 * WHICH OF TODAY'S NEWS IS GOOD NEWS, DECIDED AS STRICTLY AS A MACHINE CAN.
 *
 * Today carries one headline a day from ERR, the national broadcaster, and
 * the operator's rule for it is that it is only ever good news: something
 * opened, somebody won, a discovery, a festival, a record, a kindness. Never
 * a death, an accident, a war, a court case, a price rise, a warning or an
 * argument in parliament, even one that ends well. A learner opens this page
 * every morning, often tired, and the one piece of real Estonian on it should
 * be a reason to smile, not a reason to close the app.
 *
 * TWO LISTS, AND NO MODEL. A list of word stems that mean bad news refuses a
 * headline outright, and it errs on purpose toward refusing: `põlevkivi` is
 * shale and not a fire, and it is refused anyway, because a good-news card
 * that misses a good story costs nothing and one that shows a bad story costs
 * the whole card. What clears it then has to carry a stem that means good
 * news (`opened`, `won`, `discovered`, `award`). No model is asked: the
 * operator's call, so the rule is the same on every deployment, costs
 * nothing, and is checked here against a sample of real ERR headlines rather
 * than trusted to a judgment nobody can read.
 *
 * THE WORD LISTS ARE A FILTER AND NOT ESTONIAN WE TEACH. They are never shown,
 * never a form, never a card: they are spellings matched inside somebody
 * else's headline to decide whether to show it at all (ADR-005 is about what
 * reaches a learner as Estonian, and none of this does). The headline itself
 * is printed exactly as the feed wrote it.
 *
 * Pure: strings in, decisions out. No network, no database, no clock.
 */
import type { NewsItem } from "./headlines";

/*
  Bad news, as stems matched inside the folded text, so a compound
  (`liiklusõnnetus`, `droonirünnak`) is caught by its part. A stem may catch
  an innocent word as well; that is the side this errs on. A space stands for
  a word's edge.

  TWO LISTS, BECAUSE A SUMMARY EXPLAINS. `HARM` is something that hurt
  somebody or something: death, violence, war, an accident, an illness, an
  animal story gone wrong, a loss, a closure. It is read over the headline
  and the summary both, so a happy headline with an accident in its second
  sentence is still refused. `OFF_TOPIC` is what is merely not a smile:
  business, the economy, politics, the weather, a price, and the soft words
  (`keeruline`, `raske`, `probleem`) a science summary uses about its own
  method. It is read over the headline alone. Read over the summary as well,
  it refused every science story ERR ran on 2026-11-07, because a summary
  explaining a bat's record mentions Europe and one explaining an ant study
  says the thing is hard to study. What a story is about is the headline's
  to say; the summary may only veto it for harm.
*/
const HARM = [
  // death, violence, crime
  "surm", "surn", "suri ", "surid", "hukk", "tapp", "tapet", "mõrv", "vägist", "rünn", "ründ",
  "kuritegu", "kurite", "kurjateg", "varas", "varga", "vargus", "varast", "pettu", "petis", "kelm",
  "korrupt", "altkäemaks", "kohus", "kohtu", "süüdi", "süüdist", "vangi", "vangl", "karist",
  "trahv", "arreteer", "kahtlust", "politsei", "relv", "tulista", "lask", "rööv", "pussi", "peks",
  "ohver", "kannatan", "salasigar", "tolli", "kinni pid", "pidasid kinni", "smugel", "narko",
  "joobe", "laip", "laiba", " haud ", " hauda", " haua", "põgene", "nuga", "noa ", "piina",
  "kiusa", "väärkoht",
  // war and its places
  "sõda", "sõja", "agress", "terror", "plahvat", "pomm", "raket", "droon", "okupat", " vene",
  " putin", " ukrain", " gaza", " iisrael", " hamas", " iraan", " nato", "kaitseväg", "väge",
  "väed", "armee", "sõdur", "mobilis", "sanktsio", "diktaator",
  // accidents and disasters
  "õnnetu", "avarii", "kokkupõr", "tulekahj", "põle", "uppu", "torm", "üleujut", "tulv", "põud",
  "maavärin", "orkaan", "evakuee", "pääst", "rike", "rikke", "katki", "kahjust", "purune",
  "lammut", "varing", "reost", "nafta", "alla aja", "alla aeti", "otsa sõit",
  // illness and health
  "haig", "vigast", "haav", "epideem", "pandeem", "viirus", "gripp", "nakk", "nakat", "vähk",
  "vähi", "enesetap", "sõltuvus", "sõltlas", "alkohol", "operatsio", "opereer", "diagnoos",
  "ravi", "sinivetik", "toksil", "mürk", "kiirabi", "surev", "puue", "dement", "rasvum",
  "depress", "maruta", "puuk",
  // an animal story gone wrong
  "murdis", "murrab", "tungi", "jaht", "jahi", "küti", "salaküt", "hammust", "kahjur", "invasiiv",
  "võõrliik", "hävi", "suremi", "väljasur", "välja sur", "kõhnu", "hülja", "lõks", "tapa", "kvoot",
  "pestits", "kahane", "vähene", "langus", "hääbu", "nälg", "oht", "ohu",
  // dread, sorrow and loss
  "hirm", "kurb", "lein", "kaotus", "kaota", "kadun", "kadus", "kannat", "valu", "üksild",
  "ärev", "katastroof", "kriis", "katk", "hullus", "huligaan", "kadalipp", "ellujää", "abivaja",
  "naeruvää", "hädas",
  // farewells and memorials
  "memoriam", "elust lahk", "matus", "mälest", "igavikku", "lahkunu", "hüvast",
  // plans that fell through, closures, people leaving
  " ära ", "sulgu", "lükkub", "lükatakse", "lükati", "edasi lükk", "edasilük", "lükka", "tühista",
  "jääb ära", "jäi ära", "suletakse", "suleti", "sulgeb", "sulge", "tagasi astu", "astus tagasi",
  "vallandat", "koonda", "pankrot", "streik", "protest", "meeleavald", "meelt aval", "skandaal",
  // sport results that are somebody's loss
  "pudene", "alistu", "kukkus välja", "jäi alla", "kaotu", "alla jäi", "viik", "nullile",
  "loovuta", "võiduta", "doping", "keelu",
];

const OFF_TOPIC = [
  // the other side of the world's politics, named rather than fought
  " hiina", " trump", " usa ", " usa-", "kaitse",
  // money, business and the economy
  "kahjum", "kärbe", "kärbi", "inflats", " hind ", " hinda ", " hinnad", "hinnatõus", "hinna tõus",
  "hinnaga", "kallin", "maks", "võlg", "vaesus", "vaene", "vaese", "töötu", "majandus", "eksport",
  "import", "kasum", "käive", "investee", "tehing", "pank", "panga", "börs", "aktsia", "laen",
  "intress", "palk", "pension", "eelarve", "raha", "eur ", "euro", "miljon", "miljard",
  "protsent", "kulu", "firma", "ettevõt", "kontsern", "osta", "müü", "turul", "turu ",
  "konkurents", "energ", "elektri", "gaasi", "kütte", "tasu", "megavat", "akupark", "tolli",
  // politics, the state and argument
  "valitsus", "minist", "riigikogu", "parlament", "senat", "erakond", "partei", "valimis",
  "umbusald", "president", "peaminist", "linnapea", "volikogu", "seadus", "eelnõu", "keeld",
  "keela", "määrus", "järelevalve", "menetlus", "uurima", "uurib", "tüli", "vaidl", "vaidle",
  "süüdista", "kriitik", "kritiseer", "populist", "kurd", "rikutakse", "nõua", "nõud",
  "hoiatus", "hoiat", "poliitik", "ametnik", "ministeer", "küsitlus", "toetus", "juhatus",
  "lahkub", "lahkus", "peata", "peatub", "peatas", "lõpetab",
  // health as a subject, and the soft words a summary uses about its method
  "tervis", " arst", "stress", "mure", "probleem", "raske", "halb", "halv", "kahju", "puudu",
  "keeruli", "segadus", "valesti", "virel", "ebamugav", "eelarvamus", "lõhe", "ilmajäet", "mäsu",
  "madal", "kehv", "kadu", "vähem", "vähe ", "langes", "murend", "kliima", "soojene", "osoonia",
  " auk", "eba", "risk", "neela", "kuum", "viimane",
  // weather reports
  "temperatuur", "sünoptik", "kraadi", "veetase", "sadu", "sajab", "tuul", "külm", "pakane",
  // endings, delays and hedges
  "lõpe", "lõpp", " vaid ", "juhuks",
];

/*
  Good words that carry a bad stem inside them, taken out of the text before
  the bad list reads it: `auhind` is an award and holds `hind`, a price.
*/
const INNOCENT = ["auhin", "aukoh", "auto", "maastik", "maaliline"];

/*
  Good news, read off the headline alone: it has to say a happy thing
  happened, not mention one in passing in the summary. A leading space means
  the word starts there, which is what keeps `avati` (opened) from being found
  inside `megavatine`; a noun is matched anywhere, so a compound
  (`filmifestival`, `fotonäitus`) still counts.

  WHICH KIND OF GOOD, SO THE CARD IS NOT EIGHT GALLERIES. The first version
  had one list and it was a culture desk's: what an opening, a premiere and a
  prize sound like. On 2026-11-07 every one of the eighteen picks off ERR's
  three feeds was a gallery, a festival or a concert, while the science feed
  that morning carried a bat in Piusa setting a world record for its age, a
  Tartu robot butterfly growing a new sense organ and a raven deciding twice
  as fast as an ape, and not one of its fifty items got through. So each kind
  of good news has its own words, a pick says which kind it is, and
  `lib/dict/goodNews.ts` deals the card across the kinds rather than in the
  feeds' order. The bad-news list above is unchanged in force and read first
  for every kind: a wider net for good news is never a looser one for bad.
*/
export type GoodKind = "nature" | "science" | "achievement" | "culture" | "together";

/** Every kind, in the order a pick is classified: the most particular first. */
export const GOOD_KINDS: readonly GoodKind[] = ["nature", "science", "achievement", "culture", "together"];

const KIND_STEMS: Record<GoodKind, readonly string[]> = {
  // a birth, a return, a species doing well (the animal itself is read below)
  nature: [
    " sündis", " sündisid", " poegi", " talled", " tibud", " kutsikad", " pesitse", " naasis",
    " naasid", " taastus", " taastub", " paljune", " õitse", " õitses",
  ],
  // a finding, a first, a thing made to work
  science: [
    " avastasid", " avastati", " avastas", " leidsid", " töötasid välja", " arendasid",
    " kasvatas", " lahendasid", " lahendas", "läbimurre", " saladus", "mõistatus", " esmakordselt",
    " esimest korda", " õnnestus", " aitab ", " aitavad ", " suudab", " suudavad", " oskab",
    " oskavad", " parandab", " pikendab",
  ],
  // an award, a win, a record
  achievement: [
    " pälvis", " võitis", " võitsid", " võidutse", " tunnustati", "auhin", "preemi", " parimaks",
    " aasta parim", " valiti aasta", " valis aasta", "aastaks valiti", "tiitli", "kuldmedal",
    "medali", " püstitas",
  ],
  // a premiere, a show, a festival
  culture: [
    " esilinastu", " teleesilinastu", " esietendu", " tõi lavale", " jõuab lavale", "festival",
    "laulupidu", "laulupeo", "tantsupidu", "tantsupeo", "kontsert", "näitus", " esines", " esineb",
  ],
  // something opened, a celebration, a kindness
  together: [
    " avati", " avatakse", " taasavati", " taasavatakse", " avas ", " avasid", " avab uksed",
    " avavad uksed", " valmis ", " valmisid", " tähista", "sünnipäev", "juubel", "pidu ", "peoga",
    " kinki", " annetas", "rõõm", " edukalt",
  ],
};

/*
  An animal, matched where its word starts so `karu` is never `karusell`, and
  anywhere for the compounds Estonian makes of them (`robotliblikas`,
  `mustvares`, `hülgepoeg`). An animal is not good news on its own: a wolf
  that killed sheep is an animal headline. What clears one is a word from
  `KIND_STEMS` or a fact told about what it can do, below, and the bad-news
  list carries the ways an animal story goes wrong (`murd`, `ründ`, `jaht`,
  `hammust`, `maruta`, `hukk`).
*/
const ANIMALS = [
  "nahkhiir", "nahkhiire", "hüljes", "hülge", "delfiin", "vaala", " vaal ", "kotka", "kotkas",
  "toonekur", " kurg", " kure", "ilves", "mesilas", "kimalas", "liblika", "liblikas", "sipelga",
  "sipelgas", " konn", "kilpkonn", " siil", " orav", "rebas", "rebane", "hirv", "põtra", "põdra",
  "põder", "karupoeg", " karu ", " karud", " hunt", " hundi", " hunte", " koer", "kutsika",
  "kassipoeg", " kass ", " kassid", "loomaaed", "loomaaia", "pingviin", "elevant", "kaelkirjak",
  " lõvi", "tiiger", "tiigri", " ahv", "papagoi", "öökull", " kakk", " luik", " luige", " lind",
  " linnu", " lindu", "vares", "rähn", "varblane", " kala ", " kalad", "forell", "mardikas",
  "putuk", "dinosaur", "vaalhai", " liigi", " liike", " liiki", " loom", " looma",
];

/*
  What an animal can do, said as a fact: `Mustvares teeb otsuseid kiiremini`,
  `Mesilasperel on ühine immuunsüsteem`. These read as good news only beside
  an animal; on a person or a party they are an argument.
*/
const ANIMAL_FACTS = [
  " teeb ", " teevad ", " tunneb ", " tunnevad ", " mäletab", " mäletavad", " kasutab",
  " kasutavad", " laulab", " laulavad", " suhtleb", " suhtlevad", " mängib", " mängivad",
  " on ühine", " on oma", " rohkem", " kasvas", " kasvab", " nähti", " märgati", " pildistati",
];

/*
  A study reported under its own label (`Uuring: ...`, `Doktoritöö: ...`) is a
  report rather than somebody's opinion, so that label comes off before the
  colon rule reads the headline. Every other colon is still a quote.
*/
const STUDY_LABEL = /^(?:uuring|doktoritöö|magistritöö|teadlased|leid)\s*:\s*/iu;

/*
  Two happy events the list cannot say as one stem. New species, which ERR
  writes with the count in between (`45 uut pahksääsklaste liiki`), read only
  in the forms of `liik` so that `liiga`, a league, is never one. And an award
  of the year (`Aasta betoonehitis`, `Tänavune aasta kodanik`), but not any
  headline that mentions a year. And a tradition reaching a round number
  (`toimub 20. korda galeriide öö`).
*/
const NEW_SPECIES = / uu[est] (?:.* )?(?:liik|liiki|liigi|liigid|liike) /u;
const OF_THE_YEAR = /^ aasta | tänavu\S* aasta /u;
const NTH_TIME = / toimu(?:b|s) \d+\. korda /u;

/*
  "TODAY" MEANS THE LAST FEW DAYS, NOT THE LAST FEW WEEKS. A culture feed runs
  for days and ERR's science feed reached back nine on the day this was
  measured, so an item the feed dates further back than this is not offered,
  and one it dates in the future is a clock somebody got wrong. Three days
  rather than one, because a Monday morning's good news was often Saturday's.
  An item with no date at all is let through: the feed is the only witness, and
  it said nothing either way.
*/
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const CLOCK_SLACK_MS = 6 * 60 * 60 * 1000;

/** Whether an item is recent enough to be today's news. */
export function recentEnough(item: NewsItem, now: number): boolean {
  if (item.at === null) return true;
  return item.at <= now + CLOCK_SLACK_MS && now - item.at <= MAX_AGE_MS;
}

/** Lower case, quotes and runs of spaces flattened, so a stem matches however the feed wrote it. */
function folded(text: string): string {
  const flat = text.normalize("NFC").toLocaleLowerCase("et").replace(/<[^>]*>/g, " ").replace(/[“”„"«»()]/g, " ");
  return ` ${flat.replace(/\s+/g, " ").trim()} `;
}

/** Text with the innocent words taken out, which is what the bad lists read. */
function cleaned(text: string): string {
  let out = folded(text);
  for (const word of INNOCENT) out = out.replaceAll(word, " ");
  return out;
}

/**
 * The bad-news stem this item carries, or null: harm anywhere in the headline
 * and its summary, and anything off topic in the headline itself.
 */
export function badStem(item: NewsItem): string | null {
  const whole = cleaned(`${item.title} ${item.description}`);
  const harm = HARM.find((stem) => whole.includes(stem));
  if (harm) return harm;
  const head = cleaned(item.title);
  return OFF_TOPIC.find((stem) => head.includes(stem)) ?? null;
}

/*
  A HEADLINE THAT REPORTS RATHER THAN ARGUES. A colon after the media label
  comes off is somebody's quote or an opinion piece (`Name: what they think`),
  a question mark is a question, a bar is a program's strapline, and a
  review, a live broadcast or a "watch at eight" is not news that something
  good happened. And a negation turns any happy word around (`festival ei
  toimu`), so a headline holding one is not offered either.
*/
const NOT_A_REPORT = /[:?|]|^(?:arvustus|otse|kell \d|kultuuriportaal soovitab)\b/iu;
const NEGATION = / (?:ei|pole|polnud|mitte|ära) /u;

/**
 * Which kind of good news this item is, or null where it is not plainly good:
 * no bad stem anywhere in it, a report rather than a quote, a question or a
 * negation, and a happy event in the headline itself.
 */
export function goodKind(item: NewsItem): GoodKind | null {
  if (badStem(item) !== null) return null;
  const head = shownTitle(item.title).replace(STUDY_LABEL, "");
  if (NOT_A_REPORT.test(head)) return null;
  const title = folded(head);
  if (NEGATION.test(title)) return null;
  const has = (kind: GoodKind) => KIND_STEMS[kind].some((stem) => title.includes(stem));
  const animal = ANIMALS.some((stem) => title.includes(stem));
  if (NEW_SPECIES.test(title)) return "nature";
  if (animal && (has("nature") || has("science") || has("achievement") || ANIMAL_FACTS.some((s) => title.includes(s)))) return "nature";
  if (has("nature") && !has("culture")) return "nature";
  if (has("science")) return "science";
  if (has("achievement") || OF_THE_YEAR.test(title)) return "achievement";
  if (has("culture")) return "culture";
  if (has("together") || NTH_TIME.test(title)) return "together";
  return null;
}

/** Whether this item may be offered as good news at all. */
export function plainlyGood(item: NewsItem): boolean {
  return goodKind(item) !== null;
}

/*
  ERR opens some headlines with what the item is rather than what it says:
  `Galerii:`, `Video:`, `Pildid:`. On a card that is one headline long the
  label is noise in front of the sentence, so it comes off; an attribution
  (`Teadlane:`, a person's name) is part of what the headline claims and stays.
*/
const MEDIA_LABEL = /^(?:galerii|video|pildid|fotod|otse|vaata|vaata täispikkuses|kuula|taskuhääling|intervjuu)\s*:\s*/iu;

/** The headline as the card prints it: ERR's words, without a media label in front. */
export function shownTitle(title: string): string {
  const shown = title.replace(MEDIA_LABEL, "");
  return shown.length > 0 ? shown.charAt(0).toLocaleUpperCase("et") + shown.slice(1) : title;
}

/**
 * The picks in turn by kind: one of each before a second of any, the kinds
 * taken in `GOOD_KINDS` order starting `day` places along, and within a kind
 * the order they were handed in. Nothing is dropped, only reordered.
 */
export function dealAcrossKinds<T>(picks: readonly T[], kindOf: (pick: T) => GoodKind, day: number): T[] {
  const n = GOOD_KINDS.length;
  const start = ((day % n) + n) % n;
  const turn = [...GOOD_KINDS.slice(start), ...GOOD_KINDS.slice(0, start)];
  const queues = turn.map((kind) => picks.filter((pick) => kindOf(pick) === kind));
  const out: T[] = [];
  for (let round = 0; out.length < picks.length; round++) {
    for (const queue of queues) if (queue[round] !== undefined) out.push(queue[round]!);
  }
  return out;
}
