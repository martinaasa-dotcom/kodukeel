#!/usr/bin/env node
import { launchChromium, eventually } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { requireAppShell } from "./lib/prefs.mjs";

/**
 * A LEARNER'S OWN SHELVES, DRIVEN.
 *
 * Nothing drove these screens, and that is exactly how the fault they were
 * reported for shipped. The dictionary's "Which deck?" section was gated on
 * holding *two* decks, on the argument that with one shelf the word goes into
 * the one place it was always going to go; it does not, it goes nowhere, so a
 * learner who named their first deck was offered it on no screen at all. Every
 * unit test and every invariant passed the whole time, because each was true:
 * the gate was a number, the actions worked, the writes were correct. What was
 * wrong was whether a learner could get at any of it, and only a browser can
 * ask that.
 *
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run dev
 *   node scripts/test-decks.mjs
 *
 * Local mode, for the reason every browser suite here runs in it.
 *
 * IT LEAVES THE DATABASE AS IT FOUND IT, and that is load-bearing rather than
 * tidy. A deck of this learner's own changes what the dictionary's add panel
 * draws for *every* suite after this one, which is the shape `test-restore.mjs`
 * is dangerous in: one suite's leftovers read as another suite's bug. So the
 * decks go at both ends, and so do any cards pressing "Add" happened to build,
 * since the panel ticks recognition, production and the gap-fill by default and
 * a word that had only some of those would quietly gain the rest.
 */
const B = baseUrl();
const OWNER = "local-single-user";
/** Named so a stray row is obviously this suite's and never somebody's own. */
const DECK = "Deck suite shelf";
const RENAMED = "Deck suite shelf renamed";

const prisma = newPrismaClient(requireLocalDatabase("create decks and file words onto them"));

/*
  Eighteen, which is every `check` below. Each block that a database can fail to
  reach carries its own `absent`, so the count is a property of this file rather
  than of the fixture: no branch here can stop running and still clear the
  floor.
*/
const { check, absent, done } = suite("The deck screens", { floor: 18 });

async function dropOurDecks() {
  // Scoped to the two names this suite uses rather than to every deck this
  // learner has: a broad delete would be fine on a scratch database and would
  // throw away somebody's own shelves on the machine they work on.
  await prisma.deck.deleteMany({ where: { ownerId: OWNER, name: { in: [DECK, RENAMED] } } });
}

await dropOurDecks();

/*
  What this learner already has, so the checks can name real words and the
  cleanup can tell a card it built from a card it found. Read once: every
  question below is about words the fixture put in the deck.
*/
const cardsBefore = new Set(
  (await prisma.card.findMany({ where: { ownerId: OWNER }, select: { id: true } })).map((c) => c.id),
);
const held = await prisma.card.findMany({
  where: { ownerId: OWNER, lexemeId: { not: null } },
  select: { lexeme: { select: { lemma: true } } },
  orderBy: { id: "asc" },
});
const lemmas = [...new Set(held.map((c) => c.lexeme?.lemma).filter(Boolean))];
/* One of the six letters an English keyboard has no key for, named here as an
   example the way any test must name one. The table is lib/estonian/fold.ts and
   lib/progress/decks.itest.ts asks it directly; this asks whether the screen
   reaches it. */
const withDiacritic = lemmas.find((l) => l.includes("õ"));
const plain = lemmas.find((l) => l !== withDiacritic);

if (lemmas.length < 2) {
  console.log("\nFAIL  this learner holds fewer than two words, so there is nothing to file.");
  console.log("      Run: npm run db:seed && npm run demo");
  process.exit(1);
}

const browser = await launchChromium();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const deckPage = () => page.goto(`${B}/words/decks`, { waitUntil: "networkidle" });

// ── With no shelf named, the panel asks nothing about shelves ──────────────
// The honest half of the gate, and the only check here that a learner's own
// decks can take away: it is a claim about holding none.
await deckPage();
await requireAppShell(page);
const ownDecks = await prisma.deck.count({ where: { ownerId: OWNER } });
if (ownDecks === 0) {
  await page.goto(`${B}/dictionary?q=${encodeURIComponent(plain)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Add to deck|In deck/ }).first().click();
  await page.waitForTimeout(600);
  check(
    "with no deck named, the add panel offers no shelf to choose",
    !(await page.content()).includes("Which deck?"),
  );
} else {
  absent(1, `this learner already has ${ownDecks} deck(s) of their own, so "no deck named" is unreachable`);
}

// ── Naming one ─────────────────────────────────────────────────────────────
await deckPage();
await page.locator("#new-deck-name").fill(DECK);
await page.getByRole("button", { name: /Create/ }).click();
check("a named deck appears on the page that named it", await eventually(async () =>
  (await page.content()).includes(DECK)));

// ── ...is offered by the dictionary. The regression, in one check. ─────────
await page.goto(`${B}/dictionary?q=${encodeURIComponent(plain)}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Add to deck|In deck/ }).first().click();
const offered = await eventually(async () => (await page.content()).includes("Which deck?"));
check("one deck is enough for the dictionary to ask which shelf", offered);
check("and it offers the shelf by the name the learner gave it",
  (await page.content()).includes(DECK));

