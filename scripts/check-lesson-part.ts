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
import { lessonEnglish, levelContractProblems } from "../lib/course/lessons/contract";
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
for (const p of lessonProblems(LESSONS)) {
  if (![...ids].some((id) => p.includes(`(${id})`))) continue;
  if (/: numbered \d+ where|: lettered /.test(p)) continue;
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
  const sayable = (line: string) =>
    !/^[-\d:.,\s]*[a-zõäöü]*$/.test(line) && /[A-Za-z]{2,}/.test(line.replace(/\{[^{}]*\}|\[[^[\]]*\]|\([^()]*\)|€[\d.]+/g, ""));
  const lines = [...mine.flatMap(lessonEnglish), part.title, part.about];
  for (const line of new Set(lines.filter(sayable))) {
    for (const locale of ["ru", "uk"] as const) {
      if (locale === "ru" && /ukrain/i.test(line)) continue;
      if (locale === "uk" && /russia/i.test(line)) continue;
      if (tr(locale, line) === line) problems.push(`translation: ${locale}: ${line}`);
    }
  }
}

// 7. Scenes.
for (const lesson of mine) if (lesson.roleplay && !sceneForLesson(lesson.id)) problems.push(`scene: ${lesson.id} ends in a role-play and has no scene in lib/scenes/lessonScenes.ts`);

console.log(`${partId}: ${mine.length} lessons, ${where.size} distinct spellings.`);
if (problems.length > 0) {
  for (const p of problems) console.log(`  ${p}`);
  console.log(`${problems.length} problem(s).`);
  process.exit(1);
}
console.log("Every check passes.");
}

void main();
