/**
 * A run is a pure function of `(scene, seed, level, difficulty, recency)`.
 *
 * Exactly as a paper is (`lib/exam/paper.ts`), and for the same reason: a
 * reload in the middle of a conversation has to give back the same
 * conversation rather than a fresh one, and the server re-marks a finished run
 * by rebuilding it from its seed. The seed is stored with the run, so a learner
 * can send a friend the same encounter and a teacher can set one for a class.
 *
 * THE CLAIM TO MAKE, AND THE CLAIM NOT TO MAKE (§5). Multiplying the axes gives
 * a number in the millions and it is worth nothing, because nobody plays a
 * scene a million times. What a learner notices is repetition **in a row**, so
 * that is what this promises and what `run.test.ts` measures: no prop value
 * inside three consecutive runs, no curveball inside five, no persona inside
 * three. All three are kept by handing the draw what the last runs used, which
 * makes the memory derived rather than a stored counter (ADR-014): `SceneRun`
 * is append-only and the last runs are one indexed read.
 *
 * Pure: no React, no Next, no Prisma, no clock. `recency` comes in as data.
 */
import { rng, seedFrom } from "@/lib/random/seeded";
import { BUDGETS, curveballById, drawCurveballs, type CurveballId, type Difficulty, type DrawnCurveball } from "./curveballs";
import { drawPersona, patienceFor, type PersonaSpec } from "./personas";
import { drawCard, type RoleCard } from "./props";
import { leafNeeds, type SceneSpec } from "./types";
import { BANK } from "./bank";

/** What the last few runs of this scene used, so this one does not repeat it. */
export interface Recency {
  /** Prop values from the last three runs. */
  readonly props: ReadonlySet<string>;
  /** Curveball ids from the last five. */
  readonly curveballs: ReadonlySet<string>;
  /** Persona ids from the last three. */
  readonly personas: ReadonlySet<string>;
  /**
   * Words the learner reached for in a recent scene and did not have, as
   * lemmas off `SceneGap`. A word prop whose pool holds one of them draws it
   * first, so the word you could not say at the doctor's is the word on your
   * card at the pharmacy. Optional, because the tests and the planner's
   * callers that know nothing about a learner have nothing to put here.
   */
  readonly wanted?: ReadonlySet<string>;
}

export const NO_RECENCY: Recency = {
  props: new Set(), curveballs: new Set(), personas: new Set(),
};

/** How far back each promise looks. Read by the caller that fetches the runs. */
export const RECENCY_WINDOW = { props: 3, curveballs: 5, personas: 3 } as const;

/** One assembled encounter, before a word of it has been said. */
export interface SceneRun {
  readonly sceneId: string;
  readonly seed: string;
  readonly level: string;
  readonly difficulty: Difficulty;
  readonly persona: PersonaSpec;
  readonly card: RoleCard;
  readonly curveballs: readonly DrawnCurveball[];
  /** Each beat's patience once the persona has had their say. */
  readonly patience: readonly number[];
  /**
   * The §5 promises this scene's pools were too thin to keep, named.
   *
   * "No prop value inside three runs, no curveball inside five, no persona
   * inside three" is keepable only where the pool is larger than the window,
   * and a scene admitting four curveballs cannot promise five. §5 says a pool
   * too thin is **reported the way `paper.ts` reports a shortfall rather than
   * papered over**, so this is a list of `prop:<slot>`, `curveball` and
   * `persona`, and it is empty on every scene that ships.
   *
   * Reported rather than fixed here because the fix is a wider pool, which is a
   * decision about the scene: widening it in code would mean this module
   * choosing vocabulary, which is the one thing a scene may not do.
   */
  readonly repeats: readonly string[];
}

/**
 * Assembles one.
 *
 * The order the draws happen in is load-bearing and is the order a learner
 * notices them: persona, then card, then curveballs. Changing it changes every
 * run every stored seed would rebuild, which is the same rule the generator
 * itself carries, so a later axis is appended rather than inserted.
 *
 * The curveball draw is given the persona's leans first, which is what turns an
 * agenda into something that happens: the one who is following the form draws
 * `their-order`, the brisk one draws `faster`, and neither is a label on a card
 * that never comes up. It is a preference and not a filter, because a scene
 * whose persona leans nowhere useful would otherwise get no curveballs at all.
 */
