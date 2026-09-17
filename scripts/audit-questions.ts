/**
 * DOES ANY QUESTION THIS APP ASKS PRINT ITS OWN ANSWER?
 *
 * It is the one question no unit test can ask, because every generator here is
 * correct on the word a fixture picks and wrong on a handful somewhere in five
 * thousand. Asked over the shipped dictionary rather than over a fixture, this
 * found four separate faults in one afternoon, and none of them were visible on
 * any single word:
 *
 *   2,468 gap-fills whose hint was the answer, wherever the gap wanted the
 *     dictionary form and the hint gave the lemma;
 *   115 case cards for a case Estonian spells like the nominative, so
 *     `kallis → milles? kus?` had `kallis` on the back;
 *   15 gaps that left the answer standing later in the same sentence;
 *   34 crossword clues that were the English gloss and the Estonian word at
 *     once, `film` clued as "film".
 *
 * And then the flash round, which was written after all of that and walked
 * into two more shapes of the same fault, neither visible on any one word:
 *
 *   13 asks whose answer was a word in the English gloss printed beside it,
 *     the illative of `salv` being `salve` and its gloss "salve", `pagan`
 *     glossed "pagan, heathen", `mink` "American mink";
 *   1 gap that left the other half of a lexicographer's pair standing two
 *     characters away, `Auto jäi porisse/____ kinni.`
 *
 * A card nobody can get wrong is worse than no card. The scheduler reads every
 * pass as a recall and stretches the interval, so the slot is spent for ever,
 * and the learner is told they knew something they were shown.
 *
 * WHAT IT IS NOT. It does not judge whether a question is hard, or whether the
 * wrong answers are any good: `lib/questions/distractors.ts` is where that
 * lives and it was measured separately. This asks one mechanical thing, which
 * is why it can be trusted over 47,000 cards.
 *
 * Two shapes are deliberately not faults and are excluded by name rather than
 * by luck. A matching task shows the word list, because pairing sentences to
 * words needs both halves on screen. And a `heard` question hides its prompt
 * from the eye on purpose: the answer being written beside it is the exercise.
 * Both were reported by the first version of this and both were the harness.
 *
 * No database, no network: it reads every entry the seed writes, through
 * `scripts/lib/dictionary.ts`.
 *
 * IT USED TO READ HALF OF THEM. This opened `prisma/data/expanded.json` under
 * a comment calling that file "what the seed loads", and the seed loads it and
 * `prisma/data/harvested.ts`: 761 of the 1,514 course words are in no
 * expansion row, so half the course had never been asked a single one of these
 * questions. That is what let `kes` and `mis` keep a gradation card asking the
 * genitive as `kelle? mille?`, which are the two words it wants back.
 */
import { dictionaryRows, type DictionaryRow } from "./lib/dictionary";
import { exceptionsFor } from "../lib/estonian/exceptions";
import { drillable, tasksFor } from "../lib/games/exceptions";
import { formIndex } from "../lib/games/flash";
import { plainAskLine } from "../lib/estonian/plainAsk";
import { borrowSentences } from "../lib/dict/borrow";
import { generateCards, availableCardTypes, type LexemeForCards } from "../lib/srs/cards";
import { buildPaper as buildExam, type PoolWord } from "../lib/exam/paper";
import { buildPaper as buildPlacement, type WordRow } from "../lib/assessment/items";
import { heardIndex, meaningsHeard } from "../lib/assessment/heard";
import { differentMeaning } from "../lib/questions/distractors";
import { EXAM_LEVELS } from "../lib/exam/spec";
import { clueClashes, clueFrom, clueKey } from "../lib/games/clue";
import { mentions } from "../lib/estonian/cloze";
import { SCENES } from "../lib/collections/scenes";
import { emojiFor } from "../lib/collections/emoji";
import { ASKABLE_CASES, taskFor, type SceneWord } from "../lib/games/describe";
import { askableSlots, flashTask, type FlashWord } from "../lib/games/flash";
import { caseQuestion } from "../lib/progress/target";
import { planLesson, type LessonWord } from "../lib/collections/lesson";
import { buildCheckpoint, type CheckpointWord } from "../lib/collections/checkpoint";
import { SYLLABUS, CHECKPOINTS, wordsAtLevel } from "../lib/collections/syllabus/index";

