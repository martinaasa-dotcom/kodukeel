import { meaningPrefsFrom } from "@/lib/collections/glossLanguage";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { nextCardLine } from "@/lib/time/day";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { unitById } from "@/lib/collections/syllabus";
import { MAX_ITEMS as MAX_SCAN_ITEMS } from "@/lib/scan/extract";
import { parseItems } from "@/lib/scan/items";
import { readSettings, reviewModeFrom, SETTING_KEYS } from "@/lib/settings/store";
import { ReviewSession } from "./ReviewSession";
import { BeforeYouStart } from "@/components/round/Briefing";
import { moduleScopeFrom } from "@/lib/course/scope";
import { meetingFirst, notOnLadder, pastTheLadder } from "@/lib/srs/reviewQueue";
import { include, withChoices } from "./cards";
import { reviewQueue } from "./queue";
import { firstParams } from "@/lib/ux/queryParam";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export async function generateMetadata() {
  return { title: tr(await localeFor(await requireUserId()), "Review") };
}

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
    THE MODULE'S CLOSING ROUND IS TONIGHT'S WORDS. This screen trickles new
    cards in beside what is due, which is right for somebody who opened it
    themselves and wrong for the last step of a planned evening, which is a
    quick review of the batch that evening taught and nothing else. Opened from
    the module (`lib/course/scope.ts`) it asks tonight's own words once more
    and introduces nothing; see `tonightWhere`.
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

    AND WHAT IS DUE IS HELD TOO, which reverses what this paragraph used to
    say. "What is due is due whatever taught it" let an old deck ask a
    beginner on the second evening of A1 for `tool` in the alaleütlev, and the
    operator's call is that review only ever repeats what the module has
    taught: a card it has not reached keeps its schedule and waits for the
    evening that teaches it. See `reviewable` in lib/course/scope.ts.

    The word is gated only over the app's own material. A word somebody looked
    up, photographed or pasted in is theirs, and refusing it would be the gate
    deciding something nobody asked it to. The form is gated on every card,
    theirs included: a case nobody has read is new information whoever chose
    the word. `APP_CHOSE`
    rather than the complement of `YOUR_OWN_SOURCES`, for the reason written
    beside it: `DICTIONARY` is a column that cannot say whose idea a word was,
    and the cost of guessing wrong here is a word never taught.
  */
  const now = new Date();

  // Started here and awaited where it is read, so the one settings row rides
  // beside the deck reads below rather than in front of them. On a hosted
  // database that is a round trip off the daily path.
  const settingsPromise = readSettings(ownerId, [
    SETTING_KEYS.reviewMode, SETTING_KEYS.glossLanguage, SETTING_KEYS.glossAlso,
  ]);
  const modeChosen = async () => reviewModeFrom((await settingsPromise)[SETTING_KEYS.reviewMode]);
  /*
    Which language a meaning leads in, on every card rather than on the first
    meeting alone, and what follows it. One read for the whole render:
    `readSettings` is memoised per request, so asking for these keys here costs
    the same round trip the review mode already made.
  */
  const glossChosen = async () => {
    const settings = await settingsPromise;
    return meaningPrefsFrom(settings[SETTING_KEYS.glossLanguage], settings[SETTING_KEYS.glossAlso]);
  };


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
        // Ends on the id, as the unit drill below does: a word's cards share
        // `lapses` and `due`, so which of them make the thirty was the plan's.
        orderBy: [{ lapses: "desc" }, { due: "asc" }, { id: "asc" }],
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

  /*
    THE SITTING IS `./queue.ts`'s, which Today and Practice count too, so the
    number on the button that brought somebody here is the number of cards
    they are about to be asked. See that file's header for what two readings
    of one queue cost. Due first, then a capped trickle of new cards: uncapped
    new cards is the classic way an SRS becomes an unsustainable workload
    three weeks in.
  */
  const [queue, totalCards, mode, gloss] = await Promise.all([
    reviewQueue(ownerId, scope, now),
    prisma.card.count({ where: { ownerId } }),
    modeChosen(),
    glossChosen(),
  ]);
  const taught = queue.taught;
  const cards = await withChoices(queue.cards, gloss, ownerId, scope?.lemmas ?? null);

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
    reached is not caught up, they are ahead of today's evening, and sending
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
    <BeforeYouStart id={scope ? "closing" : "review"} ready={cards.length > 0} count={{ n: cards.length, noun: "card" }}>
        <ReviewSession
        cards={cards}
        totalCards={totalCards}
        mode={mode}
        nextDue={next && clock ? nextCardLine(next.due, now, clock, await localeFor(ownerId)) : null}
        waitingOnCourse={unseenAnywhere > 0}
      />
    </BeforeYouStart>
  );
}
