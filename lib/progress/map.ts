import { prisma } from "@/lib/db";
import { CASES } from "@/lib/estonian/cases";
import { asksAboutPerson, canPicturePlace, caseFitsInSentence, caseQuestionFor } from "@/lib/estonian/caseQuestion";
import { mentions } from "@/lib/estonian/cloze";
import { caseAnswer, followsEndingRule, stemsFrom, type NounStems } from "@/lib/estonian/derive";
import { caseIndex, readCase } from "@/lib/estonian/whichCase";
import { grammarTerm } from "@/lib/estonian/terms";
import type { CaseKey } from "@/lib/estonian/types";
import { bandsAround } from "@/lib/collections/levels";
import { caseWithin, lemmaFilter, type ModuleScope } from "@/lib/course/scope";
import { VOUCHED_ROW } from "@/lib/dict/search";
import { borrowedSentences, sentenceReach } from "@/lib/dict/facts";
import { lentFor, sentenceEnglish, sentenceWords, parseExamples, type Example } from "@/lib/dict/examples";
import { plainerFirst } from "@/lib/dict/plainness";
import { formSentencesFor } from "@/lib/srs/cards";
import { courseLevelFor } from "@/lib/progress/level";
import { starredAmong } from "@/lib/progress/stars";
import { differentText, formNearness } from "@/lib/questions/distractors";
import { shuffle } from "@/lib/random/shuffle";
import {
  MAP_CASES, MAP_QUESTIONS, dealByCase, pickWrong, sceneFor,
  type FormChoice, type MapScene,
} from "@/lib/games/map";

/**
 * THE QUESTIONS A MAP ROUND ASKS.
 *
 * One word, one case, and the three forms of that word that the picture has to
 * tell apart. `lib/games/map.ts` is what the round is and why; this is the part
 * that reads the dictionary and the learner's deck.
 *
 * A SENTENCE IS REQUIRED, which was the operator's call and is the stricter of
 * the two readings. A form nobody can be shown in use is a form this app cannot
 * teach (`lib/srs/cards.ts`, the CASE_FORM branch), so a question exists only
 * where a lexicographer's sentence holds the asked form and `readCase` reads
 * that spelling as exactly one case. It is the same test the deck builder
 * applies, over eleven cases instead of eight, and it is what the reveal
 * prints after the answer.
 *
 * THE WRONG ANSWERS NEED NO SENTENCE. They are other forms of the same word,
 * and nothing here teaches them: they are what the picture is tested against.
 *
 * DECK FIRST, THE DICTIONARY BEHIND IT. A learner's own nouns lead, since those
 * are the words they have met and the only ones that can be graded. The rest of
 * the round is topped up from the dictionary at their level, ungraded, exactly
 * as the emoji round was: a word with no card writes nothing. Inside a module
 * both are held to what the evenings have taught, case by case.
 */

/** Nouns read per round, before the sentence rule thins them. */
const POOL = 400;

export interface MapOption {
  /** The form as printed. */
  text: string;
  key: CaseKey;
  /** The ending, only where the form really is the stem with it on the end. */
  ending: string | null;
  /** The question a class asks for this case, the pronoun that suits the word. */
  ask: string;
}

export interface MapQuestion {
  /** The card this is evidence about, or null for a word the learner has no card for. */
  cardId: string | null;
  lexemeId: string;
  starred: boolean;
  lemma: string;
  /** The English gloss, printed beside the lemma under the picture. */
  gloss: string;
  caseKey: CaseKey;
  /** The case's Estonian name, for the note after an answer. */
  caseEt: string;
  scene: MapScene;
  /** The recorded sentence, exactly as written, and the form in it. */
  sentence: string;
  form: string;
  en: string | null;
  options: MapOption[];
  answer: number;
}

interface WordRow {
  id: string;
  lemma: string;
  translation: string;
  pos: string;
  cefr: string | null;
  semanticTypes: string | null;
  examples: string | null;
  forms: { formType: string; value: string; morphCode: string | null }[];
}

interface Candidate {
  row: WordRow;
  cardId: string | null;
  question: Omit<MapQuestion, "starred">;
}

