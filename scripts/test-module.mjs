#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { startRound } from "./lib/briefing.mjs";

/**
 * TODAY'S MODULE, WALKED, AND THE FOUR THINGS ONLY A BROWSER CAN SAY.
 *
 * `lib/course/focus.test.ts` decides everything about the marker that can be
 * decided without one: that it goes out and comes back the same over every day
 * of every part, that it survives the ids the programs use, that it refuses
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
  "/review/match", "/review/listening", "/review/sentences", "/review/dictation",
  "/review/describe", "/sonad", "/review/conjugation",
  "/review/speaking", "/review/write", "/review/government", "/review/exceptions",
  "/review/flashcards", "/review/letters", "/review/workbook", "/review/numbers",
  "/review", "/course/learn", "/situations/poodi-piima",
  "/grammar/topic/imperative", "/grammar/topic/government", "/grammar/inessive",
];

const prisma = newPrismaClient();
await requireLocalDatabase(prisma);

/*
  THE WALK RUNS ON A LESSON EVENING, BECAUSE EVERY LEVEL IS THE LESSONS.

  An evening is one step, the lesson, whose own six steps happen inside the
  lesson screen (docs/43-lessons.md, P3, and every level the same way since
  §16). The walk of an evening built out of units, its steps one after another
  with the reading and the rounds between them, went with the last such part,
  and so did the checks that only it could reach. What is asked is the lesson
  evening: its one step, the lesson drawn inside the module and leading
  nowhere out of it, the marker it carries opening every screen a module can
  frame, a press with the plug out, and finishing the lesson ticking the
  evening and filling the deck. The learner's part is pinned to A1.1 for the
  walk and put back afterwards.
*/
const PROGRAMME_KEY = "programme";
const keptProgramme = await prisma.setting.findUnique({ where: { ownerId_key: { ownerId: OWNER, key: PROGRAMME_KEY } } });
async function pinProgramme(value) {
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await prisma.setting.upsert({
    where: { ownerId_key: { ownerId: OWNER, key: PROGRAMME_KEY } },
    create: { ownerId: OWNER, key: PROGRAMME_KEY, value },
    update: { value },
  });
}
await pinProgramme("a1.1");

/*
  THE FLOOR IS THE LESSON EVENING'S, COUNTED OFF A RUN: its two list checks, the
  lesson drawn and leading nowhere out, the sweep, the four offline checks, the
  three ticks and cards, and the reference outside a module.
*/
const { check, absent, done } = suite("Today's module", { floor: 15 });

/** The module's own screen, with a program running. */
async function openModule(page) {
  await page.goto(`${B}/course`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 20_000 });
  /* Only the button that takes up the course, never a step's own Start: the
     two read alike and clicking the wrong one opens a step instead of the
     list. */
  const take = page.getByRole("button", { name: /^Start the course/i }).first();
  if (await take.count()) {
    await take.click();
    await page.waitForSelector("ol[data-step-list] > li", { timeout: 20_000 });
  }
}

/**
 * Every step on the list, with the href its own button opens. Read off the
 * list's own hook, since the hero above it is an `ol` of the same steps drawn
 * as cards, which are not something a learner presses.
 */