const entries = dictionaryRows();

/*
  What each word may borrow from the rest of the dictionary for its case and
  conjugation cards, keyed the way the sections below key a word. The deck
  builder and the flash round are handed the same pool, so a borrowed card is a
  card this audit asks about. See lib/dict/borrow.ts.
*/
const borrowed = borrowSentences(entries.map((e) => ({
  key: e.lemma, lemma: e.lemma, pos: e.pos,
  forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null })),
  examples: (e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null, source: "EKILEX" as const })),
})));

/** Everything a learner is shown, joined; and the string they have to produce. */
interface Asked { where: string; shown: string; answer: string }

const faults: Asked[] = [];
let asked = 0;

/*
  Where the time goes, printed, because the four generators are nothing like
  each other in cost and a reader deciding whether this belongs in CI needs to
  know which one to bound. The deck and the crossword read the file and are
  seconds; a paper is assembled per seed and is most of the run.
*/
const spent = new Map<string, number>();

/*
  AND HOW MANY EACH ONE ASKED, WHICH IS THE HALF A SINGLE FLOOR CANNOT SAY.

  The floor at the bottom bounds the whole run, so it catches the deck, which
  is most of it, and would wave through a section that stopped producing
  entirely: the crossword is 5,329 of some 46,000 and the scene game 1,972, and
  either could return nothing without moving the total below 40,000. A section
  that asks nothing looks exactly like a section that passed, which is the
  fault `scripts/lib/checks.mjs` gives a suite a floor to prevent.

  So each one declares what it reaches and is held to four fifths of it. Four
  fifths rather than the number itself, because these counts move with the
  dictionary: a reseed adds words, and a floor that has to be edited on every
  reseed is a floor somebody edits without reading.

  The figures are measured rather than estimated, and the first version of this
  proved why: `exam` was guessed at 6,000 from a sentence in a pull request
  about a different measurement and actually asks 2,500, so the check failed on
  the run that introduced it. A floor is a fact about what the code does, and
  the only way to know it is to print it, which the line below now does.
*/
const REACHES: Record<string, number> = {
  /*
    36,041 until a case card needed a sentence behind it. The deck used to ask
    a word for every case the morphology permitted, which was 23,106 case cards
    over 4,664 words with an attested sentence behind 1,494; a case is drilled
    in a sentence that uses it now, and where more than one case spells the
    gapped form that way it is drilled by nobody, which is 996 over 914 words.
    Measured, not estimated: 13,919. Then 9,711 when the conjugation card
    learned the same rule: 4,747 over a stem became 539 in a sentence. And
    10,887 once a word could borrow a sentence recorded under another word
    for its case and conjugation cards (lib/dict/borrow.ts): 1,546 case cards
    and 821 conjugation cards, cut from the same twelve thousand sentences.
  */
  /*
    5,295 crossword clues until a clue had to have one answer. Naming the kind
    of word costs nothing, and refusing a clue another entry answers just as
    well took 1,304 of them out: `kena` and `ilus` are both "beautiful", and
    whichever the grid wanted the other was a right answer marked wrong. See
    `lib/games/clue.ts`.
  */
  /*
    AND THEN EVERY ONE OF THEM MOVED, because the dictionary this reads
    doubled its course half. Each figure below is the count printed by the run
    that set it, over the 6,153 entries the seed writes rather than the
    expansion's 5,363: the deck 13,540 against 10,887, the flash round 52,028
    against 45,856. Re-measured rather than scaled, which is what the paragraph
    above says about `exam` having been guessed once.
  */
  deck: 10_800, exam: 2_000, crossword: 3_700, scene: 1_100, target: 4_100,
  // 627 while a `heard` item was skipped outright; the listening items are
  // asked the "also right" question now and counted. The placement draws a
  // fixed number of items per band, so this one does not move with the
  // dictionary.
  check: 590,
  // Measured on the merged tree once the flash round read `caseFits`: the
  // local cases it may ask narrowed with everything else's, from 46,851. Then
  // 45,856 once the round led with the sentence: a gap whose English gloss
  // spells the form is refused rather than asked the plain way. Then 52,028
  // over the whole dictionary, less the fifteen cases of `kes` and `mis` whose
  // own question word was the answer.
  flash: 41_600,
  // The two asked rungs of the exceptions round, over the graded dictionary.
  // Measured at 4,788, then 4,254 once the gap rung learned `readCase`'s rule:
  // a sentence has to name the form on its own, and two thirds of the short
  // illatives in this dictionary are spelled like a principal part. 5,216 over
  // the whole of it.
  exceptions: 4_100,
  /*
    The guided unit lesson and the end-of-level checkpoint, neither of which
    had ever been in this script. Both build a gap out of an attested sentence
    and both print the word above it, which is the whole subject of this file;
    a learner reported the lesson's own version of the fault. Three seeds over
    83 units and five levels, which costs about 1.6 seconds between them.

    MEASURED, AND THE FIRST FIGURE WAS GUESSED AND WRONG: written as 1,900 out
    of the head, the lesson asked 1,254 and the run that introduced this
    section failed its own floor. That is `exam` all over again, two hundred
    lines up, and it is the check working.
  */
  lesson: 1_254, checkpoint: 120,
};

