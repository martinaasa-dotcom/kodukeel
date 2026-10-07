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
import { MAX_TURNS, acceptFromRows, contextFromRows, knowing, replay, sceneLemmas, type Row, type StoredDraw } from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { planTurn, speakTurn } from "../lib/progress/sceneTurn";
import { harnessModel } from "./lib/keylessPlay";
import { seedFrom } from "../lib/random/seeded";
import { currentBeat, hurdleBeat, isOver } from "../lib/scenes/state";
import { isSaid } from "../lib/scenes/line";
import { PERSONAS } from "../lib/scenes/personas";
import { reviewOf } from "../lib/scenes/review";
import { caseKeyFor, words } from "../lib/scenes/lexicon";
import { leafNeeds, type BeatSpec } from "../lib/scenes/types";
import { JUDGE_REPLY_TOKENS, buildJudgeSystemPrompt, buildJudgeUserPrompt, parseJudgement } from "../lib/scenes/judge";
import { CONSISTENCY_REPLY_TOKENS, buildConsistencySystemPrompt, buildConsistencyUserPrompt, parseConsistency } from "../lib/scenes/consistency";
import { propBySlot } from "../lib/scenes/props";
import { fold } from "../lib/estonian/fold";
import { shippedDictionary } from "./lib/dictionary";
import { COMPOSE_USAGE, chain as providerChain, vouchOf, HARNESS_LEVEL } from "./lib/sceneDraft";
import type { Level } from "../lib/collections/syllabus";
import { installMeter } from "./lib/meter";

// What this run spends, capped and said on exit (`scripts/lib/meter.ts`); replay on, because it reads transcripts, so a turn asked before is answered from the record.
installMeter({ replay: true });

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
/*
  `--model-down` plays what a learner meets on the day Gemini will not answer:
  nobody composes, so the other side says the lines written for the scene,
  and the judge is the grader chain's Groq link, which is what still answers.
*/
const modelDown = process.argv.includes("--model-down");
const LINKS = composing && !modelDown
  ? providerChain().filter((link) => !pinned || link.model === pinned)
  : [];
const JUDGE_LINKS = modelDown && process.env.GROQ_API_KEY
  ? [{
    name: "groq", model: "openai/gpt-oss-120b", label: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY,
  }]
  : LINKS;
const COMPOSE_STATUS = new Map<string, number>();


/**
 * The route's consistency check (`reviewLine`), asked of the judge's link
 * rather than of the grader chain, and failing open the way the route's does.
 */
