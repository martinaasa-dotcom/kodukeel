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
 * than trusted to a judgement nobody can read.
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
  Bad news, as stems matched anywhere inside the folded headline and summary,
  so a compound (`liiklusõnnetus`, `droonirünnak`) is caught by its part. A
  stem may catch an innocent word as well; that is the side this errs on. It
  reaches past what is sad into what is merely not a smile: business, the
  economy, politics, health and the weather are refused whole, because a
  headline about a bank's profit or a minister's plan is never the one that
  cheers somebody up, and every one of those was a pick on a year of ERR's
  headlines before they were listed. A space stands for a word's edge.
*/
const BAD = [
  // death, violence, crime
  "surm", "surn", "suri ", "surid", "hukk", "tapp", "tapet", "mõrv", "vägist", "rünn", "kuritegu",
  "kurite", "kurjateg", "varas", "vargus", "varast", "pettu", "petis", "kelm", "korrupt",
  "altkäemaks", "kohus", "kohtu", "süüdi", "süüdist", "vangi", "vangl", "karist", "trahv",
  "arreteer", "kahtlust", "politsei", "relv", "tulista", "lask", "rööv", "pussita", "peks",
  "ohver", "kannatan", "salasigar", "tolli", "kinni pid", "pidasid kinni", "smugel", "narko",
  "joobe",
  // war, military, foreign politics
  "sõda", "sõja", "agress", "terror", "plahvat", "pomm", "raket", "droon", "okupat", "vene",
  "putin", "ukrain", "gaza", "iisrael", "hamas", "iraan", "kaitse", "nato", "väge", "väed",
  "armee", "sõdur", "vastupanu", "mobilis", "sanktsio", "hiina", "trump", "usa ",
  // accidents and disasters
  "õnnetu", "avarii", "kokkupõr", "tulekahj", "põle", "uppu", "torm", "üleujut", "tulv", "põud",
  "maavärin", "orkaan", "evakuee", "pääst", "rike", "rikke", "häiri", "katki", "kahjust", "purune",
  "lammut",
  // illness and health
  "haig", "vigast", "haav", "kriis", "katk", "epideem", "pandeem", "viirus", "gripp", "nakk",
  "vähk", "vähi", "enesetap", "sõltuv", "alkohol", "operatsio", "opereer", "diagnoos", "ravi",
  "tervis", "sinivetik", "toksil", "mürk", "arst", "kiirabi", "surev", "puue",
  // money, business and the economy
  "pankrot", "koonda", "kahjum", "kärbe", "kärbi", "inflats", "hind", "hinna", "hinn", "kallin",
  "maks", "võlg", "vaesus", "vaene", "töötu", "streik", "majandus", "eksport", "import", "kasum",
  "käive", "investee", "tehing", "pank", "panga", "börs", "aktsia", "laen", "intress", "palk",
  "pension", "eelarve", "raha", "eur ", "euro", "miljon", "miljard", "protsent", "kulu", "firma",
  "ettevõt", "kontsern", "osta", "müü", "turul", "turu ", "konkurents", "energ", "elektri",
  "gaasi", "kütte", "tasu",
  // politics, the state and argument
  "valitsus", "minist", "riigikogu", "parlament", "senat", "erakond", "partei", "valimis",
  "umbusald", "president", "peaminist", "linnapea", "volikogu", "seadus", "eelnõu", "keeld",
  "keela", "määrus", "järelevalve", "menetlus", "uurima", "uurib", "skandaal", "tüli", "vaidl",
  "vaidle", "süüdista", "kriitik", "kritiseer", "protest", "meelt aval", "meeleavald", "populist",
  "kurd", "rikutakse", "nõua", "nõud", "hoiatus", "poliitik", "ametnik", "ministeer", "küsitlus",
  "toetus",
  // dread, sorrow, decline and trouble
  "hirm", "oht", "ohu", "hoiat", "mure", "kurb", "lein", "kaotus", "kaota", "kadun", "kadus",
  "puudu", "probleem", "raske", "halb", "halv", "kahju", "kannat", "valu", "nälg", "üksild",
  "stress", "ärev", "depress", "katastroof", "kahane", "vähene", "vähem", "langus", "langes",
  "hääbu", "murend", "rasvum", "kadu", "madal", "kehv", "keeruli", "segadus", "valesti", "virel",
  "ebamugav", "eelarvamus", "lõhe", "ilmajäet", "mäsu", "hullus", "huligaan", "kadalipp",
  "ellujää", "abivaja", "kliima", "soojene", "osoonia", "auk", "eba",
  // farewells and memorials
  "memoriam", "elust lahk", "matus", "mälest", "igavikku", "lahkunu", "viimane", "hüvast",
  // plans that fell through, closures, people leaving
  " ära ", "sulgu", "lükkub", "lükatakse", "lükati", "edasi lükk", "tühista", "jääb ära", "jäi ära", "suletakse",
  "suleti", "sulgeb", "sulge", "lõpetab", "tagasi astu", "astus tagasi", "juhatus", "lahkub",
  "lahkus", "vallandat", "vaese", "naeruvää", "hädas", "peata", "peatub", "peatas",
  // weather reports
  "temperatuur", "sünoptik", "kraadi", "veetase", "sadu", "sajab", "tuul", "külm", "kuumalaine",
  "pakane",
  // sport results that are somebody's loss
  "pudene", "alistu", "kukkus välja", "jäi alla", "kaotu", "alla jäi", "viik", "nullile", "loovuta", "võiduta",
  "doping", "keelu",
  // endings and delays
  "lõpe", "lõpp", "edasilük", "lükka", " vaid ", "juhuks",
  // business plant and power, and a word nobody smiles at
  "megavat", "akupark", "diktaator",
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
*/
const GOOD = [
  // something opened or was finished (a leading _ means the word starts here)
  " avati", " avatakse", " taasavati", " taasavatakse", " avas ", " avasid", " avab uksed",
  " valmis ", " valmisid",
  // an award or a win
  " pälvis", " võitis", " võitsid", " võidutse", " tunnustati", "auhin", "preemi", " parimaks",
  " valiti aasta", "aastaks valiti", "tiitli", "kuldmedal", "medali",
  // a premiere, a show, a festival
  " esilinastu", " teleesilinastu", " esietendu", " tõi lavale", " jõuab lavale", "festival",
  "laulupidu", "laulupeo", "tantsupidu", "tantsupeo", "kontsert", "näitus", " esines", " esineb",
  // births and young animals
  " sündis", " sündisid", " poegi", " talled", " tibud", " kutsikad",
  // a celebration
  " tähista", "sünnipäev", "juubel", "pidu ", "peoga",
  // a discovery
  " avastasid", " avastati", " avastas",
  // kindness and joy
  " kinki", " annetas", "rõõm", " edukalt",
];

/*
  Two happy events the list cannot say as one stem. New species, which ERR
  writes with the count in between (`45 uut pahksääsklaste liiki`), read only
  in the forms of `liik` so that `liiga`, a league, is never one. And an award
  of the year (`Aasta betoonehitis`, `Tänavune aasta kodanik`), but not any
  headline that mentions a year.
*/
const NEW_SPECIES = / uu[est] (?:.* )?(?:liik|liiki|liigi|liigid|liike) /u;
const OF_THE_YEAR = /^ aasta | tänavu\S* aasta /u;

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

/** The headline and its summary, with the innocent words taken out, which is what the bad list reads. */
function textOf(item: NewsItem): string {
  let text = folded(`${item.title} ${item.description}`);
  for (const word of INNOCENT) text = text.replaceAll(word, " ");
  return text;
}

/** The bad-news stem this item carries, or null. */
export function badStem(item: NewsItem): string | null {
  const text = textOf(item);
  return BAD.find((stem) => text.includes(stem)) ?? null;
}

/*
  A HEADLINE THAT REPORTS RATHER THAN ARGUES. A colon after the media label
  comes off is somebody's quote or an opinion piece (`Name: what they think`),
  a question mark is a question, a bar is a programme's strapline, and a
  review, a live broadcast or a "watch at eight" is not news that something
  good happened. And a negation turns any happy word around (`festival ei
  toimu`), so a headline holding one is not offered either.
*/
const NOT_A_REPORT = /[:?|]|^(?:arvustus|otse|kell \d|kultuuriportaal soovitab)\b/iu;
const NEGATION = / (?:ei|pole|polnud|mitte|ära) /u;

/** Whether this item may be offered as good news: no bad stem, a report, and a happy event in the headline. */
export function plainlyGood(item: NewsItem): boolean {
  if (badStem(item) !== null) return false;
  const head = shownTitle(item.title);
  if (NOT_A_REPORT.test(head)) return false;
  const title = folded(head);
  if (NEGATION.test(title)) return false;
  return GOOD.some((stem) => title.includes(stem)) || NEW_SPECIES.test(title) || OF_THE_YEAR.test(title);
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
