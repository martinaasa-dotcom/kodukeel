#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { launchChromium } from "./lib/browser.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { startRound } from "./lib/briefing.mjs";
import { fitsAnyWord, survey, wholeWords } from "./lib/containment.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

/**
 * EVERY SIGNED-IN SCREEN, IN RUSSIAN AND IN UKRAINIAN, MEASURED.
 *
 * The interface is translated (`docs/34-interface-languages.md`) and every
 * other browser suite runs it in English, so two kinds of fault had nothing
 * watching them. A translation is usually longer than the English, so a label
 * that fits as "Start" can run out of its button as «Почати заново», and a
 * word that fits a chip in English can be drawn three letters a line in
 * Russian. And a line nobody has translated yet prints its English, by
 * design, so a screen can be half English to somebody who chose Ukrainian and
 * read as finished to anybody checking it in English.
 *
 * So this sets the learner's language straight in the database, the way the
 * Settings picker stores it, walks every route under `app/(app)/` at 360 and
 * 1280 in the light theme and at 360 in the dark, and asks two things.
 *
 * WHETHER THE TEXT FITS, with the same browser-side questions
 * `scripts/test-containment.mjs` asks, imported from `scripts/lib/containment.mjs`
 * rather than copied: nothing is cut off, nothing bleeds over a border, no
 * ordinary word is broken across lines, no button's label is wider than the
 * button, and a word set large shrinks rather than breaking. Containment's
 * other half, the same text made unbreakable, is not repeated here: it asks a
 * question about lengths that a translation does not change, and it is four
 * minutes CI already spends.
 *
 * AND WHETHER ANY ENGLISH IS LEFT. A run of two or more English words outside
 * Estonian (`[lang="et"]`), outside a run declared English (`[lang="en"]`,
 * which is the English half of the machine-translation notice), outside what is
 * hidden from a reader (`[aria-hidden]`) and outside code and key caps. English
 * is recognised by its function words rather than by being Latin script,
 * because Estonian is Latin script too. What is English by design is
 * subtracted, and only two kinds of thing are: the dictionary's own English
 * (a gloss, a further sense, a recorded sentence's translation, a card's
 * English side), read off the database rather than listed, and what this
 * learner typed (a shelf, a class, a calendar entry, a task, a scan's title,
 * Anu's conversation). Everything else is `ALLOWED` below with its reason,
 * except English the screen itself marks `data-untranslated`, which is a gap
 * somebody has named and is printed by name at the end rather than failed.
 *
 * NOTHING IS SELECTED BY ITS ENGLISH WORDS, since the point is that there are
 * none: a round is started through `data-briefing-start`, and every route is
 * read off the filesystem.
 *
 * Needs the server running and the demo fixture: npm run demo.
 */

const B = baseUrl();

/*
  Floor: arithmetic on the route list, then a margin. Seven checks a pass (cut
  off, bleeds, too wide, broken across lines, button label, display word,
  English left) on the two light passes, six on the dark one, where the English
  is the same English and is not asked twice: twenty a route a language, so 67
  routes in two languages is 2680, plus one check a pass that the shell really
  is in that language, 2686 in CI. Two of the routes need a row that
  `test-containment.mjs` makes earlier in the same shard (a marked paper and a
  scanned page); run alone, this waives their forty checks each by name rather
  than walking a not-found screen. Raise it when a route is added.
*/
const { check, absent, done } = suite("Russian and Ukrainian, on every screen", { floor: 2600 });

const LOCALES = ["ru", "uk"];
/** `LOCALE_ROUTES=/review,/words` walks only those, for working on one screen; the floor then fails, as it should. */
const ONLY = process.env.LOCALE_ROUTES?.split(",").filter(Boolean);
const PASSES = [
  { width: 360, dark: false, english: true },
  { width: 1280, dark: false, english: true },
  { width: 360, dark: true, english: false },
];

