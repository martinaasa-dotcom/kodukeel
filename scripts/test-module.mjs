#!/usr/bin/env node
import { launchChromium } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

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

const prisma = newPrismaClient();
await requireLocalDatabase(prisma);

const { check, absent, done } = suite("Tonight's module", { floor: 22 });

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
    THE EVENING IS WALKED RATHER THAN JUMPED INTO.

    Only the open step carries a button, which is the list's whole argument:
    one thing to do at a time. So this presses that button and then presses on,
    which is the path a learner takes and the only way to reach the second step
    without inventing an address the app never wrote.
  */
  const first = page.locator("[data-step-start] a, [data-step-start] button").first();
  check("the open step has one way in", await first.count() === 1);
  await first.click();
  await page.waitForFunction(() => !location.pathname.startsWith("/course") || location.search.includes("module="), null, { timeout: 20_000 });
  await page.waitForSelector("main h1", { timeout: 20_000 });
  check("which opens it inside the module", page.url().includes("module="), decodeURIComponent(page.url().replace(B, "")));
  check("with the frame drawn on it", await page.locator(".module-step").count() === 1);

  /* Straight on to the second step, which is the reading on every ordinary
     evening and the one this was reported from. */
  let was = page.url();
  await page.locator(".module-step").getByRole("button", { name: /Continue|Finish/ }).click();
  await page.waitForFunction((u) => location.href !== u, was, { timeout: 20_000 });
  await page.waitForSelector("main h1", { timeout: 20_000 });
  check("pressing on opens the next step", page.url() !== was, decodeURIComponent(page.url().replace(B, "")));
  check("still inside the module", page.url().includes("module="));

  const reading = /\/grammar\//.test(page.url());
  if (!reading) {
    absent(14, "an evening with a reading in it: this day is a conversation, which replaces it");
  } else {
    check("the reading draws the module's own frame", await page.locator(".module-step").count() === 1);
    check(
      "and says which step of the evening it is",
      /* `label-xs` uppercases, which is what this caption wears like every
         other label in the app, so the reading is case-blind rather than the
         caption being made an exception. */
      /step \d+ of \d+/i.test(await page.locator(".module-step").innerText()),
      (await page.locator(".module-step").innerText()).split("\n")[0],
    );

    /* The website, gone. Read off the three places that draw it rather than
       off a shape, which is what `data-chrome` is for. */
    for (const part of ["rail", "dock", "anu"]) {
      check(
        `the ${part} is off the screen`,
        !(await page.locator(`[data-chrome="${part}"]`).isVisible().catch(() => false)),
      );
    }

    /*
      AND NOTHING ON THE PAGE LEADS ANYWHERE BUT THE MODULE.

      The whole of the report in one check. Every link inside the page is
      collected and the only address allowed is the module's own screen, which
      is where the frame's quiet way back goes. A drill, a unit, a dictionary
      entry or the reference index would each show up here by name.
    */
    const links = await page.locator("#main a[href]").evaluateAll((els) =>
      [...new Set(els.map((e) => e.getAttribute("href")))]);
    const away = links.filter((href) => href !== "/course");
    check("nothing on the reading leads out of the module", away.length === 0, JSON.stringify(away));
    /*
      AND THE DRILL, WHICH IS THE THING THAT WAS REPORTED, ON A PAGE THAT HAS
      ONE.

      Only four grammar topics carry a drill, and the reading an evening deals
      is whichever point its unit teaches next, so asking this on the page the
      walk happens to land on is a check that passes by having nothing to find.
      That is the fault `scripts/lib/checks.mjs` gives a suite a floor to catch,
      one check further in. So the marker the app has just written is carried
      onto a topic that does have one, which is the same address in the same
      shape with the same step behind it, and the page is asked there.
    */
    const marker = new URL(page.url()).searchParams.get("module");
    check("the reading's address carries a readable marker", Boolean(marker), String(marker));
    for (const [what, path] of [["topic", "/grammar/topic/government"], ["ending", "/grammar/inessive"]]) {
      await page.goto(`${B}${path}?module=${encodeURIComponent(marker)}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("main h1", { timeout: 20_000 });
      check(
        `a ${what} page with a drill does not offer it inside a module`,
        await page.getByText("Drill it", { exact: true }).count() === 0,
      );
      const out = await page.locator("#main a[href]").evaluateAll((els) =>
        [...new Set(els.map((e) => e.getAttribute("href")))].filter((h) => h !== "/course"));
      check(`and nothing else on the ${what} page leads away`, out.length === 0, JSON.stringify(out));
    }
    await page.goBack();
    await page.goBack();
    await page.waitForSelector("main h1", { timeout: 20_000 });

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
      AND PRESSING ON TICKS IT.

      The half a learner reported: they read the page, came back, and were
      asked to press "I did this" about it. A Server Action, a redirect and a
      re-render apart, so only a browser can say it.
    */
    was = page.url();
    await page.locator(".module-step").getByRole("button", { name: /Continue|Finish/ }).click();
    await page.waitForFunction((u) => location.href !== u, was, { timeout: 20_000 });
    await page.waitForSelector("main h1", { timeout: 20_000 });

    await openModule(page);
    const after = await stepsOn(page);
    const read = after.find((s) => /Read the point/i.test(s.title));
    check("the reading is finished on the list without being ticked by hand", read?.chip === "Done", read?.chip);
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
  /* What the walk wrote. A tick is append-only in the app and this is the
     script putting its own fixture back, which is the one path allowed to
     remove one. */
  await prisma.courseStep.deleteMany({ where: { ownerId: OWNER } });
  await browser.close();
  await prisma.$disconnect();
}

done();
