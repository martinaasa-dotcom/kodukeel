import { startRound } from "./briefing.mjs";

/**
 * A WORKBOOK SITTING WALKED THROUGH EVERY STATE IT HAS, FOR A SWEEP TO LOOK AT.
 *
 * `/review/workbook` opens on a page, and every other state it has arrives by
 * doing something: a page checked and open for a second go, the next
 * exercise, which may be a different kind (pick the form, or a word box), the
 * corrected page handed back at the end, and the lines got wrong set again.
 * No URL reaches any of those, so a sweep that only opens routes measures the
 * first one and never the rest. This walks them and hands each to `visit`
 * with a name, so the layout sweep and the accessibility sweep look at the
 * same states.
 *
 * IT WRITES NOTHING, which is the half that makes it safe to run inside a
 * suite whose neighbors read the same deck. Every POST is cut off, so the
 * server action that grades a settled exercise never arrives; the session
 * queues the grade on the device instead, and the context the caller made for
 * this is closed with the queue in it. `cutOffWrites` is that, and a caller
 * must hand this a page from a context of its own.
 */
export async function cutOffWrites(context) {
  await context.route("**/*", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue());
}

/** Walks a sitting and calls `visit(name)` at every state. Returns how many it reached. */
export async function walkWorkbook(page, base, visit, { query = "" } = {}) {
  let reached = 0;
  const at = async (name) => { reached += 1; await visit(name); };
  await page.goto(`${base}/review/workbook${query}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await startRound(page);
  const sheet = page.locator("[data-workbook-exercise]");
  try {
    await sheet.first().waitFor({ timeout: 15000 });
  } catch {
    return reached;
  }

  for (let n = 1; n <= 3 && (await sheet.count()); n += 1) {
    const kind = (await page.locator("[data-workbook-options]").count()) ? "pick the form"
      : (await page.locator("[data-workbook-box]").count()) ? "a word box" : "written";
    await at(`exercise ${n}, ${kind}`);
    // Every line answered wrongly, so the whole page opens for a second go.
    const rows = page.locator("[data-workbook-options]");
    const count = await rows.count();
    if (count) {
      for (let i = 0; i < count; i += 1) await rows.nth(i).locator('[role="radio"]').last().click().catch(() => {});
    } else {
      const gaps = page.locator("input[data-workbook-gap]");
      const g = await gaps.count();
      for (let i = 0; i < g; i += 1) await gaps.nth(i).fill("qqq");
    }
    await page.locator("[data-workbook-check]").click().catch(() => {});
    await page.waitForTimeout(500);
    if (await page.locator("[data-workbook-show]").count()) {
      await at(`exercise ${n}, open for a second go`);
      await page.locator("[data-workbook-show]").click();
      await page.waitForTimeout(400);
    }
    const next = page.locator("[data-workbook-next]");
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(600);
  }

  if (await page.locator("[data-workbook-redo-start]").count()) {
    await at("the corrected page");
    await page.locator("[data-workbook-redo-start]").click();
    await page.waitForTimeout(500);
    if (await sheet.count()) await at("the lines got wrong, set again");
  }
  return reached;
}