export function planRun(
  scene: SceneSpec,
  seed: string,
  level: string,
  difficulty: Difficulty,
  recent: Recency = NO_RECENCY,
): SceneRun {
  const random = rng(seedFrom(`${scene.id}:${level}:${difficulty}:${seed}`));

  const persona = drawPersona(random, recent.personas);
  const card = drawCard(scene.role, scene.props, random, recent.props, recent.wanted ?? new Set());

  /*
    The leans go in as `prefer` rather than as an ordering of `admits`, because
    `drawCurveballs` shuffles what it is handed and an ordering handed to a
    shuffle is a shuffle. That was the first version of this and `run.test.ts`
    caught it: the persona's agenda showed up at about chance.
  */
  const curveballs = drawCurveballs(
    scene.curveballs, scene.beats.length, BUDGETS[difficulty], level, random,
    recent.curveballs, persona.leans, notBeforeIn(scene), fitsIn(scene),
  );

  const repeats = [
    ...card.props.filter((prop) => prop.repeated).map((prop) => `prop:${prop.slot}`),
    ...(curveballs.some((c) => c.repeated) ? ["curveball"] : []),
    ...(recent.personas.has(persona.id) ? ["persona"] : []),
  ];

  return {
    sceneId: scene.id,
    seed,
    level,
    difficulty,
    persona,
    card,
    curveballs,
    patience: scene.beats.map((beat) => patienceFor(beat.patience, persona)),
    repeats,
  };
}

/**
 * The first beat each curveball may stand in front of, read off its `follows`
 * and this scene's beats: behind the first thing the learner asks for, or
 * behind the first beat where they say a time. Where the scene has no such
 * beat the answer is past its end, so the curveball is never drawn there.
 */
export function notBeforeIn(scene: SceneSpec): (id: CurveballId) => number {
  const past = scene.beats.length;
  const request = scene.beats.findIndex((beat, i) => i > 0 && beat.move !== "greet");
  const timeSlots = new Set(scene.props.filter((prop) => prop.kind === "time").map((prop) => prop.slot));
  const time = scene.beats.findIndex((beat) =>
    leafNeeds(beat.needs).some(({ need }) => need.kind === "datum" && timeSlots.has(need.slot)));
  const after = { request: request < 0 ? past : request + 1, time: time < 0 ? past : time + 1 };
  return (id) => {
    const follows = curveballById(id)?.follows;
    return follows ? after[follows] : 1;
  };
}

/**
 * Where a curveball whose lines are each about one beat may stand: straight
 * after one of those beats, so what it says is about what was just said
 * (`ScriptedLine.about`). Every other curveball fits anywhere `notBeforeIn`
 * allows. Read off the bank, which is where the lines are, so a line added
 * about another beat is a place the curveball can stand without anybody
 * editing this.
 */
export function fitsIn(scene: SceneSpec): (id: CurveballId, at: number) => boolean {
  const about = new Map<string, Set<string>>();
  for (const row of BANK) {
    if (row.scene !== scene.id || !row.about || !row.beat.startsWith("hurdle:")) continue;
    const id = row.beat.slice("hurdle:".length);
    about.set(id, new Set([...(about.get(id) ?? []), row.about]));
  }
  return (id, at) => {
    const beats = about.get(id);
    return !beats || beats.has(scene.beats[at - 1]?.id ?? "");
  };
}

/** The curveball attached to a beat, if one is. */
export function curveballAt(run: SceneRun, beat: number): DrawnCurveball | undefined {
  return run.curveballs.find((c) => c.at === beat);
}

/**
 * How long a scene takes, in minutes: the one figure for it, wherever it is
 * printed.
 *
 * A minute an exchange, which is reading their line, working out what to say
 * and typing it in Estonian, and one more for the card before and the review
 * after. A guess rather than a measurement, and honest about being one; §13
 * asks the chooser to say how long a scene takes so somebody can decide
 * whether they have time for one.
 *
 * IT WAS FORTY-FIVE SECONDS A TURN AND NOTHING ELSE, so the café read "about
 * 4 min" on its tile and the module listed the same conversation at 8, which
 * was the budget an evening gave every conversation whatever its length. Two
 * figures for one sitting, a screen apart, and the lower one left out the card
 * and the review the learner reads either side of it. The module reads this
 * now (`DaySpec.sceneMinutes`), and the typical scene of seven beats comes out
 * at the eight the evening already planned around.
 */
export function minutesFor(scene: SceneSpec): number {
  return Math.max(3, Math.round(scene.beats.length * TURN_MINUTES + SETTLE_MINUTES));
}

/** One exchange: their line read, an answer worked out and typed. */
export const TURN_MINUTES = 1;
/** The card read before the first line, and the review read after the last. */
export const SETTLE_MINUTES = 1;
