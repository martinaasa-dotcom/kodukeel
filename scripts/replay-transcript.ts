/**
 * Replays one transcript keyless through the app's own marker and reply
 * ladder, and prints what the other side says at each turn.
 *
 *   npm run replay:scene
 *   npm run replay:scene -- --scene bussipilet --curveball wrong-price@pay \
 *       --say "Tervist" --say "Ma tahan pilet" --say "Kui palju?"
 *
 * A reproduction tool rather than a suite: `npm run play:scenes` generates the
 * learner, and this takes the learner's own words off a real report so the
 * exact exchange can be read before and after a change. The default transcript
 * is the one from the report that produced §69 of `docs/21-situations.md`, a
 * learner at a ticket window asking the price after being told it had changed.
 * No check passes or fails here.
 */
import { sceneById } from "../lib/scenes/catalogue";
import { acceptFromRows, contextFromRows, sceneLemmas, type Row, type StoredDraw } from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { shippedDictionary } from "./lib/dictionary";
import type { RoleCard } from "../lib/scenes/props";
import { chain as providerChain, HARNESS_LEVEL } from "./lib/sceneDraft";
import { playScripted, printEvents } from "./lib/keylessPlay";
import type { Level } from "../lib/collections/syllabus";
import { installMeter } from "./lib/meter";

// What this run spends, capped and said on exit (`scripts/lib/meter.ts`); replay on, because it reads transcripts, so a turn asked before is answered from the record.
installMeter({ replay: true });

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
}));

const argv = process.argv.slice(2);
const arg = (name: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const args = (name: string) => argv.flatMap((v, i) => (v === `--${name}` && argv[i + 1] !== undefined ? [argv[i + 1]!] : []));

/** `--compose` plays it through the app's own scene chain, as `play:scenes` does. */
const LINKS = argv.includes("--compose") ? providerChain().filter((l) => !arg("model") || l.model === arg("model")) : [];
const SAID = args("say").length > 0 ? args("say") : [
  "Tervist", "Ma tahan pilet", "Ma lähen peatusse", "Vabandust, ma lähen jaama", "Kell 14.00",
  "Kui palju?", "Mis hind on?", "5?", "Kas 5 eurot?", "sa ütlesid, et hind on nüüd teine, mis uus hind on?",
  "fuck you",
];

async function main() {
  const scene = sceneById(arg("scene") ?? "bussipilet");
  if (!scene) { console.error(`no scene called ${arg("scene")}`); process.exit(1); }
  /** The band the other side talks at, which in the app is the learner's own. */
  const level = (arg("level") ?? HARNESS_LEVEL) as Level;
  const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), level);
  const context = { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows) } };
  const run = planRun(scene, "repro", level, "textbook");
  const card: RoleCard = {
    ...run.card,
    props: run.card.props.map((p) => p.slot === "to"
      ? { ...p, lemmas: ["jaam"], value: "jaam" }
      : p.slot === "time" ? { ...p, value: "14:00", literal: ["14:00", "14.00", "14"], shown: ["14:00"] } : p),
  };
  /*
    Which curveball, and at which beat, as `id@beat`. The report's run drew
    the price curveball at the beat that asks how they are paying.
  */
  const pin = (arg("curveball") ?? (scene.id === "bussipilet" ? "wrong-price@pay" : "")).split("@");
  const at = pin[1] ? scene.beats.findIndex((b) => b.id === pin[1]) : -1;
  const curveballs = pin[0] && at > 0 ? [{ id: pin[0], at }] : [];
  const draw: StoredDraw = { persona: run.persona.id, card, curveballs, lines: LINKS.length > 0 ? "composed" : "scripted", patience: run.patience };
  for (const prop of card.props) console.log(`   card: ${prop.card} ${prop.theirs ? "(theirs)" : ""} = ${prop.value}`);

  const events = await playScripted({
    scene, context, draw, runSeed: run.seed, level, links: LINKS,
    next: ({ n }) => SAID[n],
    maxTurns: SAID.length,
    onDraft: (line) => { if (argv.includes("--drafts")) console.log(`      ~ drafted: ${line}`); },
  });
  printEvents(events);
}
main();