/**
 * Every question one word can be asked, one per case, for the cases Map draws.
 *
 * Exported for `scripts/audit-questions.ts`, which builds one of these for every
 * word the shipped dictionary can make one for and asks whether the answer is
 * on the screen, the same audit every other generator is held to.
 */
export function questionsForWord(
  row: WordRow,
  borrowed: readonly Example[],
  rank: ((a: Example, b: Example) => number) | undefined,
  scope: ModuleScope | null,
): Omit<MapQuestion, "starred" | "cardId">[] {
  if (row.pos !== "NOUN") return [];
  const stems = stemsFrom(row.forms);
  const index = caseIndex(stems);
  const subject = { lemma: row.lemma, semanticTypes: row.semanticTypes, nomSg: stems.nomSg ?? null };
  const lex = { lemma: row.lemma, pos: row.pos, examples: row.examples, forms: row.forms, plainest: rank, borrowed };
  const sentences = formSentencesFor(lex as Parameters<typeof formSentencesFor>[0]);
  if (sentences.length === 0) return [];
  const lemma = row.lemma.trim().toLocaleLowerCase("et");
  const animate = asksAboutPerson(subject);
  const label = `${row.lemma}, ${row.translation}`;

  // Every form of the word the picture could be told apart from, by case.
  const answers = new Map<CaseKey, ReturnType<typeof caseAnswer>>();
  for (const key of MAP_CASES) {
    if (!caseFitsInSentence(key, subject, row.pos)) continue;
    answers.set(key, caseAnswer(stems, key));
  }

  const out: Omit<MapQuestion, "starred" | "cardId">[] = [];
  for (const key of MAP_CASES) {
    if (!caseWithin(scope, key)) continue;
    const answer = answers.get(key);
    if (!answer) continue;
    // The word on the label may not be the answer, and neither may its gloss.
    if (answer.accepted.some((f) => f.trim().toLocaleLowerCase("et") === lemma)) continue;
    if (answer.accepted.some((f) => mentions(label, f))) continue;
    const scene = sceneFor(key, animate);
    if (!scene) continue;
    // A house, a table or a person is only a true picture of a word that is one.
    if ((scene.kind === "container" || scene.kind === "surface" || scene.kind === "person")
      && !canPicturePlace(subject)) continue;

    /*
      A sentence holding the asked form as a whole word, and `readCase` reads
      that spelling as this case and no other. Nothing is gapped here, so this
      is a reading of the sentence rather than a decision about what to hide:
      it is `buildCloze`'s own test of a sentence, minus the hole.
    */
    const wanted = new Set(answer.accepted.map((f) => f.trim().toLocaleLowerCase("et")));
    let hit: { example: Example; form: string } | null = null;
    for (const example of sentences) {
      const words = sentenceWords(example.et);
      if (words.length < 3) continue;
      const form = words.find((w) => wanted.has(w));
      if (!form || !lentFor(example, form)) continue;
      const verdict = readCase(index, form);
      if (verdict.kind !== "one" || verdict.key !== key) continue;
      hit = { example, form };
      break;
    }
    if (!hit) continue;

    const forms = (k: CaseKey): FormChoice | null => {
      const a = answers.get(k);
      return a ? { key: k, text: a.value } : null;
    };
    const others = MAP_CASES
      // Inside a module, a wrong answer is a case the evenings have taught too.
      .filter((k) => k !== key && caseWithin(scope, k))
      .map(forms)
      .filter((c): c is FormChoice => c !== null)
      // A form spelled like the word on the label is not a wrong answer worth
      // offering: it reads as the label copied.
      .filter((c) => c.text.trim().toLocaleLowerCase("et") !== lemma);
    const wrong = pickWrong({
      answer: { key, text: answer.value },
      others,
      accepted: answer.accepted,
      nearness: (c, a) => formNearness({ text: c }, { text: a }),
      same: (a, b) => !differentText(a, b),
    });
    if (!wrong) continue;

    const make = (c: FormChoice): MapOption => ({
      text: c.text, key: c.key, ending: endingOf(c.text, c.key, stems),
      ask: caseQuestionFor(CASES.find((s) => s.key === c.key)!, subject),
    });
    const options = shuffle([make({ key, text: answer.value }), ...wrong.map(make)]);
    out.push({
      lexemeId: row.id,
      lemma: row.lemma,
      gloss: row.translation,
      caseKey: key,
      caseEt: grammarTerm(key)?.et ?? CASES.find((c) => c.key === key)?.et ?? "",
      scene,
      sentence: hit.example.et,
      form: hit.form,
      en: sentenceEnglish(parseExamples(row.examples), hit.example.et) ?? hit.example.en ?? null,
      options,
      answer: options.findIndex((o) => o.key === key),
    });
  }
  return out;
}

