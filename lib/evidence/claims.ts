/**
 * WHAT THIS PROJECT SAYS ABOUT ITSELF, AND HOW TO CHECK IT.
 *
 * Each row is one claim in one English sentence, the `npm run` script that
 * measures it, and the file that fails when the rule behind it breaks. A
 * claim without a command is not a row: a reviewer who doubts a figure has to
 * be able to run something and get the same number.
 *
 * The figure and its date come from one of two places, and the page says which.
 * `npm run evidence` re-runs every audit that needs no server, no database and
 * no key, and writes what it found into `measured.json` with the day it ran.
 * The rest need a running build, a database or a key to Ekilex, so they are
 * written here by hand with the day they were run and where: a figure older
 * than a release is still a figure, and its date is printed rather than hidden.
 *
 * Pure: the page reads `measured.json` and hands it in.
 */

export interface Claim {
  /** A key for `measured.json`, and the row's anchor. */
  readonly id: string;
  /** The claim, as one English sentence a reviewer can disagree with. */
  readonly claim: string;
  /** The `npm run` script that measures it. Must exist in package.json. */
  readonly script: string;
  /** Arguments the script is run with, where it needs any. */
  readonly args?: string;
  /** The file that fails when the rule behind the claim breaks. */
  readonly assertedBy: string;
  /** What that file does about it, in a few words. */
  readonly assertedHow: string;
  /**
   * For a claim `npm run evidence` cannot measure: the figure, the day and
   * where it was run. Absent means the figure comes from `measured.json`.
   */
  readonly recorded?: { readonly figure: string; readonly on: string; readonly where: string };
}

/** What `npm run evidence` writes, one entry per claim it measured. */
export type Measured = Readonly<Record<string, { readonly figure: string; readonly on: string }>>;

