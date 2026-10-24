import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";

import type { Locale } from "@/lib/copy/locale";

import { grownBaseline, type Baseline } from "./baseline";
import { narrowings } from "./compat";
import { INTERFACE_LANGUAGES, SHIPPED_ROUTES, routeKey } from "./contract";
import { DRAFT_ROUTES } from "./draft";
import { publishedSchemaText } from "./schema";

/*
  The contract's own checks, which read files in the repository and touch no
  database or network.

  Three things are held here and each is a different failure. The examples are
  what the mock answers with, so an example its schema refuses is a screen
  built against a shape no route sends. The schema file is what a native
  developer reads, so one this code would not write is a contract nobody
  regenerated. And the baseline is what a client in somebody's pocket was built
  against, so a field the current schema removed or narrowed is a broken app.
*/

const BASELINE_FILE = "lib/api/fixtures/v1-baseline.json";
const ALL = [...SHIPPED_ROUTES, ...DRAFT_ROUTES];

describe("the routes", () => {
  it("are each named once, shipped or drafted", () => {
    const shipped = SHIPPED_ROUTES.map(routeKey);
    expect(new Set(shipped).size).toBe(shipped.length);
    const drafted = DRAFT_ROUTES.map(routeKey);
    expect(new Set(drafted).size).toBe(drafted.length);
    // A route that has shipped is taken out of the draft rather than left in both.
    expect(drafted.filter((key) => shipped.includes(key))).toEqual([]);
  });

  it("name an interface language list equal to the app's", () => {
    expectTypeOf<(typeof INTERFACE_LANGUAGES)[number]>().toEqualTypeOf<Locale>();
  });
});

describe("the examples", () => {
  it("hold one answer for every route, and nothing else", () => {
    const files = readdirSync("lib/api/examples").filter((f) => f.endsWith(".json")).sort();
    const named = [...new Set(ALL.map((r) => r.example))].sort();
    expect(files).toEqual(named);
  });

  for (const route of ALL) {
    it(`${routeKey(route)} matches its schema`, () => {
      const example: unknown = JSON.parse(readFileSync(join("lib/api/examples", route.example), "utf8"));
      if (route.response === null) {
        expect(example).toMatchObject({ contentType: route.contentType });
        return;
      }
      const parsed = route.response.safeParse(example);
      expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
    });
  }
});

describe("the published schema", () => {
  it("is what `npm run api:schema` would write", () => {
    expect(readFileSync("public/api/v1.schema.json", "utf8")).toBe(publishedSchemaText());
  });
});

describe("the baseline", () => {
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Baseline;

  it("holds every route that has shipped, and only those", () => {
    expect(existsSync(BASELINE_FILE)).toBe(true);
    expect(Object.keys(baseline.routes).sort()).toEqual(SHIPPED_ROUTES.map(routeKey).sort());
    // Growing it would add nothing, so nothing shipped is missing from it.
    expect(Object.keys(grownBaseline(baseline).routes).sort()).toEqual(Object.keys(baseline.routes).sort());
  });

  it("finds no route or field the current schema removed or narrowed", () => {
    const current = grownBaseline({ ...baseline, routes: {} });
    const problems: string[] = [];
    for (const [key, entry] of Object.entries(baseline.routes)) {
      const now = current.routes[key];
      if (!now) {
        problems.push(`${key}: removed from v1`);
        continue;
      }
      if (now.contentType !== entry.contentType) problems.push(`${key}: answers ${now.contentType} where it answered ${entry.contentType}`);
      for (const side of ["query", "request"] as const) {
        if (entry[side]) problems.push(...narrowings(entry[side]!, now[side] ?? null, "request", `${key} ${side}`));
      }
      if (entry.response) problems.push(...narrowings(entry.response, now.response ?? null, "response", `${key} response`));
    }
    expect(problems).toEqual([]);
  });
});

describe("narrowings", () => {
  const response = {
    type: "object",
    properties: { a: { type: "string" }, b: { type: "string", enum: ["x", "y"] }, c: { type: "number" } },
    required: ["a", "b"],
  };

  it("lets a response gain a field or a value", () => {
    const after = {
      ...response,
      properties: { ...response.properties, b: { type: "string", enum: ["x", "y", "z"] }, d: { type: "string" } },
      required: ["a", "b", "d"],
    };
    expect(narrowings(response, after, "response")).toEqual([]);
  });

  it("refuses a response that drops a field, stops always sending one, or changes a type", () => {
    const after = { type: "object", properties: { b: { type: "string", enum: ["x"] }, c: { type: "string" } }, required: [] };
    const found = narrowings(response, after, "response");
    expect(found.some((p) => p.includes(".a: removed"))).toBe(true);
    expect(found.some((p) => p.includes(".b: was always sent"))).toBe(true);
    expect(found.some((p) => p.includes("lost the value"))).toBe(true);
    expect(found.some((p) => p.includes(".c: type number is gone"))).toBe(true);
  });

  it("refuses a request that requires more or accepts less", () => {
    const before = { type: "object", properties: { a: { type: "string", maxLength: 40 }, b: { type: "number" } }, required: ["a"] };
    const after = { type: "object", properties: { a: { type: "string", maxLength: 20 }, b: { type: "number" }, n: { type: "string" } }, required: ["a", "b", "n"] };
    const found = narrowings(before, after, "request");
    expect(found.some((p) => p.includes("maxLength tightened"))).toBe(true);
    expect(found.some((p) => p.includes(".b: was optional and is now required"))).toBe(true);
    expect(found.some((p) => p.includes(".n: a new field is required"))).toBe(true);
    expect(narrowings(before, { ...before, properties: { ...before.properties, n: { type: "string" } } }, "request")).toEqual([]);
  });

  it("matches the shapes of a union by fit rather than by position", () => {
    const one = { type: "object", properties: { kind: { const: "a" } }, required: ["kind"] };
    const two = { type: "object", properties: { kind: { const: "b" } }, required: ["kind"] };
    expect(narrowings({ oneOf: [one, two] }, { oneOf: [two, one, { type: "null" }] }, "response")).toEqual([]);
    expect(narrowings({ oneOf: [one, two] }, { oneOf: [one] }, "response")).toHaveLength(1);
  });
});
