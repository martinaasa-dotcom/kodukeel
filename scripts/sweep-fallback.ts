/**
 * Every scene, played with no model, against every curveball it admits at
 * every place one can stand, by eight kinds of learner, and read for the
 * faults a person would notice.
 *
 *   npx tsx scripts/sweep-fallback.ts                  # every scene
 *   npx tsx scripts/sweep-fallback.ts --scene apteek   # one
 *   npx tsx scripts/sweep-fallback.ts --out dir        # keep every transcript
 *
 * The no-model path is what a learner meets on the day the model's quota is
 * spent, and a critic reading a sample of conversations sees a sample. This
 * plays all of them, keyless, through the app's own loop
 * (`scripts/lib/keylessPlay.ts`), and flags each line that breaks one of the
 * rules below, so the fallback can be held to "every situation, every
 * curveball" rather than to the two a report happened to mention. A flag is a
 * line to read rather than a verdict; the transcripts are kept for that.
 * No model is asked anything and nothing is written but the report.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCENES, sceneById } from "../lib/scenes/catalogue";
import { curveballById } from "../lib/scenes/curveballs";
import { acceptFromRows, contextFromRows, sceneLemmas, type Row, type StoredDraw } from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { caseKeyFor, type Lexicon } from "../lib/scenes/lexicon";
import { leafNeeds, type BeatSpec, type SceneSpec } from "../lib/scenes/types";
import { propBySlot, type RoleCard } from "../lib/scenes/props";
import { shippedDictionary } from "./lib/dictionary";
import { HARNESS_LEVEL } from "./lib/sceneDraft";
import { installMeter } from "./lib/meter";

// It calls no model: every conversation is played with no link. Metered anyway, since the loop it
// drives can compose, so a later change that hands it a link is capped from its first call.
installMeter({ replay: false });
import { playScripted, printEvents, type Event, type Floor } from "./lib/keylessPlay";
import type { Level } from "../lib/collections/syllabus";

const argv = process.argv.slice(2);
const arg = (name: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const level = (arg("level") ?? HARNESS_LEVEL) as Level;
const outDir = arg("out");

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
}));

/*
  WHAT A LEARNER SAYS WHEN THEY DO WHAT THE OBJECTIVE ASKS. One option of the
  beat's requirements in its right form, which is `play:scenes`'s clean style:
  the point here is not whether the marker forgives, it is what the other side
  says back, so the answer itself should land.
*/
function rightAnswer(beat: BeatSpec, card: RoleCard | null, lexicon: Lexicon, register: string): string {
  const id = beat.id.startsWith("hurdle:") ? beat.id.slice("hurdle:".length) : null;
  if (id) {
    const asks: Record<string, string> = {
      "slot-gone": "Mis aeg siis sobib?",
      "not-possible": "Millal siis saab?",
      "place-instruction": "Kus see on?",
      "wrong-price": "Kui palju see nüüd maksab?",
      "missing-document": "Ei, mul ei ole seda.",
      "misheard": "Ei, mitte see.",
      "contradiction": "Ei, te ütlesite enne teisiti.",
      "faster": "Palun rääkige aeglasemalt.",
      "english": "Ma räägin eesti keelt.",
    };
    if (asks[id]) return asks[id]!;
  }
  const parts: string[] = [];
  const kinds = leafNeeds(beat.needs).map(({ need }) => need.kind);
  for (const { need } of leafNeeds(beat.needs)) {
    if (need.kind === "lemma") parts.push(need.oneOf[0]!);
    else if (need.kind === "case") parts.push(lexicon.caseForm.get(caseKeyFor(need.lemma, need.grammCase)) ?? need.lemma);
    else if (need.kind === "datum") parts.push((card ? propBySlot(card, need.slot)?.value : undefined) ?? "");
    else if (need.kind === "question") parts.push(beat.topic[0] ? `kas ${beat.topic[0]}?` : "kus?");
    else if (need.kind === "negation") parts.push("ei ole");
    else if (need.kind === "register") parts.push(register === "sina" ? "sina" : "teie");
    else if (need.kind === "any") parts.push("jah");
    // Every requirement once, so a beat that wants two things is given both.
  }
  let text = parts.join(" ").trim();
  if (kinds.includes("question") && kinds.includes("datum")) {
    const slot = leafNeeds(beat.needs).find(({ need }) => need.kind === "datum")!.need as { slot: string };
    text = `kus on ${(card ? propBySlot(card, slot.slot)?.value : undefined) ?? ""}?`;
  }
  return text || "jah";
}