export const CLAIMS: readonly Claim[] = [
  {
    id: "verbs",
    claim: "Every person of a verb the app works out from a stored first person agrees with what Ekilex records for that verb.",
    script: "audit:verbs",
    assertedBy: "lib/estonian/conjugate.test.ts",
    assertedHow: "fails on a person ending the rule gets wrong",
  },
  {
    id: "cases",
    claim: "Every regular case of a noun the app works out from its stored forms agrees with the form Ekilex records.",
    script: "audit:cases",
    assertedBy: "lib/estonian/attested.test.ts",
    assertedHow: "walks every shipped entry and fails on a case that disagrees",
  },
  {
    id: "questions",
    claim: "No question the app can build from the shipped dictionary prints its own answer.",
    script: "audit:questions",
    assertedBy: ".github/workflows/ci.yml",
    assertedHow: "runs the audit on every pull request and fails on one",
  },
  {
    id: "sense",
    claim: "Every question and sentence the app builds makes sense for the word it is about.",
    script: "audit:sense",
    assertedBy: ".github/workflows/ci.yml",
    assertedHow: "runs the audit on every pull request and fails on one",
  },
  {
    id: "placement",
    claim: "The level check places a learner who says they do not know at their own level most of the time, and almost never above it.",
    script: "measure:placement",
    assertedBy: "lib/assessment/session.test.ts",
    assertedHow: "checks a band ends early only where the finished band would agree",
  },
  {
    id: "typos",
    claim: "A one-letter slip is forgiven only from eight letters, because below that a slip usually spells another real word.",
    script: "measure:typo-collisions",
    assertedBy: "lib/estonian/answer.test.ts",
    assertedHow: "fails on a short answer marked as a slip",
  },
  {
    id: "licences",
    claim: "No package the app runs on is under a licence that would bind the project's own code.",
    script: "check:licences",
    assertedBy: ".github/workflows/ci.yml",
    assertedHow: "runs the licence check on every pull request",
  },
  {
    id: "invariants",
    claim: "The rules in CLAUDE.md are asserted by checks that read the source, not described.",
    script: "test:invariants",
    assertedBy: "scripts/test-invariants.ts",
    assertedHow: "exits non-zero on a broken rule, and CI runs it",
  },
  {
    id: "unit",
    claim: "The unit suite runs with no database, no network and no clock it does not control.",
    script: "test",
    assertedBy: "vitest.config.mts",
    assertedHow: "blanks every variable the app reads and pins the time zone",
  },
  {
    id: "secrets",
    claim: "No credential reaches the code a browser downloads.",
    script: "check:secrets",
    assertedBy: ".github/workflows/ci.yml",
    assertedHow: "builds with a marked string in every server-only variable and searches the output",
    recorded: { figure: "Passed", on: "2026-10-15", where: "CI run #3181 on main" },
  },
  {
    id: "containment",
    claim: "Text and icons stay inside the boxes they were drawn in, on every route, at three widths and in both themes.",
    script: "test:containment",
    assertedBy: "scripts/test-containment.mjs",
    assertedHow: "measures the rectangles and fails on one outside its box",
    recorded: { figure: "8,054 checks, none failed", on: "2026-10-15", where: "a local run against a production build" },
  },
  {
    id: "phone",
    claim: "No page scrolls sideways on a phone, and every control under a finger is at least 44 pixels.",
    script: "test:mobile",
    assertedBy: "scripts/test-mobile.mjs",
    assertedHow: "measures five widths and fails on overflow or a small target",
    recorded: { figure: "195 checks, none failed", on: "2026-10-15", where: "a local run against a production build" },
  },
  {
    id: "axe",
    claim: "An automated accessibility checker finds no fault on any route, in the light theme or the dark.",
    script: "test:a11y",
    assertedBy: "scripts/a11y-check.mjs",
    assertedHow: "runs axe on every route in both themes and fails on a violation",
    recorded: { figure: "AXE", on: "2026-10-15", where: "a local run against a production build" },
  },
  {
    id: "load",
    claim: "Progress is worked out from the review log on every request and still answers quickly for a learner with a year of history.",
    script: "test:load",
    assertedBy: "scripts/load-test.mjs",
    assertedHow: "fails a query over 400 ms or a page over 1,500 ms at the 95th percentile",
    recorded: { figure: "Every query under 32 ms and every page under 610 ms at the 95th percentile", on: "2026-10-15", where: "a local run, 40 learners and 5,000 reviews each" },
  },
  {
    id: "restore",
    claim: "A dump of the database restores into an empty one with every row and the app healthy against the copy.",
    script: "drill:restore",
    assertedBy: "scripts/restore-drill.mjs",
    assertedHow: "compares every table's rows and asks the health check",
    recorded: { figure: "30 tables and 202,023 rows matched, healthy in 10.2 seconds", on: "2026-10-15", where: "a local database, not a production backup" },
  },
  {
    id: "glosses",
    claim: "Every English gloss in the built dictionary still says what the Wiktionary page it came from says.",
    script: "audit:glosses",
    assertedBy: ".github/workflows/drift.yml",
    assertedHow: "re-reads the pages every week",
    recorded: { figure: "5,363 entries, none disagreeing", on: "2026-08-31", where: "a full run by hand" },
  },
];

export interface EvidenceRow extends Claim {
  readonly figure: string;
  readonly on: string;
  /** Who wrote the figure down: the evidence script, or a person running something it cannot. */
  readonly source: "measured" | "recorded";
}

/** Each claim with its figure and date. A claim nothing has measured yet says so. */
export function evidenceRows(measured: Measured, claims: readonly Claim[] = CLAIMS): EvidenceRow[] {
  return claims.map((claim) => {
    if (claim.recorded) return { ...claim, figure: claim.recorded.figure, on: claim.recorded.on, source: "recorded" };
    const found = measured[claim.id];
    return found
      ? { ...claim, figure: found.figure, on: found.on, source: "measured" }
      : { ...claim, figure: "Not measured yet", on: "never", source: "measured" };
  });
}

/** The command a reviewer types to get the same figure. */
export function commandFor(claim: Claim): string {
  return `npm run ${claim.script}${claim.args ? ` -- ${claim.args}` : ""}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "15 October 2026". A row nothing has measured yet says so in words. */
export function measuredOn(on: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(on);
  if (!m) return "not measured yet";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
