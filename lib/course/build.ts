/**
 * TURNING THE PLAN AND THE SYLLABUS INTO EVENINGS.
 *
 * `plan.ts` is the judgement and `lib/collections/syllabus/` is the course.
 * This has no opinions of its own: it slices, it rotates, and it reads what
 * those two already decided. That division is what makes a hundred and eighty
 * evenings reviewable, because the only things anybody has to check are the
 * eighteen part boundaries and five rotation lists.
 *
 * Pure, and it writes no Estonian: every lemma it hands to a day came out of a
 * unit, which is itself a request the Ekilex harvest either honors or reports
 * (ADR-005).
 */

import { CASES } from "@/lib/estonian/cases";
import { grammarTopic } from "@/lib/estonian/grammar";
import { emojiFor } from "@/lib/collections/emoji";
import { unitById, type SyllabusUnit } from "@/lib/collections/syllabus";
import { PARTS, ROTATION, SCENE_FOR_UNIT, VERB_HEAVY, type PartSpec } from "./plan";
import {
  ACTIVITIES, day, ordinaryWords,
  type ActivityKey, type CourseDay, type DaySpec, type Programme,
} from "./types";

const CASE_KEYS = new Set<string>(CASES.map((c) => c.key));

/**
 * Split a list into `n` pieces as evenly as it goes, longest first.
 *
 * Even rather than filling each evening to the ceiling, because eight and
 * eight and two is one evening that is barely a lesson: eighteen words over
 * three nights is six, six and six. The remainder goes to the front so the
 * short night is the last one, which is the night somebody is most likely to
 * be tired.
 */
export function slice<T>(items: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  let at = 0;
  for (let i = 0; i < n; i += 1) {
    const size = Math.ceil((items.length - at) / (n - i));
    out.push(items.slice(at, at + size));
    at += size;
  }
  return out;
}

/**
 * What an evening reads, from the unit's own list of what it teaches.
 *
 * A unit names its grammar in its own order and an evening takes the next one
 * along, so a unit spanning three nights opens three different pages rather
 * than the same one three times. Where the name is one of the fourteen cases
 * it is the case page, which is built out of the dictionary; where it is a
 * topic it is the reference page; and where it is neither, which happens for a
 * point the reference does not carry, the evening simply reads nothing rather
 * than linking somewhere that does not exist.
 */
export function reads(unit: SyllabusUnit, at: number): Pick<DaySpec, "grammar" | "grammarCase"> {
  const names = unit.grammar;
  if (names.length === 0) return {};
  const name = names[at % names.length]!;
  const asCase = name.toUpperCase();
  if (CASE_KEYS.has(asCase)) return { grammarCase: asCase };
  return grammarTopic(name) ? { grammar: name } : {};
}

/**
 * What the words taught so far can carry, which is what decides whether a
 * round may be dealt yet.
 *
 * A round is only worth scheduling once the words behind it exist: the
 * conjugation table with no verb taught is a table of verbs nobody has met,
 * and the picture board with no pictured noun taught is an empty board with a
 * way out on it. Both were dealt on the module's second evening, and the
 * table came filled from the dictionary at the band above.
 */
export interface Taught {
  /** A verb has been taught, so the conjugation table has something to run down. */
  verbs: boolean;
  /** A noun with a picture has been taught, so the board has a tile. */
  pictured: boolean;
}

/** The rounds whose material has to have been taught before they are dealt. */
export const NEEDS: Partial<Record<ActivityKey, keyof Taught>> = {
  conjugation: "verbs",
  picture: "pictured",
};

export function supportsRound(key: ActivityKey, taught: Taught): boolean {
  const need = NEEDS[key];
  return need ? taught[need] : true;
}

/** The rotation's rounds this evening could deal, given what has been taught. */
export function supportedRounds(level: string, taught: Taught): ActivityKey[] {
  const rotation = ROTATION[level] ?? ROTATION.A1!;
  return rotation.filter((key) => supportsRound(key, taught));
}

/**
 * The round that stands in for one the words cannot carry yet: the same kind,
 * so the evening still has its game and its drill, and always available,
 * because Match and Listening ask the words back as meanings and every taught
 * word has one.
 */
const STAND_IN: Record<"game" | "drill", ActivityKey> = { game: "match", drill: "listening" };

/**
 * The two rounds an evening does.
 *
 * One game and one drill, taken as neighbours off the level's rotation, which
 * alternates the two. Walking by two per evening means the pair moves every
 * night and repeats every five, so a fortnight covers the whole rotation twice
 * without ever running the same evening twice.
 *
 * A unit that is mostly verbs takes the conjugation table instead of the
 * drill, because a verb you cannot put in the third person is a verb you
 * cannot use, and it keeps the rotation's game so the evening still has one.
 *
 * A round whose words have not been taught yet is swapped for its stand-in,
 * which at A1 is the first two evenings: the pair is the same on both, and
 * that is a fact about the words rather than a fault in the walk.
 */
