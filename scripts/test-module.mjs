#!/usr/bin/env node
import { launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { startRound } from "./lib/briefing.mjs";

/**
 * TONIGHT'S MODULE, WALKED, AND THE FOUR THINGS ONLY A BROWSER CAN SAY.
 *
 * `lib/course/focus.test.ts` decides everything about the marker that can be
 * decided without one: that it goes out and comes back the same over every day
 * of every part, that it survives the ids the programmes use, that it refuses
 * a half-read value, and that the way on is the next step in the day's order.
 * `scripts/test-invariants.ts` holds the shape of the code around it.
 *
 * None of that can see the thing that was reported, which is what a learner
 * meets on the screen. The rail is hidden by a CSS selector reading an element
 * drawn several components away; whether the reading page still carries a
 * drill depends on a prop reaching a branch; and whether pressing on ticks the
 * step is a Server Action, a redirect and a re-render, three processes apart.
 * Every one of those is green in the source and provable only by opening it.
 *
 * So this opens the module, presses on from a step, and asks:
 *
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm start
 *   node scripts/test-module.mjs
 *
 * It ticks a step, which is what a learner does, and it deletes the rows it
 * wrote. `requireLocalDatabase` guards that like every other script here that
 * removes one.
 */
const B = baseUrl();
const OWNER = "local-single-user";
/** Where a module step's one quiet way back goes, and where an evening ends. */
const MODULE_HOME = "/course";

/**
 * Every screen a step of a module can open.
 *
 * `ACTIVITIES` in `lib/course/types.ts` is the one table of the rounds, plus
 * the ladder, the reading, the conversation and the closing queue. This list
 * has to match it and cannot import it, because a browser suite here is `.mjs`
 * and that file is TypeScript behind a path alias; `scripts/test-invariants.ts`
 * reads both and fails on a round in one and not the other, which is the only
 * thing that keeps a second list honest.
 *
 * The two grammar pages are the reading's two shapes, and the topics named are
 * the ones carrying a drill and a table of real verbs, which is where two of
 * the six doors were found.
 */
const MODULE_SCREENS = [
  "/review/match", "/review/listening", "/review/sprint", "/review/sentences", "/review/dictation",
  "/review/emoji", "/review/describe", "/sonad", "/review/target", "/review/conjugation",
  "/review/speaking", "/review/write", "/review/government", "/review/exceptions",
  "/review/flashcards", "/review/letters",
  "/review", "/course/learn", "/situations/poodi-piima",
  "/grammar/topic/imperative", "/grammar/topic/government", "/grammar/inessive",
];

const prisma = newPrismaClient();
await requireLocalDatabase(prisma);

/*
  THE FLOOR IS WHAT THE SHORTEST HONEST EVENING REACHES, NOT WHAT TONIGHT DID.

  The walk asks five things at every step, and how many steps an evening has is
  the programme's business: an ordinary one is five and one carrying a
  conversation is three, because a conversation replaces the reading and both
  rounds. A floor set to the run in front of me would fail on a fixture whose
  learner opens on a different part, which is a suite reporting the database
  rather than the code.

  So the floor is the three-step evening, and what actually catches a block
  that stopped running is the check below that the walk visited every step the
  list named. A floor alone cannot do it here and saying so is better than a
  number that looks stricter than it is. The five reading checks below run on
  every evening now, off the walk's own marker when the evening dealt no
  reading, so they are in the floor: 33 was the three-step evening with them
  waived.
*/
const { check, absent, done } = suite("Tonight's module", { floor: 38 });

/** The module's own screen, with a programme running. */
async function openModule(page) {
  await page.goto(`${B}/course`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 20_000 });
  /* Only the button that takes up the course, never a step's own Start: the
     two read alike and clicking the wrong one opens a step instead of the
     list. */
  const take = page.getByRole("button", { name: /^Start the course/i }).first();
  if (await take.count()) {
    await take.click();
    await page.waitForSelector("ol > li", { timeout: 20_000 });
  }
}

/** Every step on the list, with the href its own button opens. */
async function stepsOn(page) {
  return page.locator("ol > li").evaluateAll((rows) =>
    rows.map((row) => ({
      title: row.querySelector("p.font-semibold")?.textContent?.trim() ?? "",
      chip: [...row.querySelectorAll("span")].map((s) => s.textContent?.trim()).filter(Boolean).at(-1) ?? "",
      open: row.querySelector("[data-step-start] a")?.getAttribute("href")
        ?? (row.querySelector("[data-step-start] button") ? "button" : null),
    })).filter((r) => r.title));
}

