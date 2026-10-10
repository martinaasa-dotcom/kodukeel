#!/usr/bin/env node
/**
 * Text and icons stay inside the boxes they were drawn into, measured.
 *
 * Every other rule in this repository about the shape of a page is about the
 * page as a whole: the root declares no overflow, the document cannot be
 * dragged sideways, a target clears 44px. None of them can see the fault this
 * suite is named after, because it happens *inside* a card that is itself the
 * right size. A word runs over the border and onto the ground behind it; a
 * label meets an icon in a flex row and squeezes the icon into an oval; a
 * count reaches three digits and paints outside the circle it was centered in.
 * The page never scrolls sideways for any of that, so `test-mobile.mjs` reads
 * a clean pass and the screen looks broken.
 *
 * FOUR FAULTS, AND EACH IS A DIFFERENT MISTAKE.
 *
 *   1. Something is CUT OFF. It sits inside an ancestor that clips, and part
 *      of it is past the clip: the reader is missing text and has no way to
 *      reach it. A scroller is not this fault — being able to scroll to the
 *      rest is the way out, which is why an ancestor that scrolls on an axis
 *      ends the search on that axis rather than counting as a clip.
 *
 *   2. Something BLEEDS OVER a boundary that is drawn. The nearest ancestor
 *      that paints a border or a fill is the box a reader sees, and ink
 *      outside its padding box is ink on the wrong side of a line somebody
 *      drew. Nothing clips it, so nothing is lost; it just reads as broken.
 *
 *   3. An ICON IS DEFORMED. A lucide icon is a square with `width` and
 *      `height` attributes on it, and a flex row squeezes it whenever the
 *      text beside it is longer than the row. `svg.lucide { flex: none }` in
 *      app/globals.css is the one rule that stops that, and this is what says
 *      the rule is still doing its job on a real page.
 *
 *   4. Something is DRAWN INTO SOMETHING ELSE. Not out of a box: on top of
 *      one. This is the fault that survives all three above, because both
 *      elements are inside their card and neither is cut off; one of them
 *      just cannot be read. Asked by hit-testing the letters rather than by
 *      comparing rectangles, for reasons written out where it is done.
 *
 * AND THEN THE SAME FOUR WITH NOTHING TO BREAK ON, WHICH IS THE HALF THAT
 * MATTERS. A page that holds today's words is not a page that holds text: a
 * row fits because the gloss it happens to carry has three spaces in it, and
 * a browser will break a line at a space whether or not anybody thought about
 * it. So every run of text is swapped for a run of letters OF THE SAME LENGTH
 * with no space and no hyphen anywhere in it, and the same four questions are
 * asked again.
 *
 * SAME LENGTH IS THE WHOLE DISCIPLINE OF IT. A stress test that hands every
 * element a forty-character word is unfalsifiable: a ring whose middle says
 * "42%" will fail it, and there is no markup that would pass. Same length asks
 * the question the language actually poses. Estonian compounds: "raamatukogu",
 * "sünnipäevakingitus", a unit title that is one word where the English is
 * four. The gloss "gymnasium, secondary school" fits a card today because of
 * its commas, and the compound of the same width has to fit it too. Anything
 * that fails this is a box sized by the accident of where the spaces fell.
 *
 * Needs the server running and a deck with something in it:
 *   npm run demo && npm run dev
 *   node scripts/test-containment.mjs
 */
import { eventually, launchChromium } from "./lib/browser.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { revealAnswer } from "./lib/review.mjs";
import { ensureLetterBar, ensureWordGloss } from "./lib/prefs.mjs";
import { startRound } from "./lib/briefing.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { fitsAnyWord, survey, wholeWords } from "./lib/containment.mjs";
import { requireLocalDatabase, resolveDatabaseUrl } from "./lib/local-db.mjs";

const B = baseUrl();

/**
 * The narrowest phone anybody still holds, the breakpoint, and a desktop.
 *
 * Both ends first, because the two faults live at opposite ones: a word runs
 * out of a card when the card is narrow, and a fixed-width rail runs out of
 * room only when the window is wide enough for the rail to exist. 768 is here
 * because it is the width at which the layout actually changes its mind, and a
 * rule that holds either side of a breakpoint can still fail on it: the
 * comparison grid on the landing page is `md:block`, so at 1280 it is measured
 * and at 360 it does not exist, and 768 is the first width that has it in the
 * least room it will ever have.
 */
/*
  The three widths CI measures, and a fourth where the rail is showing and
  the content column is at its narrowest after 768: a laptop at 1024 is where
  a card built for a wide screen first gets squeezed, and a word that breaks
  there is a word broken on most people's computers. `CONTAIN_WIDTHS` takes a
  comma-separated list, for sweeping every width in between by hand.
*/
const WIDTHS = process.env.CONTAIN_WIDTHS
  ? process.env.CONTAIN_WIDTHS.split(",").map(Number).filter((n) => n > 0)
  : [360, 768, 1024, 1280];

/**
 * Dark is measured once, at the width where containment fails first.
 *
 * It is one sweep rather than a third of the suite, because containment is
 * layout and the two themes differ in color. Not none, though: "bleeds over a
 * border" is answered by looking for the nearest ancestor that paints a border
 * or a fill, and whether a token paints anything is exactly the thing a theme
 * changes.
 */
const DARK_WIDTH = 360;

/**
 * Every route the app has, rather than a spread of the ones somebody thought
 * were likely.
 *
 * The first version of this list was twelve screens chosen for carrying text
 * from somewhere other than a designer, which is the right instinct and the
 * wrong list: two of the three faults this suite has found so far were on
 * screens that instinct would have picked, and the third was on a printable
 * worksheet nobody would have thought to check. A route is cheap here, about
 * two seconds, and a route that is not in this list is a screen where the
 * whole rule is unenforced.
 *
 * What is not here is the three routes that need a row in the database to
 * exist at all: a classroom, a sat paper and a scan. The paper is covered by
 * the block at the end, which sits one for real.
 */
const ROUTES = [
  // Today, and the daily path.
  "/",
  "/review",
  "/review/write",
  "/review/cloze",
  "/review/dictation",
  "/review/pairs",
  "/review/clinic",
  "/review/government",
  "/review/openers",
  "/review/twenty",
  "/review/conjugation",
  "/review/listening",
  "/review/match",
  "/review/sentences",
  "/review/speaking",
  "/review/flashcards",
  /*
    The frequency rounds. The index is four cards each carrying a title, a
    count chip and two controls on one row, which is the shape that goes over
    at 768 where the rail appears and the column is at its narrowest; the round
    is a whole `ReviewSession`, and it is walked as one of the four because the
    group decides which words are asked and not how the screen is drawn.
  */
  "/review/common",
  "/review/common/noun",
  "/review/describe",
  "/review/map",
  "/practice",
  "/quest",
  "/sonad",
  "/crossword",
  "/calendar",

  // The dictionary, the deck and the reference, which is where the Estonian is.
  "/dictionary",
  "/dictionary/common",
  "/dictionary?q=tuba",
  "/words",
  "/words/decks",
  "/words/mastery",
  "/grammar",
  "/grammar/cases",
  "/grammar/build-a-word",
  "/grammar/ukrainian",
  "/grammar/partitive",
  "/grammar/topic/object",
  /*
    The exception area. Two cards a row, each carrying a title, a count chip and
    a paragraph, which is the shape that goes over at 768 where the rail appears
    and the column is at its narrowest; the kind page is a list of entries whose
    row is a word, a gloss and two chips on one line.
  */
  "/grammar/exceptions",
  "/grammar/exceptions/stem",
  "/review/exceptions",
  "/review/letters",
  "/review/lookups",

  // The course.
  "/learn",
  "/learn/new",
  "/learn/kodu",
  "/learn/kodu/lesson",
  "/learn/kodu/worksheet",
  "/learn/checkpoint/A1",
  "/course",
  "/course/learn",
  "/course/forms",

  // Measurement, and the things built on it.
  "/progress",
  /*
    Readiness for the course's situations: a list of 82 rows carrying a chip,
    a claim and a line each, and a detail with three bars, a list of
    struggles and a row of word chips, which is the shape that wraps.
  */
  "/progress/readiness", "/progress/record",
  "/progress/readiness/sook-ja-jook",
  "/exam",
  "/exam/B1/papers",
  "/assess",

  // Everything else a signed-in learner can reach.
  "/settings",
  "/settings?tab=sound",
  "/settings?tab=words",
  "/settings?tab=account",
  "/class",
  "/tutor",
  "/scan",
  "/suggestions",
  "/admin/suggestions",

  /*
    The conversations. The briefing at 360 is a role card, a four-cell dial of
    labeled buttons and a start button, and the scene behind it is a log of
    Estonian in a fixed-height scroller with a text field, a letter bar and four
    controls under it, which at 360 is the tightest row of buttons in the app
    after the rating keys. The talking screen itself is not reached from a URL,
    so it is one of the states the sweep opens by hand further down.
  */
  "/situations",
  "/situations/arsti-aeg",

  // The pages that own the whole screen, plus the two a regulator reads and
  // the one shown when the network is gone.
  "/welcome",
  "/sign-in",
  "/start",
  "/privacy",
  "/terms",
  "/funding",
  "/state-exam",
  "/welcome/ru", "/welcome/uk",
  "/trust",
  "/accessibility",
  "/offline",
];

