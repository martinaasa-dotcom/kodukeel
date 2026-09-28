import { launchChromium } from "./lib/browser.mjs";
const [scene, ...turns] = process.argv.slice(2);
const b = await launchChromium();
const page = await b.newPage({ viewport: { width: 1000, height: 1000 } });
page.setDefaultTimeout(60000);
await page.goto(`http://localhost:3100/situations/${scene}`);
await page.waitForTimeout(2500);
const start = page.getByRole("button", { name: /Start the conversation/i });
for (let i = 0; i < 5 && await start.count(); i++) { await start.click().catch(() => {}); await page.waitForTimeout(3000); }
await page.waitForTimeout(5000);
const box = page.getByPlaceholder(/Estonian/i);
for (const said of turns) {
  if (!(await box.count())) break;
  await box.fill(said); await page.keyboard.press("Enter"); await page.waitForTimeout(10000);
}
const log = await page.locator("[role=log], ol, ul").first().innerText().catch(() => "");
console.log(log.replace(/\n+/g, "\n"));
console.log("MODEL:", await page.locator("[data-scene-model]").allInnerTexts());
await page.screenshot({ path: `${process.env.SHOTS}/${scene}.png`, fullPage: true });
await b.close();
