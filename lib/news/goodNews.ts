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
 * TWO GATES, AND THE FIRST ONE IS NEVER SKIPPED. A list of word stems that
 * mean bad news refuses a headline outright, whatever anybody thinks of it,
 * and it errs on purpose toward refusing: `põlevkivi` is shale and not a fire,
 * and it is refused anyway, because a good-news card that misses a good story
 * costs nothing and one that shows a bad story costs the whole card. Then the
 * second gate decides among what is left:
 *
 *   - Where the deployment has a model, it is asked (`lib/tutor/goodNews.ts`,
 *     metered like every other call) to pick the headlines that are plainly
 *     good news and to say each in plain English, and it is told to reject
 *     whatever it is unsure of.
 *   - Where it has none, a headline has to carry a stem that means good news
 *     (`opened`, `won`, `discovered`, `award`) as well as clearing the first
 *     list. Stricter than the model and blunter, and it is what a keyless
 *     deployment gets rather than nothing.
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
  stem may catch an innocent word as well; that is the side this errs on.
*/
const BAD = [
  // death, violence, crime
  "surm", "surn", "suri ", "surid", "hukk", "tapp", "tapet", "mõrv", "vägist", "rünn", "rünnak",
  "kuritegu", "kurite", "kurjateg", "varast", "vargus", "pettu", "petis", "kelm", "korrupt",
  "altkäemaks", "kohtuotsus", "kohtu", "süüdi", "süüdist", "vangi", "vangl", "karisti", "trahv",
  "arreteer", "kahtlust", "politsei", "relv", "tulista", "lask",
  // war and its places
  "sõda", "sõja", "agress", "terror", "plahvat", "pomm", "raket", "droon", "okupat", "vene",
  "putin", "ukrain", "gaza", "iisrael", "hamas", "iraan", "kaitsev", "kaitseväe", "nato",
  // accidents and disasters
  "õnnetu", "avarii", "kokkupõr", "tulekahj", "põle", "uppu", "torm", "üleujut", "tulv", "põud",
  "maavärin", "orkaan", "evakuee", "päästj", "päästeam",
  // illness
  "haig", "vigast", "haav", "kriis", "katk", "epideem", "pandeem", "viirus", "gripp", "nakk",
  "vähk", "vähi ", "enesetap", "sõltuv", "narko", "alkohol", "joobe",
  // money worries
  "pankrot", "koonda", "kahjum", "kärbe", "kärbi", "inflats", "hinnatõus", "kallin", "maksutõus",
  "võlg", "vaesus", "vaene", "töötu", "streik", "protest", "meeleavald",
  // politics and quarrels
  "valitsus", "minist", "riigikogu", "erakond", "valimis", "umbusald", "skandaal", "tüli", "vaidl",
  "süüdista", "kriitik", "kritiseer", "trump",
  // dread and sorrow
  "hirm", "oht", "hoiat", "mure", "kurb", "lein", "kaotus", "kaota", "kadun", "kadus", "puudu",
  "probleem", "raske", "halb", "halv", "kahju", "kannat", "valu", "nälg", "üksild", "stress",
  "ärev", "depress", "katastroof", "kahane", "vähene", "langus", "langes", "hääbu", "murend", "rasvum", "kadu",
];

/*
  Good news, for a deployment with no model to ask. A headline has to carry
  one of these to be offered at all, which keeps the keyless card to the
  plainly happy kind: something opened, won, found, celebrated or born.
*/
const GOOD = [
  "avas", "avati", "avatakse", "avab ", "avamine", "sündis", "sündi", "võitis", "võit",
  "kuld", "medal", "rekord", "auhind", "preemia", "pälvis", "tunnust", "rõõm", "õnnelik", "naer",
  "imeline", "edukas", "edu ", "avast", "leidis", "uus liik", "uut liiki", "festival", "kontsert",
  "näitus", "esilinast", "stipendium", "tähista", "juubel", "sünnipäev", "kingit", "annet",
  "vabatahtl", "positiiv", "parane", "kasvas", "taastu", "naasis", "pesitse", "poegi", "kutsik",
  "tantsupidu", "laulupidu",
];

