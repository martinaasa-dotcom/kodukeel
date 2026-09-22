#!/usr/bin/env node
import { launchChromium, eventually } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";
import { missCard } from "./lib/miss.mjs";
import { startRound } from "./lib/briefing.mjs";

/**
 * THE WAY OUT OF BEING STUCK, DRIVEN.
 *
 * `scripts/test-invariants.ts` asserts that every round draws the hint, reads
 * its ceiling and holds its state through the one hook. All three are true of a
 * hint that never appears, of one that appears before anybody has had a go, and
 * of a ladder whose rungs uncover nothing: the wiring is a fact about the source
 * and the behaviour is not.
 *
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run dev
 *   node scripts/test-hints.mjs
 *
 * Local mode, for the reason every browser suite here runs in it.
 *
 * ITS FIRST RUN FOUND THREE FAULTS AND ALL THREE WERE IN THIS FILE. It answered
 * the card and then looked for the hint, which is the one moment it is never
 * drawn, and reported that the deck never repeats a word. It matched the button
 * by role and visible text, and the control's accessible name is its
 * `aria-label`, so it found nothing on a round where the hint was on screen
 * every time. And it assumed the letter ladder on a card asked as four options,
 * where a hint crosses one out and there is no spelling to uncover. Every one
 * of those printed a waiver whose stated reason was false, which is the failure
 * CLAUDE.md warns about by name: the output sends the reader to reseed a
 * database that is already seeded.
 *
 * IT PUTS THE DECK BACK, and that is load-bearing rather than tidy. Opening the
 * hint requires real misses, and a miss raises `lapses`; a card with enough of
 * them is one the clinic calls a leech, which this feature deliberately offers
 * a hint to on its first ask. So a suite that ground the deck down and left it
 * that way would make its own first check unaskable on the next run, and would
 * hand `test-teaching.mjs`'s sticking points a fixture nobody wrote. The
 * scheduling is snapshotted and restored and the reviews this run wrote are
 * deleted, which is `test-flash.mjs`'s own arrangement.
 */
const B = baseUrl();
const OWNER = "local-single-user";

/*
  Ten, read off a real run. The two ladders have four checks each and one runs,
  so the number is the same whichever the deck deals. Two blocks can honestly
  not be reachable: a round with nothing due, and a deck that never asks one
  word twice inside the window this walks. Everything else that could stop
  running trips the floor.
*/
const { check, absent, done } = suite("The hint ladder", { floor: 10 });

const prisma = newPrismaClient(requireLocalDatabase("grade cards until the hint opens"));
const hints = (page) => page.locator("main [data-hint]");
const struck = (page) => page.locator("main .line-through");

/*
  What the deck looked like before this ran, so it can be put back. The reviews
  are found by time rather than by id, because a grade can also be written by
  the offline outbox draining, and both are this run's.
*/
const before = new Date();
const scheduling = await prisma.card.findMany({
  where: { ownerId: OWNER },
  select: {
    id: true, due: true, stability: true, difficulty: true, elapsedDays: true,
    scheduledDays: true, reps: true, lapses: true, state: true, learningSteps: true,
    lastReview: true,
  },
});

/*
  AND THE LAPSES GO TO NOUGHT FIRST, which is what makes the first check askable
  at all. `hintsOpen` opens the ladder straight away for a word the clinic
  already calls one they keep failing, on purpose: making somebody miss a leech
  once more before the app will help is the app knowing something and sitting on
  it. The demo fixture builds leeches deliberately, so on a fixture-fresh deck
  "no hint before a miss" is true of the code and unverifiable from a browser.
  Zeroing them is not pretending the history did not happen: the `Review` rows
  are untouched and the column is restored below with everything else.
*/
await prisma.card.updateMany({ where: { ownerId: OWNER }, data: { lapses: 0 } });

async function putTheDeckBack() {
  await Promise.all(scheduling.map((c) => prisma.card.update({
    where: { id: c.id },
    data: {
      due: c.due, stability: c.stability, difficulty: c.difficulty,
      elapsedDays: c.elapsedDays, scheduledDays: c.scheduledDays, reps: c.reps,
      lapses: c.lapses, state: c.state, learningSteps: c.learningSteps,
      lastReview: c.lastReview,
    },
  })));
  await prisma.review.deleteMany({ where: { ownerId: OWNER, reviewedAt: { gte: before } } });
  await prisma.$disconnect();
}

const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const thrown = [];
page.on("pageerror", (e) => thrown.push(e.message.split("\n")[0]));

