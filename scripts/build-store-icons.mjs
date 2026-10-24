/**
 * THE STORE ICONS, RENDERED FROM THE SVG MASTERS (R-2, docs/44-sixth-batch.md).
 *
 *   npm run store:icons
 *
 * Every file is drawn from `public/app-icon.svg` or `public/app-icon-maskable.svg`
 * by the Chromium the browser suites already launch, so there is no image
 * library to install and no second drawing of the mark to drift from the first.
 * What each store asks for, where it says so and the day it was read are in
 * `scripts/lib/storeSizes.mjs`, beside this file.
 *
 * Each file has a reader, which is the lesson `scripts/lib/browser.mjs` records
 * about an earlier icon script that was deleted because nothing read what it
 * wrote: the two web PNGs are named by `app/manifest.ts`, and every file under
 * `store/icons/` is named by `docs/46-store-listing.md`, which is what the
 * operator uploads from. `scripts/invariants/store-icons-have-readers.ts` holds
 * both.
 *
 * After writing, every file is read back: its size off the PNG header, whether
 * it carries an alpha channel off the color type, and for the adaptive
 * foreground, that nothing is drawn outside the safe zone. A file that fails is
 * reported and the script exits 1.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { launchChromium } from "./lib/browser.mjs";
import { ICONS, READ_ON } from "./lib/storeSizes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");

const master = read("public/app-icon.svg");
const maskable = read("public/app-icon-maskable.svg");

/*
  The master and the mark in the app are one drawing. If the path in the icon
  file stopped being `TILDE_PATH` from components/brand.tsx, the store would get
  a mark the app no longer draws, so the script refuses rather than renders it.
*/
const tilde = /TILDE_PATH\s*=\s*"([^"]+)"/.exec(read("components/brand.tsx"))?.[1];
if (!tilde || !master.includes(tilde)) {
  console.error("public/app-icon.svg no longer draws TILDE_PATH from components/brand.tsx; fix the master first.");
  process.exit(1);
}

/** The night ground and its ink, read off the stylesheet rather than typed here. */
function token(name) {
  const css = read("app/globals.css");
  const value = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(css)?.[1];
  if (!value) throw new Error(`could not read --${name} from app/globals.css`);
  return value;
}
const STAGE = token("stage");
const STAGE_INK = token("stage-ink");

const sized = (svg, size) => svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
/** The tile squared off: a store rounds the corners itself, so the file may not. */
const square = master.replace(/\s+rx="[^"]*"/, "");
/** The adaptive layers, split out of the maskable drawing. */
const foreground = maskable.replace(/<rect[^>]*\/>/, "");
const background = maskable.replace(/<path[^>]*\/>/, "");

const fontData = readFileSync(join(ROOT, "app/fonts/schibsted-grotesk-latin.woff2")).toString("base64");

function featureGraphic(width, height) {
  const mark = Math.round(height * 0.44);
  return `<!doctype html><html><head><style>
    @font-face { font-family: "Schibsted"; font-weight: 400 900; src: url(data:font/woff2;base64,${fontData}) format("woff2"); }
    html, body { margin: 0; width: ${width}px; height: ${height}px; background: ${STAGE}; }
    body { display: flex; align-items: center; justify-content: center; gap: ${Math.round(mark * 0.28)}px; }
    span { font-family: "Schibsted", sans-serif; font-weight: 700; font-size: ${Math.round(height * 0.26)}px;
      letter-spacing: -0.02em; color: ${STAGE_INK}; line-height: 1; }
  </style></head><body>${sized(master, mark)}<span lang="et">kodukeel</span></body></html>`;
}

function iconPage(svg, size, { transparent }) {
  return `<!doctype html><html><head><style>
    html, body { margin: 0; width: ${size}px; height: ${size}px; background: ${transparent ? "transparent" : STAGE}; }
    svg { display: block; }
  </style></head><body>${sized(svg, size)}</body></html>`;
}