/**
 * The routes that genuinely are this small, and how small.
 *
 * Each pass asks whether the page had anything on it before believing four
 * clean answers about it, because a route that rendered its error boundary or
 * a 404 has a heading and a button and passes all four on the strength of
 * having almost nothing to look at. That is not hypothetical: this list
 * carried `/grammar/topic/rektsioon` for one run, which is not a topic id, and
 * the count is what said so rather than four green ticks on the 404 page.
 *
 * Twenty-five is the default and two pages are honestly under it, so they
 * declare their own rather than the default coming down for everybody.
 * Lowering it to let `/offline` through is lowering it to let a crashed
 * `/words` through, which is the whole reason the number is here.
 */
const SPARSE = new Map([
  ["/offline", 4],
  ["/sign-in", 12],
]);

/*
  Floor: 1020. Forty-eight routes (forty-five listed, three made) at three
  widths, plus the landing page with its disclosures open and the paper being
  sat at each of them, plus three asked-for states at the two ends, plus the
  whole list again in the dark at 360. Every pass reports five things: cut off,
  bled over a border, drawn into a neighbor, deformed, and then the same four
  again with every word turned into one with nothing to break on.

  Raise this when you add a route; never lower it to make a run go green. What
  a state that genuinely cannot be reached does instead is call `absent` with
  its count and its reason, which is how a machine with no provider key says
  it could not make a scanned page rather than quietly checking twenty fewer
  things.
*/
/*
  1000 rather than 1020, and the twenty are a route that no longer exists.
  `/guide` was a second description of the app offered to somebody already
  inside it, and this suite walks every route the app has at three widths in
  two themes, twice over, so deleting one screen takes a fixed block of checks
  with it. Lowering a floor is otherwise how a suite stops noticing: this one
  is arithmetic on the route list, not a run being waved through.

  And 920 rather than 1000 for the same reason, three routes at once: the
  placement ladder, the homework list and the class week were cut as not
  being learning, and the run after the cut counted 940 where the one before
  it counted 1020. The margin of twenty under the count is the one the floor
  has always kept.

  Then 940, and this one is a raise rather than a cut. `/class/[classroomId]`
  renders two different screens, a teacher's roster and a sponsor's view of a
  workplace group, and this suite walked whichever the index listed first. Both
  are made now, which is one more route's worth of checks: the run counts 960
  where it counted 940, and the floor keeps its twenty.
*/
// 1040 rather than 920: five routes joined the sweep (the Flash cards round,
// Picture match, Target, the daily quest and the calendar). Its own header is
// why they had to: "a route that is not in this list is a screen where the
// whole rule is unenforced", and the calendar was over its box at 768 on the
// first run.
//
// 1050 rather than 1040: the commonest words joined it, which is one route and
// twenty checks, and it is the densest page in the app by some way. Four
// hundred Estonian chips in four disclosures, and the longest of them
// (`sellepärast`, `suurepärane`) are exactly the shape the unbreakable pass
// asks about.
// 1070 rather than 1050: Sonad joined it, which is one route and twenty
// checks. It is the tightest board in the app at 360, six circles across with
// a 32-key alphabet under them, so it is exactly the route this suite exists
// for.
// 1090 rather than 1070: the crossword joined it. Nine columns of cells with
// a clue number in each corner at 360 is the densest arrangement of small
// boxes in the app, which is what this suite is for.
// And 940 rather than 920 came the other way, with the sponsor's workplace
// group, which this suite had never drawn: `/class/[classroomId]` renders two
// different screens and only one of them was ever walked. Merged rather than
// chosen, since both sides added coverage. Measured at 1120 against a database
// with the demo fixture in it, which is what CI seeds; without `npm run demo`
// the workplace group does not exist and the run comes in at 1100 and says so,
// which is the floor doing its job rather than a regression.
//
// And 1130 rather than 1110: `/funding` joined the sweep, which is one route
// and twenty checks. It is a page of numbers in a table beside a bar chart and
// a slider, which is the one arrangement in the app whose width is decided by
// how long a figure happens to be, so it is exactly the route this suite is
// for. Measured at 1140 with the demo fixture in place, which is the 1120 above
// plus that one route, and the floor keeps the same ten under it.
//
// And then two routes rather than one, from two branches at once: `/funding`
// from that one and `/review/describe` from this. Measured at 1160 on the
// merged tree rather than added from either side, which is the same rule one
// line up, and the floor keeps the same ten under it.
//
// And then four routes rather than two, from two branches at once: the
// frequency rounds from one, and the conversations plus a state no URL reaches
// from the other. Each side set its own floor from its own two, which is
// exactly the arithmetic the line above warns about, so this is measured on the
// merged tree rather than added. The briefing at 360 is a role card over a
// two-column dial of labeled buttons; the talking screen behind it is a log of
// Estonian in a fixed-height scroller with a text field, the letter bar and four
// controls under it, which is the tightest row of buttons in the app after the
// rating keys; and `/review/common/noun` is a whole round.
//
// A PRODUCTION BUILD RATHER THAN `next dev`, which is worth writing down
// because it cost an afternoon: the dev overlay mounts a `nextjs-portal`
// element over the page, and this suite correctly reports it as drawn into the
// phone bar on every route it walks. Measuring a floor off a dev server would
// have baked that in.
// Measured at 1231 on the merged tree against a production build with the demo
// fixture in place, and the floor keeps the same ten under it.
//
// A word opened out of a teaching sentence adds five checks a pass. Measured at
// 1295 with one of the two passes waiving those five, because the deck it was
// run against had nothing left to meet by then, so a clean run is 1300 and the
// floor keeps the same ten under that. The waiver is what makes it safe to set
// from a run that did not reach the state: `absent` lowers the target by
// exactly what it could not ask.
//
// And 1580 rather than 1300, from a sweep of `app/` against this list rather
// than against anybody's memory of it: nine routes had never been walked here
// at all, `/trust`, `/accessibility`, `/course`, `/course/learn`,
// `/grammar/build-a-word`, `/learn/new`, `/review/letters`, `/review/lookups`
// and `/words/mastery`, which is 180 checks, and a tenth, a round over one
// shelf, which no fixture had ever made, so the demo fixture lays one down and
// the shelf is read off `/words/decks`. Reading it found a real fault on the first of the nine
// that had anything to overflow: `/review/letters`' footer put a hint sentence
// and the "Take back" button in one unshrinkable row, and at 360 with the
// stress text in, the button's own icon and its key cap were drawn past the
// button's edge, because neither sibling could shrink below its own content
// and the button lost that fight. The hint now truncates and the button
// carries `shrink-0`, which is the same trade every other footer in this file
// makes between a sentence that can be cut short and a control that cannot.
// Measured at 1570 with the fixture's own ten-check absence still standing.
// That absence is gone: a word's first meeting with its sentence is reached
// through the scanned page's drill now (see `wordAboveA1`), and a run with the
// stub key CI starts its server with reaches all 1580. The floor is that.
//
// The broken-word question adds one check a pass. Run against a production
// build here it asked 274 of them over 1644 checks, on a database whose other
// checks came to 1370 against the 1300 above, so the fixture this floor was set
// on reaches about 258. It rose by 250, keeping a margin under that,
// because the count is a property of which screens a fixture can reach and the
// margin is what stops one missing row reading as a deleted block.
// On top of main's 1580, whose passes number about 313 at five checks each,
// the fifth question adds 300.
//
// And 2475 rather than 2500: Picture match was taken out of the app, and
// `/review/emoji` was one of the routes this walks, which is one route's worth
// of passes at the checks each pass now asks.
const { check, absent, done } = suite("Containment", { floor: 2425 });

