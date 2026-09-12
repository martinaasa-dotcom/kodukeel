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
import {
  MAX_TURNS, acceptFromRows, clockInPlay, contextFromRows, knowing, moneyInPlay, replay, sceneLemmas, type Row,
  type StoredDraw,
} from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { seedFrom } from "../lib/random/seeded";
import {
  replyFor, composeNote, datumLine, cardAfterHurdles, cardChosen, cardInPlay, counterBeat, factsFor, stageFor,
  wantsAsideFor,
} from "../lib/scenes/reply";
import { asideFor, asideOwed, asksToHearAgain, shrug } from "../lib/scenes/aside";
import { currentBeat, hurdleBeat, hurdleSpec, isOver } from "../lib/scenes/state";
import { sceneLine } from "../lib/scenes/line";
import { PERSONAS } from "../lib/scenes/personas";
import { answerBeatId, sceneBeats } from "../lib/scenes/scripted";
import { reviewOf } from "../lib/scenes/review";
import { offerFor } from "../lib/scenes/grades";
import { choiceOf } from "../lib/scenes/choice";
import { caseKeyFor, words, type Lexicon } from "../lib/scenes/lexicon";
import { leafNeeds, type BeatSpec } from "../lib/scenes/types";
import { JUDGE_REPLY_TOKENS, buildJudgeSystemPrompt, buildJudgeUserPrompt, parseJudgement } from "../lib/scenes/judge";
import { propBySlot } from "../lib/scenes/props";
import { fold } from "../lib/estonian/fold";
import { shippedDictionary } from "./lib/dictionary";
import { isKnownForm } from "../lib/dict/forms";
import type { composeLive, composeSystem } from "../lib/scenes/prompt";
import { dealtNumbers } from "../lib/scenes/props";
import { askLine, chain as providerChain, HARNESS_LEVEL } from "./lib/sceneDraft";
import type { Level } from "../lib/collections/syllabus";

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const only = arg("scene");
const style = (arg("style") ?? "curious") as "clean" | "sloppy" | "curious" | "lost";
const difficulty = (arg("difficulty") ?? "textbook") as "textbook" | "good" | "ordinary" | "bad";
/** The band the other side talks at, which in the app is the learner's own. */
const level = (arg("level") ?? HARNESS_LEVEL) as Level;
const composing = process.argv.includes("--compose");
const pinned = arg("model");
/**
 * `--say "tere|ma tahan kohvi|ei, ma tahan ka saiakest"`: the learner's turns,
 * typed, played in order and then the style takes over. The generated styles
 * answer each beat from its own requirements, which is the right instrument
 * for the marker's tolerance and the wrong one for the question a learner
 * actually asked of this module: what happens when I say something the beat
 * did not ask for. That is a turn somebody has to type.
 */
const SAY = (arg("say") ?? "").split("|").map((s) => s.trim()).filter(Boolean);

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

/**
 * The app's own vouching, minus the course read that needs a database: is this
 * spelling Estonian at all (`sceneVouch`). Without it this harness plays a
 * scene whose other side may only say the lemmas its units declare, which is
 * not the app.
 */
async function vouchOf(lexicon: Lexicon, spellings: readonly string[]): Promise<ReadonlySet<string>> {
  const out = new Set<string>();
  await Promise.all([...new Set(spellings)].map(async (word) => {
    if (lexicon.forms.has(word) || await isKnownForm(word)) out.add(word);
  }));
  return out;
}

const askModel = (
  ask: Parameters<typeof composeLive>[0],
  scene: Parameters<typeof composeSystem>[0],
  said: readonly { role: "user" | "assistant"; content: string }[],
) => askLine(
  LINKS, ask, scene, said,
  (why) => COMPOSE_STATUS.set(why, (COMPOSE_STATUS.get(why) ?? 0) + 1),
  /*
    What the model wrote, before the gate reads it, because the printed
    conversation shows only what survived. Whether a withheld line was a good
    sentence with one word out of scope or a paragraph of English is the whole
    question when deciding which model to put in front.
  */
  (line) => { if (process.argv.includes("--drafts")) console.log(`      ~ drafted: ${line}`); },
);

