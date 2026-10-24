import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, PUBLIC_LOCALES, countOf, translated, tr } from "./locale";
import { LEGAL_NOTICE, asksForEstonian, langParam, localeHref, publicLangParam, signInHref } from "./publicLocale";
import { ENTRY_COPY } from "./entryLocales";
import { AREAS } from "./i18n";
import { LEGAL } from "./i18n/areas/legal";
import { LANDING, LANDING_BORROWS } from "./i18n/areas/landing";
import { ENGLISH_ON_ESTONIAN_LANDING } from "./i18n/areas/et/landing";
import { keyOf } from "./i18n/table";
import { PUBLIC_CARDS } from "./publicCards";
import { ASSUMPTIONS, DEFAULT_SHAPE, SCALE_LADDER, SERVICES, TUTOR_MODELS, billFor } from "@/lib/funding/model";
import { MEASURED, SPEECH_MARKET } from "@/lib/funding/facts";
import { CONTINUITY, STAGES } from "@/lib/funding/sustainability";
import { SOURCE_CREDITS } from "@/lib/legal/credits";
import { GUIDE, MATERIALS, SOURCES } from "@/lib/exam/official";
import { UNIT_HOMEWORK_FROM } from "@/lib/copy/homework";

/**
 * THE PUBLIC PAGES IN ESTONIAN, AND ONLY THE PUBLIC PAGES (D16 in
 * docs/44-sixth-batch.md).
 *
 * `publicPages.test.ts` holds Russian and Ukrainian to every line these pages
 * hand the translator; this holds Estonian to the same, for the pages a
 * reviewer reads, read off the source in the same way, so a sentence added to
 * one of them in English fails until it has its Estonian. And the other half
 * of D16: Estonian is a language of these pages and of nothing else, so
 * `LOCALES`, which decides what a learner may choose and what every signed-in
 * screen and letter is drawn in, never names it.
 *
 * The Estonian is drafted and waits for the native speaker's reading
 * (docs/34-interface-languages.md). What this asks is that it is there and is
 * clean, never that it is right, which only that reading can say.
 */
const ROOT = process.cwd();
const WELCOME = "app/(chromeless)/welcome";

/** The pages in Estonian, in the two sets the brief draws (docs/44-sixth-batch.md, S-3). */
const FIRST = [
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/trust/page.tsx",
  "app/accessibility/page.tsx",
  "app/funding/page.tsx",
  "app/funding/CostExplorer.tsx",
  "app/partners/page.tsx",
  "app/impact/page.tsx",
  "app/curriculum/page.tsx",
  "components/ImpactFigures.tsx",
  "components/Legal.tsx",
  "components/PublicLanguage.tsx",
  "components/LandingAnu.tsx",
  ...readdirSync(join(ROOT, WELCOME)).filter((f) => f.endsWith(".tsx")).map((f) => `${WELCOME}/${f}`),
];
const SECOND = [
  "app/teachers/page.tsx",
  "app/state-exam/page.tsx",
  "app/how-we-know/page.tsx",
  "app/pilots/page.tsx",
  "app/help/page.tsx",
];
const FILES = [...FIRST, ...SECOND];

/** The paths whose share card is drawn in Estonian. */
const CARDED = ["/trust", "/funding", "/privacy", "/accessibility", "/terms", "/impact", "/curriculum", "/partners", "/teachers", "/state-exam", "/how-we-know", "/pilots", "/help"] as const;

/** Every literal a file hands the translator, with its context where it has one. */
function literals(file: string): { english: string; context?: string }[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const out: { english: string; context?: string }[] = [];
  const str = String.raw`"((?:[^"\\\n]|\\.)*)"`;
  const patterns = [
    new RegExp(String.raw`\bt\(\s*${str}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
    new RegExp(String.raw`\btr\(\s*\w+\s*,\s*${str}(?:\s*,\s*"(\w+)")?\s*\)`, "g"),
    new RegExp(String.raw`\btemplate=${str}`, "g"),
    // /pilots names each link's text through its own two helpers.
    new RegExp(String.raw`\b(?:page|doc)\(\s*"[^"]*"\s*,\s*${str}\s*\)`, "g"),
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) out.push({ english: JSON.parse(`"${m[1]}"`) as string, context: m[2] });
  }
  return out;
}

