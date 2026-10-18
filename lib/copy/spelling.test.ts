import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { americanize, britishSpellings } from "./spelling";
import { HARVESTED } from "../../prisma/data/harvested";

describe("americanize", () => {
  it("spells a word the American way and keeps its case", () => {
    expect(americanize("4. Practise")).toBe("4. Practice");
    expect(americanize("the colour of my neighbour's car")).toBe("the color of my neighbor's car");
    expect(americanize("CENTRE")).toBe("CENTER");
    expect(americanize("Words you have recognised, organised and memorised")).toBe(
      "Words you have recognized, organized and memorized",
    );
    expect(americanize("a cancelled programme in a grey theatre")).toBe("a canceled program in a gray theater");
    expect(americanize("unfavourable, watercolours, neighbourhood")).toBe("unfavorable, watercolors, neighborhood");
  });

  it("leaves code, and words that are American already, alone", () => {
    for (const same of [
      "programmeId",
      "DEFAULT_PROGRAMME",
      "typedNeighbour",
      "aria-labelledby",
      "exercise, advertise, surprise, compromise, supervise, revise",
      "analysis, emphasis, synthesis, analyses",
      "glamour, dialogue, towards",
      "constructor",
    ]) {
      expect(americanize(same), same).toBe(same);
    }
  });

  /*
    A gloss that named both spellings would otherwise say one twice. Only a
    pair the table makes the same is joined, which is why a path repeating a
    name is left as it was.
  */
  it("names one word where a gloss named both spellings", () => {
    expect(americanize("colour/color")).toBe("color");
    expect(americanize("watercolor / watercolour")).toBe("watercolor");
    expect(americanize("aeroplane, airplane")).toBe("airplane");
    expect(americanize("city centre, city center, downtown")).toBe("city center, downtown");
    expect(americanize("service; favour , favor")).toBe("service; favor");
    expect(americanize("schibsted/schibsted-grotesk")).toBe("schibsted/schibsted-grotesk");
    expect(americanize("very, very good colour")).toBe("very, very good color");
  });

  it("reports what it would change", () => {
    expect(britishSpellings("A grey programme, programmeId and colour")).toEqual(["grey", "programme", "colour"]);
    expect(britishSpellings("A gray program")).toEqual([]);
  });
});

/*
  NO ESTONIAN WORD IS SPELLED LIKE AN ENTRY IN THE TABLE, BAR ONE.

  `americanize` runs over parsed glosses and model translations, and a gloss can
  quote an Estonian word. Every lemma, principal part, retrieved form and
  attested sentence the shipped dictionary holds is put through it, and nothing
  may come back changed but the homographs named above. A table entry that
  matched Estonian would be this app editing a lexicographer's spelling (ADR-005).
*/
/**
 * Estonian spelled like a British word, and why the table keeps the word anyway.
 *
 * `programme` is the partitive plural of `programm`, and it is also the British
 * spelling this app had more of than any other. The table is only ever run over
 * English (a gloss, a model's translation), never over a form or a sentence, so
 * keeping it costs nothing a learner meets. What this list is for is the next
 * entry: one that collides with an Estonian word has to be argued for here.
 */
const HOMOGRAPHS = new Set(["programme"]);

describe("the table and Estonian", () => {
  it("changes no Estonian the dictionary ships", () => {
    const expanded = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as {
      lemma: string;
      forms: { value: string }[];
      examples: { et: string }[];
    }[];
    const estonian = [
      ...expanded.flatMap((e) => [e.lemma, ...e.forms.map((f) => f.value), ...e.examples.map((x) => x.et)]),
      ...HARVESTED.flatMap((w) => [
        w.lemma,
        ...Object.values(w.parts),
        ...w.extraForms.map((f) => f.value),
        ...w.usages,
        ...(w.note ? [w.note] : []),
      ]),
    ];
    expect(estonian.length).toBeGreaterThan(50_000);
    const changed = estonian.filter((text) => americanize(text) !== text);
    expect(changed.filter((text) => !HOMOGRAPHS.has(text))).toEqual([]);
    // A homograph that stops being one is no longer an exception.
    expect([...HOMOGRAPHS].filter((word) => !changed.includes(word))).toEqual([]);
  });
});

