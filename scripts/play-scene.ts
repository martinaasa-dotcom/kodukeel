/**
 * Plays every scene against the shipped dictionary, as an imperfect learner,
 * and prints the conversations.
 *
 *   npx tsx scripts/play-scene.ts            (no database, no key)
 *   npx tsx scripts/play-scene.ts --scene tee-kusimine --style sloppy
 *   npx tsx scripts/play-scene.ts --compose --model google/gemma-4-31b-it:free
 *
 * No check passes or fails here. This is the instrument for reading whether
 * the other side sounds like anybody: the route's own ladder (`sceneLine`,
 * `datumLine`, `asideFor`, `replyFor`) over `replay`, keyless, so what prints
 * is exactly what a deployment with no model says.
 *
 * `--compose` is the other half, and it exists because the model stopped being
 * a rare fallback: since ADR-025 amendment 1 it is asked on every beat that
 * carries content, so a harness that only ever plays the keyless path measures
 * the net rather than the app. With it, the same ladder runs with a real
 * composer behind it, through `lib/scenes/prompt.ts`, which is the route's own
 * prompt rather than a copy, and through `runGate` with this run's dealt
 * numbers, which is the route's own gate. What it does not go through is
 * `lib/usage/ledger.ts`, for the reason `eval:scene` gives about itself: the
 * ledger rations one learner's share of a deployment's budget and nobody's
 * allowance is involved when a developer measures against their own key.
 *
 * `--model` pins one model so the chain cannot answer for it, which is how a
 * question about which free model to put in front gets an answer rather than a
 * guess. The learner is generated
 * from each beat's own requirements, in one of three styles: `clean` says the
 * form the beat wants, `sloppy` drops a diacritic, uses the wrong case and an
 * infinitive where a person was due, and `curious` does that and asks a
 * question the beat did not ask for. Reading the sloppy and curious runs is
 * how the marker's tolerance and the asides were shaped.
 */
import { SCENES, sceneById } from "../lib/scenes/catalogue";
import { contextFromRows, knowing, replay, sceneLemmas, type Row, type StoredDraw } from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { replyFor, datumLine, cardInPlay, counterBeat } from "../lib/scenes/reply";
import { asideFor, asideOwed, shrug } from "../lib/scenes/aside";
import { currentBeat, hurdleBeat, hurdleSpec, isOver } from "../lib/scenes/state";
import { sceneLine } from "../lib/scenes/line";
import { PERSONAS } from "../lib/scenes/personas";
import { answerBeatId } from "../lib/scenes/scripted";
import { reviewOf } from "../lib/scenes/review";
import { offerFor } from "../lib/scenes/grades";
import { choiceOf } from "../lib/scenes/choice";
import { caseKeyFor, words } from "../lib/scenes/lexicon";
import { leafNeeds, type BeatSpec } from "../lib/scenes/types";
import { propBySlot } from "../lib/scenes/props";
import { fold } from "../lib/estonian/fold";
import { shippedDictionary } from "./lib/dictionary";
import { COMPOSE_SYSTEM, composeLive } from "../lib/scenes/prompt";
import { dealtNumbers } from "../lib/scenes/props";
import { chain as providerChain } from "./lib/sceneDraft";

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const only = arg("scene");
const style = (arg("style") ?? "curious") as "clean" | "sloppy" | "curious" | "lost";
const difficulty = (arg("difficulty") ?? "textbook") as "textbook" | "good" | "ordinary" | "bad";
const composing = process.argv.includes("--compose");
const pinned = arg("model");

/**
 * One line from a real model, through the route's own prompt.
 *
 * The chain is `scripts/lib/sceneDraft.ts`'s, which reads the same free-model
 * lists `lib/tutor/provider.ts` publishes rather than naming models here, for
 * the reason `PROVIDER_KEY_ENV` is imported and not retyped: a list that lives
 * in a script measures the script. `--model` narrows it to one, which is the
 * only way a question about ordering gets a per-model answer.
 *
 * Failures are counted rather than thrown, and each is printed at the end,
 * because on a free tier a refusal is the ordinary case and a run that stopped
 * on the first 429 would measure nothing.
 */