/**
 * An A2 unit, whose lesson meets words with their sentence under them: A1
 * words are met without one (`components/WordIntro.tsx`). The first A2 unit,
 * because it is the one every conversation needs and is not going anywhere.
 */
const A2_UNIT = "korraldused";

const browser = await launchChromium();

/*
  THE ESTONIAN LETTER BAR IS ON BEFORE ANY OF THIS IS MEASURED.

  It is a stored preference, so it is shared state between suites, and a
  database where an earlier suite answered "I have them already" draws no bar
  at all. For a suite that types Estonian that shows up as a timeout naming a
  button. For this one it is quieter and worse: the row simply is not there,
  every check about it passes because there is nothing to check, and the
  screens that hold it are measured with less on them than a learner sees.

  That row is not an incidental thing to lose, either. It is six buttons wide
  under every Estonian field, and its own minimum width was once a single
  pixel more than a 390px phone has inside an exam card, which put 23px of the
  paper off the side of the screen. Losing it silently would lose the widest
  row this suite has to contain.
*/
await ensureLetterBar(browser, B, "on");
// The word gloss is off by default; the teaching-sentence check opens its panel.
await ensureWordGloss(browser, B, "on");

/**
 * The three screens that cannot be visited until something has made them.
 *
 * A classroom, a marked paper and a scanned page each need a row, so a route
 * list alone can never reach them and they were the one part of the app this
 * suite could not see. They are made once, here, and then measured at every
 * width like any other route.
 *
 * Reused rather than remade where the app lists them, so running this locally
 * a dozen times leaves a dozen of nothing. A sitting is the exception and is
 * meant to be: `Assessment` is append-only, and `scripts/test-exam.mjs` hands
 * one in on every run for the same reason.
 */
/**
 * The word the stubbed photograph is read as.
 *
 * IT MUST BE A WORD NO DICTIONARY HAS, and it must not look like one either.
 * `lexemeId: null` says the dictionary did not vouch for it, so ticking it
 * makes the learner their own `Lexeme` row, and `Lexeme` is unique on
 * `[lemma, pos]` rather than on the lemma alone. This fixture used to say
 * `tuba`, so it left a second `tuba` in the shared dictionary with no
 * paradigm behind it, sitting beside the seeded noun. `e2e.mjs` opens with
 * three checks on `/dictionary?q=tuba` and CI runs it two steps after this
 * suite, on the same database.
 *
 * `test-scan.mjs` and `test-suggestions.mjs` both worked this out already and
 * each carries an invented string of its own. This is the third, and it is
 * spelled so that nobody could mistake it for Estonian: the app writes none
 * (ADR-005) and neither do its fixtures.
 */
const UNVOUCHED = "kodukeelcontainmenttest";

/**
 * A real word above A1, for the one state the demo fixture cannot reach.
 *
 * A first meeting draws the word's sentence with the dictionary under it, and
 * `components/WordIntro.tsx` meets an A1 word on its own, with no sentence, on
 * purpose. Every word in the demo fixture is A1, so the panel a tapped word
 * opens was never drawn and five checks at each width were waived on every CI
 * run. The scanned page below carries this word as well, vouched the way the
 * real scanner vouches one, so ticking it builds its cards and the page's own
 * drill opens on its first meeting. Read-only, and chosen by rule rather than
 * typed, so no Estonian is written here: the first seeded A2 noun with three
 * or more recorded sentences, in the dictionary's own order.
 */
