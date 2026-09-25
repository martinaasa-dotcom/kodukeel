import { describe, expect, it } from "vitest";

import type { Section } from "./corpus";
import { commentBlock, defused, keyColumns, toCsv } from "./csv";

function section(over: Partial<Section> = {}): Section {
  return {
    id: "case",
    title: "Accuracy by grammatical case",
    dimensions: ["case"],
    note: "n",
    suppressed: 0,
    cells: [
      {
        keys: ["PARTITIVE"],
        all: { reviews: 4830, learners: "100-249", accuracyPct: 61 },
        mature: { reviews: 2110, learners: "50-99", accuracyPct: 68 },
      },
    ],
    ...over,
  };
}

const HEADER = { preamble: ["one", "", "two"] };

function rows(csv: string): string[] {
  return csv.split("\n").filter((line) => line && !line.startsWith("#"));
}

describe("the file describes itself", () => {
  it("puts the method above the data, on lines a parser skips", () => {
    const csv = toCsv([section()], HEADER);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("# one");
    expect(lines[1]).toBe("#");
    expect(lines[2]).toBe("# two");
    // Everything before the header row is a comment, so `comment = "#"` gets
    // the table and nothing else.
    const header = lines.findIndex((l) => l.startsWith("section,"));
    expect(lines.slice(0, header).every((l) => l.startsWith("#"))).toBe(true);
  });

  it("writes no preamble at all rather than an empty comment", () => {
    expect(toCsv([section()], { preamble: [] }).startsWith("section,")).toBe(true);
  });

  it("keeps a blank preamble line as a bare marker", () => {
    expect(commentBlock(["a", "", "b"])).toBe("# a\n#\n# b");
  });
});

describe("one shape for tables of different widths", () => {
  it("widens to the widest table in the file", () => {
    const word = section({
      id: "word",
      dimensions: ["lemma", "pos", "cefr"],
      cells: [
        {
          keys: ["tuba", "NOUN", "A1"],
          all: { reviews: 300, learners: "50-99", accuracyPct: 44 },
          mature: null,
        },
      ],
    });
    expect(keyColumns([section(), word])).toBe(3);

    const [header, first, second] = rows(toCsv([section(), word], HEADER));
    expect(header).toBe(
      "section,dimension_1,value_1,dimension_2,value_2,dimension_3,value_3," +
        "reviews,learners,accuracy_pct,mature_reviews,mature_accuracy_pct",
    );
    // The narrow table leaves the columns it does not use empty rather than
    // shifting its numbers left into them.
    expect(first).toBe("case,case,PARTITIVE,,,,,4830,100-249,61,2110,68");
    expect(second).toBe("word,lemma,tuba,pos,NOUN,cefr,A1,300,50-99,44,,");
  });

  it("leaves the mature columns empty when that half was withheld", () => {
    const csv = toCsv([section({ cells: [{ ...section().cells[0]!, mature: null }] })], HEADER);
    expect(rows(csv)[1]!.endsWith(",61,,")).toBe(true);
  });

  it("writes one row per published cell and nothing for a withheld one", () => {
    const csv = toCsv([section({ suppressed: 7 })], HEADER);
    expect(rows(csv)).toHaveLength(2);
  });
});

describe("a field that could break a parser is quoted", () => {
  it("quotes and doubles what needs it", () => {
    const odd = section({
      id: "word",
      dimensions: ["lemma"],
      cells: [
        {
          keys: ['a,b"c'],
          all: { reviews: 100, learners: "10-19", accuracyPct: 50 },
          mature: null,
        },
      ],
    });
    expect(rows(toCsv([odd], HEADER))[1]).toBe('word,lemma,"a,b""c",100,10-19,50,,');
  });

  it("leaves an ordinary Estonian word alone, diacritics and all", () => {
    const et = section({
      id: "word",
      dimensions: ["lemma"],
      cells: [
        {
          keys: ["sõbranna"],
          all: { reviews: 100, learners: "10-19", accuracyPct: 50 },
          mature: null,
        },
      ],
    });
    expect(rows(toCsv([et], HEADER))[1]).toContain(",sõbranna,");
  });
});

describe("a cell a spreadsheet would run is written as text", () => {
  it("defuses a lemma that opens a formula, however it opens", () => {
    for (const bad of ["=HYPERLINK(\"x\")", "+1+1", "@SUM(A1)", "-2+3", "-cmd|x", "\t=1", "\r=1"]) {
      expect(defused(bad).startsWith("'"), bad).toBe(true);
    }
  });

  it("leaves a word, a suffix entry and a band alone", () => {
    for (const fine of ["tuba", "sõbranna", "-ki", "10-19", "PARTITIVE"]) {
      expect(defused(fine)).toBe(fine);
    }
  });

  it("carries the defusing into the file, quoted where the formula held a quote", () => {
    const hostile = section({
      id: "word",
      dimensions: ["lemma"],
      cells: [
        {
          keys: ['=HYPERLINK("http://x")'],
          all: { reviews: 100, learners: "10-19", accuracyPct: 50 },
          mature: null,
        },
      ],
    });
    expect(rows(toCsv([hostile], HEADER))[1]).toBe('word,lemma,"\'=HYPERLINK(""http://x"")",100,10-19,50,,');
  });
});
