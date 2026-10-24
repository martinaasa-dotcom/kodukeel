/**
 * EVERY WCAG 2.2 A AND AA CRITERION, WHERE KODUKEEL STANDS ON IT, AND WHAT CHECKS IT.
 *
 * The table under the accessibility statement, and the evidence a buyer's
 * accessibility lead asks for: EN 301 549 chapter 9 adopts the WCAG criteria
 * for web content one for one (clause 9.x.y.z is criterion x.y.z), so a row
 * per criterion is a row per clause. Chapter 11 is for software that is not a
 * web page, and a web app in a browser is chapter 9; chapter 12, documentation
 * and support, is the statement itself and the address on it.
 *
 * Four statuses, and one rule about the first: a criterion is marked
 * "supports" only where a check in this repository asserts it, named in
 * `checkedBy`, which `en301549.test.ts` holds to a file that exists. Where
 * nothing checks a criterion, or the statement above the table names a gap in
 * it, the row says "partially supports" and says which. A row marked
 * "supports" with nothing behind it is the overclaim the statement exists to
 * avoid, so where the table and the statement disagree, the statement wins and
 * the table is wrong.
 *
 * Six of these criteria are new in WCAG 2.2 and are not yet in EN 301 549
 * V3.2.1, which adopts WCAG 2.1; they are here because the statement's target
 * is 2.2, and `newIn22` marks them.
 */

export type Status = "supports" | "partial" | "not-supported" | "not-applicable";

/** Why a criterion is not "supports", in the reader's terms. Each is a line the page translates. */
export type Reason =
  | "no-check"
  | "exam-clock"
  | "hearing"
  | "no-video"
  | "no-motion-input"
  | "focus-text-only";

export interface Criterion {
  /** The WCAG number, which is also the EN 301 549 clause after "9.". */
  readonly id: string;
  /** The criterion's name as WCAG publishes it, in English. */
  readonly name: string;
  readonly level: "A" | "AA";
  readonly status: Status;
  /** The suite or invariant file that asserts it. Required for "supports". */
  readonly checkedBy?: string;
  /** Why it is not "supports". Required for every other status. */
  readonly reason?: Reason;
  /** New in WCAG 2.2, so not yet a clause of EN 301 549 V3.2.1. */
  readonly newIn22?: true;
}

const AXE = "scripts/a11y-check.mjs";
const PHONE = "scripts/test-mobile.mjs";
const NAV = "lib/ux/nav.test.ts";
const no = (id: string, name: string, level: "A" | "AA", reason: Reason = "no-check", newIn22?: true): Criterion =>
  ({ id, name, level, status: "partial", reason, ...(newIn22 ? { newIn22 } : {}) });
const yes = (id: string, name: string, level: "A" | "AA", checkedBy: string, newIn22?: true): Criterion =>
  ({ id, name, level, status: "supports", checkedBy, ...(newIn22 ? { newIn22 } : {}) });
const na = (id: string, name: string, level: "A" | "AA", reason: Reason): Criterion =>
  ({ id, name, level, status: "not-applicable", reason });

