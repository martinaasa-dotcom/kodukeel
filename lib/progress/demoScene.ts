import { prisma } from "@/lib/db";
import { clip } from "@/lib/copy/clip";
import { sceneById } from "@/lib/scenes/catalogue";
import { planRun } from "@/lib/scenes/run";
import { seedFrom } from "@/lib/random/seeded";
import {
  cardAfterHurdles, cardChosen, cardInPlay, counterBeat, datumLine, replyFor, wantsAsideFor,
} from "@/lib/scenes/reply";
import { asideFor, asideOwed, asksToHearAgain, shrug } from "@/lib/scenes/aside";
import { currentBeat, hurdleBeat, hurdleSpec, isOver, outcomeOf } from "@/lib/scenes/state";
import { sceneLine, type SpokenLine } from "@/lib/scenes/line";
import { PERSONAS } from "@/lib/scenes/personas";
import { answerBeatId, sceneBeats } from "@/lib/scenes/scripted";
import { offerFor } from "@/lib/scenes/grades";
import { choiceOf } from "@/lib/scenes/choice";
import { words } from "@/lib/scenes/lexicon";
import { dealtNumbers } from "@/lib/scenes/props";
import { leafNeeds, type BeatSpec } from "@/lib/scenes/types";
import {
  MAX_TURN_CHARS, clockInPlay, knowing, moneyInPlay, replay, sceneContext, type SentTurn, type StoredDraw,
} from "@/lib/progress/scene";

/**
 * ONE CONVERSATION, PLAYABLE FROM THE LANDING PAGE WITH NO ACCOUNT.
 *
 * The page says the app rehearses the conversation somebody is about to have,
 * and a visitor deciding whether to believe that has only ever been shown a
 * sentence about it. This is the café scene itself, played through the same
 * machinery a signed-in run is: `sceneContext` for the scene's words and the
 * course, `knowing` for the forms list, `replay` over every turn so far, the
 * same line ladder and the same `replyFor`. What is left out is everything
 * that belongs to a learner or costs money: no row is written, no grade, no
 * model is asked (the lines are the bank's, the dictionary's, or the card's),
 * so a stranger playing it spends nothing and leaves nothing behind.
 *
 * Stateless like the route: the browser sends every turn it has taken each
 * time, with the seed it was dealt, and the run is rebuilt from those. A
 * forged turn can do nothing but play a café scene badly.
 */
export const DEMO_SCENE_ID = "kohvikus";
/** A beginner's evening, which is who this page is talking to. */
const LEVEL = "A1";
/** Short on purpose: the full scene has five beats and a visitor gives it a minute. */
export const DEMO_MAX_TURNS = 16;

export interface DemoLine {
  readonly text: string;
  /** Where the line came from, the way the app's own screen says it. */
  readonly provenance: SpokenLine["provenance"];
  /** English, said by the app rather than by the person: a stage direction or a hint. */
  readonly aside?: true;
}

export interface DemoHint {
  readonly et: string;
  readonly en: string | null;
}

export interface DemoReply {
  readonly lines: readonly DemoLine[];
  /** What the visitor is trying to do now, in English, off the beat. */
  readonly goal: string | null;
  /** The beat the next turn answers, sent back with it. */
  readonly beatId: string | null;
  /** The line the next turn is answering, sent back with it. */
  readonly heard: string;
  /** Words the beat names, as the dictionary spells them, to press instead of typing. */
  readonly hints: readonly DemoHint[];
  /**
   * The role card: what the visitor is holding. `value` is what the card says
   * in English; `et` is the dictionary's word for it where the card dealt a
   * word, printed beside it because a stranger has no Estonian yet.
   */
  readonly card: readonly { readonly label: string; readonly value: string; readonly et?: string }[];
  /** The drink the card dealt, in English, for the close to say back. */
  readonly drink: string | null;
  readonly over: boolean;
  /** How it ended, in the scene's own words, once it has. */
  readonly outcome: string | null;
  readonly met: number;
  readonly beats: number;
  readonly persona: string;
}

