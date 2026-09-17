import { prisma } from "@/lib/db";
import { plainPhrase } from "@/lib/copy/values";
import { equivalentIn, type GlossLanguage } from "@/lib/collections/glossLanguage";
import { challengeFirst } from "@/lib/collections/levels";
import { hardWords } from "@/lib/dict/facts";
import { deferredWordIds } from "@/lib/progress/deferrals";
import { offeredBand } from "@/lib/srs/defer";
import type { Level } from "@/lib/collections/syllabus";
import { unitIntroducing } from "@/lib/collections/syllabus";
import { decoyOptions } from "@/lib/dict/facts";
import { starredAmong } from "@/lib/progress/stars";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import { wordGlossFrom } from "@/lib/ux/wordGloss";
import { parseExamples, teachingSentence, usableExamples } from "@/lib/dict/examples";
import { glossSentences, type GlossedToken } from "@/lib/dict/glossed";
import { isPhrase } from "@/lib/dict/pos";
import { resolveProvider } from "@/lib/tutor/provider";
import { buildCloze, mentions, nominalOpener } from "@/lib/estonian/cloze";
import { readableFor } from "@/lib/collections/levels";
import { gapForms } from "@/lib/estonian/gapForms";
import { explainForm, type WordRow } from "@/lib/assessment/items";
import {
  LADDER_CARD_TYPE, LEARN_BATCH, orderByRung, rungOf, type Rung,
} from "@/lib/learn/ladder";
import {
  bandOf, differentMeaning, glossNearness, glossOption, pickOptions,
} from "@/lib/questions/distractors";

/**
 * READING A BATCH OF WORDS FOR THE LEARN LADDER.
 *
 * `lib/learn/ladder.ts` is the rule and holds no database; this is the half
 * that asks one. It is here rather than beside the rule for the reason every
 * pure layer in this app gives about itself: those modules are unit tested
 * without a framework, and one `import { prisma }` inside a directory four
 * hundred tests read puts a database behind all of them.
 *
 * WHAT A WORD IS, HERE. The ladder works on the word rather than on the card,
 * and the card it grades is the word's **recognition** card. That is not a
 * convenience. Every rung asks one question, "do you know this word", at a
 * harder depth each time, and the recognition card is the one row in the deck
 * that stands for exactly that. Its other cards, the production card, the case
 * cards, the gap cards, are drills on a word you already know, which is what
 * Practice is for: a word leaves here the moment its recognition card
 * graduates, and everything else about it is asked over there.
 */

/**
 * How many unseen words are read before five of them are chosen.
 *
 * A deck is filled a unit, a level or a photographed handout at a time, and a
 * whole level arrives at one `createdAt` spanning every band the dictionary
 * has. Taking the five oldest would hand a B1 learner whatever the insert
 * happened to order first, which is the same fault the review queue's own
 * window was widened for. Sixty is one page of rows and gives the level
 * something to choose between.
 */
const NEW_CANDIDATES = 60;

/** Four options, one of them right. The same number every other picked question uses. */
const CHOICES = 4;

/**
 * What the recognition card and its word carry into a session.
 *
 * `forms` is the reason this is a `select` rather than a bare relation: the gap
 * rung blanks a real form out of a real sentence, and a word read without its
 * principal parts can only ever be gapped on the spelling that happens to be
 * its headword.
 */
const INCLUDE = {
  lexeme: {
    select: {
      id: true, lemma: true, translation: true, pos: true, examples: true, cefr: true,
      translationRu: true, translationUk: true,
      forms: { select: { formType: true, value: true, morphCode: true } },
    },
  },
} as const;

type LearnRow = Awaited<ReturnType<typeof prisma.card.findMany>>[number] & {
  lexeme: {
    id: string; lemma: string; translation: string; pos: string; examples: string;
    cefr: string | null; translationRu: string | null; translationUk: string | null;
    forms: { formType: string; value: string; morphCode: string | null }[];
  } | null;
};

/** The scheduling fields a session needs to work out a rung without the server. */
export interface LearnScheduling {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
  learningSteps: number;
}

