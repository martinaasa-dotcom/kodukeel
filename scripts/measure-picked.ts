/**
 * CAN AN A1 LEARNER PICK WHAT TO SAY, BEAT BY BEAT, IN THE EVERYDAY SCENES (FB-9)?
 *
 * The landing page's café is played by picking: every step offers two to four
 * lines, each built off the dictionary out of words the conversation can take
 * (`lib/progress/demoScene.ts`). Whether the same can be offered to a learner
 * on an A1 evening is a question about the course's own words, so it is
 * counted rather than argued.
 *
 * For each of the eight wave A scenes (`docs/38-third-batch.md` section 6)
 * and each A1 part's last evening, every required beat is read for what a
 * picked line has to hold to meet it, and that is checked against the words
 * the course has given by then (`taughtThrough`):
 *
 * - a `lemma` requirement is met by any one of its words that is taught;
 * - a `case` requirement by its word being taught (the form is the dictionary's);
 * - a `datum` off a word or weekday prop by any taught value of the prop; a
 *   time, a number, a price or a code by its digits, which are not words;
 * - a `question` by a taught question word out of `kusisonad`;
 * - a `negation` by `ei` being taught;
 * - `register` and `any` by anything, so they never block;
 * - an `anyOf` by any one of its leaves.
 *
 * And it asks the forms as well as the words. A1 reads no case page, and the
 * module's rule is that a form is shown before it is practised, so a beat
 * whose line has to hold a case form (`Soomest` for "where from", `Jaama` for
 * "where to") qualifies only once that case's page has been read by then
 * (`grammarThrough`). The nominative is the word itself and always passes.
 *
 * A beat qualifies where every requirement can be met and the alternatives
 * multiply out to at least two distinct lines, since one line on offer is not
 * a pick. A beat that does not names the first requirement that blocks it and
 * the words that would unblock it. It counts what the learner says and
 * nothing else: the other side's lines come from the bank and draw the
 * dictionary under their words, as every scene line does.
 *
 * It is generous on purpose, which is the right direction for a "should we
 * build this" question: a line is counted as buildable from the one word the
 * beat needs ("Kohvi, palun." is the café's shape), and the words a whole
 * sentence would also want are not asked for. So a "no" here is a no, and a
 * "yes" still has to be built and read.
 *
 * No database, no network, no model.
 *
 *   npm run measure:picked
 */
import { PROGRAMMES, grammarThrough, taughtThrough } from "@/lib/course";
import { CASES } from "@/lib/estonian/cases";
import { sceneById } from "@/lib/scenes/catalogue";
import { type LeafRequirement, type Requirement, type SceneSpec } from "@/lib/scenes/types";
import { unitById } from "@/lib/collections/syllabus";

export const WAVE_A = [
  "uus-kolleeg", "abi-palumine", "ootamine", "kokkulepe", "turul", "bussipeatus", "raamatukogu", "nadalavahetus",
] as const;

/** The four scenes the work order asks for before anything is built (D9). */
const ENOUGH = 4;

const QUESTION_WORDS = new Set(unitById("kusisonad")?.lemmas ?? []);

interface Leaf {
  /** How many distinct lines this requirement can be said with; 0 is a block. */
  readonly ways: number;
  /** What would unblock it, where it blocks. */
  readonly wants: readonly string[];
}

/*
  THE CASE A NATURAL ANSWER TAKES, WHERE THE SCENE TAKES THE BARE WORD.

  A typed turn is read generously, so these beats accept the word in any
  form and correct it on the way past. A picked line is different: it is
  something the app offers as right, so it has to be the line a person would
  say, and for these slots that line holds a case. This is a reading of the
  question each beat asks, written down rather than inferred, in case keys
  and English: nothing here is an Estonian form. A value-level entry is for a
  slot whose values answer in different shapes.
*/
const NATURAL_CASE: Record<string, Record<string, string | Record<string, string>>> = {
  // "Where are you from?" is answered with the country in the elative.
  "uus-kolleeg": { from: "ELATIVE" },
  // Rain and snow fall, said with the partitive; sun, wind and fog are the subject of their own verb.
  ootamine: { weather: { vihm: "PARTITIVE", lumi: "PARTITIVE", päike: "NOMINATIVE", tuul: "NOMINATIVE", udu: "NOMINATIVE" } },
  // "Some carrots" is a partitive plural; "three apples" is a partitive singular after the number.
  turul: { some: "PARTITIVE", pieces: "PARTITIVE" },
  // "Does this bus go to the centre?" names the destination in the illative.
  bussipeatus: { to: "ILLATIVE" },
};

function naturalCase(sceneId: string, slot: string, value: string): string | undefined {
  const entry = NATURAL_CASE[sceneId]?.[slot];
  return typeof entry === "string" ? entry : entry?.[value];
}

const caseName = (key: string) => CASES.find((c) => c.key === key)?.et ?? key.toLowerCase();

/** A case form the line has to hold and the course has not read by then, or null. */
function unreadCase(need: LeafRequirement, cases: ReadonlySet<string> | null): string | null {
  if (cases === null) return null;
  const grammCase = need.kind === "case" ? need.grammCase : need.kind === "datum" ? need.grammCase : undefined;
  if (!grammCase || grammCase === "NOMINATIVE" || cases.has(grammCase)) return null;
  return grammCase;
}