const rows: Row[] = shippedDictionary().map((e) => ({
  id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts,
  extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss,
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

function learnerTurn(
  beat: BeatSpec, card: StoredDraw["card"], lexicon: ReturnType<typeof contextFromRows>["lexicon"], n: number,
  register: "teie" | "sina" = "teie",
): string {
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
      /*
        THE SCENE'S OWN REGISTER, NOT ALWAYS "teie". A curveball asking the
        learner to prove they are still speaking Estonian is answered with the
        pronoun the scene is actually conducted in: `poodi-piima` is `sina`,
        and a hardcoded `teie` there is a word `registerForms` never holds, so
        this curveball read as unwinnable in every run of that one scene while
        every `teie` scene passed it outright. The app was never wrong; the
        harness was answering every scene as the same one.
      */
      parts.push(register);
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
  const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)), level);
  /*
    MARKED THE WAY THE ROUTE MARKS IT, AND THE ROUTE WIDENS TWICE. `knowing`
    below is one of them; these are the other two, and this harness resolved
    neither, so a learner who wrote a second word for the same thing or reached
    for one in English read as off the point here and as understood in the app.
    A transcript printed through a narrower marker than the app's is the fault
    §53 found in `eval:scene`, one instrument over.
  */
  const context = { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows) } };
  const run = planRun(scene, `play-${style}`, level, difficulty);
  const draw: StoredDraw = { persona: run.persona.id, card: run.card, curveballs: run.curveballs.map((c) => ({ id: c.id, at: c.at })), lines: LINKS.length > 0 ? "composed" : "scripted", patience: run.patience };
  const persona = PERSONAS.find((p) => p.id === run.persona.id)!;
  console.log(`\n=== ${scene.title} (${scene.id}) · ${persona.id} · ${style} · ${difficulty} ===`);
  for (const prop of run.card.props) console.log(`   card: ${prop.card} ${prop.theirs ? "(theirs)" : `= ${prop.value}`}`);

  const turns: { beatId: string; said: string; helped: boolean; heard: string; conceded?: number[]; alsoDone?: string[] }[] = [];
  const used = new Set<string>();
  let heard = "";
  /*
    THE ROUTE'S OWN CEILING, NOT A SHORTER ONE INVENTED FOR THIS SCRIPT. It was
    24, and a sweep of every scene under the harshest built-in settings (`bad`
    difficulty, `lost` style) found ametiasutus never finishing in eleven runs
    out of eleven, reading as a scene that hangs. It does not: at `MAX_TURNS`
    it resolves in eighteen, well inside the room the route actually gives it,
    because the base beats plus the curveballs `bad` can stack onto it plus a
    persona that never once cooperates add up to more than 24 exchanges. A cap
    shorter than the app's own reports a bug that is the harness's.
  */
  for (let n = 0; n < MAX_TURNS; n++) {
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
    let { state, response, elsewhere } = replay(marking, draw, turns);
    /*
      THE JUDGE, AS THE ROUTE ASKS IT (ADR-025 amendment 2). Where the
      dictionary refused the turn and a model is on, one JSON question on the
      first link: did they do what the beat asked, in any words. A yes ends
      the beat through `concede`, stored on the turn so the replay reaches the
      same state, exactly as the client echoes it back to the route.
    */
    const lastSent = turns[turns.length - 1];
    const lastRead = state.turns[state.turns.length - 1];
    const judged = currentBeat(scene, state);
    /*
      The route's own rules, mirrored (ADR-025 amendment 3): every miss is put
      to the judge, a curveball included, a value off the card may be conceded,
      and the card is a suggestion. A harness judging more narrowly than the
      app prints a conversation the app does not have.
    */
    const askJudge = async (beat: BeatSpec, said: string): Promise<boolean> => {
      const link = LINKS[0]!;
      const dealt = leafNeeds(beat.needs).flatMap(({ need }) => {
        if (need.kind !== "datum") return [];
        const prop = draw.card.props.find((one) => one.slot === need.slot && !one.theirs);
        return prop ? [`${prop.card.replace(/\.$/, "")}: ${prop.english ?? prop.shown[0] ?? prop.value}`] : [];
      });
      const res = await fetch(link.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${link.key}` },
        body: JSON.stringify({
          model: link.model, temperature: 0, max_tokens: JUDGE_REPLY_TOKENS,
          messages: [
            { role: "system", content: buildJudgeSystemPrompt() },
            { role: "user", content: buildJudgeUserPrompt({ goal: beat.goal, they: beat.they, said, reading: "", dealt }) },
          ],
        }),
      }).catch(() => null);
      const text = res && res.ok ? ((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "" : "";
      const verdict = parseJudgement(text);
      if (verdict) console.log(`      ~ judge (${beat.id}): ${verdict.done ? "done" : "not done"} (${verdict.why})`);
      return verdict?.done === true;
    };
    const judgedBeat = state.hurdle ? hurdleBeat(state.hurdle) : judged;
    if (LINKS.length > 0 && lastSent && lastRead && judgedBeat && !lastSent.conceded
      && lastRead.beatId === judgedBeat.id
      && ["offtarget", "incomplete", "english", "unrecognised", "fragment"].includes(lastRead.reading)
      && /\p{L}/u.test(lastSent.said)
      && lastRead.met.some((ok) => !ok)) {
      if (await askJudge(judgedBeat, lastSent.said)) {
        const conceded = lastRead.met.flatMap((ok, i) => (ok ? [] : [i]));
        turns[turns.length - 1] = { ...lastSent, conceded };
        ({ state, response, elsewhere } = replay(marking, draw, turns));
      }
    }
    // And the beat ahead, where the turn landed and held a word nobody could place.
    const landedOn = state.turns[state.turns.length - 1];
    const ahead = currentBeat(scene, state);
    const sentNow = turns[turns.length - 1];
    if (LINKS.length > 0 && sentNow && landedOn && ahead && response === "answer" && !state.hurdle
      && landedOn.beatId !== ahead.id && !state.done.includes(ahead.id) && !sentNow.alsoDone?.includes(ahead.id)
      && words(sentNow.said).some((w) => !context.lexicon.forms.has(w) && !context.lexicon.folded.has(fold(w)))) {
      if (await askJudge(ahead, sentNow.said)) {
        turns[turns.length - 1] = { ...sentNow, alsoDone: [...(sentNow.alsoDone ?? []), ahead.id] };
        ({ state, response, elsewhere } = replay(marking, draw, turns));
      }
    }
    const beat = currentBeat(scene, state);
    const standing = state.hurdle ? hurdleBeat(state.hurdle) : null;
    const speaking = response === "counter" && beat?.counter ? counterBeat(beat) : beat;
    // The card as the other side knows it: counters and changed facts stood in, as the route reads it.
    const card = cardChosen(
      cardAfterHurdles(cardInPlay(draw.card, scene.beats, state.countered), state),
      state.turns,
      (lemma) => context.marker.englishFor?.get(lemma)?.[0],
    );
    const last = state.turns[state.turns.length - 1] ?? null;
    // See app/api/scene/route.ts: `scene.beats` has never heard of a hurdle.
    const answered = last ? sceneBeats(scene).find((b) => b.id === last.beatId) ?? null : null;
    const spokenFor = standing ?? speaking ?? (answered?.move === "close" ? answered : undefined);

    const askedNow = last?.asked ?? null;
    const landedNow = response === "answer" || response === "counter" || elsewhere > 0;
    // A real question on a missed turn is answered off the card too, as the route does.
    const wantsAside = wantsAsideFor(askedNow, turns.length ? response : null, last?.reading ?? null, elsewhere > 0);
    const fresh = (id: string | undefined) => (id ? context.scripted.get(id) ?? [] : []).filter((t) => !used.has(t));
    const asking = {
      asked: askedNow, spoken: words(last?.said ?? ""), said: last?.said ?? "", answered, card, lexicon: context.lexicon,
      more: fresh(answered?.id), answers: answered ? fresh(answerBeatId(answered)) : [], missed: !landedNow,
    };
    let aside = wantsAside ? asideFor(asking) : null;
    // "Sorry, what?" gets the line again, never the shrug (the route's rule).
    const hearAgain = asksToHearAgain(words(last?.said ?? ""), context.marker.questionWords, context.lexicon);
    if (wantsAside && aside === null && hearAgain && heard) aside = { text: heard, provenance: "again" as const };
    // What this person knows off the card, in English, as the route hands it to the model.
    const facts = factsFor(card, scene.beats);

    let line = null;
    // A curveball said in English is said in English, never composed (the route's rule).
    const speaksEnglish = Boolean(standing && hurdleSpec(state)?.said);
    if (spokenFor && !(spokenFor.awaits && !standing) && !speaksEnglish) {
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
      // The person's own agenda and what is settled, as the route hands them to the model.
      const agenda = scene.beats.slice(state.beat).filter((b) => !state.done.includes(b.id)).map((b) => stageFor(b, card));
      const settled = scene.beats.filter((b) => state.done.includes(b.id)).map((b) => stageFor(b, card));
      const anticipated = askedNow && answered?.answer ? stageFor({ ...answered, they: answered.answer }, card) : null;
      const handing = (response === "help" || response === "moveOn") && answered
        ? offerFor(answered, card ?? draw.card, context.marker.questionWords, last?.met ?? []) : null;
      const cheap = await sceneLine({
        beat: spokenFor, lexicon: context.lexicon,
        // This run's dealt numbers, so the gate's `facts` check is the one the route runs.
        gate: {
          ...context.gate, dealt: dealtNumbers(card ?? draw.card),
          times: clockInPlay(card ?? draw.card, context.lexicon),
          money: moneyInPlay(card ?? draw.card, context.lexicon),
        },
        /*
          The courtesy rung stands down where the turn needs answering, as it
          does in the route: a question on the way out, or a word to hand over,
          is composed rather than answered `Ei tea. Head aega!`
        */
        pool: (askedNow || handing) && LINKS.length > 0 ? [] : context.pool.get(spokenFor.id) ?? [],
        topic: context.topic.get(spokenFor.id) ?? new Set(),
        hasFiniteVerb: context.hasFiniteVerb, fallback: context.fallback,
        scripted: context.scripted.get(spokenFor.id) ?? [], used,
        // Where this run starts reading a beat's own lines, as the route does.
        rotate: seedFrom(`${scene.id}:${run.seed}`),
        /*
          The same question the route asks (`sceneVouch`), minus the course
          read that needs a database: is this spelling Estonian at all. Without
          it this harness plays a scene whose other side may only say the few
          hundred lemmas its units declare, which is not the app.
        */
        vouch: (spellings: readonly string[]) => vouchOf(context.lexicon, spellings),
        // The harness composes when it has a link, exactly as a run does.
        mode: LINKS.length > 0 ? ("composed" as const) : ("scripted" as const),
        ...(LINKS.length > 0 ? {
          compose: (avoid: readonly string[], because?: string) => askModel({
            move: spokenFor.move,
            they: stageFor(spokenFor, card),
            reading: "",
            facts,
            because,
            examples: [...context.scripted.entries()]
              .filter(([id]) => id !== spokenFor.id)
              .flatMap(([, lines]) => lines.slice(0, 1))
              .slice(0, 6),
            // This beat's own, as the route hands them: ask the same thing, in your own words.
            asked: (context.scripted.get(spokenFor.id) ?? []).slice(0, 2),
            agenda, settled,
            // And what happened to the turn, which is the route's own wording.
            note: composeNote(
              turns.length > 0 ? response : null, last?.reading ?? null, elsewhere > 0, askedNow,
              { offer: handing, answer: anticipated },
            ),
            avoid,
          }, {
            scene: scene.title, place: scene.place, level, persona: persona.who, situation: scene.role,
            register: scene.register, words: [...context.lexicon.byLemma.keys()],
          }, talk),
        } : {}),
      });
      line = cheap.provenance !== "fallback" ? cheap : datumLine(spokenFor, card, context.lexicon) ?? cheap;
      // A composed line answered what was asked; otherwise a landed question nothing answered gets the shrug.
      if (line.provenance === "composed") aside = null;
      else if (wantsAside && landedNow && !aside && asideOwed(asking) && !hearAgain) aside = shrug(context.lexicon);
    }
    const lines = replyFor({
      beat: speaking, answered: turns.length ? answered : null, response: turns.length ? response : null,
      reading: last?.reading ?? null, line, heard, said: last?.said ?? null, card, translates: persona.translates, askedForEnglish: last?.wantsEnglish === true,
      acknowledges: persona.acknowledges, echo: last?.matched?.[0] ?? null,
      recast: Boolean(last?.slips?.some((s) => s.form && s.form === last?.matched?.[0])),
      aside, offer: (response === "help" || response === "moveOn") && answered
        ? offerFor(answered, card ?? draw.card, context.marker.questionWords, last?.met ?? []) : null,
      met: state.done.length,
      arriving: speaking ? !state.turns.some((t) => t.beatId === speaking.id) : false,
      tries: answered ? state.turns.filter((t) => t.beatId === answered.id).length : 0,
      choice: answered ? choiceOf({
        beat: answered, card: card ?? draw.card, lexicon: context.lexicon,
        dealt: new Map(scene.props.flatMap((p) =>
          p.kind === "word" || p.kind === "weekday" ? [[p.slot, p.oneOf] as const] : [])),
        roll: state.turns.length, met: last?.met ?? [],
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
    const said = SAY[n] ?? learnerTurn(target, card ?? draw.card, context.lexicon, n, scene.register);
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
