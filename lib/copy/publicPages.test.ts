import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countOf, translated, tr } from "./locale";
import { LEGAL_NOTICE, langParam, localeHref } from "./publicLocale";
import { ENTRY_COPY } from "./entryLocales";
import { GUIDE, MATERIALS, SOURCES } from "@/lib/exam/official";
import { ASSUMPTIONS, DEFAULT_SHAPE, SCALE_LADDER, SERVICES, TUTOR_MODELS, billFor } from "@/lib/funding/model";
import { MEASURED, SPEECH_MARKET } from "@/lib/funding/facts";
import { CONTINUITY, STAGES } from "@/lib/funding/sustainability";
import { SOURCE_CREDITS } from "@/lib/legal/credits";

/**
 * THE PUBLIC PAGES ARE TRANSLATED WHOLE, AND THIS IS WHAT SAYS SO.
 *
 * The landing page, /privacy, /terms, /trust, /accessibility, /offline,
 * /state-exam and /funding pass every line they print through `t` or `tr`,
 * and a line a table does not hold prints its English. That fallback is right
 * for the app and wrong for a privacy notice, where a paragraph left in
 * English in the middle of a Russian page reads as the one clause somebody did
 * not want translated. So every literal these files hand the translator is
 * asked of both tables, read off the source rather than listed here, so a
 * sentence added to a page in English fails until it has its Russian and its
 * Ukrainian.
 *
 * What is not asked: a product name. The measured table and the model's own
 * working on each line of the cost panel are asked, at every size the ladder
 * draws, because a paragraph left in English on a translated page reads as the
 * part nobody thought the reader needed.
 */
const ROOT = process.cwd();
const WELCOME = "app/(chromeless)/welcome";
const FILES = [
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/trust/page.tsx",
  "app/accessibility/page.tsx",
  "app/offline/page.tsx",
  "app/state-exam/page.tsx",
  "app/funding/page.tsx",
  "app/funding/CostExplorer.tsx",
  "components/Legal.tsx",
  "components/PublicLanguage.tsx",
  "components/LandingAnu.tsx",
  ...readdirSync(join(ROOT, WELCOME)).filter((f) => f.endsWith(".tsx")).map((f) => `${WELCOME}/${f}`),
];

