/**
 * Browser smoke tests for the parts added on top of the original MVP: the
 * learning path, the practice modes, the typed-answer review, undo, the command
 * palette, and — the one that matters most — reviewing with the network off.
 *
 * Needs the dev server running and a deck with something in it:
 *   npm run demo && npm run dev
 *   node scripts/test-modes.mjs
 */
import { launchChromium } from "./lib/browser.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { retypeMiss } from "./lib/review.mjs";
import { startRound } from "./lib/briefing.mjs";

const B = baseUrl();
const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  // The offline section below pulls the plug on purpose; the browser's own
  // "failed to load" noise from that is the test working, not a fault.
  if (m.type() === "error" && !m.text().includes("ERR_INTERNET_DISCONNECTED")) errors.push(m.text());
});

// Floor: 29, measured in the state CI seeds. A thinner database reads as short.
// 23 before Sõnad added six, the crossword six more and the game of the day two,
// then two when the crossword was renamed Ristsõna and both names had to keep
// reaching it from the palette, and four for the picture round. The last two
// arrived on two branches at once, so the number is measured on the merged tree
// rather than added from either side: 44. Three more for the columns on
// Today ending level: 47.
// Five more for the way back to the last word, which is driven rather than
// asserted from the source: 54. One more for the key that opens it not being
// a letter somebody was typing, which is how it shipped first: 55, and one
// for the caret not being dropped on the way out: 56. Two more for undo,
// which had the same fault and was there first: 58. And two for the round
// behind the panel not answering the key the panel names, which two of the
// fifteen rounds drawing it did: 60, and one for the round's own undo standing
// down beside the panel the way its key already did: 61.
const { check, absent, done } = suite("Practice modes", { floor: 63 });

/**
 * Brings the current card to the point where it is waiting on the learner,
 * without letting it move on.
 *
 * Review asks in four shapes now and only one of them still has grading buttons
 * on it, so a driver that assumes one shape silently types "3" into the answer
 * box instead of grading. A typed card and a flip card get there
 * deterministically, with a deliberately wrong answer or Space; a
 * multiple-choice card cannot, because which option is "1" is not known in
 * advance and a correct pick reveals a button of its own rather than a
 * held-open one, so it is answered and skipped rather than relied on. A
 * first meeting has nothing to reveal: it is already showing everything it
 * has.
 */
async function revealCurrentCard() {
  const box = page.getByLabel("Type your answer");
  if (await box.count()) {
    await box.fill("kindlasti-vale-vastus");
    await page.keyboard.press("Enter");
  } else if (await page.getByRole("button", { name: /Show answer/ }).count()) {
    await page.keyboard.press("Space");
  } else if (await page.getByText(/Pick the meaning/).count()) {
    return false;
  }
  await page.waitForTimeout(800);
  return await waitingOnMe();
}

/** Whether the card is holding, rather than having graded itself and moved on. */
async function waitingOnMe() {
  const carryOn = await page.getByRole("button", { name: /Got it|Check it again/ }).count();
  const selfGrade = await page.getByRole("button", { name: /^Got it$/ }).count();
  return carryOn + selfGrade > 0;
}

/**
 * Answers whatever card is on screen and moves past it.
 *
 * The app marks what it can mark now, so nothing here is a guess about a
 * grade: a right or wrong typed answer, and a right or wrong pick, all wait
 * on a button that says which happened, and Enter presses it. What is left
 * is the two self-grade buttons on a flip card, which is the one shape with
 * nothing to compare against.
 */
async function answerCurrentCard() {
  const box = page.getByLabel("Type your answer");
  if (await box.count()) {
    await box.fill("ükskõik");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    // A miss has to be typed again before the card goes, and doing so grades it.
    if (await retypeMiss(page)) return true;
  } else if (await page.getByText(/Pick the meaning/).count()) {
    await page.keyboard.press("1");
    await page.waitForTimeout(300);
  } else if (await page.getByRole("button", { name: /Show answer/ }).count()) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
  }

  // "Got it" on a miss or a first meeting, and the verdict itself
  // ("Correct!"/"Õige!") on a right pick or a right typed answer: neither
  // grades itself any more, so both wait on the button under the card and
  // both answer to Enter.
  if (await page.getByRole("button", { name: /Got it|Correct|Õige/ }).count()) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1400);
    return true;
  }
  // A flip card, where the learner is the only judge: key 2 is "Got it".
  if (await page.getByRole("button", { name: /^Got it$/ }).count()) {
    await page.keyboard.press("2");
    await page.waitForTimeout(1400);
    return true;
  }
  // Nothing left on screen to press: whatever was there has already gone.
  await page.waitForTimeout(600);
  return true;
}

