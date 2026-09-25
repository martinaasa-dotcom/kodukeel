import { glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { nextCardLine } from "@/lib/time/day";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { aroundFirst, bandsAround, isAround } from "@/lib/collections/levels";
import { offeredBand } from "@/lib/srs/defer";
import { hardWords } from "@/lib/dict/facts";
import { commonFirst } from "@/lib/collections/commonFirst";
import { unitById, type Level } from "@/lib/collections/syllabus";
import { MAX_ITEMS as MAX_SCAN_ITEMS } from "@/lib/scan/extract";
import { parseItems } from "@/lib/scan/items";
import { inTeachingOrder } from "@/lib/srs/cards";
import { spaceSiblings } from "@/lib/srs/queue";
import { readSettings, reviewModeFrom, SETTING_KEYS } from "@/lib/settings/store";
import { ReviewSession } from "./ReviewSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { cardWithin, moduleScopeFrom } from "@/lib/course/scope";
import { learnerModuleScope, moduleSpellings } from "@/lib/progress/moduleScope";
import { isAppsChoice } from "@/lib/srs/sources";
import {
  MAX_SESSION, NEW_CANDIDATES, dueWhere, meetingFirst, notOnLadder, pastTheLadder, roomFor,
  unseenWhere,
} from "@/lib/srs/reviewQueue";
import { include, withChoices, type CardRow } from "./cards";
import { firstParams } from "@/lib/ux/queryParam";

export const metadata = { title: "Review" };

export const dynamic = "force-dynamic";

/*
  THE SHAPE OF A SITTING IS `lib/srs/reviewQueue.ts`'s, because the planned
  module's closing step has to know how many cards this screen is going to
  offer before anybody opens it. See that file's header for what two readings
  of one number cost.
*/

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string | string[]; unit?: string | string[]; scan?: string | string[]; module?: string | string[] }>;
}) {
  const ownerId = await requireUserId();
  const params = firstParams(await searchParams);
  const { case: targetCase, unit: unitId, scan: scanId } = params;
  /*
    THE MODULE'S CLOSING ROUND INTRODUCES NOTHING THE MODULE HAS NOT TAUGHT.
    This screen trickles new cards in beside what is due, which is right for
    somebody who opened it themselves and wrong for the last step of a planned
    evening: first run builds a starter deck of four units, so the closing
    round of the first evening was meeting a beginner with words from unit
    four. Opened from the module (`lib/course/scope.ts`) the new-card window is
    the words the ladder has taught, and what is due is due whatever taught it.
  */
  const scope = moduleScopeFrom(params);
  /*
    AND THE DAILY PATH IS HELD TO THE MODULE TOO, WHICH IS WHAT NOBODY HAD
    WRITTEN DOWN.

    The rule above is about a screen the module opened, which the address can
    say. This screen is opened from Today, from the rail and from a card
    reading "6 due", and it teaches: the trickle of unseen cards beside what is
    due is the app choosing the next thing somebody meets. Held to nothing, it
    chose `Olen ______ nõus.` for a learner on the second evening of A1 — a gap
    whose sentence holds two words the course had not reached, on a word whose
    own unit had refused gap-fills outright. It was reported from exactly
    there, and the operator's call is written down here so it is not
    re-litigated: the planned module is the record of what somebody has been
    taught, and nothing is introduced on the daily path ahead of it.

    WHAT IS DUE IS STILL DUE WHATEVER TAUGHT IT. A card already answered has a
    schedule, FSRS decides when it comes back, and holding one out because the
    module has not caught up would be this app overwriting a schedule it
    presents as the scheduler's. Only the new cards are gated, because only a
    new card is the app teaching something.

    And only over the app's own material. A word somebody looked up,
    photographed or pasted in is theirs, and refusing to teach a word they went
    and got would be the gate deciding something nobody asked it to. `APP_CHOSE`
    rather than the complement of `YOUR_OWN_SOURCES`, for the reason written
    beside it: `DICTIONARY` is a column that cannot say whose idea a word was,
    and the cost of guessing wrong here is a word never taught.
  */
  /*
    STARTED HERE AND AWAITED BELOW, because resolving it is two reads deep and
    the biggest query on this page does not depend on it. `moduleReached` asks
    the settings row and the level, and only then the ticks, so awaiting it
    outright put two sequential round trips in front of the due list on the one
    page whose daily job is to open fast. In flight beside the due read it
    costs the page one round trip rather than two.
  */
  const taughtPromise = scope ? Promise.resolve(scope) : learnerModuleScope(ownerId);
  const theirOwnToo = scope === null;
  const now = new Date();

  // Started here and awaited where it is read, so the one settings row rides
  // beside the deck reads below rather than in front of them. On a hosted
  // database that is a round trip off the daily path.
  const settingsPromise = readSettings(ownerId, [
    SETTING_KEYS.reviewMode, SETTING_KEYS.glossLanguage,
  ]);
  const modeChosen = async () => reviewModeFrom((await settingsPromise)[SETTING_KEYS.reviewMode]);
  /*
    Which language a first meeting gives the meaning in. One read for the whole
    render: `readSettings` is memoised per request, so asking for both keys here
    costs the same round trip the review mode already made.
  */
  const glossChosen = async () =>
    glossLanguageFrom((await settingsPromise)[SETTING_KEYS.glossLanguage]);


  // A drill ignores scheduling: the point is to attack one weakness — a case the
  // heatmap found, or the unit just added — not to review whatever is due.
  // ReviewSession decides for itself, once, whether an empty pool means "show
  // the empty state" — never the server on a later grade-triggered refresh.
  // See app/review/sprint/ and app/review/listening/ for the same pattern,
  // and the shared reasoning in ReviewSession.tsx.
  if (targetCase) {
    const [drill, gloss] = await Promise.all([
      prisma.card.findMany({
        where: { ownerId, suspended: false, targetCase, ...notOnLadder(ownerId) },
        orderBy: [{ lapses: "desc" }, { due: "asc" }],
        take: 30,
        include,
      }),
      glossChosen(),
    ]);
    return (
      <BeforeYouStart id="review" ready={drill.length > 0} count={{ n: drill.length, noun: "card" }}>
        <ReviewSession
          cards={await withChoices(drill, gloss, ownerId)}
          drillCase={targetCase}
          totalCards={0}
          mode={await modeChosen()}
        />
      </BeforeYouStart>
    );
  }

  if (unitId) {
    const unit = unitById(unitId);
    const drill = unit
      ? await prisma.card.findMany({
          where: {
            ownerId, suspended: false,
            lexeme: { lemma: { in: [...unit.lemmas] } },
            ...notOnLadder(ownerId),
          },
          // The id last, for the reason the due read below gives: a word's
          // cards share a `due` and usually a `lapses` too, so the cut is the
          // plan's choice without it.
          orderBy: [{ due: "asc" }, { lapses: "desc" }, { id: "asc" }],
          take: 40,
          include,
        })
      : [];
    const gloss = await glossChosen();
    return (
      <BeforeYouStart id="review" ready={drill.length > 0} count={{ n: drill.length, noun: "card" }}>
        <ReviewSession
          cards={await withChoices(drill, gloss, ownerId)}
          drillUnit={unitId}
          totalCards={0}
          mode={await modeChosen()}
        />
      </BeforeYouStart>
    );
  }

  /*
    A photographed page, drilled on its own.

    Read by lexeme id rather than by lemma, unlike the unit drill above: a page
    can carry a word the learner added themselves, and matching those by lemma
    would sweep in a homograph that belongs to a different part of speech. The
    page is looked up scoped to its owner, so a guessed id in the query string
    reaches nothing.
  */
  if (scanId) {
    const scan = await prisma.scan.findFirst({
      where: { id: scanId, ownerId },
      select: { id: true, title: true, items: true },
    });
    const lexemeIds = scan
      ? parseItems(scan.items, MAX_SCAN_ITEMS)
          .map((i) => i.lexemeId)
          .filter((id): id is string => id !== null)
      : [];
    const drill = lexemeIds.length
      ? await prisma.card.findMany({
          where: { ownerId, suspended: false, lexemeId: { in: lexemeIds }, ...meetingFirst(ownerId) },
          orderBy: [{ due: "asc" }, { lapses: "desc" }, { id: "asc" }],
          take: 60,
          include,
        })
      : [];
    const gloss = await glossChosen();
    return (
      <BeforeYouStart id="review" ready={drill.length > 0} count={{ n: drill.length, noun: "card" }}>
        <ReviewSession
          cards={await withChoices(drill, gloss, ownerId)}
          drillScan={scan ? { id: scan.id, title: scan.title } : { id: scanId, title: "A page" }}
          totalCards={0}
          mode={await modeChosen()}
        />
      </BeforeYouStart>
    );
  }

  // Due first, then a capped trickle of new cards. Uncapped new cards is the
  // classic way an SRS becomes an unsustainable workload three weeks in.
  /*
    THREE READS THAT DO NOT NEED EACH OTHER'S ANSWERS, SO THEY ARE ONE ROUND.

    The new-card query used to wait for the due one, because its `take` is what
    is left of the session after the due cards have filled it. That is a whole
    round trip spent on an arithmetic that at most drops a few rows: at most ten
    new cards are shown either way, so the honest version reads a window and
    keeps as many as there is room for. One page of rows is less than the trip
    costs on any hosted database, and the deck size below never depended on
    either. The level read is the fourth because `atLevelFirst` needs it and
    neither of the queries does.
  */
  const [taught, due, totalCards, level, mode] = await Promise.all([
    taughtPromise,
    prisma.card.findMany({
      // What is due, and the one thing that is due and may not be asked here:
      // see `dueWhere`, which the module's own closing count reads too.
      where: dueWhere(ownerId, now),
      /*
        The id settles a tie, which `lib/progress/learn.ts` already does on the
        same table for the reason given there: a word's cards are written in
        one insert and share a `due` to the millisecond, so date alone leaves
        the cut to the query plan and which cards a learner is asked can differ
        between two loads of one deck. Free, since the sort was happening
        anyway, and the same move `bySubstance` makes in lib/dict/search.ts.
      */
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take: MAX_SESSION,
      include,
    }),
    prisma.card.count({ where: { ownerId } }),
    courseLevelFor(ownerId),
    modeChosen(),
  ]);

  /*
    AND THE UNSEEN WINDOW AFTER THEM, because it is the one read on this page
    that needs the module's answer: which words may be introduced is what it is
    narrowed by. It used to ride beside the due read, and that round trip is
    the price of the gate rather than an oversight. Everything else still goes
    in one round, and the due list — which is most of a session — no longer
    waits on the standing at all.
  */
  // Ordered by lexeme as well as by date so a word's cards stay together:
  // they share one `createdAt`, so date alone leaves them tied and the take
  // can interleave two words. `inTeachingOrder` then settles the order
  // *within* a word, which is what stops a conjugation card being somebody's
  // first sight of a verb.
  const [freshPool, spellings] = await Promise.all([prisma.card.findMany({
    // Only a word the module has taught, and on the daily path the learner's
    // own words beside it: see `unseenWhere`, which the module's own closing
    // count reads too, and which keeps `pastTheLadder` under `AND` so a
    // second `OR` spread beside it cannot delete the first.
    where: unseenWhere(ownerId, now, taught?.lemmas ?? null, theirOwnToo),
    // And the id here too: a word's cards tie on both of these, which is the
    // very thing the comment above says they do.
    orderBy: [{ createdAt: "asc" }, { lexemeId: "asc" }, { id: "asc" }],
    take: NEW_CANDIDATES,
    include,
  }), moduleSpellings(taught)]);

  /*
    A CARD NEVER ANSWERS THE CARD BEFORE IT.

    `addCardsFor` writes a word's cards in one go, they are graded in one
    session, and they come back with almost the same `due`, so a queue ordered
    by `due` puts them side by side: measured on the demo deck, 13 of 32 due
    cards sat next to a card of the same word and seven case cards of `Eesti`
    ran consecutively. Answering `Eesti → millesse? kuhu?` straight after
    `Eesti → milles? kus?` is reading the answer off the card before, and the
    log records it as a recall either way, so the scheduler raises the interval
    on a memory nothing tested. See lib/srs/queue.ts.

    Only the due list. New cards keep `inTeachingOrder`, which deliberately
    puts a word's cards together and in the order a lesson teaches them,
    because a first meeting is a teaching screen rather than a retrieval.
  */
  /*
    AND A CARD ABOUT A CASE NOBODY HAS READ, OR A GAP IN A SENTENCE OF WORDS
    NOBODY HAS TAUGHT, WAITS FOR THE EVENING THAT TEACHES IT. A word's cards
    are built together, so a deck holding a taught word can hold its case
    cards before the case page has been read; inside the module those are
    left in the queue for standalone review and the module's own round asks
    what the module has taught (`cardWithin`).
  */
  const within = (card: CardRow) => cardWithin(scope, card, spellings);
  /*
    The same question asked of a card about to be introduced. `within` is the
    module's own round and reaches the due list as well; this one reaches the
    new cards alone and is what the daily path is held to.
  */
  const introducible = (card: CardRow) =>
    (theirOwnToo && !isAppsChoice(card.source)) || cardWithin(taught, card, spellings);
  const dueWithin = due.filter(within);
  const spaced = spaceSiblings(dueWithin, (card) => card.lexemeId);

  /*
    ROOM IS MEASURED AGAINST WHAT THE SITTING WILL SHOW, not against what was
    read. Inside a module the two differ by every card `cardWithin` refuses,
    and read the old way a deck with sixty cards due, all of them about a case
    tonight has not read, left no room for a single new word and handed the
    learner an empty closing round they could never finish. See `roomFor`.

    `dueWithin` rather than `spaced`, which is the same number: `spaceSiblings`
    moves a card and never drops one. It is written as the filtered list so
    that this line and `lib/progress/closing.ts`, which counts what this round
    will show before anybody opens it, are the same expression rather than two
    that happen to agree.
  */
  const room = roomFor(dueWithin.length);
  const [unseen, raised] = await Promise.all([
    inBandPool(ownerId, freshPool, level, room, taught?.lemmas ?? null, theirOwnToo),
    hardWords(),
  ]);
  const fresh = atLevelFirst(unseen.filter(introducible), level, raised).slice(0, room);
  const gloss = await glossChosen();
  const cards = await withChoices([...spaced, ...inTeachingOrder(fresh)], gloss, ownerId, scope?.lemmas ?? null);

  /*
    WHEN THE NEXT CARD COMES BACK, WHICH IS THE ONLY QUESTION AN EMPTY QUEUE
    RAISES.

    The caught-up screen said "All 312 cards are scheduled for later", which is
    the count somebody already knows and not the thing they came to find out.
    `docs/18-voice.md` uses this exact screen as its worked example and the
    answer it gives is a date.

    Asked only on the path where it is going to be shown, and that is the
    point rather than a saving: this is one more round trip on a page whose
    daily job is to open fast, and on the day there is something to review it
    would answer a question nobody is asking.
  */
  const caughtUp = cards.length === 0 && totalCards > 0;
  /*
    AND WHY THERE IS NOTHING, WHICH IS NOT ALWAYS THE CLOCK.

    "Nothing due, you're caught up" over a date is the right answer when the
    scheduler is what is holding everything, and the wrong one the moment the
    module is: a learner whose deck holds unseen words the course has not
    reached is not caught up, they are ahead of tonight's evening, and sending
    them to Learn instead would hand them a round that is held back for the
    same reason. One count, on the caught-up path alone, beside the two reads
    that were already there.
  */
  const [next, clock, unseenAnywhere] = caughtUp
    ? await Promise.all([
        prisma.card.findFirst({
          where: { ownerId, suspended: false, due: { gt: now } },
          orderBy: [{ due: "asc" }, { id: "asc" }],
          select: { due: true },
        }),
        learnerDayClock(ownerId),
        taught
          ? prisma.card.count({
              where: {
                ownerId, suspended: false, state: 0, due: { lte: now },
                ...pastTheLadder(ownerId),
              },
            })
          : Promise.resolve(0),
      ])
    : [null, null, 0];

  return (
    <BeforeYouStart id="review" ready={cards.length > 0} count={{ n: cards.length, noun: "card" }}>
        <ReviewSession
        cards={cards}
        totalCards={totalCards}
        mode={mode}
        nextDue={next && clock ? nextCardLine(next.due, now, clock) : null}
        waitingOnCourse={unseenAnywhere > 0}
      />
    </BeforeYouStart>
  );
}


