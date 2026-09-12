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
import {
  acceptFromRows, clockInPlay, contextFromRows, knowing, replay, sceneLemmas, type Row, type StoredDraw,
} from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { seedFrom } from "../lib/random/seeded";
import { replyFor, datumLine, cardAfterHurdles, cardChosen, cardInPlay, counterBeat, wantsAsideFor } from "../lib/scenes/reply";
import { asideFor, asideOwed, asksToHearAgain, shrug } from "../lib/scenes/aside";
import { currentBeat, hurdleBeat, hurdleSpec, isOver } from "../lib/scenes/state";
import { sceneLine } from "../lib/scenes/line";
import { PERSONAS } from "../lib/scenes/personas";
import { answerBeatId, sceneBeats } from "../lib/scenes/scripted";
import { offerFor } from "../lib/scenes/grades";
import { choiceOf } from "../lib/scenes/choice";
import { words } from "../lib/scenes/lexicon";
import { shippedDictionary } from "./lib/dictionary";
import { dealtNumbers, type RoleCard } from "../lib/scenes/props";
import { stageFor, composeNote } from "../lib/scenes/reply";
import { isKnownForm } from "../lib/dict/forms";
import { askLine, chain as providerChain, HARNESS_LEVEL } from "./lib/sceneDraft";
import type { Level } from "../lib/collections/syllabus";
import type { Lexicon } from "../lib/scenes/lexicon";

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
}));

