/*
  Can the scanner read Estonian diacritics, and does the model chosen for it
  matter? Measured through the production vision path.

  NOT A PHOTOGRAPH TEST, and the distinction matters for what may be concluded.
  The pages here are rendered text: clean, evenly lit, one font, no camera. That
  measures whether a model recognises o against õ and a against ä when nothing
  else is in the way. It says nothing about a phone photograph of somebody's
  homework at an angle in bad light, which is what `/scan` actually meets, and a
  model that fails here would certainly fail there while one that passes here
  has only cleared the easier half.

  The challenger is `qwen/qwen3.8-27b` rather than a Llama 4, because Groq
  serves no Llama 4 on this account: the only image-capable models it offers are
  qwen3.6-27b and qwen3.8-27b, and 3.8 is the one already in FREE_GROQ_MODELS,
  so it is what a deployment configured with Groq actually reaches.

  Every word comes out of prisma/data/expanded.json. Nothing is written.
*/
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The repo's own launcher, which is where the sandbox's browser path already
// lives: the installed build and the pinned @playwright/test do not match here.
// @ts-expect-error - a .mjs helper with no declarations, like the suites use it.
import { launchChromium } from "./lib/browser.mjs";
import { completeWithImage, type ProviderConfig } from "../lib/tutor/provider";
import { SCAN_PROMPT, parseScanReply } from "../lib/scan/extract";

type Entry = { lemma: string; translation: string; cefr: string | null; pos: string };

/** The six letters an English keyboard has no key for, which is the whole test. */
const DIACRITIC = /[õäöüšž]/i;
const FOLD: Record<string, string> = { "õ":"o","ä":"a","ö":"o","ü":"u","š":"s","ž":"z" };

const entries = JSON.parse(readFileSync("prisma/data/expanded.json", "utf8")) as Entry[];
const WORDS = entries
  .filter((e) => e.cefr && DIACRITIC.test(e.lemma) && e.lemma.length >= 4 && !e.lemma.includes(" "))
  .slice(0, Number(process.env.WORDS ?? 24));

/*
  Two conditions, because one would overstate whatever it found.

  `clean` is the page as a screenshot: 24px serif, black on white, square to
  the frame. It isolates the question of whether a model distinguishes o from
  õ and a from ä when nothing else is in the way.

  `hard` is that page pushed toward what a camera gives: smaller type, a slight
  rotation, a grey cast and JPEG compression. It is still not a photograph, and
  the diacritics are still geometrically perfect, so a model that fails here
  would certainly fail on paper and one that passes has cleared a middle case
  rather than the real one.
*/
type Condition = "clean" | "hard";

/** A vocabulary list, which is the commonest thing anybody points a camera at. */
function pageHtml(words: Entry[], mode: Condition = "clean"): string {
  const rows = words
    .map((w, i) => `<tr><td class="n">${i + 1}.</td><td class="et">${w.lemma}</td><td class="en">${w.translation}</td></tr>`)
    .join("\n");
  const hard = mode === "hard";
  return `<!doctype html><meta charset="utf-8"><style>
    body { font-family: "DejaVu Serif", Georgia, serif;
           background:${hard ? "#d8d4c9" : "#fff"}; color:${hard ? "#2b2b2b" : "#111"};
           padding:48px 56px; ${hard ? "transform:rotate(-1.4deg);" : ""} }
    h1 { font-size:${hard ? 16 : 22}px; margin:0 0 24px; font-weight:600; }
    table { border-collapse:collapse; font-size:${hard ? 15 : 24}px; }
    td { padding:${hard ? 4 : 7}px 18px ${hard ? 4 : 7}px 0; }
    .n { color:#888; font-size:${hard ? 13 : 20}px; }
    .et { font-weight:600; }
    .en { color:#333; }
  </style><h1>Sonavara</h1><table>${rows}</table>`;
}

