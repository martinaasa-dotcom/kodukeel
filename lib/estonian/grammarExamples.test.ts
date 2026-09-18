/*
  EVERY EXAMPLE ON A GRAMMAR PAGE IS A SENTENCE SOMEBODY ELSE WROTE.

  `lib/estonian/grammar.ts` holds no Estonian at all, which is what stops this
  app inventing a form inside a sentence about forms, and what it cost was a
  reference nobody could act on: three abstractions in three boxes on the
  politeness page and nowhere to see one of them said. The pins are the answer
  and this is what keeps them honest. Naming a sentence a lexicographer wrote
  is choosing rather than writing (ADR-005), and it is only choosing while
  somebody checks that the sentence is really there.

  A unit test rather than an invariant, because the question is about 16,175
  rows of data rather than about the shape of the source: an invariant reading
  `grammarExamples.ts` cannot tell whether `Kas te soovite teed või kohvi?` is
  a line Ekilex holds or one somebody typed.

  Hermetic. It reads the files `npm run db:seed` loads and nothing else.
*/
import { describe, expect, it } from "vitest";

import { naturalSentence } from "./cloze";
import { splitOnForm } from "../dict/examples";
import { englishFor } from "../dict/exampleEnglish";
import { CASE_NOTES, TOPIC_NOTES } from "./grammar";
import {
  CASE_EXAMPLES, EXAMPLE_GAPS, TOPIC_EXAMPLES, everyPoint, examplesFor, gapKey,
} from "./grammarExamples";
import { dictionaryRows } from "../../scripts/lib/dictionary";

const ATTESTED = new Set<string>();
for (const row of dictionaryRows()) for (const ex of row.examples) ATTESTED.add(ex.et);

const TABLES = [
  ["topic", TOPIC_EXAMPLES] as const,
  ["case", CASE_EXAMPLES] as const,
];

/** Every pin in one list, with where it is filed. */
function allPins() {
  return TABLES.flatMap(([kind, table]) =>
    Object.entries(table).flatMap(([id, pins]) =>
      Object.entries(pins).flatMap(([point, list]) =>
        list.map((pin) => ({ kind, id, point, pin })),
      ),
    ),
  );
}

describe("grammar examples", () => {
  it("has pins to check", () => {
    expect(allPins().length).toBeGreaterThan(80);
  });

  /*
    THE CLAIM THIS FILE EXISTS FOR. A pin is a sentence a lexicographer wrote,
    or it is this app writing Estonian with extra steps.
  */
  it("pins only sentences the shipped dictionary holds", () => {
    const missing = allPins()
      .filter(({ pin }) => !ATTESTED.has(pin.et))
      .map(({ kind, id, pin }) => `${kind}:${id} — ${pin.et}`);
    expect(missing).toEqual([]);
  });

  /*
    And one a keyless deployment can read. Ekilex records no English against a
    usage on a reader key, so a sentence outside `example-english.json` reaches
    the default deployment as a line of Estonian with nothing under it, which
    is the fault `EstonianSentence` was written for.
  */
  it("pins only sentences that ship with their English", () => {
    const bare = allPins()
      .filter(({ pin }) => !englishFor(pin.et))
      .map(({ kind, id, pin }) => `${kind}:${id} — ${pin.et}`);
    expect(bare).toEqual([]);
  });

  /*
    AND A USAGE IS NOT ALWAYS A SENTENCE. Ekilex records a usage against a
    sense, so what comes back under a headword is sometimes lexicography: a
    line that trails off (`Uuringud näitavad, et ..`), one offering two
    alternatives round a slash, or one numbered out of a list of definitions.
    `naturalSentence` is where that is already decided for the mock exam and
    the level check, and a reference page makes the same claim they do.
  */
  it("pins only lines that are sentences", () => {
    const lexicography = allPins()
      .filter(({ pin }) => !naturalSentence(pin.et))
      .map(({ kind, id, pin }) => `${kind}:${id} — ${pin.et}`);
    expect(lexicography).toEqual([]);
  });

  /*
    The marked word is in the line. A pin whose form is not there draws a
    sentence with nothing highlighted, which is the state this replaced.
  */
  it("marks a word the sentence actually contains", () => {
    const unmarked = allPins()
      .filter(({ pin }) => !splitOnForm(pin.et, pin.form).some((run) => run.match))
      .map(({ kind, id, pin }) => `${kind}:${id} — "${pin.form}" not in "${pin.et}"`);
    expect(unmarked).toEqual([]);
  });

  /*
    Keyed by the point's own text rather than by its index, so a reorder of
    `points` cannot hand one point's examples to its neighbour. That is the one
    failure nothing on screen would show, so it is checked here.
  */
  it("files every pin under a point the reference actually makes", () => {
    const points = new Set(everyPoint().map((p) => `${p.kind}:${p.id}|${p.point}`));
    const orphans = allPins()
      .filter(({ kind, id, point }) => !points.has(`${kind}:${id}|${point}`))
      .map(({ kind, id, point }) => `${kind}:${id} — no such point: ${point}`);
    expect(orphans).toEqual([]);
  });

  it("files every id under a topic or a case that exists", () => {
    const topics = new Set(TOPIC_NOTES.map((t) => t.id));
    const cases = new Set(CASE_NOTES.map((c) => c.key as string));
    expect(Object.keys(TOPIC_EXAMPLES).filter((id) => !topics.has(id))).toEqual([]);
    expect(Object.keys(CASE_EXAMPLES).filter((id) => !cases.has(id))).toEqual([]);
  });

  /*
    A GAP IS A DECISION SOMEBODY TOOK, checked both ways so it cannot become a
    parking space: a point that has since been pinned may not also be excused,
    and a reason has to be a sentence rather than a shrug.
  */
  it("excuses a point with a written reason and never beside a pin", () => {
    const both: string[] = [];
    const thin: string[] = [];
    for (const p of everyPoint()) {
      const key = gapKey(p.kind, p.id, p.point);
      const reason = EXAMPLE_GAPS[key];
      if (!reason) continue;
      if (examplesFor(p.kind, p.id, p.point).length > 0) both.push(key);
      if (reason.trim().split(/\s+/).length < 6) thin.push(key);
    }
    expect(both).toEqual([]);
    expect(thin).toEqual([]);
  });

  it("files every gap under a point the reference actually makes", () => {
    const keys = new Set(everyPoint().map((p) => gapKey(p.kind, p.id, p.point)));
    expect(Object.keys(EXAMPLE_GAPS).filter((k) => !keys.has(k))).toEqual([]);
  });

  /*
    A FLOOR ON COVERAGE, because a pin list that quietly stopped growing looks
    exactly like one nobody needed. Raise it when you add pins; the only reason
    to lower it is a point leaving the reference.
  */
  it("covers most of what the reference claims", () => {
    const covered = everyPoint().filter(
      (p) => examplesFor(p.kind, p.id, p.point).length > 0,
    ).length;
    expect(covered).toBeGreaterThanOrEqual(55);
  });
});