// 1 — The learning path lists units and reports real progress
await page.goto(`${B}/learn`, { waitUntil: "networkidle" });
// The unit's own name shows in English until the learner reaches A2
// (lib/copy/uiLanguage.ts), so a suite that does not know this account's
// level checks for either name rather than assuming Estonian always shows.
check(
  "path shows units",
  (await page.getByText("Tervitused").count()) > 0
    || (await page.getByText("Putting words together").count()) > 0,
);
check("path reports overall progress", (await page.getByText(/words known/).count()) > 0);

await page.goto(`${B}/learn/kodu`, { waitUntil: "networkidle" });
check("a unit lists its words", (await page.getByText("tuba", { exact: true }).count()) > 0);
check("a unit says which card types it makes", (await page.getByText(/recognition, production/i).count()) > 0);

// 2 — Practice hub, with live state per mode
await page.goto(`${B}/practice`, { waitUntil: "networkidle" });
for (const mode of ["Review", "Case Sprint", "Match", "Listening"]) {
  check(`practice hub offers ${mode}`, (await page.getByText(mode, { exact: true }).count()) > 0);
}

// 3 — Progress charts render from the review log
await page.goto(`${B}/progress`, { waitUntil: "networkidle" });
// XP and the level it drove were withdrawn; the streak is what the top of this
// page carries now, and it is what the shields under it are about.
check("progress shows the streak", (await page.getByText(/Day streak/i).count()) > 0);
check("progress shows the shields that protect it", (await page.getByText(/Shields? banked/i).count()) > 0);
check("progress shows the study heatmap", (await page.getByText(/reviews on \d+ days/).count()) > 0);
// A class board where this learner is in a class, and the way into one where
// they are not. There is no third state: the instance-wide board of everybody
// who ticked a box is gone, so a stranger is never ranked against strangers.
// Which of the two shows depends on the deck this suite is run against.
const classBoardShown = (await page.getByText(/Open the class/).count()) > 0;
const invitedToJoin = (await page.getByText(/Start or join a class/).count()) > 0;
check("the board is a class you joined, or the way into one",
  classBoardShown !== invitedToJoin, classBoardShown ? "class board" : "invited to join");

// 4 — Review: a typed answer is checked, not self-graded.
// Typing is only asked of a card that has been seen before — a brand-new card
// leads with its answer instead — so on a deck that has never been reviewed
// there is genuinely nothing to check here. That is reported as skipped rather
// than failed, with the fix: `npm run demo` gives the deck a history.
await page.goto(`${B}/review`, { waitUntil: "networkidle" });
await startRound(page);
const everyCardIsNew = await page.evaluate(() => {
  const label = document.body.querySelector('[aria-label="Session progress"]');
  return /New (word|phrase)/.test(document.body.innerText) && label !== null;
});
let typedReached = false;
for (let i = 0; i < 30 && !typedReached; i++) {
  const box = page.getByLabel("Type your answer");
  if (await box.count()) {
    typedReached = true;
    await box.fill("kindlasti-vale-vastus");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    check("a typed answer gets a verdict before it is graded",
      (await page.getByText(/Not quite|Almost|So close/).count()) > 0);
    // And nothing asks who was right: the verdict is the app's, and the button
    // under it acknowledges the correction rather than grading it.
    check("a miss offers one way on rather than four grades",
      (await page.getByRole("button", { name: /Got it|Check it again/ }).count()) === 1
      && (await page.getByRole("button", { name: /^(Again|Hard|Easy)/ }).count()) === 0);
    break;
  }
  await answerCurrentCard();
}
if (!typedReached && everyCardIsNew) {
  // A `console.log` saying SKIP was all this used to be, which is the exact
  // shape the floor exists to catch: three checks not run and nothing counting
  // them. Waived by name and by number now, so the arithmetic is on screen.
  absent(3, "a deck with a card past its first sitting: run `npm run demo`");
} else {
  check("a typed card is reached within a session", typedReached);
}

// 5 — Undo puts the last grade back.
// Reach a card that is actually asking to be rated before pressing a rating
// key. On a multiple-choice card the number keys pick an option rather than
// grade one, so pressing "3" blind can answer a question instead of grading it
// — leaving undo with nothing to take back and this check failing on the app
// behaving correctly.
let rateable = false;
for (let i = 0; i < 12 && !rateable; i++) {
  rateable = await revealCurrentCard();
  if (!rateable) await answerCurrentCard();
}
check("a card can be brought to the point where it waits on an answer", rateable);