function leafWays(scene: SceneSpec, need: LeafRequirement, taught: ReadonlySet<string>, cases: ReadonlySet<string> | null): Leaf {
  const unread = unreadCase(need, cases);
  if (unread) return { ways: 0, wants: [`the ${caseName(unread)} case, whose page A1 has not read`] };
  switch (need.kind) {
    case "lemma": {
      const have = need.oneOf.filter((l) => taught.has(l));
      return { ways: have.length, wants: need.oneOf };
    }
    case "case":
      return { ways: taught.has(need.lemma) ? 1 : 0, wants: [need.lemma] };
    case "datum": {
      const prop = scene.props.find((p) => p.slot === need.slot);
      if (!prop) return { ways: 0, wants: [`{${need.slot}}`] };
      if (prop.kind === "word" || prop.kind === "weekday") {
        const values = prop.oneOf;
        const words = values.filter((l) => taught.has(l));
        if (cases === null) return { ways: words.length, wants: values };
        const sayable = words.filter((l) => {
          const grammCase = naturalCase(scene.id, need.slot, l);
          return !grammCase || grammCase === "NOMINATIVE" || cases.has(grammCase);
        });
        if (words.length > 0 && sayable.length === 0) {
          const grammCase = naturalCase(scene.id, need.slot, words[0]!)!;
          return { ways: 0, wants: [`the ${caseName(grammCase)} case, whose page A1 has not read`] };
        }
        return { ways: sayable.length, wants: values };
      }
      // A time, a number, a price or a code is said in digits, which are not words.
      return { ways: 4, wants: [] };
    }
    case "question": {
      const have = [...QUESTION_WORDS].filter((l) => taught.has(l));
      return { ways: have.length, wants: [...QUESTION_WORDS] };
    }
    case "negation":
      return { ways: taught.has("ei") ? 1 : 0, wants: ["ei"] };
    case "register":
    case "any":
      return { ways: 4, wants: [] };
  }
}

function requirementWays(scene: SceneSpec, need: Requirement, taught: ReadonlySet<string>, cases: ReadonlySet<string> | null): Leaf {
  if (need.kind !== "anyOf") return leafWays(scene, need, taught, cases);
  const leaves = need.of.map((leaf) => leafWays(scene, leaf, taught, cases));
  return { ways: leaves.reduce((n, l) => n + l.ways, 0), wants: leaves.flatMap((l) => l.wants) };
}

export interface BeatReading {
  readonly beat: string;
  readonly lines: number;
  /** Null where the beat qualifies. */
  readonly blocked: string | null;
}

/** `cases` null reads the words alone; a set also holds every case form to the pages read. */
export function readBeats(scene: SceneSpec, taught: ReadonlySet<string>, cases: ReadonlySet<string> | null): BeatReading[] {
  return scene.beats.filter((b) => b.required).map((beat) => {
    let lines = 1;
    for (const need of beat.needs) {
      const { ways, wants } = requirementWays(scene, need, taught, cases);
      if (ways === 0) {
        const missing = wants.filter((w) => !taught.has(w));
        if (missing.length === 1 && missing[0]!.startsWith("the ")) return { beat: beat.id, lines: 0, blocked: `needs ${missing[0]}` };
        return { beat: beat.id, lines: 0, blocked: `needs one of: ${missing.slice(0, 5).join(", ")}` };
      }
      lines *= ways;
    }
    // A requirement-free beat is a stage beat and is said with anything.
    if (beat.needs.length === 0) lines = 4;
    return {
      beat: beat.id,
      lines: Math.min(lines, 4),
      blocked: lines >= 2 ? null : "only one line can be built, which is not a pick",
    };
  });
}

function main() {
  const parts = PROGRAMMES.filter((p) => p.level === "A1");
  const last = parts.at(-1)!;
  for (const strict of [false, true]) {
    const qualifyingAtEnd: string[] = [];
    const rows: string[] = [];
    console.log(strict ? "\nWORDS AND FORMS: every case a line holds has had its page read.\n" : "WORDS ALONE.\n");
    rows.push("| Scene | Part | Beats that qualify | Beats that do not, and what blocks them |");
    rows.push("| --- | --- | --- | --- |");
    for (const id of WAVE_A) {
      const scene = sceneById(id);
      if (!scene) throw new Error(`${id} is not in the catalogue`);
      for (const part of parts) {
        const at = part.days.length - 1;
        const taught = new Set(taughtThrough(part, at));
        const cases = strict ? new Set(grammarThrough(part, at).cases) : null;
        const beats = readBeats(scene, taught, cases);
        const ok = beats.filter((b) => b.blocked === null);
        const not = beats.filter((b) => b.blocked !== null);
        // Only the last part is printed for the strict reading, where it is the decision.
        if (!strict || part === last) {
          rows.push(`| \`${id}\` | ${part.id} | ${ok.length} of ${beats.length} | ${
            not.length === 0 ? "none" : not.map((b) => `\`${b.beat}\`: ${b.blocked}`).join("; ")} |`);
        }
        if (part === last && not.length === 0) qualifyingAtEnd.push(id);
      }
    }
    console.log(rows.join("\n"));
    console.log("");
    console.log(`Scenes qualifying on every required beat by ${last.id}: ${qualifyingAtEnd.length} of ${WAVE_A.length}${
      qualifyingAtEnd.length ? ` (${qualifyingAtEnd.join(", ")})` : ""}.`);
    if (strict) {
      console.log(qualifyingAtEnd.length >= ENOUGH
        ? `At least ${ENOUGH}: the work order says build the picked mode for these (D9).`
        : `Fewer than ${ENOUGH}: the work order says write this table down and build nothing (D9).`);
    }
  }
}

if (process.argv[1]?.endsWith("measure-picked.ts")) main();