export const CRITERIA: readonly Criterion[] = [
  yes("1.1.1", "Non-text Content", "A", AXE),
  no("1.2.1", "Audio-only and Video-only (Prerecorded)", "A", "hearing"),
  na("1.2.2", "Captions (Prerecorded)", "A", "no-video"),
  na("1.2.3", "Audio Description or Media Alternative (Prerecorded)", "A", "no-video"),
  na("1.2.4", "Captions (Live)", "AA", "no-video"),
  na("1.2.5", "Audio Description (Prerecorded)", "AA", "no-video"),
  yes("1.3.1", "Info and Relationships", "A", AXE),
  no("1.3.2", "Meaningful Sequence", "A"),
  no("1.3.3", "Sensory Characteristics", "A"),
  yes("1.3.4", "Orientation", "AA", "scripts/invariants/no-orientation-lock.ts"),
  no("1.3.5", "Identify Input Purpose", "AA"),
  no("1.4.1", "Use of Color", "A"),
  yes("1.4.2", "Audio Control", "A", "lib/audio/clipAutoplay.test.ts"),
  yes("1.4.3", "Contrast (Minimum)", "AA", "scripts/test-design.mjs"),
  no("1.4.4", "Resize Text", "AA"),
  no("1.4.5", "Images of Text", "AA"),
  yes("1.4.10", "Reflow", "AA", PHONE),
  no("1.4.11", "Non-text Contrast", "AA"),
  no("1.4.12", "Text Spacing", "AA"),
  no("1.4.13", "Content on Hover or Focus", "AA"),
  no("2.1.1", "Keyboard", "A"),
  yes("2.1.2", "No Keyboard Trap", "A", "scripts/invariants/dialogs-hold-focus.ts"),
  yes("2.1.4", "Character Key Shortcuts", "A", "scripts/invariants/a-single-key-answers-to-the-setting.ts"),
  no("2.2.1", "Timing Adjustable", "A", "exam-clock"),
  yes("2.2.2", "Pause, Stop, Hide", "A", "scripts/invariants/motion-rests.ts"),
  no("2.3.1", "Three Flashes or Below Threshold", "A"),
  yes("2.4.1", "Bypass Blocks", "A", AXE),
  yes("2.4.2", "Page Titled", "A", AXE),
  no("2.4.3", "Focus Order", "A"),
  no("2.4.4", "Link Purpose (In Context)", "A"),
  yes("2.4.5", "Multiple Ways", "AA", NAV),
  no("2.4.6", "Headings and Labels", "AA"),
  no("2.4.7", "Focus Visible", "AA", "focus-text-only"),
  no("2.4.11", "Focus Not Obscured (Minimum)", "AA", "no-check", true),
  no("2.5.1", "Pointer Gestures", "A"),
  no("2.5.2", "Pointer Cancellation", "A"),
  no("2.5.3", "Label in Name", "A"),
  na("2.5.4", "Motion Actuation", "A", "no-motion-input"),
  no("2.5.7", "Dragging Movements", "AA", "no-check", true),
  yes("2.5.8", "Target Size (Minimum)", "AA", PHONE, true),
  yes("3.1.1", "Language of Page", "A", AXE),
  yes("3.1.2", "Language of Parts", "AA", AXE),
  no("3.2.1", "On Focus", "A"),
  no("3.2.2", "On Input", "A"),
  yes("3.2.3", "Consistent Navigation", "AA", NAV),
  no("3.2.4", "Consistent Identification", "AA"),
  no("3.2.6", "Consistent Help", "A", "no-check", true),
  no("3.3.1", "Error Identification", "A"),
  no("3.3.2", "Labels or Instructions", "A"),
  no("3.3.3", "Error Suggestion", "AA"),
  no("3.3.4", "Error Prevention (Legal, Financial, Data)", "AA"),
  no("3.3.7", "Redundant Entry", "A", "no-check", true),
  no("3.3.8", "Accessible Authentication (Minimum)", "AA", "no-check", true),
  yes("4.1.2", "Name, Role, Value", "A", AXE),
  yes("4.1.3", "Status Messages", "AA", "scripts/invariants/verdicts-are-announced.ts"),
];

/** The EN 301 549 clause a criterion is, or null where V3.2.1 has none yet. */
export function clauseOf(c: Criterion): string | null {
  return c.newIn22 ? null : `9.${c.id}`;
}

/** The sentence beside a status, in English; the page translates it. */
export const REASON_TEXT: Readonly<Record<Reason, string>> = {
  "no-check": "Nothing in the build checks this yet, so it is not claimed.",
  "exam-clock": "The mock examination keeps a fixed clock, as the statement above explains. Every practice clock can be set longer.",
  hearing: "The listening, dictation and minimal-pair rounds need hearing, as the statement above explains.",
  "no-video": "The app has no video.",
  "no-motion-input": "Nothing is operated by moving or shaking the device.",
  "focus-text-only": "The visible focus ring is checked for text fields only.",
};

export const STATUS_TEXT: Readonly<Record<Status, string>> = {
  supports: "Supports",
  partial: "Partially supports",
  "not-supported": "Does not support",
  "not-applicable": "Not applicable",
};
