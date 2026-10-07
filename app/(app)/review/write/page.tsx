import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { starredAmong } from "@/lib/progress/stars";
import { resolveProvider } from "@/lib/tutor/provider";
import { writingTasksFor } from "@/lib/estonian/writing";
import { sayPhrase } from "@/lib/estonian/sayIt";
import { sentenceAsk } from "@/lib/estonian/caseReading";
import { parseExamples } from "@/lib/dict/examples";
import { recordsCase } from "@/lib/dict/recorded";
import { caseIndex } from "@/lib/estonian/whichCase";
import { borrowedSentences } from "@/lib/dict/facts";
import { isLocalCase } from "@/lib/estonian/caseQuestion";
import { kindStated } from "@/lib/estonian/semantics";
import { shownForms, stemsFromParts } from "@/lib/estonian/derive";
import { PARTS } from "@/lib/copy/values";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { WriteSession, type WritingPrompt } from "./WriteSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { shuffle } from "@/lib/random/shuffle";
import { RECENT_WORDS, byRecency, caseWithin, lemmaFilter, recentLemmas, tonightFirst, tonightsCase } from "@/lib/course/scope";
import { CASES } from "@/lib/estonian/cases";
import { caseAsked } from "@/lib/srs/slots";
import { practiceScope } from "@/lib/progress/moduleScope";

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
  const scope = await practiceScope(ownerId, await searchParams);

  const cardSelect = { id: true, lexemeId: true, lapses: true, cardType: true } as const;
  const [general, recent] = await Promise.all([
    prisma.card.findMany({
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
      select: cardSelect,
      /*
        Ending on the id, because `lapses` ties on nearly every card a learner
        holds in their first months, and a cut at two hundred on a tie is the
        plan choosing the words. It chose a block of people on the A2 evening
        about the inessive, none of whom take the inside endings, and the round
        asked "of the man" six times and the evening's own case never.
      */
      orderBy: [{ lapses: "desc" }, { id: "asc" }],
      take: 200,
    }),
    /*
      INSIDE THE MODULE, TODAY'S WORDS AND THE EVENINGS JUST BEFORE, whatever
      the cut above reached, which is the rule every other module round keeps
      (`recentLemmas`). Today's case is usually carried by them: the inessive
      evening teaches animals and the two before it the forest, the sea and the
      lake, which are where the inessive is said.
    */
    scope
      ? prisma.card.findMany({
          where: {
            ownerId, suspended: false, state: { not: 0 },
            lexeme: { lemma: { in: recentLemmas(scope) } },
          },
          select: cardSelect,
          orderBy: { id: "asc" },
          take: RECENT_WORDS * 4,
        })
      : Promise.resolve([]),
  ]);
  const led = new Set(recent.map((c) => c.id));
  const cards = [...recent, ...general.filter((c) => !led.has(c.id))];

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

  // The words, what each may borrow, and the cases this learner has slipped on
  // most, so the round targets weakness rather than sampling evenly. The misses
  // are grouped on the pair and folded through `caseAsked`, so a miss counts at
  // the case the round asked rather than at the card's own.
  const [lexemes, borrowed, weak] = await Promise.all([
    lexemeIds.length
      ? prisma.lexeme.findMany({
          where: { id: { in: lexemeIds }, pos: { in: ["NOUN", "ADJECTIVE"] } },
          include: { forms: true },
        })
      : Promise.resolve([]),
    borrowedSentences(),
    prisma.review.groupBy({
      by: ["targetCase", "slot"],
      where: { ownerId, rating: 1, OR: [{ targetCase: { not: null } }, { slot: { in: CASES.map((c) => c.key as string) } }] },
      _count: { _all: true },
    }),
  ]);
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
    form the rule builds and nobody writes, and it led a round once today's
    case was put first; a recorded form leads now and an unrecorded one is
    still asked, behind it, because a word with no sentences is not a wrong
    word.

    EXCEPT IN A LOCAL CASE, WHERE AN UNRECORDED FORM IS NOT SET AT ALL.
    Ranking it behind was not enough: a weak case and today's case both
    outrank the tier, and a B2 evening opened on "Use aadress in a sentence
    that says into the address", which is the rule's form and not something
    anybody sends a letter to. In and on and to are where a thing's meaning
    turns, so a local case is asked only where a sentence records the form,
    the word's own or one lent for that very spelling (`Example.via`). The
    other cases are asked of every noun, and are.
  */
  const recorded = new WeakSet<object>();
  for (const lexeme of lexemes) {
    const sentences = parseExamples(lexeme.examples);
    const lent = borrowed.get(lexeme.id) ?? [];
    const parts: Record<string, string> = {};
    for (const form of lexeme.forms) parts[form.formType] ??= form.value;
    const index = caseIndex(stemsFromParts(parts));
    // A spelling the word wears in another case too records nothing: see `recordsCase`.
    const said = (key: (typeof CASES)[number]["key"], forms: readonly (string | null)[]) =>
      recordsCase(index, key, forms, sentences, lent);
    const subject = {
      lemma: lexeme.lemma,
      semanticTypes: lexeme.semanticTypes,
      nomSg: lexeme.forms.find((f) => f.formType === "NOM_SG")?.value ?? null,
    };
    for (const task of writingTasksFor(lexeme)) {
      const cardId = cardFor.get(lexeme.id);
      if (!cardId) continue;
      if (!caseWithin(scope, task.caseKey)) continue;
      // A place case is phrased in English on this screen ("in the house"),
      // so it is asked only of a word whose kind the dictionary has stated:
      // see `kindStated`, which is why "in the acquaintance" went.
      if (isLocalCase(task.caseKey) && !kindStated(lexeme.semanticTypes)) continue;
      if (isLocalCase(task.caseKey) && !said(task.caseKey, [task.targetForm, task.alsoRight])) continue;
      pool.push({
        cardId,
        lexemeId: lexeme.id,
        lemma: task.lemma,
        translation: task.translation,
        caseKey: task.caseKey,
        caseEt: task.caseEt,
        caseQuestion: task.caseQuestion,
        targetForm: task.targetForm,
        shown: shownForms({ singular: task.targetForm, alsoRight: task.alsoRight }).join(PARTS),
        provenance: task.provenance,
        weak: weakCases.has(task.caseKey),
        // What the sentence is asked to say, as a sentence rather than a form:
        // "looking for the son" for the osastav, "of a pleasant one" for an
        // adjective. See `sentenceAsk`.
        say: sentenceAsk(task.caseKey, task.translation, lexeme.pos, subject)
          ?? sayPhrase(task.caseKey, task.translation, subject),
      });
      if (said(task.caseKey, [task.targetForm, task.alsoRight])) recorded.add(pool.at(-1)!);
    }
  }

  // Weak cases first and a recorded form before an unrecorded one, each tier
  // shuffled on its own, so a round is varied but pointed: a shuffle per tier
  // rather than one sort keyed on random numbers, which says what it does.
  // And inside the module, the case today's reading was about woven through
  // the front of it (`tonightFirst`), so the page just read is the page used.
  const tonight = tonightsCase(scope);
  const tier = (p: (typeof pool)[number]) => (p.weak ? 0 : 2) + (recorded.has(p) ? 0 : 1);
  // Inside the module each tier leads with the words taught most recently, as
  // every other module round does.
  const order = (items: typeof pool) =>
    scope ? byRecency(scope, shuffle(items), (p) => p.lemma) : shuffle(items);
  const shuffled = tonightFirst(
    [0, 1, 2, 3].flatMap((t) => order(pool.filter((p) => tier(p) === t))),
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
