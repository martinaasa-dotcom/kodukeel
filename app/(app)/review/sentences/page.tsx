import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { parseExamples, usableExamples } from "@/lib/dict/examples";
import { sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { isBuildable, naturalSentence, nominalOpener, sentenceTiles } from "@/lib/estonian/cloze";
import { ordinaryOpeners } from "@/lib/dict/openers";
import { SentenceSession, type SentenceTask } from "./SentenceSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { shuffle } from "@/lib/random/shuffle";
import { orderContextFor } from "@/lib/dict/wordOrder";
import { alsoRightOrders } from "@/lib/estonian/wordOrder";
import { courseLevelFor } from "@/lib/progress/level";
import { BUILD_FROM, maySortWords } from "@/lib/collections/levels";
import { lemmaFilter, moduleScopeFrom, sentenceWithin } from "@/lib/course/scope";
import { moduleSpellings } from "@/lib/progress/moduleScope";

export const metadata = { title: "Sentences" };

export const dynamic = "force-dynamic";

const ROUND = 8;

/**
 * Builds a round of sentence-ordering exercises from the learner's own deck.
 *
 * Every sentence is one Ekilex recorded against a word they are already
 * studying, so the vocabulary is familiar and only the word order is being
 * tested. Sentences that already have an English translation come first: with
 * one, the exercise is "say this in Estonian", which is a genuine production
 * task rather than a memory drill.
 *
 * Always renders SentenceSession, even with nothing to do — the same reason as
 * every other mode (see app/review/sprint/page.tsx): grading refreshes this
 * Server Component, and a conditional empty state here would swap in mid-round.
 */
export default async function SentencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();

  // Opened from the module, only a sentence made of taught words is set as
  // tiles, for the reason dictation gives. See lib/course/scope.ts.
  const scope = moduleScopeFrom(await searchParams);
  const readable = sentenceWithin(scope, await moduleSpellings(scope));

  /*
    WORD ORDERING IS A2 AND ABOVE, HERE AS WELL AS IN A LESSON.

    The unit lesson stopped asking a beginner to order a sentence and this
    round, which is the same exercise reached from Practice, went on doing it:
    it draws from the learner's own deck, so an A1 learner with thirteen words
    in it was handed `Palun võta veel üks komm. – Aitäh!` as six tiles, five of
    them words the course had not taught. `maySortWords` is the one answer to
    which bands are asked at all, so the round and the lesson cannot disagree.

    Answered before the query rather than after it: there is nothing to draw
    from a deck for somebody this round is not for, and the reason travels with
    the empty state, because "no sentences to build yet" would send them to the
    dictionary to fix something that is not broken.
  */
  const level = await courseLevelFor(ownerId);
  if (!maySortWords(level)) return <SentenceSession tasks={[]} opensAt={BUILD_FROM} />;

  const [cards, reach] = await Promise.all([
    prisma.card.findMany({
      /*
        state: { not: 0 } is what makes "a word they are already studying" above
        true rather than aspirational: a brand-new card is due the moment it is
        created, so `orderBy due asc` with no state filter put an unmet word's
        sentence at the front of the round, its order being asked for before the
        word itself was ever taught. The same rule sprint, speaking, listening
        and Match already apply to their own pools.
      */
      where: {
        ownerId, suspended: false, lexemeId: { not: null }, state: { not: 0 },
        ...(scope ? { lexeme: lemmaFilter(scope) } : {}),
      },
      orderBy: [{ due: "asc" }],
      take: 300,
      select: {
        id: true,
        cardType: true,
        lexeme: { select: { id: true, lemma: true, pos: true, examples: true, cefr: true } },
      },
    }),
    // And how a beginner's word orders its own sentences, so a round draws
    // the plainest one recorded rather than the shortest, asked beside the
    // deck read because the two do not need each other.
    sentenceReach(),
  ]);

  // One task per word, and one card per word to grade against: a learner with
  // five cards for `raamat` should still meet its sentence once.
  const byLexeme = new Map<string, {
    cardId: string; lemma: string; pos: string; lexemeId: string; examples: string;
    cefr: string | null;
  }>();
  for (const card of cards) {
    const lex = card.lexeme;
    if (!lex) continue;
    const held = byLexeme.get(lex.id);
    // Prefer grading the gap-fill card: it is the one this exercise is closest to.
    if (!held || card.cardType === "CLOZE") {
      byLexeme.set(lex.id, {
        cardId: card.id, lemma: lex.lemma, pos: lex.pos, lexemeId: lex.id, examples: lex.examples,
        cefr: lex.cefr,
      });
    }
  }

  const tasks: Omit<SentenceTask, "alsoRight" | "openerIsWord">[] = [];
  for (const entry of byLexeme.values()) {
    /*
      And only out of a sentence. `isBuildable` counts the tiles and refuses a
      repeated word; it has no opinion on whether the thing is a sentence at
      all, so `Panin lehte/internetti kuulutuse.` came out as tiles to put in
      order with a slash inside one of them. `naturalSentence` is the gate the
      mock exam and the level check already apply.
    */
    const opener = nominalOpener(entry.pos, [entry.lemma]);
    for (const example of usableExamples(parseExamples(entry.examples), plainerFirst(entry.cefr, reach))) {
      if (!naturalSentence(example.et, opener)) continue;
      if (!readable(example.et)) continue;
      if (!isBuildable(example.et)) continue;
      tasks.push({
        cardId: entry.cardId,
        lexemeId: entry.lexemeId,
        lemma: entry.lemma,
        et: example.et,
        en: example.en ?? null,
      });
      break; // one sentence per word keeps a round varied
    }
  }

  // Translated first, then shuffled within each group so a round is not the
  // same eight sentences every time.
  const translated = shuffle(tasks.filter((t) => t.en));
  const untranslated = shuffle(tasks.filter((t) => !t.en));
  const round = [...translated, ...untranslated].slice(0, ROUND);

  /*
    The other orders each of these sentences allows, worked out here because
    the round marks the answer in the browser and the dictionary is what
    decides. Asked of the eight sentences the round actually sets rather than
    of every candidate, since the query is keyed on the words in front of it.
  */
  const [wordOrder, openers] = await Promise.all([
    orderContextFor(round.map((t) => t.et)),
    ordinaryOpeners(round.map((t) => t.et)),
  ]);

  return (
    <BeforeYouStart id="sentences" ready={round.length > 0} count={{ n: round.length, noun: "sentence" }}>
      <SentenceSession
        tasks={round.map((t) => ({
          ...t,
          alsoRight: alsoRightOrders(t.et, wordOrder),
          openerIsWord: openers.has(sentenceTiles(t.et)[0] ?? ""),
        }))}
      />
    </BeforeYouStart>
  );
}