export interface DemoTurn {
  readonly beatId: string;
  readonly said: string;
  readonly heard: string;
}

/** The seed a browser may send: a short opaque string, never anything else. */
export function demoSeed(input: unknown): string | null {
  return typeof input === "string" && /^[A-Za-z0-9-]{4,40}$/.test(input) ? input : null;
}

/** The turns a browser may send, clipped and counted rather than trusted. */
export function demoTurns(input: unknown): DemoTurn[] | null {
  if (!Array.isArray(input) || input.length > DEMO_MAX_TURNS) return null;
  const out: DemoTurn[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const { beatId, said, heard } = raw as Record<string, unknown>;
    if (typeof beatId !== "string" || typeof said !== "string" || typeof heard !== "string") return null;
    out.push({ beatId: clip(beatId, 60), said: clip(said, MAX_TURN_CHARS), heard: clip(heard, 400) });
  }
  return out;
}

async function glossesOf(lemmas: readonly string[]): Promise<Map<string, string>> {
  if (lemmas.length === 0) return new Map();
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: [...new Set(lemmas)] } },
    select: { lemma: true, translation: true },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const out = new Map<string, string>();
  for (const row of rows) if (!out.has(row.lemma)) out.set(row.lemma, row.translation.split(/[,;]/)[0]!.trim());
  return out;
}

/** The words a beat names, which are the ones it would take. Never typed here: they are the scene's own requests. */
function hintLemmas(beat: BeatSpec | null | undefined, cardWord: string | null): string[] {
  if (!beat) return [];
  const out: string[] = [];
  for (const { need } of leafNeeds(beat.needs)) {
    if (need.kind === "lemma") out.push(...need.oneOf);
    if (need.kind === "datum" && cardWord) out.push(cardWord);
  }
  return [...new Set(out)].slice(0, 4);
}