async function consistencyOnJudge(ask: Parameters<typeof buildConsistencyUserPrompt>[0]): Promise<string | null> {
  const link = JUDGE_LINKS[0]!;
  const res = await fetch(link.url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${link.key}` },
    body: JSON.stringify({
      model: link.model, max_tokens: CONSISTENCY_REPLY_TOKENS,
      messages: [
        { role: "system", content: buildConsistencySystemPrompt() },
        { role: "user", content: buildConsistencyUserPrompt(ask) },
      ],
    }),
  }).catch(() => null);
  const text = res && res.ok ? ((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "" : "";
  const verdict = parseConsistency(text);
  if (verdict && !verdict.ok) console.log(`      ~ inconsistent: ${verdict.why}`);
  return verdict && !verdict.ok ? (verdict.why || "it did not keep to what was already said") : null;
}

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

/*
  A LEARNER PLAYED BY A MODEL, WHICH IS THE ONE KIND OF LEARNER THE STYLES ABOVE
  CANNOT BE. Every style is a rule over the beat's own requirements, so it never
  says anything the scene did not anticipate, and the faults a real learner
  meets are exactly the ones the scene did not anticipate: a question back, a
  joke, a change of subject, a half-remembered word, English in the middle.
  `--learner <kind>` asks Gemini for the next thing a beginner of that kind would
  type, given the conversation so far and their own card; the app then marks it
  exactly as the route would. Harness only, and never a grade: what it measures
  is whether the other side keeps making sense.
*/
const LEARNER = arg("learner");
const LEARNER_KINDS: Record<string, string> = {
  shy: "shy and unsure: very short answers, often one word, sometimes just 'jah' or 'ei tea', occasional missing endings",
  chatty: "chatty and friendly: says more than asked, adds personal details, asks the other person questions back, sometimes jokes",
  offtrack: "easily distracted: often answers something other than what was asked, changes the subject, asks unrelated questions, then comes back",
  confused: "often confused: misunderstands the question, answers the wrong thing, asks them to repeat or slow down, mixes in English words",
  english: "weak in Estonian: mixes English and Estonian in the same sentence, uses English when stuck, wrong word endings, some typos",
  good: "a decent A2 learner: tries to answer properly in simple Estonian, small mistakes in endings and spelling",
};
async function simulatedLearner(kind: string, title: string, role: string, card: readonly string[], talk: readonly string[]): Promise<string> {
  const who = LEARNER_KINDS[kind] ?? kind;
  const prompt = [
    `You are role-playing a beginner learner of Estonian in a practice conversation: ${title}.`,
    `Your situation: ${role}`,
    card.length > 0 ? `Your card (suggestions): ${card.join("; ")}` : "",
    `What kind of learner you are: ${who}.`,
    "Write ONLY your next turn, as that learner would type it: short, beginner Estonian with realistic mistakes, no quotes, no explanation.",
    "The conversation so far:",
    ...talk,
    "You:",
  ].filter(Boolean).join("\n");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } } }),
  }).catch(() => null);
  const data = res && res.ok ? await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] } : null;
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "jah").split("\n")[0]!.replace(/^You:\s*/i, "").trim() || "jah";
}

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
  const run = planRun(scene, `play-${style}${arg("seed") ?? ""}`, level, difficulty);
  const draw: StoredDraw = { persona: run.persona.id, card: run.card, curveballs: run.curveballs.map((c) => ({ id: c.id, at: c.at })), lines: LINKS.length > 0 ? "composed" : "scripted", patience: run.patience };
  const persona = PERSONAS.find((p) => p.id === run.persona.id)!;
  const talkLog: string[] = [];
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
    const askJudge = async (beat: BeatSpec, said: string, heardThen?: string): Promise<boolean> => {
      const link = JUDGE_LINKS[0]!;
      const dealt = leafNeeds(beat.needs).flatMap(({ need }) => {
        if (need.kind !== "datum") return [];
        const prop = draw.card.props.find((one) => one.slot === need.slot && !one.theirs);
        return prop ? [`${prop.card.replace(/\.$/, "")}: ${prop.english ?? prop.shown[0] ?? prop.value}`] : [];
      });
      const res = await fetch(link.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${link.key}` },
        body: JSON.stringify({
          model: link.model, max_tokens: JUDGE_REPLY_TOKENS,
          messages: [
            { role: "system", content: buildJudgeSystemPrompt() },
            { role: "user", content: buildJudgeUserPrompt({ goal: beat.goal, they: beat.they, said, reading: "", dealt, heard: heardThen }) },
          ],
        }),
      }).catch(() => null);
      const text = res && res.ok ? ((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "" : "";
      const verdict = parseJudgement(text);
      if (verdict) console.log(`      ~ judge (${beat.id}): ${verdict.done ? "done" : "not done"} (${verdict.why})`);
      return verdict?.done === true;
    };
    const judgedBeat = state.hurdle ? hurdleBeat(state.hurdle) : judged;
    if (JUDGE_LINKS.length > 0 && lastSent && lastRead && judgedBeat && !lastSent.conceded
      && lastRead.beatId === judgedBeat.id
      && ["offtarget", "incomplete", "english", "unrecognised", "fragment"].includes(lastRead.reading)
      && /\p{L}/u.test(lastSent.said)
      && lastRead.met.some((ok) => !ok)) {
      if (await askJudge(judgedBeat, lastSent.said, lastRead.heard)) {
        const conceded = lastRead.met.flatMap((ok, i) => (ok ? [] : [i]));
        turns[turns.length - 1] = { ...lastSent, conceded };
        ({ state, response, elsewhere } = replay(marking, draw, turns));
      }
    }
    // And the beat ahead, where the turn landed and held a word nobody could place.
    const landedOn = state.turns[state.turns.length - 1];
    const ahead = currentBeat(scene, state);
    const sentNow = turns[turns.length - 1];
    if (JUDGE_LINKS.length > 0 && sentNow && landedOn && ahead && response === "answer" && !state.hurdle
      && landedOn.beatId !== ahead.id && !state.done.includes(ahead.id) && !sentNow.alsoDone?.includes(ahead.id)
      && words(sentNow.said).some((w) => !context.lexicon.forms.has(w) && !context.lexicon.folded.has(fold(w)))) {
      if (await askJudge(ahead, sentNow.said, landedOn.heard)) {
        turns[turns.length - 1] = { ...sentNow, alsoDone: [...(sentNow.alsoDone ?? []), ahead.id] };
        ({ state, response, elsewhere } = replay(marking, draw, turns));
      }
    }
    /*
      THE ROUTE'S OWN REPLY, PLANNED AND SPOKEN BY THE ROUTE'S OWN FUNCTIONS
      (`lib/progress/sceneTurn.ts`), with `--compose` handing the model step
      the links in place of the ledger's chain. This loop is the client and
      the printer, and nothing in it decides what the other side says.
    */
    const plan = planTurn({
      scene, context: marking, draw, state, response, elsewhere, taken: turns.length, used, persona,
      composing: LINKS.length > 0,
      rotate: seedFrom(`${scene.id}:${run.seed}`),
      level,
    });
    const { lines } = await speakTurn(plan, LINKS.length > 0 ? harnessModel(LINKS, {
      vouch: (spellings) => vouchOf(context.lexicon, spellings),
      // The route's consistency check, on the judge's link, once there is a conversation to keep to.
      ...(JUDGE_LINKS.length > 0 ? { consistency: consistencyOnJudge } : {}),
      onStatus: (why) => COMPOSE_STATUS.set(why, (COMPOSE_STATUS.get(why) ?? 0) + 1),
      /*
        What the model wrote, before the gate reads it, because the printed
        conversation shows only what survived. Whether a withheld line was a
        good sentence with one word out of scope or a paragraph of English is
        the whole question when deciding which model to put in front.
      */
      onDraft: (drafted) => { if (process.argv.includes("--drafts")) console.log(`      ~ drafted: ${drafted}`); },
      /*
        Why the last draft was withheld, which is what the retry is told
        (`whyWithheld`) and what a reader of the transcript needs beside the
        draft, with the beat beside the reason, or a refusal cannot be read
        against what was asked for.
      */
      onAsk: (beatId, because) => {
        if (because && process.argv.includes("--drafts")) console.log(`      ~ withheld (${beatId}): ${because}`);
      },
    }) : undefined);
    const { last, standing, current: beat, card } = plan;
    if (last) {
      const notes = [
        ...(last.slips ?? []).map((s) => `${s.kind}: ${s.said}${s.form ? ` > ${s.form}` : ""}`),
        ...(last.asked ? [`asked: ${last.asked}`] : []),
      ];
      console.log(`      [${last.reading}${notes.length ? " · " + notes.join(", ") : ""}]`);
    }
    for (const l of lines) {
      if (l.provenance !== "unspoken" && l.provenance !== "coach" && l.provenance !== "meanwhile") talkLog.push(`Them: ${l.text}`);
      const who = l.provenance === "unspoken" ? "   (they)" : "   THEM";
      console.log(`${who}: ${l.text}   <${l.provenance}${l.reaction ? ", reaction" : ""}>`);
      if (l.provenance === "attested" || l.provenance === "scripted") used.add(l.text);
    }
    const move = [...lines].reverse().find((l) => !l.reaction);
    // As `moveIn` in `components/scene/SceneSession.tsx`: a move not said aloud leaves nothing to say again.
    if (move) heard = isSaid(move.provenance) ? move.text : "";
    if (isOver(scene, state)) {
      console.log(`   -> over: ${state.done.join(", ")}`);
      const review = reviewOf(scene, state, "en");
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
    const said = SAY[n] ?? (LEARNER
      ? await simulatedLearner(LEARNER, scene.title, scene.role, run.card.props.filter((p) => !p.theirs).map((p) => `${p.card} ${p.value}`), talkLog)
      : learnerTurn(target, card ?? draw.card, context.lexicon, n, scene.register));
    talkLog.push(`You: ${said}`);
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
    // What it cost in tokens, per model, off the transport's own usage report.
    for (const [model, t] of COMPOSE_USAGE) {
      console.log(`  ${model}: ${t.calls} calls, ${Math.round(t.input / Math.max(1, t.calls))} input tokens a call `
        + `(${Math.round(t.cached / Math.max(1, t.calls))} cached), ${Math.round(t.output / Math.max(1, t.calls))} output`);
    }
  }
})();
