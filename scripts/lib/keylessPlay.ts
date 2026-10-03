/**
 * One conversation played through the app's own marker and reply ladder, with
 * the learner's turns supplied by the caller.
 *
 * `scripts/replay-transcript.ts` plays a reported transcript with it and
 * `scripts/sweep-fallback.ts` plays every scene against every curveball it
 * admits. One loop rather than two, because both are claims about what the
 * route says, and a second copy of what the route says is the copy that stops
 * agreeing with it (`play:scenes` carries the third and is older than this).
 *
 * Keyless unless `links` is handed in, which is what the app does on a day no
 * model answers: the other side speaks from the bank, the card and the course.
 */
import { knowing, replay, type SceneContext, type StoredDraw } from "../../lib/progress/scene";
import {
  composeTurn, planTurn, speakTurn, type ComposeIO, type Composition, type ModelTurn,
} from "../../lib/progress/sceneTurn";
import { seedFrom } from "../../lib/random/seeded";
import { isOver, type SceneState } from "../../lib/scenes/state";
import { PERSONAS } from "../../lib/scenes/personas";
import { isKnownForm } from "../../lib/dict/forms";
import { askLine, type Link } from "./sceneDraft";
import type { Lexicon } from "../../lib/scenes/lexicon";
import type { RoleCard } from "../../lib/scenes/props";
import type { Level } from "../../lib/collections/syllabus";
import type { BeatSpec, SceneSpec } from "../../lib/scenes/types";
import { isSaid, type SpokenLine } from "../../lib/scenes/line";

async function vouchOf(lexicon: Lexicon, spellings: readonly string[]): Promise<ReadonlySet<string>> {
  const out = new Set<string>();
  await Promise.all([...new Set(spellings)].map(async (word) => {
    if (lexicon.forms.has(word) || await isKnownForm(word)) out.add(word);
  }));
  return out;
}

/** What the caller is told before the learner's next turn. */
export interface Floor {
  /** What the learner is answering: the curveball standing, or the beat. */
  readonly target: BeatSpec;
  /** How many learner turns have been taken. */
  readonly n: number;
  /** What the other side has just said, in order. */
  readonly lines: readonly SpokenLine[];
  readonly state: SceneState;
  /** The card as it stands now, curveballs and the learner's own choices applied. */
  readonly card: RoleCard | null;
}

/** One event of a conversation, in the order it happened. */
export type Event =
  | { readonly kind: "them"; readonly line: SpokenLine }
  | { readonly kind: "you"; readonly said: string; readonly target: BeatSpec }
  | {
      readonly kind: "read";
      readonly reading: string;
      readonly response: string;
      readonly patience: number;
      readonly asked: string | null;
      /** Which beat the turn was read against. */
      readonly beatId: string;
    }
  | { readonly kind: "over"; readonly done: readonly string[] };

export interface PlayOptions {
  readonly scene: SceneSpec;
  readonly context: SceneContext;
  readonly draw: StoredDraw;
  readonly runSeed: string;
  readonly level: Level;
  /** The learner. Undefined ends the conversation where it stands. */
  readonly next: (floor: Floor) => string | undefined;
  /** At most this many learner turns, so a conversation that never ends is reported rather than run for ever. */
  readonly maxTurns?: number;
  readonly links?: readonly Link[];
  readonly onDraft?: (line: string) => void;
}