/**
 * The window of unseen cards, widened when none of it is anywhere near the
 * learner's level.
 *
 * `atLevelFirst` orders the window and never drops from it, which is right, and
 * it can only order what it was given. The window is the sixty oldest unseen
 * cards, and age is a fact about when a card was added rather than about who is
 * being taught: a learner placed at A1 by a check that got them wrong, or one
 * who started at A1 a year ago, has a backlog of unseen beginner cards, and the
 * B1 unit they added last week sits behind all of it. Ordering sixty A1 cards
 * by how near A1 they are cannot help. That is the shape of the report this
 * fixes: an A2 or B1 learner being asked about `Tere`.
 *
 * So when the window turns out to hold nothing in band, one more query asks for
 * the same thing filtered to the bands around the learner. It costs a round
 * trip and it costs it only for the learner this hurts: a deck whose oldest
 * unseen cards are already in band, which is everybody set up at their own
 * level, never reaches the second read. Returning the original window when the
 * filtered one is empty is what keeps a level an ordering rather than a gate:
 * a learner with nothing in band still gets taught something.
 *
 * The card's own bands come from `lib/collections/levels.ts`, one either side,
 * and an untagged word counts as in band there, so a word somebody typed in or
 * photographed is never what sends this to a second query.
 */
async function inBandPool(
  ownerId: string, window: CardRow[], level: Level, room: number,
  /** The module's own taught list, so the wider read stays inside it too. */
  only: readonly string[] | null = null,
  /** And the learner's own words beside it, on the daily path. See above. */
  theirOwnToo = false,
): Promise<CardRow[]> {
  if (room === 0) return window;
  if (window.some((c) => isAround(c.lexeme?.cefr, level))) return window;

  const inBand = await prisma.card.findMany({
    where: {
      // The same window the read above asks for, and the band on top of it.
      // `unseenWhere` keeps the lemma filter under `AND`, so the `lexeme` key
      // here is free to carry the band without deleting it.
      ...unseenWhere(ownerId, new Date(), only, theirOwnToo),
      lexeme: { cefr: { in: [...bandsAround(level)] } },
    },
    orderBy: [{ createdAt: "asc" }, { lexemeId: "asc" }],
    take: NEW_CANDIDATES,
    include,
  });
  return inBand.length > 0 ? inBand : window;
}

