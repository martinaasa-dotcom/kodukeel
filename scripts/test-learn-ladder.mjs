#!/usr/bin/env node
import { launchChromium, eventually } from "./lib/browser.mjs";
import { newPrismaClient } from "./lib/db.mjs";
import { baseUrl, suite } from "./lib/checks.mjs";
import { requireLocalDatabase } from "./lib/local-db.mjs";

/**
 * THE GAP RUNG'S REPORT BUTTON, DRIVEN.
 *
 * "I think that was right" is `SuggestFix` and it exists for a wrong mark:
 * the one person who knows the dictionary is wrong is the one standing on the
 * screen that just said so. The gap rung showed it after *every* answer,
 * right or wrong, because the condition around it read `rung === "gap"` with
 * nothing about the verdict. Review and the conjugation round both already
 * gate the same button on a wrong verdict; this is the one screen that did
 * not, and no unit test can see a button rendered on a screen a unit test
 * does not render.
 *
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run dev
 *   node scripts/test-learn-ladder.mjs
 *
 * TWO FRESH CARDS, NOT WHATEVER THE DECK ALREADY HOLDS. A card already on the
 * gap rung is a real word with a real sentence, and this suite would have to
 * know the correct answer before typing it: reading it off `lib/progress/
 * learn.ts` is not open to a `.mjs` script, and guessing at Estonian
 * morphology from here is the one thing ADR-005 exists to forbid. So the
 * suite writes its own two words instead, each a lexeme with no recorded
 * example at all: `lib/progress/learn.ts` can then only ask for it the plain
 * way, "Write it in Estonian", and the answer is the lemma this suite already
 * read off `Lexeme` to build the card in the first place. Nothing about
 * Estonian is derived, guessed, or replicated.
 *
 * PUT AT THE VERY FRONT OF THE QUEUE, RATHER THAN LEFT TO CHANCE. `learnBatch`
 * reads state-1 cards oldest `due` first, and a `due` of the Unix epoch sorts
 * ahead of anything a real deck or `demo-data.ts` would ever write, so these
 * two are always `words[0]` and `words[1]` and nothing else from a shared
 * demo deck has to be walked past, skipped, or restored. WHICH of the two is
 * `words[0]` is not, though: they share one `due` and the tiebreak is `id`,
 * a fresh UUID with no relation to insertion order. So the suite never
 * assumes which card is showing; it reads the gloss on screen and answers
 * whichever word that gloss names.
 *
 * IT WRITES TWO CARDS AND DELETES THEM, plus whatever `Review` rows answering
 * them wrote. Nothing pre-existing is touched, so there is nothing to put
 * back: the two rows this run created are the whole of what it owns.
 */
const B = baseUrl();
const OWNER = "local-single-user";

const prisma = newPrismaClient(requireLocalDatabase("write and delete two Learn ladder cards"));

const { check, absent, done } = suite("The learn ladder's gap rung", { floor: 5 });

/**
 * Two lexemes the dictionary holds no sentence for, so the gap rung can only
 * ask for them the plain way and the answer is the lemma itself.
 *
 * Lowercase lemmas only, which excludes the country and place names that make
 * up most of the words with no recorded usage: capitalised place names take a
 * different local case set (`lib/estonian/place.ts`) and are not what this
 * suite is about. A lemma spelled unlike its own gloss, so this never lands on
 * the "spelled the same in both languages" card, which the ladder answers
 * differently (`sameSpelling`, see `LearnSession.tsx`'s own comment on `free`).
 */
const candidates = await prisma.lexeme.findMany({
  where: {
    pos: { in: ["NOUN", "VERB"] },
    examples: "[]",
    lemma: { not: { contains: " " } },
  },
  orderBy: { id: "asc" },
  take: 40,
  select: { id: true, lemma: true, translation: true, pos: true },
});

const pool = candidates.filter((c) =>
  c.lemma === c.lemma.toLowerCase()
  && c.lemma.toLowerCase() !== c.translation.toLowerCase()
  && c.translation.trim().length >= 3);

/*
  FIVE ROWS, NOT TWO, OR THE FIRST NEW WORD OF SOMEBODY ELSE'S DECK GETS IN
  FRONT OF THESE.

  `learnBatch` fills the rest of its five-word room with unseen words once
  the state-1 ("started") cards run out, and "unseen" sorts *ahead* of "gap"
  (`RUNGS`, `orderByRung`): the local demo deck happened to already hold five
  state-1 cards, so this never surfaced here, and CI's own fresh one did not,
  so the first screen was "meet these five new words" rather than either
  fixture card. LEARN_BATCH is 5 (`lib/learn/ladder.ts`), unreachable from a
  `.mjs` script, so it is asserted rather than imported: three filler cards,
  each state 1 so they count as "started" too, pad the count to five on their
  own regardless of what a shared deck already holds. Their own rung and due
  date do not matter, since nothing here ever asks for them; only the count
  does.
*/
const LEARN_BATCH = 5;
if (pool.length < LEARN_BATCH) {
  absent(5, `${LEARN_BATCH} dictionary words with no recorded example sentence`);
  await prisma.$disconnect();
  done();
}