/*
  `deck`, `scene` and `target` came down when the app stopped asking a word for
  a case it does not take. Estonian has two sets of local cases and a word takes
  one, so an animate noun is drilled on `hobusel` and never on `hobuses`, and a
  word headed by a plural has no singular to ask for at all (see
  `lib/estonian/caseQuestion.ts`). The scene game is the one that moved most,
  because its words are the ones that have a picture and a third of those are
  animals and people: 1,972 to 1,409.

  Re-measured rather than left to the four-fifths margin, which the scene game
  had already fallen through. Lowering a floor to make a run pass is what the
  paragraph above forbids; this is the other thing, a generator that was asked
  to produce less and now does, with the reason written down beside the number.
*/

const askedIn = new Map<string, number>();
function timed<T>(what: string, run: () => T): T {
  const began = Date.now();
  const before = asked;
  const out = run();
  spent.set(what, (spent.get(what) ?? 0) + (Date.now() - began));
  askedIn.set(what, (askedIn.get(what) ?? 0) + (asked - before));
  return out;
}

function ask(where: string, shown: string, answer: string): void {
  asked++;
  const wanted = answer.trim();
  if (wanted.length < 2 || !shown.trim()) return;
  // A case card's back is every accepted spelling, joined. Any one of them
  // showing is enough to make the card free.
  for (const one of wanted.split(" / ")) {
    if (mentions(shown, one)) { faults.push({ where, shown, answer: one }); return; }
  }
}

/* ── The deck ────────────────────────────────────────────────────────────── */
timed("deck", () => {
for (const e of entries) {
  const lex = {
    id: e.lemma, lemma: e.lemma, translation: e.translation, pos: e.pos,
    gradation: e.gradation ?? null, gradationNote: e.gradationNote ?? null,
    government: e.government ?? null, semanticTypes: e.semanticTypes ?? null,
    examples: JSON.stringify(e.examples ?? []),
    forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null })),
    borrowed: borrowed.get(e.lemma) ?? [],
  } as unknown as LexemeForCards;
  let cards;
  try { cards = generateCards(lex, availableCardTypes(lex)); }
  catch (error) { faults.push({ where: `card ${e.lemma}`, shown: String(error), answer: "threw" }); continue; }
  for (const c of cards) {
    // A recognition or production card of a word spelled the same in both
    // languages is the same string twice and is a fact about the word, said in
    // words on every screen that prints it. See `sameSpelling`.
    if (c.cardType === "RECOGNITION" || c.cardType === "PRODUCTION") continue;
    ask(`${c.cardType} ${e.lemma}`, `${c.front} ${c.hint ?? ""}`, c.back);
  }
}
});