/** Every literal a file hands the translator, with its context where it has one. */
function literals(file: string): { english: string; context?: string }[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const out: { english: string; context?: string }[] = [];
  const str = String.raw`"((?:[^"\\\n]|\\.)*)"`;
  const patterns = [
    new RegExp(String.raw`\bt\(\s*${str}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
    new RegExp(String.raw`\btr\(\s*\w+\s*,\s*${str}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
    new RegExp(String.raw`\btemplate=${str}`, "g"),
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) {
      out.push({ english: JSON.parse(`"${m[1]}"`) as string, context: m[2] });
    }
  }
  return out;
}

/** The labels a phrase joins into a list, each of which the page translates. */
function listed(as: { values: Readonly<Record<string, unknown>> }): string[] {
  return Object.values(as.values).flatMap((v) => (Array.isArray(v) ? (v as string[]) : []));
}

function untranslated(locale: "ru" | "uk", lines: readonly { english: string; context?: string }[]): string[] {
  return lines
    .filter(({ english, context }) => {
      if (context) return tr(locale, english, context) === english && !translated(locale, english);
      return !translated(locale, english);
    })
    .map(({ english, context }) => (context ? `${english}@${context}` : english));
}

describe("the public pages in Russian and Ukrainian", () => {
  it("reads a language off the address, and nothing else", () => {
    expect(langParam("ru")).toBe("ru");
    expect(langParam(["uk", "ru"])).toBe("uk");
    expect(langParam("de")).toBeNull();
    expect(langParam(undefined)).toBeNull();
  });

  it("keeps a link in the language the reader chose", () => {
    expect(localeHref("/privacy", "en")).toBe("/privacy");
    expect(localeHref("/privacy", "en", true)).toBe("/privacy?lang=en");
    expect(localeHref("/privacy", "ru")).toBe("/privacy?lang=ru");
    expect(localeHref("/funding#plan", "uk")).toBe("/funding?lang=uk#plan");
    expect(localeHref("/welcome", "ru")).toBe("/welcome/ru");
    expect(localeHref("/welcome", "en", true)).toBe("/welcome");
  });

  it("finds the lines it is asking about", () => {
    const all = FILES.flatMap(literals);
    expect(all.length).toBeGreaterThan(400);
  });

  for (const locale of ["ru", "uk"] as const) {
    it(`${locale}: translates every line the public pages hand the translator`, () => {
      const missing = untranslated(locale, FILES.flatMap(literals));
      expect(missing, `untranslated in ${locale}`).toEqual([]);
    });

    it(`${locale}: translates the state examination's facts, every service on the funding page and the landing's credits`, () => {
      const lines = [
        ...GUIDE.flatMap((s) => [s.title, ...s.facts.map((f) => f.text)]),
        ...Object.values(SOURCES).map((s) => s.label),
        ...MATERIALS.map((m) => m.label),
        ...SERVICES.flatMap((s) => [s.name, s.who, s.does, s.whenItIsGone]),
        ...STAGES.flatMap((s) => [s.name, s.why]),
        ...CONTINUITY.map((c) => c.claim),
        SPEECH_MARKET.equivalentOf,
        ...MEASURED.flatMap((m) => [m.what, m.value, m.how]),
        ...ASSUMPTIONS.flatMap((a) => [a.what, a.why]),
        // What each line of the cost panel says about itself, at every size and
        // for every way of paying for the tutor the panel offers.
        ...(["paid", "off"] as const).flatMap((tutor) => TUTOR_MODELS.flatMap((model) => SCALE_LADDER.flatMap((learners) =>
          billFor({ ...DEFAULT_SHAPE, learners, tutor, tutorModel: model.id }).lines.flatMap(({ cost }) => [
            // A line built with figures is asked for its template, which is
            // what the page translates; a fixed line is asked as it reads.
            ...("whyAs" in cost && cost.whyAs ? [cost.whyAs.template, ...listed(cost.whyAs)] : "why" in cost && cost.why ? [cost.why] : []),
            ...("givesAs" in cost && cost.givesAs ? [cost.givesAs.template, ...listed(cost.givesAs)] : "gives" in cost && cost.gives ? [cost.gives] : []),
            ...("licence" in cost && cost.licence ? [cost.licence] : []),
            ...("meters" in cost && cost.meters ? cost.meters.map((m) => m.label) : []),
          ])))),
        // The landing footer's credits: what each source gives, and who runs it.
        ...SOURCE_CREDITS.flatMap((c) => [c.gives, ...(c.by && c.by !== "Filosoft" ? [c.by] : [])]),
      ].map((english) => ({ english }));
      expect(untranslated(locale, lines), `untranslated in ${locale}`).toEqual([]);
    });

    it(`${locale}: counts every unit the funding page's assumptions are measured in`, () => {
      // Five, because it takes the third form in both languages and the
      // English fallback adds an s, so a missing unit cannot pass by accident.
      const missing = ASSUMPTIONS.filter((a) => !/[а-яёієїґ]/i.test(countOf(locale, 5, a.unit))).map((a) => a.unit);
      expect(missing, `uncounted in ${locale}`).toEqual([]);
    });

    it(`${locale}: says on a legal page that the English prevails, in its own language`, () => {
      expect(LEGAL_NOTICE[locale].length).toBeGreaterThan(60);
      expect(LEGAL_NOTICE[locale]).not.toMatch(/[–—]/);
      expect(ENTRY_COPY[locale].notice.length).toBeGreaterThan(20);
    });
  }
});
