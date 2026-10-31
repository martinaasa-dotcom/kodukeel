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
 *   3. Every spelling is one the forms list knows (`isExactForm`), read by
 *      `formsCheckWords`: a regional spelling in a text or a talk (C1) is asked
 *      as its standard word from `DIALECT_WORDS`, and the glossary is held to
 *      its own shape (`dialectProblems`).
 *   4. No Estonian letter outside braces in the English.
 *   5. Every speaker in a voice the app has.
 *   6. Every line of English in Russian and Ukrainian (`tr`), unless --no-translations.
 *   7. Every role-play lesson has its scene (`sceneForLesson`), and a C1
 *      part's closing scene admits a curveball.
 *   8. For a B2 part, B2's own rules against the parts before it: exactly one
 *      real text written, a pattern of an earlier B2 part recycled from part 3
 *      (`b2LevelProblems`), and the ramp for its place (`b2RampProblems`):
 *      where the conversation is heard, how often the story is, the race's
 *      windows, and a text to read in every lesson but the last.
 *   9. For a C1 part, C1's own rules the same way: exactly one real text, a C1
 *      pattern of an earlier C1 part recycled from part 2 and a B2 pattern in
 *      every part, a text to read in every lesson but the last and its
 *      questions from part 3 (`c1LevelProblems`), and the ramp for its place
 *      (`c1RampProblems`): the room, the story heard once, the one go and its
 *      preparation, the talk taken down as notes, and the text's length and
 *      the shape it is asked in.
 *
 * A C1 pattern a part above this one will explain, and that part is not
 * written yet, counts as explained, as a B2 one does (`C1_PART_ORDER`).
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
import { formsCheckWords, lessonProblems } from "../lib/course/lessons/ledger";
import { b2LevelProblems, c1LevelProblems, lessonEnglish, levelContractProblems, untranslated } from "../lib/course/lessons/contract";
import { b2PatternsAboveMissing, b2RampProblems } from "../lib/course/lessons/rampB2";
import { c1PatternsAboveMissing, c1RampProblems } from "../lib/course/lessons/rampC1";
import { dialectProblems } from "../lib/course/lessons/dialect";
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
const present = new Set(PARTS.map((p) => p.id));
const awaited = new Set([...b2PatternsAboveMissing(partId, present), ...c1PatternsAboveMissing(partId, present)]);
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

// 3. The forms list, read as the lessons test reads it: a dialect spelling is asked as its standard word (`DIALECT_WORDS`).
const where = new Map<string, string>();
for (const lesson of mine) {
  for (const w of formsCheckWords(lesson)) if (!where.has(w.low)) where.set(w.low, w.where);
}
for (const p of dialectProblems()) problems.push(`dialect: ${p}`);
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

// 7. Scenes, and at C1 a part's closing conversation admits a curveball (docs/43-lessons.md §15.5).
for (const lesson of mine) {
  if (!lesson.roleplay) continue;
  const scene = sceneForLesson(lesson.id);
  if (!scene) problems.push(`scene: ${lesson.id} ends in a role-play and has no scene in lib/scenes/lessonScenes.ts`);
  else if (lesson.level === "C1" && lesson.kind === "partEnd" && scene.curveballs.length === 0) problems.push(`scene: ${lesson.id} closes a C1 part and its scene admits no curveball`);
}

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

/*
  9. For a C1 part, C1's own rules against the parts before it, the same way:
  exactly one real text written, a C1 pattern of an earlier C1 part recycled
  from part 2 and a B2 pattern in every part, a text to read in every lesson
  but the last and its questions from part 3 (`c1LevelProblems`), and the
  ramp for its place (`c1RampProblems`).
*/
if (part.level === "C1") {
  const seen = new Set(problems);
  const forThisPart = (p: string) => p.includes(` ${partId}:`) || p.includes(` ${partId},`);
  for (const p of [...c1LevelProblems(LESSONS, PARTS), ...c1RampProblems(LESSONS, PARTS)]) {
    if (!forThisPart(p) || seen.has(`shape: ${p}`) || seen.has(`C1: ${p}`)) continue;
    seen.add(`C1: ${p}`);
    problems.push(`C1: ${p}`);
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