/* ── The mock exam ───────────────────────────────────────────────────────── */
const pool: PoolWord[] = entries.map((e) => ({
  lexemeId: e.lemma, lemma: e.lemma, translation: e.translation, pos: e.pos, cefr: e.cefr,
  semanticTypes: e.semanticTypes ?? null,
  forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null, morphName: null })),
  examples: (e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null })),
  government: e.government, cardId: null,
}));
const SEEDS = Number(process.argv.find((a) => a.startsWith("--seeds="))?.split("=")[1] ?? 10);
timed("exam", () => {
for (const level of EXAM_LEVELS) {
  for (let s = 0; s < SEEDS; s++) {
    for (const part of buildExam(level, pool, `audit-${s}`).parts) {
      for (const task of part.tasks) {
        for (const item of task.items as unknown as Record<string, unknown>[]) {
          // `lemma` on a matching task is the word list, which is the exercise.
          const shown = [item.prompt, item.sentence, item.text, item.hint]
            .filter((x): x is string => typeof x === "string").join(" ");
          ask(`exam ${level} ${task.spec.kind}`, shown, String(item.answer ?? ""));
        }
      }
    }
  }
}
});

/* ── The level check ─────────────────────────────────────────────────────── */
const words: WordRow[] = entries.map((e) => ({
  id: e.lemma, lemma: e.lemma, translation: e.translation, pos: e.pos, cefr: e.cefr,
  government: e.government, semanticTypes: e.semanticTypes ?? null,
  forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null })),
  examples: (e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null })),
}));
timed("check", () => {
/*
  A HUNDRED WORDS A BAND, WHICH IS THE POOL THE APP HANDS IT. `paperFor` reads
  `PER_BAND * 2` rows per band and passes at most `PER_BAND` of them on, so
  giving this the whole dictionary asks a question the app never asks and takes
  minutes doing it: the first version of this audit ran for twelve. The window
  moves with the seed, the way the query's `skip` does, so successive seeds see
  different words rather than the same hundred five times.
*/
const PER_BAND = 100;
const banded = new Map<string, WordRow[]>();
for (const w of words) {
  if (!w.cefr) continue;
  const list = banded.get(w.cefr) ?? [];
  list.push(w);
  banded.set(w.cefr, list);
}
function poolFor(seed: number): WordRow[] {
  const out: WordRow[] = [];
  for (const list of banded.values()) {
    const start = list.length > PER_BAND ? (seed * PER_BAND) % (list.length - PER_BAND) : 0;
    out.push(...list.slice(start, start + PER_BAND));
  }
  return out;
}

/*
  A LISTENING QUESTION IS ASKED THE OTHER QUESTION: NOT "IS THE ANSWER SHOWN"
  BUT "IS A WRONG ANSWER ALSO RIGHT". It plays a whole sentence and asks for the
  meaning of "a word you heard in it", so the meaning of *any* word in the
  recording is a right answer, and a distractor that is one marks a learner
  wrong for listening correctly. `Moraali ja eetika kategooriad.` offered
  "morality" against "ethics". The builder is handed the whole dictionary's
  meanings here, as `paperFor` hands it the cache, because the word that makes
  a distractor true is usually outside the pool the question was drawn from.
*/
const heard = heardIndex(words);
for (let seed = 1; seed <= SEEDS; seed++) {
  const paper = buildPlacement(poolFor(seed), seed, heard) as unknown as Record<string, unknown>;
  for (const [skill, list] of Object.entries(paper)) {
    if (!Array.isArray(list)) continue;
    for (const item of list as Record<string, unknown>[]) {
      const options = (item.options ?? []) as string[];
      // `WriteItem` names its answer `targetForm`, so reading `answer` alone
      // handed `ask` an empty string and it returned on `wanted.length < 2`.
      const answer = typeof item.answer === "number"
        ? options[item.answer] ?? ""
        : String(item.answer ?? item.targetForm ?? "");
      if (item.heard) {
        if (typeof item.answer !== "number") continue;
        asked++;
        const meanings = meaningsHeard(String(item.et ?? ""), heard);
        const alsoRight = options.filter((o, i) => i !== item.answer && meanings.some((m) => !differentMeaning(o, m)));
        for (const option of alsoRight) {
          faults.push({ where: `check ${skill} heard ${String(item.lemma)}`, shown: String(item.et ?? ""), answer: option });
        }
        continue;
      }
      /*
        WHAT THE SCREEN SHOWS, WHICH FOR A WRITE ITEM IS NOT `et`. This read
        `item.et` for every kind and `WriteItem` has no such field: a gap
        carries `sentence`, and `WriteQuestion` prints the word above the box
        in bold with what it means beside it. So both halves of every writing
        item arrived here empty, `ask` returned on `!shown.trim()`, and the
        count went up having looked at nothing. It had looked at nothing since
        the section was written.

        What it was not looking at: 1,549 of the 4,294 words the shipped
        dictionary can gap wanted the dictionary form, so the answer was the
        boldest thing on a screen that sets a learner's writing band.
      */
      const shown = item.kind === "write"
        ? `${String(item.lemma ?? "")} ${String(item.translation ?? "")} ${String(item.sentence ?? "")}`
        : String(item.et ?? "");
      ask(`check ${skill} ${String(item.kind)}`, shown, answer);
    }
  }
}
});