export async function playScripted(options: PlayOptions): Promise<Event[]> {
  const { scene, context, draw, level } = options;
  const links = options.links ?? [];
  const persona = PERSONAS.find((p) => p.id === draw.persona)!;
  const events: Event[] = [];
  const turns: { beatId: string; said: string; helped: boolean; heard: string }[] = [];
  const used = new Set<string>();
  let heard = "";
  const maxTurns = options.maxTurns ?? 40;
  for (let n = 0; n <= maxTurns; n++) {
    const marking = await knowing(context, turns.map((t) => t.said));
    const { state, response, elsewhere } = replay(marking, draw, turns);
    /*
      THE ROUTE'S OWN REPLY, PLANNED AND SPOKEN BY THE ROUTE'S OWN FUNCTIONS
      (`lib/progress/sceneTurn.ts`). This loop is the client: it sends the
      turns, keeps what was said and what was heard, and nothing else.
    */
    const plan = planTurn({
      scene, context: marking, draw, state, response, elsewhere, taken: turns.length, used, persona,
      composing: draw.lines === "composed" && links.length > 0,
      rotate: seedFrom(`${scene.id}:${options.runSeed}`),
      level,
    });
    const { lines } = await speakTurn(plan, links.length > 0
      ? harnessModel(links, { vouch: (spellings) => vouchOf(context.lexicon, spellings), onDraft: options.onDraft })
      : undefined);
    const { last, standing, current: beat } = plan;
    const inPlay = plan.card;
    if (last) {
      events.push({
        kind: "read", reading: last.reading, response: String(response), patience: state.patience,
        asked: last.asked ?? null, beatId: last.beatId,
      });
    }
    for (const l of lines) {
      events.push({ kind: "them", line: l });
      if (l.provenance === "attested" || l.provenance === "scripted") used.add(l.text);
    }
    // As `moveIn` in `components/scene/SceneSession.tsx`: a move not said aloud leaves nothing to say again.
    const move = [...lines].reverse().find((l) => !l.reaction);
    if (move) heard = isSaid(move.provenance) ? move.text : "";
    if (isOver(scene, state)) { events.push({ kind: "over", done: state.done }); break; }
    const target = standing ?? beat;
    if (!target || n === maxTurns) break;
    const said = options.next({ target, n, lines, state, card: inPlay });
    if (said === undefined) break;
    events.push({ kind: "you", said, target });
    turns.push({ beatId: target.id, said, helped: false, heard });
  }
  return events;
}

/**
 * THE MODEL STEP OF A TURN, AS THE ROUTE TAKES IT, ON THE LINKS A HARNESS WAS
 * HANDED. The route books the call in the ledger first; a harness measuring
 * against a developer's own key has nobody's allowance to book against, so
 * the step is the same `composeTurn` with the links in place of the chain.
 */
export function harnessModel(
  links: readonly Link[],
  options: {
    readonly vouch: ComposeIO["vouch"];
    readonly consistency?: ComposeIO["consistency"];
    readonly onStatus?: (why: string) => void;
    readonly onDraft?: (line: string) => void;
    /** Each ask, with why the attempt before it was withheld where one was. */
    readonly onAsk?: (beatId: string, because: string | undefined) => void;
  },
): (turn: ModelTurn) => Promise<Composition> {
  return async ({ plan, line }) => {
    let written: Awaited<ReturnType<typeof composeTurn>>;
    try {
      written = await composeTurn(plan, line, {
        compose: (ask, conversation, avoid) => {
          options.onAsk?.(line.beat.id, ask.because);
          return askLine(links, { ...ask, avoid }, ask, conversation, options.onStatus, options.onDraft);
        },
        consistency: options.consistency,
        vouch: options.vouch,
      });
    } catch {
      return { kind: "none" };
    }
    return written.line.provenance === "composed"
      ? { kind: "composed", line: written.line, preBreak: written.preBreak }
      : { kind: "withheld", line: written.line, preBreak: written.preBreak };
  };
}

/** A conversation as `replay:scene` has always printed it. */
export function printEvents(events: readonly Event[], log: (line: string) => void = console.log): void {
  for (const e of events) {
    if (e.kind === "them") log(`   THEM: ${e.line.text}   <${e.line.provenance}${e.line.reaction ? ", reaction" : ""}>`);
    else if (e.kind === "you") log(`   YOU: ${e.said}      (goal: ${e.target.goal})`);
    else if (e.kind === "read") log(`      [${e.reading} · response ${e.response} · patience ${e.patience}${e.asked ? ` · asked ${e.asked}` : ""}]`);
    else log(`   -> over: ${e.done.join(", ")}`);
  }
}
