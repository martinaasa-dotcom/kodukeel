import { describe, expect, it } from "vitest";

import { GUIDE, MATERIALS, OFFICIAL_HOSTS, READ_ON, SOURCES, writtenSampleFor } from "./official";
import { OFFICIAL_LEVELS, PASS_PCT, RETAKE_WAIT_PCT } from "./spec";

const official = (href: string) => (OFFICIAL_HOSTS as readonly string[]).includes(new URL(href).host);

describe("the guide to the state examination", () => {
  it("cites only the state's own pages, over https", () => {
    for (const source of Object.values(SOURCES)) {
      expect(source.href.startsWith("https://"), source.href).toBe(true);
      expect(official(source.href), source.href).toBe(true);
    }
    for (const material of MATERIALS) {
      expect(material.href.startsWith("https://"), material.href).toBe(true);
      expect(official(material.href), material.href).toBe(true);
    }
  });

  it("gives every fact a source, and says the day it was read", () => {
    expect(READ_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    let facts = 0;
    for (const section of GUIDE) {
      expect(section.facts.length, section.id).toBeGreaterThan(0);
      for (const fact of section.facts) {
        facts += 1;
        expect(SOURCES[fact.source], fact.text).toBeDefined();
        expect(fact.text.trim().length, fact.text).toBeGreaterThan(20);
      }
    }
    expect(facts).toBeGreaterThanOrEqual(20);
  });

  it("reads the pass mark and the retake rule from the paper's own spec rather than typing them", () => {
    const text = GUIDE.flatMap((s) => s.facts.map((f) => f.text)).join("\n");
    expect(text).toContain(`${PASS_PCT} percent`);
    expect(text).toContain(`${RETAKE_WAIT_PCT} percent`);
  });

  it("points at the Board's written samples for every level it examines", () => {
    for (const level of OFFICIAL_LEVELS) expect(writtenSampleFor(level), level).not.toBeNull();
    expect(writtenSampleFor("A1")).toBeNull();
  });

  it("does not print a date of a sitting, which would be wrong within a quarter", () => {
    const text = GUIDE.flatMap((s) => s.facts.map((f) => f.text)).join("\n");
    expect(text).not.toMatch(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/);
    expect(text).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
  });
});