export interface LearnWord {
  /** The recognition card. Every rung of the ladder grades this one row. */
  cardId: string;
  lexemeId: string;
  lemma: string;
  gloss: string;
  /** The Institute's own equivalent in the learner's chosen language, or null. */
  equivalent: { text: string; lang: string } | null;
  /** A whole utterance rather than a word: `Tere!` has no example and never will. */
  isPhrase: boolean;
  /** An attested sentence, and which form of the word it carries. */
  sentence: { et: string; en: string | null; form: string | null } | null;
  /**
   * That sentence with the dictionary under every word it will vouch for.
   *
   * The meet rung is the one screen whose whole job is a word doing something,
   * and Ekilex records no English for most usages, so it was a line of Estonian
   * a beginner could read one word of. Null where the batch did not look. See
   * `lib/dict/glossed.ts`.
   */
  tokens: GlossedToken[] | null;
  /** Whether this deployment has a model to ask for the whole line in English. */
  canTranslate: boolean;
  /**
   * The same sentence with the word taken out of it.
   *
   * Null where the dictionary holds no sentence a gap can be built from, and
   * the session falls back to asking for the word from its meaning. Nothing
   * here is written: `buildCloze` hides a form a lexicographer wrote, which is
   * the one thing this app may do to an Estonian sentence.
   */
  gap: {
    text: string;
    answer: string;
    full: string;
    en: string | null;
    /**
     * Which word the gap wants, without saying which spelling.
     *
     * The rung before this one asked what the word means, so the gap is about
     * the *form*, and a gap with no cue at all is a memory test of which of
     * five words this sentence belonged to. The fallback is the review card's
     * own, for its reason: the lemma and the meaning, then the meaning alone,
     * then nothing, because wherever the gap wants the dictionary form the
     * lemma would be the answer printed a line under the question, and a word
     * spelled the same in both languages puts it in the English too.
     */
    hint: string | null;
    /**
     * Why the answer is not simply the lemma, in the same one line the
     * writing exercise already gives (`explainGap`): the form, named where a
     * name applies, cross-referenced rather than led with. Null where the
     * gap's answer is the lemma unchanged, since there is nothing to explain.
     *
     * A learner meeting `poeg` for the first time and asked to retype `poega`
     * a lap later has seen the form exactly once, in passing, with no reason
     * given for why it changed. The retrieval is still the point (Karpicke
     * and Roediger, cited above `sentenceAndGap`), so this is not asked
     * before the answer; it is what the miss deserves instead of only "the
     * word is poega" and a retype box, which teaches copying rather than the
     * pattern.
     */
    explanation: string | null;
  } | null;
  /** Four glosses, one of them right, ranked rather than shuffled. */
  choices: string[] | null;
  /** Whether this word is already one of the learner's favorites. */
  starred: boolean;
  rung: Rung;
  scheduling: LearnScheduling;
}

function schedulingOf(card: LearnRow): LearnScheduling {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.lastReview?.toISOString() ?? null,
    learningSteps: card.learningSteps,
  };
}

/**
 * The sentence a word is taught with, and the gap made out of that same
 * sentence, in the very form the meet rung showed.
 *
 * One sentence for both rungs, and one form. A learner read `Ma joon kohvi`
 * five cards ago and is now asked to put `kohvi` back into it, which is the
 * strongest link this app can make between meeting a word and producing one.
 *
 * This used to fall back, when the taught sentence could not carry a gap, to
 * *any other attested sentence for the word*, cut wherever any form the word
 * takes turned up (`gapForms`'s whole catalog: every case, every person). A
 * word met in its bare lemma could then be gapped from an unrelated sentence
 * in a form nobody had shown: `sõber` taught as the lemma and asked back as
 * `sõbrad`, the plural, which nothing on the meet screen or anywhere earlier
 * in the ladder had taught. A gap that asks for a form the learner has not
 * met is not the second rung of this word's ladder, it is a different word
 * wearing this one's meaning.
 *
 * So the gap is cut from the taught sentence alone, in the taught form alone.
 * Where that sentence cannot carry a gap (the word appears twice, say), the
 * gap rung is skipped rather than reached for a form nobody has met: `gap:
 * null` already falls back to asking the word from its meaning, which is the
 * safe shape and not a new one.
 */
