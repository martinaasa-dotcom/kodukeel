/*
  EVERY LETTER, RENDERED TO DISK, FOR A PERSON TO LOOK AT.

  The unit tests hold a letter to its shape; none of them can say whether it
  looks right on a phone. This writes one HTML file per letter, and per
  language with `--locale`, into the directory given, with an index page that
  shows the subject and the preview line the way an inbox lists them, so the
  hidden preheader is read the way a reader meets it.

    npx tsx scripts/preview-letters.ts <out-dir> [--locale en|ru|uk]

  Nothing is sent and nothing reads a database: the letters are built from
  fixed sample values, the same shapes `lib/progress/mailout.ts` hands over.
*/
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { renderHtml, renderText, type Chrome } from "../lib/email/render";
import type { Letter } from "../lib/email/letter";
import { tonightLetter } from "../lib/email/letters/tonight";
import { welcomeLetter } from "../lib/email/letters/welcome";
import { comebackLetter } from "../lib/email/letters/comeback";
import { weeklyLetter } from "../lib/email/letters/weekly";
import { errandLetter } from "../lib/email/letters/errand";
import { milestoneLetter } from "../lib/email/letters/milestone";
import { shieldLetter } from "../lib/email/letters/shield";
import { deadlineLetter } from "../lib/email/letters/deadline";
import { classroomLetter } from "../lib/email/letters/classroom";
import { worddayLetter } from "../lib/email/letters/wordday";

const out = process.argv[2];
if (!out) {
  console.error("Usage: npx tsx scripts/preview-letters.ts <out-dir> [--locale en|ru|uk]");
  process.exit(1);
}
const at = process.argv.indexOf("--locale");
const locale = (at > 0 ? process.argv[at + 1] : "en") as "en" | "ru" | "uk";

const ORIGIN = "https://kodukeel.ee";
const chrome: Chrome = {
  origin: ORIGIN,
  unsubscribeUrl: `${ORIGIN}/api/email/unsubscribe?u=x&k=tonight&t=y`,
  unsubscribeLabel: "Stop emails like this one",
  operator: "Upthink OÜ",
};
const week = (studied: (i: number) => boolean) =>
  ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({ label, studied: studied(i) }));
const steps = (done: number) =>
  [
    { title: "Meet today's five words", minutes: 6 },
    { title: "Read the grammar behind it", minutes: 2 },
    { title: "Match", minutes: 3 },
    { title: "A quick review", minutes: 2 },
  ].map((s, i) => ({ ...s, done: i < done }));
const day = (done: number) => ({
  title: "Kodus", subtitle: "At home", part: { n: 2, of: 3 }, canDo: "Say where you live and who you live with.", newWords: 5, steps: steps(done),
});

const letters: [string, Letter][] = [
  ["tonight-fresh", tonightLetter({ locale, name: "Martin", origin: ORIGIN, day: day(0), theirWords: "So I can talk to my wife's grandmother.", streak: 6, word: { lemma: "pannkook", translation: "pancake", occasion: "It's Shrove Tuesday." } })],
  ["tonight-started", tonightLetter({ locale, name: "Martin", origin: ORIGIN, day: day(2), theirWords: null, streak: 3, word: null })],
  ["welcome", welcomeLetter({ locale, origin: ORIGIN, reminderAt: "18:30", cardsWaiting: 64, opensOn: { title: "Tervitused", subtitle: "Saying hello" } })],
  ["comeback", comebackLetter({ locale, origin: ORIGIN, wordsKept: 26, shieldUsed: true, streak: 7, smallStep: { title: "Play a round of Match", href: `${ORIGIN}/review/match`, minutes: 2 }, word: { lemma: "lumi", translation: "snow", occasion: null } })],
  ["errand", errandLetter({ locale, origin: ORIGIN, errand: { says: "Order your coffee in Estonian today.", places: "A café or a bakery", unitId: "sook-ja-jook", unitTitle: "Söök ja jook", scene: { id: "kohvikus", title: "At the café" } }, word: { lemma: "kohv", translation: "coffee" } })],
  ["milestone", milestoneLetter({ locale, origin: ORIGIN, level: { key: "A1", title: "Esimesed sammud", arrival: "You can handle a shop, a greeting and a simple question about yourself.", words: 493 }, pct: 41, target: "B1", next: { level: "A2", wordsAway: 118 } })],
  ["shield", shieldLetter({ locale, origin: ORIGIN, streak: 12, remaining: 1, nextAt: 30, week: week((i) => i !== 5) })],
  ["weekly", weeklyLetter({ locale, origin: ORIGIN, week: week((i) => i < 5), reviews: 91, held: 212, conversations: 2, ladder: { target: "B1", pct: 41, assumed: 0, next: { level: "A2", wordsAway: 120 } }, part: { title: "Esimesed sõnad", eveningsLeft: 3 } })],
  ["weekly-quiet", weeklyLetter({ locale, origin: ORIGIN, week: week(() => false), reviews: 0, held: 0, conversations: 0, ladder: null, part: { title: "Esimesed sõnad", eveningsLeft: 1 } })],
  ["deadline", deadlineLetter({ locale, origin: ORIGIN, band: "B1", label: "Live in the language", phrase: "9 weeks", distance: "At the pace you keep, B1 is about a year away.", confidence: 41, evidence: "There is enough history here for a rough estimate.", gap: "Listening is the part to work on.", onTrack: false })],
  ["classroom", classroomLetter({ locale, origin: ORIGIN, groupName: "Tuesday class", members: 25, active: 18, reviews: 412, week: week((i) => i < 5), detail: { kind: "CLASS", weakestCases: [{ grammCase: "osastav", accuracy: 54, total: 88 }, { grammCase: "seesütlev", accuracy: 61, total: 40 }] } })],
  ["wordday", worddayLetter({ locale, origin: ORIGIN, word: { lemma: "pannkook", translation: "pancake", occasion: "It's Shrove Tuesday.", example: { et: "Ema küpsetab pannkooke.", en: "Mum is making pancakes." } } })],
];

mkdirSync(out, { recursive: true });
const rows: string[] = [];
for (const [name, letter] of letters) {
  writeFileSync(join(out, `${name}.html`), renderHtml(letter, chrome));
  writeFileSync(join(out, `${name}.txt`), renderText(letter, chrome));
  rows.push(`<li><a href="${name}.html"><b>${letter.subject}</b></a><br><span>${letter.preheader}</span></li>`);
}
writeFileSync(
  join(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Letters</title><style>body{font:15px -apple-system,sans-serif;max-width:640px;margin:32px auto}li{margin:0 0 14px}span{color:#666}</style><ul>${rows.join("")}</ul>`,
);
console.log(`Wrote ${letters.length} letters to ${out}`);