function listed(as: { values: Readonly<Record<string, unknown>> }): string[] {
  return Object.values(as.values).flatMap((v) => (Array.isArray(v) ? (v as string[]) : []));
}

function untranslated(lines: readonly { english: string; context?: string }[]): string[] {
  return [...new Set(lines
    .filter(({ english, context }) => (context
      ? tr("et", english, context) === english && !translated("et", english)
      : !translated("et", english)))
    .map(({ english, context }) => (context ? `${english}@${context}` : english)))];
}

/** Every Estonian line, from every area that holds one. */
const ESTONIAN = Object.assign({}, ...AREAS.map(([, area]) => area.et ?? {})) as Record<string, string>;

describe("Estonian is a language of the public pages and of nothing else", () => {
  it("is in the public pages' list and never in the interface's", () => {
    expect(PUBLIC_LOCALES).toContain("et");
    expect(LOCALES as readonly string[]).not.toContain("et");
    expect(langParam("et")).toBeNull();
    expect(publicLangParam("et")).toBe("et");
    expect(publicLangParam("ru")).toBe("ru");
  });

  it("reads a browser as Estonian only where Estonian comes before the other three", () => {
    expect(asksForEstonian("et-EE,et;q=0.9,en;q=0.8")).toBe(true);
    expect(asksForEstonian("et")).toBe(true);
    expect(asksForEstonian("fi, et;q=0.9, en;q=0.8")).toBe(true);
    expect(asksForEstonian("en-US,en;q=0.9,et;q=0.8")).toBe(false);
    expect(asksForEstonian("ru,et;q=0.9")).toBe(false);
    expect(asksForEstonian("en;q=0.5, et;q=0.6")).toBe(true);
    expect(asksForEstonian("et;q=0")).toBe(false);
    expect(asksForEstonian(null)).toBe(false);
    expect(asksForEstonian("")).toBe(false);
  });

  it("keeps a link in Estonian, and starts the app without carrying Estonian into it", () => {
    expect(localeHref("/privacy", "et")).toBe("/privacy?lang=et");
    expect(localeHref("/welcome", "et")).toBe("/welcome/et");
    expect(signInHref("et")).toBe("/sign-in");
    expect(signInHref("ru")).toBe("/sign-in?lang=ru");
  });

  it("says on a legal page, in Estonian, that the English prevails, and that the page awaits a native reading", () => {
    expect(LEGAL_NOTICE.et).toMatch(/ingliskeelne tekst/);
    expect(LEGAL_NOTICE.et).not.toMatch(/[–—]/);
    expect(ENTRY_COPY.et.reviewed).toBe(false);
    expect(ENTRY_COPY.et.notice.length).toBeGreaterThan(20);
  });

  it("counts in Estonian's two forms", () => {
    expect(countOf("et", 1, "word")).toBe("1 sõna");
    expect(countOf("et", 5, "learner")).toBe("5 õppijat");
    expect(countOf("et", 1, "learner")).toBe("1 õppija");
  });
});