/*
  WHAT IS ENGLISH BY DESIGN AND IS NOT IN THE DATABASE. Each entry is a regular
  expression over one English run, lower-cased, and carries its reason. Kept
  short on purpose: an entry here is a screen a Russian reader meets in English,
  and the bar is that there is a reason it should be.
*/
const ALLOWED = [
  {
    match: /^settle in estonia$/,
    why: "the name of the state's welcome program on /situations, which it calls itself in English; the sentence under it is translated",
  },
  {
    match: /^cc by(-sa)?( \d)?/,
    why: "the licence a credit names (CC BY, CC BY-SA), which is the licence's own name rather than a sentence of ours",
  },
];

/** Every `page.tsx` under `app/(app)/`, as the template path that reaches it. */
function routes(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routes(full, `${prefix}/${entry}`));
    else if (entry === "page.tsx") out.push(prefix || "/");
  }
  return out;
}

const prisma = newPrismaClient(requireLocalDatabase("set the learner's interface language"));

/**
 * The owner whose screens are walked. Local mode has one learner, and which id
 * that is is read off the deck the fixture built rather than typed.
 */
const owner = (await prisma.card.findFirst({ select: { ownerId: true }, orderBy: { id: "asc" } }))?.ownerId
  ?? "local-single-user";

/**
 * A value for each dynamic segment, so the walk meets the screen rather than
 * the not-found. Read off the fixture where a row is needed, and fixed where
 * the value is the course's own id.
 */
const firstId = async (model, where = {}) =>
  (await prisma[model].findFirst({ where, select: { id: true }, orderBy: { id: "asc" } }).catch(() => null))?.id;
const FILL = {
  "/class/[classroomId]": await firstId("classroom"),
  "/review/deck/[deckId]": await firstId("deck", { ownerId: owner }),
  "/scan/[scanId]": await firstId("scan", { ownerId: owner }),
  "/exam/result/[id]": await firstId("examAttempt", { ownerId: owner }),
};
const SEGMENT = {
  "[level]": "B1", "[caseKey]": "partitive", "[kind]": "stem", "[unitId]": "kodu",
  "[situationId]": "sook-ja-jook", "[group]": "noun",
};
const ROUTES = [];
const unmade = [];
for (const template of routes(new URL("../app/(app)", import.meta.url).pathname).sort()) {
  if (template in FILL) {
    if (FILL[template]) ROUTES.push(template.replace(/\[[^\]]+\]$/, FILL[template]));
    else unmade.push(template);
    continue;
  }
  const route = template
    .replace("/grammar/topic/[id]", "/grammar/topic/object")
    .replace("/situations/[id]", "/situations/arsti-aeg")
    .replace("/learn/checkpoint/[level]", "/learn/checkpoint/A1")
    .replace(/\[[^\]]+\]/g, (m) => SEGMENT[m] ?? "x");
  ROUTES.push(route);
}

/**
 * The dictionary's own English and what this learner typed, lower-cased with
 * the punctuation folded to spaces, padded so a run is matched as whole words.
 */
const norm = (s) => ` ${String(s).toLowerCase().replace(/[^\p{L}\p{N}']+/gu, " ").trim()} `;
async function englishByDesign() {
  const pieces = [];
  const lexemes = await prisma.lexeme.findMany({ select: { translation: true, notes: true, examples: true } });
  for (const l of lexemes) {
    pieces.push(l.translation, l.notes ?? "");
    try { for (const e of JSON.parse(l.examples)) if (e?.en) pieces.push(e.en); } catch { /* not a list */ }
  }
  /*
    The shipped English for a recorded sentence and the authored sentences
    the first meetings use, read off the files rather than the rows, since a
    screen reaches both through `sentenceEnglish` without the row holding it.
  */
  try {
    pieces.push(...Object.values(JSON.parse(readFileSync(new URL("../prisma/data/example-english.json", import.meta.url), "utf8"))));
  } catch { /* a checkout without the table */ }
  try {
    const authored = readFileSync(new URL("../lib/dict/authoredRows.ts", import.meta.url), "utf8");
    for (const m of authored.matchAll(/\[\s*"(?:[^"\\]|\\.)*",\s*"(?:[^"\\]|\\.)*",\s*"((?:[^"\\]|\\.)*)"\s*\]/g)) pieces.push(m[1]);
  } catch { /* a checkout without the rows */ }
  for (const c of await prisma.card.findMany({ where: { ownerId: owner }, select: { front: true, back: true, hint: true } })) {
    pieces.push(c.front, c.back, c.hint ?? "");
  }
  const typed = [
    prisma.deck.findMany({ where: { ownerId: owner }, select: { name: true } }),
    prisma.classroom.findMany({ select: { name: true } }),
    prisma.task.findMany({ where: { ownerId: owner }, select: { title: true, notes: true } }),
    prisma.studyEvent.findMany({ where: { ownerId: owner }, select: { title: true, notes: true } }),
    prisma.scan.findMany({ where: { ownerId: owner }, select: { title: true, items: true } }),
    prisma.message.findMany({ where: { ownerId: owner }, select: { content: true } }),
    prisma.suggestion.findMany({ select: { note: true } }).catch(() => []),
  ];
  for (const rows of await Promise.all(typed)) for (const r of rows) pieces.push(...Object.values(r).map((v) => v ?? ""));
  return pieces.map(norm).join("\n");
}
const byDesign = await englishByDesign();