/** The eight learners. Each takes the floor and says something; the first turn on a beat is where they differ. */
type Learner = (floor: Floor, answer: string, firstOnBeat: boolean) => string;
const QUESTIONS = ["Mis kell?", "Kui palju see maksab?", "Kus see on?", "Kuidas läheb?", "Miks?"];
const ASIDES = ["Mulle meeldib kohv.", "Ilm on täna ilus.", "Ma olen väga väsinud."];
const LEARNERS: Record<string, Learner> = {
  plain: (_f, answer) => answer,
  asker: (f, answer) => `${answer.replace(/[.?!]$/, "")}. ${QUESTIONS[f.n % QUESTIONS.length]}`,
  offtopic: (f, answer, first) => (first ? ASIDES[f.n % ASIDES.length]! : answer),
  lost: (_f, answer, first) => (first ? "Ma ei saa aru." : answer),
  english: (_f, answer, first) => (first ? "Sorry, I don't understand. Do you speak English?" : answer),
  decliner: (f, answer, first) => (first && (f.target.move === "offer" || f.target.counter) ? "Ei, see ei sobi." : answer),
  "early-bye": (f, answer) => (f.n === 2 ? "Aitäh, head aega!" : answer),
  wrong: (_f, answer, first) => (first ? "Ma ei tea." : answer),
};

/** One flag: a line somebody should read, and why. */
interface Flag { readonly rule: string; readonly at: string; readonly text: string; readonly context: string }

const FAREWELL = /\b(head aega|nägemist|hüvasti|kohtumiseni|head päeva|ilusat päeva)\b/i;
const GREETING = /^(tere|tervist|tere hommikust|tere õhtust|tere päevast)\b/i;
const ENGLISH = /\b(the|you|they|and|what|is|are|your)\b/i;

function stageText(beat: BeatSpec): string {
  return beat.they;
}

function flagsFor(scene: SceneSpec, events: readonly Event[], label: string, card: RoleCard | null, raised: string | null): Flag[] {
  const flags: Flag[] = [];
  const dealt = new Set((card?.props ?? []).flatMap((p) => p.literal.flatMap((l) => l.match(/\d+/g) ?? [])));
  let lastRead: Extract<Event, { kind: "read" }> | null = null;
  let lastYou = "";
  let lastTarget: BeatSpec | null = null;
  let previousMove: string | null = null;
  const moves = new Map<string, number>();
  let sawThem = 0;
  let notPossibleSaid = false;
  let over = false;
  const where = () => `${label} after "${lastYou}"`;
  for (const e of events) {
    if (e.kind === "you") { lastYou = e.said; lastTarget = e.target; for (const d of e.said.match(/\d+/g) ?? []) dealt.add(d); continue; }
    if (e.kind === "read") { lastRead = e; continue; }
    if (e.kind === "over") { over = true; continue; }
    const { line } = e;
    const text = line.text;
    sawThem += 1;
    const asked = lastRead?.asked ?? null;
    const landed = lastRead?.response === "answer";
    const youSaidBye = FAREWELL.test(lastYou);
    // 1. A shrug where the card or the scene had something to say: the price, when, or the curveball's own question.
    const priced = (card?.props ?? []).some((p) => p.price);
    const timed = (card?.props ?? []).some((p) => p.theirs && !p.price);
    const hurdleAsk = Boolean(lastTarget?.id.startsWith("hurdle:") && lastTarget.needs.some((n) => n.kind === "question"));
    const answerable = (/kui palju|maksab|hind/i.test(lastYou) && priced) || (asked === "millal" && timed) || hurdleAsk;
    if (/^ei tea\b/i.test(text) && asked && answerable) flags.push({ rule: "shrug-to-question", at: where(), text, context: `asked ${asked}` });
    // 2. "Sorry?" or thanks said to the wrong turn.
    // Except the apology for having misheard, which is what a correction is answered with.
    if (line.reaction && /^vabandust/i.test(text) && landed && lastTarget?.id !== "hurdle:misheard" && raised !== "interrupted") flags.push({ rule: "sorry-to-an-answer", at: where(), text, context: "the turn landed" });
    if (line.reaction && /^aitäh/i.test(text) && asked && lastRead?.reading !== "complete") flags.push({ rule: "thanks-for-a-question", at: where(), text, context: `asked ${asked}, ${lastRead?.reading}` });
    // 3. Goodbye before the end, hello after the start.
    if (FAREWELL.test(text) && !youSaidBye) {
      const closing = events.slice(events.indexOf(e)).some((x) => x.kind === "over");
      if (!closing) flags.push({ rule: "farewell-early", at: where(), text, context: "scene goes on" });
    }
    // Not the greeting offered or said again to somebody who has not greeted yet.
    if (sawThem > 1 && GREETING.test(text) && line.provenance !== "offered" && line.provenance !== "again") flags.push({ rule: "greeting-midscene", at: where(), text, context: line.provenance });
    // 4. A number nobody dealt.
    for (const d of text.match(/\d+/g) ?? []) {
      if (!dealt.has(d)) flags.push({ rule: "number-not-dealt", at: where(), text, context: d });
    }
    // 5. English said as a line.
    const narration = line.provenance === "unspoken" || line.provenance === "meanwhile";
    if (!narration && ENGLISH.test(text) && raised !== "english") flags.push({ rule: "english-line", at: where(), text, context: line.provenance });
    // English printed where a line should be, except the translation somebody asked for.
    // A beat that waits for the learner opens on its stage direction by design (`BeatSpec.awaits`).
    const waiting = scene.beats.some((b) => b.awaits && stageText(b) === text);
    if (line.provenance === "unspoken" && lastRead?.response !== "english" && !waiting) flags.push({ rule: "stage-direction-shown", at: where(), text, context: lastRead?.response ?? "" });
    // 6. Stuck: the same move again after a turn that landed, or one line three times.
    if (!line.reaction) {
      if (landed && previousMove === text && lastTarget?.id !== "hurdle:faster") flags.push({ rule: "same-line-after-landing", at: where(), text, context: "" });
      previousMove = text;
      const seen = (moves.get(text) ?? 0) + 1;
      moves.set(text, seen);
      if (seen === 3) flags.push({ rule: "line-three-times", at: where(), text, context: "" });
    }
    // 7. Today, after saying it cannot be done today.
    if (raised === "not-possible") {
      if (e.line.provenance === "scripted" && /\btäna\b/i.test(text) && /\bei\b/i.test(text)) notPossibleSaid = true;
      else if (notPossibleSaid && /\btäna\b/i.test(text) && !/\bei\b/i.test(text)) flags.push({ rule: "today-after-not-possible", at: where(), text, context: "" });
    }
  }
  if (!over) flags.push({ rule: "never-ends", at: label, text: lastYou, context: "ran out of turns" });
  return flags;
}