/*
  WHAT A READER SEES IS SPELLED THE AMERICAN WAY.

  Every string and every run of JSX text in the app, its seed data and the
  pages written for a reader, read as `americanize` reads them. Identifiers are
  not swept, since `programmeId` is a database column and a rename is a
  migration rather than a spelling. Comments are not swept either, for the
  reason the voice sweep gives: they are for whoever maintains the code.

  STORED KEYS ARE NOT COPY. Each of these is a whole string the app keeps or
  compares rather than prints, so changing it would orphan a row, a setting or a
  saved day. Each is checked for still being somewhere, so the list cannot
  become a parking space for a word somebody did not want to fix.
*/
const STORED_KEYS: Record<string, string> = {
  programme: "SETTING_KEYS.programme, a key every learner's settings row carries",
  practise: "a lesson step id, a scene beat id and a scene tag, kept in progress rows",
  "answer:practise": "the pseudo-beat a scene's banked answer is filed under",
  "lastevanemad:practise": "a scene tag key",
  "riidepood:colour": "a scene tag key",
  "scene-practise": "the id a heading is labeled by",
  colour: "a scene card slot and beat id, and a family of questions in Kakskümmend küsimust",
  "colour:": "the start of a Kakskümmend küsimust question id",
  colourful: "a Kakskümmend küsimust question id",
  unrecognised: "a turn reading, compared across the scene machine and its stored runs",
  cancelled: "the outcome a share sheet reports",
  recognise: "a readiness rung id",
  "unpractised-": "the start of a readiness gap id",
  nominalisation: "a grammar topic id, which is part of a URL",
  "strong-flavours": "a scene id",
  "a1-08-neighbour": "a lesson id, which is part of every day id built on it",
  "a1-10a-neighbours": "a lesson id",
  "a1-37-colours": "a lesson id",
  neighbours: "a cache key",
  "driving-licence": "an entry id in the literal meanings",
  licence: "a funding service id",
  licences: "an evidence claim id",
  "check:licences": "an npm script name",
  "sayings-catalogue": "a setting key",
};

/** Placeholders, code spans, URLs, paths, an `@context` and a `topic:id|` are not words a reader reads. */
function readable(text: string): string {
  return text
    .replace(/^\w+:[\w-]+\|/, " ")
    .replace(/@\w+$/, "")
    .replace(/\{[^{}\n]*\}|`[^`\n]*`|https?:\/\/\S+|[\w.-]*\/[\w./-]*|\b[\w-]+\.(?:tsx?|mjs|json|md|css|py|ya?ml)\b/g, " ");
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry) && !/\.i?test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...markdownFiles(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

/** This table names every British spelling it converts, and `english.ts` reads a learner's own. */
const NAMES_THEM = new Set(["lib/copy/spelling.ts", "lib/dict/english.ts"]);

function stringsIn(file: string): string[] {
  const source = readFileSync(file, "utf8");
  if (britishSpellings(source).length === 0) return [];
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      node.kind === ts.SyntaxKind.JsxText
    ) {
      const parent = node.parent;
      if (parent && (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent))) return;
      out.push(ts.isJsxText(node) ? node.getText(tree) : (node as ts.LiteralLikeNode).text);
      return;
    }
    node.forEachChild(visit);
  };
  visit(tree);
  return out;
}

const SOURCES = ["app", "components", "lib", "prisma"].flatMap(sourceFiles).filter((f) => !NAMES_THEM.has(f));

describe("what a reader sees is spelled the American way", () => {
  it("in every string and every run of JSX text", () => {
    const bad = SOURCES.flatMap((file) =>
      stringsIn(file)
        .filter((text) => !Object.hasOwn(STORED_KEYS, text))
        .flatMap((text) => {
          const found = britishSpellings(readable(text));
          return found.length ? [`${file}: ${found.join(", ")} in ${JSON.stringify(text).slice(0, 100)}`] : [];
        }),
    );
    expect(bad).toEqual([]);
  });

  it("in the README, the agent notes and the docs", () => {
    const pages = ["README.md", "CLAUDE.md", "AGENTS.md", "SECURITY.md", "CONTRIBUTING.md", ...markdownFiles("docs")];
    const bad = pages.flatMap((file) => {
      let fenced = false;
      return readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => {
          if (/^\s*(```|~~~)/.test(line)) {
            fenced = !fenced;
            return [];
          }
          if (fenced) return [];
          const found = britishSpellings(readable(line));
          return found.length ? [`${file}:${i + 1}: ${found.join(", ")}`] : [];
        });
    });
    expect(bad).toEqual([]);
  });

  it("in the dictionary's English and the sentences' English", () => {
    const expanded = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as {
      lemma: string;
      translation: string;
      notes: string | null;
    }[];
    const english = JSON.parse(readFileSync("prisma/data/example-english.json", "utf8")) as Record<string, string>;
    const bad = [
      ...expanded.flatMap((e) => [e.translation, e.notes ?? ""].filter((t) => britishSpellings(t).length).map((t) => `${e.lemma}: ${t}`)),
      ...Object.values(english).filter((t) => britishSpellings(t).length),
    ];
    expect(bad).toEqual([]);
  });

  it("keeps no stored key that is no longer stored", () => {
    const everywhere = new Set(SOURCES.concat([...NAMES_THEM]).flatMap(stringsIn));
    expect(Object.keys(STORED_KEYS).filter((key) => !everywhere.has(key))).toEqual([]);
  });
});