const argv = process.argv.slice(2);
const arg = (name: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const args = (name: string) => argv.flatMap((v, i) => (v === `--${name}` && argv[i + 1] !== undefined ? [argv[i + 1]!] : []));

/** `--compose` plays it through the app's own scene chain, as `play:scenes` does. */
const LINKS = argv.includes("--compose") ? providerChain().filter((l) => !arg("model") || l.model === arg("model")) : [];
async function vouchOf(lexicon: Lexicon, spellings: readonly string[]): Promise<ReadonlySet<string>> {
  const out = new Set<string>();
  await Promise.all([...new Set(spellings)].map(async (word) => {
    if (lexicon.forms.has(word) || await isKnownForm(word)) out.add(word);
  }));
  return out;
}

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
  const persona = PERSONAS.find((p) => p.id === run.persona.id)!;
  for (const prop of card.props) console.log(`   card: ${prop.card} ${prop.theirs ? "(theirs)" : ""} = ${prop.value}`);

  const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
  const used = new Set<string>();
  let heard = "";
  for (let n = 0; n <= SAID.length; n++) {
    const marking = await knowing(context, turns.map((t) => t.said));
    const { state, response, elsewhere } = replay(marking, draw, turns);
    const beat = currentBeat(scene, state);
    const standing = state.hurdle ? hurdleBeat(state.hurdle) : null;
    const speaking = response === "counter" && beat?.counter ? counterBeat(beat) : beat;
    const inPlay = cardChosen(
      cardAfterHurdles(cardInPlay(draw.card, scene.beats, state.countered), state),
      state.turns,
      (lemma) => context.marker.englishFor?.get(lemma)?.[0],
    );
    const last = state.turns[state.turns.length - 1] ?? null;
    const answered = last ? sceneBeats(scene).find((b) => b.id === last.beatId) ?? null : null;
    const spokenFor = standing ?? speaking ?? (answered?.move === "close" ? answered : undefined);

    const askedNow = last?.asked ?? null;
    const landedNow = response === "answer" || response === "counter" || elsewhere > 0;
    const wantsAside = wantsAsideFor(askedNow, turns.length ? response : null, last?.reading ?? null, elsewhere > 0);
    const fresh = (id: string | undefined) => (id ? context.scripted.get(id) ?? [] : []).filter((t) => !used.has(t));
    const asking = {
      asked: askedNow, spoken: words(last?.said ?? ""), said: last?.said ?? "", answered, card: inPlay, lexicon: context.lexicon,
      more: fresh(answered?.id), answers: answered ? fresh(answerBeatId(answered)) : [], missed: !landedNow,
    };
    let aside = wantsAside ? asideFor(asking) : null;
    // "Sorry, what?" gets the line again, never the shrug (the route's rule).
    const hearAgain = asksToHearAgain(words(last?.said ?? ""), context.marker.questionWords, context.lexicon);
    if (wantsAside && aside === null && hearAgain && heard) aside = { text: heard, provenance: "again" as const };

    let line = null;
    const speaksEnglish = Boolean(standing && hurdleSpec(state)?.said);
    if (spokenFor && !(spokenFor.awaits && !standing) && !speaksEnglish) {
      const talk = state.turns.slice(-6).flatMap((t) => [
        ...(t.heard ? [{ role: "assistant" as const, content: t.heard }] : []),
        { role: "user" as const, content: t.said },
      ]);
      const agenda = scene.beats.slice(state.beat).filter((b) => !state.done.includes(b.id)).map((b) => stageFor(b, inPlay));
      const settled = scene.beats.filter((b) => state.done.includes(b.id)).map((b) => stageFor(b, inPlay));
      const anticipated = askedNow && answered?.answer ? stageFor({ ...answered, they: answered.answer }, inPlay) : null;
      const handing = (response === "help" || response === "moveOn") && answered
        ? offerFor(answered, inPlay, context.marker.questionWords, last?.met ?? []) : null;
      const facts = (inPlay?.props ?? []).map((prop) => {
        const value = prop.english ?? prop.shown[0] ?? prop.value;
        return `${prop.card.replace(/\.$/, "")}: ${value}${prop.theirs ? " (yours to tell them)" : " (on the learner's card)"}`;
      });
      const deviated = Boolean(askedNow) || last?.reading === "offtarget" || last?.reading === "incomplete";
      const theirs = deviated ? words(last?.said ?? "").filter((w) => context.lexicon.forms.has(w) || marking.marker.known?.(w)) : [];
      const beatFor = spokenFor;
      const cheap = await sceneLine({
        beat: beatFor, lexicon: context.lexicon,
        gate: { ...context.gate, dealt: dealtNumbers(inPlay), times: clockInPlay(inPlay, context.lexicon) },
        pool: (askedNow || handing) && LINKS.length > 0 ? [] : context.pool.get(beatFor.id) ?? [],
        topic: new Set([...(context.topic.get(beatFor.id) ?? []), ...theirs]),
        hasFiniteVerb: context.hasFiniteVerb, fallback: context.fallback,
        scripted: context.scripted.get(beatFor.id) ?? [], used,
        rotate: seedFrom(`${scene.id}:${run.seed}`), mode: LINKS.length > 0 ? "composed" : "scripted",
        vouch: (spellings: readonly string[]) => vouchOf(context.lexicon, spellings),
        ...(LINKS.length > 0 ? {
          compose: (avoid: readonly string[], because?: string) => askLine(LINKS, {
            move: beatFor.move, they: stageFor(beatFor, inPlay), reading: "", facts, because, agenda, settled,
            examples: [...context.scripted.entries()].filter(([id]) => id !== beatFor.id).flatMap(([, l]) => l.slice(0, 1)).slice(0, 6),
            asked: (context.scripted.get(beatFor.id) ?? []).slice(0, 2),
            note: composeNote(turns.length > 0 ? response : null, last?.reading ?? null, elsewhere > 0, askedNow, { offer: handing, answer: anticipated }),
            avoid,
          }, {
            scene: scene.title, place: scene.place, level, persona: persona.who, situation: scene.role,
            register: scene.register, words: [...context.lexicon.byLemma.keys()],
          }, talk, () => {}, (l) => { if (argv.includes("--drafts")) console.log(`      ~ drafted: ${l}`); }),
        } : {}),
      });
      line = cheap.provenance !== "fallback" ? cheap : datumLine(spokenFor, inPlay, context.lexicon) ?? cheap;
      if (line.provenance === "composed") aside = null;
      else if (wantsAside && landedNow && !aside && asideOwed(asking) && !hearAgain) aside = shrug(context.lexicon);
    }
    const lines = replyFor({
      beat: speaking, answered: turns.length ? answered : null, response: turns.length ? response : null,
      reading: last?.reading ?? null, line, heard, said: last?.said ?? null, card: inPlay, translates: persona.translates,
      askedForEnglish: last?.wantsEnglish === true, acknowledges: persona.acknowledges, echo: last?.matched?.[0] ?? null,
      recast: Boolean(last?.slips?.some((s) => s.form && s.form === last?.matched?.[0])),
      aside, landed: elsewhere > 0,
      offer: (response === "help" || response === "moveOn") && answered
        ? offerFor(answered, inPlay, context.marker.questionWords, last?.met ?? []) : null,
      met: state.done.length,
      arriving: speaking ? !state.turns.some((t) => t.beatId === speaking.id) : false,
      tries: answered ? state.turns.filter((t) => t.beatId === answered.id).length : 0,
      choice: answered ? choiceOf({
        beat: answered, card: inPlay, lexicon: context.lexicon,
        dealt: new Map(scene.props.flatMap((p) => p.kind === "word" || p.kind === "weekday" ? [[p.slot, p.oneOf] as const] : [])),
        roll: state.turns.length, met: last?.met ?? [],
      }) : null,
      hurdle: standing ? { beat: standing, line: standing === spokenFor ? line : null, said: hurdleSpec(state)?.said } : null,
    });
    if (last) console.log(`      [${last.reading} · response ${response} · patience ${state.patience}${last.asked ? ` · asked ${last.asked}` : ""}]`);
    for (const l of lines) {
      console.log(`   THEM: ${l.text}   <${l.provenance}${l.reaction ? ", reaction" : ""}>`);
      if (l.provenance === "attested" || l.provenance === "scripted") used.add(l.text);
    }
    const move = [...lines].reverse().find((l) => !l.reaction);
    if (move && move.provenance !== "unspoken") heard = move.text;
    if (isOver(scene, state)) { console.log(`   -> over: ${state.done.join(", ")}`); break; }
    const target = standing ?? beat;
    const said = SAID[n];
    if (!target || said === undefined) break;
    console.log(`   YOU: ${said}      (goal: ${target.goal})`);
    turns.push({ beatId: target.id, said, helped: false, heard });
  }
}
main();