function sentenceAndGap(
  lexeme: NonNullable<LearnRow["lexeme"]>,
  /**
   * Whether this sentence is one the learner may be shown at all.
   *
   * The module's own ladder hands in the words the course has taught through
   * the day they are on, so a beginner's gap is cut from a sentence they can
   * read; standalone Learn hands in nothing and is unchanged, because a
   * learner who went there themselves is choosing their own difficulty.
   */
  readable: (sentence: string) => boolean,
) {
  const examples = usableExamples(parseExamples(lexeme.examples)).filter((e) => readable(e.et));
  const opener = nominalOpener(lexeme.pos, [lexeme.lemma, ...lexeme.forms.map((f) => f.value)]);
  const taught = teachingSentence(examples, [lexeme.lemma], opener);
  const word: WordRow = {
    id: lexeme.id, lemma: lexeme.lemma, translation: lexeme.translation,
    pos: lexeme.pos, cefr: lexeme.cefr, government: null,
    forms: lexeme.forms, examples: [],
  };

  /*
    Which forms may ever be hidden is `gapForms`'s decision and nobody else's;
    this only narrows *which one of them* the gap is allowed to be built out
    of, to the one the meet rung already showed.
  */
  const hideable = gapForms({ lemma: lexeme.lemma, pos: lexeme.pos, forms: lexeme.forms });

  if (taught?.form && hideable.has(taught.form.trim().toLowerCase())) {
    const example = taught.example;
    const cloze = buildCloze(example.et, [taught.form]);
    if (cloze) {
      /*
        The translation is the prompt at the gap rung, and it may not be the
        answer. Thirty entries in the dictionary are spelled the same in both
        languages, so `Vaatasin filmi` under "I watched the film" is a
        question about English spelling. Withheld rather than the gap
        dropped: the sentence is still worth answering, it is simply harder
        without it.
      */
      const en = example.en && !mentions(example.en, cloze.answer) ? example.en : null;
      const cue = [`${lexeme.lemma}, ${lexeme.translation}`, lexeme.translation]
        .find((line) => !mentions(line, cloze.answer)) ?? null;
      /*
        Why the answer is not simply the lemma, said after the miss rather
        than before the answer. Null where the gap wanted the lemma itself,
        since there is nothing to explain.
      */
      const explanation = cloze.answer.toLowerCase() === lexeme.lemma.toLowerCase()
        ? null
        : explainForm(word, cloze.answer);
      return {
        sentence: { et: example.et, en: example.en ?? null, form: taught.form },
        gap: { text: cloze.text, answer: cloze.answer, full: cloze.full, en, hint: cue, explanation },
      };
    }
  }

  return {
    sentence: taught
      ? { et: taught.example.et, en: taught.example.en ?? null, form: taught.form }
      : null,
    gap: null,
  };
}

/**
 * Whether a round works through single words or whole phrases.
 *
 * `Kas sa räägid inglise keelt?` is taught the same way `tere` is, on one
 * ladder, and for a while that meant a round of "5 new words" could be five
 * fixed phrases in a row: `tervitused`, one of the first units anybody
 * opens, is eighteen of them and nothing else. A learner presses "words"
 * expecting words. So the pool a round draws from is split on `Lexeme.pos`,
 * and the two never mix mid-round: a phrase started under one kind does not
 * resurface as a "new word" under the other.
 */
export type LearnKind = "word" | "phrase";

function posFilter(kind: LearnKind) {
  return kind === "phrase" ? "PHRASE" : { not: "PHRASE" };
}

/**
 * The five words (or five phrases) a session works through.
 *
 * Words already on the ladder come first, whatever their band: somebody who
 * met `kohvik` yesterday and could not produce it should be asked it again
 * before they are handed five more, or Learn becomes a place words go in and
 * never come out of. New words fill whatever room is left, nearest the
 * learner's level first.
 */
