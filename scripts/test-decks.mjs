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
 * Its first run found three faults, and all three were in this file rather
 * than in the app: two branches that could never execute, and an assertion
 * against `page.content()`, which carries every render's flight payload in a
 * script tag and so can never go back to not containing a name it has shown
 * once. That last one failed on a deck that had been deleted perfectly well.
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
  Eighteen, which is every `check` below, and read off a real run rather than
  counted: the first execution of this suite reached fourteen and waived four,
  and both waivers were faults in the suite rather than facts about the
  machine. One asked for a word with an õ in it, which the demo deck does not
  have and never will, so two checks read as covered and had never executed.
  The other counted the shelf's word list before the disclosure had fetched it.
  A waiver that no state can lift is the thing a floor exists to make visible,
  so neither is a waiver now.

  What is left is conditional on the database and can honestly fire: a learner
  who already has decks of their own, and a shelf that listed nothing to take
  off. Every other block that could stop running trips the floor, because
  nothing waives it.
*/
const { check, absent, done } = suite("The deck screens", { floor: 20 });

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
const [plain, second] = lemmas;

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

/*
  WHAT A READER CAN SEE, WHICH IS NOT WHAT `page.content()` RETURNS.

  That returns the whole document, and this app is a React server-component
  tree: every render's flight payload sits in the DOM as `self.__next_f.push`
  inside a script tag, and those are appended rather than replaced. So a name
  that has been rendered once is in `content()` for the life of the page, and a
  check of the shape "the shelf is gone" can never pass. It did not: the first
  run of this suite failed `and the shelf goes` against a deck that had been
  deleted correctly, for fifteen seconds of polling.

  Every assertion here reads the rendered text instead, so a negative one means
  what it says and a positive one cannot be satisfied by a payload nobody sees.
*/
const shown = () => page.locator("main").innerText();

/*
  AND FOLDED, BECAUSE `innerText` IS THE RENDERED TEXT AND THIS APP UPPERCASES
  ITS LABELS.

  `.label-xs` carries `text-transform: uppercase`, and `innerText` reflects
  that where `textContent` would not, so the panel's own heading reaches a
  reader as "WHICH DECK?" and an exact search for "Which deck?" finds nothing.
  That cost this suite a false pass as well as a false failure, which is the
  worse half: `with no deck named, the add panel offers no shelf to choose`
  asserted the absence of a string that could never have been present, so it
  was green on a screen nobody had looked at. Folding the case is the
  difference between asking about the screen and asking about the stylesheet.
*/
const shows = async (needle) => (await shown()).toLowerCase().includes(needle.toLowerCase());

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
    !(await shows("Which deck?")),
  );
} else {
  absent(1, `this learner already has ${ownDecks} deck(s) of their own, so "no deck named" is unreachable`);
}

// ── Naming one ─────────────────────────────────────────────────────────────
await deckPage();
await page.locator("#new-deck-name").fill(DECK);
await page.getByRole("button", { name: /Create/ }).click();
check("a named deck appears on the page that named it", await eventually(() => shows(DECK)));

