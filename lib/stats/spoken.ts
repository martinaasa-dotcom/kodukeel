/**
 * WHAT WAS SAID ALOUD THIS WEEK, READ OFF THE LOG (docs/39-speech.md SP-8,
 * docs/41-fifth-batch.md VB-14).
 *
 * "Said aloud this week: 23 answers, about 4 minutes" on Progress, derived from
 * `Review.spoken` on every request and never kept as a counter (ADR-014). The
 * minutes are the answers' own time on the card, which is the closest honest
 * figure the log has to time spent speaking; a tab left open is capped at ten
 * minutes a row by `writeGrade`, and a row nobody timed counts nothing. Where
 * no row was timed at all the sentence names no minutes rather than one.
 *
 * A count and a duration, said in plain ink and never as a verdict: speaking
 * more is not a score, and the app withdrew its streaks of that kind. Pure.
 */
export interface SpokenWeek {
  /** Answers given aloud in the last seven days. */
  readonly answers: number;
  /**
   * Their time on the card, in whole minutes, at least one where any of them
   * was timed. Null where none was: a conversation's grades and a numbers
   * round write no time, and "about 1 minute" over answers nobody timed would
   * be a figure the log does not hold.
   */
  readonly minutes: number | null;
}

export const SPOKEN_WINDOW_DAYS = 7;

export function spokenThisWeek(
  rows: readonly { reviewedAt: Date; durationMs: number; spoken: boolean }[],
  now: Date,
): SpokenWeek {
  const from = now.getTime() - SPOKEN_WINDOW_DAYS * 86_400_000;
  let answers = 0;
  let ms = 0;
  for (const row of rows) {
    if (!row.spoken) continue;
    const at = row.reviewedAt.getTime();
    if (at < from || at > now.getTime()) continue;
    answers += 1;
    ms += Math.max(0, row.durationMs);
  }
  return { answers, minutes: ms === 0 ? null : Math.max(1, Math.round(ms / 60_000)) };
}

/**
 * ONE CONVERSATION TURN SAID ALOUD, AS THE STORED TRANSCRIPT HOLDS IT (VB-14).
 *
 * A spoken turn's first record carries `spoken: true` (`TurnRecord.spoken`),
 * so a turn that made several records is read once. `words` is the length of
 * what the learner sent; `unseen` says the line it answered was only heard;
 * `met` says the turn answered the beat it was aimed at.
 */
export interface SpokenTurnRow {
  readonly at: Date;
  /** The band the run was played at. */
  readonly level: string;
  readonly words: number;
  readonly unseen: boolean;
  readonly met: boolean;
}

/** Words in a turn as a person counts them: runs of letters or digits. */
export function wordsIn(said: string): number {
  return said.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 0).length;
}

/**
 * The spoken turns of one stored run, read defensively: a transcript that will
 * not parse, or one written before speech, holds none.
 */
export function spokenTurnsOf(transcript: string, at: Date, level: string): SpokenTurnRow[] {
  let turns: unknown;
  try {
    turns = (JSON.parse(transcript) as { turns?: unknown }).turns;
  } catch {
    return [];
  }
  if (!Array.isArray(turns)) return [];
  const out: SpokenTurnRow[] = [];
  for (const turn of turns) {
    if (!turn || typeof turn !== "object") continue;
    const t = turn as Record<string, unknown>;
    if (t.spoken !== true || typeof t.said !== "string") continue;
    const words = wordsIn(t.said);
    if (words === 0) continue;
    out.push({
      at,
      level,
      words,
      unseen: t.unseen === true,
      met: Array.isArray(t.met) && t.met.some((m) => m === true),
    });
  }
  return out;
}

/** A month's spoken turns, and the median words in one. */
export interface MonthOfTurns {
  /** `YYYY-MM`, in the learner's own zone. */
  readonly month: string;
  readonly median: number;
  readonly turns: number;
}

/** Fewer turns than this in a month is too few to say how long they run. */
export const MIN_TURNS_A_MONTH = 3;
/** The months shown, newest last. */
export const MONTHS_SHOWN = 6;

/**
 * HOW LONG A SPOKEN ANSWER RUNS, MONTH BY MONTH (VB-14).
 *
 * The one fluency figure the log can honestly give: not whether the Estonian
 * was right, which a conversation never marks (ADR-022), but how much of it
 * somebody says in one go. The median rather than the mean, because one long
 * turn read out off the card would otherwise carry a month. A month under
 * `MIN_TURNS_A_MONTH` is left out rather than printed off one or two turns,
 * and the reading is offered only where two months are left to set side by
 * side, since one month is a number with nothing to read it against.
 *
 * `monthOf` is the learner's own calendar (`dayClock(zone).dayKey` cut to the
 * month), so a turn at half past midnight on the first lands in the month the
 * learner was in. Pure.
 */
export function spokenLengthByMonth(
  rows: readonly SpokenTurnRow[],
  monthOf: (at: Date) => string,
): MonthOfTurns[] {
  const byMonth = new Map<string, number[]>();
  for (const row of rows) {
    const month = monthOf(row.at);
    const held = byMonth.get(month) ?? [];
    held.push(row.words);
    byMonth.set(month, held);
  }
  const months = [...byMonth]
    .filter(([, words]) => words.length >= MIN_TURNS_A_MONTH)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-MONTHS_SHOWN)
    .map(([month, words]) => ({ month, median: median(words), turns: words.length }));
  return months.length >= 2 ? months : [];
}

/**
 * The middle value, to the whole word: "4.5 words" is a figure nobody says,
 * and a decimal is the one thing on that line a translation would have to
 * punctuate differently.
 */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(value);
}

/**
 * Spoken turns that answered a line only heard and met what they were aimed
 * at, by the band the run was played at: the evidence a conversation gives
 * that somebody can follow spoken Estonian at that band (VB-14). The readiness
 * rungs read it beside the level check and a sat paper. Counted, never scored.
 */
export function heardTurnsByLevel(rows: readonly SpokenTurnRow[]): ReadonlyMap<string, number> {
  const byLevel = new Map<string, number>();
  for (const row of rows) {
    if (!row.unseen || !row.met) continue;
    byLevel.set(row.level, (byLevel.get(row.level) ?? 0) + 1);
  }
  return byLevel;
}