export async function learnBatch(
  ownerId: string, level: Level, glossLanguage: GlossLanguage, size = LEARN_BATCH,
  /**
   * The three things a caller can decide about a round, as one object rather
   * than a tail of optional positions: three of them arrived from three
   * directions at once and the next one would have been passed in the wrong
   * slot.
   */
  opts: {
    /** Whether this round is words or the fixed phrases. */
    kind?: LearnKind;
    now?: Date;
    /*
      WHICH WORDS, WHERE THE CALLER HAS ALREADY DECIDED.

      A planned course day names its own eight words, and the whole of what
      makes an evening feel chosen rather than dealt is that every round after
      the first asks *those* back. Without this the ladder would hand today's
      learner whatever was oldest in the deck, which on an account with a
      backlog is last month's unit.

      Undefined is the ordinary case and is untouched: Learn is the whole deck,
      oldest first, nearest the level, exactly as it always was. A named list
      is not narrowed by `kind` as well, because naming the words *is* the
      choosing, and a course day that teaches a greeting beside seven nouns
      would otherwise lose the greeting.
    */
    only?: readonly string[];
    /**
     * Every spelling the course has taught this learner so far, where the
     * caller is the planned module and the learner is held to it.
     *
     * The gap rung cuts a sentence a lexicographer wrote, and a usage is
     * written to illustrate a headword rather than to be a beginner's first
     * reading, so at A1 most of them carry words from further up the course.
     * `readableFor` decides; `undefined` is standalone Learn, which a learner
     * reached by choosing to, and is unchanged.
     */
    taughtWords?: ReadonlySet<string> | null;
  } = {},
): Promise<LearnWord[]> {
  const { kind = "word", now = new Date(), only, taughtWords } = opts;
  /*
    Undefined is "no caller asked", which is standalone Learn and every band
    above A1; `null` is "the module asked and the course could not say", which
    fails closed. `readableFor` is the one definition, shared with the unit
    lesson and the deck's gap-fill card.
  */
  const readable = taughtWords === undefined ? () => true : readableFor(level, taughtWords);
  const scope = only
    ? { lexeme: { lemma: { in: [...only] } } }
    : { lexeme: { pos: posFilter(kind) } };
  /*
    A WORD PART WAY UP THE LADDER IS SERVED WHATEVER ITS DATE, WHICH IS WHY
    THIS ONE HAS TO ASK.

    Between rungs the scheduler puts a word ten minutes out, so this read
    cannot filter on `due` without dropping the words the ladder is in the
    middle of. Everything else on the daily path reads `due` and so needs
    nothing: putting a word aside pushes it. Here the question is asked
    outright, beside the read rather than after it.
  */
  const [startedRows, aside] = await Promise.all([
    prisma.card.findMany({
      where: { ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 1, ...scope },
      // Longest waiting first, and the id settles a tie: a word's cards are
      // written in one insert and share a `due` to the millisecond.
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take: size,
      include: INCLUDE,
    }),
    deferredWordIds(ownerId, now),
  ]);
  const started = startedRows.filter((card) => !card.lexemeId || !aside.has(card.lexemeId));

  const room = Math.max(0, size - started.length);
  /*
    A WORD THE LEARNER PUT ASIDE IS NOT TAUGHT AGAIN TONIGHT.

    `due` is meaningless on a card that has never been asked, which is why this
    read never filtered on it: every unseen card carries the moment it was
    written. It stops being meaningless the moment somebody presses "too
    complicated", because that is what a deferral moves (`lib/srs/defer.ts`),
    and without this the ladder would teach a word the app had just promised
    to leave alone for three weeks.
  */
  const raised = await hardWords();
  const fresh = room === 0 ? [] : challengeFirst(
    await prisma.card.findMany({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 0,
        ...scope,
        due: { lte: now },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: NEW_CANDIDATES,
      include: INCLUDE,
    }),
    level,
    /*
      The band this deployment offers the word at, which is one step up from
      the dictionary's own where enough learners have put it aside. The whole
      point of counting those presses is that the next learner is taught the
      word later than the one who reported it was (`lib/srs/defer.ts`).
    */
    (card) => offeredBand(card.lexeme?.cefr ?? null, card.lexemeId !== null && raised.has(card.lexemeId)),
  ).slice(0, room);

  const rows = [...started, ...fresh].filter((row) => row.lexeme !== null);
  if (rows.length === 0) return [];

  /*
    Which words the dictionary holds is not a fact about the person being
    asked, so the decoy pool is one read per instance rather than one per
    session. See lib/dict/facts.ts.
  */
  const pool = await decoyOptions();

  /*
    Which of the batch are already favorites, so the star in the corner of
    each card is drawn in the state it is actually in. One query for the batch
    rather than one per word, and it is here rather than in the page because
    the batch is assembled here and a second read would be a second answer.
  */
  const starred = await starredAmong(
    ownerId, rows.map((row) => row.lexeme!.id),
  );

  const words = rows.map((row) => {
    const lexeme = row.lexeme!;
    const { sentence, gap } = sentenceAndGap(lexeme, readable);
    const equivalent = equivalentIn(lexeme, glossLanguage);

    /*
      Ranked rather than shuffled, through the one table of what a wrong
      answer is worth. Three nouns standing around one verb is a single
      glance, and a learner meeting a word for the first time is exactly who
      that free question is wasted on.
    */
    const picked = pool.length >= CHOICES
      ? pickOptions({
          answer: glossOption({
            text: plainPhrase(lexeme.translation),
            pos: lexeme.pos,
            band: bandOf(lexeme.cefr),
            theme: unitIntroducing(lexeme.lemma, lexeme.pos),
          }),
          candidates: pool,
          rng: Math.random,
          distinct: differentMeaning,
          nearness: glossNearness,
        })
      : null;

    return {
      cardId: row.id,
      lexemeId: lexeme.id,
      lemma: plainPhrase(lexeme.lemma),
      gloss: plainPhrase(lexeme.translation),
      equivalent: equivalent ? { text: equivalent, lang: glossLanguage } : null,
      isPhrase: isPhrase(lexeme.pos),
      sentence,
      // Filled below, in one read for the whole batch rather than one a word.
      tokens: null as GlossedToken[] | null,
      canTranslate: resolveProvider() !== null,
      gap,
      choices: picked ? picked.options : null,
      starred: starred.has(lexeme.id),
      rung: rungOf(row.state, row.learningSteps),
      scheduling: schedulingOf(row),
    } satisfies LearnWord;
  });

  /*
    THE DICTIONARY UNDER EVERY SENTENCE IN THE BATCH, IN ONE READ.

    A loop of lookups is a round trip each and this is five words, so it is one
    query. Nothing is written and nothing is proposed: `matchEstonianForm`
    vouches for a word or it is printed plain (ADR-021).
  */
  const glossable: { index: number; et: string; form: string | null }[] = [];
  words.forEach((word, index) => {
    if (word.sentence) glossable.push({ index, et: word.sentence.et, form: word.sentence.form });
  });
  /*
    And only where the learner wants it. Asked here rather than handed down
    from the route for the reason `withGlosses` gives at length: this is the
    one place the ladder looks a sentence up, so the one place the question can
    be put where nobody can arrive without having answered it. Off leaves
    `tokens` null, which is what a word with no sentence has always been, and
    `WordIntro` draws the plain marked sentence for it. See lib/ux/wordGloss.ts.
  */
  const glossing = glossable.length > 0
    && wordGlossFrom(await readSetting(ownerId, SETTING_KEYS.wordGloss)) === "on";
  if (glossing) {
    const glossed = await glossSentences(glossable);
    glossable.forEach((w, i) => {
      const word = words[w.index];
      if (word) word.tokens = glossed[i] ?? null;
    });
  }

  return orderByRung(words, (word) => word.rung);
}

