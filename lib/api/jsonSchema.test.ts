import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error A plain .mjs helper shared with the suite and the mock, with no types of its own.
import { check, routeFor } from "../../scripts/lib/jsonSchema.mjs";
import { SHIPPED_ROUTES, routeKey } from "./contract";
import { DRAFT_ROUTES } from "./draft";
import { publishedSchema } from "./schema";

/*
  The suite and the mock check answers against the published file with a small
  reader of their own, since a plain script cannot import the zod schemas. This
  holds that reader to zod: every example zod accepts, the reader accepts, and
  a planted fault in each one is refused by both.
*/
const published = publishedSchema();

describe("the JSON Schema reader the suite and the mock use", () => {
  for (const route of [...SHIPPED_ROUTES, ...DRAFT_ROUTES]) {
    const zod = route.response;
    if (!zod) continue;
    it(`agrees with zod about ${routeKey(route)}`, () => {
      const example: unknown = JSON.parse(readFileSync(join("lib/api/examples", route.example), "utf8"));
      const schema = published.routes[routeKey(route)]!.response;
      expect(check(example, schema)).toEqual([]);
      // A required field taken away is refused by both.
      if (example && typeof example === "object" && !Array.isArray(example)) {
        const first = (schema as { required?: string[] }).required?.[0];
        if (first) {
          const broken = { ...(example as Record<string, unknown>) };
          delete broken[first];
          expect(zod.safeParse(broken).success).toBe(false);
          expect(check(broken, schema).length).toBeGreaterThan(0);
        }
      }
    });
  }

  it("finds a route by its path with the segment filled in", () => {
    expect(routeFor(published.routes, "GET", "/api/v1/meta")?.key).toBe("GET /api/v1/meta");
    expect(routeFor(published.routes, "GET", "/api/v1/lessons/a1-01-hello")?.key).toBe("GET /api/v1/lessons/{id}");
    expect(routeFor(published.routes, "GET", "/api/v1/nothing-here")).toBeNull();
  });
});
