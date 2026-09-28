import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * TWO FACES, ONE NIGHT, AND THE EVENING WEARS THE MIX.
 *
 * The finished-evening card went from night to mint in a pass that was about
 * something else, and mint is a verdict (recalled, known) rather than one of
 * the Vikerkaar öös colours, so the one moment the app celebrates read as a
 * green slab beside a palette with no green in it. Nothing failed, because no
 * check said which colours and which faces were agreed. These do.
 *
 * FACES. Onest for everything and Schibsted Grotesk for display sizes, loaded
 * once in `app/layout.tsx` through `next/font`, and read everywhere else
 * through `--font-sans`, `--font-display` or `--font-mono`. No other file may
 * load a face, and no stylesheet or component may name a family itself. The
 * exemptions are the renderers that never see the stylesheet: two OG images
 * Satori draws, the root error boundary, and mail, which a mail client draws
 * with whatever it has. Each is checked for staleness.
 *
 * NIGHT. The navy of Vikerkaar öös is `--stage` and is typed once. `.night`
 * read its own copy of the hex, which is two definitions of one colour.
 *
 * THE EVENING. A card that says tonight's module is done is the accent's tint
 * with the mix along its top (`.evening` on `tone="accent"`), and the strip is
 * built only from the palette's bright four, through their tokens, so each
 * theme draws its own and no hex arrives with it.
 */
const FACE_EXEMPT: Record<string, string> = {
  "app/opengraph-image.tsx": "Satori renders it without this stylesheet",
  "app/api/share/route.tsx": "Satori renders it without this stylesheet",
  "app/global-error.tsx": "runs when globals.css may never have loaded",
  "app/api/email/unsubscribe/route.ts": "a bare HTML page answered to a mail client's one-click unsubscribe",
  "lib/email/art.ts": "mail is drawn by the reader's mail client, which has none of our faces",
  "lib/email/render.ts": "mail is drawn by the reader's mail client, which has none of our faces",
};

const EVENING_FILES = ["app/(app)/course/page.tsx", "app/(app)/page.tsx"];
const MIX_TOKENS = new Set(["--butter", "--blush", "--accent", "--sky"]);

export default function theAgreedFontsAndPalette({ check, code, read, ALL }: InvariantKit) {
  check("the app loads its two agreed faces once and names no other", () => {
    const layout = code("app/layout.tsx");
    const imported = /import\s*\{([^}]*)\}\s*from\s*"next\/font\/google"/.exec(layout);
    assert.ok(imported, "app/layout.tsx no longer loads its faces through next/font");
    const faces = imported[1]!.split(",").map((s) => s.trim()).filter(Boolean).sort();
    assert.deepEqual(faces, ["Onest", "Schibsted_Grotesk"], `the app loads ${faces.join(", ")}; the agreed faces are Onest and Schibsted Grotesk`);

    const css = read("app/globals.css");
    const sans = /--font-sans:\s*([^;]+);/.exec(css)?.[1] ?? "";
    const display = /--font-display:\s*([^;]+);/.exec(css)?.[1] ?? "";
    assert.ok(sans.startsWith("var(--font-onest)"), "--font-sans no longer leads with Onest");
    assert.ok(display.startsWith("var(--font-schibsted), var(--font-onest)"), "--font-display no longer leads with Schibsted Grotesk over Onest");

    const offenders: string[] = [];
    for (const file of ALL) {
      if (file === "app/layout.tsx") continue;
      const src = code(file);
      if (/from\s*"next\/font\//.test(src)) offenders.push(`${file}: loads a face of its own`);
      if (/fonts\.googleapis|@font-face/.test(src)) offenders.push(`${file}: fetches a face`);
      if (/font-\[/.test(src)) offenders.push(`${file}: an arbitrary font class`);
      if (FACE_EXEMPT[file]) continue;
      for (const m of src.matchAll(/(?:font-family|fontFamily)\s*:\s*([^;,}\n]+)/g)) {
        if (!/var\(--font-(?:sans|display|mono)\)|inherit/.test(m[1]!)) offenders.push(`${file}: names a family (${m[1]!.trim()})`);
      }
    }
    for (const m of css.matchAll(/font-family\s*:\s*([^;]+);/g)) {
      if (!/^var\(--font-(?:sans|display|mono)\)|^inherit/.test(m[1]!.trim())) offenders.push(`app/globals.css: font-family ${m[1]!.trim()}`);
    }
    assert.deepEqual(offenders, [], "a face other than the agreed two, or a family named outside the tokens");

    for (const [file, why] of Object.entries(FACE_EXEMPT)) {
      assert.ok(/font-family|fontFamily/.test(read(file)), `${file} is exempt from the face rule (${why}) and no longer names a family; take the line out`);
    }
  });

  check("the night navy is typed once, as --stage, and .night reads it", () => {
    const css = read("app/globals.css");
    const hits = css.match(/#0b0e2e\b/gi) ?? [];
    const declared = /--stage:\s*#0b0e2e\s*;/i.test(css);
    assert.ok(declared, "--stage is no longer the night navy of Vikerkaar öös");
    const outsideComments = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/#0b0e2e\b/gi) ?? [];
    assert.equal(outsideComments.length, 1, `the night navy is typed ${outsideComments.length} times; it is --stage and nothing else (${hits.length} with comments)`);
    const painted = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?:^|\n)\s*\.night\s*\{([^}]*)\}/g)]
      .map((m) => /background:\s*([^;]+);/.exec(m[1]!)?.[1]?.trim())
      .filter((b): b is string => Boolean(b));
    assert.deepEqual(painted, ["var(--stage)"], `.night paints itself with ${painted.join(", ") || "nothing"}; it reads var(--stage)`);
  });

  check("a finished evening wears the accent tint and the mix, never a verdict tint", () => {
    for (const file of EVENING_FILES) {
      const src = code(file);
      assert.ok(/finishedToday/.test(src), `${file} no longer draws the finished evening; update EVENING_FILES`);
      assert.ok(/<Card\s+tone="accent"\s+className="evening\b/.test(src), `${file} draws the finished evening without .evening on the accent tint`);
      assert.ok(!/<Card[^>]*tone="(?:mint|peach|butter)"/.test(src), `${file} paints a card in a verdict tint`);
    }
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const strip = /\.evening::before\s*\{([^}]*)\}/.exec(css);
    assert.ok(strip, ".evening no longer draws the mix along its top");
    assert.ok(!/#[0-9a-f]{3,8}\b|rgb\(/i.test(strip[1]!), "the evening's strip types a colour instead of reading the palette");
    const used = new Set([...strip[1]!.matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1]!));
    assert.ok(used.size >= 4, "the strip carries fewer than the mix's four bright colours");
    for (const token of used) assert.ok(MIX_TOKENS.has(token), `the strip uses ${token}, which is not a colour of Vikerkaar öös`);
  });
}
