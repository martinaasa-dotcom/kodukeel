import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/*
  A COUNT OF SOMETHING THE APP HAS IS READ OFF THE TABLE THAT HOLDS IT.

  The landing page told every stranger the app had fifteen conversations for a
  whole batch after it had forty-three, in English, Russian and Ukrainian,
  because the number was typed into a sentence and nothing that added a scene
  was going to reopen the landing copy. A count of conversations, scenes,
  situations, units or errands moves every time one is added, so the sentence
  takes it from `SCENES.length` (or the table in question) through `fill`, and
  a literal number beside one of those nouns in reader copy fails here.

  Read as code, with comments stripped: a comment may record what a sentence
  used to say. Reader copy is `app/`, `components/` and `lib/copy/`, which
  holds every area file, so a translation typing the number back in is caught
  too.
*/

const ENGLISH_NUMBER =
  "(?:\\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?";
const ENGLISH_NOUN = "(?:conversations|scenes|situations|units|errands)";
const ENGLISH = new RegExp(`\\b${ENGLISH_NUMBER}(?: \\w+)? ${ENGLISH_NOUN}\\b`, "gi");

// The Russian and Ukrainian nouns, in every form a count puts them in, after a
// figure or a whole numeral word. The noun is a stem, since it inflects with
// the count; the numeral is a word list, since a stem would read
// "двухминутному" as a two.
const SLAVIC_NUMBER = [
  "\\d+", "два", "две", "двух", "двох", "три", "трёх", "трех", "трьох", "четыре", "четырёх", "чотири", "чотирьох",
  "пять", "пяти", "п'ять", "п'яти", "шесть", "шести", "шість", "семь", "семи", "сім", "восемь", "восьми", "вісім",
  "девять", "девяти", "дев'ять", "дев'яти", "десять", "десяти", "пятнадцать", "пятнадцати", "п'ятнадцять",
  "п'ятнадцяти", "двадцать", "двадцати", "двадцять", "двадцяти", "тридцать", "тридцять", "сорок", "сорока",
].join("|");
const SLAVIC_NOUN = "(?:разговор|розмов|сцен|ситуаци|ситуаці|доручен|поручени)\\p{L}*";
const SLAVIC = new RegExp(`(?<![\\p{L}'{])(?:${SLAVIC_NUMBER}) ${SLAVIC_NOUN}`, "giu");

/*
  A phrase that names a number of scenes and is not a count of a table, each
  with the reason. Checked for staleness: an entry that no longer matches
  anything is where the next exemption would be parked.
*/
const ROUND_SIZE =
  "The picture round's size (lib/ux/modes.ts, Say what you see): each round deals two or three picture scenes by design, which is a rule about a round rather than a count of the conversations the app has.";
const EXEMPT: Readonly<Record<string, string>> = {
  "Two or three scenes": ROUND_SIZE,
  "Две или три сцены": ROUND_SIZE,
  "Дві або три сцени": ROUND_SIZE,
};

export function literalCounts(text: string): string[] {
  return [...text.matchAll(ENGLISH), ...text.matchAll(SLAVIC)].map((m) => m[0]);
}

export default function aCountIsDerived({ check, code, sourceFiles }: InvariantKit) {
  check("a sentence naming how many conversations, scenes, units or errands there are reads the number from the table", () => {
    // Made to fail on the sentence that started this before it is trusted.
    const old = "This is one of the fifteen conversations inside: a café counter.";
    assert.deepEqual(literalCounts(old), ["fifteen conversations"]);
    assert.deepEqual(literalCounts("Это один из пятнадцати разговоров внутри"), ["пятнадцати разговоров"]);
    assert.deepEqual(literalCounts("Inside there are 43 scenes"), ["43 scenes"]);
    // A placeholder is a derived count, and fifteen minutes is not a count of anything the app has.
    assert.deepEqual(literalCounts("one of the {conversations} inside, fifteen minutes a day"), []);

    const files = [
      ...sourceFiles("app"),
      ...sourceFiles("components"),
      ...sourceFiles("lib/copy"),
    ].filter((f) => !/\.test\.tsx?$/.test(f));
    assert.ok(files.length > 200, `read only ${files.length} files, so the sweep has stopped reading what it should`);
    const exempt = Object.keys(EXEMPT);
    const seen = new Set<string>();
    const found = files.flatMap((f) => {
      let text = code(f);
      for (const phrase of exempt) {
        if (text.includes(phrase)) seen.add(phrase);
        text = text.split(phrase).join("");
      }
      return literalCounts(text).map((hit) => `${f}: "${hit}"`);
    });
    assert.ok(found.length === 0, `types a count that goes stale the day one is added: ${found.join(", ")}`);
    const stale = exempt.filter((phrase) => !seen.has(phrase));
    assert.deepEqual(stale, [], `an exemption that matches nothing any more, so take it out: ${stale.join(", ")}`);
  });
}