/* ── The flash round ─────────────────────────────────────────────────────── */
/*
  Five shapes over every word the dictionary can inflect, which is the widest
  generator in the app and the newest, so it is the one most likely to print an
  answer somewhere nobody looked.

  Four of the five shapes put the lemma on the screen and ask for a form of it,
  so the fault to look for is a form spelled like the word in the question:
  `kallis` in the seesütlev is `kallis` again, and that is 115 cards this audit
  already found once in the deck. The fifth, `recall`, prints the English and
  asks for the Estonian, which is free on the thirty entries spelled the same
  in both languages.

  One task per word and slot, at a step that rotates the shape, so every shape
  is exercised thousands of times without building a quarter of a million
  tasks: the pool widens with the step, so walking the slots walks the ladder.
  The `heard` shape is excluded from the comparison by the rule this file
  already states about the exam's listening questions, since hiding the prompt
  from the eye is what that exercise is.
*/
timed("flash", () => {
for (const e of entries) {
  const word: FlashWord = {
    lexemeId: e.lemma,
    lemma: e.lemma,
    translation: e.translation,
    pos: e.pos,
    semanticTypes: e.semanticTypes ?? null,
    forms: (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value, morphCode: null })),
    examples: [
      ...(e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null, source: "EKILEX" as const })),
      ...(borrowed.get(e.lemma) ?? []),
    ],
  };

  const slots = askableSlots(word);
  slots.forEach((slot, i) => {
    const task = flashTask({ word, slot, cardId: "audit", step: i });
    if (!task || task.shape === "heard") return;

    // Everything on the screen before the answer is given: the question, the
    // meaning beside it, and the name of the form being asked for.
    const shown = [
      task.shape === "recall" ? task.translation : task.lemma,
      task.shape === "gap" ? task.gapped ?? "" : "",
      task.shape === "gap" || task.shape === "build" || task.shape === "inflect"
        ? task.translation : "",
      task.label,
    ].filter(Boolean).join(" · ");
    ask(`flash ${task.shape} ${e.lemma} ${task.slot}`, shown, task.accepted.join(" / "));
  });
}
});

/* ── The crossword ───────────────────────────────────────────────────────── */
timed("crossword", () => {
/*
  The clash rule reads the whole dictionary rather than one entry, which is
  what the grid does: a clue with two answers is refused on both sides, so an
  audit asking the entries one at a time would report clues the game does not
  set. See `lib/games/clue.ts`.
*/
const clashes = clueClashes(entries.map((e) => ({
  lemma: e.lemma, pos: e.pos, translation: e.translation ?? "",
})));
for (const e of entries) {
  if (clashes.has(clueKey(e.lemma, e.pos))) continue;
  const clue = clueFrom(e.translation ?? "", e.lemma, e.pos);
  if (clue) ask(`crossword ${e.lemma}`, clue, e.lemma);
}
});

