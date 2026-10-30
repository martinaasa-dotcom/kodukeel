import { describe, expect, it } from "vitest";
import { shippedDictionary } from "@/scripts/lib/dictionary";
import { B1_LESSONS } from "./b1";

/**
 * WHAT A B1 REWORK ACCEPTS, AGAINST THE ESTONIAN IT IS MARKING.
 *
 * A rework is marked against its `to` line and its `also` list, and anything
 * else is "Not quite". So a right answer missing from the list is a wrong
 * verdict on correct Estonian, which is the one fault the lessons promise not
 * to make. These are the rules a list can be held to without a parser.
 */

/** The short illative a word's entry holds, and the long one off its genitive stem. */
function illatives(): { long: Map<string, Set<string>>; alsoAnother: Set<string> } {
  const long = new Map<string, Set<string>>();
  const alsoAnother = new Set<string>();
  for (const e of shippedDictionary()) {
    const gen = e.parts.GEN_SG ?? e.extraForms.find((f) => f.code === "SgG")?.value;
    if (!gen) continue;
    for (const [k, v] of Object.entries(e.parts)) if (k !== "ILL_SG_SHORT" && v) alsoAnother.add(v.toLocaleLowerCase("et"));
    for (const f of e.extraForms) if (f.code !== "SgAdt") alsoAnother.add(f.value.toLocaleLowerCase("et"));
    const shorts = [e.parts.ILL_SG_SHORT, ...e.extraForms.filter((f) => f.code === "SgAdt").map((f) => f.value)].filter(Boolean) as string[];
    for (const s of shorts) {
      const l = `${gen}sse`;
      if (s === l) continue;
      const key = s.toLocaleLowerCase("et");
      if (!long.has(key)) long.set(key, new Set());
      long.get(key)!.add(l);
    }
  }
  return { long, alsoAnother };
}

/**
 * Short forms that are adverbs in the phrase, where no long form is Estonian:
 * {palusin appi} is asking for help, and {unustasin koju} is leaving a thing at
 * home. Each is a decision rather than a gap, so each carries its reason.
 */
const NO_LONG_FORM: Readonly<Record<string, string>> = {
  appi: "{appi paluma}: the adverb, not a case of {abi}",
  koju: "{koju}: the adverb home, as with {unustama} and {minema}",
};

/**
 * A short form also spelled as another case of its word is read as an
 * illative only where the line shows it: an agreeing modifier in {-sse} in
 * front of it, or a phrase listed here after a person read it.
 */
const READ_AS_ILLATIVE = ["metsa sõita"];

describe("the B1 reworks accept every honest answer they can be held to", () => {
  it("take the long illative wherever they take the short one", () => {
    const { long, alsoAnother } = illatives();
    const missing: string[] = [];
    let seen = 0;
    for (const lesson of B1_LESSONS) {
      for (const r of lesson.reworks ?? []) {
        const accepts = [r.to.et, ...(r.also ?? [])];
        const held = new Set(accepts);
        for (const line of accepts) {
          const words = line.split(/[^\p{L}]+/u);
          for (const [i, word] of words.entries()) {
            const key = word.toLocaleLowerCase("et");
            const longs = long.get(key);
            if (!longs || NO_LONG_FORM[key]) continue;
            const agreed = i > 0 && /sse$/u.test(words[i - 1]!);
            const listed = READ_AS_ILLATIVE.some((p) => line.toLocaleLowerCase("et").includes(p) && p.split(" ").includes(key));
            if (alsoAnother.has(key) && !agreed && !listed) continue;
            seen += 1;
            for (const lg of longs) {
              const spelled = word[0] === word[0]!.toLocaleUpperCase("et") ? lg[0]!.toLocaleUpperCase("et") + lg.slice(1) : lg;
              const other = line.replace(new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, "u"), spelled);
              if (!held.has(other)) missing.push(`${lesson.id}: "${line}" takes "${other}" too`);
            }
          }
        }
      }
    }
    expect(seen, "short illatives found in the reworks").toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  it("list no adverb exemption that no rework uses", () => {
    const used = new Set(B1_LESSONS.flatMap((l) => (l.reworks ?? []).flatMap((r) => [r.to.et, ...(r.also ?? [])].flatMap((s) => s.toLocaleLowerCase("et").split(/[^\p{L}]+/u)))));
    for (const word of Object.keys(NO_LONG_FORM)) expect(used.has(word), word).toBe(true);
    for (const phrase of READ_AS_ILLATIVE) {
      expect(B1_LESSONS.some((l) => (l.reworks ?? []).some((r) => [r.to.et, ...(r.also ?? [])].some((s) => s.toLocaleLowerCase("et").includes(phrase)))), phrase).toBe(true);
    }
  });
});