const [wordA, wordB, ...fillers] = pool.slice(0, LEARN_BATCH);
const EPOCH = new Date(0);

const created = await prisma.$transaction([
  prisma.card.create({
    data: {
      ownerId: OWNER, lexemeId: wordA.id, cardType: "RECOGNITION",
      front: wordA.lemma, back: wordA.translation, source: "DICTIONARY",
      state: 1, learningSteps: 1, due: EPOCH,
    },
  }),
  prisma.card.create({
    data: {
      ownerId: OWNER, lexemeId: wordB.id, cardType: "RECOGNITION",
      front: wordB.lemma, back: wordB.translation, source: "DICTIONARY",
      state: 1, learningSteps: 1, due: EPOCH,
    },
  }),
  ...fillers.map((f) => prisma.card.create({
    data: {
      ownerId: OWNER, lexemeId: f.id, cardType: "RECOGNITION",
      front: f.lemma, back: f.translation, source: "DICTIONARY",
      state: 1, learningSteps: 1, due: new Date(1),
    },
  })),
]);
const cardIds = created.map((c) => c.id);

async function cleanUp() {
  await prisma.review.deleteMany({ where: { ownerId: OWNER, cardId: { in: cardIds } } });
  await prisma.card.deleteMany({ where: { id: { in: cardIds } } });
  await prisma.$disconnect();
}

const browser = await launchChromium();
const page = await browser.newPage();
const thrown = [];
page.on("pageerror", (e) => thrown.push(e.message.split("\n")[0]));

const reportButton = () => page.locator("main").getByRole("button", { name: /I think that was right/ });

/**
 * Which of the two fixture words is on screen right now, by its gloss: the
 * gap rung's plain-word screen names the meaning and never the lemma, so the
 * gloss is the only thing here that identifies the card without giving its
 * own answer away.
 */
async function currentWord() {
  // `eventually` polls a predicate for truthiness and hands back only a
  // boolean, so the word itself is read again once it is known to be there
  // rather than smuggled out of the predicate's return value.
  const arrived = await eventually(async () => {
    const text = await page.locator("main").innerText();
    return text.includes(wordA.translation) || text.includes(wordB.translation);
  }, { timeoutMs: 15_000 });
  if (!arrived) {
    throw new Error(
      `neither fixture word ("${wordA.translation}" nor "${wordB.translation}") appeared on screen:\n` +
      (await page.locator("main").innerText()).slice(0, 800),
    );
  }
  const text = await page.locator("main").innerText();
  return text.includes(wordA.translation) ? wordA : wordB;
}

await page.goto(`${B}/learn/new`, { waitUntil: "load" });

const first = await currentWord();
// The other fixture word by elimination, so the wait below can name exactly
// what it is waiting for rather than matching "some known word", which the
// first word's own gloss would also satisfy while its feedback still stands.
const second = first === wordA ? wordB : wordA;

const firstInput = page.locator("main input:not([type='checkbox'])").first();
await firstInput.fill(first.lemma);
await page.keyboard.press("Enter");
await eventually(async () => (await page.locator("main [role='status']").count()) > 0);

check(
  `a correct first answer ("${first.lemma}") shows "Correct!"`,
  ((await page.locator("main [role='status']").first().textContent()) ?? "").includes("Correct"),
);
check('a correct first answer never offers "I think that was right"', (await reportButton().count()) === 0);

/*
  A right answer's gloss stays on screen through the whole verdict pause
  (VERDICT_PAUSE_MS): only the input's Check button is hidden while it grades
  and answering again is a no-op until the round actually advances. So this
  waits for the *second* word's own gloss by name, never for "a known word",
  which the first word's still-standing feedback would satisfy immediately.
*/
const arrived = await eventually(
  async () => (await page.locator("main").innerText()).includes(second.translation),
  { timeoutMs: 15_000 },
);
check(
  `the round moved on to the second word ("${second.lemma}")`,
  arrived,
  arrived ? "" : (await page.locator("main").innerText()).slice(0, 200),
);

const secondInput = page.locator("main input:not([type='checkbox'])").first();
await secondInput.fill("zzzzzz-not-an-estonian-word");
await page.keyboard.press("Enter");
await eventually(async () => (await page.locator("main [role='status']").count()) > 0);

check('a wrong answer still offers "I think that was right"', (await reportButton().count()) > 0);

check("nothing on the page threw", thrown.length === 0, thrown.slice(0, 2).join(" | "));

await browser.close();
await cleanUp();
done();
