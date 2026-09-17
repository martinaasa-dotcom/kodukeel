/**
 * A STEP OPENED FROM TONIGHT'S MODULE, AND WHAT IT CARRIES WITH IT.
 *
 * The module screen is one decision made in advance and it was handing the
 * learner off badly. Pressing a step opened an ordinary page of the website:
 * the rail down the left, the bar along the bottom of a phone, the tutor's
 * button in the corner, and, on the reading step, a reference page whose foot
 * carries links to three units and a drill. It was reported off the reading
 * step and the report is the whole specification: the learner read the page,
 * kept scrolling, and took a drill that was never part of tonight, because
 * nothing on the screen said where the reading ended. Then they came back and
 * the step was not ticked, so the evening's own list asked them to press "I
 * did this" about a page they had just read.
 *
 * So a step opened from the module says so, in the one place a screen can be
 * told anything about how it was reached: its own address. `?module=` carries
 * the five things a focused step needs and nothing else, which is what lets
 * the frame be mounted once for the whole website rather than wired into
 * eighteen pages one at a time.
 *
 * WHY THE WHOLE THING IS IN THE QUERY AND NOT LOOKED UP. The bar that draws
 * the way on is a client component mounted in the signed-in shell, and the
 * shell knows nothing about a programme. It could import `PROGRAMMES`, which
 * is pure data and therefore reachable from a browser, and that would put a
 * hundred and eighty evenings of syllabus into the bundle of every page in the
 * app to draw one button. It could ask the server, and then the frame lands a
 * round trip after the page and the website is drawn around the step for a
 * beat before it is taken away, which is the flicker `.scene-room` exists not
 * to have. The six fields are short, the module screen has all of them in
 * hand when it writes the link, and nothing here is trusted: `advanceCourseStep`
 * resolves the programme, the day and the step again on the server and refuses
 * a day the learner has not reached, exactly as `markCourseStep` always did.
 *
 * Pure, like the rest of `lib/course/`: no React, no Prisma, no clock.
 */

import type { CourseDay, CourseStep } from "./types";

/**
 * The one query key a focused step carries.
 *
 * One key rather than five, because a page's own search parameters are its
 * own: a step that opens a screen taking `?level=` or `?q=` would otherwise
 * have to agree with it about five generic names, and the day somebody adds a
 * sixth is the day two features disagree about what `step` means.
 */
export const MODULE_PARAM = "module";

/**
 * The separator inside that value.
 *
 * Not a dot and not a colon: a programme id is `a1.1` and a day id carries
 * dashes, so both are already spoken for. `~` is unreserved in a URL, so it
 * survives a round trip without being escaped into something a reader of the
 * address bar cannot recognise.
 */
const SEP = "~";

/** What a step in a module knows about itself, off its own address. */
export interface ModuleFocus {
  programmeId: string;
  dayId: string;
  stepId: string;
  /** Which step of the evening this is, 1-based, for the line above it. */
  n: number;
  /** How many steps the evening has. */
  of: number;
  /**
   * Whether the review log is what finishes this one.
   *
   * Display only, like `n` and `of`: the frame says "this ticks itself off
   * your answers" rather than letting a press imply a row was written, and a
   * learner who walks out of the closing round half way is told so there
   * rather than finding it out on the list. What actually decides whether a
   * row is written is `CourseStep.derived`, read off the day on the server by
   * `advanceCourseStep`, which never sees this.
   */
  derived: boolean;
}

/** Where the module's own screen is. The one place a focused step goes back to. */
export const MODULE_HOME = "/course";

/**
 * The marker for one step of one day.
 *
 * `n` and `of` are display only and are the reason they are here at all: a
 * learner inside a step has no list in front of them, so the frame has to be
 * able to say "3 of 5" without asking anybody. Getting them wrong costs a
 * wrong caption and can never cost a wrong tick, because the server reads the
 * day's own step order rather than these.
 */
export function focusValue(focus: ModuleFocus): string {
  return [
    focus.programmeId, focus.dayId, focus.stepId, focus.n, focus.of, focus.derived ? 1 : 0,
  ].join(SEP);
}

/**
 * A step's href with the marker on it.
 *
 * Written onto whatever query the href already carries, since a step may open
 * a screen that takes parameters of its own and dropping them would open a
 * different screen.
 */
export function focusHref(href: string, focus: ModuleFocus): string {
  const [path, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.set(MODULE_PARAM, focusValue(focus));
  return `${path}?${params.toString()}`;
}

/**
 * Read the marker back, or nothing.
 *
 * `unknown` in, because this arrives off the wire whatever a type says: a
 * hand-typed address, a stale bookmark or a link somebody shared all reach
 * this, and the honest answer to a value that is not six fields with two
 * numbers in it is that there is no module in play. Nothing downstream is
 * trusted either; this only decides whether a frame is drawn.
 */
export function readFocus(value: unknown): ModuleFocus | null {
  const raw = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (typeof raw !== "string") return null;
  const parts = raw.split(SEP);
  if (parts.length !== 6) return null;
  const [programmeId, dayId, stepId, n, of, derived] = parts as [
    string, string, string, string, string, string,
  ];
  if (!programmeId || !dayId || !stepId) return null;
  const at = Number(n);
  const total = Number(of);
  if (!Number.isInteger(at) || !Number.isInteger(total)) return null;
  if (at < 1 || total < 1 || at > total) return null;
  if (derived !== "0" && derived !== "1") return null;
  return { programmeId, dayId, stepId, n: at, of: total, derived: derived === "1" };
}

/** The same, off a page's own `searchParams` object. */
export function focusFrom(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ModuleFocus | null {
  return readFocus(searchParams?.[MODULE_PARAM]);
}

/**
 * Every step of a day, with the marker already on its href.
 *
 * One function rather than a `focusHref` at each call site, because the
 * numbering has to agree with the day's own order and a second place working
 * it out is a second answer to "which step is this".
 */
export function focusedSteps(
  programmeId: string, dayId: string, steps: readonly CourseStep[],
): readonly { step: CourseStep; href: string; n: number; of: number }[] {
  const of = steps.length;
  return steps.map((step, at) => ({
    step,
    n: at + 1,
    of,
    href: focusHref(step.href, {
      programmeId, dayId, stepId: step.id, n: at + 1, of, derived: step.derived,
    }),
  }));
}

/**
 * The step after this one, or nothing where this was the last.
 *
 * By position in the day's own order rather than by what is finished: the way
 * on from a step is the step after it, and whether an earlier one was skipped
 * is the module screen's question rather than this one's. A learner who
 * pressed past something still has it waiting for them on the list.
 */
export function stepAfter(day: CourseDay, stepId: string): CourseStep | null {
  const at = day.steps.findIndex((s) => s.id === stepId);
  if (at < 0) return null;
  return day.steps[at + 1] ?? null;
}

/**
 * Where "carry on" goes from a step: the next one, still inside the module, or
 * the module's own screen where this was the last.
 *
 * The evening ends on the list rather than rolling out into the app, which is
 * the same argument the module screen makes about tomorrow: an evening that
 * ends is an evening somebody comes back from.
 */
export function continueHref(programmeId: string, day: CourseDay, stepId: string): string {
  const next = stepAfter(day, stepId);
  if (!next) return MODULE_HOME;
  const focused = focusedSteps(programmeId, day.id, day.steps).find((f) => f.step.id === next.id);
  return focused ? focused.href : MODULE_HOME;
}