/*
  Function words, which is how English is told from Estonian in Latin script.
  None of these is an Estonian word a screen would print: `on`, `no`, `see`,
  `all`, `need`, `mine`, `just` and `me` are, and are left out for that reason.
*/
const ENGLISH = new Set((
  "the a an and or but of to in at for with from by about into onto over than then this that these those " +
  "it its is are was were be been being do does did don't doesn't can can't cannot will won't would should " +
  "could have has had not you you're your yours we our they their them he she his her i i'm my what which who " +
  "how why when where there here yet still only every each any some more most again also if so up out off " +
  "get got let let's show open add start next back try use one your words word card cards today"
).split(" "));

/**
 * Every visible run of Latin-script words on the page, with where it was.
 * Runs inside Estonian, inside a run declared English, inside what is hidden
 * from a reader and inside code are not collected. Attributes a reader hears
 * (`aria-label`, `title`, `placeholder`, `alt`) are collected too, because a
 * screen reader in Russian reading out an English label is the same leftover.
 */
function latinRuns() {
  const SKIP = "script, style, noscript, template, code, kbd, pre, textarea, [lang='et'], [lang='en'], [aria-hidden='true']";
  const runs = [];
  const shown = (el) => el.closest(".sr-only")
    || el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true });
  const where = (el) => {
    const cls = String(el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
  };
  const take = (text, el) => {
    for (const m of text.matchAll(/[A-Za-z][A-Za-z0-9'’]*(?:[ ,.:;!?()"-]+[A-Za-z][A-Za-z0-9'’]*)+/g)) {
      runs.push({ text: m[0], where: where(el) });
    }
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || el.closest(SKIP) || !shown(el)) continue;
    take(node.textContent, el);
  }
  for (const el of document.body.querySelectorAll("[aria-label], [title], [placeholder], [alt]")) {
    if (el.closest(SKIP) || !shown(el)) continue;
    for (const a of ["aria-label", "title", "placeholder", "alt"]) {
      const v = el.getAttribute(a);
      if (v) take(v, el);
    }
  }
  // Known gaps, said so in the markup, are counted rather than reported.
  const known = [...document.body.querySelectorAll("[data-untranslated]")]
    .filter((el) => shown(el)).map((el) => el.getAttribute("data-untranslated"));
  return { runs, known };
}

/*
  English nobody has translated yet and the markup says so, with
  `data-untranslated` naming what it is. It is not a leftover, since the screen
  knows, and it is not English by design either, so it is printed at the end,
  by kind and route, where a run going quiet about it cannot hide it.
*/
const KNOWN = new Map();