export function rounds(level: string, at: number, verbHeavy: boolean, taught: Taught = ALL_TAUGHT): ActivityKey[] {
  const rotation = ROTATION[level] ?? ROTATION.A1!;
  const first = rotation[(at * 2) % rotation.length]!;
  const second = rotation[(at * 2 + 1) % rotation.length]!;
  const game = ACTIVITIES[first].kind === "game" ? first : second;
  const other = game === first ? second : first;
  const drill = verbHeavy ? "conjugation" : other;
  return [game, drill].map((key) => {
    if (supportsRound(key, taught)) return key;
    return STAND_IN[ACTIVITIES[key].kind === "game" ? "game" : "drill"];
  });
}

const ALL_TAUGHT: Taught = { verbs: true, pictured: true };

/** What a list of words, taught in order, can carry. */
export function taughtFrom(
  words: readonly { lemma: string; pos: string }[],
): Taught {
  return {
    verbs: words.some((w) => w.pos === "VERB"),
    pictured: words.some((w) => w.pos === "NOUN" && emojiFor(w.lemma) !== undefined),
  };
}

const isVerbHeavy = (unit: SyllabusUnit): boolean =>
  unit.vocabulary.filter((v) => v.pos === "VERB").length / Math.max(1, unit.vocabulary.length)
    >= VERB_HEAVY;

/**
 * One part, built.
 *
 * A word is taught once inside a part. A unit may legitimately name a word an
 * earlier unit already taught, because a grammar unit teaches a rule using
 * vocabulary the learner has, and repeating it inside one fortnight would make
 * an evening that teaches nothing new. Across parts it is left alone: meeting
 * an A1 verb again inside B1's object unit is the course revisiting it on
 * purpose, and the review queue is what decides whether it is still known.
 */
export function buildPart(spec: PartSpec, before: readonly PartSpec[] = partsBefore(spec)): Programme {
  /*
    ONE SIZE, BECAUSE AN EVENING IS FIFTEEN MINUTES WHATEVER SHAPE IT TAKES.
    The fixed part is a reading, two rounds and the closing review, or a
    conversation and the closing review, and `TALK_MINUTES` is defined as
    exactly what the conversation displaces. What is left over is new words,
    and that is the same number either way.
  */
  const perDay = ordinaryWords(spec.level);
  const taught = new Set<string>();
  const days: CourseDay[] = [];
  /*
    What the ladder has taught so far, in the vocabulary a round is dealt
    against: every word of every part before this one, and then this part's
    own words as each evening hands them over. The day's own words count on the
    day, since meeting them is the first step of the evening.
  */
  const soFar: { lemma: string; pos: string }[] = before
    .flatMap((p) => p.units)
    .flatMap((id) => unitById(id)?.vocabulary ?? []);
  /* The rotation walks the whole part rather than restarting per unit, or the
     first evening of every unit would be the same pair for a fortnight. */
  let turn = 0;

  for (const unitId of spec.units) {
    const unit = unitById(unitId);
    if (!unit) continue;

    const words = unit.lemmas.filter((lemma) => !taught.has(lemma));
    for (const lemma of words) taught.add(lemma);
    if (words.length === 0) continue;

    const verbs = isVerbHeavy(unit);
    const scene = SCENE_FOR_UNIT[unitId];

    const chunks = slice(words, Math.max(1, Math.ceil(words.length / perDay)));

    chunks.forEach((chunk, n) => {
      const last = n === chunks.length - 1;
      for (const lemma of chunk) {
        const entry = unit.vocabulary.find((v) => v.lemma === lemma);
        if (entry) soFar.push(entry);
      }
      days.push(day(
        {
          id: `${spec.id}-${String(days.length + 1).padStart(2, "0")}`,
          title: unit.title,
          subtitle: unit.subtitle,
          canDo: unit.canDo,
          unitId,
          level: spec.level,
          words: chunk,
          ...reads(unit, n),
          practice: rounds(spec.level, turn, verbs, taughtFrom(soFar)),
          ...(last && scene ? { scene } : {}),
        },
        days.length + 1,
        { n: n + 1, of: chunks.length },
      ));
      turn += 1;
    });
  }

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    level: spec.level as Programme["level"],
    blurb: spec.blurb,
    days,
  };
}

/** The parts of the ladder ahead of this one, whose words count as taught. */
export function partsBefore(spec: PartSpec): readonly PartSpec[] {
  const at = PARTS.findIndex((p) => p.id === spec.id);
  return at > 0 ? PARTS.slice(0, at) : [];
}

export const buildProgrammes = (): Programme[] => PARTS.map((spec) => buildPart(spec));
