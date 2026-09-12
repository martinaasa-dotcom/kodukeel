/**
 * Draft the other side's lines before anybody plays, and keep only what the
 * gate lets through.
 *
 *   npm run draft:lines                    # every scriptable beat short of WANT lines, at every band
 *   npm run draft:lines -- --scene poodi-piima
 *   npm run draft:lines -- --level A1      # one band only
 *   npm run draft:lines -- --unpitched     # the net under every band, as the bank was first drafted
 *   npm run draft:lines -- --refresh       # drop unreviewed rows first and draft again
 *
 * A LINE IS DRAFTED FOR A BAND. The other side talks at the run's band
 * (`lib/scenes/pitch.ts`) and a banked line is a composed line moved to a
 * different moment, so it is drafted per band with the same pitch in front of
 * it and the band is written on the row; `scriptedFor` reads a run's own band
 * first. The rows drafted before bands existed carry none and stay as the net
 * under every band, so a beat no band could be drafted for still has a line.
 * A pitched row is refused before the gate where it runs past its band's own
 * ceiling (`fitsPitch`), since a forty-word A1 line is not an A1 line whatever
 * the model was told.
 *
 * ADR-025 amendment 1 (`lib/scenes/scripted.ts`). This is the composer moved
 * to a different moment: the same chain, the same prompt and the same four
 * checks as a live turn, run on a developer's machine, with the survivors
 * written into `lib/scenes/bank.ts` where the pull request is the review. A
 * native speaker's pass, when there is one, edits that file and flips
 * `reviewed`; this script never touches a row somebody has reviewed.
 *
 * WHAT IS REFUSED BEFORE THE GATE IS EVEN ASKED, and each is a way a bad line
 * would otherwise look like a good one:
 *   - a beat that is not scriptable, because its line has to name a value the
 *     card draws per run (`scriptable`);
 *   - a line holding a digit, since a number in a scripted line is a number
 *     nobody was dealt, and the gate cannot vouch for digits either way;
 *   - a line holding a dash or a colon, which is a model narrating or listing
 *     rather than speaking, and which the copy rules forbid on a screen;
 *   - a line that hands over the form the beat is about to ask for. "Kas sa
 *     tahad piima osta?" before a beat that wants `piima` is the answer printed
 *     in the question, which is the fault `npm run audit:questions` hunts on
 *     every card, and a learner who copies it out has retrieved nothing;
 *   - the way out itself, because "I did not catch that" as a scripted line
 *     is the fallback wearing a better chip;
 *   - a line of four words or more with no finite verb in it, outside the
 *     greeting and the farewell, which is the fault the gate cannot see and
 *     the first full run produced: "Kus pood praegu olema?", a
 *     `ma`-infinitive standing where "on" belongs. The retrieval rung already
 *     holds a recorded usage to that floor (`lacksFiniteVerb`);
 *   - a duplicate of a line already in the bank for that beat, spelled the
 *     same or the same once lowercased.
 *
 * AND THE RULES ARE APPLIED TO WHAT IS ALREADY THERE, on every run. An
 * unreviewed row that today's gate or today's refusals would not let in is
 * dropped and reported before anything is drafted, so a rule added after a
 * bank was written reaches the bank rather than only the next line. A row a
 * native speaker has reviewed is never touched by a script.
 *
 * A run that drafts nothing says which wall it hit rather than reporting a
 * full bank, which is the rule `eval:scene` learned the expensive way.
 */
import { writeFileSync } from "node:fs";
import { gateFor, runGate, passes } from "../lib/scenes/gate";
import { fitsPitch } from "../lib/scenes/pitch";
import { LEVELS, type Level } from "../lib/collections/syllabus";
import { SCENES, FALLBACK_PHRASE } from "../lib/scenes/catalogue";
import { BANK } from "../lib/scenes/bank";
import { beatById, sceneBeats, scriptable, type ScriptedLine } from "../lib/scenes/scripted";
import { words } from "../lib/scenes/lexicon";
import {
  ANSWERED, REFUSALS, answerForms, chain, compose, keylessContext, lacksFiniteVerb,
} from "./lib/sceneDraft";
import type { BeatSpec } from "../lib/scenes/types";

/** How many lines a beat is drafted up to. Three is enough variety for one run, and few enough to read. */
const WANT = 3;
/** And per band: two, because five bands of three is a bank nobody reads in a pull request. */
const WANT_PITCHED = 2;
/** How many attempts a beat gets before this gives up on it for today. */
const ATTEMPTS = 8;
/** How many beats are drafted at once. Twelve, measured against the paid key this was drafted with; a free tier may want fewer. */
const POOL_SIZE = 12;