await page.goto(`${B}/review`, { waitUntil: "load" });
await startRound(page);
await eventually(async () => (await page.locator("main").innerText()).trim().length > 0);

if ((await page.locator("main input, main button").count()) === 0) {
  absent(10, "a deck with cards due: npm run db:seed && npm run demo");
  await browser.close();
  await putTheDeckBack();
  done();
}

/*
  THE HALF NOBODY WOULD REPORT.

  A hint offered before anybody has had a go answers the question for them, and
  a learner meeting that would read it as the app being helpful rather than as a
  fault. Asked first, with the lapses zeroed above, so nothing but a miss in
  this sitting could open it.
*/
check("no hint is offered before the learner has missed anything", (await hints(page).count()) === 0);

/*
  Miss cards until one of the missed words comes back. `requeue` puts it five
  places on, so this is a handful of answers rather than a search. Asked at the
  top of the loop, before the card is answered: the hint is drawn while the
  question is open and goes with the verdict, so looking afterwards reads the
  next card's screen, which is how the first version of this suite came to
  report that the deck never repeats a word.
*/
let opened = false;
for (let i = 0; i < 24 && !opened; i += 1) {
  if ((await hints(page).count()) > 0) { opened = true; break; }
  if ((await missCard(page)) === null) break;
}

if (!opened) {
  // One check has already run by here, so nine are what this state cannot reach.
  absent(9, "a deck that asks one word twice inside twenty answers");
  await browser.close();
  await putTheDeckBack();
  done();
}

check("the hint is offered on the second go at the same word", opened);

/*
  WHICH LADDER IT IS, WHICH IS THE CARD'S OWN QUESTION RATHER THAN A SETTING.

  A typed card uncovers the letters of the one answer; a card asked as four
  options crosses one out, because every letter is already on the screen. Both
  are `lib/questions/hints.ts`'s, both are drawn by the one component, and a
  suite that assumed either would waive or fail on the other depending on what
  the deck dealt. So it reads what it got and asks the right questions of it.
*/
const spellings = [];
const strikes = [];
for (let r = 0; r < 8 && (await hints(page).count()) > 0; r += 1) {
  await hints(page).first().click();
  await page.waitForTimeout(400);
  spellings.push((await page.locator("main [data-hint-shown]").first().getAttribute("data-hint-shown")) ?? "");
  strikes.push(await struck(page).count());
}

check("the ladder has more than one rung", spellings.length > 1, `${spellings.length} rungs`);
check("every press says something", spellings.every((s, i) => s !== "" || strikes[i] > 0), spellings.join(" → "));

const letters = spellings.some(Boolean);
if (letters) {
  const covered = spellings.map((s) => [...s].filter((c) => c === "_").length);
  check(
    "each press uncovers strictly more than the one before",
    covered.every((n, i) => i === 0 || n < covered[i - 1]),
    covered.join(" → "),
  );
  check("the first rung gives no letter away", covered[0] > 0 && !/\p{L}/u.test(spellings[0]), spellings[0]);
  check("the last rung is the answer, with nothing left covered", covered[covered.length - 1] === 0, spellings[spellings.length - 1]);
  /*
    Every rung is a piece of the *same* word. A rung showing a different
    spelling would be another card's answer leaking in, which is the shape the
    hook's two keys exist to prevent and which no unit test can see.
  */
  const answer = spellings[spellings.length - 1] ?? "";
  check(
    "every rung is a covered spelling of the one answer",
    spellings.every((s) => s.length === answer.length && [...s].every((c, i) => c === "_" || c === answer[i])),
    `${answer} ← ${spellings.join(" ")}`,
  );
} else {
  check(
    "each press crosses out strictly more options than the one before",
    strikes.every((n, i) => i === 0 || n > strikes[i - 1]),
    strikes.join(" → "),
  );
  check("the first press crosses exactly one out", strikes[0] === 1, `${strikes[0]}`);
  check("the last press leaves one option standing", strikes[strikes.length - 1] === strikes.length, strikes.join(" → "));
  check("a struck option says so to a reader who cannot see it",
    (await page.locator("main").innerText()).includes("ruled out by a hint")
    || (await page.locator("main .sr-only").allInnerTexts()).some((t) => t.includes("ruled out")));
}

const body = await page.locator("main").innerText();
check("the screen says what the hint cost", body.includes("We will bring this one back sooner"));
check("nothing on the page threw", thrown.length === 0, thrown.slice(0, 2).join(" | "));

await browser.close();
await putTheDeckBack();
done();
