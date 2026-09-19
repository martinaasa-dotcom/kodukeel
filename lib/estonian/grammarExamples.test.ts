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
import { buildSlotIndex, readSlot } from "../../scripts/lib/slotIndex";

const ATTESTED = new Set<string>();
/** Which entries a sentence is recorded under, for the lemma a pin names. */
const RECORDED_UNDER = new Map<string, Set<string>>();
for (const row of dictionaryRows()) {
  for (const ex of row.examples) {
    ATTESTED.add(ex.et);
    (RECORDED_UNDER.get(ex.et) ?? RECORDED_UNDER.set(ex.et, new Set()).get(ex.et)!).add(row.lemma);
  }
}

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
    AND THE LEMMA IS THE ENTRY THE SENTENCE IS ACTUALLY FILED UNDER, because
    that is what the page looks the row up by: `Lexeme.examples` is a JSON
    column rather than a table, so a wrong lemma is a sentence the page cannot
    find and silently does not draw, which looks exactly like a point nobody
    has pinned yet.
  */
  it("names the entry each sentence is really recorded under", () => {
    const wrong = allPins()
      .filter(({ pin }) => !RECORDED_UNDER.get(pin.et)?.has(pin.lemma))
      .map(({ kind, id, pin }) => `${kind}:${id} — "${pin.et}" is not a usage of ${pin.lemma}`);
    expect(wrong).toEqual([]);
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
    EVERY POINT IS ANSWERED, WHICH IS THE WHOLE CLAIM.

    A floor on how many are pinned would let a point arrive with no example and
    no reason and nothing to say so, which is the state this replaced: the
    screen draws nothing either way, so an unpinned point and a point nobody
    has thought about look identical. A new point in `grammar.ts` fails here
    until somebody either finds it a sentence or writes down why there is not
    one.
  */
  it("answers every point, with a sentence or with a reason", () => {
    const unanswered = everyPoint()
      .filter(
        (p) =>
          examplesFor(p.kind, p.id, p.point).length === 0
          && !EXAMPLE_GAPS[gapKey(p.kind, p.id, p.point)],
      )
      .map((p) => `${p.kind}:${p.id} — ${p.point}`);
    expect(unanswered).toEqual([]);
  });

  /*
    And a floor under how many are answered with a sentence rather than a
    reason, because a gap is always available and a table of 168 reasons would
    pass the check above while teaching nobody anything. Raise it when you pin
    more; the only honest reason to lower it is a point leaving the reference.
  */
  it("answers most of them with a sentence rather than a reason", () => {
    const pinned = everyPoint().filter(
      (p) => examplesFor(p.kind, p.id, p.point).length > 0,
    ).length;
    expect(pinned).toBeGreaterThanOrEqual(120);
  });

  /*
    AND TWO IS THE ASK, so every answered point carries two.

    This was "most of them" while fourteen still carried one, and a floor with
    nothing under it is the parking space `senses.test.ts` records becoming
    one: the fourteen would have stayed at one for as long as the majority
    held. A point somebody has found one sentence for and not a second is a
    point half answered, and the honest ways out are the second sentence or
    the written reason the gap table is for.
  */
  it("gives every answered point two", () => {
    const thin = everyPoint()
      .filter((p) => {
        const n = examplesFor(p.kind, p.id, p.point).length;
        return n > 0 && n < 2;
      })
      .map((p) => `${p.kind}:${p.id} — ${p.point}`);
    expect(thin).toEqual([]);
  });

  /*
    AND THE MARKED WORD IS THE FORM THE PIN SAYS IT IS.

    The other checks are about the sentence: that it is attested, that it
    carries English, that it is a sentence, that the word is in it. None of
    them can tell a conditional from an indicative, which is the whole of what
    a pin on the conditional page claims, so for one pass that was checked by a
    scratch script that was then deleted. `scripts/lib/slotIndex.ts` is that
    script shipped, and this is it asked on every run.

    A case page needs no declared slot, because the page's own case is the
    claim and `CASE_EXAMPLES` is keyed on it. A topic page's points are moods
    and tenses and nothing in the file says which, so a pin there says so
    itself.

    Only `wrong` fails. `shared` is Estonian's own syncretism, `aadressi`
    being three cases at once, and `unknown` is a slot the dictionary does not
    store, which is every converb and every quotative; `npm run
    audit:grammar-pins` is where both are read rather than counted.
  */
  const SLOT_INDEX = buildSlotIndex();

  it("marks a word that really is the case the page is about", () => {
    const wrong: string[] = [];
    for (const [key, pins] of Object.entries(CASE_EXAMPLES)) {
      for (const [point, list] of Object.entries(pins)) {
        for (const pin of list) {
          const v = readSlot(SLOT_INDEX, pin.form, pin.slot ?? `CASE:${key}`);
          if (v.kind === "wrong") {
            wrong.push(`${key} — ${pin.form} in "${pin.et}" is ${v.instead.join(", ")}, under ${point}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("marks a word that really is the slot a topic pin claims", () => {
    const wrong: string[] = [];
    for (const [id, pins] of Object.entries(TOPIC_EXAMPLES)) {
      for (const [point, list] of Object.entries(pins)) {
        for (const pin of list) {
          if (!pin.slot) continue;
          const v = readSlot(SLOT_INDEX, pin.form, pin.slot);
          if (v.kind === "wrong") {
            wrong.push(`${id} — ${pin.form} in "${pin.et}" is ${v.instead.join(", ")}, not ${pin.slot}, under ${point}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  /*
    And a floor under how many carry one at all, because the claim is optional
    and an optional claim is one a later pin quietly does without.
  */
  it("claims a slot wherever there is one to claim", () => {
    const claimed = allPins().filter(({ kind, pin }) => kind === "case" || pin.slot).length;
    expect(claimed).toBeGreaterThanOrEqual(185);
  });
});
