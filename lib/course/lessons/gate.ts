/**
 * PRACTICE HAS A PASS MARK (operator's call, 2026-11-06, B1 lesson 2).
 *
 * A learner who got 11 of 22 right and pressed Continue went on to the next
 * lesson with half of tonight's pattern wrong, and nothing on the screen said
 * that was a problem. So Practice is passed at `PASS_MARK` of its questions,
 * counted the first time each is asked; below it, the ones that slipped come
 * back, and each one put right on a later go counts toward the mark, until
 * the total reaches it. Nobody is asked all twenty-two again: what comes back
 * is what was missed, which is where the time is worth spending.
 *
 * 70 rather than 50 or 60 because four options alone are a quarter by chance
 * and half the questions are words met two minutes earlier; 80 is the part
 * check's bar (`CHECK_PASS`), for consolidating rather than a first meeting.
 * Every level, A1 to C1. The step cannot be skipped until it is passed
 * (`LessonRunner`), which amends the rule that nobody is held in a room, for
 * this one step, on the operator's word.
 */
export const PASS_MARK = 0.7;

/** How many right answers out of `total` reach the mark: 16 of 22. */
export function needed(total: number, mark: number = PASS_MARK): number {
  return Math.ceil(total * mark - 1e-9);
}

export interface GateState {
  /** Every question in the round, by its index in the whole Practice set. */
  readonly total: number;
  /** Right the first time it was asked. */
  readonly firstTime: number;
  /** Put right on a later go. */
  readonly fixed: number;
  /** Still wrong: the indices that come back on the next go. */
  readonly missed: readonly number[];
}

export function startGate(total: number): GateState {
  return { total, firstTime: 0, fixed: 0, missed: [] };
}

/**
 * One go's answers folded in. `asked` is the set of question indices the go
 * held and `right` the ones answered right; on the first go a right answer is
 * a first-time one, on a later go a fix.
 */
export function afterGo(state: GateState, asked: readonly number[], right: ReadonlySet<number>, first: boolean): GateState {
  const wrong = asked.filter((i) => !right.has(i));
  const gotten = asked.length - wrong.length;
  return {
    total: state.total,
    firstTime: state.firstTime + (first ? gotten : 0),
    fixed: state.fixed + (first ? 0 : gotten),
    missed: wrong,
  };
}

/** Whether the mark is reached, or there is nothing left to ask. */
export function passed(state: GateState, mark: number = PASS_MARK): boolean {
  return state.firstTime + state.fixed >= needed(state.total, mark) || state.missed.length === 0;
}