/**
 * New words around the learner's level first, and the commonest of those
 * ahead of the rest.
 *
 * The one place a level can honestly reach the daily loop. What is *due* is
 * decided by FSRS and may not be reordered by anything: a card comes back when
 * the scheduler says, whatever band it is in, or the schedule is not a
 * schedule. What has never been seen has no schedule yet, and choosing which
 * of those to teach next is exactly the judgment a level is for.
 *
 * `aroundFirst` orders and never drops, and a word the learner typed in,
 * pasted or photographed carries no band at all and counts as at level, since
 * they went to the trouble of putting it there. Both of those are
 * `lib/collections/levels.ts`, which is where they can be tested.
 *
 * THE BAND IS THE OUTER ORDERING AND THE CORPUS IS THE INNER ONE, which is
 * what composing the two stable partitions in this order gets: `commonFirst`
 * runs first and `aroundFirst` runs over its answer, so a word out of band
 * never leads on the strength of being common, and inside a band the words the
 * corpus counts most lead the ones it has never heard of. Until now the tie
 * inside a band was `createdAt`, which is when a card happened to be written:
 * a deck holding a unit, a photographed handout and an afternoon of looking
 * things up taught them in assembly order, and `ja` and `aga` waited behind
 * whatever went in first. The measurement was already in the repository and
 * reached two browsing screens and not the queue.
 *
 * It is a partition rather than a rank for the reason `commonFirst` gives at
 * length, which is that a noun and a verb are counted differently and cannot
 * be ranked against each other.
 */
function atLevelFirst(
  cards: readonly CardRow[], level: Level, raised: ReadonlySet<string>,
): CardRow[] {
  /*
    THE BAND THIS DEPLOYMENT OFFERS THE WORD AT, NOT THE ONE IT RECORDS.

    A word enough learners have put aside is offered one band later, for
    everybody, which is the one lever that changes who meets it and when
    (`lib/srs/defer.ts`). Nothing is written to `Lexeme`: the entry still shows
    the band the Institute recorded, and what moved is the order words are
    taught in, which is derived on every read like every other ordering here.
  */
  const offered = (c: CardRow) =>
    offeredBand(c.lexeme?.cefr ?? null, c.lexemeId !== null && raised.has(c.lexemeId));
  return aroundFirst(commonFirst(cards, (c) => c.lexeme?.lemma), level, offered);
}