const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await openModule(page);
  const steps = await stepsOn(page);
  check("the module lists tonight's steps", steps.length >= 3, `${steps.length} steps`);

  /*
    THE WHOLE EVENING IS WALKED, STEP BY STEP, THE WAY A LEARNER WALKS IT.

    Only the open step carries a button, which is the list's whole argument:
    one thing to do at a time. So this presses that button and then presses on
    until the evening runs out, which is the only way to reach the later steps
    without inventing addresses the app never wrote.

    AND THE QUESTION IS ASKED AT EVERY ONE OF THEM. The report was about the
    reading, and the reading was only where somebody happened to notice: a
    round's own finish screen offers Today, the practice menu and another
    round, and an empty one offers the dictionary. Checking the step that was
    reported and trusting the rest is how the next one of these reaches a
    learner. Whatever tonight's rotation dealt is walked, so the evenings that
    carry a conversation or a game are covered by the same loop without it
    being told what they are.
  */
  /*
    AND THE WALK STARTS WHERE THE EVENING IS OPEN, WHICH IS NOT ALWAYS STEP ONE.

    Meeting the words is proved by the review log rather than ticked, so on a
    database where the day's words have already been met the list opens on the
    reading and there is no way into the step behind it. CI found this and the
    fixture here could not: its demo learner starts on A2.1 with the words
    already in the deck, so the walk began at step 2 of 5 while this box began
    at step 1 of 5. The steps behind the open one are waived by name, so the
    floor still means something and the reason is on the screen.
  */
  const openAt = steps.findIndex((s) => s.open !== null);
  check("the list has exactly one way in", openAt >= 0 && steps.filter((s) => s.open !== null).length === 1);
  /* One waiver per step rather than a multiplication, because the count a
     waiver carries has to be a number a reader can check against the block it
     stands for, and `scripts/test-invariants.ts` holds every suite here to
     that. Six is what the loop below asks at each step. */
  for (const behind of steps.slice(0, Math.max(0, openAt))) {
    absent(6, `"${behind.title}" to be unfinished: it was already done before this run, and the list offers no way back into a step behind the open one`);
  }

  const first = page.locator("[data-step-start] a, [data-step-start] button").first();
  check("the open step has one way in", await first.count() === 1);
  await first.click();
  await page.waitForFunction(
    () => !location.pathname.startsWith("/course") || location.search.includes("module="),
    null, { timeout: 20_000 },
  );
  await page.waitForSelector("main h1", { timeout: 20_000 });
  check("which opens it inside the module", page.url().includes("module="), decodeURIComponent(page.url().replace(B, "")));

  /**
   * Every link the page offers, minus the module's own way back to the list.
   *
   * `MODULE_HOME` is handed in rather than closed over: `evaluateAll` runs its
   * function in the browser, where nothing this file declares exists, and a
   * constant read from the outer scope is a `ReferenceError` at the one moment
   * the check was supposed to be looking.
   */
  const waysOut = () => page.locator("#main a[href]").evaluateAll(
    (els, home) => [...new Set(els.map((e) => e.getAttribute("href")))].filter((h) => h !== home),
    MODULE_HOME,
  );

  const walked = [];
  let reading = null;
  /*
    THE MARKER, FROM WHICHEVER STEP CARRIED ONE FIRST.

    It used to be read off the reading alone, and an evening whose conversation
    replaces the reading has none: `marker` came back null, the offline block
    below built its address as `?module=`, which `readFocus` correctly refuses,
    and the four checks about a step surviving the plug being pulled measured a
    page with no frame on it and failed every time that evening came round.
    They were failing on CI for exactly that reason and the message named the
    missing frame rather than the missing marker, which is a failure misnaming
    its own cause. Every step of the walk is inside the module and says so in
    its own address, so the first of them is as good a marker as the reading's.
  */
  let marker = null;
  for (let step = 0; step < 12; step += 1) {
    /* Through the briefing, so every check below is about the round. */
    await startRound(page, { waitMs: 600 });
    const here = decodeURIComponent(new URL(page.url()).pathname);
    walked.push(here);
    check(`step ${walked.length} draws the frame  (${here})`, await page.locator(".module-step").count() === 1);
    const away = await waysOut();
    check(`and nothing on it leads out of the module  (${here})`, away.length === 0, JSON.stringify(away));
    for (const part of ["rail", "dock", "anu"]) {
      check(
        `and the ${part} is off the screen  (${here})`,
        !(await page.locator(`[data-chrome="${part}"]`).isVisible().catch(() => false)),
      );
    }
    if (/\/grammar\//.test(here)) reading = page.url();
    marker ??= new URL(page.url()).searchParams.get("module");

    const was = page.url();
    await page.locator(".module-step").getByRole("button", { name: /Continue|Finish/ }).click();
    await page.waitForFunction((u) => location.href !== u, was, { timeout: 30_000 });
    await page.waitForSelector("main h1", { timeout: 30_000 });
    /*
      AND THE FIRST PRESS ON HANDS THE CARET TO WHAT IT OPENED.

      The bar lives in the shell and survives the navigation it causes, so the
      browser leaves focus on a button now sitting above a different screen:
      measured, the body. A keyboard walked back to the top for every step of
      every evening and a screen reader was told nothing about arriving
      somewhere new. Asked once rather than per step, because it is one
      mechanism and five copies of the answer is five copies.
    */
    if (walked.length === 1) {
      /* Waited for rather than sampled: the caret is moved by an effect, which
         runs after React has committed the new route, and `waitForSelector`
         resolves as soon as the markup is there. A check that reads it in the
         same tick is asserting this machine's scheduling. */
      await page.waitForFunction(
        () => document.activeElement === document.querySelector("#main h1"),
        null, { timeout: 5_000 },
      ).catch(() => {});
      const caret = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return "the body";
        return a === document.querySelector("#main h1") ? "the heading" : (a.tagName.toLowerCase());
      });
      check("pressing on hands the caret to the step it opened", caret === "the heading", caret);

      /*
        A PHONE ON ITS SIDE IS SHORT RATHER THAN NARROW.

        Every other check in this suite pins the height at 900 and the phone
        suite pins it at 740, so the one shape neither sees is a phone turned
        over. Measured at 844x390 before the rule that fixed it: the bar was
        91px and the page reserved another 128 under it, so a third of the
        screen went to the way on, on a step whose job is text somebody is
        reading. Asked here because this is the first point in the walk with an
        address in hand: the step the list opens on is a button, since that is
        the one press that writes cards.
      */
      const sideways = await browser.newPage({ viewport: { width: 844, height: 390 } });
      await sideways.goto(page.url(), { waitUntil: "domcontentloaded" });
      await sideways.waitForSelector("main h1", { timeout: 20_000 });
      const share = await sideways.evaluate(() => {
        const bar = document.querySelector(".module-step")?.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(document.querySelector("main")).paddingBottom);
        return bar ? { taken: Math.round(((innerHeight - bar.top) / innerHeight) * 100), pad: Math.round(pad) } : null;
      });
      await sideways.close();
      check(
        "a phone on its side keeps most of the screen for the step",
        share !== null && share.taken <= 22 && share.pad <= 100,
        JSON.stringify(share),
      );
    }
    /* The last step's way on is the list, which is where the evening ends. */
    if (new URL(page.url()).pathname === MODULE_HOME) break;
    check(`pressing on stays inside the module  (after ${here})`, page.url().includes("module="));
  }
  check("the evening ends on the module's own screen", new URL(page.url()).pathname === MODULE_HOME, walked.join(" -> "));
  /* Every step from the open one to the end, and no fewer: this is what
     catches a block of the loop quietly not running, which the floor above
     cannot. Counted from where the walk could start rather than from the top
     of the list, since the steps behind it were finished before this run and
     were waived by name above. */
  check(
    "and every step the list left to do was walked",
    walked.length === steps.length - Math.max(0, openAt),
    `${walked.length} walked of ${steps.length - Math.max(0, openAt)} left of ${steps.length} listed`,
  );

  /*
    AN EVENING WITH NO READING STILL HAS A READING TO ASK ABOUT.

    The waiver here used to say "this day is a conversation, which replaces
    it", and on the fixture that was never the reason: the demo learner opens
    on the first evening of A1.1, whose steps are the words, two rounds and the
    review, because A1's first two evenings read nothing (`reads()` in
    `lib/course/build.ts`). So these five checks were waived on every run CI
    has ever made. The drill checks below already carry the marker the app
    wrote onto a grammar page of their choosing, which is the same address in
    the same shape, so the reading is asked that way too when the walk dealt
    none. Only a walk that produced no marker at all is waived.
  */
  const readingAt = reading ?? (marker ? `${B}/grammar/topic/imperative?module=${encodeURIComponent(marker)}` : null);
  if (!readingAt) {
    /* Five, counted off the block below rather than guessed: a waiver lowers
       the floor by exactly as much as it skips, and one too many is a block
       that can stop running without the floor noticing. */
    absent(5, "a marker the app wrote: no step of this evening carried one, so there is no reading address to ask");
  } else {
    await page.goto(readingAt, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main h1", { timeout: 20_000 });
    check(
      "the reading says which step of the evening it is",
      /* `label-xs` uppercases, which is what this caption wears like every
         other label in the app, so the reading is case-blind rather than the
         caption being made an exception. */
      /step \d+ of \d+/i.test(await page.locator(".module-step").innerText()),
      (await page.locator(".module-step").innerText()).split("\n")[0],
    );

    /* The last thing on the page is readable rather than under the bar, which
       is what the padding rule is for and what its ordering against the
       conversation's own decides. */
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const foot = await page.evaluate(() => {
      const bar = document.querySelector(".module-step").getBoundingClientRect();
      const leaves = [...document.querySelectorAll("#main *")]
        .filter((e) => !e.closest(".module-step") && !e.children.length && e.textContent?.trim());
      const last = leaves.at(-1)?.getBoundingClientRect();
      return { bar: Math.round(bar.top), last: last ? Math.round(last.bottom) : 0 };
    });
    check("the foot of the reading is clear of the bar", foot.last <= foot.bar, JSON.stringify(foot));

    /*
      AND THE DRILL, WHICH IS THE THING THAT WAS REPORTED, ON A PAGE THAT HAS
      ONE.

      Only four grammar topics carry a drill, and the reading an evening deals
      is whichever point its unit teaches next, so asking this on the page the
      walk happens to land on is a check that passes by having nothing to find.
      That is the fault `scripts/lib/checks.mjs` gives a suite a floor to catch,
      one check further in. So the marker the app itself wrote is carried onto
      a topic that does have one, which is the same address in the same shape
      with the same step behind it, and the page is asked there.
    */
    const readingMarker = new URL(readingAt).searchParams.get("module");
    check("the reading's address carries a readable marker", Boolean(readingMarker), String(readingMarker));
    for (const [what, path] of [["topic", "/grammar/topic/government"], ["ending", "/grammar/inessive"]]) {
      await page.goto(`${B}${path}?module=${encodeURIComponent(readingMarker)}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("main h1", { timeout: 20_000 });
      check(
        `the ${what} page with a drill does not offer it inside a module`,
        await page.getByText("Drill it", { exact: true }).count() === 0,
      );
    }
  }

  /*
    AND THE STEPS THE LOG DOES NOT PROVE ARE FINISHED WITHOUT BEING TICKED.

    The half a learner reported: they read the page, came back, and were asked
    to press "I did this" about it. A Server Action, a redirect and a re-render
    apart, so only a browser can say it. Meeting the words and the closing
    round are deliberately not among them, since those are read off the review
    log and this press writes nothing for either.
  */
  await openModule(page);
  const after = await stepsOn(page);
  const ticked = after.filter((s) => s.chip === "Done").map((s) => s.title);
  check(
    "walking the evening finished the steps a press can finish",
    ticked.length >= 1 && after.some((s) => /Read the point/i.test(s.title) ? s.chip === "Done" : true),
    ticked.join(" | ") || "none",
  );

  /*
    AND EVERY ROUND A ROTATION CAN DEAL, NOT ONLY THE TWO TONIGHT DEALT.

    The walk above proves the mechanism on whatever the evening dealt, and an
    evening deals two rounds out of ten, so one run of it sees a fifth of them.
    That is not a measurement of the rule, and saying so is not theoretical:
    the walk found `Full entry` on the review card, CI's walk found the verb
    table on an A2 reading, and opening all of them found four more that no
    single evening would have reached. "Back to practice" on the two boards'
    opening screens, the lesson behind a conversation, and the sprint's link
    to its own pace.

    So every screen a step can open is opened with a marker the app itself
    wrote, and asked the one question: does anything here leave the module.
    `MODULE_SCREENS` has to match the course's own table, which
    `scripts/test-invariants.ts` asserts, because this file is `.mjs` and
    cannot import it: a list that drifts is the fifth door nobody counted.
  */
  if (!marker) {
    absent(1, "a marker the app wrote: no step of this evening carried one");
  } else {
    const wayOut = [];
    for (const screen of MODULE_SCREENS) {
      await page.goto(`${B}${screen}?module=${encodeURIComponent(marker)}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("main h1", { timeout: 30_000 });
      /*
        A round opens on the screen that says what it is, and that screen has
        no doors on it by construction: asking it whether a round leads out of
        the module is a check that cannot fail. So it is pressed through and
        the round itself is asked.
      */
      await startRound(page, { waitMs: 800 });
      const away = await waysOut();
      const framed = await page.locator(".module-step").count() === 1;
      if (away.length || !framed) wayOut.push(`${screen} ${framed ? "" : "(no frame) "}${JSON.stringify(away)}`);
    }
    check(
      `none of the ${MODULE_SCREENS.length} screens a step can open leads out of the module`,
      wayOut.length === 0,
      wayOut.join("  ·  "),
    );
  }

  /*
    AND A PRESS WITH THE PLUG OUT LEAVES THE ROOM STANDING.

    A Server Action returns a refusal it has and *throws* when it has no
    answer at all, and an uncaught rejection out of a transition takes the tree
    with it. Measured before the catch that fixed it: `#main` was empty, the
    bar was gone and the learner was looking at a blank screen with the step's
    own address still in the bar. On a feature whose promise is that a step is
    a room you cannot wander out of, the way on deleting the room is the worst
    of the failure modes, and it needs no network to be reached.

    Driven rather than reasoned about, because none of it is visible in the
    source: what a rejection does to a React tree is a fact about the runtime.
  */
  if (!marker) {
    /* Four, counted off the block below: a waiver lowers the floor by exactly
       as much as it skips. It cannot happen while the walk above is green,
       since every step of it is asserted to carry a marker, and it is here
       because the alternative is building an address out of the word "null"
       and measuring the page that refuses it. */
    absent(4, "a step address carrying the app's own marker, which the walk above did not produce");
  } else {
  const dark = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const unplugged = await dark.newPage();
  try {
    await unplugged.goto(`${B}${MODULE_HOME}`, { waitUntil: "domcontentloaded" });
    await unplugged.evaluate(() => navigator.serviceWorker?.ready);
    await unplugged.waitForTimeout(1_000);
    const step = reading ?? `${B}${MODULE_SCREENS[0]}?module=${encodeURIComponent(marker)}`;
    await unplugged.goto(step, { waitUntil: "domcontentloaded" });
    await unplugged.waitForSelector("main h1", { timeout: 20_000 });
    await unplugged.waitForTimeout(800);

    await dark.setOffline(true);
    /* The step itself still opens, which is what the page cache is for. */
    await unplugged.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await unplugged.waitForTimeout(1_200);
    check(
      "a module step opens again with the network gone",
      await unplugged.locator(".module-step").count() === 1
        && (await unplugged.locator("#main").innerText().catch(() => "")).trim().length > 0,
    );

    await unplugged.locator(".module-step").getByRole("button", { name: /Continue|Finish/ })
      .click().catch(() => {});
    await unplugged.waitForTimeout(4_000);
    const left = await unplugged.evaluate(() => ({
      bar: !!document.querySelector(".module-step"),
      main: (document.querySelector("#main")?.textContent || "").trim().length,
      live: [...document.querySelectorAll(".module-step button")]
        .some((b) => /Continue|Finish/.test(b.textContent || "") && !b.disabled),
    }));
    check("and pressing on with it gone leaves the room standing", left.bar && left.main > 0, JSON.stringify(left));
    check("with the way on still pressable", left.live, JSON.stringify(left));
    check(
      "and says the step was not ticked",
      /did not reach the server/i.test(await unplugged.locator(".module-step").innerText().catch(() => "")),
    );
  } finally {
    await dark.setOffline(false);
    await dark.close();
  }
  }

  /*
    AND THE SAME PAGE REACHED ANY OTHER WAY IS THE PAGE IT WAS.

    The frame is drawn off the address, so nothing above is a change to the
    reference: a learner who opens it from the grammar index still gets the
    units that teach the point and the drill on their own deck.
  */
  await page.goto(`${B}/grammar/topic/government`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 20_000 });
  check("the reference outside a module keeps its rail", await page.locator('[data-chrome="rail"]').isVisible());
  check("and its drill", await page.getByText("Drill it", { exact: true }).count() === 1);
  check("and no frame is drawn over it", await page.locator(".module-step").count() === 0);
} finally {
  /*
    THE COURSE PUT BACK WHERE IT WAS FOUND.

    Every tick for this owner, not only the ones this walk wrote: `dayReached`
    is the furthest day carrying one, so leaving a tick behind would open the
    next run on a later evening with different steps, and the walk would be
    measuring a day it did not choose. Clearing them is what makes a second run
    the same run. A tick is append-only in the app and this is the one path
    allowed to remove one, which is why `requireLocalDatabase` guards it.
  */
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await browser.close();
  await prisma.$disconnect();
}

done();
