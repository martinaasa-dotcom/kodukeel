import { launchChromium } from "./lib/browser.mjs";
const S = process.env.SHOTS;
const b = await launchChromium();
const page = await b.newPage({ viewport: { width: 1100, height: 1000 } });
page.setDefaultTimeout(60000);
await page.goto("http://localhost:3100/situations/toovestlus");
await page.waitForTimeout(3000);
const start = page.getByRole("button", { name: /Start the conversation/i });
for (let i = 0; i < 5 && await start.count(); i++) { await start.click().catch(() => {}); await page.waitForTimeout(3000); }
await page.waitForTimeout(6000);
await page.screenshot({ path: `${S}/s1.png`, fullPage: true });
const box = page.getByPlaceholder(/Estonian/i);
for (const said of ["tere", "palun rägi aeglane", "ma töötasin haiglas"]) {
  await box.fill(said); await page.keyboard.press("Enter"); await page.waitForTimeout(9000);
}
await page.screenshot({ path: `${S}/s2.png`, fullPage: true });
console.log(await page.locator("[data-scene-model]").allInnerTexts());
await b.close();