/** Lower case and one spelling of each letter, so a stem matches however the feed wrote it. */
function folded(text: string): string {
  return ` ${text.normalize("NFC").toLocaleLowerCase("et")} `;
}

/** The headline and its summary, which is what both gates read. */
function textOf(item: NewsItem): string {
  return folded(`${item.title} ${item.description}`);
}

/** The bad-news stem this item carries, or null. Never skipped, whoever judges next. */
export function badStem(item: NewsItem): string | null {
  const text = textOf(item);
  return BAD.find((stem) => text.includes(stem)) ?? null;
}

/** Whether a deployment with no model may offer this item as good news. */
export function plainlyGood(item: NewsItem): boolean {
  if (badStem(item) !== null) return false;
  const text = textOf(item);
  return GOOD.some((stem) => text.includes(stem));
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

/** What the judge is shown of each item, short enough that forty fit one question. */
const SUMMARY_CHARS = 180;
/** How many it may pick. One is shown; the rest are spares for a headline the dictionary cannot read. */
export const PICKS = 6;

/**
 * The question put to a model, in English, about headlines in Estonian. It
 * asks for a choice and for English, which is the one direction ADR-005 lets a
 * model write in; it is never asked to write a word of Estonian.
 */
export function judgeInstruction(items: readonly NewsItem[]): string {
  const listed = items
    .map((item, i) => {
      const summary = item.description.length > SUMMARY_CHARS
        ? `${item.description.slice(0, SUMMARY_CHARS)}...`
        : item.description;
      return `${i}. ${item.title}${summary ? `\n   ${summary}` : ""}`;
    })
    .join("\n");
  return [
    "Below are today's news headlines from ERR, in Estonian, each with a short summary.",
    "Pick only the ones that are plainly good news: something new and nice opened or finished,",
    "an achievement or a win, an award, a discovery, a celebration, a festival or a show, animals",
    "or nature doing well, people being kind. They will be shown to somebody learning Estonian",
    "on their home screen, as the one piece of news that makes them smile.",
    "Reject anything about death, illness, accidents, crime, courts, war, the military, politics,",
    "arguments, protests, money worries, prices, disasters, warnings, criticism or decline, and",
    "anything that could leave a reader sad or anxious even if it ends well. When unsure, reject.",
    "",
    `Reply with JSON only, best first, at most ${PICKS} items, and an empty list if none qualify:`,
    '{"good":[{"i":<the number>,"en":"<the headline in plain, natural English>"}]}',
    "",
    listed,
  ].join("\n");
}

/** One headline the judge picked, with the English it gave. */
export interface Picked {
  index: number;
  en: string | null;
}

/**
 * The judge's reply, read as strictly as the question was put. Anything that is
 * not the shape asked for picks nothing, an index not in the list is dropped,
 * and an item that trips the bad-news list is dropped again here, so a model
 * cannot talk past the first gate. English longer than a headline, or carrying
 * an Estonian letter, is not kept: the item stays and its English goes.
 */
export function readJudgement(reply: string, items: readonly NewsItem[]): Picked[] {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return [];
  }
  const good = (parsed as { good?: unknown }).good;
  if (!Array.isArray(good)) return [];
  const out: Picked[] = [];
  for (const entry of good) {
    const index = (entry as { i?: unknown })?.i;
    if (typeof index !== "number" || !Number.isInteger(index)) continue;
    const item = items[index];
    if (!item || badStem(item) !== null) continue;
    if (out.some((p) => p.index === index)) continue;
    const raw = (entry as { en?: unknown }).en;
    // A dash a model put between two clauses becomes the comma this app writes.
    const en = typeof raw === "string" ? raw.replace(/\s*[\u2013\u2014]\s*/g, ", ").trim() : "";
    // A name keeps its letters (Pärnu, Tõnis); nothing else in the English may carry one.
    const unnamed = en.replace(/\p{Lu}[\p{L}\p{M}]*/gu, "");
    const usable = en.length > 0 && en.length <= 200 && !/[õäöüšžÕÄÖÜŠŽ]/.test(unnamed);
    out.push({ index, en: usable ? en : null });
    if (out.length >= PICKS) break;
  }
  return out;
}