export async function demoTurn(seed: string, sent: readonly DemoTurn[]): Promise<DemoReply | null> {
  const scene = sceneById(DEMO_SCENE_ID);
  if (!scene) return null;
  const context = await sceneContext(scene.id, LEVEL);
  if (!context) return null;
  const run = planRun(scene, seed, LEVEL, "textbook");
  const draw: StoredDraw = {
    persona: run.persona.id,
    card: run.card,
    curveballs: run.curveballs.map((c) => ({ id: c.id, at: c.at })),
    lines: "scripted",
    patience: run.patience,
  };
  const persona = PERSONAS.find((p) => p.id === run.persona.id)!;
  const turns: SentTurn[] = sent.map((t) => ({ beatId: t.beatId, said: t.said, helped: false, heard: t.heard }));

  // What has already been said, so the ladder does not repeat itself.
  const used = new Set<string>(sent.map((t) => t.heard).filter(Boolean));
  const heardBefore = sent[sent.length - 1]?.heard ?? "";

  const marking = await knowing(context, turns.map((t) => t.said));
  const { state, response, elsewhere } = replay(marking, draw, turns);

  const beat = currentBeat(scene, state);
  const standing = state.hurdle ? hurdleBeat(state.hurdle) : null;
  const speaking = response === "counter" && beat?.counter ? counterBeat(beat) : beat;
  const card = cardChosen(
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
    asked: askedNow, spoken: words(last?.said ?? ""), said: last?.said ?? "", answered, card, lexicon: context.lexicon,
    more: fresh(answered?.id), answers: answered ? fresh(answerBeatId(answered)) : [], missed: !landedNow,
  };
  let aside = wantsAside ? asideFor(asking) : null;
  const hearAgain = asksToHearAgain(words(last?.said ?? ""), context.marker.questionWords, context.lexicon);
  if (wantsAside && aside === null && hearAgain && heardBefore) aside = { text: heardBefore, provenance: "again" as const };

  let line: SpokenLine | null = null;
  const speaksEnglish = Boolean(standing && hurdleSpec(state)?.said);
  if (spokenFor && !(spokenFor.awaits && !standing) && !speaksEnglish) {
    const cheap = await sceneLine({
      beat: spokenFor,
      lexicon: context.lexicon,
      gate: {
        ...context.gate,
        dealt: dealtNumbers(card ?? draw.card),
        times: clockInPlay(card ?? draw.card, context.lexicon),
        money: moneyInPlay(card ?? draw.card, context.lexicon),
      },
      pool: context.pool.get(spokenFor.id) ?? [],
      topic: new Set<string>(context.topic.get(spokenFor.id) ?? []),
      hasFiniteVerb: context.hasFiniteVerb,
      fallback: context.fallback,
      scripted: context.scripted.get(spokenFor.id) ?? [],
      used,
      rotate: seedFrom(`${scene.id}:${run.seed}`),
      mode: "scripted",
    });
    line = cheap.provenance !== "fallback" ? cheap : datumLine(spokenFor, card, context.lexicon) ?? cheap;
    if (wantsAside && landedNow && !aside && asideOwed(asking) && !hearAgain) aside = shrug(context.lexicon);
  }

  const lines = replyFor({
    beat: speaking, answered: turns.length ? answered : null, response: turns.length ? response : null,
    reading: last?.reading ?? null, line, heard: heardBefore, said: last?.said ?? null, card,
    translates: persona.translates, askedForEnglish: last?.wantsEnglish === true,
    acknowledges: persona.acknowledges, echo: last?.matched?.[0] ?? null,
    recast: Boolean(last?.slips?.some((s) => s.form && s.form === last?.matched?.[0])),
    aside,
    offer: (response === "help" || response === "moveOn") && answered
      ? offerFor(answered, card ?? draw.card, context.marker.questionWords, last?.met ?? [], context.lexicon.infinitives)
      : null,
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

  const move = [...lines].reverse().find((l) => !l.reaction && l.provenance !== "unspoken");
  const over = isOver(scene, state) || sent.length >= DEMO_MAX_TURNS;
  const target = over ? null : standing ?? beat ?? null;

  const drink = draw.card.props.find((p) => p.slot === "drink");
  const cardWord = drink?.lemmas[0] ?? null;
  const lemmas = hintLemmas(target, cardWord);
  const glosses = await glossesOf([...lemmas, ...draw.card.props.flatMap((p) => p.lemmas)]);

  return {
    lines: lines.map((l) => ({
      text: l.text,
      provenance: l.provenance,
      ...(l.provenance === "unspoken" || l.provenance === "meanwhile" ? { aside: true as const } : {}),
    })),
    goal: target?.goal ?? null,
    beatId: target?.id ?? null,
    heard: move?.text ?? heardBefore,
    // The card's own sense for its word: `tee` is dealt as tea, and its first gloss is "road".
    hints: lemmas.map((et) => ({ et, en: (et === cardWord ? drink?.shown[0] : undefined) ?? glosses.get(et) ?? null })),
    card: draw.card.props.filter((p) => !p.theirs).map((p) => {
      const lemma = p.lemmas[0];
      const english = p.shown.length > 0 ? p.shown.join(", ") : lemma ? glosses.get(lemma) ?? lemma : p.value;
      // Only a dealt word needs its Estonian beside it; a price prints itself.
      return { label: p.card, value: english, ...(lemma && p.shown.length === 0 ? { et: lemma } : {}) };
    }),
    drink: drink ? (drink.shown[0] ?? (cardWord ? glosses.get(cardWord) : undefined) ?? null) : null,
    over,
    outcome: over ? outcomeOf(scene, state)?.says ?? null : null,
    met: state.done.length,
    beats: scene.beats.length,
    persona: persona.who,
  };
}