const LINKS = composing
  ? providerChain().filter((link) => !pinned || link.model === pinned)
  : [];
const COMPOSE_STATUS = new Map<string, number>();

async function askModel(ask: Parameters<typeof composeLive>[0], said: readonly { role: "user" | "assistant"; content: string }[]) {
  for (const link of LINKS) {
    let status = 0;
    try {
      const res = await fetch(link.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${link.key}` },
        body: JSON.stringify({
          model: link.model,
          temperature: 0.8,
          max_tokens: 80,
          messages: [
            { role: "system", content: COMPOSE_SYSTEM },
            { role: "user", content: composeLive(ask) },
            ...said,
            { role: "user", content: "Your line:" },
          ],
        }),
      });
      status = res.status;
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          const key = `${link.model} ok`;
          COMPOSE_STATUS.set(key, (COMPOSE_STATUS.get(key) ?? 0) + 1);
          const line = text.replace(/^["'«]|["'»]$/g, "");
          /*
            What the model wrote, before the gate reads it, because the printed
            conversation shows only what survived. Whether a withheld line was
            a good sentence with one word out of scope or a paragraph of English
            is the whole question when deciding which model to put in front, and
            it is invisible downstream.
          */
          if (process.argv.includes("--drafts")) console.log(`      ~ drafted: ${line}`);
          return line;
        }
        status = 204;
      }
    } catch {
      status = 0;
    }
    const why = `${link.model} ${status}`;
    COMPOSE_STATUS.set(why, (COMPOSE_STATUS.get(why) ?? 0) + 1);
  }
  return null;
}

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government,
}));

/** What an imperfect learner says for a beat, off its own requirements. */
const LOST = [
  "ma ei tea", "vabandust, mida?", "ma õpin eesti keelt", "ma ei saa aru",
  "kas te räägite inglise keelt?", "üks moment palun", "oota", "hmm",
  /*
    REAL ESTONIAN THE COURSE DOES NOT HAPPEN TO TEACH, which is what a learner
    with a class or a phrasebook writes and is the case the repair phrase was
    being said about. `Tervitused!` is a greeting; a learner answered `Tere!`
    with it and was told they had not been understood. These are the lines to
    watch in a transcript: `unrecognised` on any of them means the marker has
    stopped asking the forms list (`knowing`) and is judging the language by
    the scene's own few hundred words again.
  */
  "tervitused", "see on keeruline", "ma mõtlen"
];

function learnerTurn(beat: BeatSpec, card: StoredDraw["card"], lexicon: ReturnType<typeof contextFromRows>["lexicon"], n: number): string {
  if (style === "lost") return LOST[n % LOST.length]!;
  const parts: string[] = [];
  for (const { need } of leafNeeds(beat.needs)) {
    if (need.kind === "lemma") {
      const lemma = need.oneOf[0]!;
      if (style === "clean") { parts.push(lemma); continue; }
      const inf = lexicon.infinitives.get(lemma);
      if (inf && n % 2 === 0) { parts.push(`ma ${lemma}`); continue; }
      parts.push(n % 3 === 0 ? fold(lemma) : lemma);
    } else if (need.kind === "case") {
      const right = lexicon.caseForm.get(caseKeyFor(need.lemma, need.grammCase)) ?? need.lemma;
      parts.push(style === "clean" ? right : n % 2 === 0 ? need.lemma : fold(right));
    } else if (need.kind === "datum") {
      const prop = propBySlot(card, need.slot);
      parts.push(prop?.value ?? "");
    } else if (need.kind === "question") {
      parts.push(beat.topic[0] ? `kas ${beat.topic[0]}?` : "kus?");
    } else if (need.kind === "negation") {
      parts.push("ei ole");
    } else if (need.kind === "register") {
      parts.push("teie");
    }
    break; // one option is enough
  }
  let text = parts.join(" ");
  const kinds = leafNeeds(beat.needs).map(({ need }) => need.kind);
  if (kinds.includes("question") && kinds.includes("datum")) {
    const slot = leafNeeds(beat.needs).find(({ need }) => need.kind === "datum")!.need as { slot: string };
    text = `kus on ${propBySlot(card, slot.slot)?.value ?? ""}?`;
  }
  if (beat.shape === "sentence" && !text.includes("?") && words(text).length < 2) text = `ma tahan ${text}`;
  if (style === "curious" && n % 2 === 1 && !text.includes("?")) text += ", ja kuhu siis?";
  return text || "jah";
}

async function play(sceneId: string) {
  const scene = sceneById(sceneId)!;
  const context = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)));
  const run = planRun(scene, `play-${style}`, scene.level, difficulty);
  const draw: StoredDraw = { persona: run.persona.id, card: run.card, curveballs: run.curveballs.map((c) => ({ id: c.id, at: c.at })) };
  const persona = PERSONAS.find((p) => p.id === run.persona.id)!;
  console.log(`\n=== ${scene.title} (${scene.id}) · ${persona.id} · ${style} · ${difficulty} ===`);
  for (const prop of run.card.props) console.log(`   card: ${prop.card} ${prop.theirs ? "(theirs)" : `= ${prop.value}`}`);

  const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
  const used = new Set<string>();
  let heard = "";
  for (let n = 0; n < 24; n++) {
    /*
      MARKED THE WAY THE ROUTE MARKS IT, OR THIS TOOL IS A SECOND MARKER.

      The route widens what counts as Estonian through `knowing` before every
      replay, because the scene's own word list is a few hundred words and the
      language is not: without it a learner saying a real word from outside
      the course is answered "I did not catch that". This harness is what a
      maintainer reads before touching the marker, so a transcript printed
      from a narrower reading than the app's would send them looking for a
      fault the app does not have, or hide one it does. It costs nothing here:
      `knowing` reads the forms list off disk and touches no database.
    */
    const marking = await knowing(context, turns.map((t) => t.said));
    const { state, response } = replay(marking, draw, turns);
    const beat = currentBeat(scene, state);
    const standing = state.hurdle ? hurdleBeat(state.hurdle) : null;
    const speaking = response === "counter" && beat?.counter ? counterBeat(beat) : beat;
    const card = cardInPlay(draw.card, scene.beats, state.countered);
    const last = state.turns[state.turns.length - 1] ?? null;
    const answered = last ? scene.beats.find((b) => b.id === last.beatId) ?? null : null;
    const spokenFor = standing ?? speaking ?? (answered?.move === "close" ? answered : undefined);

    const askedNow = last?.asked ?? null;
    const wantsAside = Boolean(askedNow) && ["answer", "counter"].includes(response);
    const fresh = (id: string | undefined) => (id ? context.scripted.get(id) ?? [] : []).filter((t) => !used.has(t));
    const asking = {
      asked: askedNow, spoken: words(last?.said ?? ""), answered, card, lexicon: context.lexicon,
      more: fresh(answered?.id), answers: answered ? fresh(answerBeatId(answered)) : [],
    };
    let aside = wantsAside ? asideFor(asking) : null;
    if (wantsAside && !aside && asideOwed(asking)) aside = shrug(context.lexicon);

    let line = null;
    if (spokenFor && !(spokenFor.awaits && !standing)) {
      /*
        The route's ladder, including composition where `--compose` is on. The
        conversation goes in as messages, both sides, oldest first, exactly as
        the route sends it, because a line drafted against the beat alone is the
        thing the amendment was written to stop.
      */
      const talk = state.turns.slice(-6).flatMap((t) => [
        ...(t.heard ? [{ role: "assistant" as const, content: t.heard }] : []),
        { role: "user" as const, content: t.said },
      ]);
      const cheap = await sceneLine({
        beat: spokenFor, lexicon: context.lexicon,
        // This run's dealt numbers, so the gate's `facts` check is the one the route runs.
        gate: { ...context.gate, dealt: dealtNumbers(card ?? draw.card) },
        pool: context.pool.get(spokenFor.id) ?? [], topic: context.topic.get(spokenFor.id) ?? new Set(),
        hasFiniteVerb: context.hasFiniteVerb, fallback: context.fallback,
        scripted: context.scripted.get(spokenFor.id) ?? [], used,
        ...(LINKS.length > 0 ? {
          compose: (avoid: readonly string[]) => askModel({
            scene: scene.title,
            place: scene.place,
            persona: persona.who,
            situation: scene.role,
            move: spokenFor.move,
            they: spokenFor.they,
            register: scene.register,
            reading: "",
            words: [...context.lexicon.byLemma.keys()],
            examples: [...context.scripted.entries()]
              .filter(([id]) => id !== spokenFor.id)
              .flatMap(([, lines]) => lines.slice(0, 1))
              .slice(0, 6),
            avoid,
          }, talk),
        } : {}),
      });
      line = cheap.provenance !== "fallback" ? cheap : datumLine(spokenFor, card, context.lexicon) ?? cheap;
    }
    const lines = replyFor({
      beat: speaking, answered: turns.length ? answered : null, response: turns.length ? response : null,
      reading: last?.reading ?? null, line, heard, said: last?.said ?? null, card, translates: persona.translates, askedForEnglish: last?.wantsEnglish === true,
      acknowledges: persona.acknowledges, echo: last?.matched?.[0] ?? null,
      recast: Boolean(last?.slips?.some((s) => s.form && s.form === last?.matched?.[0])),
      aside, offer: (response === "help" || response === "moveOn") && answered
        ? offerFor(answered, card ?? draw.card, context.marker.questionWords) : null,
      met: state.done.length,
      arriving: speaking ? !state.turns.some((t) => t.beatId === speaking.id) : false,
      tries: answered ? state.turns.filter((t) => t.beatId === answered.id).length : 0,
      choice: answered ? choiceOf({
        beat: answered, card: card ?? draw.card, lexicon: context.lexicon,
        dealt: new Map(scene.props.flatMap((p) =>
          p.kind === "word" || p.kind === "weekday" ? [[p.slot, p.oneOf] as const] : [])),
        roll: state.turns.length,
      }) : null,
      hurdle: standing ? { beat: standing, line: standing === spokenFor ? line : null, said: hurdleSpec(state)?.said } : null,
    });
    if (last) {
      const notes = [
        ...(last.slips ?? []).map((s) => `${s.kind}: ${s.said}${s.form ? ` > ${s.form}` : ""}`),
        ...(last.asked ? [`asked: ${last.asked}`] : []),
      ];
      console.log(`      [${last.reading}${notes.length ? " · " + notes.join(", ") : ""}]`);
    }
    for (const l of lines) {
      const who = l.provenance === "unspoken" ? "   (they)" : "   THEM";
      console.log(`${who}: ${l.text}   <${l.provenance}${l.reaction ? ", reaction" : ""}>`);
      if (l.provenance === "attested" || l.provenance === "scripted") used.add(l.text);
    }
    const move = [...lines].reverse().find((l) => !l.reaction);
    if (move && move.provenance !== "unspoken") heard = move.text;
    if (isOver(scene, state)) {
      console.log(`   -> over: ${state.done.join(", ")}`);
      const review = reviewOf(scene, state);
      console.log(`   REVIEW: ${review.lead}`);
      for (const note of review.notes) {
        console.log(`     - ${note.said}${note.times ? ` x${note.times}` : ""} (turn ${note.at + 1})`);
        if (note.hunch) console.log(`       (${note.hunch.sure}) ${note.hunch.says}`);
        console.log(`       ${note.form ?? "(understood as it stood)"} ${note.what}${note.term ? ` ${note.term}` : ""}`);
        if (note.body) console.log(`       ${note.body}`);
      }
      break;
    }
    const target = standing ?? beat;
    if (!target) break;
    const said = learnerTurn(target, card ?? draw.card, context.lexicon, n);
    console.log(`   YOU: ${said}      (goal: ${target.goal})`);
    turns.push({ beatId: target.id, said, helped: false, heard });
  }
}

(async () => {
  for (const scene of SCENES) if (!only || scene.id === only) await play(scene.id);
  /*
    Who answered and who did not, so a run that composed nothing says so rather
    than reading as a clean keyless run. On a free tier a refusal is the
    ordinary case, and the statuses are the evidence behind any decision about
    which model to put in front.
  */
  if (composing) {
    console.log("\nThe composer:");
    if (LINKS.length === 0) console.log("  no provider key matched, so every line above is the net");
    for (const [why, count] of [...COMPOSE_STATUS].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${why} x${count}`);
    }
  }
})();
