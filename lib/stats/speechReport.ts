/**
 * DOES SAYING IT HELP? THE THREE READINGS OF `npm run report:speech`
 * (docs/41-fifth-batch.md VB-14, D3, D4).
 *
 * Pure: the script reads the rows and this does the arithmetic, so the
 * figures are unit tested rather than driven.
 *
 *   The edit rate. Every transcript lands in a box the learner can change
 *   before it counts (D3), so the share of heard words changed before sending
 *   is the in-app stand-in for the real-voice panel this batch did not build.
 *   It is an upper bound on misrecognition, since a learner also edits their
 *   own grammar, and the report says so. Read by band and by the language the
 *   learner reads glosses in, which is the only first-language signal the app
 *   holds. Past a quarter of heard words over at least 200 spoken turns the
 *   report says so at the top, so the operator can decide whether to reach for
 *   the switch (D15).
 *
 *   Recall after a spoken answer. For each card, an answer and the next answer
 *   to the same card: how often the next one is recalled, after a spoken
 *   answer against after a typed one. Observational and confounded, because
 *   people choose when to speak, so the typed side is read only from learners
 *   who have spoken at least once, and the report says it is not a trial.
 *
 *   Tonight's chat (VB-11): evenings offered one, evenings that took it, and
 *   how its words did at their next review against the evening's other words.
 */

/** Where the edit rate passes this share of heard words, the report leads with it. */
export const EDIT_ALARM_SHARE = 0.25;
/** And only over at least this many spoken turns, below which the share is noise. */
export const EDIT_ALARM_TURNS = 200;

/** One spoken turn, as a conversation records it: words heard and words changed before sending. */
export interface SpokenTurn {
  readonly band: string;
  readonly glossLanguage: string;
  readonly wordsHeard: number;
  readonly wordsChanged: number;
}

export interface EditRow {
  readonly key: string;
  readonly turns: number;
  readonly wordsHeard: number;
  readonly wordsChanged: number;
  /** Changed over heard, nought to one; null where nothing was heard. */
  readonly share: number | null;
}

export interface EditReading {
  readonly all: EditRow;
  readonly byBand: readonly EditRow[];
  readonly byLanguage: readonly EditRow[];
  /** The share passed `EDIT_ALARM_SHARE` over at least `EDIT_ALARM_TURNS` turns. */
  readonly alarm: boolean;
}

function row(key: string, turns: readonly SpokenTurn[]): EditRow {
  const wordsHeard = turns.reduce((n, t) => n + Math.max(0, t.wordsHeard), 0);
  const wordsChanged = turns.reduce((n, t) => n + Math.max(0, Math.min(t.wordsChanged, t.wordsHeard)), 0);
  return { key, turns: turns.length, wordsHeard, wordsChanged, share: wordsHeard === 0 ? null : wordsChanged / wordsHeard };
}

function grouped(turns: readonly SpokenTurn[], keyOf: (t: SpokenTurn) => string): EditRow[] {
  const groups = new Map<string, SpokenTurn[]>();
  for (const turn of turns) groups.set(keyOf(turn), [...(groups.get(keyOf(turn)) ?? []), turn]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, list]) => row(key, list));
}

export function editReading(turns: readonly SpokenTurn[]): EditReading {
  const all = row("all", turns);
  return {
    all,
    byBand: grouped(turns, (t) => t.band),
    byLanguage: grouped(turns, (t) => t.glossLanguage),
    alarm: all.turns >= EDIT_ALARM_TURNS && (all.share ?? 0) > EDIT_ALARM_SHARE,
  };
}

/**
 * The counts a conversation turn carries, read defensively off its stored JSON.
 *
 * A turn spoken rather than typed records `spoken: true` and two counts, words
 * heard and words changed before sending. Either spelling of the two names is
 * read, so the report does not depend on which the conversation wrote; a turn
 * with no counts is not a spoken turn this reading can use.
 */
export function spokenTurnCounts(turn: unknown): { wordsHeard: number; wordsChanged: number } | null {
  if (!turn || typeof turn !== "object") return null;
  const t = turn as Record<string, unknown>;
  if (t.spoken !== true) return null;
  const heard = numberOf(t.wordsHeard ?? t.heardWords);
  const changed = numberOf(t.wordsChanged ?? t.changedWords);
  if (heard === null || changed === null) return null;
  return { wordsHeard: heard, wordsChanged: changed };
}

function numberOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** One answer in the log, as much of it as the recall reading needs. */
export interface LoggedAnswer {
  readonly ownerId: string;
  readonly cardId: string;
  readonly reviewedAt: Date;
  readonly rating: number;
  readonly spoken: boolean;
}

export interface RecallSide {
  /** Answers followed by another answer to the same card. */
  readonly pairs: number;
  /** Of those, how many next answers were recalled (Hard or better). */
  readonly recalled: number;
  readonly share: number | null;
}

export interface RecallReading {
  readonly spoken: RecallSide;
  /** Typed answers, from learners who have spoken at least once. */
  readonly typed: RecallSide;
  /** How many learners have spoken at all. */
  readonly speakers: number;
}

export function recallReading(answers: readonly LoggedAnswer[]): RecallReading {
  const speakers = new Set(answers.filter((a) => a.spoken).map((a) => a.ownerId));
  const byCard = new Map<string, LoggedAnswer[]>();
  for (const answer of answers) {
    if (!speakers.has(answer.ownerId)) continue;
    const key = `${answer.ownerId}|${answer.cardId}`;
    byCard.set(key, [...(byCard.get(key) ?? []), answer]);
  }
  const tally = { spoken: { pairs: 0, recalled: 0 }, typed: { pairs: 0, recalled: 0 } };
  for (const list of byCard.values()) {
    const ordered = [...list].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());
    for (let i = 0; i + 1 < ordered.length; i++) {
      const side = ordered[i]!.spoken ? tally.spoken : tally.typed;
      side.pairs += 1;
      if (ordered[i + 1]!.rating >= 2) side.recalled += 1;
    }
  }
  const side = (s: { pairs: number; recalled: number }): RecallSide => ({ ...s, share: s.pairs === 0 ? null : s.recalled / s.pairs });
  return { spoken: side(tally.spoken), typed: side(tally.typed), speakers: speakers.size };
}

/** A share as a whole percentage, or a dash in words where there is none. */
export function percent(share: number | null): string {
  return share === null ? "n/a" : `${Math.round(share * 100)}%`;
}
