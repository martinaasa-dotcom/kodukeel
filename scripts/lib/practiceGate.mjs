/*
  PAST A LESSON'S PRACTICE STEP, FOR A SUITE THAT ONLY WANTS TO GET BEYOND IT.

  Practice has a pass mark and no Skip until it is reached
  (`lib/course/lessons/gate.ts`), so a suite walking a lesson's foot to a later
  step stops there for good unless something answers. This answers the way a
  learner who reads the corrections does: the first time round with whatever
  is first, remembering what the screen marked right, and the questions that
  slipped with what it showed. `test-lessons.mjs` has its own driver because it
  also checks the verdicts on the way; this one checks nothing.
*/

const keyOf = async (quiz) => (await quiz.locator("h2, h3").first().innerText().catch(() => "")) + "|" +
  (await quiz.innerText().catch(() => "")).replace(/\s+/g, " ").replace(/\d+ of \d+/g, "").slice(0, 160);

async function round(page, learned) {
  for (let n = 0; n < 60; n++) {
    if (await page.locator('[data-lesson-quiz="done"]:visible').count()) return;
    const quiz = page.locator("[data-lesson-quiz][data-quiz-kind]:visible").first();
    if (!(await quiz.count())) return;
    const kind = await quiz.getAttribute("data-quiz-kind");
    const key = await keyOf(quiz);
    const known = learned.get(key);
    const box = quiz.locator("input[lang=et]");
    if (kind === "match") {
      const left = quiz.locator('ul[aria-label="Estonian"] button');
      for (let i = 0; i < (await left.count()); i++) {
        if (await left.nth(i).isDisabled()) continue;
        await left.nth(i).click();
        const right = quiz.locator('ul[aria-label="In English"] button');
        for (let j = 0; j < (await right.count()); j++) {
          if (await right.nth(j).isDisabled()) continue;
          await right.nth(j).click();
          await page.waitForTimeout(60);
          if (await left.nth(i).isDisabled()) break;
          await left.nth(i).click();
        }
      }
    } else if (await box.count()) {
      await box.fill(known ?? "vale");
      await quiz.getByRole("button", { name: /^Check/ }).click().catch(() => {});
    } else {
      const radios = quiz.locator('[role="radio"]:not([disabled])');
      const pick = known === undefined ? radios.first() : radios.filter({ hasText: known }).first();
      await pick.click().catch(() => radios.first().click().catch(() => {}));
    }
    const next = quiz.getByRole("button", { name: /^(Next|Done)/ });
    await next.waitFor({ timeout: 4000 }).catch(() => {});
    if (!(await next.count())) return;
    if (kind !== "match" && !learned.has(key)) {
      const option = await quiz.locator('[role="radio"].option-right').first().innerText().catch(() => null);
      const line = option ?? await quiz.locator(".verdict-panel [lang=et]").first().innerText().catch(() => null);
      if (line) learned.set(key, line.replace(/^\d+\s*/, "").trim());
    }
    await next.click().catch(() => {});
  }
}

/** Answers the practice step on screen until its pass mark is reached, or gives up after a few goes. */
export async function passPractice(page) {
  const learned = new Map();
  await round(page, learned);
  for (let go = 0; go < 6 && (await page.locator('[data-practice-gate="again"]:visible').count()); go++) {
    await page.getByRole("button", { name: /^Go over the \d+ that slipped/ }).click().catch(() => {});
    await round(page, learned);
  }
}