const sceneArg = process.argv.indexOf("--scene");
const onlyScene = sceneArg >= 0 ? process.argv[sceneArg + 1] : undefined;
const refresh = process.argv.includes("--refresh");
const levelArg = process.argv.indexOf("--level");
/** Which bands to draft for: one, all five, or none (`--unpitched`, the old shape). */
const BANDS: readonly (Level | undefined)[] = process.argv.includes("--unpitched")
  ? [undefined]
  : levelArg >= 0 ? [process.argv[levelArg + 1] as Level] : LEVELS;

const OUT = "lib/scenes/bank.ts";

/** A line the gate should not even be asked about. */
function refused(
  text: string, fallback: string, answers: ReadonlySet<string>, beat: BeatSpec, level?: Level,
): string | null {
  if (/\d/.test(text)) return "digit";
  if (level) { const why = fitsPitch(text, level); if (why) return `over the band: ${why}`; }
  if (/[\u2013\u2014:;]/.test(text)) return "dash or colon";
  if (words(text).join(" ") === words(fallback).join(" ")) return "the way out";
  if (!/[.?!]$/.test(text.trim())) return "no end";
  if (words(text).some((word) => answers.has(word))) return "gives the answer away";
  if (lacksFiniteVerb(text, beat)) return "no finite verb";
  return null;
}

async function main() {
  const links = chain();
  if (links.length === 0) {
    console.log("No provider key is set, so nothing can be drafted. Set GEMINI_API_KEY or GROQ_API_KEY.");
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);

  let drafted = 0, asked = 0, withheld = 0, skipped = 0, dropped = 0;
  const reasons = new Map<string, number>();
  const note = (why: string) => reasons.set(why, (reasons.get(why) ?? 0) + 1);

  // What is already there, re-judged by today's rules. Reviewed rows are a person's and stay.
  const contexts = new Map(SCENES.map((scene) => [scene.id, keylessContext(scene)]));
  const kept: ScriptedLine[] = BANK.filter((row) => {
    if (row.reviewed) return true;
    if (refresh) return false;
    const scene = SCENES.find((s) => s.id === row.scene);
    const beat = scene ? beatById(scene, row.beat) : undefined;
    const context = scene && contexts.get(scene.id);
    if (!scene || !beat || !context || !scriptable(scene, beat)) { dropped++; note("dropped: no such beat"); return false; }
    const verdict = runGate(row.text, beat, gateFor(row.beat, context.gate));
    if (!passes(verdict)) { dropped++; note(`dropped: gate ${verdict.failed.join("/")}`); return false; }
    const why = refused(row.text, FALLBACK_PHRASE, answerForms(beat, context.lexicon), beat, row.level);
    if (why) { dropped++; note(`dropped: ${why}`); return false; }
    return true;
  });
  /*
    Keyed on the text and not on the band: the ladder's `used` set is keyed
    on text, so one line at two bands is one line said once, and the bank
    test refuses a beat repeating itself whatever the rows say about bands.
  */
  const seen = new Set(kept.map((row) => `${row.scene}|${row.beat}|${row.text.toLowerCase()}`));

  /*
    EVERY (SCENE, BEAT, BAND) IS ONE TASK, AND A FEW RUN AT ONCE. Five bands
    over fourteen scenes is about eight hundred and seventy slots at two to
    eight calls each, which serially is an afternoon; a pool cuts that to a
    fraction. `kept` and `seen` are shared and that is safe, because every
    write to them happens between awaits on one thread, and the duplicate
    check runs on the same tick as the push.
  */
  const tasks: (() => Promise<void>)[] = [];
  for (const scene of SCENES) {
    if (onlyScene && scene.id !== onlyScene) continue;
    const { lemmas, gate, lexicon } = contexts.get(scene.id)!;
    for (const beat of sceneBeats(scene)) {
      if (!scriptable(scene, beat)) { skipped++; continue; }
      // The lemmas the beat asks the learner for, which the line may not say.
      const withhold = beat.needs.flatMap((need) => (need.kind === "case" ? [need.lemma] : []));
      for (const level of BANDS) {
        tasks.push(async () => {
          const want = level ? WANT_PITCHED : WANT;
          const have = () => kept.filter((row) => row.scene === scene.id && row.beat === beat.id && row.level === level).length;
          let attempts = 0;
          while (have() < want && attempts < ATTEMPTS) {
            attempts++;
            const first = await compose(scene, beat, lemmas, undefined, links, withhold, level);
            if (!first) break;
            asked++;
            let candidate = first;
            let verdict = runGate(candidate.text, beat, gateFor(beat.id, gate));
            if (!passes(verdict) && verdict.unknown.length > 0) {
              // The one retry, with the failing words named. The design's rule, not a kindness.
              const second = await compose(scene, beat, lemmas, verdict.unknown, links, withhold, level);
              if (second) { asked++; candidate = second; verdict = runGate(candidate.text, beat, gate); }
            }
            if (!passes(verdict)) { withheld++; for (const c of verdict.failed) note(`gate: ${c}`); continue; }
            const why = refused(candidate.text, FALLBACK_PHRASE, answerForms(beat, lexicon), beat, level);
            if (why) { withheld++; note(why); continue; }
            const key = `${scene.id}|${beat.id}|${candidate.text.toLowerCase()}`;
            if (seen.has(key)) { note("duplicate"); continue; }
            seen.add(key);
            kept.push({
              scene: scene.id, beat: beat.id, text: candidate.text,
              model: candidate.model, draftedAt: today, reviewed: false,
              ...(level ? { level } : {}),
            });
            drafted++;
          }
          console.log(`  ${scene.id}/${beat.id}${level ? ` @${level}` : ""}: ${have()} of ${want}${attempts >= ATTEMPTS && have() < want ? " (gave up for today)" : ""}`);
        });
      }
    }
  }
  await Promise.all(Array.from({ length: POOL_SIZE }, async () => {
    for (let next = tasks.shift(); next; next = tasks.shift()) await next();
  }));

  kept.sort((a, b) => a.scene.localeCompare(b.scene) || a.beat.localeCompare(b.beat)
    || (a.level ?? "").localeCompare(b.level ?? "") || a.text.localeCompare(b.text));
  writeFileSync(OUT, render(kept));

  console.log(`\n${drafted} new line${drafted === 1 ? "" : "s"} kept, ${withheld} withheld, ${asked} asked, ${dropped} already-banked row${dropped === 1 ? "" : "s"} dropped by today's rules; ${skipped} beat${skipped === 1 ? "" : "s"} not scriptable. ${kept.length} rows in ${OUT}.`);
  if (reasons.size) console.log("  Why lines were refused: " + [...reasons].map(([w, n]) => `${w} x${n}`).join(", "));
  if (ANSWERED.size) console.log("  Who answered: " + [...ANSWERED].map(([m, n]) => `${m} ${n}`).join(", "));
  if (REFUSALS.size) console.log("  Who would not, and with what status: " + [...REFUSALS].map(([m, n]) => `${m} x${n}`).join(", "));
  if (asked === 0) {
    console.log("\n  NOTHING WAS ASKED, so the bank is exactly what it was. Free models are limited per day; the statuses above say which wall was hit.");
  }
}

