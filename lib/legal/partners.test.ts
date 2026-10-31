import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoUrl } from "./demo";

/**
 * /partners READS EVERY FIGURE THROUGH THE FUNCTION ITS OWN PAGE USES.
 *
 * The page a reviewer is sent to repeats figures that live on six other pages,
 * and a figure typed in here would be the one that disagrees with its page the
 * day either moves. So this asks what the page calls, not what the numbers
 * are: the numbers change with the deployment, and the calls are what keep
 * them the same as the page they come from (docs/44-sixth-batch.md, S-7).
 */
const source = readFileSync("app/partners/page.tsx", "utf8");
const page = source.replace(/\s+/g, " ");
/** The page with its comments out, so a call is asked of the code rather than of a note about it. */
const code = source.replace(/\/\*[^]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "").replace(/\s+/g, " ");

describe("the partners page", () => {
  it("is built with Legal in the language the request asked for", () => {
    // resolvePublicPage is the public pages' reading, Estonian included (D16).
    expect(code).toMatch(/const \{ locale, explicit \} = await resolvePublic(?:Locale|Page)\(searchParams\)/);
    expect(code).toMatch(/<Legal title=\{t\("For partners and funders"\)\}[^>]*locale=\{locale\} explicit=\{explicit\} path="\/partners"/);
    expect(code).toMatch(/publicCard\("\/partners"\)/);
  });

  it("says what Kodukeel is in the landing page's own sentence", () => {
    expect(code).toMatch(/t\(PITCH\.promise\)/);
    expect(readFileSync("app/(chromeless)/welcome/page.tsx", "utf8")).toMatch(/t\(PITCH\.promise\)/);
  });

  it("links the demo only where the deployment names one", () => {
    expect(code).toMatch(/const demo = demoUrl\(\);/);
    expect(code).toMatch(/\{demo && \(/);
    expect(demoUrl({})).toBeNull();
    expect(demoUrl({ DEMO_URL: "demo.kodukeel.ee" })).toBeNull();
    expect(demoUrl({ DEMO_URL: "javascript:alert(1)" })).toBeNull();
    expect(demoUrl({ DEMO_URL: " https://demo.kodukeel.ee " })).toBe("https://demo.kodukeel.ee/");
  });

  it("reads what this installation has done through /impact's own reading and empty states", () => {
    expect(code).toMatch(/const \[impact, ekilex\] = await Promise\.all\(\[heldImpact\(\), ekilexImpact\(IMPACT_WINDOW_DAYS\)\]\)/);
    expect(code).toMatch(/impactWords\(locale\)/);
    expect(code).toMatch(/!impactListable\(impact\)/);
    expect(code).toMatch(/!impact\.anyActivity/);
    const impactPage = readFileSync("app/impact/page.tsx", "utf8");
    expect(impactPage).toMatch(/impactWords\(locale\)/);
    for (const line of [
      "The figures appear here once enough people use the app to publish them safely.",
      "Nobody has answered a card on this installation yet, so there is nothing to show.",
    ]) {
      expect(page).toContain(line);
      expect(impactPage).toContain(line);
    }
  });

  it("counts the course the way /curriculum and the landing page count it", () => {
    expect(code).toMatch(/courseMadeOf\(SYLLABUS, LESSONS\)/);
    // Every level is lessons since C1 moved (docs/43-lessons.md §16), so no units are counted beside them.
    expect(code).not.toMatch(/made\.units/);
    expect(code).toMatch(/LESSON_PARTS\.length/);
  });

  it("shows the Ekilex credit and counts through the dictionary's and /impact's own code", () => {
    expect(code).toMatch(/t\(EKILEX_CREDIT\)/);
    expect(code).toMatch(/<EkilexSection ekilex=\{ekilex\} locale=\{locale\} \/>/);
    expect(code).toMatch(/docs\/45-ekilex\.md/);
  });

  it("prices it with /funding's own ladder and floor", () => {
    expect(code).toMatch(/retrenchment\(DEFAULT_SHAPE\)\[0\]/);
    expect(code).toMatch(/floorUsd\(DEFAULT_SHAPE\)/);
    expect(readFileSync("app/funding/page.tsx", "utf8")).toMatch(/retrenchment\(DEFAULT_SHAPE\)[^]*floorUsd\(DEFAULT_SHAPE\)/);
  });

  it("names the four checking pages, and the operator from operator.ts", () => {
    for (const to of ["/how-we-know", "/accessibility", "/trust"]) {
      expect(code).toContain(`link("${to}"`);
      expect(code).toContain(`PUBLIC_CARDS["${to}"]`);
    }
    expect(code).toContain('href="/.well-known/security.txt"');
    expect(code).toMatch(/const operator = resolveOperator\(\);/);
    expect(code).toMatch(/data-operator="named"/);
    expect(code).toMatch(/data-operator="unset"/);
  });

  it("types no figure: no dollar amount, count or percentage in its own words", () => {
    const literals = [...code.matchAll(/t\("((?:[^"\\]|\\.)*)"\)/g)].map((m) => m[1]!);
    expect(literals.length).toBeGreaterThan(20);
    for (const line of literals) expect(line, line).not.toMatch(/\$\d|\d+ (?:lessons?|units?|parts?|learners?|requests?)|\d+%/);
  });
});