// ── Filing from there lands on the shelf ───────────────────────────────────
await page.getByRole("checkbox", { name: DECK }).check();
await page.getByRole("button", { name: /^Add$/ }).click();
await page.waitForTimeout(1500);
await deckPage();
check(`the word filed from the dictionary is on the shelf`, await eventually(async () =>
  (await page.content()).includes("1 word")));

await page.getByRole("button", { name: /^\d+ words?$/ }).first().click();
check("and the shelf lists it by name", await eventually(async () =>
  (await page.content()).includes(plain)));

// ── Filing after the fact, which is what no other screen could do ──────────
await page.getByRole("button", { name: /Add words/ }).click();
// The panel's own list, by its relation to its own field, rather than "the last
// ul on the page": the shelf's word list is open above it and a positional
// guess would read that one and pass while looking at the wrong thing.
const offers = page.locator('input[id^="file-"] ~ ul li');
check("the filing panel offers words with nothing typed", await eventually(async () =>
  (await offers.count()) > 0, { timeoutMs: 8000 }));

const offeredNames = (await offers.allInnerTexts()).join("\n").split(/\s+/);
check("and does not offer a word already on the shelf", !offeredNames.includes(plain));

if (withDiacritic) {
  const typed = withDiacritic.replace("õ", "o");
  await page.locator(`input[id^="file-"]`).fill(typed);
  check(`searching "${typed}" finds ${withDiacritic}`, await eventually(async () =>
    (await page.content()).includes(withDiacritic), { timeoutMs: 8000 }));
  await offers.filter({ hasText: withDiacritic }).first().click();
  check("pressing a word files it, and the count says so", await eventually(async () =>
    (await page.content()).includes("2 words")));
} else {
  absent(2, "no word in this deck carries an õ, so the folded search has nothing to find");
}

// ── A shelf is a label, never a container ─────────────────────────────────
const filed = withDiacritic ?? plain;
await page.goto(`${B}/dictionary?q=${encodeURIComponent(filed)}`, { waitUntil: "networkidle" });
check("a filed word is still in the learner's deck", (await page.content()).includes("In deck"));

// ── Renaming, and taking a word off ───────────────────────────────────────
await deckPage();
await page.getByRole("button", { name: DECK, exact: true }).click();
await page.getByRole("textbox", { name: `Rename ${DECK}` }).fill(RENAMED);
await page.keyboard.press("Enter");
check("a shelf can be renamed", await eventually(async () => (await page.content()).includes(RENAMED)));

await deckPage();
await page.getByRole("button", { name: /^\d+ words?$/ }).first().click();
const takeOff = page.getByRole("button", { name: /Take .* off this shelf/ });
const had = await takeOff.count();
if (had > 0) {
  await takeOff.first().click();
  check("a word comes off the shelf", await eventually(async () => (await takeOff.count()) < had));
  await page.goto(`${B}/dictionary?q=${encodeURIComponent(plain)}`, { waitUntil: "networkidle" });
  check("and taking it off the shelf leaves it in the deck",
    (await page.content()).includes("In deck"));
} else {
  absent(2, "the shelf listed no words to take off, so the removal path was not reached");
}

// ── Removing the shelf keeps the words ────────────────────────────────────
await deckPage();
await page.getByRole("button", { name: /Remove/ }).first().click();
check("removing a shelf says the words stay", await eventually(async () =>
  (await page.content()).includes("The words stay in your deck")));
await page.getByRole("button", { name: /^Remove$/ }).last().click();
check("and the shelf goes", await eventually(async () => !(await page.content()).includes(RENAMED)));

await page.goto(`${B}/dictionary?q=${encodeURIComponent(filed)}`, { waitUntil: "networkidle" });
check("the words it held are still the learner's", (await page.content()).includes("In deck"));

check("no console errors anywhere in that", errors.length === 0, errors.slice(0, 2).join(" | "));

// Cards the add panel built on its way past, and nothing the fixture laid down.
const extra = (await prisma.card.findMany({ where: { ownerId: OWNER }, select: { id: true } }))
  .map((c) => c.id).filter((id) => !cardsBefore.has(id));
if (extra.length) await prisma.card.deleteMany({ where: { id: { in: extra } } });

await dropOurDecks();
await browser.close();
await prisma.$disconnect();
done();