// ── ...is offered by the dictionary. The regression, in one check. ─────────
await page.goto(`${B}/dictionary?q=${encodeURIComponent(plain)}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Add to deck|In deck/ }).first().click();
const offered = await eventually(() => shows("Which deck?"));
check("one deck is enough for the dictionary to ask which shelf", offered);
check("and it offers the shelf by the name the learner gave it", await shows(DECK));

// ── Filing from there lands on the shelf ───────────────────────────────────
await page.getByRole("checkbox", { name: DECK }).check();
await page.getByRole("button", { name: /^Add$/ }).click();
await page.waitForTimeout(1500);
await deckPage();
check("the word filed from the dictionary is on the shelf", await eventually(() => shows("1 word")));

await page.getByRole("button", { name: /^\d+ words?$/ }).first().click();
check("and the shelf lists it by name", await eventually(() => shows(plain)));

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

/*
  THE SEARCH, AND DELIBERATELY NOT THE FOLD.

  The first version of this typed a word with its diacritic stripped, to prove
  the box reaches `lib/estonian/fold.ts`. It waived itself on every run there
  will ever be, because the demo deck carries no word with an õ in it, and a
  waiver that can never lift is a hole wearing a waiver's clothes: two checks
  that read as covered and had never once executed. The fold is asked directly,
  against a real Postgres, in lib/progress/decks.itest.ts, which is where a
  claim about a query belongs. What only a browser can say is whether typing in
  this box narrows this list, and that is what this asks.
*/
await page.locator(`input[id^="file-"]`).fill(second);
check(`typing "${second}" narrows the list to it`, await eventually(async () =>
  (await offers.count()) > 0 && (await offers.allInnerTexts()).join(" ").includes(second),
  { timeoutMs: 8000 }));
await offers.filter({ hasText: second }).first().click();
check("pressing a word files it, and the count says so", await eventually(() => shows("2 words")));

// ── A shelf is a label, never a container ─────────────────────────────────
const filed = second;
await page.goto(`${B}/dictionary?q=${encodeURIComponent(filed)}`, { waitUntil: "networkidle" });
check("a filed word is still in the learner's deck", await shows("In deck"));

// ── The home page, which is where this was reported ───────────────────────
/*
  THE BUG THIS SUITE DID NOT COVER THE FIRST TIME.

  `AddWordButton` is the word of the day and the words a conversation showed
  the learner they were missing, and it called `addToDeck` with three arguments
  for the life of the feature: with shelves named, the word landed on none of
  them and nothing on the screen said so. The dictionary was the only door that
  asked, this suite only drove the dictionary, and so the suite reported the
  feature as covered while the screen a learner opens every morning had the
  button and not the question.

  WAIVED WHERE THE CARD IS NOT DRAWN, and that is a real state rather than a
  hedge: Today names seven cards in priority order and draws the first five, so
  whether the word of the day makes the cut depends on how many of the errand,
  the calendar, the homework, the round and the streak have something to say on
  the day the fixture lands on. The invariant "the deck question has one home"
  is what holds this without a fixture, since it fails on an add button that
  stops reaching for the shared question at all.
*/
await page.goto(`${B}/`, { waitUntil: "networkidle" });
const keep = page.getByRole("button", { name: /Add it to my deck/i }).first();
if ((await keep.count()) > 0) {
  await keep.click();
  check("the home page asks which shelf, rather than filing it nowhere",
    await eventually(() => shows("Which deck?"), { timeoutMs: 8000 }));
  await page.getByRole("checkbox", { name: DECK }).first().check();
  await page.getByRole("button", { name: /^Add it$/ }).first().click();
  check("and says which shelf it went on", await eventually(() => shows(DECK), { timeoutMs: 8000 }));
} else {
  absent(2, "the word of the day was not among today's five cards, so the home page drew no add button");
}

// ── Renaming, and taking a word off ───────────────────────────────────────
await deckPage();
await page.getByRole("button", { name: DECK, exact: true }).click();
await page.getByRole("textbox", { name: `Rename ${DECK}` }).fill(RENAMED);
await page.keyboard.press("Enter");
check("a shelf can be renamed", await eventually(() => shows(RENAMED)));

await deckPage();
await page.getByRole("button", { name: /^\d+ words?$/ }).first().click();
const takeOff = page.getByRole("button", { name: /Take .* off this shelf/ });
/*
  The shelf's own list is fetched when the disclosure opens rather than handed
  down by the server render, so counting straight after the click counts the
  word "Loading…". The first run of this suite did exactly that and waived the
  two checks behind it, reporting a shelf with nothing on it one line after
  asserting two words were.
*/
await eventually(async () => (await takeOff.count()) > 0, { timeoutMs: 8000 });
const had = await takeOff.count();
if (had > 0) {
  await takeOff.first().click();
  check("a word comes off the shelf", await eventually(async () => (await takeOff.count()) < had));
  await page.goto(`${B}/dictionary?q=${encodeURIComponent(plain)}`, { waitUntil: "networkidle" });
  check("and taking it off the shelf leaves it in the deck", await shows("In deck"));
} else {
  absent(2, "the shelf listed no words to take off, so the removal path was not reached");
}

// ── Removing the shelf keeps the words ────────────────────────────────────
await deckPage();
await page.getByRole("button", { name: /Remove/ }).first().click();
check("removing a shelf says the words stay", await eventually(() => shows("The words stay in your deck")));
await page.getByRole("button", { name: /^Remove$/ }).last().click();
check("and the shelf goes", await eventually(async () => !(await shows(RENAMED))));

await page.goto(`${B}/dictionary?q=${encodeURIComponent(filed)}`, { waitUntil: "networkidle" });
check("the words it held are still the learner's", await shows("In deck"));

check("no console errors anywhere in that", errors.length === 0, errors.slice(0, 2).join(" | "));

// Cards the add panel built on its way past, and nothing the fixture laid down.
const extra = (await prisma.card.findMany({ where: { ownerId: OWNER }, select: { id: true } }))
  .map((c) => c.id).filter((id) => !cardsBefore.has(id));
if (extra.length) await prisma.card.deleteMany({ where: { id: { in: extra } } });

await dropOurDecks();
await browser.close();
await prisma.$disconnect();
done();