/* ── The scene game ──────────────────────────────────────────────────────── */
/*
  A scene puts three words on the screen and asks for one of them in a case, so
  a task whose answer is one of those three is completed by copying, and
  `markDescription` grades the copy Good. Eight of the 1,980 tasks the sixty
  scenes can set were free that way, all of them the seesütlev of a word that
  ends in `s` already: `liblikas`, `sipelgas`, `kotkas`, `kirves`, `labidas`,
  `maasikas`, `lusikas`, `haldjas`.

  Pure and file-backed like everything else here: `SCENES` names lemmas,
  `emojiFor` says which have a picture, and `taskFor` builds the task.
*/
timed("scene", () => {
const nouns = new Map<string, DictionaryRow>();
for (const e of entries) if (e.pos === "NOUN" && !nouns.has(e.lemma)) nouns.set(e.lemma, e);

for (const scene of SCENES) {
  const words: SceneWord[] = [];
  for (const lemma of scene.lemmas) {
    const row = nouns.get(lemma);
    const emoji = emojiFor(lemma);
    if (!row || !emoji) break;
    words.push({
      lemma: row.lemma,
      pos: "NOUN",
      translation: row.translation ?? "",
      emoji,
      semanticTypes: row.semanticTypes ?? null,
      forms: (row.forms ?? []).map((f) => ({ formType: f.formType, value: f.value })),
    });
  }
  if (words.length !== scene.lemmas.length) continue;

  // Every word of the scene, in every case the round could pick, because the
  // builder walks them in priority order and takes the first that answers.
  for (let index = 0; index < words.length; index++) {
    for (const caseKey of ASKABLE_CASES) {
      const task = taskFor(scene, words, index, caseKey);
      if (!task) continue;
      // The prompt is the situation and all three words, which is what makes
      // this different from a card: the answer may be any of the three.
      const prompt = `${scene.situation} ${words.map((w) => w.lemma).join(" ")}`;
      ask(`scene ${scene.id} ${words[index]!.lemma} ${caseKey}`, prompt, task.accepted.join(" / "));
    }
  }
}
});

/* ── Target ──────────────────────────────────────────────────────────────── */
/*
  The aim-and-hit round offers four forms of one word under the lemma and the
  question its case answers, so a form spelled like the lemma is an option the
  learner takes straight off the prompt. 122 of the 51,447 case slots the
  shipped dictionary can fill were spelled that way, every one of them a word
  ending in `s` whose seesütlev comes back to the nominative.

  `caseQuestion` is exported for this, because the round itself is a database
  read and cannot be asked from a file.

  THIS SECTION SAMPLES WHERE THE OTHERS ARE EXHAUSTIVE, and says so rather than
  reading as though it were not. The builder picks one of the word's eleven
  cases itself, which is what the round does, so one call asks one of them: with
  the guard removed this reported 15 of the 122 slots that were free rather than
  all 122. Every one of those is a failure and the count of them is not the
  point, but a fault on a single word could be missed on a single run, which is
  worth knowing about a check before trusting it. The rule the round applies is
  total; this is the backstop, not the rule.
*/
timed("target", () => {
for (const e of entries) {
  if (e.pos !== "NOUN" && e.pos !== "ADJECTIVE") continue;
  const forms = (e.forms ?? []).map((f) => ({
    formType: f.formType, morphCode: null, value: f.value,
  }));
  const question = caseQuestion(
    { lemma: e.lemma, semanticTypes: e.semanticTypes ?? null, forms },
    "audit",
  );
  if (!question) continue;
  // What the learner is shown: the word and the question its case answers.
  ask(
    `target ${e.lemma} ${question.caseEt ?? ""}`,
    `${question.lemma} ${question.question ?? ""}`,
    question.options[question.answer] ?? "",
  );
}
});