async function sweepScene(scene: SceneSpec) {
  const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), level);
  const context = { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows) } };
  const run = planRun(scene, "sweep", level, "textbook");
  const cases: { id: string | null; at: number }[] = [{ id: null, at: 0 }];
  for (const id of scene.curveballs) {
    const spec = curveballById(id);
    if (!spec || spec.silent) continue;
    for (let at = 1; at < scene.beats.length; at++) cases.push({ id, at });
  }
  const flags: Flag[] = [];
  let conversations = 0;
  const transcripts: string[] = [];
  for (const c of cases) {
    for (const [name, learner] of Object.entries(LEARNERS)) {
      const draw: StoredDraw = {
        persona: run.persona.id, card: run.card, curveballs: c.id ? [{ id: c.id, at: c.at }] : [],
        lines: "scripted", patience: run.patience,
      };
      const firsts = new Set<string>();
      const events = await playScripted({
        scene, context, draw, runSeed: run.seed, level, maxTurns: 30,
        next: (floor) => {
          const first = !firsts.has(floor.target.id);
          firsts.add(floor.target.id);
          return learner(floor, rightAnswer(floor.target, floor.card, context.lexicon, scene.register), first);
        },
      });
      conversations += 1;
      const label = `${scene.id} ${c.id ? `${c.id}@${scene.beats[c.at]!.id}` : "no curveball"} ${name}`;
      const found = flagsFor(scene, events, label, run.card, c.id);
      flags.push(...found);
      if (outDir) {
        const lines: string[] = [`=== ${label}${found.length ? `  [${found.map((f) => f.rule).join(", ")}]` : ""}`];
        printEvents(events, (l) => lines.push(l));
        transcripts.push(lines.join("\n"));
      }
    }
  }
  if (outDir) writeFileSync(join(outDir, `${scene.id}.txt`), transcripts.join("\n\n"));
  return { conversations, flags };
}

async function main() {
  const scenes = arg("scene") ? [sceneById(arg("scene")!)!] : [...SCENES];
  if (outDir) mkdirSync(outDir, { recursive: true });
  const all: Flag[] = [];
  let total = 0;
  for (const scene of scenes) {
    const { conversations, flags } = await sweepScene(scene);
    total += conversations;
    all.push(...flags);
    console.log(`${scene.id}: ${conversations} conversations, ${flags.length} flags`);
  }
  const byRule = new Map<string, Flag[]>();
  for (const f of all) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  console.log(`\n${total} conversations, ${all.length} flags`);
  for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n## ${rule}: ${list.length}`);
    const distinct = new Map<string, Flag>();
    for (const f of list) distinct.set(`${f.at.split(" ")[0]}|${f.text}|${f.context}`, f);
    for (const f of [...distinct.values()].slice(0, 25)) console.log(`   ${f.at}\n      -> ${f.text}${f.context ? `   (${f.context})` : ""}`);
    if (distinct.size > 25) console.log(`   ... ${distinct.size - 25} more distinct`);
  }
}
main();