/** The ending a form carries, only where it really is the stem with it on. */
function endingOf(text: string, key: CaseKey, stems: NounStems): string | null {
  const spec = CASES.find((c) => c.key === key);
  if (!spec) return null;
  return followsEndingRule(text, stems.genSg, spec) ? `-${spec.suffix}` : null;
}

/**
 * The round: ten words, each asked one case, cases dealt in turn so a rare one
 * is not drowned by the commonest.
 */
export async function mapRound(ownerId: string, scope: ModuleScope | null = null): Promise<MapQuestion[]> {
  const select = {
    id: true, lemma: true, translation: true, pos: true, cefr: true,
    semanticTypes: true, examples: true,
    forms: { select: { formType: true, value: true, morphCode: true }, orderBy: { id: "asc" as const } },
  };

  const [cards, borrowed, reach] = await Promise.all([
    // The learner's own met nouns. Ordered, and ending on the id, because this
    // is a `take` and neither `lapses` nor `due` is unique.
    prisma.card.findMany({
      where: { ownerId, suspended: false, state: { not: 0 }, lexeme: { pos: "NOUN", ...lemmaFilter(scope) } },
      orderBy: [{ lapses: "desc" }, { due: "asc" }, { id: "asc" }],
      take: POOL,
      select: { id: true, lexeme: { select } },
    }),
    borrowedSentences(),
    sentenceReach(),
  ]);

  const seen = new Set<string>();
  const have: { row: WordRow; cardId: string | null }[] = [];
  for (const c of cards) {
    if (!c.lexeme || seen.has(c.lexeme.id)) continue;
    seen.add(c.lexeme.id);
    have.push({ row: c.lexeme, cardId: c.id });
  }

  // Topped up from the dictionary at the learner's level, so a small deck still
  // has a round. Ungraded: there is no card to grade.
  const level = await courseLevelFor(ownerId);
  const extra = await prisma.lexeme.findMany({
    where: {
      pos: "NOUN", ...VOUCHED_ROW, id: { notIn: [...seen] },
      ...(scope ? lemmaFilter(scope) : { cefr: { in: [...bandsAround(level)] } }),
    },
    select,
    orderBy: { id: "asc" },
    take: POOL,
  });
  const topUp = shuffle(extra).map((row) => ({ row, cardId: null as string | null }));

  const build = (items: { row: WordRow; cardId: string | null }[]): Candidate[] =>
    items.flatMap(({ row, cardId }) =>
      questionsForWord(row, borrowed.get(row.id) ?? [], plainerFirst(row.cefr, reach), scope)
        .map((q) => ({ row, cardId, question: { ...q, cardId } })));

  // The deck's words first. A round is taken from them alone where they are
  // enough, and only then from the rest, so what is graded leads.
  const deckSide = build(shuffle(have));
  let chosen = dealBy(deckSide, MAP_QUESTIONS);
  if (chosen.length < MAP_QUESTIONS) {
    const used = new Set(chosen.map((c) => c.row.id));
    const more = build(topUp.slice(0, 160)).filter((c) => !used.has(c.row.id));
    chosen = [...chosen, ...dealBy(more, MAP_QUESTIONS - chosen.length)];
  }

  const starred = await starredAmong(ownerId, chosen.map((c) => c.row.id));
  return shuffle(chosen).map((c) => ({ ...c.question, starred: starred.has(c.row.id) }));
}

function dealBy(candidates: Candidate[], take: number): Candidate[] {
  const byCase = new Map<CaseKey, Candidate[]>();
  for (const c of shuffle(candidates)) {
    const list = byCase.get(c.question.caseKey) ?? [];
    list.push(c);
    byCase.set(c.question.caseKey, list);
  }
  return dealByCase(byCase, take, (c) => c.row.id);
}