async function render(html: string, out: string, mode: Condition) {
  const browser = await launchChromium();
  const hard = mode === "hard";
  const page = await browser.newPage({
    viewportSize: { width: hard ? 620 : 900, height: 1200 },
    deviceScaleFactor: hard ? 1 : 2,
  });
  await page.setContent(html);
  await page.screenshot(
    hard ? { path: out, fullPage: true, type: "jpeg", quality: 42 } : { path: out, fullPage: true },
  );
  await browser.close();
}

const CANDIDATES: ProviderConfig[] = [
  { name: "groq", model: "openai/gpt-oss-20b", label: "Groq" },
  ...(process.env.ANTHROPIC_API_KEY
    ? [{ name: "anthropic", model: "claude-sonnet-5", label: "Anthropic" } as ProviderConfig]
    : []),
  ...(process.env.ANTHROPIC_API_KEY
    ? [{ name: "anthropic", model: "claude-haiku-4-5", label: "Anthropic" } as ProviderConfig]
    : []),
  ...(process.env.GEMINI_API_KEY
    ? ([
        { name: "gemini", model: "gemini-3.8-flash", label: "Google Gemini" },
        { name: "gemini", model: "gemini-3.1-flash-lite", label: "Google Gemini" },
        { name: "gemini", model: "gemini-2.5-flash", label: "Google Gemini" },
        { name: "gemini", model: "gemini-2.5-flash-lite", label: "Google Gemini" },
      ] as ProviderConfig[])
    : []),
];

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "scan-"));
  const fold = (x: string) => [...x.toLowerCase()].map((c) => FOLD[c] ?? c).join("");

  for (const mode of ["clean", "hard"] as Condition[]) {
    const ext = mode === "hard" ? "jpg" : "png";
    const file = join(dir, `page-${mode}.${ext}`);
    await render(pageHtml(WORDS, mode), file, mode);
    const image = {
      mediaType: mode === "hard" ? "image/jpeg" : "image/png",
      base64: readFileSync(file).toString("base64"),
    };
    console.log(`\n== ${mode} ==  ${file}  (${WORDS.length} words, every one carrying a diacritic)`);
    console.log("model                       read  exact  folded  wrong  invented  missed");

    for (const cfg of CANDIDATES) {
     const PASSES = Number(process.env.PASSES ?? 3);
     for (let pass = 0; pass < PASSES; pass++) {
      let exact = 0, folded = 0, wrong = 0, invented = 0;
      let items: { et: string }[] = [];
      try {
        const reply = await completeWithImage(
          [cfg], SCAN_PROMPT, "Read this page and list the Estonian vocabulary on it.", image,
        );
        items = parseScanReply(reply.text);
      } catch (e) {
        console.log(`${cfg.model.padEnd(26)} FAILED: ${(e as Error).message}`);
        continue;
      }
      const wanted = new Map(WORDS.map((w) => [w.lemma.toLowerCase(), w.lemma]));
      const foldedWanted = new Map([...wanted.values()].map((v) => [fold(v), v]));
      const seen = new Set<string>();
      const slips: string[] = [];
      for (const it of items) {
        const got = it.et.toLowerCase();
        if (wanted.has(got)) { exact++; seen.add(got); continue; }
        const hit = foldedWanted.get(fold(got));
        // Right word, diacritics dropped or mangled: the one failure this
        // exists to find, since the scanner vouches a word by exact spelling.
        if (hit) { folded++; seen.add(hit.toLowerCase()); slips.push(`${hit}->${it.et}`); continue; }
        if ([...foldedWanted.keys()].some((k) => k.startsWith(fold(got).slice(0, 4)))) {
          wrong++; slips.push(`?${it.et}`);
        } else { invented++; slips.push(`!${it.et}`); }
      }
      console.log(
        `${(cfg.model + " #" + (pass + 1)).padEnd(26)} ${String(items.length).padStart(4)}` +
        `${String(exact).padStart(7)}${String(folded).padStart(8)}` +
        `${String(wrong).padStart(7)}${String(invented).padStart(10)}` +
        `${String(WORDS.length - seen.size).padStart(8)}`,
      );
      if (slips.length) console.log(`    ${slips.slice(0, 8).join("  ")}`);
     }
    }
  }
}
main();