async function wordAboveA1() {
  const prisma = newPrismaClient(resolveDatabaseUrl().url);
  try {
    const rows = await prisma.lexeme.findMany({
      where: { cefr: "A2", pos: "NOUN", provenance: "SEED" },
      orderBy: [{ lemma: "asc" }, { id: "asc" }],
      select: { id: true, lemma: true, translation: true, cefr: true, examples: true },
      take: 200,
    });
    return rows.find((r) => {
      try { return JSON.parse(r.examples).length >= 3; } catch { return false; }
    }) ?? null;
  } catch {
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

/** The first seeded A1 phrase, in the dictionary's own order. Read-only. */
async function firstPhrase() {
  const prisma = newPrismaClient(resolveDatabaseUrl().url);
  try {
    const row = await prisma.lexeme.findFirst({
      where: { cefr: "A1", pos: "PHRASE", provenance: "SEED" },
      orderBy: [{ lemma: "asc" }, { id: "asc" }],
      select: { lemma: true },
    });
    return row?.lemma ?? null;
  } catch {
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

async function screensToMake() {
  const made = [];
  const missing = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });

  /*
    Each maker is given a budget and reports what it did, because this runs
    before the first check and a suite that dies before its first check prints
    nothing at all, which is what `scripts/lib/checks.mjs` exists to stop
    looking like a pass. A maker that overruns leaves its screen unmeasured and
    says so through `absent`, rather than taking the whole suite down with it.
  */
  const budgeted = async (what, ms, run) => {
    const started = Date.now();
    let timer;
    /*
      A page of its own for each, because they do not share a subject and were
      sharing state. The scan maker ran on the page the exam had just handed a
      paper in on, and its `getByLabel` found no camera on a deployment that
      has one, which reads exactly like "no provider key here" and is not that
      at all.
    */
    const own = await ctx.newPage();
    const result = await Promise.race([
      run(own).catch((e) => ({ failed: String(e).split("\n")[0] })),
      new Promise((resolve) => { timer = setTimeout(() => resolve({ failed: `gave up after ${ms}ms` }), ms); }),
    ]);
    clearTimeout(timer);
    await own.close().catch(() => {});
    const took = `${Math.round((Date.now() - started) / 100) / 10}s`;
    if (typeof result === "string") { console.log(`made  ${what}: ${result} (${took})`); return result; }
    // Deliberately not the word a waiver prints. `scripts/lib/checks.mjs` owns
    // that word and the number behind it, and an invariant fails on a suite
    // that prints it from anywhere else: it would say the same thing to a
    // person and nothing at all to the tally.
    console.log(`unmade  ${what}: ${result?.failed ?? "not reached"} (${took})`);
    return null;
  };

  /*
    Every group this account is in, not the first one.

    `/class/[classroomId]` renders two different screens off one route: a
    teacher's roster, and a sponsor's view of a workplace group, which shows
    strictly less and is a different component (`WorkplaceView`). Taking
    `.first()` measured whichever the index happened to list first and called
    the route covered, so adding the second kind to `scripts/demo-data.ts`
    would have *swapped* which of the two was ever drawn rather than adding to
    it. A route that renders two screens needs both of them walked.
  */
  const classrooms = await budgeted("the groups this account is in", 60_000, async (page) => {
    await page.goto(`${B}/class`, { waitUntil: "networkidle", timeout: 30_000 });
    const links = page.locator('a[href^="/class/"]');
    const found = [];
    for (let i = 0; i < await links.count(); i += 1) {
      const href = await links.nth(i).getAttribute("href");
      if (href && !found.includes(href)) found.push(href);
    }
    if (found.length > 0) return found.join(" ");
    await page.getByLabel("Class name").fill("Containment, teisipäev", { timeout: 10_000 });
    await page.getByRole("button", { name: /Create the class/ }).click({ timeout: 10_000 });
    await eventually(async () => /\/class\/[^/]+$/.test(page.url()), { timeoutMs: 20_000 });
    return /\/class\/[^/]+$/.test(page.url()) ? new URL(page.url()).pathname : null;
  });
  if (classrooms) made.push(...classrooms.split(" "));
  else missing.push("a classroom, which local mode cannot create by hand: run `npm run demo`");

  /*
    A phrase waiting on the Learn page. The card offers "Learn N phrases" as a
    button of its own only where one is waiting, and the demo deck is nouns
    and verbs, so that button was on no page this suite opened and was drawn
    a letter a line from 1024 up with every check here passing. One phrase is
    added the way a learner adds one, off its dictionary entry; which phrase
    is read off the database rather than typed, so no Estonian is written
    here.
  */
  const phrase = await budgeted("a phrase waiting on the Learn page", 45_000, async (page) => {
    await page.goto(`${B}/learn`, { waitUntil: "networkidle", timeout: 30_000 });
    if (await page.locator('a[href="/learn/new?kind=phrase"]').count()) return "already waiting";
    const lemma = await firstPhrase();
    if (!lemma) throw new Error("the dictionary holds no seeded A1 phrase");
    await page.goto(`${B}/dictionary?q=${encodeURIComponent(lemma)}`, { waitUntil: "networkidle", timeout: 30_000 });
    // The button opens a panel and "Add" inside it is the press that adds,
    // which is the shape `scripts/e2e.mjs` drives.
    await page.getByRole("button", { name: /Add to deck/ }).first().click({ timeout: 10_000 });
    await page.getByRole("button", { name: /^Add$/ }).first().click({ timeout: 10_000 });
    await page.getByRole("button", { name: /In deck/ }).first().waitFor({ timeout: 15_000 });
    await page.goto(`${B}/learn`, { waitUntil: "networkidle", timeout: 30_000 });
    if (!(await page.locator('a[href="/learn/new?kind=phrase"]').count())) {
      throw new Error(`added ${lemma}, and the Learn page still offers no phrase`);
    }
    return `added ${lemma}`;
  });
  // A failure rather than a waiver: /learn is still measured without it, so
  // nothing is skipped, and a waiver would be a hole the shape of the report.
  check("the Learn page offers a phrase for the sweep to measure", Boolean(phrase), "see the line above");

  /*
    A round over one shelf. `/words/decks` links to it only once the shelf
    holds a word, so it is read off that page rather than typed, and the demo
    fixture lays the shelf down for the reason it lays the class down.
  */
  const shelf = await budgeted("a shelf with words on it", 30_000, async (page) => {
    await page.goto(`${B}/words/decks`, { waitUntil: "networkidle", timeout: 30_000 });
    return page.locator('a[href^="/review/deck/"]').first().getAttribute("href", { timeout: 5_000 });
  });
  if (shelf) made.push(shelf);
  else missing.push("a shelf with words on it, which the demo fixture lays down: run `npm run demo`");

  // A marked paper: sat, advanced part by part with the blanks left blank, and
  // handed in. The blanks are the point elsewhere and harmless here.
  const result = await budgeted("a marked paper", 120_000, async (page) => {
    // A seed of this run's own: a paper is sat once, and one an earlier run
    // handed in opens on its result, with no clock to start.
    await page.goto(`${B}/exam/A2?seed=containment-result-${Date.now().toString(36)}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.getByRole("button", { name: "Start the clock" }).click({ timeout: 10_000 });
    for (let part = 0; part < 8 && !/\/exam\/result\//.test(page.url()); part += 1) {
      for (const name of [/^Next part|^Hand in$/, /Leave them blank and move on|Hand in anyway/, /Start the spoken part/]) {
        const on = page.getByRole("button", { name }).first();
        if (await on.count()) {
          await on.click({ timeout: 8_000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }
    }
    await eventually(async () => /\/exam\/result\//.test(page.url()), { timeoutMs: 20_000 });
    return /\/exam\/result\//.test(page.url()) ? new URL(page.url()).pathname : null;
  });
  if (result) made.push(result); else missing.push("a marked paper could not be handed in");

  /*
    A scanned page. The model is the one thing stubbed, exactly as
    `scripts/test-scan.mjs` stubs it, because what is being measured is the
    confirmation screen rather than anybody's reading of a photograph. With no
    provider key on the server the page correctly offers no camera, and then
    this screen is genuinely unreachable rather than broken.
  */
  const aboveA1 = await wordAboveA1();
  const scan = await budgeted("a scanned page", 90_000, async (page) => {
    await page.route("**/api/scan", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-model-provider": "Stub", "x-model-id": "test" },
      body: JSON.stringify({
        // The word above A1 first: its cards are written first, so the page's
        // drill deals its first meeting before the invented word's typed card,
        // which the walk below cannot answer.
        items: [
          ...(aboveA1 ? [{
            et: aboveA1.lemma, en: aboveA1.translation, lexemeId: aboveA1.id, lemma: aboveA1.lemma,
            translation: aboveA1.translation, matchedAs: null, cefr: aboveA1.cefr,
          }] : []),
          { et: UNVOUCHED, en: "a word off the page", lexemeId: null, lemma: null, translation: null, matchedAs: null, cefr: null },
        ],
        summary: { total: aboveA1 ? 2 : 1, known: aboveA1 ? 1 : 0, unknown: 1, inflected: 0 },
      }),
    }));
    await page.goto(`${B}/scan`, { waitUntil: "networkidle", timeout: 30_000 });
    const link = page.locator('a[href^="/scan/"]').first();
    if (await link.count()) return link.getAttribute("href");
    /*
      Waited for rather than counted straight away. The capture control is
      rendered by a client component, so on a page object that has already been
      round several other screens `networkidle` can land a beat before it
      exists, and counting then reports "no camera on this deployment" about a
      deployment that has one.
    */
    const camera = page.getByLabel(/take a photo/i).first();
    await camera.waitFor({ state: "attached", timeout: 8_000 }).catch(() => {});
    if (!(await camera.count())) throw new Error("the page offers no camera, so this deployment has no provider key");
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "page.png", mimeType: "image/png", buffer: await page.screenshot(),
    });
    await page.getByText(/word.* (?:ticked|checked)/i).first().waitFor({ timeout: 20_000 }).catch(() => {});
    // "Make 1 flashcard", which is what the button says. Matched loosely on
    // the count, because it names how many words were ticked.
    const add = page.getByRole("button", { name: /Make \d+ flashcard/ }).first();
    if (await add.count()) {
      await add.click({ timeout: 8_000 }).catch(() => {});
      /*
        And then "Open the page", which is a document load rather than a
        `router.push` and is the tap that finishes the paper-to-deck path.
        `app/(app)/scan/ScanCapture.tsx` says why in as many words: the push
        silently did nothing three times in ten.
      */
      const open = page.getByRole("button", { name: /Open the page/ }).first();
      await open.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
      if (await open.count()) await open.click({ timeout: 8_000 }).catch(() => {});
      await eventually(async () => /\/scan\/[^/]+$/.test(page.url()), { timeoutMs: 20_000 });
    }
    if (!/\/scan\/[^/]+$/.test(page.url())) {
      throw new Error(`the photo was taken but the deck never took it: still on ${new URL(page.url()).pathname}`);
    }
    return new URL(page.url()).pathname;
  });
  if (scan) made.push(scan);
  else missing.push("a scanned page, which needs a provider key on the server for the camera to be offered");

  await ctx.close();
  return { made, missing };
}

const { made, missing } = await screensToMake();
/*
  Twenty: five checks on each of the three widths, and five more in the dark.
  Written out rather than worked out, because a waiver whose number is an
  expression is a waiver nobody can check by reading it, and an invariant in
  `scripts/test-invariants.ts` says so.
*/
for (const why of missing) absent(20, why);
const ALL = [...ROUTES, ...made];

/**
 * FIGURES SIDE BY SIDE SIT ON ONE LINE.
 *
 * Reported off Progress: a row of five counts under "Out there", where the
 * first carried a small icon stacked above its number and so sat a line lower
 * than the four beside it. Nothing above could see it: nothing is cut off,
 * nothing bleeds, nothing breaks, and each figure is exactly where its own box
 * put it. It is a fault of relation between neighbours, so it is asked as one.
 *
 * A figure is `[data-figure]`, which `Stat` and `StatTile` carry, or any leaf
 * set at 24px or more whose words are a number, so a row somebody draws by
 * hand later is measured without anybody remembering to mark it. Its cell is
 * the ancestor that is a direct child of a grid or a flex row. Cells of one
 * container whose tops are level are one row, and in a row where every cell
 * holds exactly one figure, the first lines of the figures sit level.
 */
function figuresInRows() {
  const EPS = 2;
  const off = [];
  const shown = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    && el.getBoundingClientRect().width > 0.5;
  const numeric = /^[\s\d.,:%/+\u2212-]*\d[\s\d.,:%/+\u2212-]*[a-z%€$]{0,3}$/i;
  const figures = new Set(document.querySelectorAll("[data-figure]"));
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length || !numeric.test((el.textContent || "").trim())) continue;
    if (parseFloat(getComputedStyle(el).fontSize) >= 24) figures.add(el);
  }
  const rows = new Map();
  for (const fig of figures) {
    if (!shown(fig) || fig.closest("[aria-hidden='true'], .sr-only, table, svg")) continue;
    let cell = fig;
    let container = null;
    while (cell.parentElement && cell.parentElement !== document.body) {
      const cs = getComputedStyle(cell.parentElement);
      const grid = cs.display === "grid" || cs.display === "inline-grid";
      const row = (cs.display === "flex" || cs.display === "inline-flex") && cs.flexDirection.startsWith("row");
      if ((grid || row) && [...cell.parentElement.children].filter(shown).length > 1) {
        container = cell.parentElement;
        break;
      }
      cell = cell.parentElement;
    }
    if (!container || cell === fig) continue;
    const cells = rows.get(container) ?? new Map();
    const list = cells.get(cell) ?? [];
    list.push(fig);
    cells.set(cell, list);
    rows.set(container, cells);
  }
  const named = (el) => `"${(el.textContent || "").trim().slice(0, 12)}"`;
  const firstLineBottom = (el) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const i = n.textContent.search(/\S/);
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (r) return r.bottom;
    }
    return el.getBoundingClientRect().bottom;
  };
  for (const cells of rows.values()) {
    // One row is cells whose heights overlap by more than half the shorter,
    // rather than cells whose tops are level: a row whose cells are centred
    // puts a taller cell's top higher, and grouping on the top would file the
    // very figure that sits off its neighbours into a row of its own.
    const entries = [...cells.entries()]
      .filter(([, figs]) => figs.length === 1)
      .map(([cell, [fig]]) => ({ box: cell.getBoundingClientRect(), fig }))
      .sort((a, b) => a.box.top - b.box.top);
    const lines = [];
    for (const e of entries) {
      const line = lines.find((l) => {
        const a = l[0].box;
        const overlap = Math.min(a.bottom, e.box.bottom) - Math.max(a.top, e.box.top);
        return overlap > Math.min(a.height, e.box.height) / 2;
      });
      if (line) line.push(e);
      else lines.push([e]);
    }
    for (const figs of lines.map((l) => l.map((e) => e.fig))) {
      if (figs.length < 2) continue;
      // The first line of each figure, read off its first character, so a
      // figure that runs to two lines ("510 to 700 h") is compared on the line
      // a reader lines up, and two sizes of figure are compared on where their
      // letters sit rather than on the box around them.
      const bottoms = figs.map(firstLineBottom);
      const spread = Math.max(...bottoms) - Math.min(...bottoms);
      if (spread > EPS + 1) {
        const low = figs[bottoms.indexOf(Math.max(...bottoms))];
        off.push(`${named(low)} sits ${Math.round(spread)}px off the ${figs.length - 1} beside it`);
      }
    }
  }
  return { off: [...new Set(off)], rows: rows.size };
}

/**
 * A MARKER AND ITS LABEL ARE ONE LINE, AND RELATIVES LOOK ALIKE.
 *
 * Reported off Practice: four buttons, each a coloured dot and a word, and on
 * one of them the word had wrapped onto a line of its own under the dot,
 * because the row was `flex-wrap` and "Describing words" was the one label too
 * long to sit beside it. Nothing above could see it: nothing is cut off,
 * nothing bleeds, no word breaks, and the button is exactly the size it was
 * given. It is a fault of relation rather than of size, so it gets questions of
 * its own.
 *
 * A marker is a leading child with no text of its own and no more than 48px
 * each way: a dot, an icon, an icon on a tint. Two questions about one:
 *
 * - the text that follows it starts on the marker's line and to its right,
 *   never underneath it; and
 * - where several items share a class and each leads with a marker, the label
 *   starts at the same distance in on every one of them and the marker sits at
 *   the same height against the label's first line. One item doing something
 *   its relatives do not is the sore thumb.
 */
function relatives() {
  const EPS = 2;
  const wrapped = [];
  const unlike = [];
  const unbalanced = [];
  const unevenly = [];
  const shown = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    && (el.getBoundingClientRect().width > 0.5 || el.getBoundingClientRect().height > 0.5);
  const named = (el) => {
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
    return `${el.tagName.toLowerCase()}${text ? ` "${text}"` : ""}`;
  };
  // A control is not a marker: a star button beside a text button is a row of
  // two controls, and a row of controls may wrap. A radio or a checkbox beside
  // its label is the relation this asks about, so an input still counts.
  const isMarker = (el) => {
    if (!el || (el.textContent || "").trim()) return false;
    if (el.matches("button, a, [role='button']") || el.querySelector("button, a, [role='button']")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.width <= 48 && r.height <= 48;
  };
  const firstLine = (el) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const i = n.textContent.search(/\S/);
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (r) return r;
    }
    return null;
  };
  // Every row that leads with a marker, whatever it is.
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("[aria-hidden='true'], .sr-only, table, svg")) continue;
    const kids = [...el.children].filter(shown);
    if (kids.length < 2 || !isMarker(kids[0])) continue;
    // The label is the first text after the marker, bare or wrapped: a legend
    // row is often a dot, a bare word, then a count in a span of its own.
    if (!(el.textContent || "").trim() || !shown(el)) continue;
    const cs = getComputedStyle(el);
    const row = (cs.display === "flex" || cs.display === "inline-flex") && cs.flexDirection.startsWith("row");
    const grid = cs.display === "grid" || cs.display === "inline-grid";
    if (!row && !grid) continue;
    const m = kids[0].getBoundingClientRect();
    const line = firstLine(el);
    if (!line) continue;
    rows.push({ el, m, line });
    // Under the marker is the fault; a stacked layout says so with `flex-col`
    // and never reaches here.
    if (row && line.top >= m.bottom - EPS && line.left < m.right - EPS) {
      wrapped.push(`${named(el)}: its words wrapped under the marker`);
    }
  }
  /*
    A MARK BESIDE A HEADING IS BALANCED AGAINST IT.

    Reported three times off the page heading: a filled tile of an icon beside
    a heading several times its height, sitting on neither the heading's line
    nor its block, so the pair read as two things that happened to be near each
    other. Balanced is one of three states and nothing else: centred on the
    first line of the words beside it, centred on the whole block of them, or
    level with its top, which is how a tile beside a title and a line under it
    is drawn. A mark as big as a tile is asked this too, so the question is not
    limited to the 48px a marker is held to above.
  */
  const isMark = (el) => {
    if (!el || (el.textContent || "").trim()) return false;
    if (el.matches("button, a, [role='button'], input") || el.querySelector("button, a, [role='button'], input")) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 6 && r.height >= 6 && r.width <= 96 && r.height <= 96;
  };
  const headingLike = (el) => {
    const h = el.matches("h1, h2, h3, h4") ? el : el.querySelector("h1, h2, h3, h4");
    if (h && shown(h)) return h;
    return null;
  };
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("[aria-hidden='true'], .sr-only, table, svg")) continue;
    const kids = [...el.children].filter(shown);
    if (kids.length < 2 || !isMark(kids[0]) || !shown(el)) continue;
    const cs = getComputedStyle(el);
    if (!((cs.display === "flex" || cs.display === "inline-flex") && cs.flexDirection.startsWith("row"))) continue;
    const h = headingLike(kids[1]);
    if (!h) continue;
    const line = firstLine(h);
    if (!line) continue;
    const m = kids[0].getBoundingClientRect();
    const words = kids[1].getBoundingClientRect();
    const mid = m.top + m.height / 2;
    const onLine = Math.abs(mid - (line.top + line.height / 2)) <= 3;
    const onBlock = Math.abs(mid - (words.top + words.height / 2)) <= 3;
    const onTop = Math.abs(m.top - words.top) <= 3 && m.height >= line.height;
    if (!onLine && !onBlock && !onTop) {
      unbalanced.push(`${named(h)}: its mark sits ${Math.round(mid - (line.top + line.height / 2))}px off the first line`);
    }
  }

  /*
    HOW MANY LINES AN ELEMENT'S WORDS ARE DRAWN ON, counted off the glyphs
    rather than the box: a box is as tall as its tallest child, and a marker or
    a padded chip makes one line look like two. Tops within a few pixels are
    one line, because a bold count beside a lighter word sits a pixel apart.
  */
  const linesOf = (el) => {
    const tops = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        if (!tops.some((t) => Math.abs(t - r.top) <= 4)) tops.push(r.top);
      }
    }
    return tops.length;
  };

  /*
    RELATIVES WRAP ALIKE OR NOT AT ALL.

    Reported off the climb on Today: two legend keys, "13 you've shown you
    know" on one line and "993 counted from your level, not tested yet" on two,
    the second breaking inside itself while the first sat whole. Every check
    above passed it, because the second line started under the label rather
    than under the marker, nothing was cut off and no word broke. What is wrong
    is the relation: things drawn as a set are read as a set, and one of them
    taking two lines where its siblings take one reads as a different kind of
    thing. So among siblings sharing a parent and a class that are drawn as
    pieces of a set (a row led by a marker, or an inline box such as a chip or a
    legend key) and short enough to be labels, every one under `LABEL_CHARS`,
    either all sit on one line or none of them may. A label that wraps can
    always be said shorter or given a line of its own, which is what the report
    asked for, whether the set sits side by side or stacks.

    A set holding anything longer is content rather than labels and is left
    alone: a checklist of reasons, an answer option carrying its English, a tile
    with a title and a description. Those wrap where the sentence is long, and
    a rule demanding they match would be waived on its first run.
  */
  const LABEL_CHARS = 60;
  const pieces = new Map();
  const asPiece = (el) => {
    const cls = el.getAttribute("class");
    if (!cls || !el.parentElement || !(el.textContent || "").trim() || !shown(el)) return;
    const list = pieces.get(el.parentElement) ?? new Map();
    const same = list.get(cls) ?? new Set();
    same.add(el);
    list.set(cls, same);
    pieces.set(el.parentElement, list);
  };
  for (const r of rows) asPiece(r.el);
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("[aria-hidden='true'], .sr-only, table, svg")) continue;
    const d = getComputedStyle(el).display;
    if (d === "inline-flex" || d === "inline-block" || d === "inline-grid") asPiece(el);
  }
  for (const list of pieces.values()) {
    for (const set of list.values()) {
      if (set.size < 2) continue;
      const counted = [...set].map((el) => ({
        el,
        n: linesOf(el),
        chars: (el.textContent || "").trim().replace(/\s+/g, " ").length,
      }));
      if (!counted.every((c) => c.chars <= LABEL_CHARS)) continue;
      const odd = counted.find((c) => c.n > 1);
      if (odd && counted.some((c) => c.n === 1)) {
        unevenly.push(`${named(odd.el)} takes ${odd.n} lines where a relative takes one`);
      }
    }
  }

  // Relatives: rows sharing a parent and a class.
  const groups = new Map();
  for (const r of rows) {
    const cls = r.el.getAttribute("class");
    if (!cls || !r.el.parentElement) continue;
    const key = r.el.parentElement;
    const list = groups.get(key) ?? new Map();
    const same = list.get(cls) ?? [];
    same.push(r);
    list.set(cls, same);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    for (const same of list.values()) {
      if (same.length < 2) continue;
      const box = (r) => r.el.getBoundingClientRect();
      const inset = same.map((r) => r.line.left - box(r).left);
      const level = same.map((r) => (r.m.top + r.m.height / 2) - (r.line.top + r.line.height / 2));
      const spread = (xs) => Math.max(...xs) - Math.min(...xs);
      if (spread(inset) > EPS || spread(level) > EPS) {
        const odd = same[inset.indexOf(Math.max(...inset))] ?? same[0];
        unlike.push(`${named(odd.el)} sits unlike its ${same.length - 1} relatives`);
      }
    }
  }
  const first = (list) => [...new Set(list)].slice(0, 3).join(" · ");
  return {
    wrapped: [...new Set(wrapped)].length,
    unlike: [...new Set(unlike)].length,
    unbalanced: [...new Set(unbalanced)].length,
    unevenly: [...new Set(unevenly)].length,
    rows: rows.length,
    say: { wrapped: first(wrapped), unlike: first(unlike), unbalanced: first(unbalanced), unevenly: first(unevenly) },
  };
}

/**
 * One pass over whatever a page is showing: the four questions, then the same
 * four with every run of text swapped for one of the same length that cannot
 * break.
 *
 * `atLeast` rides along on the first check rather than getting one of its own.
 * A route that rendered an error boundary has a heading and a button on it and
 * passes all four on the strength of having almost nothing to look at, which
 * is the failure `scripts/lib/checks.mjs` exists for arriving one level
 * further in: the block ran, it just ran over an empty page.
 */
async function measure(page, label, atLeast = 25) {
  const rest = await page.evaluate(survey, { stress: false });
  check(
    `nothing is cut off on ${label}`,
    rest.cut === 0 && rest.counted >= atLeast,
    rest.cut > 0 ? rest.say.cut
      : rest.counted < atLeast ? `only ${rest.counted} things on the page, expected ${atLeast}` : "",
  );
  check(`nothing bleeds over a border on ${label}`, rest.bled === 0, rest.say.bled);
  check(`nothing is drawn into its neighbor on ${label}`, rest.collided === 0, rest.say.collided);
  check(`no icon is deformed on ${label}`, rest.deformed === 0, rest.say.deformed);
  check(`no ordinary word is broken across lines on ${label}`, rest.split === 0, rest.say.split);
  const fitted = await page.evaluate(fitsAnyWord);
  check(
    `a word set large shrinks to fit rather than breaking, whatever the word, on ${label}`,
    fitted.broken.length === 0,
    fitted.broken.slice(0, 3).join(" · "),
  );
  const whole = await page.evaluate(wholeWords);
  check(`no word is drawn across two lines on ${label}`, whole.broken === 0, whole.say.broken);
  check(`no button label is wider than its button on ${label}`, whole.overflowing === 0, whole.say.overflowing);
  const level = await page.evaluate(figuresInRows);
  check(`figures side by side sit on one line on ${label}`, level.off.length === 0, level.off.slice(0, 3).join(" · "));
  const kin = await page.evaluate(relatives);
  check(`no label wraps under its own marker on ${label}`, kin.wrapped === 0, kin.say.wrapped);
  check(`relatives sit alike, marker to label, on ${label}`, kin.unlike === 0, kin.say.unlike);
  check(`every mark beside a heading is balanced against it on ${label}`, kin.unbalanced === 0, kin.say.unbalanced);
  check(`a set of labels sits one line each or none of it does, on ${label}`, kin.unevenly === 0, kin.say.unevenly);
  /*
    The middot is on no screen, and this is the half the source check cannot
    reach: a hint or a government string stored in somebody's deck before the
    dot went still carries it, and only what the page actually drew says
    whether it arrived.
  */
  const dotted = await page.evaluate(() => {
    const text = document.body.innerText;
    const at = text.indexOf("\u00b7");
    return at < 0 ? "" : text.slice(Math.max(0, at - 30), at + 30).replace(/\s+/g, " ");
  });
  check(`no middot is drawn on ${label}`, dotted === "", dotted);

  const hard = await page.evaluate(survey, { stress: true });
  check(
    `the same words with nothing to break on stay in their boxes on ${label}`,
    hard.cut === 0 && hard.bled === 0 && hard.collided === 0 && hard.deformed === 0 && hard.sideways <= 0,
    [hard.say.cut, hard.say.bled, hard.say.collided, hard.say.deformed,
     hard.sideways > 0 ? `${hard.sideways}px sideways` : ""].filter(Boolean).join(" · "),
  );
}

/**
 * THE WAIT IS WHAT THIS IS ABOUT TO MEASURE, NOT WHETHER THE NETWORK WENT QUIET.
 *
 * `networkidle` is what this loop waited on and it threw in CI on
 * `/review/clinic` after 720 checks, sixty seconds on a page that renders in
 * 47ms and reaches idle in under a second on a developer's own machine. That
 * wait is a known-fragile one and Playwright discourages it: the service worker
 * fetches the shell a URL at a time and `PrefetchLink` fetches a whole page
 * whenever a pointer settles, so on a two-core runner the network can keep
 * finding something to do for longer than any ceiling worth setting. It is
 * also the wrong question. Every check below measures *geometry*, so what it
 * needs is the page laid out, which `test-first-day.mjs` already waits for by
 * name and which this now does too.
 *
 * NOTHING IS SKIPPED BY IT. The checks are the same checks and the floor is
 * the same floor; only the moment they run at is decided by the thing they are
 * about. The wait is best-effort for that reason: a page that really does
 * render nothing runs its budget out and is measured anyway, and the checks
 * say what they found, where a throw here loses the 565 checks that had not
 * run yet and reports one timeout instead.
 */
async function ready(page, budgetMs) {
  await page.waitForSelector("main", { timeout: budgetMs }).catch(() => {});
  await page
    .waitForFunction(
      () => {
        const main = document.querySelector("main");
        return Boolean(main) && (main.innerText || "").trim().length > 0;
      },
      undefined,
      { timeout: budgetMs },
    )
    .catch(() => {});
  // The fonts decide where text sits, and a box measured mid-swap is a box
  // measured at the wrong width.
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(250);
}

/** Every route, in one context, at whatever width and theme it was opened at. */
async function sweep(ctx, at) {
  const page = await ctx.newPage();
  for (const route of ALL) {
    await page.goto(`${B}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await ready(page, 30000);
    /*
      A round opens on the screen saying what it is, and the round is not
      behind it: measuring that screen instead of the round would be this
      sweep quietly stopping at the door of twenty of its routes, which is
      the fault its own waivers have twice been written about.
    */
    await startRound(page, { waitMs: 500 });
    await measure(page, `${route} ${at}`, SPARSE.get(route) ?? 25);
  }
  await page.close();
}

/*
  THE LANDING PAGE WITH EVERY DISCLOSURE OPEN, which is a third of that page
  and had never been looked at.

  A closed `<details>` is skipped contents: `checkVisibility` says so, which is
  what stopped this suite reporting the comparison panel as bleeding when it
  was shut. The other half of that fact is that the panel's whole argument, its
  eight-claim grid and its four credit cards, is unmeasured until somebody
  opens it, and this page is the first thing anybody sees.
*/
async function openedWelcome(ctx, at) {
  const page = await ctx.newPage();
  await page.goto(`${B}/welcome`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    for (const d of document.querySelectorAll("details")) d.open = true;
  });
  await page.waitForTimeout(400);
  await measure(page, `/welcome with every disclosure open ${at}`);
  await page.close();
}

/*
  THE EXAMINATION PAPER, BEING SAT. Not in the route list because it takes a
  click to reach and is worth the extra load anyway: it is the densest screen
  in the app and the one that has already produced this fault twice, once as a
  diacritic bar a pixel wider than a phone has room for, and once as a chip
  carrying a dictionary gloss ("gymnasium, secondary school, high school") that
  would not wrap, at 404px of unbreakable line inside a 350px card. Both were
  found on a device rather than by a check, which is the argument for the check.
*/
async function paperBeingSat(ctx, at) {
  const page = await ctx.newPage();
  await page.goto(`${B}/exam/A2?seed=containment`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("button", { name: "Start the clock" }).click();
  await page.waitForTimeout(700);
  await measure(page, `the A2 paper ${at}`);
  await page.close();
}

/*
  TODAY FOR SOMEBODY WHO SAID WHAT LEVEL THEY HOLD.

  The climb on Today draws a second band and a two-key legend only where a
  level below the learner's own is credited rather than checked, and the
  fixture holds no level, so the sweep had never seen either. That is where
  one legend key was reported wrapping onto two lines while its sibling sat on
  one. A declared B1 is written for the length of one page load, timestamped
  now so it outranks anything measured, and the rows that were there before
  are put back whatever happened in between, because every suite after this
  one reads the same learner.
*/
const LOCAL_OWNER = "local-single-user";
async function creditedToday(ctx, at) {
  const prisma = newPrismaClient(requireLocalDatabase("write a declared level and put back what was there"));
  const keys = ["cefrPlacement", "cefrPlacementAt"];
  const before = await prisma.setting.findMany({ where: { ownerId: LOCAL_OWNER, key: { in: keys } } });
  const page = await ctx.newPage();
  try {
    for (const [key, value] of [["cefrPlacement", "B1"], ["cefrPlacementAt", new Date().toISOString()]]) {
      await prisma.setting.upsert({
        where: { ownerId_key: { ownerId: LOCAL_OWNER, key } },
        update: { value },
        create: { ownerId: LOCAL_OWNER, key, value },
      });
    }
    await page.goto(`${B}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await ready(page, 30000);
    await measure(page, `Today with a level held ${at}`);
  } finally {
    await page.close();
    await prisma.setting.deleteMany({ where: { ownerId: LOCAL_OWNER, key: { in: keys } } });
    if (before.length) await prisma.setting.createMany({ data: before });
    await prisma.$disconnect();
  }
}

/*
  THE STATES A ROUTE DOES NOT ARRIVE IN.

  Everything above measures a page as it loads, and three of the boxes in this
  app only exist once somebody asks for them. The command palette and Anu's
  panel are drawn over the page from anywhere in it, and a review card spends
  half its life with the answer hidden and the other half with it shown, which
  is a different amount of text in the same card.

  A modal covering the page is not reported as drawing into it: the hit test
  skips anything under something `fixed`, deliberately, because that is
  layering rather than a fault. What is being asked here is whether the modal
  contains its own contents.
*/
async function askedForStates(ctx, at) {
  const page = await ctx.newPage();
  await page.goto(`${B}/`, { waitUntil: "networkidle", timeout: 60000 });

  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  await measure(page, `the command palette ${at}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  const anu = page.getByRole("button", { name: "Ask Anu" }).first();
  if (await anu.count()) {
    await anu.click();
    await page.waitForTimeout(500);
    await measure(page, `Anu's panel ${at}`);
  } else {
    absent(5, `Anu's panel ${at}, which needs the tutor to be reachable`);
  }

  /*
    A REVEALED CARD, WHICHEVER OF THE THREE SHAPES IT CAME IN.

    This pressed "Show answer" and waived when there was none, on the reason
    that the deck had nothing due. The deck had forty cards due. Review asks a
    card as a flip, as multiple choice or as typing, decided per card, and the
    one that comes up on the demo fixture is a choice card, which has no flip
    button at all. So these ten checks, five at each width, had never once run,
    and the line saying why told anybody reading it to go and seed a database
    that was already seeded.

    The revealed layout is the same whichever way the question was asked, and
    it is the one with the most in it: the answer, the note about why this
    card, and four rating buttons across a 360px phone.

    It reveals and never grades. This suite runs third and everything after it
    reads the same deck.
  */
  await page.goto(`${B}/review`, { waitUntil: "networkidle", timeout: 60000 });
  await startRound(page);
  const shape = await revealAnswer(page);
  if (shape) {
    await page.waitForTimeout(450);
    await measure(page, `a review card with its answer shown ${at}, asked as ${shape}`);
  } else {
    absent(5, `a revealed review card ${at}: /review offered no card of any shape, ` +
      "so this deck genuinely has nothing due. Run `npm run demo`");
  }

  /*
    A FIRST MEETING WITH A WORD OUT OF ITS SENTENCE OPEN.

    The teaching sentence has a dictionary under it, and what a tapped word
    opens is a panel *inside* the card: a headword, which form of it this is,
    its English and a button. No URL reaches that, and it is the densest thing
    in the smallest box on the screen, which is exactly the shape this suite
    exists for.

    WHERE IT IS WALKED, AND WHY IT FAILS RATHER THAN WAIVES. It used to be
    `/learn/new`, which meets whatever the deck holds next. A1 words are met
    with no sentence at all (`WordIntro`, since #285), and the fixture's
    words are A1, so from that day the walk found no sentence on any run,
    waived five checks at each width, and blamed the fixture ("Run `npm run
    demo`") for a fault that was its own. Its intro button regex was exact on
    "Ready" as well, and the key cap makes that button's name "Ready ↵", so
    it could not have got past the first screen even on a deck that had one.

    An A2 unit's lesson meets words that carry a sentence whatever the deck
    holds, because a lesson plans from the unit rather than from the queue,
    and the dictionary is seeded wherever this suite runs. So a panel that
    does not open there is the markup failing, and is reported as that.
  */
  await page.goto(`${B}/learn/${A2_UNIT}/lesson`, { waitUntil: "networkidle", timeout: 60000 });
  await startRound(page);
  let opened = false;
  for (let tries = 0; tries < 12 && !opened; tries += 1) {
    const words = page.locator("main p[lang=et] button");
    if (await words.count()) {
      await words.last().click().catch(() => {});
      opened = (await page.getByRole("button", { name: /Add to my deck/ }).count()) > 0;
      if (opened) break;
    }
    // Into the lesson, then past a meet step whose sentence held no word the
    // dictionary vouches for. `\b` rather than `$`: a key cap is part of a
    // button's accessible name.
    const on = page.getByRole("button", { name: /^(Start these|Got it)\b/ });
    if (await on.count()) await on.first().click().catch(() => {});
    await page.waitForTimeout(500);
  }
  /*
    AND WHERE THE LADDER DEALT NO SUCH MEETING, THE SCANNED PAGE'S OWN DRILL.

    The demo fixture's ladder is full of A1 words already past their first
    meeting, so the loop above finds nothing to tap there on every run. The
    page made above carries one vouched word above A1, ticking it built that
    word's cards, and the page's drill opens on its first meeting, which is
    the same `WordIntro` with the same dictionary under the same sentence.
  */
  const scanPath = made.find((path) => /^\/scan\/[^/]+$/.test(path));
  if (!opened && scanPath) {
    await page.goto(`${B}/review?scan=${encodeURIComponent(scanPath.split("/").pop())}`, {
      waitUntil: "networkidle", timeout: 60000,
    });
    await startRound(page);
    for (let tries = 0; tries < 6 && !opened; tries += 1) {
      const words = page.locator("main p[lang=et] button");
      if (await words.count()) {
        await words.last().click().catch(() => {});
        opened = (await page.getByRole("button", { name: /Add to my deck/ }).count()) > 0;
        if (opened) break;
      }
      const met = page.getByRole("button", { name: /^Got it\b/ });
      if (await met.count()) await met.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  if (opened) {
    await page.waitForTimeout(300);
    await measure(page, `a word opened out of a teaching sentence ${at}`);
  } else {
    check(`a word opened out of a teaching sentence ${at}`, false,
      `/learn/${A2_UNIT}/lesson met no word whose sentence opened a panel with "Add to my deck"`);
  }

  /*
    A CONVERSATION IN PROGRESS, which no URL reaches.

    `/situations/[id]` loads on the briefing and the talking screen replaces it
    in place, so the sweep above measures the card and the dial and never the
    thing they lead to: a log of Estonian in a fixed-height scroller, a text
    field, the letter bar, and four controls in a row, which at 360 is the
    tightest row of buttons in the app after the rating keys.

    Pressed until it lands rather than waited on, for the reason
    `test-scene.mjs` gives at length: a button rendered on the server is
    clickable and inert, so a single click into a hydrating page is swallowed
    and waiting longer cannot recover it.
  */
  await page.goto(`${B}/situations/arsti-aeg`, { waitUntil: "networkidle", timeout: 60000 });
  const start = page.getByRole("button", { name: /Start the conversation/i });
  let talking = false;
  for (let tries = 0; tries < 20 && !talking; tries += 1) {
    if (await start.count()) await start.click().catch(() => {});
    talking = (await page.getByRole("log").count()) > 0
      && (await page.locator('[role="log"] p').count()) > 0;
    if (!talking) await page.waitForTimeout(700);
  }
  if (talking) {
    await measure(page, `a conversation in progress ${at}`);
  } else {
    absent(5, `a conversation in progress ${at}: the scene could not be opened, which ` +
      "needs the dictionary seeded. Run `npm run db:seed`");
  }

  await page.close();
}

for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    hasTouch: width < 768,
    isMobile: width < 768,
    // The animations are what would otherwise be measured: `pop-in` scales a
    // card past its own box for 450ms, and a suite that races that reports a
    // different answer every run.
    reducedMotion: "reduce",
  });

  await sweep(ctx, `at ${width}`);
  await openedWelcome(ctx, `at ${width}`);
  await paperBeingSat(ctx, `at ${width}`);
  await creditedToday(ctx, `at ${width}`);
  if (width !== 768) await askedForStates(ctx, `at ${width}`);

  await ctx.close();
}

/*
  AND THE WHOLE APP IN THE DARK, once, at the width where containment fails
  first. The palette in app/globals.css reads `data-theme` and nothing else,
  so the theme is chosen the way a reader chooses it: stored, and read back
  by the inline script in app/layout.tsx before the first paint. Emulating
  `prefers-color-scheme` would measure the light theme a second time.
*/
{
  const ctx = await browser.newContext({
    viewport: { width: DARK_WIDTH, height: 900 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  await ctx.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch { /* private mode */ } });
  await sweep(ctx, `at ${DARK_WIDTH} in the dark`);
  await ctx.close();
}

await browser.close();

done();
