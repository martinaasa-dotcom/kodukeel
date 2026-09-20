/*
  THE JOIN BETWEEN A PIN AND A ROW, DRIVEN WITHOUT A DATABASE.

  `grammarExamples.test.ts` next door proves every pin names a sentence the
  shipped dictionary holds. What it cannot prove is that the page finds it: the
  sentences live in a JSON column, the resolver looks them up by the entry each
  pin names, and a sentence it misses is drawn as nothing at all, which looks
  exactly like a point nobody has pinned yet.

  So the rows here are built out of the shipped dictionary the way `prisma/seed.ts`
  writes them, and every pin in the app is put through the real matcher.
  Hermetic: the query is three lines and `matchPins` is the rest.
*/
import { describe, expect, it } from "vitest";

import { englishFor } from "../dict/exampleEnglish";
import {
  CASE_EXAMPLES, TOPIC_EXAMPLES, type PinnedExample,
} from "../estonian/grammarExamples";
import { matchPins } from "./grammarExamples";
import { dictionaryRows } from "../../scripts/lib/dictionary";

/*
  Read once rather than once per pin. `dictionaryRows` assembles six files into
  six thousand entries and sixteen thousand sentences on every call, and this
  file asks it for every one of 250 pins: a quarter of a minute of rebuilding
  the same dictionary, which is what put this suite within a few milliseconds
  of its own timeout and over it the first time anything downstream grew.
*/
const SHIPPED = dictionaryRows();

/** The `Lexeme` rows a seeded deployment holds, for the lemmas a pin names. */
function rowsFor(lemmas: Set<string>) {
  return SHIPPED
    .filter((r) => lemmas.has(r.lemma))
    .map((r, i) => ({
      id: `lex-${i}`,
      // As the seed writes it: the shipped English joined onto each sentence.
      examples: JSON.stringify(r.examples.map((e) => ({ et: e.et, en: englishFor(e.et) }))),
    }));
}

const EVERY = [...Object.values(TOPIC_EXAMPLES), ...Object.values(CASE_EXAMPLES)]
  .flatMap((pins) => Object.entries(pins));

describe("resolving the grammar pins", () => {
  it("finds every pinned sentence on the row its pin names", () => {
    const lost: string[] = [];
    for (const [point, pins] of EVERY) {
      const wanted = new Map<string, PinnedExample[]>([[point, [...pins]]]);
      const got = matchPins(wanted, rowsFor(new Set(pins.map((p) => p.lemma))));
      const found = new Set((got.get(point) ?? []).map((e) => e.et));
      for (const pin of pins) if (!found.has(pin.et)) lost.push(`${point} — ${pin.et}`);
    }
    expect(lost).toEqual([]);
  });

  /*
    And arrives with its English, which is the half a keyless deployment
    depends on: `EstonianSentence` offers to fetch a missing one, and with no
    model key there is nothing to fetch, so a null here is a bare line on a
    reference page for ever.
  */
  it("brings each one's English with it", () => {
    const bare: string[] = [];
    for (const [point, pins] of EVERY) {
      const wanted = new Map<string, PinnedExample[]>([[point, [...pins]]]);
      for (const e of matchPins(wanted, rowsFor(new Set(pins.map((p) => p.lemma)))).get(point) ?? []) {
        if (!e.en) bare.push(`${point} — ${e.et}`);
      }
    }
    expect(bare).toEqual([]);
  });

  /* A pin the dictionary no longer holds is dropped rather than half-drawn. */
  it("drops a sentence the dictionary no longer holds", () => {
    const wanted = new Map<string, PinnedExample[]>([
      ["a point", [{ lemma: "kohv", et: "Ei ole kunagi kirja pandud.", form: "kunagi", reviewed: false }]],
    ]);
    expect(matchPins(wanted, rowsFor(new Set(["kohv"]))).size).toBe(0);
  });
});