async function stepsOn(page) {
  return page.locator("ol[data-step-list] > li").evaluateAll((rows) =>
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
  /**
   * Every link the page offers, minus the module's own way back to the list
   * and the one deliberate door back into the app, which the bar marks
   * `data-module-leave` and which is asserted on its own below: a door a
   * round left open and the door the frame draws on purpose read identically
   * as hrefs, so the mark is what tells them apart.
   *
   * `MODULE_HOME` is handed in rather than closed over: `evaluateAll` runs its
   * function in the browser, where nothing this file declares exists, and a
   * constant read from the outer scope is a `ReferenceError` at the one moment
   * the check was supposed to be looking.
   */
  const waysOut = () => page.locator("#main a[href]").evaluateAll(
    (els, home) => [...new Set(els
      .filter((e) => !e.hasAttribute("data-module-leave"))
      .map((e) => e.getAttribute("href")))].filter((h) => h !== home),
    MODULE_HOME,
  );

  /*
    AN A1 EVENING IS ONE LESSON.

    One step on the list, opening the lesson inside the module, so the way on
    and the evening's place are drawn round it like any other step.
  */
  await openModule(page);
  const lessonSteps = await stepsOn(page);
  check("an A1 evening lists one step, the lesson", lessonSteps.length === 1
    && /^Lesson /.test(lessonSteps[0]?.title ?? ""), JSON.stringify(lessonSteps));
  const lessonHref = lessonSteps[0]?.open ?? "";
  check("which opens the lesson inside the module", /^\/course\/lessons\/[^?]+\?module=/.test(lessonHref), lessonHref);
  if (lessonHref.startsWith("/")) {
    await page.goto(`${B}${lessonHref}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main h1", { timeout: 20_000 });
    check("and the lesson is drawn as a step of tonight's module", await page.locator(".module-step").count() > 0);
    const away = await waysOut();
    check("and nothing on it leads out of the module", away.length === 0, JSON.stringify(away));

  }
  const marker = lessonHref.startsWith("/") ? new URL(`${B}${lessonHref}`).searchParams.get("module") : null;
  const reading = lessonHref.startsWith("/") ? `${B}${lessonHref}` : null;

  /*
    AND EVERY ROUND A ROTATION CAN DEAL, NOT ONLY THE TWO TONIGHT DEALT.

    A lesson evening opens one screen, the lesson, and the frame is drawn off
    the address, so a marker the app wrote opens any round as a step of the
    module. The walk of an evening built from units used to prove this on the
    two rounds it dealt; that walk went with the last such part.
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
    absent(1, "a marker the app wrote: the lesson step carried none");
  } else {
    const wayOut = [];
    /*
      The Learn ladder is a step of an evening built from units, and a lesson
      evening's marker asks it about a day whose one step is the lesson, which
      it answers by pointing at the lesson. No learner reaches that, so it is
      the one screen of the table this sweep leaves out; the ladder goes with
      the unit builder (docs/43-lessons.md §15.14, step 7).
    */
    for (const screen of MODULE_SCREENS.filter((s) => s !== "/course/learn")) {
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
      `none of the ${MODULE_SCREENS.length - 1} screens a lesson's marker can open leads out of the module`,
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
    absent(4, "a step address carrying the app's own marker, which the lesson step did not carry");
  } else {
  /* A phone, where the way on is the bar and is on the screen on every step:
     the press is the same action as a desktop's "Next", through the same
     hook, so one of the two is enough to ask. */
  const dark = await browser.newContext({ viewport: { width: 390, height: 844 } });
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

    /* Whichever way on is on the screen: the bar's quiet "Next step", or the
       named "Next" where the step ends, which the bar stands aside for while
       it is in view. A short screen, which a step drawn offline often is, has
       its end in view from the start, so on that screen the bar carries none. */
    const wayOn = unplugged.locator("[data-module-next] button").first();
    const pressIn = (await wayOn.isVisible().catch(() => false))
      ? wayOn
      : unplugged.locator(".module-step").getByRole("button", { name: /Next step|Finish/ });
    await pressIn.click().catch(() => {});
    await unplugged.waitForTimeout(4_000);
    const left = await unplugged.evaluate(() => ({
      bar: !!document.querySelector(".module-step"),
      main: (document.querySelector("#main")?.textContent || "").trim().length,
      live: [...document.querySelectorAll(".module-step button, [data-module-next] button")]
        .some((b) => /Next|Finish/.test(b.textContent || "") && !b.disabled
          && b.getBoundingClientRect().height > 0),
    }));
    check("and pressing on with it gone leaves the room standing", left.bar && left.main > 0, JSON.stringify(left));
    check("with the way on still pressable", left.live, JSON.stringify(left));
    check(
      "and says the step was not ticked",
      /didn.t reach us|did not reach the server/i.test(await unplugged.locator("body").innerText().catch(() => "")),
    );
  } finally {
    await dark.setOffline(false);
    await dark.close();
  }
  }

  if (lessonHref.startsWith("/")) {
    await page.goto(`${B}${lessonHref}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main h1", { timeout: 20_000 });
    /*
      AND FINISHING IT FINISHES THE EVENING AND FILLS THE DECK.

      Six steps, pressed through the way a learner presses them, and then the
      two things nothing short of a browser and a database can say: the
      evening is ticked, and every word the lesson taught has a card behind
      it, so it comes back in Review. A fifth of A1 once had no card at all.
    */
    const lessonId = lessonHref.split("?")[0].split("/").at(-1);
    const heads = JSON.parse(execFileSync("npx", ["tsx", "-e",
      `import { LESSONS } from "./lib/course/lessons"; import { lessonHeads } from "./lib/course/lessonHeads";
       process.stdout.write(JSON.stringify(lessonHeads(LESSONS.find((l) => l.id === ${JSON.stringify(lessonId)}))));`,
    ], { encoding: "utf8" }));
    const onward = page.getByRole("button", { name: /^(Continue|Skip this step|Finish the lesson)/ }).last();
    for (let i = 0; i < 6 && (await onward.count()) > 0; i++) {
      await onward.click();
      await page.waitForTimeout(400);
    }
    await page.getByRole("heading", { name: "Lesson done" }).waitFor({ timeout: 20_000 }).catch(() => {});
    check("pressing through all six steps ends the lesson", await page.getByRole("heading", { name: "Lesson done" }).count() === 1);
    let ticked = 0;
    for (let i = 0; i < 40 && ticked === 0; i++) {
      ticked = await prisma.courseStep.count({ where: { ownerId: OWNER, programmeId: "a1.1", dayId: lessonId, stepId: "lesson" } });
      if (ticked === 0) await page.waitForTimeout(250);
    }
    check("and ticks the evening it is", ticked === 1, `${ticked} tick(s) on ${lessonId}`);
    const carded = new Set((await prisma.card.findMany({
      where: { ownerId: OWNER, cardType: "RECOGNITION", lexeme: { lemma: { in: heads } } },
      select: { lexeme: { select: { lemma: true } } },
    })).map((c) => c.lexeme.lemma));
    const cardless = heads.filter((h) => !carded.has(h));
    check("and every word it taught has a card in the deck", heads.length > 0 && cardless.length === 0,
      `${heads.length} taught, no card for: ${cardless.join(", ")}`);
  } else {
    absent(4, "the lesson step carried no address to open");
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
  if (keptProgramme) {
    await prisma.setting.update({ where: { ownerId_key: { ownerId: OWNER, key: PROGRAMME_KEY } }, data: { value: keptProgramme.value } });
  } else {
    await prisma.setting.deleteMany({ where: { ownerId: OWNER, key: PROGRAMME_KEY } });
  }
  await browser.close();
  await prisma.$disconnect();
}

done();
