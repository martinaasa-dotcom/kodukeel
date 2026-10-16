import { describe, expect, it } from "vitest";
import { csvCell, parseCsv } from "@/scripts/lib/csv";
import type { ScriptedLine } from "@/lib/scenes/scripted";
import { stringLiterals } from "./literals";
import { applyToBankFile, decideSceneSheet, readSceneSheet, sceneSheet } from "./sceneSheet";
import {
  confirmedCount, decideTranslationSheet, readTranslationSheet, replaceTranslationIn, translationSheet,
} from "./translationSheet";
import type { SceneSpec } from "@/lib/scenes/types";

describe("the sheet a reviewer sends back", () => {
  it("reads quotes, commas and line breaks inside a cell", () => {
    const sheet = 'scene,beat,line,ok,correction\r\ntrepikoda,greet,"Tere, naaber!",x,""\nkaebus,close,"Ta ütles: ""aitäh""\nja läks",,\n';
    expect(parseCsv(sheet)).toEqual([
      ["scene", "beat", "line", "ok", "correction"],
      ["trepikoda", "greet", "Tere, naaber!", "x", ""],
      ["kaebus", "close", 'Ta ütles: "aitäh"\nja läks', "", ""],
    ]);
  });

  it("writes a cell the reader reads back unchanged", () => {
    for (const value of ["plain", "a, b", 'say "hi"', "two\nlines"]) {
      expect(parseCsv(`${csvCell(value)},end`)).toEqual([[value, "end"]]);
    }
  });
});

const BANK: ScriptedLine[] = [
  { scene: "s", beat: "greet", text: "Tere!", model: "authored", draftedAt: "2026-10-01" },
  { scene: "s", beat: "ask", text: "Kuidas läheb?", model: "authored", draftedAt: "2026-10-01" },
  { scene: "s", beat: "ask", text: "Mis uudist?", model: "authored", draftedAt: "2026-10-01", reviewedAt: "2026-10-02" },
];
const FILE = `/* GENERATED header kept */
import type { ScriptedLine } from "../scripted";

const LINES: readonly ScriptedLine[] = [
  { scene: "s", beat: "greet", text: "Tere!", model: "authored", draftedAt: "2026-10-01" },
  { scene: "s", beat: "ask", text: "Kuidas läheb?", model: "authored", draftedAt: "2026-10-01" },
  { scene: "s", beat: "ask", text: "Mis uudist?", model: "authored", draftedAt: "2026-10-01", reviewedAt: "2026-10-02" },
];

export default LINES;
`;

describe("the scene lines sheet", () => {
  const scene = { id: "s", beats: [{ id: "greet" }, { id: "ask" }], curveballs: [] } as unknown as SceneSpec;

  it("lists only the lines nobody has reviewed, in the order the conversation plays", () => {
    const rows = sceneSheet([scene], [...BANK].reverse(), (_, beat) => ({ goal: `goal of ${beat}`, they: "" }));
    expect(rows.slice(1).map((r) => [r[1], r[4]])).toEqual([["greet", "Tere!"], ["ask", "Kuidas läheb?"]]);
  });

  const filled = (cells: string[][]) => readSceneSheet([["scene", "beat", "goal", "line", "ok", "correction", "why"], ...cells]).rows;

  it("refuses a correction the gate refuses, and writes nothing for it", () => {
    const rows = filled([["s", "ask", "", "Kuidas läheb?", "", "Kuidas 3 läheb?", ""]]);
    const decisions = decideSceneSheet(rows, BANK, (_, __, text) => (/\d/.test(text) ? ["digit"] : []));
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.kind).toBe("refuse");
    expect(applyToBankFile(FILE, decisions, "2026-10-15").source).toBe(FILE);
  });

  it("refuses a line the bank does not hold character for character", () => {
    const rows = filled([["s", "ask", "", "Kuidas laheb?", "x", "", ""]]);
    const [decision] = decideSceneSheet(rows, BANK, () => []);
    expect(decision?.kind).toBe("refuse");
    expect(decision?.kind === "refuse" && decision.reason).toMatch(/character for character/);
  });

  it("dates a ticked line and replaces a corrected one, leaving the header and the other rows", () => {
    const rows = filled([
      ["s", "greet", "", "Tere!", "x", "", ""],
      ["s", "ask", "", "Kuidas läheb?", "", "Kuidas sul läheb?", "more natural"],
    ]);
    const decisions = decideSceneSheet(rows, BANK, () => []);
    expect(decisions.map((d) => d.kind)).toEqual(["confirm", "correct"]);
    const { source, missing } = applyToBankFile(FILE, decisions, "2026-10-15");
    expect(missing).toEqual([]);
    expect(source).toContain('/* GENERATED header kept */');
    expect(source).toContain('{ scene: "s", beat: "greet", text: "Tere!", model: "authored", draftedAt: "2026-10-01", reviewedAt: "2026-10-15" }');
    expect(source).toContain('{ scene: "s", beat: "ask", text: "Kuidas sul läheb?", model: "authored", draftedAt: "2026-10-01", reviewedAt: "2026-10-15" }');
    expect(source).toContain('text: "Mis uudist?", model: "authored", draftedAt: "2026-10-01", reviewedAt: "2026-10-02" }');
  });

  it("skips a row with nothing filled in", () => {
    expect(decideSceneSheet(filled([["s", "greet", "", "Tere!", "", "", ""]]), BANK, () => [])).toEqual([]);
  });
});

