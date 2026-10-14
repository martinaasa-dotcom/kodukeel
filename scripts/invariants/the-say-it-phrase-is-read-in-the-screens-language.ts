import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * THE "SAY IT" PHRASE IS READ IN THE SCREEN'S LANGUAGE.
 *
 * `lib/estonian/sayIt.ts` builds the ask out of the word's English gloss, "with
 * the bird", and the server hands it to the screen as English. A learner reading
 * in Russian got "he/she think, but in the past" under a Russian heading on the
 * flash round, because the screen printed the phrase as it arrived, and the
 * review card ran it through `t()`, which has no line for a sentence built
 * per word and hands it back untranslated. `sayIn` and `sayLineIn` in
 * `lib/estonian/plainAsk.ts` are the one turn from that English to what the
 * screen prints: the phrase itself in English, the short phrase in Russian or
 * Ukrainian.
 *
 * Two arms. Every client file that builds the phrase or reads a `say` field
 * reaches one of the two helpers; and no screen draws the field bare, as a
 * child on its own or through `t()`. Read off the code with comments
 * stripped, with a floor on how many files it finds.
 */
const READS_IT = /\bsay(?:Line|Phrase)\(|\.say\b(?!\s*\()/;
const TURNS_IT = /\bsay(?:Line)?In\(/;
const DRAWN_BARE = /\{\s*(?:t\(\s*)?[\w.]+\.say\s*\)?\s*\}/;

export default function theSayItPhraseIsReadInTheScreensLanguage({ check, code, read, APP, COMPONENTS }: InvariantKit) {
  const clients = [...APP, ...COMPONENTS].filter(
    (f) => f.endsWith(".tsx") && /^\s*["']use client["']/.test(read(f)),
  );
  const readers = clients.filter((f) => READS_IT.test(code(f)));

  check("every screen that shows the say-it phrase turns it into the screen's language", () => {
    assert.ok(readers.length >= 6, `only ${readers.length} screens read the phrase, so the search stopped matching`);
    const missing = readers.filter((f) => !TURNS_IT.test(code(f)));
    assert.deepEqual(
      missing, [],
      `${missing.join("\n")}\nshows the phrase without \`sayIn\` or \`sayLineIn\`, so a Russian or Ukrainian screen prints English`,
    );
  });

  check("no screen draws the say-it phrase as it arrived", () => {
    const bare = readers.filter((f) => DRAWN_BARE.test(code(f)));
    assert.deepEqual(bare, [], `${bare.join("\n")}\ndraws \`.say\` as it arrived; read it through \`sayIn\` or \`sayLineIn\``);
  });
}
