/**
 * HOW OFTEN THE LEVEL CHECK PLACES A SIMULATED LEARNER AT THEIR OWN LEVEL.
 *
 * The paper's size was set by a simulation that lived in a pull request and
 * not in the repository, so the numbers in `BLUEPRINT`'s test are asserted and
 * the instrument that produced them is not. This is one of the same shape,
 * kept, so a change to a scoring rule can be measured rather than argued
 * about; its learner model is its own, so its figures compare with each
 * other and not with the ones in that test.
 *
 * It drives the real ladder (`nextCursor`) and the real scorer (`placement`)
 * over the real blueprint, with the learner the only thing modeled: a true
 * level, and a probability of credit on a question that falls with how far
 * the band sits above it. Reading and listening are four-option questions, so
 * a learner far above their level still scores at about chance; writing is
 * typed, so it falls further. Every figure below is a fact about the *rules*
 * under that model and not about anybody's Estonian, and the model is stated
 * here so the next person can argue with it.
 *
 *   npx tsx scripts/measure-placement.ts [--learners=2000]
 */
import { BLUEPRINT, mulberry32 } from "../lib/assessment/items";
import { placement, rank } from "../lib/assessment/score";
import { nextCursor } from "../lib/assessment/session";
import { BANDS, PRE_A1, type ItemRef, type Level, type Response, type Skill } from "../lib/assessment/types";

const LEARNERS = Number(process.argv.find((a) => a.startsWith("--learners="))?.split("=")[1] ?? 2000);
const LEVELS: Level[] = [PRE_A1, ...BANDS];

/**
 * Two learners, and the difference between them is "I don't know".
 *
 * The guesser picks an option whenever they do not know, so a four-option
 * question pays out a quarter of the time on a word they have never seen. The
 * honest learner presses "I don't know" instead, which earns nothing: their
 * chance of credit on a choice question is only the part that is knowledge,
 * the guessing quarter taken out. Writing is typed and has no such button, so
 * it is the same for both.
 */
type Model = "guesses" | "honest";
const GUESS = 0.25;

/** Probability of credit on a question `distance` bands above the learner's level. */
function chance(skill: Skill, distance: number, model: Model): number {
  if (skill === "writing") return distance <= 0 ? 0.82 : distance === 1 ? 0.38 : 0.12;
  const withGuessing = distance <= 0 ? 0.88 : distance === 1 ? 0.5 : 0.3;
  return model === "guesses" ? withGuessing : (withGuessing - GUESS) / (1 - GUESS);
}

/** The paper, as the blueprint lays it out: ascending bands within each skill. */
function paper(): ItemRef[] {
  const items: ItemRef[] = [];
  for (const skill of ["reading", "listening", "writing"] as const) {
    for (const band of BANDS) {
      // Writing sets no A1 question and cannot; see `writingItems`.
      if (skill === "writing" && band === "A1") continue;
      for (let i = 0; i < BLUEPRINT[skill].perBand; i++) items.push({ id: `${skill}-${band}-${i}`, skill, band });
    }
  }
  return items;
}

function sit(items: ItemRef[], level: Level, random: () => number, model: Model): { level: Level | null; asked: number } {
  const responses: Response[] = [];
  for (;;) {
    const cursor = nextCursor(items, responses);
    if (cursor.index === null) break;
    const item = items[cursor.index]!;
    const distance = rank(item.band) - rank(level);
    responses.push({ itemId: item.id, skill: item.skill, band: item.band, credit: random() < chance(item.skill, distance, model) ? 1 : 0, ms: 1000 });
  }
  return { level: placement(items, responses).overall, asked: responses.length };
}

const items = paper();
const random = mulberry32(7);
console.log(`${LEARNERS} simulated learners at each level, over the real ladder and scorer.`);
for (const model of ["guesses", "honest"] as const) {
  console.log(`\n${model === "guesses" ? "Guesses when unsure" : "Says \"I don't know\" when unsure"}`);
  console.log("level    at own   below   above   questions");
  for (const level of LEVELS) {
    let own = 0, below = 0, above = 0, asked = 0;
    for (let n = 0; n < LEARNERS; n++) {
      const got = sit(items, level, random, model);
      asked += got.asked;
      const diff = (got.level ? rank(got.level) : -2) - rank(level);
      if (diff === 0) own++; else if (diff < 0) below++; else above++;
    }
    const pct = (n: number) => `${Math.round((100 * n) / LEARNERS)}%`.padStart(6);
    console.log(`${level.padEnd(8)} ${pct(own)}  ${pct(below)}  ${pct(above)}   ${(asked / LEARNERS).toFixed(1).padStart(8)}`);
  }
}
