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
import {
  clockInPlay, knowing, replay, type SceneContext, type StoredDraw,
} from "../../lib/progress/scene";
import { seedFrom } from "../../lib/random/seeded";
import { feltAt, replyFor, datumLine, cardAfterHurdles, cardChosen, cardInPlay, counterBeat, sayableAfterHurdles, wantsAsideFor } from "../../lib/scenes/reply";
import { asideFor, asideOwed, asksPrice, asksToHearAgain, shrug } from "../../lib/scenes/aside";
import { currentBeat, hurdleBeat, hurdleSpec, isOver, type SceneState } from "../../lib/scenes/state";
import { ASKS_ON } from "../../lib/scenes/curveballs";
import { sceneLine } from "../../lib/scenes/line";
import { PERSONAS } from "../../lib/scenes/personas";
import { answerBeatId, sceneBeats } from "../../lib/scenes/scripted";
import { offerFor } from "../../lib/scenes/grades";
import { choiceOf } from "../../lib/scenes/choice";
import { words, type Lexicon } from "../../lib/scenes/lexicon";
import { dealtNumbers, type RoleCard } from "../../lib/scenes/props";
import { stageFor, composeNote, establishedBy, factsFor, heldBack, heldNumbers, sceneMovedOn } from "../../lib/scenes/reply";
import { isKnownForm } from "../../lib/dict/forms";
import { askLine, type Link } from "./sceneDraft";
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
    const bank = (id: string | undefined): readonly string[] =>
      id ? sayableAfterHurdles(context.scripted.get(id) ?? [], state, context.lexicon, context.marker.negators) : [];
    const fresh = (id: string | undefined) => bank(id).filter((t) => !used.has(t));
    const asking = {
      asked: askedNow, spoken: words(last?.said ?? ""), said: last?.said ?? "", answered, card: inPlay, lexicon: context.lexicon,
      more: fresh(answered?.id), answers: answered ? fresh(answerBeatId(answered)) : [], missed: !landedNow,
    };
    let aside = wantsAside ? asideFor(asking) : null;
    // "Sorry, what?" gets the line again, never the shrug (the route's rule).
    const hearAgain = asksToHearAgain(words(last?.said ?? ""), context.marker.questionWords, context.lexicon);
    if (wantsAside && aside === null && hearAgain && heard) aside = { text: heard, provenance: "again" as const };

    let line: SpokenLine | null = null;
    const speaksEnglish = Boolean(standing && hurdleSpec(state)?.said);
    if (spokenFor && !(spokenFor.awaits && !standing) && !speaksEnglish) {
      const talk = state.turns.slice(-6).flatMap((t) => [
        ...(t.heard ? [{ role: "assistant" as const, content: t.heard }] : []),
        { role: "user" as const, content: t.said },
      ]);
      // What this person holds for later and what the run has established, as the route reads them.
      const held = heldBack(scene.beats, inPlay, state, spokenFor, {
        any: askedNow !== null,
        money: askedNow !== null && asksPrice(words(last?.said ?? ""), context.lexicon),
      });
      const established = establishedBy(state, inPlay);
      const moved = sceneMovedOn(state, inPlay, scene.beats);
      const agenda = scene.beats.slice(state.beat).filter((b) => !state.done.includes(b.id))
        .filter((b) => b.move !== "close" || b.id === spokenFor.id)
        .map((b) => stageFor(b, inPlay, b.id === spokenFor.id ? new Set() : held));
      const settled = scene.beats.filter((b) => state.done.includes(b.id)).map((b) => stageFor(b, inPlay));
      const anticipated = askedNow && answered?.answer ? stageFor({ ...answered, they: answered.answer }, inPlay) : null;
      const handing = (response === "help" || response === "moveOn") && answered
        ? offerFor(answered, inPlay, context.marker.questionWords, last?.met ?? [], context.lexicon.infinitives) : null;
      const facts = factsFor(inPlay, scene.beats, held);
      const deviated = Boolean(askedNow) || last?.reading === "offtarget" || last?.reading === "incomplete";
      const theirs = deviated ? words(last?.said ?? "").filter((w) => context.lexicon.forms.has(w) || marking.marker.known?.(w)) : [];
      const beatFor = spokenFor;
      const cheap = await sceneLine({
        beat: beatFor, lexicon: context.lexicon,
        gate: {
          ...context.gate, dealt: dealtNumbers(inPlay), times: clockInPlay(inPlay, context.lexicon),
          held: (() => {
            const kept = heldNumbers(inPlay, held);
            const open = heldNumbers(inPlay, new Set((inPlay?.props ?? []).map((p) => p.slot).filter((slot) => !held.has(slot))));
            const typed = new Set(state.turns.flatMap((t) => t.said.match(/\d{1,2}[:.]\d{2}|\d+/g) ?? []));
            return new Set([...kept].filter((x) => !open.has(x) && !typed.has(x)));
          })(),
        },
        pool: (askedNow || handing) && links.length > 0 ? [] : context.pool.get(beatFor.id) ?? [],
        topic: new Set([...(context.topic.get(beatFor.id) ?? []), ...theirs]),
        hasFiniteVerb: context.hasFiniteVerb, fallback: context.fallback,
        scripted: bank(beatFor.id), used,
        rotate: seedFrom(`${scene.id}:${options.runSeed}`), mode: links.length > 0 ? "composed" : "scripted",
        vouch: (spellings: readonly string[]) => vouchOf(context.lexicon, spellings),
        ...(links.length > 0 ? {
          compose: (avoid: readonly string[], because?: string) => askLine(links, {
            move: beatFor.move, they: stageFor(beatFor, inPlay), reading: "", facts, because, agenda, settled, established, moved,
            examples: [...context.scripted.entries()].filter(([id]) => id !== beatFor.id).flatMap(([, l]) => l.slice(0, 1)).slice(0, 6),
            asked: (bank(beatFor.id)).slice(0, 2),
            note: composeNote(turns.length > 0 ? response : null, last?.reading ?? null, elsewhere > 0, askedNow, { offer: handing, answer: anticipated }),
            feel: feltAt(answered, turns.length > 0 ? response : null),
            avoid,
          }, {
            scene: scene.title, place: scene.place, level, persona: persona.who, situation: scene.role,
            register: scene.register, words: context.lexicon.spoken,
          }, talk, () => {}, (l) => options.onDraft?.(l)),
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
        ? offerFor(answered, inPlay, context.marker.questionWords, last?.met ?? [], context.lexicon.infinitives) : null,
      met: state.done.length,
      metLast: last?.met ?? [],
      arriving: speaking ? !state.turns.some((t) => t.beatId === speaking.id) : false,
      tries: answered ? state.turns.filter((t) => t.beatId === answered.id).length : 0,
      choice: answered ? choiceOf({
        beat: answered, card: inPlay, lexicon: context.lexicon,
        dealt: new Map(scene.props.flatMap((p) => p.kind === "word" || p.kind === "weekday" ? [[p.slot, p.oneOf] as const] : [])),
        roll: state.turns.length, met: last?.met ?? [],
      }) : null,
      // The question waiting behind a curveball that carries straight on with it (`ASKS_ON`), as the route passes it.
      hurdle: standing ? {
        beat: standing, line: standing === spokenFor ? line : null, said: hurdleSpec(state)?.said,
        then: ASKS_ON.has(hurdleSpec(state)?.id ?? "") ? fresh(speaking?.id)[0] ?? null : null,
      } : null,
    });
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

/** A conversation as `replay:scene` has always printed it. */
export function printEvents(events: readonly Event[], log: (line: string) => void = console.log): void {
  for (const e of events) {
    if (e.kind === "them") log(`   THEM: ${e.line.text}   <${e.line.provenance}${e.line.reaction ? ", reaction" : ""}>`);
    else if (e.kind === "you") log(`   YOU: ${e.said}      (goal: ${e.target.goal})`);
    else if (e.kind === "read") log(`      [${e.reading} · response ${e.response} · patience ${e.patience}${e.asked ? ` · asked ${e.asked}` : ""}]`);
    else log(`   -> over: ${e.done.join(", ")}`);
  }
}