/** How much is waiting, for the card that offers a session. */
export interface LearnCounts {
  /** Words that have never been asked. */
  waiting: number;
  /** Words part way up the ladder, which come back before any new one does. */
  started: number;
  /** The same two counts, read over the fixed phrases rather than the words. */
  phrases: { waiting: number; started: number };
}

export async function learnCounts(ownerId: string, now = new Date()): Promise<LearnCounts> {
  /*
    The same two guards `learnBatch` applies, because a number on Today that
    the session then refuses to fill reads as a counting fault rather than as
    a rule. Reads that do not need each other's answers, so they are one round
    trip rather than five.
  */
  const [waiting, started, phraseWaiting, phraseStarted, aside] = await Promise.all([
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 0,
        lexeme: { pos: posFilter("word") },
        due: { lte: now },
      },
    }),
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 1,
        lexeme: { pos: posFilter("word") },
      },
    }),
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 0,
        lexeme: { pos: posFilter("phrase") },
        due: { lte: now },
      },
    }),
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 1,
        lexeme: { pos: posFilter("phrase") },
      },
    }),
    deferredWordIds(ownerId, now),
  ]);
  /*
    And the ones part way up that were put aside, counted in Postgres and
    subtracted, which is one extra round trip for a learner who has put
    something aside and none at all for everybody else. Counting the started
    rows in this process instead would read a deck's worth of ids to answer
    with one integer, which is the shape `lib/progress/impact.ts` calls out.

    Counted per kind, because the two numbers are printed on two buttons: one
    count over both would subtract a phrase somebody put aside from the words
    button, which is a number the session then refuses to fill.
  */
  if (aside.size === 0) {
    return { waiting, started, phrases: { waiting: phraseWaiting, started: phraseStarted } };
  }
  const [heldWords, heldPhrases] = await Promise.all([
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 1,
        lexemeId: { in: [...aside] }, lexeme: { pos: posFilter("word") },
      },
    }),
    prisma.card.count({
      where: {
        ownerId, suspended: false, cardType: LADDER_CARD_TYPE, state: 1,
        lexemeId: { in: [...aside] }, lexeme: { pos: posFilter("phrase") },
      },
    }),
  ]);
  return {
    waiting,
    started: Math.max(0, started - heldWords),
    phrases: { waiting: phraseWaiting, started: Math.max(0, phraseStarted - heldPhrases) },
  };
}
