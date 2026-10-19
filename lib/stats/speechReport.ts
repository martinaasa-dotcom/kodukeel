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
 *   Today's chat (VB-11): evenings offered one, evenings that took it, and
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
  for (const turn of turns) {
    const key = keyOf(turn);
    const list = groups.get(key);
    if (list) list.push(turn);
    else groups.set(key, [turn]);
  }
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
    const list = byCard.get(key);
    if (list) list.push(answer);
    else byCard.set(key, [answer]);
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

/**
 * TODAY'S CHAT (VB-11): HOW MANY EVENINGS COULD HAVE HAD ONE, HOW MANY DID,
 * AND WHETHER ITS WORDS WERE REMEMBERED BETTER.
 *
 * An evening could have had one where it was finished and met at least three
 * new words, which is an upper bound on "offered": the report cannot know
 * whether this deployment had a model on a given night, and says so. An
 * evening took one where a chat run was opened for it, and finished one where
 * that run ended.
 *
 * The words: for each finished chat, the first answer to each of the
 * evening's words that came at least `CHAT_NEXT_AFTER_MS` after the chat
 * ended, recalled or not, read apart for the words the chat asked for and the
 * evening's other words. The gap is what keeps the chat's own grades out of
 * it: `finishScene` grades the words a moment after the run closes, and that
 * is the chat, not the next review. Observational, like the recall reading
 * above, and for the same reason: the chat asks the words it can, which are
 * not a random half of the evening.
 */
export const CHAT_NEXT_AFTER_MS = 60 * 60 * 1000;

/** An evening that could have offered a chat, and whether one was opened or finished for it. */
export interface ChatEveningRow {
  readonly ownerId: string;
  readonly dayId: string;
}

/** A finished chat: whose, which evening, all of the evening's words and the ones the chat asked for. */
export interface ChatRun {
  readonly ownerId: string;
  readonly dayId: string;
  readonly evening: readonly string[];
  readonly asked: readonly string[];
  readonly endedAt: Date;
}

/** An answer to a word, which is all the chat reading needs of the log. */
export interface WordAnswer {
  readonly ownerId: string;
  readonly lemma: string;
  readonly reviewedAt: Date;
  readonly rating: number;
}

export interface ChatReading {
  /** Finished evenings with at least three new words: the most that could have offered a chat. */
  readonly offered: number;
  /** Evenings a chat was opened for. */
  readonly took: number;
  /** Evenings a chat was finished for. */
  readonly finished: number;
  /** Next answers to the words the chat asked for. */
  readonly chatWords: RecallSide;
  /** Next answers to the same evenings' other words. */
  readonly otherWords: RecallSide;
}

export function chatReading(input: {
  offered: readonly ChatEveningRow[];
  opened: readonly ChatEveningRow[];
  chats: readonly ChatRun[];
  answers: readonly WordAnswer[];
}): ChatReading {
  const evening = (r: ChatEveningRow) => `${r.ownerId}|${r.dayId}`;
  const byWord = new Map<string, WordAnswer[]>();
  for (const answer of input.answers) {
    const key = `${answer.ownerId}|${answer.lemma}`;
    const list = byWord.get(key);
    if (list) list.push(answer);
    else byWord.set(key, [answer]);
  }
  for (const list of byWord.values()) list.sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());

  const tally = { chat: { pairs: 0, recalled: 0 }, other: { pairs: 0, recalled: 0 } };
  const seen = new Set<string>();
  for (const chat of input.chats) {
    // One finished chat per evening is read: a second chat about the same words is the same evening.
    if (seen.has(evening(chat))) continue;
    seen.add(evening(chat));
    const asked = new Set(chat.asked);
    for (const lemma of new Set(chat.evening)) {
      const after = chat.endedAt.getTime() + CHAT_NEXT_AFTER_MS;
      const next = (byWord.get(`${chat.ownerId}|${lemma}`) ?? []).find((a) => a.reviewedAt.getTime() >= after);
      if (!next) continue;
      const side = asked.has(lemma) ? tally.chat : tally.other;
      side.pairs += 1;
      if (next.rating >= 2) side.recalled += 1;
    }
  }
  const side = (s: { pairs: number; recalled: number }): RecallSide => ({ ...s, share: s.pairs === 0 ? null : s.recalled / s.pairs });
  return {
    offered: new Set(input.offered.map(evening)).size,
    took: new Set(input.opened.map(evening)).size,
    finished: seen.size,
    chatWords: side(tally.chat),
    otherWords: side(tally.other),
  };
}

/** A share as a whole percentage, or "n/a" where there is none. */
export function percent(share: number | null): string {
  return share === null ? "n/a" : `${Math.round(share * 100)}%`;
}
