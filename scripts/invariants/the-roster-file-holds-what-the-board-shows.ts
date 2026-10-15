import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE ROSTER FILE HOLDS WHAT THE BOARD SHOWS, AND NOTHING THE BOARD DOES NOT.
 *
 * `/api/class/<id>/roster` hands a class's owner a spreadsheet of what the
 * class page already shows them. Three things keep that true, and each is a
 * way a later edit would quietly widen it.
 *
 * The route reads no rows of its own: it goes through `classRoster` and
 * `workplaceRoster`, the two queries the page draws from, so a figure the
 * board does not carry cannot reach the file. The workplace half of the
 * builder never names a case, because `workplaceRoster` never reads one and a
 * sponsor's seat has no case column (ADR-019's boundary between the seats).
 * And every row goes through `line`, whose cells go through `defused`, since a
 * display name is typed by a learner and a spreadsheet runs a cell that opens
 * like a formula.
 */
const ROUTE = "app/api/class/[classroomId]/roster/route.ts";
const BUILDER = "lib/classroom/rosterCsv.ts";

export default function theRosterFileHoldsWhatTheBoardShows({ check, code }: InvariantKit) {
  check("the roster route reads no rows of its own", () => {
    const source = code(ROUTE);
    assert.ok(/classRoster\(/.test(source) && /workplaceRoster\(/.test(source), "the route stopped calling the board's own queries");
    assert.ok(!/from\s+["']@\/lib\/db["']/.test(source), "the route imports the database");
    assert.ok(!/\bprisma\b/.test(source), "the route names prisma");
    assert.ok(!/\bReview\b/.test(source), "the route names the review log");
  });

  check("the workplace roster file never names a case", () => {
    const source = code(BUILDER);
    const start = source.indexOf('if (input.kind === "CLASS")');
    const branch = source.indexOf("} else {", start);
    const end = source.indexOf("const header", branch);
    assert.ok(start >= 0 && branch > start && end > branch, "the builder's two branches could not be found");
    const workplace = source.slice(branch, end);
    for (const name of ["weakestCase", "weakestCases", "grammCase", "targetCase", "caseName"]) {
      assert.ok(!workplace.includes(name), `the workplace branch reaches ${name}`);
    }
  });

  check("every cell of the roster file goes through defused", () => {
    const source = code(BUILDER);
    const cell = source.slice(source.indexOf("export function cell("), source.indexOf("function line("));
    assert.ok(/defused\(value\)/.test(cell), "a cell no longer goes through defused");
    const pushes = [...source.matchAll(/rows\.push\(([^]*?)\);/g)].map((m) => m[1]!.trim());
    assert.ok(pushes.length >= 4, `only ${pushes.length} rows found, so the haystack stopped matching`);
    for (const p of pushes) assert.ok(p.startsWith("line("), `a row is built without line(): ${p.slice(0, 60)}`);
    assert.equal((source.match(/\.join\(","\)/g) ?? []).length, 1, "a row is joined somewhere other than line()");
  });
}