if (rateable) {
  // Enter carries on from a miss or a first meeting, and 2 is "Got it" on a
  // flip card. Both grade, which is all undo needs to have something to take
  // back; pressing "3" blind used to answer a multiple-choice question instead.
  if (await page.getByRole("button", { name: /Check it again/ }).count()) {
    await retypeMiss(page);
  } else if (await page.getByRole("button", { name: /Got it/ }).count()) {
    await page.keyboard.press("Enter");
  } else {
    await page.keyboard.press("2");
  }
  await page.waitForTimeout(1200);
  const gradedBefore = await page.getByText(/\d+ graded/).textContent();
  /*
    Whichever of the two keys reaches undo from where the caret actually is.
    `u` is a letter while an answer box has focus, since 46 entries in the
    shipped dictionary begin with one, so from there undo is the gesture that
    is not a letter. Asking for the right key rather than one of them is what
    keeps this a check about undo rather than about which card came up: the
    card after a grade is whatever the queue had next.
  */
  const inABox = (await page.getByLabel("Type your answer").count()) > 0;
  await page.keyboard.press(inABox ? "Control+z" : "u");
  await page.waitForTimeout(1500);
  const gradedAfter = await page.getByText(/\d+ graded/).textContent();
  check("the last grade can be taken back from the keyboard", gradedBefore !== gradedAfter,
    `${inABox ? "Ctrl+z from the answer box" : "u"}: ${gradedBefore?.trim()} -> ${gradedAfter?.trim()}`);
} else {
  absent(1, "a card that reached the point of waiting on an answer, which none did here");
}

/*
  5b — LOOKING BACK AT THE WORD BEFORE THIS ONE.

  The browser's back button leaves the whole round, so the round carries its
  own way back to the card that just went. Three things about it can only be
  known by driving it: that it reads back an older card rather than the one on
  screen, that walking forward lands back in the round, and that none of it
  grades anything, which is the whole difference between this and undo.

  Run here, after the undo section, because it needs cards to have gone past:
  the button is deliberately not drawn on the first card of a session, where
  there is nothing behind the learner.
*/
await page.goto(`${B}/review`, { waitUntil: "networkidle" });
await startRound(page);
await page.waitForTimeout(600);

const lookButton = () => page.locator("main").getByRole("button", { name: /See it again/i });
check("no way back is offered on the first card of a session", (await lookButton().count()) === 0);

let answered = 0;
for (let i = 0; i < 6 && answered < 2; i += 1) {
  if (await answerCurrentCard()) answered += 1;
  await page.waitForTimeout(700);
}