/* ── The exceptions round ────────────────────────────────────────────────── */
/*
  The round that drills the words the ending rule does not reach asks two of
  its three rungs for a typed form, and the first thing this section found was
  a real one: the short illative is spelled like a principal part for 1,937 of
  the 2,700 words that have one, so `Euroopa → Euroopa` was the first task of
  the first round anybody played. `drillable` is the rule that keeps those on
  the reference page, where saying so is the point, and out of the round, where
  the answer would be at the top of its own screen.

  Both asked rungs are built here. The gap carries the sentence rather than the
  lemma, which is its own question: printing the dictionary form beside a gap
  that wants a form built on it hands the answer over, and that was 2,468 cards
  once.
*/
timed("exceptions", () => {
for (const e of entries) {
  if (!e.cefr) continue;
  const forms = (e.forms ?? []).map((f) => ({ formType: f.formType, value: f.value }));
  for (const exception of exceptionsFor({ lemma: e.lemma, pos: e.pos, forms })) {
    const word = {
      lexemeId: e.lemma, lemma: e.lemma, translation: e.translation, pos: e.pos,
      // The word's own index, because the gap rung refuses a spelling more
      // than one slot claims and an empty index would quietly drop the rung.
      exception, cardId: null, starred: false, canTranslate: false,
      index: formIndex({ lemma: e.lemma, pos: e.pos, forms }), forms,
      sentences: (e.examples ?? []).map((x) => ({ et: x.et, en: x.en ?? null })),
    };
    if (!drillable(word)) continue;
    for (const task of tasksFor(word)) {
      if (task.rung === "meet") continue;
      const shown = task.rung === "use"
        ? `${task.gapped ?? ""} ${task.translation ?? ""}`
        : `${task.lemma} ${task.translation ?? ""} ${task.label} ${plainAskLine(task.slot) ?? ""}`;
      ask(`exceptions ${task.rung} ${e.lemma} ${task.kind}`, shown, task.accepted.join(" / "));
    }
  }
}
});

/* ── The guided lesson and the checkpoint ────────────────────────────────── */
/*
  THE SCREEN A LEARNER REPORTED, AND THE ONE THIS SCRIPT COULD NOT SEE. A unit
  lesson's gap step read "The word is kindlasti (definitely), in the form the
  sentence needs" over a gap wanting `kindlasti`. Every other generator that
  hides a form in a sentence was already in here; the lesson and the
  end-of-level checkpoint were not, so nothing ever asked. 616 of the 1,354
  course words that can carry a gap at all wanted the dictionary form, which
  is every adverb and every noun a lexicographer only ever wrote plain.

  The lesson's case step is asked too, because it prints the lemma at 32px
  above the box and Estonian spells some cases like the nominative: `kalli`
  plus `s` is `kallis` again. The checkpoint's typed question is deliberately
  not asked: it shows the English gloss alone and wants the lemma, which is a
  production card, and a word spelled the same in both languages is a fact
  said out loud on every screen that prints it (`sameSpelling`).
*/
const byLemmaPos = new Map(entries.map((e) => [`${e.lemma}|${e.pos}`, e]));
function partsOf(e: DictionaryRow): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const f of e.forms ?? []) parts[f.formType] ??= f.value;
  return parts;
}
function lessonWord(lemma: string, pos: string): LessonWord | null {
  const e = byLemmaPos.get(`${lemma}|${pos}`);
  if (!e) return null;
  return {
    lexemeId: e.lemma, lemma: e.lemma, gloss: e.translation, pos: e.pos,
    semanticTypes: e.semanticTypes ?? null,
    examples: (e.examples ?? []).map((x) => x.et),
    parts: partsOf(e), government: e.government ?? null,
  };
}

timed("lesson", () => {
for (const unit of SYLLABUS) {
  const words = unit.vocabulary
    .map((w) => lessonWord(w.lemma, w.pos))
    .filter((w): w is LessonWord => !!w);
  if (words.length === 0) continue;
  for (let seed = 1; seed <= 3; seed++) {
    for (const step of planLesson({ unit, words, distractors: words, seed })) {
      if (step.kind === "gap") {
        // Exactly the cue the screen draws, which `step.cue` decides: the word
        // and its meaning, then the meaning alone, then nothing. A rung that
        // says nothing shows nothing, and there is nothing to find in it.
        const shown = step.cue === "word-and-meaning" ? `${step.lemma} ${step.gloss}`
          : step.cue === "meaning" ? step.gloss
          : "";
        if (shown) ask(`lesson ${unit.id} gap ${step.lemma}`, shown, step.answer);
        else asked++;
      } else if (step.kind === "case") {
        // The word, its meaning, the case's Estonian name and the question it
        // answers, which is every string on that card before the box.
        ask(
          `lesson ${unit.id} case ${step.lemma}`,
          `${step.lemma} ${step.gloss} ${step.caseName} ${step.question}`,
          step.answer,
        );
      }
    }
  }
}
});

