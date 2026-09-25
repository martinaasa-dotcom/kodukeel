/**
 * Throws hostile and odd turns at every scene and checks what a conversation
 * must never do.
 *
 *   npm run fuzz:scenes   (needs DATABASE_URL, reads the dictionary, writes nothing)
 *
 * Every scene, at the easiest and the hardest difficulty, over six seeds and
 * four sequences: hostile text, a mix of hostile and real, seventy turns of
 * nonsense, seventy turns of one word. After every turn the reply is checked:
 * it exists unless the scene is over, no line is blank, no stage direction
 * carries a slot or an Estonian letter, the repair phrase is never said about
 * a turn that was read, no Estonian line carries a digit except the time off
 * the card, and a scene held under seventy turns of anything ends. That last
 * one found four scenes a learner could hold for ever by typing one word at a
 * beat that wanted a sentence, which no unit test had asked.
 *
 * The route and the screen are not in the loop: this drives `replay`,
 * `sceneLine` and `replyFor` the way the route does, against the real
 * dictionary, which is where every rule about a turn lives.
 */
import { prisma } from "../lib/db";
import { HARNESS_LEVEL } from "./lib/sceneDraft";
import { SCENES, FALLBACK_PHRASE } from "../lib/scenes/catalogue";
import { glossCard, glossesFor, knowing, replay, sceneContext, type StoredDraw } from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { replyFor, datumLine, cardChosen, cardInPlay, cardAfterHurdles, counterBeat } from "../lib/scenes/reply";
import { currentBeat, hurdleBeat, hurdleSpec, isOver } from "../lib/scenes/state";
import { isSpokenEstonian, sceneLine } from "../lib/scenes/line";
import { PERSONAS } from "../lib/scenes/personas";
import { sceneBeats } from "../lib/scenes/scripted";
import { dealtNumbers } from "../lib/scenes/props";

/** How the route reads a number out of a turn: a clock time or a run of digits. */
const NUMBERS = /\d{1,2}[:.]\d{2}|\d+/g;

const NASTY = [
  "", " ", "\t\n", "?", "!!!", "...", "1234", "13:30", "kell 13:30", "Tere Tere Tere Tere Tere Tere Tere Tere Tere",
  "<script>alert(1)</script>", "'; DROP TABLE Review; --", "{{beat.they}}", "${time}", "{time}",
  "I don't understand what you want", "yes", "no", "ok", "hello", "Hello, do you speak English?",
  "TERE!", "tere.", "Tere, tere, tere.", "Ma ei saa aru", "Ma ei saa aru.", "Kuhu sa lähed?", "Head aega!",
  "Nägemist", "aitäh", "Aitäh!", "jah", "ei", "Jah?", "Ei.", "poodi poodi poodi", "õäöüšž", "ÕÄÖÜ",
  "x".repeat(400), "Tere " .repeat(80), "😀😀😀", "Тере", "Mul on palavik 🤒", "Kell viis.", "pool kaksteist",
  "Ma lähen poodi ja ostan piima ja tulen poest koju.", "Tere! Ma lähen poodi. Ma olen poes. Piima. Tulen poest. Head aega!",
  "mul ei ole", "Mul ei ole seda.", "Kui kaua?", "Millal?", "Miks?", "Kus?", "vasakule", "otse", "Kesklinna, palun.",
];

function pick<T>(arr: readonly T[], i: number): T { return arr[i % arr.length]!; }

let failures = 0;
function bad(msg: string) { failures++; console.log("BAD " + msg); }