/** Which drawing each file is, keyed by its path in storeSizes.mjs. */
const DRAWINGS = {
  "store/icons/ios-app-store-1024.png": (s) => iconPage(square, s.width, { transparent: false }),
  "store/icons/android-adaptive-foreground-432.png": (s) => iconPage(foreground, s.width, { transparent: true }),
  "store/icons/android-adaptive-background-432.png": (s) => iconPage(background, s.width, { transparent: false }),
  "store/icons/play-store-512.png": (s) => iconPage(square, s.width, { transparent: false }),
  "store/icons/play-feature-graphic-1024x500.png": (s) => featureGraphic(s.width, s.height),
  "public/app-icon-192.png": (s) => iconPage(master, s.width, { transparent: true }),
  "public/app-icon-512.png": (s) => iconPage(master, s.width, { transparent: true }),
};

/** Width, height and whether the PNG carries alpha, off its header bytes. */
function pngHeader(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("not a PNG");
  const type = buffer.readUInt8(25);
  // Color type 4 is grey with alpha and 6 is RGB with alpha; a tRNS chunk adds
  // transparency to the others, so it counts too.
  const alpha = type === 4 || type === 6 || buffer.includes(Buffer.from("tRNS"));
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: type, alpha };
}

const browser = await launchChromium();
const failures = [];
try {
  const page = await browser.newPage();
  for (const spec of ICONS) {
    const draw = DRAWINGS[spec.file];
    if (!draw) { failures.push(`${spec.file}: no drawing for it in this script`); continue; }
    await page.setViewportSize({ width: spec.width, height: spec.height });
    await page.setContent(draw(spec), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const buffer = await page.screenshot({ omitBackground: spec.alpha, type: "png" });
    const out = join(ROOT, spec.file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buffer);

    const head = pngHeader(readFileSync(out));
    const bytes = statSync(out).size;
    const problems = [];
    if (head.width !== spec.width || head.height !== spec.height) {
      problems.push(`is ${head.width}x${head.height}, wanted ${spec.width}x${spec.height}`);
    }
    if (!spec.alpha && head.alpha) problems.push(`carries an alpha channel (color type ${head.colorType})`);
    if (spec.maxBytes && bytes > spec.maxBytes) problems.push(`is ${bytes} bytes, over ${spec.maxBytes}`);

    /*
      The safe zone, measured on the file rather than reasoned from the path:
      the tilde is rotated, so its corners reach further than its box.
    */
    if (spec.safeZone) {
      const box = await page.evaluate(async (dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, img.width, img.height);
        let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
        for (let y = 0; y < img.height; y += 1) {
          for (let x = 0; x < img.width; x += 1) {
            if (data[(y * img.width + x) * 4 + 3] > 0) {
              if (x < x0) x0 = x; if (x > x1) x1 = x;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        }
        return { x0, y0, x1, y1 };
      }, `data:image/png;base64,${buffer.toString("base64")}`);
      const edge = (spec.width - spec.safeZone) / 2;
      const inside = box.x1 >= 0 && box.x0 >= edge && box.y0 >= edge
        && box.x1 < spec.width - edge && box.y1 < spec.height - edge;
      if (!inside) problems.push(`draws from (${box.x0}, ${box.y0}) to (${box.x1}, ${box.y1}), outside the ${spec.safeZone}px safe zone`);
      else console.log(`  safe zone: drawn from (${box.x0}, ${box.y0}) to (${box.x1}, ${box.y1}), inside ${edge} to ${spec.width - edge}`);
    }

    const label = `${spec.file}  ${head.width}x${head.height}  ${head.alpha ? "alpha" : "no alpha"}  ${Math.round(bytes / 1024)} KB`;
    if (problems.length) failures.push(`${spec.file} ${problems.join("; ")}`);
    console.log(`${problems.length ? "FAIL" : "ok  "}  ${label}`);
  }
} finally {
  await browser.close();
}

console.log(`\nSizes as read on ${READ_ON}; see scripts/lib/storeSizes.mjs for each source.`);
if (failures.length) {
  console.error(`\n${failures.length} file(s) not as a store asks:\n${failures.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
