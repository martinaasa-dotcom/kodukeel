#!/usr/bin/env tsx
/**
 * THE CONVERSATION LINES NOBODY HAS READ, AS A SHEET.
 *
 *   npm run review:scenes                         writes scene-review.csv here
 *   npm run review:scenes -- --out sheet.csv      or wherever you say
 *   npm run review:scenes -- --scenes a,b         only those conversations
 *
 * One row per prepared line in `lib/scenes/bank/` that carries no `reviewedAt`,
 * grouped by scene in the order the conversation plays it. `goal` is what the
 * learner is asked to do on that beat and `they` is what the other side is
 * doing, both in English, so the line can be read against its moment. The
 * reader fills in `ok` (anything at all) for a line that is right as it is,
 * or writes the line again in `correction`, and `why` for a note.
 * `npm run apply:scene-review -- sheet.csv` reads it back.
 */
import { writeFileSync } from "node:fs";
import { SCENES } from "@/lib/scenes/catalogue";
import { BANK } from "@/lib/scenes/bank";
import { beatById } from "@/lib/scenes/scripted";
import { sceneSheet } from "@/lib/review/sceneSheet";
import { csvCell } from "./lib/csv";

const at = process.argv.indexOf("--out");
const out = at >= 0 ? process.argv[at + 1] : "scene-review.csv";
if (!out) {
  console.error("Usage: npm run review:scenes -- [--out sheet.csv]");
  process.exit(1);
}

const only = process.argv.indexOf("--scenes");
const wanted = only >= 0 ? new Set((process.argv[only + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean)) : null;
const unknown = wanted ? [...wanted].filter((id) => !SCENES.some((s) => s.id === id)) : [];
if (unknown.length > 0) {
  console.error(`No such conversation: ${unknown.join(", ")}`);
  process.exit(1);
}
const scenes = wanted ? SCENES.filter((s) => wanted.has(s.id)) : SCENES;

const rows = sceneSheet(scenes, BANK, (scene, id) => {
  const beat = beatById(scene, id);
  return beat ? { goal: beat.goal, they: beat.they ?? "" } : null;
});
writeFileSync(out, "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
const covered = new Set(rows.slice(1).map((r) => r[0]));
console.log(`${rows.length - 1} lines nobody has reviewed yet, across ${covered.size} conversations, written to ${out}.`);
