import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * /pilots says what is not ready, and may not stop saying it.
 *
 * The page exists for somebody writing a procurement note, and the section
 * that says there is no SOC 2 report, no external penetration test and no
 * contractual uptime is the one that makes the rest worth believing. A page
 * edited for tone could soften it by accident; this fails first.
 */
const page = readFileSync("app/pilots/page.tsx", "utf8").replace(/\s+/g, " ");

describe("the pilots page", () => {
  it("keeps its section on what is not ready", () => {
    // The title is drawn through the page's language (D16), so it is read
    // either as a literal or as the English handed to `t`.
    expect(page).toMatch(/title=(?:"|\{t\(")What this is not ready for"/);
    expect(page).toContain("data-not-ready");
  });

  it("says there is no SOC 2 report, no external penetration test and no contractual uptime", () => {
    const section = page.slice(page.indexOf("What this is not ready for"));
    expect(section).toMatch(/There is no SOC 2 report and no ISO 27001 certificate\./);
    expect(section).toMatch(/No external penetration test has been carried out\./);
    expect(section).toMatch(/There is no contractual uptime commitment\./);
  });

  it("names the operator's address only where one is set", () => {
    expect(page).toMatch(/const contact = resolveOperator\(\)\.email;/);
    expect(page).toMatch(/\{contact \? \(/);
    expect(page).not.toMatch(/@upthink\.ee|privacy@/);
  });

  it("promises an address at the bottom only where there is one", () => {
    // The opening used to say the address at the bottom reaches a person on a
    // copy that names none, where the bottom says there is nobody to write to.
    const promise = "the address at the bottom reaches a person";
    const at = page.indexOf(promise);
    expect(at).toBeGreaterThan(-1);
    expect(page.slice(Math.max(0, at - 80), at)).toMatch(/\{contact && /);
  });
});
