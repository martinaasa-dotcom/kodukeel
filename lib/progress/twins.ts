import { prisma } from "@/lib/db";
import { bandsAround } from "@/lib/collections/levels";
import { TWIN_GROUPS, guessable, twinGroup, twinLemmas, type TwinGroup } from "@/lib/collections/twins";
import { bySubstance } from "@/lib/dict/search";
import { borrowedSentences, sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import type { ModuleScope } from "@/lib/course/scope";
import { courseLevelFor } from "@/lib/progress/level";
import { starredAmong } from "@/lib/progress/stars";
import { shuffle } from "@/lib/random/shuffle";
import {
  guessQuestionFor, sentenceQuestionsFor, type TwinQuestion, type TwinRow,
} from "@/lib/progress/twinQuestions";

/**
 * A ROUND OF KAKSIKUD, READ OFF THE DICTIONARY AND THE LEARNER'S DECK.
 *
 * `lib/progress/twinQuestions.ts` builds the questions and says what they are;
 * this decides which groups a round draws on and in what order.
 *
 * A GROUP THE LEARNER ALREADY HOLDS A WORD OF LEADS, and among those the
 * groups whose words they have lost most often. Those are the mix-ups they can
 * make today, and the only answers that can be graded. Then the groups at
 * the learner's level, then the rest, so a round is never empty on a small
 * deck. One question a group, so ten questions are ten different pairs, and up
 * to three of them ask the guessing question where the group allows it.
 *
 * A GROUP NAMED IN THE ADDRESS IS THE WHOLE ROUND, which is what the grammar
 * page and the review card's note link to: every word of that one group in a
 * sentence or two, and the guessing question first where there is one.
 *
 * INSIDE THE MODULE a group is offered only once every word of it has been
 * taught, and a form only once the page teaching it has been read
 * (`slotWithin`), so a round walked to from Practice asks nothing the evenings
 * have not handed over.
 */

/** Questions in one round. */
export const TWIN_ROUND = 10;

/** Guessing questions in a mixed round, at most. */
const GUESSES = 3;

export interface TwinRound {
  questions: (TwinQuestion & { cardId: string | null; starred: boolean })[];
  /** The group the round was asked to drill, where the address named one. */
  focus: TwinGroup | null;
}

export async function twinsRound(
  ownerId: string, scope: ModuleScope | null, focusId: string | null,
): Promise<TwinRound> {
  const focus = twinGroup(focusId) ?? null;
  const wanted = twinLemmas();
  const select = {
    id: true, lemma: true, pos: true, cefr: true, translation: true, examples: true, provenance: true,
    forms: { select: { formType: true, value: true, morphCode: true }, orderBy: { id: "asc" as const } },
  };
  const [found, borrowed, reach, level] = await Promise.all([
    prisma.lexeme.findMany({
      where: { lemma: { in: [...new Set(wanted.map((w) => w.lemma))] } },
      select,
      orderBy: { id: "asc" },
    }),
    borrowedSentences(),
    sentenceReach(),
    courseLevelFor(ownerId),
  ]);

  // One row per lemma and part of speech, by the rule the search leads with.
  const rows = new Map<string, TwinRow & { provenance: string }>();
  for (const row of found) {
    const key = `${row.lemma}|${row.pos}`;
    const held = rows.get(key);
    if (!held || bySubstance(row, held) < 0) rows.set(key, row);
  }

  const ids = [...rows.values()].map((r) => r.id);
  const cards = ids.length === 0 ? [] : await prisma.card.findMany({
    where: { ownerId, suspended: false, lexemeId: { in: ids }, cardType: { in: ["PRODUCTION", "RECOGNITION"] } },
    select: { id: true, lexemeId: true, cardType: true, lapses: true },
    orderBy: { id: "asc" },
  });
  // The production card where there is one, since picking the word for a
  // meaning is the production direction; the recognition card otherwise.
  const cardFor = new Map<string, string>();
  const lapsesOf = new Map<string, number>();
  for (const c of cards) {
    if (!c.lexemeId) continue;
    if (c.cardType === "PRODUCTION" || !cardFor.has(c.lexemeId)) cardFor.set(c.lexemeId, c.id);
    lapsesOf.set(c.lexemeId, Math.max(lapsesOf.get(c.lexemeId) ?? 0, c.lapses));
  }

  const taught = scope ? new Set(scope.lemmas) : null;
  const usable = (g: TwinGroup) =>
    g.words.every((w) => rows.has(`${w.lemma}|${w.pos}`) && (!taught || taught.has(w.lemma)));
  const bands = new Set<string>(bandsAround(level));
  const held = (g: TwinGroup) => g.words.some((w) => cardFor.has(rows.get(`${w.lemma}|${w.pos}`)?.id ?? ""));
  // How often the learner has lost a word of the group, which is the nearest
  // thing the log holds to "these two are the ones I mix up".
  const struggle = (g: TwinGroup) =>
    Math.max(0, ...g.words.map((w) => lapsesOf.get(rows.get(`${w.lemma}|${w.pos}`)?.id ?? "") ?? 0));
  const near = (g: TwinGroup) => g.words.every((w) => {
    const cefr = rows.get(`${w.lemma}|${w.pos}`)?.cefr;
    return !cefr || bands.has(cefr) || ["A1", "A2"].includes(cefr);
  });

  const lent = (lexemeId: string) => borrowed.get(lexemeId) ?? [];
  const rank = (row: TwinRow) => plainerFirst(row.cefr, reach);
  const decoys = TWIN_GROUPS.flatMap((g) => g.words.map((w) => w.means));
  const decoyFor = (g: TwinGroup) => shuffle(decoys.filter((d) => !g.words.some((w) => w.means === d)))[0] ?? "";

  const questions: TwinQuestion[] = [];
  if (focus) {
    if (usable(focus)) {
      if (guessable(focus)) {
        const guess = guessQuestionFor(focus, rows, Math.random() < 0.5, decoyFor(focus));
        if (guess) questions.push(guess);
      }
      const perWord = focus.words.map((w) => shuffle(sentenceQuestionsFor(focus, w, rows, lent, rank, scope, 4)));
      // Dealt in turn, one word then the next, so every word of the group is asked.
      for (let round = 0; questions.length < TWIN_ROUND && perWord.some((q) => q.length > round); round++) {
        for (const list of perWord) if (list[round] && questions.length < TWIN_ROUND) questions.push(list[round]!);
      }
    }
  } else {
    const groups = TWIN_GROUPS.filter(usable);
    const ordered = [
      // Shuffled, then the ones they lose most often first: a stable sort keeps
      // the shuffle among groups tied on lapses, so a round is not the same
      // ten every time.
      ...shuffle(groups.filter(held)).sort((x, y) => struggle(y) - struggle(x)),
      ...shuffle(groups.filter((g) => !held(g) && near(g))),
      ...shuffle(groups.filter((g) => !held(g) && !near(g))),
    ];
    let guesses = 0;
    for (const g of ordered) {
      if (questions.length >= TWIN_ROUND) break;
      if (guessable(g) && guesses < GUESSES && Math.random() < 0.4) {
        const guess = guessQuestionFor(g, rows, Math.random() < 0.5, decoyFor(g));
        if (guess) { questions.push(guess); guesses += 1; continue; }
      }
      const word = shuffle([...g.words])[0]!;
      const sentence = sentenceQuestionsFor(g, word, rows, lent, rank, scope, 1)[0]
        ?? g.words.flatMap((w) => sentenceQuestionsFor(g, w, rows, lent, rank, scope, 1))[0];
      if (sentence) questions.push(sentence);
    }
  }

  const lexemeOf = (q: TwinQuestion) => (q.shape === "sentence" ? q.lexemeId : q.asked.lexemeId);
  const starred = await starredAmong(ownerId, questions.map(lexemeOf));
  const out = questions.map((q) => ({
    ...q,
    // A guess is reasoned rather than recalled, so it is evidence about no card.
    cardId: q.shape === "sentence" ? cardFor.get(q.lexemeId) ?? null : null,
    starred: starred.has(lexemeOf(q)),
  }));
  return { questions: focus ? out : shuffle(out), focus };
}