timed("checkpoint", () => {
for (const checkpoint of CHECKPOINTS) {
  const words = wordsAtLevel(checkpoint.level)
    .map((w) => lessonWord(w.lemma, w.pos))
    .filter((w): w is LessonWord => !!w)
    .map((w): CheckpointWord => ({
      lemma: w.lemma, gloss: w.gloss, pos: w.pos, examples: w.examples, parts: w.parts,
    }));
  if (words.length === 0) continue;
  for (let seed = 1; seed <= 3; seed++) {
    for (const q of buildCheckpoint(words, checkpoint.questions, seed)) {
      if (q.kind !== "gap") continue;
      ask(`checkpoint ${checkpoint.level} ${q.lemma}`, `${q.lemma} ${q.gloss} ${q.sentence}`, q.answer);
    }
  }
}
});

/* ── The verdict ─────────────────────────────────────────────────────────── */

/*
  A FLOOR, BECAUSE AN AUDIT THAT ASKED NOTHING LOOKS EXACTLY LIKE ONE THAT
  PASSED. Every generator above is wrapped in a loop over the dictionary, and
  every one of those loops is a `continue` away from asking nothing at all: a
  changed export, an empty pool, a builder that starts returning no items. This
  printed "None of them prints its own answer" in each of those cases, which is
  the fault `scripts/lib/checks.mjs` exists for one directory over, arriving
  here because an audit script is not a suite and gets no floor for free.

  The number is what a full run reaches, rounded down hard rather than pinned:
  this is a bound on "did it run", not a second assertion about the dictionary,
  and a floor nobody can pass is a floor somebody lowers.
*/
const FLOOR = 40_000;

console.log(`Asked ${asked.toLocaleString("en-GB")} questions over ${entries.length.toLocaleString("en-GB")} entries.`);
console.log(
  "  "
  + [...spent]
    .map(([what, ms]) =>
      `${what} ${(askedIn.get(what) ?? 0).toLocaleString("en-GB")} in ${Math.round(ms / 100) / 10}s`)
    .join(", ")
  + ` (${SEEDS} seeds per paper)`,
);
const thin = Object.entries(REACHES)
  .filter(([what, reaches]) => (askedIn.get(what) ?? 0) < Math.floor(reaches * 0.8))
  .map(([what, reaches]) => `${what} asked ${(askedIn.get(what) ?? 0).toLocaleString("en-GB")} against ${reaches.toLocaleString("en-GB")}`);
if (thin.length > 0) {
  console.error(
    "\nA section stopped producing rather than started passing:\n  " + thin.join("\n  ")
    + "\nRaise the figure in REACHES if a generator legitimately shrank; do not lower it to pass.",
  );
  process.exit(1);
}
if (asked < FLOOR) {
  console.error(
    `\nOnly ${asked.toLocaleString("en-GB")} questions were built, against a floor of `
    + `${FLOOR.toLocaleString("en-GB")}. Something above stopped producing rather than started `
    + "passing: check that the dictionary loaded and that every generator still returns items.",
  );
  process.exit(1);
}
if (faults.length === 0) {
  console.log("None of them prints its own answer.");
  process.exit(0);
}
console.log(`\n${faults.length} print the answer they ask for:\n`);
for (const f of faults.slice(0, 40)) {
  console.log(`  ${f.where}\n     shows "${f.shown.slice(0, 90)}"\n     wants "${f.answer}"`);
}
if (faults.length > 40) console.log(`  ...and ${faults.length - 40} more.`);
process.exit(1);