describe("the translation sheet", () => {
  const OBJECT_FILE = `export const AREA = {
  ru: {
  "Hello": "Здравствуйте",
  "Hello@greeting": "Привет",
  "Joined": "Вместе " + "с вами",
  },
  uk: {
  "Hello": "Добрий день",
  },
};
`;
  const TUPLE_FILE = `const LINES = [
  ["Order again", "Заказать ещё раз", "Замовити ще раз"],
  ["Inside there are {n} of these.",
    "Внутри их {n}.",
    "Усередині їх {n}."],
];
export const BORROWS: readonly string[] = [
  "Order again", "Something else", "A third",
];
`;

  it("puts a correction on the right key in the right language, and on nothing else", () => {
    const ru = replaceTranslationIn(OBJECT_FILE, "ru", "Hello", "Добрый день");
    expect(ru.replaced).toBe(1);
    expect(ru.source).toContain('"Hello": "Добрый день",\n  "Hello@greeting": "Привет"');
    expect(ru.source).toContain('uk: {\n  "Hello": "Добрий день"');
    const uk = replaceTranslationIn(OBJECT_FILE, "uk", "Hello", "Вітаю");
    expect(uk.source).toContain('"Hello": "Здравствуйте"');
    expect(uk.source).toContain('"Hello": "Вітаю"');
  });

  it("reads the [english, ru, uk] rows and leaves a plain list of English alone", () => {
    const out = replaceTranslationIn(TUPLE_FILE, "uk", "Order again", "Замовити знову");
    expect(out.replaced).toBe(1);
    expect(out.source).toContain('["Order again", "Заказать ещё раз", "Замовити знову"]');
    expect(out.source).toContain('"Order again", "Something else", "A third"');
    const multi = replaceTranslationIn(TUPLE_FILE, "ru", "Inside there are {n} of these.", "Внутри таких {n}.");
    expect(multi.source).toContain('"Внутри таких {n}."');
  });

  it("reads a flat table for one language", () => {
    const flat = `export const RU = {\n  "Save": "Сохранить",\n};\n`;
    expect(replaceTranslationIn(flat, "ru", "Save", "Записать", "ru").source).toContain('"Save": "Записать"');
    expect(replaceTranslationIn(flat, "uk", "Save", "Зберегти", "ru").replaced).toBe(0);
  });

  it("reports a value built with + rather than guessing", () => {
    const out = replaceTranslationIn(OBJECT_FILE, "ru", "Joined", "Вместе");
    expect(out.replaced).toBe(0);
    expect(out.problems[0]).toMatch(/by hand/);
  });

  const sheet = (cells: string[][]) =>
    readTranslationSheet([["locale", "area", "key", "english", "translation", "ok", "correction", "why"], ...cells]).rows;
  const now = (_: "ru" | "uk", key: string) => ({ Hello: "Здравствуйте", "Inside there are {n} of these.": "Внутри их {n}." } as Record<string, string>)[key];

  it("refuses a verdict on a line that changed since the sheet, a lost slot, and a line no area holds", () => {
    const decisions = decideTranslationSheet(sheet([
      ["ru", "x", "Hello", "Hello", "Привет", "x", "", ""],
      ["ru", "x", "Inside there are {n} of these.", "", "Внутри их {n}.", "", "Внутри их.", ""],
      ["ru", "x", "Hello", "", "Здравствуйте", "", "Добрый день", ""],
      ["ru", "x", "Gone", "", "Ушло", "x", "", ""],
      ["ru", "x", "Hello", "", "Здравствуйте", "x", "", ""],
    ]), now);
    expect(decisions.map((d) => d.kind)).toEqual(["refuse", "refuse", "correct", "refuse", "confirm"]);
  });

  it("refuses an Estonian letter in a correction", () => {
    const [decision] = decideTranslationSheet(sheet([["ru", "x", "Hello", "", "Здравствуйте", "", "Tere õhtust", ""]]), now);
    expect(decision?.kind).toBe("refuse");
  });

  it("refuses a long dash in a correction, since no screen may show one", () => {
    const [decision] = decideTranslationSheet(sheet([["ru", "x", "Hello", "", "Здравствуйте", "", "Добрый день \u2014 привет", ""]]), now);
    expect(decision?.kind).toBe("refuse");
  });

  it("writes one row per line with the exact key", () => {
    const rows = translationSheet("uk", [["a", { ru: { "Hi@x": "Привет" }, uk: { "Hi@x": "Привіт" } }]]);
    expect(rows[1]).toEqual(["uk", "a", "Hi@x", "Hi", "Привіт", "", "", ""]);
  });

  it("counts a confirmation only while the line still reads that way", () => {
    expect(confirmedCount({ ru: { a: "один", b: "два" }, uk: {} }, "ru", { a: "один", b: "три" })).toBe(1);
  });

  it("finds literals past comments and template strings", () => {
    expect(stringLiterals('// "no"\n/* "no" */ `no ${1}` "yes" \'too\'').map((l) => l.value)).toEqual(["yes", "too"]);
  });
});
