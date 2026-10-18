#!/usr/bin/env tsx
/**
 * THE LINES A LEARNER MAY PICK, AS A SHEET.
 *
 *   npm run review:picks                       writes pick-review.csv here
 *   npm run review:picks -- --out sheet.csv    or wherever you say
 *
 * One row per line in `lib/scenes/picks/`, grouped by scene in the order the
 * conversation plays it, then the shared answers to the curveballs once. `goal`
 * is what the learner is asked to do on that beat, in English, so the line can
 * be read against its moment. A `{slot}` is a value off the learner's card,
 * filled in when the line is offered; `{slot:CASE}` is that value in the case
 * named, spelled by the dictionary. The reader fills in `ok` for a line that
 * is right, or writes it again in `correction`, and `why` for a note.
 * `npm run apply:picks-review -- sheet.csv` reads it back.
 */
import { writeFileSync } from "node:fs";
import { SCENES as LISTED } from "@/lib/scenes/catalogue";
import { LESSON_SCENES } from "@/lib/scenes/lessonScenes";

// The lessons' own conversations offer picks too.
const SCENES = [...LISTED, ...LESSON_SCENES];
import { PICKS, CURVEBALL_PICKS } from "@/lib/scenes/picks/index";
import { csvCell } from "./lib/csv";

const at = process.argv.indexOf("--out");
const out = at >= 0 ? process.argv[at + 1] : "pick-review.csv";
if (!out) {
  console.error("Usage: npm run review:picks -- [--out sheet.csv]");
  process.exit(1);
}

const rows: string[][] = [["scene", "beat", "goal", "line", "english", "ok", "correction", "why"]];
for (const scene of SCENES) {
  const picks = PICKS[scene.id];
  if (!picks) continue;
  const order = [...scene.beats.map((b) => b.id), ...Object.keys(picks).filter((id) => !scene.beats.some((b) => b.id === id))];
  for (const id of order) {
    const goal = scene.beats.find((b) => b.id === id)?.goal ?? "";
    for (const pick of picks[id] ?? []) rows.push([scene.id, id, goal, pick.et, pick.en, "", "", ""]);
  }
}
for (const [id, specs] of Object.entries(CURVEBALL_PICKS)) {
  for (const pick of specs) rows.push(["(every scene)", `hurdle:${id}`, "", pick.et, pick.en, "", "", ""]);
}
writeFileSync(out, "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
console.log(`${rows.length - 1} lines to pick, written to ${out}.`);
