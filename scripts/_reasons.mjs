import { launchChromium } from "./lib/browser.mjs";
const browser = await launchChromium();
for (const locale of ["ru", "uk"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000/start?lang=${locale}`, { waitUntil: "networkidle" });
  await page.locator("input[type=text], input:not([type])").first().fill("Test");
  await page.locator("button:has(svg.lucide-arrow-right):not([disabled])").last().click();
  await page.locator("[role=radio]").nth(2).click();
  await page.locator("button:has(svg.lucide-arrow-right):not([disabled])").last().click();
  await page.waitForTimeout(400);
  const n = await page.locator("[aria-pressed]").count();
  for (let i = 0; i < n; i++) await page.locator("[aria-pressed]").nth(i).click();
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => [...document.querySelectorAll("[aria-pressed]")].map((b) => {
    const lines = [];
    for (const el of b.querySelectorAll("span, p, div")) {
      if (el.children.length) continue;
      const text = el.textContent.trim(); if (!text) continue;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
      lines.push(`${Math.round(el.getBoundingClientRect().height / lh)}L ${text.slice(0, 90)}`);
    }
    return `${Math.round(b.getBoundingClientRect().height)}px ` + lines.join(" | ");
  }));
  console.log(`== ${locale}`); out.forEach((l) => console.log("  " + l));
  await ctx.close();
}
await browser.close();
