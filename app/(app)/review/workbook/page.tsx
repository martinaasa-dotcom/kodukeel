import { localeFor, titleFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { courseLevelFor } from "@/lib/progress/level";
import { bandsAround } from "@/lib/collections/levels";
import { LEVELS } from "@/lib/collections/syllabus/index";
import { authoredFor } from "@/lib/dict/authored";
import { parseExamples, usableExamples } from "@/lib/dict/examples";
import { borrowedSentences, sentenceReach } from "@/lib/dict/facts";
import { plainerFirst } from "@/lib/dict/plainness";
import { VOUCHED_ROW } from "@/lib/dict/search";
import { caseByKey } from "@/lib/estonian/cases";
import { CASE_NOTES, grammarTopic } from "@/lib/estonian/grammar";
import { morphCodeOf } from "@/lib/estonian/morph";
import { PRONOUN_LEMMAS } from "@/lib/estonian/pronouns";
import { caseReviewsFor } from "@/lib/progress/cases";
import { caseAccuracy } from "@/lib/stats/history";
import { shuffle } from "@/lib/random/shuffle";
import { offered } from "@/lib/tutor/provider";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { dayOrdinal } from "@/lib/random/dayHash";
import { roundOf } from "@/lib/ux/again";
import {
  MIN_LINES, canFill, cardForLine, composeSheet, linesFor, parseTheme, themeOrder, whoFor,
  type ExercisePlan, type LineQuality, type SheetItem, type Theme,
} from "@/lib/games/workbook";
import { focusFrom } from "@/lib/course/focus";
import { byRecency, recentLemmas, sentenceWithin, slotWithin, tonightsCase } from "@/lib/course/scope";
import { moduleSpellings, practiceScope } from "@/lib/progress/moduleScope";
import { ButtonLink } from "@/components/Button";
import { Empty, Page } from "@/components/ui";
import { BeforeYouStart } from "@/components/round/Briefing";
import { WorkbookSession, type WorkbookExercise } from "./WorkbookSession";

export async function generateMetadata() {
  return titleFor("Töövihik");
}

export const dynamic = "force-dynamic";

/** The grammar reference's own topic for each verb theme. */
const VERB_TOPIC: Partial<Record<Theme, string>> = {
  present: "present-tense",
  past: "imperfect",
  conditional: "conditional",
  imperative: "imperative",
};

/*
  THE GRAMMAR BOX ABOVE THE EXERCISE.

  A course book puts the rule in a box over the page it drills, and the
  learner glances up at it while they work. This is that box, and it is the
  grammar reference's own two lines (`lib/estonian/grammar.ts`, which holds no
  Estonian and is already translated), read here so the sheet does not ship the
  whole reference to the browser. A mixed page and the pronoun page have no
  one rule behind them, so they get no box rather than a vague one.
*/
function ruleFor(theme: Theme): { summary: string; watchOut: string } | null {
  if (theme.startsWith("case:")) {
    const note = CASE_NOTES.find((n) => `case:${n.key}` === theme);
    return note ? { summary: note.summary, watchOut: note.watchOut } : null;
  }
  const id = VERB_TOPIC[theme];
  const topic = id ? grammarTopic(id) : undefined;
  return topic ? { summary: topic.summary, watchOut: topic.watchOut } : null;
}

/**
 * How many lines an exercise asks, not counting its worked example.
 *
 * A course book's page is two exercises of eight to sixteen lines, and that is
 * what a sitting walked to from Practice is: the first exercise on the theme
 * the learner most needs and a shorter second one on another. A beginner's
 * lines are fewer, because every line is a whole sentence to read.
 *
 * Inside the module the page is one exercise, because an evening is fifteen
 * minutes and a round in it is a few of them (`ROUND_MINUTES`). Eight lines
 * of a sentence each is about four, which is the longest a round in the
 * evening should be and still the whole of a course book's exercise.
 */
const FIRST: Record<string, number> = { A1: 6, A2: 8, B1: 10, B2: 10, C1: 10 };
const SECOND = 6;

/*
  WHICH KINDS OF EXERCISE A SITTING IS. A course book opens a point by having
  the learner pick the right form before they write it, and moves on from
  writing to choosing the word as well, so a sitting is two exercises of two
  kinds (`ExerciseKind` in `lib/games/workbook.ts`). A beginner picks first
  and writes second; everybody else writes first and then does the word box,
  which asks them to read each sentence for its meaning before its ending.
  Inside the module the page is one exercise and it is written, because that
  is the step the evening schedules.
*/
const SITTING: Record<string, readonly ["write" | "choose" | "box", "write" | "choose" | "box"]> = {
  A1: ["choose", "write"],
  A2: ["write", "box"],
  B1: ["write", "box"],
  B2: ["write", "box"],
  C1: ["write", "box"],
};
const IN_MODULE: Record<string, number> = { A1: 6, A2: 6, B1: 8, B2: 8, C1: 8 };

/**
 * How many of the learner's own words a page reads before choosing, and how
 * many it tops up from the dictionary at their level. Wide enough that a
 * theme has words to choose between, small enough that building every line
 * they could carry stays well under the time a page takes to render: a word
 * is about half a millisecond (`npm run measure:workbook`).
 */
const OWN_WORDS = 120;
const TOP_UP = 120;
/** How many more of the top-up a short lead theme reads at a time (see `leadShort`). */
const LEAD_CHUNK = 120;

/** A case below this, over the half-year the weakest-case panel reads, is worth a page. */
const WEAK_BELOW = 90;

/** How many themes the finish screen offers to switch to. */
const THEME_CHOICES = 8;

/**
 * TÖÖVIHIK: A COURSE BOOK'S EXERCISE, SET FOR THIS LEARNER.
 *
 * `lib/games/workbook.ts` is the page proper and says what a line may be.
 * This is the half that knows the learner, which is what makes the page
 * theirs rather than a course book's:
 *
 *   WHICH WORDS. Their own deck first, the cards they keep lapsing and the
 *   ones most overdue ahead of the rest, because a page is where a word that
 *   will not stick gets read eight times in eight sentences. Then the
 *   dictionary at their level, so a page is full on a thin deck. Inside the
 *   module, the words the evenings have taught and nothing else, tonight's
 *   first (`byRecency`).
 *
 *   WHICH THEME. What they asked for by name on the last page; tonight's
 *   case inside the module, since an evening that read the elative practises
 *   it; then their weakest cases off their own review log, weakest first;
 *   then the personal pronouns and the tenses. `preferredThemes` is the
 *   order and is unit tested; this hands it the facts.
 *
 *   WHAT MAY BE ASKED. Nothing the module has not shown: a case once its
 *   page has been read, a verb's part once the page or the evening that
 *   showed it, and a sentence made of taught spellings (`slotWithin`,
 *   `sentenceWithin`). At A1, outside the module, no case at all, which is the
 *   course's own rule for its first level (`lib/course/plan.ts`).
 *
 * EVERY LINE GRADES THE LEARNER'S OWN CARD FOR ITS WORD, where they hold one
 * (ADR-016), with the slot it asked, so the osastav of `tuba` lands in the
 * weakest-case figure beside the osastav asked on a card. A word topped up
 * from the dictionary writes nothing, as it does in every round.
 */
export default async function WorkbookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ownerId = await requireUserId();
  const params = await searchParams;
  const [level, scope, caseRows, clock] = await Promise.all([
    courseLevelFor(ownerId),
    practiceScope(ownerId, params),
    caseReviewsFor(ownerId),
    learnerDayClock(ownerId),
  ]);
  const opened = focusFrom(params) !== null;
  const requested = parseTheme(typeof params.theme === "string" ? params.theme : null);
  const taught = scope ? new Set(scope.lemmas) : null;

  /*
    AT A1, OUTSIDE THE MODULE, NO CASE. The course asks for none in its first
    level, and a page of endings is the reference handed to somebody who has
    just been told the language is impossible. Inside the module the case
    pages decide, through `slotWithin`, and none is read at A1.
  */
  const noCases = level === "A1" && !scope;
  const themeOk = (theme: Theme) => !(noCases && (theme.startsWith("case:") || theme === "pronouns"));

  const cardSelect = { id: true, lexemeId: true, cardType: true, targetCase: true, slot: true } as const;
  const [cards, topUp, spellings, borrowed, reach] = await Promise.all([
    prisma.card.findMany({
      where: {
        ownerId, suspended: false, lexemeId: { not: null },
        ...(taught ? { lexeme: { lemma: { in: [...taught] } } } : {}),
      },
      select: cardSelect,
      // The words that will not stick first, then the most overdue, because a
      // page is where a word is read in eight sentences. Ordered because cut.
      orderBy: [{ lapses: "desc" }, { due: "asc" }, { id: "asc" }],
      take: 2000,
    }),
    prisma.lexeme.findMany({
      where: {
        ...VOUCHED_ROW,
        pos: { in: ["NOUN", "ADJECTIVE", "VERB"] },
        cefr: { in: [...bandsAround(level)] },
        ...(taught ? { lemma: { in: scope ? recentLemmas(scope, 400) : [] } } : {}),
      },
      select: { id: true, lemma: true },
      // Ordered because it is cut; shuffled below so a second page is not the first.
      orderBy: { id: "asc" },
      take: 600,
    }),
    moduleSpellings(scope),
    borrowedSentences(),
    sentenceReach(),
  ]);

  /* The learner's own words, one entry each, in the order the cards came. */
  const cardsFor = new Map<string, typeof cards>();
  for (const card of cards) {
    if (!card.lexemeId) continue;
    cardsFor.set(card.lexemeId, [...(cardsFor.get(card.lexemeId) ?? []), card]);
  }
  const own = [...cardsFor.keys()];
  /*
    Which of their own words, and in what order. Inside the module, tonight's
    words first and working back (`byRecency`); outside it, the weakest and
    most overdue lead and the rest are shuffled, so "Another page" is another
    page rather than the same eight sentences.
  */
  const [ownRows, pronouns] = await Promise.all([
    own.length
      ? prisma.lexeme.findMany({ where: { id: { in: own } }, select: { id: true, lemma: true }, orderBy: { id: "asc" } })
      : Promise.resolve([]),
    // The six personal pronouns: what the pronoun page is made of, whatever the
    // deck holds, and what says whether a verb's sentence already names its
    // subject (`whoFor`), so all six are read even where the module has taught fewer.
    prisma.lexeme.findMany({
      where: { lemma: { in: PRONOUN_LEMMAS }, pos: "PRONOUN" },
      select: { id: true, lemma: true, forms: { select: { formType: true, morphCode: true, value: true }, orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    }),
  ]);
  const ownLemma = new Map(ownRows.map((r) => [r.id, r.lemma]));
  const ownOrdered = scope
    ? byRecency(scope, own, (id) => ownLemma.get(id))
    : [...own.slice(0, 20), ...shuffle(own.slice(20))];
  const ownSet = new Set(own);
  const candidateIds = [...new Set([
    ...ownOrdered.slice(0, OWN_WORDS),
    ...pronouns.filter((p) => !taught || taught.has(p.lemma)).map((p) => p.id),
    ...shuffle(topUp.filter((r) => !ownSet.has(r.id))).slice(0, TOP_UP).map((r) => r.id),
  ])];

  const lexemeSelect = {
    id: true, lemma: true, translation: true, pos: true, cefr: true, examples: true, semanticTypes: true,
    // Ordered for the reason the flash round gives: a parallel form has to
    // be the same one on every load, since one is the answer shown.
    forms: { select: { formType: true, value: true, morphCode: true }, orderBy: { id: "asc" } },
  } as const;
  const lexemesFor = (ids: readonly string[]) => (ids.length
    ? prisma.lexeme.findMany({ where: { id: { in: [...ids] } }, select: lexemeSelect, orderBy: { id: "asc" } })
    : Promise.resolve([]));

  const readable = sentenceWithin(scope, spellings);
  const gates = {
    slotOk: (slot: string, lemma: string) => !(noCases && caseByKey(slot)) && slotWithin(scope, slot, lemma),
    sentenceOk: readable,
    themeOk,
  };

  /*
    THE PLAINEST GOOD SENTENCE LEADS, AT THE LEARNER'S OWN BAND. Every line
    needs an English line and a finite verb, and of the sentences left the one
    a learner at this band can read most easily is cut first
    (`workbookSentences`).
  */
  const quality: LineQuality = { reach, limit: Math.max(0, (LEVELS as readonly string[]).indexOf(level)) };
  /*
    AND A BEGINNER'S WORDS CARRY THE SENTENCES WRITTEN FOR A BEGINNER. Ekilex
    records a usage for somebody who already reads Estonian, so at A1 and A2 a
    page cut from recorded sentences alone was short, and inside the module
    often empty: the evening's words sit in sentences made of words from
    further up the course. `lib/dict/authored.ts` holds sentences written for
    exactly this reader, each made of words taught by the evening the word
    arrives and read by a native speaker in the pull request that added it,
    and a line cut from one is marked against the dictionary's own forms like
    any other (ADR-005 amendment 4). Above A2 the recorded sentences are the
    reading a learner is ready for, so they alone are used.
  */
  const beginner = level === "A1" || level === "A2";
  const linesOf = (rows: Awaited<ReturnType<typeof lexemesFor>>, order: readonly string[]): SheetItem[] => {
    const byId = new Map(rows.map((l) => [l.id, l]));
    const out: SheetItem[] = [];
    for (const id of order) {
      const l = byId.get(id);
      if (!l) continue;
      out.push(...linesFor({
        lexemeId: l.id,
        lemma: l.lemma,
        translation: l.translation,
        pos: l.pos,
        semanticTypes: l.semanticTypes,
        forms: l.forms,
        // The word's own sentences, plainest first for a beginner's word, then
        // the ones lent from elsewhere in the dictionary (`lib/dict/borrow.ts`).
        examples: [
          ...(beginner ? authoredFor(l.lemma) : []),
          ...usableExamples(parseExamples(l.examples), plainerFirst(l.cefr, reach)),
          ...(borrowed.get(l.id) ?? []),
        ],
      }, gates, new Set(), quality));
    }
    return out;
  };
  const items: SheetItem[] = linesOf(await lexemesFor(candidateIds), candidateIds);

  const weakest = caseAccuracy(caseRows, 3).filter((c) => c.accuracy < WEAK_BELOW).map((c) => c.grammCase);
  /*
    THE TURN IS THE DAY AND THE ROUND. A new day starts the rest of the themes
    somewhere new, and "Another page" moves one on, so a learner whose cases
    are all doing well is not set the same two pages for ever (`themeOrder`).
    Inside the module the evening decides the page, not the calendar, so there
    only "Another page" moves it.
  */
  const round = roundOf({ get: (name) => (typeof params[name] === "string" ? (params[name] as string) : null) });
  const [firstKind, secondKind] = SITTING[level] ?? SITTING.B1!;
  const plans: ExercisePlan[] = opened
    ? [{ lines: IN_MODULE[level] ?? 8, kind: "write" }]
    : [{ lines: FIRST[level] ?? 10, kind: firstKind }, { lines: SECOND, kind: secondKind }];
  const { themes: prefer, urgent } = themeOrder({
    requested, tonight: tonightsCase(scope), weakest, themeOk, turn: (opened ? 0 : dayOrdinal(clock.dayKey())) + round,
    fills: (theme) => canFill(items, theme, plans[0]!.lines, plans[0]!.kind),
  });
  let sheet = composeSheet(items, prefer, plans, urgent);

  /*
    A PAGE ON THE CASE THEY NEED IS FILLED FROM FURTHER AFIELD. The first
    theme that leads for who the learner is (what they asked for, tonight's
    case, their weakest) is the page they most need, and a draw of a few
    hundred words often holds too few that can carry it: measured over the
    shipped dictionary, a third of sittings above A1 set the weakest case one
    or two lines short, and a case with fewer than four lines among the draw
    was not set at all. Where that happens the rest of the words the top-up
    read are tried, a chunk at a time, until it fills or they run out. Only
    then, since every word is a little under a millisecond of work.
  */
  const lead = prefer.slice(0, urgent)[0];
  const fill = plans[0]!.lines;
  const leadShort = () => {
    const first = sheet.exercises[0];
    return !first || first.theme !== lead || first.lines.length < fill;
  };
  if (lead && leadShort()) {
    const tried = new Set(candidateIds);
    const spare = shuffle(topUp.filter((r) => !tried.has(r.id))).map((r) => r.id);
    for (let at = 0; at < spare.length && leadShort(); at += LEAD_CHUNK) {
      const chunk = spare.slice(at, at + LEAD_CHUNK);
      const more = linesOf(await lexemesFor(chunk), chunk).filter((i) => i.themes.includes(lead));
      if (more.length === 0) continue;
      items.push(...more);
      sheet = composeSheet(items, prefer, plans, urgent);
    }
  }

  if (sheet.exercises.length === 0) {
    const locale = await localeFor(ownerId);
    return (
      <Page title="Töövihik" lead={tr(locale, "A course book's exercise, set from your own words.")}>
        <Empty
          title={tr(locale, "No page to set yet")}
          body={tr(locale, "It needs words you've met with real sentences behind them. Meet a few more and come back.")}
          action={<ButtonLink href="/learn" variant="primary">{tr(locale, "Open the learning path")}</ButtonLink>}
        />
      </Page>
    );
  }

  /* Each personal pronoun's subject spellings as stored, `mina` beside `ma`. */
  const nominatives = new Map(pronouns.map((p) => [
    p.lemma,
    p.forms.filter((f) => ["SgN", "PlN", "NOM_SG", "NOM_PL"].includes(morphCodeOf(f) ?? "")).map((f) => f.value),
  ]));
  const withWho = <T extends SheetItem>(line: T): T => ({ ...line, who: whoFor(line, nominatives) });
  const exercises: WorkbookExercise[] = sheet.exercises.map((exercise) => ({
    kind: exercise.kind,
    box: exercise.box,
    theme: exercise.theme,
    rule: ruleFor(exercise.theme),
    example: exercise.example ? withWho(exercise.example) : null,
    lines: exercise.lines.map((line) => withWho({ ...line, cardId: cardForLine(cardsFor.get(line.lexemeId) ?? [], line.slot) })),
  }));

  /*
    The themes the finish screen can switch to: every one this learner's
    words can fill a page of today, in the order they are worth trying, so a
    chip never opens an empty page.
  */
  const fillable = prefer.filter((theme) => {
    const pool = items.filter((i) => i.themes.includes(theme));
    const count = new Set(pool.map((i) => (theme === "pronouns" ? i.id : i.lexemeId))).size;
    return count >= MIN_LINES + 1;
  });
  const lineCount = exercises.reduce((n, e) => n + e.lines.length, 0);

  return (
    <BeforeYouStart id="workbook" ready count={{ n: lineCount, noun: "sentence" }}>
      <WorkbookSession
        exercises={exercises}
        missed={requested && !exercises.some((e) => e.theme === requested) ? requested : null}
        themes={fillable.slice(0, THEME_CHOICES)}
        canTranslate={offered("translate")}
      />
    </BeforeYouStart>
  );
}