describe("the public pages in Estonian", () => {
  it("finds the lines it is asking about", () => {
    expect(FILES.flatMap(literals).length).toBeGreaterThan(300);
  });

  it("translates every line the public pages hand the translator", () => {
    expect(untranslated(FILES.flatMap(literals)), "untranslated in et").toEqual([]);
  });

  it("translates the whole of the policy pages and the landing page", () => {
    const byDesign = new Set(ENGLISH_ON_ESTONIAN_LANDING.map(keyOf));
    const missing = [...Object.keys(LEGAL.ru), ...Object.keys(LANDING.ru), ...LANDING_BORROWS]
      .filter((english) => !byDesign.has(keyOf(english)))
      .filter((english) => !(english in (LEGAL.et ?? {})) && !(english in (LANDING.et ?? {})) && !translated("et", english));
    expect(missing).toEqual([]);
  });

  it("translates the funding page's data, the landing's credits and each page's share card", () => {
    const lines = [
      ...SERVICES.flatMap((s) => [s.name, s.who, s.does, s.whenItIsGone]),
      ...STAGES.flatMap((s) => [s.name, s.why]),
      ...CONTINUITY.map((c) => c.claim),
      SPEECH_MARKET.equivalentOf,
      ...MEASURED.flatMap((m) => [m.what, m.value, m.how]),
      ...ASSUMPTIONS.flatMap((a) => [a.what, a.why]),
      ...(["paid", "off"] as const).flatMap((tutor) => TUTOR_MODELS.flatMap((model) => SCALE_LADDER.flatMap((learners) =>
        billFor({ ...DEFAULT_SHAPE, learners, tutor, tutorModel: model.id }).lines.flatMap(({ cost }) => [
          ...("whyAs" in cost && cost.whyAs ? [cost.whyAs.template, ...listed(cost.whyAs)] : "why" in cost && cost.why ? [cost.why] : []),
          ...("givesAs" in cost && cost.givesAs ? [cost.givesAs.template, ...listed(cost.givesAs)] : "gives" in cost && cost.gives ? [cost.gives] : []),
          ...("licence" in cost && cost.licence ? [cost.licence] : []),
          ...("meters" in cost && cost.meters ? cost.meters.map((m) => m.label) : []),
        ])))),
      ...SOURCE_CREDITS.flatMap((c) => [c.gives, ...(c.by && c.by !== "Filosoft" ? [c.by] : [])]),
      ...CARDED.map((path) => PUBLIC_CARDS[path]),
      // /state-exam's facts, the labels of the pages they came from, and its practice materials.
      ...GUIDE.flatMap((section) => [section.title, ...section.facts.map((f) => f.text)]),
      ...Object.values(SOURCES).map((source) => source.label),
      ...MATERIALS.map((material) => material.label),
      "Writing", "Listening", "Reading", "Speaking",
      UNIT_HOMEWORK_FROM,
      // Drawn on the Estonian /teachers alone, through tr("et", ...).
      "The class below is drawn as the app draws it, and the app is in English, Russian or Ukrainian.",
    ].map((english) => ({ english }));
    expect(untranslated(lines), "untranslated in et").toEqual([]);
  });

  it("counts every unit the funding page's assumptions are measured in", () => {
    const missing = ASSUMPTIONS.filter((a) => countOf("et", 5, a.unit) === countOf("en", 5, a.unit)).map((a) => a.unit);
    expect(missing).toEqual([]);
  });

  it("holds every Estonian line to the rules every line on screen keeps", () => {
    const lines = Object.entries(ESTONIAN);
    expect(lines.length).toBeGreaterThan(300);
    for (const [english, line] of lines) {
      expect(line.trim(), english).not.toBe("");
      // No dash used as punctuation, in any language (docs/18-voice.md).
      expect(line, english).not.toMatch(/[–—]/);
      // No middot on screen.
      expect(line, english).not.toMatch(/·/);
      // Nothing of another script, which would be a Russian line filed under Estonian.
      expect(line, english).not.toMatch(/[Ѐ-ӿ]/);
      // Every `{slot}` the English carries, and none it does not, except an
      // authority's own Estonian name (`{local}`, `{a11yLocal}`), which the
      // English adds in brackets and an Estonian sentence that already names it
      // in Estonian leaves out.
      const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
      const wanted = slots(english.replace(/@\w+$/, "")).filter((slot) => !/^(local|\w+Local)$/.test(slot) || slots(line).includes(slot));
      expect(slots(line), english).toEqual(wanted);
      // Bold and code markers in pairs, as `rich` reads them.
      expect((line.match(/\*\*/g) ?? []).length % 2, english).toBe(0);
    }
  });
});
