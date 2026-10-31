/**
 * EVERY CHECK A PART OF LESSONS HAS TO PASS, FOR ONE PART, IN ONE RUN.
 *
 *   npx tsx scripts/check-lesson-part.ts --part b1-rektsioon
 *
 * Written for authoring a level a part at a time (docs/43-lessons.md §11.6),
 * where several parts are drafted at once and a part's lesson numbers are not
 * yet next to the part before it. So it asks what `lessons.test.ts`,
 * `contract.test.ts` and the scene test ask, of this part's lessons alone, and
 * leaves out the one thing a part cannot know on its own: whether its numbers
 * follow the part before.
 *
 *   1. Nothing shown before it is taught (`lessonProblems`), numbering aside.
 *   2. The part's shape (`levelContractProblems`), its lessons renumbered from 1.
 *   3. Every spelling is one the forms list knows (`isExactForm`).
 *   4. No Estonian letter outside braces in the English.
 *   5. Every speaker in a voice the app has.
 *   6. Every line of English in Russian and Ukrainian (`tr`), unless --no-translations.
 *   7. Every role-play lesson has its scene (`sceneForLesson`).
 *   8. For a B2 part, B2's own rules against the parts before it: exactly one
 *      real text written, a pattern of an earlier B2 part recycled from part 3
 *      (`b2LevelProblems`), and the ramp for its place (`b2RampProblems`):
 *      where the conversation is heard, how often the story is, the race's
 *      windows, and a text to read in every lesson but the last.
 *
 * Step 1 holds a text to read (`read`) to the forms list alone, and a word to
 * work out (`workOut`) to its own split, the rest of its sentence to the
 * ledger: both are read by `estonianOf` and checked there.
 *
 * Exits 1 on any problem, printing each.
 */
import { isExactForm } from "../lib/dict/forms";
import { shardKey } from "../lib/dict/formsLayout";
import { fold } from "../lib/estonian/fold";
import { VOICES } from "../lib/audio/voice";
import { tr } from "../lib/copy/locale";
import { LESSONS as COURSE, LESSON_PARTS as COURSE_PARTS } from "../lib/course/lessons";
import { PREVIEW_LESSONS, PREVIEW_PARTS } from "../lib/course/lessons/preview";
import { PLACE_SPELLINGS, estonianOf, lessonProblems, namesOf, wordsOf } from "../lib/course/lessons/ledger";
import { b2LevelProblems, lessonEnglish, levelContractProblems, untranslated } from "../lib/course/lessons/contract";
import { b2PatternsAboveMissing, b2RampProblems } from "../lib/course/lessons/rampB2";
import { sceneForLesson } from "../lib/scenes/lessonScenes";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const partId = arg("part");
if (!partId) throw new Error("--part <part id>, for example --part b1-rektsioon");

const LESSONS = [...COURSE, ...PREVIEW_LESSONS];
const PARTS = [...COURSE_PARTS, ...PREVIEW_PARTS];
const found = PARTS.find((p) => p.id === partId);
if (!found) throw new Error(`no part ${partId} with lessons in it: is it in lib/course/lessons/preview.ts, and does it hold a lesson yet?`);
const part = found;
const mine = LESSONS.filter((l) => l.part === partId);
const ids = new Set(mine.map((l) => l.id));
const problems: string[] = [];

// 1. The ledger, over the whole course in order, keeping this part's problems and dropping its numbering.
// A B2 pattern a part above this one will explain, and that part is not written yet, counts as explained (`B2_PART_ORDER`).
const awaited = b2PatternsAboveMissing(partId, new Set(PARTS.map((p) => p.id)));
for (const p of lessonProblems(LESSONS)) {
  if (![...ids].some((id) => p.includes(`(${id})`))) continue;
  if (/: numbered \d+ where|: lettered /.test(p)) continue;
  const early = /asks for the (\w+) pattern before it is explained/.exec(p);
  if (early && awaited.has(early[1] ?? "")) continue;
  problems.push(`ledger: ${p}`);
}

// 2. The shape, renumbered so the part stands alone.
let n = 0;
const renumbered = mine.map((l) => (l.extra ? { ...l, n } : { ...l, n: ++n }));
for (const p of levelContractProblems(renumbered, [part])) problems.push(`shape: ${p}`);

// 3. The forms list.
const where = new Map<string, string>();
for (const lesson of mine) {
  const names = namesOf(lesson);
  const texts = [...estonianOf(lesson).map((e) => e.et), ...lesson.teaches.flatMap((t) => (t.kind === "verb" ? [t.et, t.first] : [t.et]))];
  for (const text of texts) {
    for (const w of wordsOf(text)) {
      if (names.has(w.raw) || PLACE_SPELLINGS.has(w.raw)) continue;
      if (!where.has(w.low)) where.set(w.low, `${lesson.id}: ${w.raw} in "${text}"`);
    }
  }
}
const byShard = [...where.keys()].sort((a, b) => shardKey(fold(a)).localeCompare(shardKey(fold(b))) || a.localeCompare(b));

async function main() {
for (const word of byShard) if (!(await isExactForm(word))) problems.push(`forms list does not know: ${where.get(word)}`);

// 4. Estonian letters stay inside braces in the English.
const ESTONIAN_LETTER = /[õäöüšž]/i;
for (const lesson of mine) {
  for (const line of lessonEnglish(lesson)) {
    const bare = line.replace(/\{[^{}]*\}/g, "").replace(/\[[^[\]]*\]/g, "");
    if (ESTONIAN_LETTER.test(bare)) problems.push(`English: ${lesson.id}: an Estonian letter outside braces in "${line}"`);
  }
}

// 5. Voices.
const voices = new Set(VOICES.map((v) => v.id));
for (const lesson of mine) {
  for (const [who, voice] of Object.entries(lesson.cast)) {
    if (!voices.has(voice)) problems.push(`voice: ${lesson.id}: ${who} is read in "${voice}", which the app has no voice for`);
  }
}

// 6. Translations, as the contract test reads them.
if (!process.argv.includes("--no-translations")) {
  for (const m of untranslated([...mine.flatMap(lessonEnglish), part.title, part.about], tr)) problems.push(`translation: ${m}`);
}

// 7. Scenes.
for (const lesson of mine) if (lesson.roleplay && !sceneForLesson(lesson.id)) problems.push(`scene: ${lesson.id} ends in a role-play and has no scene in lib/scenes/lessonScenes.ts`);

/*
  8. B2's level rules and its ramp, which need the parts before this one: the
  ramp reads the part's band off its place among B2's parts, and the recycling
  rule reads which B2 patterns the parts before it explained. Asked of the
  whole level and kept to this part's lines. A part that is not B2 has none.
*/
if (part.level === "B2") {
  // Step 2 already asked the part alone, so a line it printed (a part writing two texts) is not printed twice.
  const seen = new Set(problems);
  const forThisPart = (p: string) => p.includes(` ${partId}:`) || p.includes(` ${partId},`);
  for (const p of [...b2LevelProblems(LESSONS, PARTS), ...b2RampProblems(LESSONS, PARTS)]) {
    if (!forThisPart(p) || seen.has(`shape: ${p}`) || seen.has(`B2: ${p}`)) continue;
    seen.add(`B2: ${p}`);
    problems.push(`B2: ${p}`);
  }
}

console.log(`${partId}: ${mine.length} lessons, ${where.size} distinct spellings.`);
if (problems.length > 0) {
  for (const p of problems) console.log(`  ${p}`);
  console.log(`${problems.length} problem(s).`);
  process.exit(1);
}
console.log("Every check passes.");
}

void main();