if (answered >= 2 && (await lookButton().count()) > 0) {
  const onScreen = (await page.locator("main").innerText()).slice(0, 400);
  const gradedBefore = await page.getByText(/\d+ graded/).textContent();
  await lookButton().first().click();
  await page.waitForTimeout(400);

  const looking = await page.locator("main").innerText();
  check("the way back reads an older card rather than the one on screen",
    /back to the round/i.test(looking) && looking.slice(0, 400) !== onScreen);
  check("and says it is not a question being asked again",
    /nothing here is graded/i.test(looking));

  const forward = page.locator("main").locator("button").filter({ hasText: /^(Next|Back to the round)/ }).last();
  await forward.click();
  await page.waitForTimeout(700);
  const after = await page.locator("main").innerText();
  const gradedAfter = await page.getByText(/\d+ graded/).textContent();
  check("walking forward lands back in the round", (await lookButton().count()) > 0 && /\d+ graded/.test(after));
  /*
    And the caret comes with it. The buttons inside the panel unmount when it
    closes, so without somewhere to put focus a keyboard is left on the body,
    which is the fault this app has a written rule about: the card's own
    answer box takes it where there is one, the button that opened the panel
    where there is not, and never nothing.
  */
  const caret = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
  check("and the caret lands on a control rather than the body", caret !== "BODY" && caret !== "NONE", caret);
  /*
    And the round's own footer stands down with it. The panel replaces the
    card and the footer stays under it, so undo was the one control over the
    round still live beside a screen the learner is passing through: its key
    had been refused there since the panel was built, and the button had not,
    which is a control disagreeing with the shortcut on its own cap. What it
    rewinds is the last grade rather than the card being read, so from inside
    the panel it acts on something the reader cannot see.
  */
  await lookButton().first().click();
  await page.waitForTimeout(400);
  const undoLive = await page.locator("main").getByRole("button", { name: /^Undo/ }).isEnabled().catch(() => null);
  check("and the round's undo stands down while a look back is open", undoLive === false, `enabled: ${undoLive}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check("and nothing about a look back is graded", gradedBefore === gradedAfter,
    `${gradedBefore?.trim()} -> ${gradedAfter?.trim()}`);
} else {
  absent(4, "two cards answered in this session, which the deck here could not supply");
}

/*
  AND THE KEY THAT OPENS IT IS NOT A LETTER SOMEBODY WAS TYPING.

  `b` was bound from inside the answer box while that box was still empty, on
  the argument undo makes about `u`. An empty box is exactly where the first
  letter of an answer goes, and 63 entries in the shipped dictionary begin
  with one: pressing `b` on a card asking for `buss` opened the panel and
  swallowed the keystroke. Driven here rather than reasoned about, because
  which key reaches which handler is a fact about the browser.
*/
let typedCard = false;
for (let i = 0; i < 8 && !typedCard; i += 1) {
  typedCard = (await page.getByLabel("Type your answer").count()) > 0;
  if (!typedCard) { await answerCurrentCard(); await page.waitForTimeout(700); }
}

if (typedCard) {
  const box = page.getByLabel("Type your answer");
  await box.click();
  await page.keyboard.type("b");
  await page.waitForTimeout(300);
  const opened = (await page.locator("main").getByRole("button", { name: /One more back/i }).count()) > 0;
  const typedIn = (await page.getByLabel("Type your answer").count()) ? await box.inputValue() : "";
  check("b in the answer box is a letter rather than a shortcut", !opened && typedIn === "b",
    `opened: ${opened}, box holds: ${JSON.stringify(typedIn)}`);
} else {
  absent(1, "a typed card, which this deck did not offer in eight tries");
}

/*
  AND NEITHER IS THE KEY THAT UNDOES A GRADE.

  `u` had the same shape and was there first: bound from inside the answer box
  while it was still empty, so `uks`, `uus` and `uni` rewound the card before
  them and lost the letter. The reach is kept through a gesture that is not a
  letter, so both halves are driven: the letter goes in, and the gesture takes
  the grade back from the same box.
*/
if (typedCard) {
  const box = page.getByLabel("Type your answer");
  const before = await page.getByText(/\d+ graded/).textContent();
  await box.click();
  await box.fill("");
  await page.keyboard.type("u");
  await page.waitForTimeout(400);
  const afterLetter = await page.getByText(/\d+ graded/).textContent();
  const held = (await page.getByLabel("Type your answer").count()) ? await box.inputValue() : "";
  check("u in the answer box is a letter rather than an undo",
    held === "u" && before === afterLetter, `box holds ${JSON.stringify(held)}, ${before?.trim()} -> ${afterLetter?.trim()}`);

  await box.fill("");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(1600);
  const afterUndo = await page.getByText(/\d+ graded/).textContent();
  check("and the gesture that is not a letter still takes a grade back from there",
    before !== afterUndo, `${before?.trim()} -> ${afterUndo?.trim()}`);
} else {
  absent(2, "a typed card, which this deck did not offer in eight tries");
}

/*
  AND THE ROUND BEHIND THE PANEL DOES NOT ANSWER THE KEY THE PANEL NAMES.

  The review session stands its own keys down while a look back is open and
  says in a comment why; two of the fifteen rounds that draw the panel never
  learned to, which is the wiring-per-round fault the hook exists to end.
  Measured here rather than read off the source, because which listener sees
  a keystroke first is a fact about the browser: on the conjugation table,
  pressing the key this card's own caption names stepped the round behind it
  on to the next verb while the panel stayed open, so the learner walked out
  onto a word they had never answered. The gap-fill round is the same shape
  with a grade attached.

  The conjugation table is the one driven because it is the round that had
  the fault: a window listener, no stand-down, and a counter on screen that
  says plainly whether the round moved.
*/
await page.goto(`${B}/review/conjugation`, { waitUntil: "domcontentloaded" });
await startRound(page);
await page.waitForSelector("main", { timeout: 15000 });
await page.waitForTimeout(1200);

const leftNow = async () => ((await page.locator("main").innerText()).match(/(\d+) left/) || [])[1] ?? null;
/*
  THE TABLE IS PLACED AS WELL AS TYPED, AND THIS DRIVER ONLY TYPED.

  The round has two shapes (`question.shape === "match"`): a row of boxes,
  and five empty slots with the five forms on tiles under them, tapped into
  place. This filled `main input`, which on the placed shape counts nought,
  so nothing was answered, "Check the table" stayed correctly disabled, and
  the suite sat on it until Playwright gave up thirty seconds later. A driver
  that knows one shape of a round stops testing anything the day the round
  grows another, which is the fault `scripts/lib/review.mjs` exists for one
  round over.

  The bank is asked for by the group its own markup labels, never by "a
  button with a word in it": a placed slot carries the word too, so the
  loose reading clicks the form back out again and leaves the table emptier
  than it found it. Written that way first, it placed one tile of five,
  never enabled Check, and reported the section clean, which is the shape of
  pass this file's own rules call a check nobody can fail. A tile disables
  as it is spent, so the enabled ones are what is left to place, and the
  guard is a ceiling on a round that never runs out rather than a limit any
  table reaches.

  It answers rather than answers correctly: tapped in the order drawn, which
  is shuffled, the table comes out mostly wrong. That is what the typed
  version did with "x", and what this section wants is a table that has been
  answered so the round can be stepped past.
*/
const fillTable = async () => {
  const boxes = page.locator("main input");
  const typed = await boxes.count();
  for (let i = 0; i < typed; i += 1) await boxes.nth(i).fill("x");

  const bank = page.locator('main [aria-labelledby="conjugation-bank"] button:not([disabled])');
  let placed = 0;
  while (await bank.count() && placed < 12) {
    await bank.first().click();
    placed += 1;
  }
  if (typed === 0 && placed === 0) return false;

  const mark = page.getByRole("button", { name: /^check/i }).first();
  if (!await mark.count() || !await mark.isEnabled()) return false;
  await mark.click();
  await page.waitForTimeout(300);
  return true;
};

let table = await fillTable();
if (table) {
  const onward = page.getByRole("button", { name: /^next/i }).first();
  if (await onward.count()) { await onward.click(); await page.waitForTimeout(500); }
  table = await fillTable();
}

const conjLook = () => page.locator("main").getByRole("button", { name: /See it again/i });
if (table && (await conjLook().count()) > 0) {
  const leftBefore = await leftNow();
  await conjLook().first().click();
  await page.waitForTimeout(400);
  const panelUp = (await page.getByRole("group", { name: /looking back/i }).count()) > 0;

  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  const leftAfter = await leftNow();
  check("the round behind a look back does not advance on the key the panel names",
    panelUp && leftBefore !== null && leftBefore === leftAfter,
    `panel up: ${panelUp}, ${leftBefore} left -> ${leftAfter} left`);
  /*
    And the key does what the caption says it does, which on the newest kept
    showing is walking back out. A panel that swallows the key and sits there
    is the other half of the same fault: the caption would be naming a key
    that does nothing.
  */
  const stillLooking = (await page.getByRole("group", { name: /looking back/i }).count()) > 0;
  check("and that key is the way back out of the panel", !stillLooking);
} else {
  absent(2, "two conjugation tables answered, which this deck could not supply");
}

/**
 * How many grades are waiting on the device.
 *
 * The queue moved from localStorage to IndexedDB when replay became ordered and
 * idempotent (lib/offline/db.ts). A test that keeps reading the old key does not
 * fail loudly — it reads zero and quietly stops testing anything.
 */
const queuedGrades = () => page.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open("kodukeel", 1);
  req.onsuccess = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains("outbox")) return resolve(0);
    const count = db.transaction("outbox", "readonly").objectStore("outbox").count();
    count.onsuccess = () => resolve(count.result);
    count.onerror = () => resolve(-1);
  };
  req.onerror = () => resolve(-1);
}));

// 6 — Reviewing offline: grades are kept, then sent on reconnect
await page.goto(`${B}/review`, { waitUntil: "networkidle" });
await startRound(page);
await page.waitForTimeout(600);
await ctx.setOffline(true);
await answerCurrentCard();
await page.waitForTimeout(2500);
const queued = await queuedGrades();
check("a grade made offline is kept on the device", queued > 0, `${queued} queued`);
check("the session says so rather than failing silently",
  (await page.getByText(/Offline/).count()) > 0);

await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event("online")));
// Poll rather than sleep: the replay is a Server Action round trip.
let stillQueued = await queuedGrades();
for (let i = 0; i < 20 && stillQueued !== 0; i++) {
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  stillQueued = await queuedGrades();
}
check("the queue is sent once the connection is back", stillQueued === 0, `${stillQueued} left`);

/*
  5b — THE SCREEN THAT SAYS WHAT A ROUND IS DOES NOT SWALLOW THE WEBSITE'S KEYS.

  A briefing is a screen with the rail, the dock and, inside a module, the
  step's own bar still around it, and its "press through" answers Enter on
  `window`. Taken bare that cancelled the browser's own activation, so a
  keyboard user who tabbed to any rail link and pressed Enter started the
  round instead of going anywhere: one key, two actions, and the round is the
  one that wins. Measured in a browser because no source check can see which
  handler got the keystroke.
*/
await page.goto(`${B}/review/listening`, { waitUntil: "networkidle" });
const briefingUp = await page.locator("[data-briefing]").count();
if (!briefingUp) {
  absent(2, "a round with a briefing on it: nothing was due for this one");
} else {
  const railLink = page.locator('[data-chrome="rail"] a').first();
  const href = await railLink.getAttribute("href");
  await railLink.focus();
  const wasAt = page.url();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  check("Enter on a focused rail link follows the link rather than starting the round",
    page.url() !== wasAt, `${href} -> ${page.url().replace(B, "")}`);
  await page.goto(`${B}/review/listening`, { waitUntil: "networkidle" });
  await page.locator("[data-briefing]").waitFor({ timeout: 10_000 }).catch(() => {});
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  check("and Enter with nothing focused still starts the round",
    (await page.locator("[data-briefing]").count()) === 0);
}

// 6b — Sõnad, the one game with a board rather than a queue
/*
  Driven with the on-screen keys and not the keyboard, and that is a fact about
  the platform rather than a shortcut. Playwright's `type()` inserts a
  non-ASCII character as text rather than as a key press, so a guess with ü in
  it never reaches the page's `keydown` handler; a real Estonian keyboard sends
  it as a key and does. Tapping the letters is what a learner without those
  keys does anyway, which is the whole reason that card of keys is on the
  screen, so it is the path worth covering.
*/
await page.goto(`${B}/sonad`, { waitUntil: "networkidle" });
await page.evaluate(() => { try { localStorage.clear(); } catch { /* blocked */ } });
await page.reload({ waitUntil: "networkidle" });
/* After the reload, not before it: a reload puts the briefing back. */
await startRound(page);

/*
  The circles and not the keys, which now share `lang="et"`: the keyboard is
  three rows of a real Estonian layout rather than a grid of the alphabet, so
  a selector that only knew "an Estonian letter in a rounded box" would count
  both. `.grid` is what a board circle is and a key is not.
*/
const board = page.locator('[lang="et"].rounded-full.grid');
/*
  Seven, and read off the page's own constant rather than typed: six for six
  is the English game's ratio at a length where Estonian's nine vowels make
  the search wider, so the last row is the one that gets the vowel count.
*/
const rows = await page.evaluate(() => {
  const text = document.querySelector("main")?.textContent ?? "";
  return Number(/6 letters, (\d+) left/.exec(text)?.[1] ?? 0);
});
check("Sõnad draws a row of six for every try", (await board.count()) === rows * 6, `${rows} rows`);
check("and gives seven tries", rows === 7, `${rows}`);

async function tapWord(word) {
  for (const letter of [...word]) await page.getByLabel(letter, { exact: true }).first().click();
}

// A word the dictionary knows, so the board takes it and marks it.
await tapWord("kastan");
await page.getByRole("button", { name: "Guess" }).click();
await page.waitForTimeout(600);
/*
  The state each circle is in, in the app's own words, beside the paint it was
  given. `aria-label` is "<letter>, in place" / ", in the word, elsewhere" /
  ", not in the word", which is what a reader who cannot see the hue is told,
  so it is the one fact on the board that says what a circle means.
*/
const marks = await board.evaluateAll((els) => els
  .filter((e) => e.textContent.trim())
  .map((e) => ({
    state: (e.getAttribute("aria-label") ?? "").split(", ").slice(1).join(", "),
    bg: getComputedStyle(e).backgroundColor,
    ring: getComputedStyle(e).boxShadow,
  })));
const marked = marks.map((m) => m.bg);
check("a guess lands and every circle in it is marked", marked.length === 6);
/*
  A CHECK THAT CANNOT FAIL, WHICH THIS WAS.

  It read `new Set(marked).size > 1 || marked.every((c) => c === marked[0])`,
  and the second half is true exactly when the first is false: either they
  differ or they are all the same, which is true of any six things. So the one
  claim it makes about the board was never once asked.

  What is worth asking is not that the six circles differ, since a guess
  against a word nobody chose can honestly land all in one state. It is that
  two circles the app itself calls different states are drawn differently:
  Sonad's three used to differ by hue alone and the fix was to make them three
  kinds of object, and a palette that collapsed two of them would leave the
  board marking a guess it could not report. The states come off the labels a
  screen reader is given, so the check reads what the app says rather than what
  the suite assumes.
*/
const states = [...new Set(marks.map((m) => m.state))].filter(Boolean);
if (states.length > 1) {
  const drawn = new Set(marks.map((m) => `${m.bg}|${m.ring}`));
  check("two circles in different states are drawn differently",
    drawn.size >= states.length,
    states.map((st) => `${st}: ${marks.find((m) => m.state === st)?.bg}`).join(" · "));
} else {
  absent(1, `every letter of this guess landed in one state (${states[0] ?? "none"}), which a guess `
    + "against the day's own word can do: there was nothing on the board to tell apart");
}

// The letters say what they are in words, because a fill and a ring are both
// visual and a color may not be the only thing carrying a distinction.
const spoken = await board.first().getAttribute("aria-label");
check("a marked circle says what it is in words", /in place|in the word|not in the word/.test(spoken ?? ""));

// And a string of letters that is not a word is refused rather than spent.
await tapWord("zzzzzz");
await page.getByRole("button", { name: "Guess" }).click();
await page.waitForTimeout(300);
check("a non-word is refused", (await page.getByText(/Not a word/).count()) > 0);

await page.reload({ waitUntil: "networkidle" });
await startRound(page);
await page.waitForTimeout(400);
const restored = await board.evaluateAll((els) =>
  els.filter((e) => e.textContent.trim()).map((e) => e.textContent.trim()).join(""));
check("the board comes back after a reload", restored === "kastan");

// 6c — The daily crossword
await page.goto(`${B}/crossword`, { waitUntil: "networkidle" });
await page.evaluate(() => { try { localStorage.clear(); } catch { /* blocked */ } });
await page.reload({ waitUntil: "networkidle" });
/* After the reload, not before it: a reload puts the briefing back. */
await startRound(page);

const grid = page.locator('input[aria-label^="Row "]');
const cellCount = await grid.count();
check("the crossword draws a grid", cellCount > 10);
check("it has clues in both directions",
  (await page.getByText("Across", { exact: true }).count()) > 0
  && (await page.getByText("Down", { exact: true }).count()) > 0);

// A wrong letter, then Check, which has to say so on the cell rather than
// somewhere else: the grid is where the mistake is.
await grid.first().click();
await page.keyboard.type("q");
const beforeCheck = await grid.first().evaluate((el) => getComputedStyle(el).backgroundColor);
await page.getByRole("button", { name: "Check" }).click();
await page.waitForTimeout(300);
const afterCheck = await grid.evaluateAll((els) =>
  els.map((e) => getComputedStyle(e).backgroundColor));
check("Check marks a wrong letter on the cell", new Set(afterCheck).size >= 2 && beforeCheck !== undefined);

// The letter bar is the only way to write õ on a keyboard that has no key for
// it, which is most of them, so it has to be on this screen.
check("the Estonian letter bar is on the grid",
  (await page.locator('button[aria-label^="Insert "]').count()) === 6);

await page.getByRole("button", { name: "Show this one" }).click();
await page.waitForTimeout(300);
const shown = await grid.evaluateAll((els) => els.filter((e) => e.value).length);
check("Show fills the clue that is selected", shown >= 3);

await page.reload({ waitUntil: "networkidle" });
/* After the reload, not before it: a reload puts the briefing back. */
await startRound(page);
await page.waitForTimeout(400);
check("the grid comes back after a reload",
  (await grid.evaluateAll((els) => els.filter((e) => e.value).length)) === shown);

// 6d — The game of the day, on Today
/*
  Which game it is depends on what day the suite runs, so nothing here names
  one: what is checked is that the card points at a round the app has and says
  what is on tomorrow, which is the pair that makes it a week rather than a
  tile. `lib/ux/weekGames.test.ts` is what holds every href to a real mode.
*/
await page.goto(`${B}/`, { waitUntil: "networkidle" });
const featured = page.getByText("Today's game", { exact: false });
if ((await featured.count()) === 0) {
  // Sunday: the quest already has its own richer card on this page, so the
  // game card stands down rather than drawing the same round twice.
  absent(2, "today's featured game is the quest, which has its own card");
} else {
  const inCard = page.locator("a").filter({ hasNotText: "Every mode" });
  const hrefs = await inCard.evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  const modes = ["/sonad", "/crossword", "/review/emoji", "/review/target", "/review/match", "/review/sprint"];
  check("the game of the day links to a round this app has",
    modes.some((m) => hrefs.includes(m)));
  check("and says what is on tomorrow",
    (await page.getByText(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) is /).count()) > 0);
}

// 6d, again: the two columns under the thing to do now end level
/*
  Today used to deal its modules into a wide column and a narrow one by what
  they were for, and on the first morning that put one button on the left
  beside three tall cards on the right. `Columns` in components/ui.tsx lets the
  browser balance the two by height instead, so what is measured here is the
  outcome rather than the class: at this viewport the column ends differ by
  less than the tallest card, which is the best any order-preserving deal can
  do, and no card is split across the seam, which is what `break-inside`
  promises and nothing else would notice failing.
*/
{
  const cols = await page.locator("[data-column-item]").evaluateAll((els) => {
    const byX = new Map();
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const card = el.firstElementChild?.getBoundingClientRect();
      const row = byX.get(Math.round(r.left)) ?? { bottom: 0, tallest: 0, whole: true };
      row.bottom = Math.max(row.bottom, r.bottom + scrollY);
      row.tallest = Math.max(row.tallest, r.height);
      // A card cut at the seam shows as a wrapper shorter than the card in it.
      if (card && card.height > r.height + 1) row.whole = false;
      byX.set(Math.round(r.left), row);
    }
    return [...byX.values()];
  });
  check("Today deals its cards into two columns at 1280", cols.length === 2);
  const [a, b] = cols;
  check("and the two columns end level, within one card of each other",
    cols.length === 2 && Math.abs(a.bottom - b.bottom) < Math.max(a.tallest, b.tallest));
  check("and no card is split across the seam", cols.every((c) => c.whole));
}

// 6e — Say what you see: a picture, a case, and the ending you actually wrote
/*
  The one thing this mode can do that no other screen can: when the ending is
  wrong it says which ending you wrote, by name. That is worth driving in a
  browser rather than trusting the unit test, because the sentence is assembled
  out of three sources (the mechanical mark, the case table, and the form the
  server revealed) and any of them going missing leaves a grammatical sentence
  that says nothing.
*/
await page.goto(`${B}/review/describe`, { waitUntil: "networkidle" });
await startRound(page);
const box = page.locator("#sentence");
if ((await box.count()) === 0) {
  absent(4, "no scene at this level: the dictionary has no banded noun with a picture and a stem");
} else {
  check("the picture is three characters and none of them is announced as an image",
    (await page.locator("p [aria-hidden='true']").first().innerText()).trim().split(/\s+/).length === 3);
  check("and a screen reader is told the same three things in English",
    (await page.locator(".sr-only").filter({ hasText: /^A picture of/ }).count()) > 0);

  // A sentence with none of the scene's words in it: the mark is certain and
  // the reveal names what was in the picture.
  await box.fill("Ma ei tea sellest midagi.");
  await page.getByRole("button", { name: /Check it/ }).click();
  await page.waitForTimeout(3500);
  const verdict = (await page.locator("[aria-live='polite'] p").first().innerText()).replace(/\s+/g, " ");
  check("a sentence without the word is marked against the dictionary and given the form",
    /is not in that sentence/.test(verdict) && /The .+ is /.test(verdict));
  check("and the three words are revealed with their meanings afterwards",
    (await page.getByText("What was in the picture").count()) > 0);
}

// 7 — Command palette
await page.goto(`${B}/`, { waitUntil: "networkidle" });
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
check("⌘K opens the palette", (await page.getByLabel("Search commands and words").count()) > 0);
await page.getByLabel("Search commands and words").fill("tuba");
await page.waitForTimeout(200);
check("the palette offers a dictionary lookup for anything it doesn't know",
  (await page.getByText(/Look up/).count()) > 0);

/*
  And it finds a place whose name a UK keyboard cannot type, which is the
  fault this caught: `Sõnad` was matched with a plain `includes`, so typing
  `sonad` found nothing and the only place in the app with an Estonian name at
  the time was unreachable from the box that promises to go anywhere.
*/
await page.getByLabel("Search commands and words").fill("sonad");
await page.waitForTimeout(250);
check("and finds Sõnad typed without the diacritic",
  (await page.getByText("Sõnad", { exact: false }).count()) > 0);

/*
  There are two Estonian names in the box now, so the second one is asked the
  same question, and then the question the rename actually raises: somebody who
  knows the game as a crossword and has never met the word `ristsõna` has to
  find it by the English name. That is not the label any more, it is the
  subtitle, and the palette searches a mode's subtitle and blurb as keywords.
  Both halves of the rename are therefore one line each, and either failing is
  a game somebody cannot reach.
*/
await page.getByLabel("Search commands and words").fill("ristsona");
await page.waitForTimeout(250);
check("and finds Ristsõna typed without the diacritic",
  (await page.getByRole("button", { name: /Ristsõna/ }).count()) > 0);

await page.getByLabel("Search commands and words").fill("crossword");
await page.waitForTimeout(250);
check("and still finds it under the English name it is described by",
  (await page.getByRole("button", { name: /Ristsõna/ }).count()) > 0);
await page.keyboard.press("Escape");

// 8 — The app is installable
const manifest = await page.request.get(`${B}/manifest.webmanifest`);
const manifestBody = await manifest.json();
check("a web app manifest is served", manifest.ok() && manifestBody.name.includes("Kodukeel"));
const sw = await page.request.get(`${B}/sw.js`);
check("the service worker is served", sw.ok());

console.log(errors.length ? `\nconsole/page errors:\n  ${errors.join("\n  ")}` : "\nno console errors");
await browser.close();
done();