/** One row per line, so a diff reads as lines added rather than a file rewritten. */
function render(rows: readonly ScriptedLine[]): string {
  const body = rows.map((row) =>
    `  { scene: ${JSON.stringify(row.scene)}, beat: ${JSON.stringify(row.beat)}, text: ${JSON.stringify(row.text)},`
    + ` model: ${JSON.stringify(row.model)}, draftedAt: ${JSON.stringify(row.draftedAt)}, reviewed: ${row.reviewed}`
    + (row.level ? `, level: ${JSON.stringify(row.level)}` : "") + " },",
  ).join("\n");
  return [
    "/* GENERATED by scripts/draft-lines.ts. Do not add a line by hand.",
    "",
    "   Every row was drafted by a model inside its scene's closed word list, passed",
    "   the four checks in lib/scenes/gate.ts on the day named, and was read in the",
    "   pull request that added it. The one field a person edits is `reviewed`,",
    "   which a native speaker sets to true after reading the row, and which the",
    "   chip on screen reads. Regenerate with `npm run draft:lines`; the script",
    "   keeps rows that are already here and only drafts what is missing. A row",
    "   whose model is `authored` was typed in a session rather than drafted, and",
    "   went through the same checks on its way in; a beat named `hurdle:<id>` is",
    "   a curveball's line; a row carrying `level` was drafted for that band with",
    "   the band's pitch in front of the model, and a row carrying none is the net",
    "   under every band (lib/scenes/scripted.ts is what reads this; ADR-025",
    "   amendment 1.) */",
    'import type { ScriptedLine } from "./scripted";',
    "",
    "export const BANK: readonly ScriptedLine[] = [",
    body,
    "];",
    "",
  ].join("\n");
}

main().catch((error) => { console.error(error); process.exit(1); });
