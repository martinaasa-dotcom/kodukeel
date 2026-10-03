import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { starredAmong } from "@/lib/progress/stars";
import { resolveProvider } from "@/lib/tutor/provider";
import { writingTasksFor } from "@/lib/estonian/writing";
import { mentions } from "@/lib/estonian/cloze";
import { parseExamples } from "@/lib/dict/examples";
import { isLocalCase } from "@/lib/estonian/caseQuestion";
import { kindStated } from "@/lib/estonian/semantics";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { WriteSession, type WritingPrompt } from "./WriteSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { shuffle } from "@/lib/random/shuffle";
import { caseWithin, lemmaFilter, moduleScopeFrom, tonightFirst, tonightsCase } from "@/lib/course/scope";
import { CASES } from "@/lib/estonian/cases";
import { caseAsked } from "@/lib/srs/slots";

export const metadata = { title: "Writing" };

export const dynamic = "force-dynamic";

const ROUND = 6;

/**
 * Free production: the learner writes their own sentence rather than recalling
 * one side of a card.
 *
 * Words are drawn from their own deck, weighted toward the cases they have
 * actually been getting wrong — the point is to practice producing, not to meet
 * new vocabulary, so everything here is a word they have already met.
 */
export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();

  // Opened from the module, taught words in taught cases. See lib/course/scope.ts.
  const scope = moduleScopeFrom(await searchParams);

  const cards = await prisma.card.findMany({
    /*
      state: { not: 0 } is what makes "everything here is a word they have
      already met" above true rather than aspirational: `lapses desc` does not
      reliably push a brand-new card to the back, because a word that has
      never been reviewed and a word that has been reviewed and never gotten
      wrong both carry `lapses: 0`, and on a deck thinner than the take a
      never-met word could be asked to write a sentence with a form it was
      never shown. The same rule sprint, speaking, listening and Match already
      apply to their own pools.
    */
    where: {
      ownerId, suspended: false, lexemeId: { not: null }, state: { not: 0 },
      ...(scope ? { lexeme: lemmaFilter(scope) } : {}),
    },
    select: { id: true, lexemeId: true, lapses: true, cardType: true },
    orderBy: { lapses: "desc" },
    take: 200,
  });

  /*
    The card this exercise is really practicing.
    ADR-016: a practice mode is not a side game with a score of its own. Writing
    a sentence with `tuba` in the inessive is evidence about that word, so it
    grades the same card the daily loop would, and the scheduler sees it. A
    case-form card is the closest match; production is the fallback.
  */
  const cardFor = new Map<string, string>();
  for (const c of cards) {
    if (!c.lexemeId) continue;
    const better = c.cardType === "CASE_FORM" || c.cardType === "PRODUCTION";
    if (!cardFor.has(c.lexemeId) || better) cardFor.set(c.lexemeId, c.id);
  }

  const lexemeIds = [...new Set(cards.map((c) => c.lexemeId).filter((id): id is string => !!id))];

  const lexemes = lexemeIds.length
    ? await prisma.lexeme.findMany({
        where: { id: { in: lexemeIds }, pos: { in: ["NOUN", "ADJECTIVE"] } },
        include: { forms: true },
      })
    : [];

  // The cases this learner has slipped on most, so the round targets weakness
  // rather than sampling evenly.
  // Grouped on the pair and folded through `caseAsked`, so a miss counts at
  // the case the round asked rather than at the card's own.
  const weak = await prisma.review.groupBy({
    by: ["targetCase", "slot"],
    where: { ownerId, rating: 1, OR: [{ targetCase: { not: null } }, { slot: { in: CASES.map((c) => c.key as string) } }] },
    _count: { _all: true },
  });
  const missesByCase = new Map<string, number>();
  for (const w of weak) {
    const key = caseAsked(w);
    if (key) missesByCase.set(key, (missesByCase.get(key) ?? 0) + w._count._all);
  }
  const weakCases = new Set(
    [...missesByCase].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([key]) => key),
  );

  const pool: Omit<WritingPrompt, "starred">[] = [];
  /*
    The prompts whose form a lexicographer has recorded in a sentence, which
    is the one signal this page has that the word is said in that case at
    all. "Use sünniaeg in a sentence that says in the date of birth" is a
    form the rule builds and nobody writes, and it led a round once tonight's
    case was put first; a recorded form leads now and an unrecorded one is
    still asked, behind it, because a word with no sentences is not a wrong
    word.
  */
  const recorded = new WeakSet<object>();
  for (const lexeme of lexemes) {
    const sentences = parseExamples(lexeme.examples);
    for (const task of writingTasksFor(lexeme)) {
      const cardId = cardFor.get(lexeme.id);
      if (!cardId) continue;
      if (!caseWithin(scope, task.caseKey)) continue;
      // A place case is phrased in English on this screen ("in the house"),
      // so it is asked only of a word whose kind the dictionary has stated:
      // see `kindStated`, which is why "in the acquaintance" went.
      if (isLocalCase(task.caseKey) && !kindStated(lexeme.semanticTypes)) continue;
      pool.push({
        cardId,
        lexemeId: lexeme.id,
        lemma: task.lemma,
        translation: task.translation,
        caseKey: task.caseKey,
        caseEt: task.caseEt,
        caseQuestion: task.caseQuestion,
        targetForm: task.targetForm,
        provenance: task.provenance,
        weak: weakCases.has(task.caseKey),
      });
      if (sentences.some((e) => mentions(e.et, task.targetForm))) recorded.add(pool.at(-1)!);
    }
  }

  // Weak cases first and a recorded form before an unrecorded one, each tier
  // shuffled on its own, so a round is varied but pointed: a shuffle per tier
  // rather than one sort keyed on random numbers, which says what it does.
  // And inside the module, the case tonight's reading was about woven through
  // the front of it (`tonightFirst`), so the page just read is the page used.
  const tonight = tonightsCase(scope);
  const tier = (p: (typeof pool)[number]) => (p.weak ? 0 : 2) + (recorded.has(p) ? 0 : 1);
  const shuffled = tonightFirst(
    [0, 1, 2, 3].flatMap((t) => shuffle(pool.filter((p) => tier(p) === t))),
    (p) => p.caseKey === tonight,
  );

  // At most one prompt per word, so a round is six different words.
  const seen = new Set<string>();
  const round = shuffled.filter((p) => !seen.has(p.lemma) && seen.add(p.lemma)).slice(0, ROUND);

  if (round.length === 0) {
    return (
      <Page title="Writing" lead="Write your own sentences in Estonian, and we'll check them.">
        <Empty
          title="No words to write about yet"
          body="This uses nouns and adjectives from your deck. Add a few and come back."
          action={<ButtonLink href="/dictionary" variant="primary">Open the dictionary</ButtonLink>}
        />
      </Page>
    );
  }

  /*
    Which of the round's words are already favorites, in one read rather than
    one per prompt. After the round is picked rather than before it, since the
    pool is every word in the deck that can carry a writing task and the round
    is six.
  */
  const starred = await starredAmong(ownerId, round.map((p) => p.lexemeId));

  return (
    <BeforeYouStart id="write" ready={round.length > 0} count={{ n: round.length, noun: "word" }}>
      <WriteSession
        prompts={round.map((p) => ({ ...p, starred: starred.has(p.lexemeId) }))}
        aiAvailable={resolveProvider() !== null}
      />
    </BeforeYouStart>
  );
}