/** The runs that are English and are not English by design. */
function leftovers(runs) {
  const found = [];
  for (const { text, where } of runs) {
    const words = text.toLowerCase().replace(/’/g, "'").match(/[a-z][a-z0-9']*/g) ?? [];
    if (words.length < 2 || !words.some((w) => ENGLISH.has(w))) continue;
    if (byDesign.includes(norm(text))) continue;
    if (ALLOWED.some(({ match }) => match.test(text.toLowerCase()))) continue;
    found.push(`"${text.slice(0, 60)}" in ${where}`);
  }
  return [...new Set(found)];
}

/** The page laid out and hydrated, without waiting on the network going quiet. */
async function ready(page) {
  await page.waitForFunction(() => (document.querySelector("main")?.innerText || "").trim().length > 0,
    undefined, { timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(250);
}

async function measure(page, label, { english }) {
  const rest = await page.evaluate(survey, { stress: false });
  check(`nothing is cut off on ${label}`, rest.cut === 0 && rest.counted >= 4,
    rest.cut > 0 ? rest.say.cut : rest.counted < 4 ? `only ${rest.counted} things on the page` : "");
  check(`nothing bleeds over a border on ${label}`, rest.bled === 0, rest.say.bled);
  check(`no ordinary word is too wide for its box on ${label}`, rest.split === 0, rest.say.split);
  const whole = await page.evaluate(wholeWords);
  check(`no word is drawn across two lines on ${label}`, whole.broken === 0, whole.say.broken);
  check(`no button label is wider than its button on ${label}`, whole.overflowing === 0, whole.say.overflowing);
  const fitted = await page.evaluate(fitsAnyWord);
  check(`a word set large fits on ${label}`, fitted.broken.length === 0, fitted.broken.slice(0, 3).join(" · "));
  if (english) {
    const { runs, known } = await page.evaluate(latinRuns);
    const left = leftovers(runs);
    check(`no English is left on ${label}`, left.length === 0, left.slice(0, 4).join(" · "));
    for (const kind of known) KNOWN.set(kind, (KNOWN.get(kind) ?? new Set()).add(label.split(" ")[0]));
  }
}

/*
  THE LANGUAGE AS IT WAS, PUT BACK WHATEVER HAPPENS. A learner's own setting
  is shared state with every suite after this one, which runs in English and
  selects controls by their English names; one left in Russian would fail all
  of them for a reason none of them could name.
*/
const KEYS = ["uiLocale", "uiLocaleNoticed"];
const before = await prisma.setting.findMany({ where: { ownerId: owner, key: { in: KEYS } } });
const setLocale = async (value) => {
  for (const key of KEYS) {
    await prisma.setting.upsert({
      where: { ownerId_key: { ownerId: owner, key } },
      update: { value }, create: { ownerId: owner, key, value },
    });
  }
};

const browser = await launchChromium();
const started = Date.now();
try {
  for (const p of unmade) absent(40, `a row for ${p}, which scripts/test-containment.mjs makes before this in CI`);
  for (const locale of LOCALES) {
    await setLocale(locale);
    for (const pass of PASSES) {
      const at = `${locale} ${pass.width}${pass.dark ? " dark" : ""}`;
      const ctx = await browser.newContext({
        viewport: { width: pass.width, height: pass.width < 768 ? 780 : 900 },
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      if (pass.dark) await ctx.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch { /* private */ } });
      const page = await ctx.newPage();
      // The language really is the one set, asked of the document the shell
      // writes rather than of any word on the screen.
      await page.goto(`${B}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await ready(page);
      const lang = await page.evaluate(() => document.querySelector("main")?.closest("[lang]")?.getAttribute("lang"));
      check(`the shell is drawn in ${locale} at ${at}`, lang === locale, `lang is ${lang}`);
      for (const route of ONLY ? ROUTES.filter((r) => ONLY.some((o) => r.startsWith(o))) : ROUTES) {
        await page.goto(`${B}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await ready(page);
        await startRound(page, { waitMs: 400 });
        await measure(page, `${route} ${at}`, pass);
      }
      await ctx.close();
    }
  }
} finally {
  await prisma.setting.deleteMany({ where: { ownerId: owner, key: { in: KEYS } } });
  for (const row of before) await prisma.setting.create({ data: row });
  await prisma.$disconnect();
  await browser.close();
  console.log(`\n${ROUTES.length} routes in ${Math.round((Date.now() - started) / 1000)}s`);
  for (const [kind, where] of KNOWN) console.log(`known gap, not translated yet: ${kind}, on ${[...where].join(", ")}`);
}
done();
