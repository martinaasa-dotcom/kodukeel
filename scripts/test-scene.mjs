#!/usr/bin/env node
import { eventually, launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

/**
 * A whole conversation, played through, in a browser.
 *
 * The pieces have tests of their own and none of them can see this. `turn.ts`
 * marks a turn, `state.ts` advances a scene, `grades.ts` decides what reaches
 * the review log, `line.ts` walks the ladder, `catalogue.test.ts` holds the
 * scenes to what their units teach, and `scene.itest.ts` asks a real dictionary
 * whether a scene can be built at all. What none of them can answer is whether
 * the loop closes, and the loop here is six processes: a page, a server action
 * that draws and writes a run, a route that marks every turn and walks the
 * ladder, a client that never decides anything, a second marking of the same
 * transcript when it ends, and a debrief built out of that.
 *
 *   npm run dev
 *   node scripts/test-scene.mjs
 *
 * Written after four faults that only this could have found, which is the
 * argument for it rather than a note about its history. Three of the four
 * looked exactly like an app with nothing in it: the route returned a line
 * without saying which beat it was on, so "Say it" was disabled for the whole
 * run; the rate limiter's verdict was returned as though it were a `Response`,
 * so every turn was a 500; and the role card told a learner to read a word off
 * a place on the card where nothing was printed.
 *
 * IT RUNS IN WHATEVER STATE THE SERVER IS IN, and reports which. A composed
 * line needs a provider key and CI has none, so a suite that required one would
 * be a suite CI could not run and a suite that assumed none would fail on
 * anybody's own machine. `e2e.mjs` already answers this by asking the page what
 * it is showing rather than telling it, and the ladder is the same shape: what
 * every state shares is that a line arrives, it says where it came from, and
 * the scene can be finished.
 */
const B = baseUrl();
const OWNER = "local-single-user";
const SCENE = "arsti-aeg";

const prisma = newPrismaClient(requireLocalDatabase("play a scene through and read its debrief"));

const { check, absent, done } = suite("A conversation, end to end", {
  /*
    THE COUNT IN THE FULL STATE, which is a key configured, the allowance
    unspent and the bank holding a row for a beat the run reaches: 42.
    Keyless, the composed check is waived and the target drops by one; with
    an empty bank the scripted check is waived and it drops by one more. Each
    state differs by exactly as many checks as waivers, which is the
    arithmetic `absent` exists to keep honest and which the first version of
    this got wrong in both directions at once.

    The scripted waiver used to fire on every run in every state, because the
    label it read came back empty whatever the run did (see `listen`). It runs
    keyless now, which is the state the default deployment is in and the one
    the bank exists for.

    Three more since the room was put back above the conversation: one check
    where it opens and one at the bottom of a scrolled page, because a band that
    is drawn and a band that sticks are the same markup, and one for the role
    card's own line, which was marked sticky on an element that could not move
    and had never been looked at from a scrolled page.
  */
  floor: 54,
});

/*
  Its own runs and nothing else. `SceneRun` is a learner's own table and a broad
  delete would be fine on a scratch database and would quietly throw away
  somebody's transcripts on their own machine, which is the rule
  `test-suggestions.mjs` states about the report queue.
*/
async function runIds() {
  const rows = await prisma.sceneRun.findMany({
    where: { ownerId: OWNER, sceneId: SCENE }, select: { id: true }, orderBy: { id: "asc" },
  });
  return rows.map((row) => row.id);
}

/*
  Gaps first and by run id, because `SceneGap` has no foreign key to `SceneRun`:
  it carries the id as a plain column, which is `Review`'s own shape and for the
  same reason, so deleting a run cannot cascade a learner's record away.
*/
async function cleanUp() {
  const ids = await runIds();
  if (ids.length > 0) await prisma.sceneGap.deleteMany({ where: { runId: { in: ids } } });
  await prisma.sceneRun.deleteMany({ where: { ownerId: OWNER, sceneId: SCENE } });
}
await cleanUp();

const browser = await launchChromium();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

/*
  A composed turn can take twenty seconds on a provider having a bad minute,
  which is an ordinary Tuesday rather than a fault: the chain walks past it and
  the ladder has a rung below. So the waits here are generous and the failure
  says how long it waited, because a page that answered slowly and a page that
  never answered read identically without it.
*/
const TURN_MS = 30_000;
/**
 * What the gate lets a line be, which is not what this used to say.
 *
 * It read `MAX_WORDS` in `lib/scenes/retrieval.ts`, "which is what the gate
 * enforces", and that was true of a *retrieved* line and never of a composed
 * one: the leash came off the composer, `MAX_SENTENCES` is five and
 * `MAX_COMPOSED_WORDS` forty, and twelve checks pay for the room. So this
 * suite failed on every run with a key, on a line the app had deliberately
 * decided to allow, which is a check that has stopped saying anything about
 * the app and says something about the suite instead.
 */
const MAX_SPOKEN_WORDS = 40;
const MAX_SPOKEN_SENTENCES = 5;
const sentences = (text) => text.split(/(?<=[.!?])\s+/).filter(Boolean).length;

// ── The chooser ─────────────────────────────────────────────────────────────
await page.goto(`${B}/situations`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("main h1", { timeout: 20_000 });
const chooser = await page.locator("main").innerText();
check("the chooser says what a conversation is", /wants something from you/i.test(chooser));
check("and says nothing you type is about you", /Nothing you write here is\s+about you/i.test(chooser));
check("a scene says how long it takes", /about \d+ min/.test(chooser));
check("and how much there is to get done", /\d+ things to get done/.test(chooser));

// ── The briefing ────────────────────────────────────────────────────────────
await page.goto(`${B}/situations/${SCENE}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("main h1", { timeout: 20_000 });
check("a scene names itself in the tab", (await page.title()).includes("Booking a doctor"));
const briefing = await page.locator("main").innerText();
check("the briefing says who you are today", /You are a patient/i.test(briefing));
check("the difficulty dial is on the scene", (await page.getByRole("radio", { name: /Normal/i }).count()) > 0);

/*
  The easiest one, because this suite is about whether the loop closes rather
  than about how hard a day is: a curveball is a beat that changes shape
  mid-run and the four difficulties are covered in `curveballs.test.ts`,
  deterministically, which is where a thing decided by a seeded draw belongs.
*/
/*
  PRESSED UNTIL IT LANDS, WHICH IS NOT THE SAME AS WAITING LONGER.

  Every control here is in a client component, and a button rendered on the
  server is clickable and completely inert: Playwright's actionability check is
  satisfied long before React has attached a handler, so a single click can be
  swallowed with nothing to show for it. The first version pressed once, waited
  twenty seconds for `aria-pressed` to move, and failed reporting a dial that
  works perfectly. Waiting longer would not have helped, because the click that
  was going to be lost had already happened.

  The dial's own chosen state is the signal that hydration has happened, and
  the same discipline covers Start below: a press is retried until the page
  shows it landed, and the failure then means the button really is dead.

  `aria-checked` rather than `aria-pressed`, because the dial is a radio group
  now: four mutually exclusive options announced as four unrelated toggle
  switches and cost four tab stops, which is what `components/Choice.tsx` was
  written to stop.
*/
const easiest = page.getByRole("radio", { name: /^Easy/i });
const chose = await eventually(async () => {
  await easiest.click();
  return (await easiest.getAttribute("aria-checked")) === "true";
}, { timeoutMs: 20_000, everyMs: 250 });
check("the dial answers a press", chose);
await page.getByRole("button", { name: /Start the conversation/i }).click();
await page.waitForSelector('[role="log"] p', { timeout: TURN_MS });

// ── The card, which is the thing a learner answers from ─────────────────────
/*
  THE STRIP IS THE CARD NOW, AND THE CARD IS BEHIND IT.

  It used to be open: forty words of role, the labelled values, a line about
  the persona and every objective in the scene, all of it standing above the
  conversation on a phone. A learner sent a screenshot of that and called it
  cluttered, and they were right. What a beat actually asks a learner to read
  off the card is the values, and that is two words, so the values are the
  strip and everything else is one press away.

  So this asks the same question in two halves. The strip carries the values
  while somebody types, which is the claim that matters and the one the whole
  card used to be there for; opening it still shows which value answers which
  line, which is what stops "back" and "Wednesday" being two words with no
  question attached.
*/
const strip = await page.locator("details > summary").innerText();
check("the strip carries what you were dealt, without opening anything",
  /^Your card: \S/.test(strip.trim()), strip.trim());
/*
  AND THE ROOM'S NAME IS NOT ON IT TWICE. The bar above the conversation prints
  the place, and the strip printed it again two lines under it, which on a
  phone is most of the width of the one line that had a job to do.
*/
check("and does not say the place the bar has just said", !/counter|centre|center/i.test(strip));

await page.locator("details > summary").click();
const card = await page.locator("details").innerText();
/*
  THE CARD SHOWS WHAT IT POINTS AT. Six props across three scenes told a learner
  to read a word off the card and printed nothing, so two of this scene's three
  were unanswerable. In English, because saying it in Estonian is the exercise.

  The witness used to be the time, and that was the wrong prop to prove it
  with: a time prints itself, and the two here are the desk's, not the
  learner's. The day this started is the learner's own fact and prints the
  same way a word does.
*/
check("the card says what you were given", /this day\.?\s*\n\s*[A-Z][a-z]+/.test(card));
check("and what is wrong with you, in English", /What is wrong/i.test(card)
  && /\n[a-z][a-z ,'-]{2,}\n/.test(card));
/*
  AND NOT WHAT THE OTHER SIDE IS ABOUT TO SAY. The appointment this desk offers
  and the slot it offers when the first will not do were both on this card, so
  "take the time offered, or ask for another" was answerable before anybody had
  offered anything and the counter-offer was visible before the first was
  refused. `theirs` keeps a fact the other side utters off the card, and
  `catalogue.test.ts` reads which props those are off the beats.
*/
check("and not the time the desk is about to offer", !/The time you were given/.test(card));
/*
  AND EVERY OBJECTIVE, ONCE IT HAS BEEN OPENED, which is asked of the pairing
  rather than of today's copy. This named the first beat's goal as a literal
  and failed the day the goals were rewritten, which is this suite asserting
  the markup rather than the rule: what it is actually claiming is that the
  list holds the objective the learner is standing on, and the panel under the
  conversation is where that string comes from.
*/
const inPlay = ((await page.locator("main").innerText()).split(/YOUR TURN\s*\n[^\n]*\n/)[1] ?? "")
  .split("\n").map((line) => line.trim()).find(Boolean) ?? "";
check("the panel names the objective in play", inPlay.length > 0, inPlay);
check("and every objective, once it has been opened", card.includes(inPlay), inPlay);
/*
  AND THE OBJECTIVE CARRIES WHAT THE CARD DEALT FOR IT, WHICH IS WHY NO GOAL
  POINTS AT THE CARD ANY MORE.

  The goal read "Say since when. Your card says which day", and the card was
  this disclosure with three lines of prose in it. A learner sent a screenshot
  and said the information was hard to find and that the instruction should
  carry the value. A source check cannot see this: the objective's text is the
  scene's and the value is the run's, and only a rendered row has both.

  The `since` beat is the one that wants a day, and the day is the same string
  the card's own value line prints, so the two are read off one render.
*/
const dealtDay = /on this day\.?\s*\n\s*([A-Z][a-z]+)/i.exec(card)?.[1];
check("the card dealt a day worth naming", Boolean(dealtDay), card.slice(0, 200));
/*
  The value sits under the objective that wants it, wherever in the list that
  objective is. Read off the checklist rather than off a goal named here, for
  the reason above: the scene's copy is the scene's, and what this suite is
  entitled to claim is that the day the card dealt is printed among the
  objectives rather than only inside the card's own prose.
*/
check("and the objective that wants it names it, rather than pointing at the card",
  Boolean(dealtDay) && new RegExp(`\\n\\s*${dealtDay}\\s*(\\n|$)`).test(
    card.slice(card.search(/what to get done/i)),
  ),
  card.slice(card.search(/what to get done/i), card.search(/what to get done/i) + 260));
/*
  The objective list alone, not the whole card: the scene's `role` opens by
  saying what the card holds ("Your card says what is wrong and since when"),
  which is the sentence that introduces it and is the one place the phrase
  belongs. What may not say it is a line telling somebody to go and read it.
*/
/*
  AND THE HEADING IS UPPERCASED BY THE STYLESHEET, WHICH `innerText` RESPECTS.

  This read `indexOf("What to get done")`, which is -1 against the rendered
  `WHAT TO GET DONE`, so `slice(-1)` handed every check below a single
  character: "no objective sends the learner off to read it" has been passing
  over one letter for as long as it has existed, which is a check over an
  empty list and a pass nobody earned. Found by a check beside it failing for
  a real reason.
*/
const listAt = card.search(/what to get done/i);
check("the card lists what there is to get done", listAt >= 0, card.slice(0, 120));
const checklist = card.slice(listAt);
check("so no objective sends the learner off to read it", !/your card/i.test(checklist),
  checklist.slice(0, 160));
await page.locator("details > summary").click();
/*
  AND THE ONE IN PLAY IS ON SCREEN WITH THE CARD SHUT, which is what makes
  shutting it safe: the panel a learner types into names the objective they are
  on, so the list is a reference rather than something to keep in view.
*/
check("and the objective in play is named without it",
  (await page.getByText(inPlay, { exact: false }).count()) > 0, inPlay);

// ── The room, still there while the conversation is had in it ──────────────
/*
  A learner asked where the drawings had gone. They had stepped into a health
  centre, read one sentence, pressed a button, and been put on a screen that
  could have been any of the fourteen: the vignette was on the briefing and on
  the cover between two rooms, and the conversation itself had an eighteen-pixel
  icon on the bar and two columns of cards.

  Everything a drawing is for happens during a conversation rather than before
  it, so the room is a band under the bar for the whole of it. Measured rather
  than read off the source, because the source check one file over can say the
  band is passed and drawn and cannot say it is on screen: what makes it a room
  rather than a picture is that it is still there on the fortieth turn, which
  is a question about `position: sticky` and about the height the role card
  sticks at, and only a browser knows either.
*/
const stageBox = async () => page.evaluate(() => {
  /*
    Off the band's own marker rather than off "an svg in the header": the bar
    also holds the door out and the room's eighteen-pixel mark, and the first
    of those in document order is an arrow.
  */
  const svg = document.querySelector("[data-scene-stage] svg");
  if (!svg) return null;
  const box = svg.getBoundingClientRect();
  return { top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height) };
});
const stageAtFirst = await stageBox();
check("the room a conversation happens in is drawn above it",
  Boolean(stageAtFirst) && stageAtFirst.height > 40 && stageAtFirst.top >= 0,
  JSON.stringify(stageAtFirst));

// ── The first line, and where it came from ──────────────────────────────────
const first = await page.locator('[role="log"] p').first().innerText();
check("they say something before you do", first.trim().length > 0, first);
/*
  WHO IS TALKING, ON EVERY LINE. A learner read a conversation back and asked
  where the drawings had gone and whether the bubbles could say who was
  speaking: the two columns were told apart by which edge they sat against and
  which ink they were in, and a colour may not carry a distinction on its own.
  `SceneFace` is the drawing and the sentence beside it is what a screen reader
  is told, which is what makes the drawing decoration rather than the only
  signal. Both halves, because either alone is the fault half fixed.
*/

const chips = await page.getByRole("log").innerText();
/*
  Case-insensitive, because `Chip` uppercases through CSS and `innerText`
  reports what is painted rather than what the component wrote. Matching the
  source spelling failed on a chip that was there and correct, which is a check
  reporting its own regex.
*/
const provenance =
  /From the course|Written for this scene|Written for this turn|They did not catch that|Said again|In English, because/i
    .test(chips);
/*
  EVERY STATE, because the ladder's claim is that whichever rung answered says
  so: the dictionary's own sentence, one written for this turn, somebody who did
  not catch what was said, or a move nothing could be said for at all. A keyless
  run is not a broken one, and this is the check that says so.

  The fourth is the one a keyless run mostly gets, and it is the reason it is
  here: it used to come out as the third, so half a conversation was the desk
  claiming not to have understood turns that were fine. See `wayOut`.
*/
check("and the line says which rung it came from (ADR-025)", provenance,
  chips.split("\n").filter(Boolean).slice(0, 2).join(" | "));
/*
  The report button belongs to a line somebody said, and the fourth rung is not
  one: an `unspoken` turn is our own English about what the desk did, and
  offering it to the queue would ask a learner to report our sentence to us. So
  this is checked where an Estonian line is on screen, which the greeting
  always is, because `Tere!` is its own sentence and the dictionary answers it.
*/
const spoken = await page.getByText(/From the course|Written for this scene|Written for this turn/i).count();
/*
  `spoken === 0 || ...` was the old shape and it passes when there is nothing
  to look at, which is the same fault as the two waivers at the foot of this
  file one size smaller. The greeting always is a line somebody said, so the
  empty case is worth saying out loud rather than swallowing.
*/
if (spoken > 0) {
  check("with a way to report a line somebody said",
    (await page.getByRole("button", { name: /^Report/i }).count()) > 0,
    `${spoken} spoken line(s) on screen`);
} else {
  absent(1, "no Estonian line was on screen to report: every line this run reached was a stage "
    + "direction, which is our own English and deliberately carries no report button");
}

/*
  Every line the desk said, with the rung it came from, over the whole
  conversation. Read at each turn rather than at the end, because the composed
  check below needs to find a composed line wherever one happened: the greeting
  is a phrase and the dictionary answers it, so a suite that only looked at the
  first line would waive the composer's own check on every run in every state,
  which is a hole wearing a waiver's clothes.
*/
const heard = [];
async function listen() {
  heard.length = 0;
  /*
    One entry per bubble rather than per turn, because a reply is a reaction
    and then a move (lib/scenes/reply.ts) and the two carry their own labels.

    READ OFF `data-rung` RATHER THAN BY WALKING THE MARKUP, which is what this
    did and why two of the checks below had never once run. The label is a
    paragraph under the bubble, and the version of this that counted hops (one
    up from the `p[lang=et]`, then the next paragraph) was true until a line
    grew the dictionary under it: `GlossedSentence` puts two more elements
    between the two, so every label came back empty, the composed and scripted
    checks fell into their waivers on every run in every state, and the reason
    printed was that the bank held no line for a beat this run reached. It had
    just supplied the second one. A learner's own bubble carries no rung and is
    not in the list.
  */
  for (const line of await page.getByRole("log").locator("[data-rung]").all()) {
    const text = await line.locator("p[lang=et]").first().innerText().catch(() => "");
    const chip = await line.locator("p").last().innerText().catch(() => "");
    heard.push({ text, chip, rung: await line.getAttribute("data-rung") });
  }
}

/** Says one thing and waits for the desk to answer. */
async function say(text) {
  const before = await page.locator('[role="log"] p').count();
  await page.getByLabel("What you say").fill(text);
  await page.getByRole("button", { name: /Say it/i }).click();
  const began = Date.now();
  await page.waitForFunction(
    (n) => document.querySelectorAll('[role="log"] p').length > n + 1,
    before, { timeout: TURN_MS },
  ).catch(() => {});
  await listen();
  return Date.now() - began;
}

// ── A turn that lands ───────────────────────────────────────────────────────
const waited = await say("Tere!");
/*
  The greeting landed, which is the objective count moving off nought rather
  than a goal string: this named the first beat's copy and so measured whether
  the wording had changed rather than whether the turn was read.
*/
const afterGreeting = await page.locator("main").innerText();
check("a greeting is read as a greeting",
  /\b[1-9]\d* OF \d+/.test(afterGreeting) && afterGreeting.includes("done"),
  `${waited}ms · ${/\b\d+ OF \d+/.exec(afterGreeting)?.[0] ?? "no count"}`);

/*
  AND THE CARET IS BACK IN THE BOX, WHICH THE BUTTON TAKES AND THEN LEAVES.

  "Say it" disables itself the moment the draft is empty, which is the moment
  the turn is sent, and a browser moves focus off a control it has just
  disabled: `document.activeElement` was `BODY` after every turn taken with the
  mouse, so a learner had to click back into the box for each turn and a
  keyboard could not carry on at all. Answering with Enter never had the fault,
  which is why it survived: the box keeps focus there. Driven with the mouse
  here for that reason.
*/
check("and the caret is back in the box, ready for the next turn",
  await page.evaluate(() => document.activeElement?.getAttribute("aria-label")) === "What you say",
  await page.evaluate(() => document.activeElement?.tagName ?? "none"));

// ── The help button, which is the one that was wrong ────────────────────────
/*
  It recorded the *beat id* as the word needed, so a debrief listed `reason`
  under "words this conversation needed" with no way to keep it, on the one
  screen whose whole job is turning a gap into a card.
*/
await page.getByRole("button", { name: /I need a word/i }).click();
await page.waitForTimeout(2_000);
const lent = await page.locator("main").innerText();
check("asking for a word gives you a word, with its meaning", / · /.test(lent)
  && !/\bgreet\b|\breason\b/.test(lent.split("\n").slice(-8).join(" ")));

// ── A turn that repairs ─────────────────────────────────────────────────────
await say("Mul on valu.");
const afterTwo = await page.locator("main").innerText();
/*
  READ OFF THE COUNT RATHER THAN OFF THE TICKS.

  This used to count the word "done" in the checklist, which lives inside the
  card, and the card is shut now: what it was counting was `sr-only` text in a
  closed disclosure, so it read nought whatever the learner had achieved. The
  count is on screen either way, in the panel a learner types into and on the
  bar above the conversation, and it is the same figure the ticks are, read off
  the same list.
*/
const counts = [...afterTwo.matchAll(/(\d+) of (\d+)/g)].map((m) => Number(m[1]));
check("a second objective can be met", counts.some((n) => n >= 2), afterTwo.match(/\d+ of \d+/)?.[0] ?? "no count on screen");
check("no meter, no timer, no score anywhere on the screen (§7)",
  !/\d+\s*%/.test(afterTwo) && !/\bscore\b/i.test(afterTwo) && !/\bpoints?\b/i.test(afterTwo));

/*
  WHO IS TALKING, ON EVERY LINE. A learner read a conversation back and asked
  where the drawings had gone and whether the bubbles could say who was
  speaking: the two columns were told apart by which edge they sat against and
  which ink they were in, and a colour may not carry a distinction on its own.
  `SceneFace` is the drawing and the sentence beside it is what a screen reader
  is told, which is what makes the drawing decoration rather than the only
  signal. Both halves, because either alone is the fault half fixed. After two
  turns, since one side of it cannot be there before the learner has spoken.
*/
const sides = await page.getByRole("log").innerText();
check("every line says who said it, to a reader who cannot see the sides",
  /They said:/.test(sides) && /You said:/.test(sides), sides.slice(0, 120));
check("and there is a face beside each run of them",
  (await page.locator('[role="log"] svg circle').count()) > 0);

// ── The screen a conversation is had on scrolls to its own end ──────────────
/*
  THE ONE THING THAT LOOKS LIKE AN APP THAT HAS FROZEN.

  The turns were in a scroll container of their own capped at 46vh, on the
  containment rule, and it sat across the middle of the column with
  `overscroll-behavior: contain` on it. So a pointer anywhere over the
  transcript scrolled the transcript rather than the page, and the transcript
  is scrolled to its newest turn the moment a reply lands, which means the
  wheel had nothing left to move: the input, the goal for the turn and every
  button under it were below the fold and could not be reached. Two checks,
  because the two halves fail separately: nothing inside this page may be its
  own scroller, and the page has to be able to reach its own bottom.

  Measured rather than reasoned about: the wheel is rolled over the middle of
  the column, which is where the transcript is, and the page is asked where it
  ended up.
*/
const columnMiddle = await page.evaluate(() => {
  const log = document.querySelector('[role="log"]').getBoundingClientRect();
  return { x: Math.round(log.left + log.width / 2), y: Math.round(log.top + log.height / 2) };
});
const nested = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((el) => {
  const style = getComputedStyle(el);
  return (style.overflowY === "auto" || style.overflowY === "scroll")
    && el.scrollHeight > el.clientHeight + 1;
}).length);
check("the conversation is not a scrolling box inside a scrolling page", nested === 0,
  `${nested} nested scrollers`);
await page.mouse.move(columnMiddle.x, columnMiddle.y);
/*
  TWO THINGS HAVE TO STOP MOVING BEFORE THE WHEEL MEANS ANYTHING.

  The page comes down to the panel after a reply and it does it smoothly, so a
  wheel rolled while that is in flight is two scrolls fighting and the
  measurement lands wherever they met: this read "466 of 514" against a page
  that reaches its end perfectly well a moment later. And the pointer has just
  landed on a word of the transcript, which opens the dictionary under that
  sentence and makes the page about 160px taller: rolling before it opens
  reaches an end that is no longer the end, which read "587 of 747". So wait
  for the height and the scroll both to settle, then roll.
*/
await page.waitForFunction(() => new Promise((settled) => {
  const tall = document.documentElement.scrollHeight;
  setTimeout(() => settled(document.documentElement.scrollHeight === tall), 250);
}), null, { timeout: 10_000 }).catch(() => {});
await page.waitForFunction(() => new Promise((settled) => {
  const at = window.scrollY;
  requestAnimationFrame(() => requestAnimationFrame(() => settled(window.scrollY === at)));
}), null, { timeout: 10_000 }).catch(() => {});
await page.mouse.wheel(0, 4_000);
await page.waitForTimeout(600);
const innerHeightOf = await page.evaluate(() => window.innerHeight);
const reached = await page.evaluate(() => {
  const input = document.querySelector('input[aria-label="What you say"]').getBoundingClientRect();
  return {
    y: Math.round(scrollY),
    end: document.documentElement.scrollHeight - innerHeight,
    inputInView: input.top >= 0 && input.bottom <= innerHeight,
  };
});
check("and a wheel over it reaches the box you answer in",
  reached.inputInView && reached.y >= reached.end - 2,
  `scrolled to ${reached.y} of ${reached.end}`);

/*
  AND THE ROOM IS STILL THERE AT THE BOTTOM OF IT.

  This is the half a source check cannot make: a band drawn at the top of the
  column and a band that sticks under the bar are the same markup and the same
  props, and only one of them is a room. The page has just been rolled to its
  own end, which is the state a learner is in for every turn after the first,
  and the drawing has to be on screen and under the bar rather than over it.
*/
const stageAtEnd = await stageBox();
check("and the room is still on screen once the conversation has scrolled",
  Boolean(stageAtEnd) && stageAtEnd.top >= 0 && stageAtEnd.bottom <= 240,
  JSON.stringify(stageAtEnd));

/*
  AND SO IS THE CARD, WHICH IS THE OTHER THING THAT HAS TO BE TRUE WHILE
  SOMEBODY TYPES.

  A beat asks the learner to read a value off their card, so the one line
  carrying those values is pinned under the bar and the room. It was marked
  sticky on the `summary`, which cannot move: a sticky box travels inside its
  own containing block, and a closed `details` is exactly as tall as its
  summary. So the pill scrolled away with the page for the whole of this
  feature's life while the comment beside it explained why it had to stay, and
  no check here could see that, because the page was never scrolled at the
  moment the pill was looked at.

  Measured at the bottom of a scrolled page, where the fault lived: on screen,
  and under the room rather than over it.
*/
const pinned = await page.evaluate(() => {
  const pill = document.querySelector("details.scene-sticky summary");
  const svg = document.querySelector("[data-scene-stage] svg");
  if (!pill || !svg) return null;
  const box = pill.getBoundingClientRect();
  return {
    top: Math.round(box.top),
    bottom: Math.round(box.bottom),
    under: Math.round(svg.getBoundingClientRect().bottom),
    text: pill.textContent.trim().slice(0, 40),
  };
});
check("and the card you answer from is pinned under it, not scrolled away",
  Boolean(pinned) && pinned.top >= pinned.under && pinned.bottom <= innerHeightOf,
  JSON.stringify(pinned));

/*
  And the words under every line are the rung it actually came from. The chip is
  what a reader is told and `data-rung` is what the server decided, and the two
  being one claim is the whole of ADR-025: a line labelled "from the course"
  that a model wrote would be the app vouching for its own Estonian.

  Read off the transcript this run built, before it is left: the debrief
  replaces the conversation, so a `listen()` after that would find nothing and
  the check would be asserting over an empty list.
*/
const labelled = heard.filter((line) => line.rung);
check("and the words under every line are the rung the server chose",
  labelled.length > 0 && labelled.every((line) => new RegExp(
    { attested: "From the course", scripted: "Written for this scene", composed: "Written for this turn",
      fallback: "did not catch that", again: "Said again", recast: "the way they say it",
      offered: "reaching for", english: "in English" }[line.rung] ?? "$^", "i",
  ).test(line.chip)),
  labelled.map((line) => `${line.rung}: ${line.chip}`).join(" | ").slice(0, 160));

// ── Walking out, which is a real option ─────────────────────────────────────
await page.getByRole("button", { name: /^Leave/i }).click();
await page.waitForSelector("text=/What you got done/i", { timeout: TURN_MS });

const debrief = await page.locator("main").innerText();
check("leaving ends in a debrief rather than a reproach", /What you got done/i.test(debrief));
check("which says what happened, in one line", /You left the desk|came back|That is a thing people do/i.test(debrief));
check("counts what you got done rather than scoring it", /\d+ of \d+ things you came in to get done/.test(debrief));
check("and prints no percentage anywhere", !/\d+\s*%/.test(debrief));
check("shows what was said, both sides", /What was said/i.test(debrief) && debrief.includes("Tere!"));
check("names the words the conversation needed", /Words this conversation needed/i.test(debrief));
check("and offers to keep one", (await page.getByRole("button", { name: /Add it to my deck/i }).count()) > 0);
/*
  A stalled beat used to hand over its whole vocabulary, eleven body parts with
  eleven buttons, under a heading saying the conversation had needed them.
*/
const offered = await page.getByRole("button", { name: /Add it to my deck/i }).count();
check("a few of them rather than the unit", offered <= 8, `${offered} offered`);
/*
  A DRILL, NOT A NAMED ONE. This asserted "Writing" and failed the moment the
  debrief started reading the drill off what the beat needed rather than linking
  the same one whatever happened, which is the suite catching a real change and
  the check being wrong about the claim: what §12 promises is a link into a
  drill that already exists rather than advice this screen invented, and which
  drill is the data's answer.
*/
const drill = page.locator('main a[href^="/review/"]').first();
check("points at a drill rather than writing its own advice",
  (await drill.count()) > 0, await drill.getAttribute("href").catch(() => "none"));
check("and offers the same conversation again", (await page.getByRole("button", { name: /Have it again/i }).count()) > 0);

// ── What was written down ───────────────────────────────────────────────────
const runs = await prisma.sceneRun.findMany({
  where: { ownerId: OWNER, sceneId: SCENE }, orderBy: { startedAt: "desc" },
});
check("the run is on the server, not in the browser", runs.length === 1, `${runs.length} rows`);
const run = runs[0];
check("and it is closed", Boolean(run?.endedAt));
/*
  ADR-022: the client sends what it typed and the server reads it again. What
  is stored is the server's own reading, so a transcript holds the turns and
  the outcome holds what they were worth.
*/
const outcome = JSON.parse(run?.outcome ?? "{}");
check("the outcome is the server's own reading", Array.isArray(outcome.met) && Array.isArray(outcome.missed));
check("and the greeting is in it", (outcome.met ?? []).includes("greet"), (outcome.met ?? []).join(","));
const transcript = JSON.parse(run?.transcript ?? "{}");
check("the transcript holds the turns and the card it was played with",
  Array.isArray(transcript.turns) && Boolean(transcript.card));

const gaps = await prisma.sceneGap.count({ where: { runId: { in: await runIds() } } });
check("the words it needed are written down", gaps > 0, `${gaps} rows`);

// ── A composed line, where there is a key for one ───────────────────────────
/*
  ONE CHECK EITHER WAY, AND THE WAIVER IS FOR EXACTLY THE ONE NOT RUN.

  The first version ran one check in one branch and two in the other while
  waiving two, so the floor could not be set to a number that was right in both
  states: keyed it overshot, keyless it undershot, and the arithmetic the whole
  helper exists to keep honest quietly stopped adding up. Every state runs the
  same shared checks above; this is the single question only a key can answer.

  The gate is what makes composition safe, and its whole claim is that a line
  reaching outside the scene's word list never reaches the learner. The unit
  tests own that. What only a real model can show is that the line it composed
  is one short sentence rather than an essay or a refusal.
*/
const composed = heard.find((line) => line.rung === "composed");
if (composed) {
  check("a composed line is inside what the gate allows, and says a model wrote it",
    composed.text.split(/\s+/).length <= MAX_SPOKEN_WORDS
    && sentences(composed.text) <= MAX_SPOKEN_SENTENCES
    && /Written for this turn/i.test(composed.chip),
    `${composed.text} · ${composed.chip}`);
} else {
  /*
    Says which state lifts it, which the house rule asks of every waiver: a key
    configured *and* a beat retrieval could not fill. A keyless run never
    reaches the composer at all, and a keyed run reaches it only where the
    dictionary had nothing, which is most beats and not the greeting.
  */
  absent(1, "no line was composed here: that needs a provider key and a beat the dictionary could not fill");
}

// ── A scripted line, where the bank holds one for a beat this run reached ───
/*
  The fourth rung (ADR-025 amendment 1): a line drafted before the run, gated
  then, and read in the diff. What only a browser can show is that the screen
  says which rung answered, since the chip is text and the unit tests cannot
  see a render. Same shape as the composed check above: one check, or one
  waiver naming the state that would lift it.
*/
const scripted = heard.find((line) => line.rung === "scripted");
if (scripted) {
  check("a scripted line is inside the same gate and says it was scripted",
    scripted.text.split(/\s+/).length <= MAX_SPOKEN_WORDS
    && sentences(scripted.text) <= MAX_SPOKEN_SENTENCES
    && /Written for this scene/i.test(scripted.chip),
    `${scripted.text} · ${scripted.chip}`);
} else {
  absent(1, "no scripted line was said here: that needs lib/scenes/bank.ts to hold a row for a beat this run reached and retrieval did not fill");
}

check("nothing threw in the browser", errors.length === 0, errors.join(" · "));

await browser.close();
await cleanUp();
await prisma.$disconnect();
done();