async function main() {
  for (const scene of SCENES) {
    const context = await sceneContext(scene.id, HARNESS_LEVEL);
    if (!context) { bad(`${scene.id}: no context`); continue; }
    for (const difficulty of ["textbook", "bad"] as const) {
      for (let seedNo = 0; seedNo < 6; seedNo++) {
        const run = planRun(scene, `fuzz-${seedNo}`, HARNESS_LEVEL, difficulty);
        // The draw as `beginScene` stores it, the English of each drawn word included.
        const dealt = glossCard(run.card, await glossesFor(run));
        const draw: StoredDraw = { persona: run.persona.id, card: dealt, curveballs: run.curveballs.map((c) => ({ id: c.id, at: c.at })), lines: "scripted", patience: run.patience };
        const persona = PERSONAS.find((p) => p.id === run.persona.id)!;
        // sequences: pure garbage, alternating garbage/real, and all-real
        const sequences: string[][] = [];
        sequences.push(Array.from({ length: 40 }, (_, i) => pick(NASTY, i + seedNo)));
        sequences.push(Array.from({ length: 40 }, (_, i) => pick(NASTY, i * 7 + seedNo)));
        sequences.push(Array.from({ length: 70 }, () => "blorp xyzzy"));
        sequences.push(Array.from({ length: 70 }, () => "Tere!"));
        for (const seq of sequences) {
          const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
          let heard = "";
          let over = false;
          for (let i = 0; i < seq.length && !over; i++) {
            let state, response;
            try {
              // Widened the way the route widens, or the repair-phrase rule
              // below is asked of a narrower marker than a learner meets.
              ({ state, response } = replay(await knowing(context, turns.map((t) => t.said)), draw, turns));
            } catch (e) { bad(`${scene.id} ${difficulty} replay threw: ${(e as Error).message}`); break; }
            const beat = currentBeat(scene, state);
            const standing = state.hurdle ? hurdleBeat(state.hurdle) : null;
            const speaking = response === "counter" && beat?.counter ? counterBeat(beat) : beat;
            // The card as the route builds it: hurdles and counters stood in, and a
            // word the learner chose named in English for the stage direction.
            const card = cardChosen(
              cardAfterHurdles(cardInPlay(draw.card, scene.beats, state.countered), state),
              state.turns,
              (lemma) => context.marker.englishFor?.get(lemma)?.[0],
            );
            const spokenFor = standing ?? speaking;
            let line = null;
            if (spokenFor) {
              const cheap = await sceneLine({
                beat: spokenFor, lexicon: context.lexicon, gate: context.gate,
                pool: context.pool.get(spokenFor.id) ?? [], topic: context.topic.get(spokenFor.id) ?? new Set(),
                hasFiniteVerb: context.hasFiniteVerb, fallback: context.fallback,
                scripted: context.scripted.get(spokenFor.id) ?? [], used: new Set(),
                // Keyless by design: the fuzzer opens no socket.
                mode: "scripted" as const,
              });
              line = cheap.provenance !== "fallback" ? cheap : (datumLine(spokenFor, card, context.lexicon) ?? cheap);
            }
            const last = state.turns[state.turns.length - 1] ?? null;
            // See app/api/scene/route.ts: `scene.beats` has never heard of a hurdle.
            const answered = last ? sceneBeats(scene).find((b) => b.id === last.beatId) ?? null : null;
            let lines;
            try {
              lines = replyFor({
                beat: speaking, answered: turns.length ? answered : null, response: turns.length ? response : null,
                reading: last?.reading ?? null, line, heard: last?.heard ?? null, said: last?.said ?? null, card,
                translates: persona.translates, acknowledges: persona.acknowledges,
                echo: last?.matched?.[0] ?? null, met: state.done.length,
                tries: answered ? state.turns.filter((t) => t.beatId === answered.id).length : 0,
                hurdle: standing ? { beat: standing, line: standing === spokenFor ? line : null, said: hurdleSpec(state)?.said } : null,
              });
            } catch (e) { bad(`${scene.id} replyFor threw: ${(e as Error).message}`); break; }
            over = isOver(scene, state);
            if (!over && lines.length === 0) bad(`${scene.id} ${difficulty} turn ${i}: empty reply (response ${response}, reading ${last?.reading})`);
            // What the route's gate lets a line say: see `dealt` in app/api/scene/route.ts.
            const allowed = new Set([
              ...dealtNumbers(draw.card), ...dealtNumbers(card),
              ...[...turns, ...state.turns].flatMap((t) => t.said.match(NUMBERS) ?? []),
            ]);
            for (const l of lines) {
              if (!l.text.trim()) bad(`${scene.id}: blank line`);
              if (/\{\w+\}/.test(l.text)) bad(`${scene.id}: placeholder on screen: ${l.text}`);
              if (l.provenance === "unspoken" && /[õäöüšž]/i.test(l.text)) bad(`${scene.id}: Estonian in a stage direction: ${l.text}`);
              if (l.text === FALLBACK_PHRASE && last && last.reading !== "unrecognised" && last.reading !== "echo") bad(`${scene.id}: repair phrase at reading ${last.reading} for "${last.said}"`);
              /*
                A number nobody dealt turning up in Estonian. It was every digit
                but a clock time, which stopped being the question the day a
                card began dealing prices, a wage and a floor: `Palk on 1580
                eurot kuus?` is the offer said off the card, and 142 lines like
                it in a run buried any number that really was invented. So each
                number in the line is held to what the route's own gate lets a
                line say, the card's numbers and the learner's.
              */
              if (isSpokenEstonian(l.provenance)) {
                const stray = (l.text.match(NUMBERS) ?? []).filter((n) => !allowed.has(n));
                if (stray.length > 0) bad(`${scene.id}: a number nobody dealt (${stray.join(", ")}) in an Estonian line: ${l.text}`);
              }
            }
            // what the learner is now answering
            const move = [...lines].reverse().find((l) => !l.reaction);
            if (move) heard = move.provenance === "unspoken" ? "" : move.text;
            if (over) break;
            turns.push({ beatId: beat?.id ?? "", said: seq[i]!, helped: false, heard });
          }
          if (!over && seq.length >= 70) bad(`${scene.id} ${difficulty} seed ${seedNo}: not over after ${seq.length} turns of "${seq[0]}"`);
        }
      }
    }
    console.log(`${scene.id}: done`);
  }
  console.log(failures === 0 ? "\nNO FAILURES" : `\n${failures} failures`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
