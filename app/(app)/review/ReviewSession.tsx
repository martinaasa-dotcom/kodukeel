"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Check, Compass, Keyboard, MessageCircleQuestion, RotateCcw, Undo2, X, Zap } from "lucide-react";
import { gradeCard, undoGrade } from "@/app/actions";
import { Button, ButtonLink } from "@/components/Button";
import { EstonianInput } from "@/components/EstonianInput";
import { Chip, Empty, KeyCap, Meter, Page, StatTile } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { Speak } from "@/components/Speak";
import { useAudioPrefs, useFeedbackSound } from "@/components/AudioPrefs";
import { prefetchClip } from "@/lib/audio/clip";
import { SuggestFix } from "@/components/SuggestFix";
import { StarWord } from "@/components/StarWord";
import { TooComplicated } from "@/components/TooComplicated";
import { WordIntro } from "@/components/WordIntro";
import { SentenceTranslation } from "@/components/SentenceTranslation";
import { GapMeaning } from "@/components/GapMeaning";
import { gapCue, gapMeaning } from "@/lib/copy/gapMeaning";
import type { GlossedToken } from "@/lib/dict/glossed";
import { caseByKey } from "@/lib/estonian/cases";
import { plainAsk, plainAskLine } from "@/lib/estonian/plainAsk";
import { conjugationSlotFromFront, slotLabel } from "@/lib/srs/slots";
import { BLANK, sizedBlank } from "@/lib/estonian/cloze";
import { checkAnswer, countsAsRecalled, type AnswerCheck } from "@/lib/estonian/answer";
import { SAME_SPELLING, sameSpelling } from "@/lib/copy/values";
import { enqueueGrade, readStashedSession, stashSession } from "@/lib/offline/db";
import { useOffline } from "@/components/OfflineProvider";
import type { ReviewMode } from "@/lib/settings/store";
import { SELF_GRADES, type RatingValue, type SchedulingState } from "@/lib/srs/scheduler";
import { requeue } from "@/lib/srs/queue";
import { OPTION_CLASS, VERDICT_CLASS, VERDICT_PAUSE_MS, optionState, verdictOfCheck, verdictOfRating } from "@/lib/ux/verdict";
import { hintLadder, narrowLadder, struckOptions } from "@/lib/questions/hints";
import { FIRST_TRY_NOTE, isFirstProduction } from "@/lib/copy/firstTry";
import { HintLadder } from "@/components/round/HintLadder";
import { useHints } from "@/components/round/useHints";
import { ADVANCE_KEY_GLYPH, ADVANCE_KEY_LABEL, isAdvanceKey } from "@/lib/ux/advanceKey";
import { useResumeCard } from "@/components/useResumeCard";
import { useUiText } from "@/components/UiLanguage";
import { EndSession, FullEntry, WayOut } from "@/components/round/RoundExit";
import { LookBackButton, LookBackCard, useLookBack } from "@/components/round/LookBack";
import { type SeenCard } from "@/lib/ux/lookBack";

export interface ReviewCard {
  id: string;
  cardType: string;
  front: string;
  back: string;
  hint: string | null;
  targetCase: string | null;
  /** The conjugation slot a CONJUGATION card is about, as `CONJUGATION_SLOTS` spells it. */
  slot: string | null;
  lemma: string | null;
  /**
   * The dictionary entry behind the card, for the favorite button.
   *
   * Null on the handful of cards with no entry behind them, which is what the
   * `lemma` above is null on too, and the star is simply not drawn there:
   * there is nothing to keep.
   */
  lexemeId: string | null;
  /**
   * Other forms of this word, so another ending is not marked as a slip.
   *
   * `checkAnswer` reads anything within one edit as a typo and marks it as
   * produced, and every pair of Estonian cases is one letter apart: measured
   * over the shipped dictionary, 47,982 of 51,513 case answers have another
   * case of the same word one edit away. So the card told a learner who wrote
   * the seestütlev that they had mistyped the seesütlev, graded it Hard, and
   * wrote it into the append-only log as a recall. `lib/games/flash.ts` names
   * this fault and fixes it for its own round by asking the word's forms
   * first; these are those forms, on the screen a learner opens every day.
   *
   * Empty on a card with no entry behind it, and on a recognition card, whose
   * answer is English.
   */
  rivals: string[];
  /** Whether this word is already one of the learner's favorites. */
  starred: boolean;
  isNew: boolean;
  /**
   * What to show the first time this word is met, assembled by the page out of
   * the dictionary. Null on a card that has been seen, and on the rare card
   * with no dictionary entry behind it.
   */
  intro: {
    lemma: string;
    gloss: string;
    /**
     * The Institute's own equivalent in the learner's chosen language, or null.
     *
     * The first meeting is the one screen where this earns the most: it is the
     * moment the word is being learned rather than tested, and somebody who
     * already speaks Russian or Ukrainian reaches the meaning in one step
     * instead of two. Beside the English rather than instead of it, since the
     * English is the gloss every entry has. Comes from Ekilex, like the
     * sentence under it.
     */
    equivalent: { text: string; lang: string } | null;
    /** An attested sentence, and which form of the word it carries. */
    sentence: { et: string; en: string | null; form: string | null } | null;
    /** The entry it hangs off, so the sentence can be asked about in English. */
    lexemeId: string | null;
    /**
     * That sentence with the dictionary under every word it will vouch for.
     *
     * Ekilex holds no English for most usages, so the sentence that is meant to
     * show a word behaving was six unreadable words around one glossed one.
     * Null where the page did not look, which is a different thing from a
     * sentence nothing in the dictionary could be said about. See
     * `lib/dict/glossed.ts`.
     */
    tokens: GlossedToken[] | null;
    /**
     * The everyday spelling of a pronoun, where the word has one.
     *
     * `mina` and `ma` are one word twice: the card teaches the headword and
     * every sentence under it says the other one. Read off the entry's own
     * stored forms, never written (see `lib/estonian/pronouns.ts`).
     */
    alsoSaid: string | null;
    /** Whether this deployment has a model that could translate the whole line. */
    canTranslate: boolean;
    /**
     * Whether the entry is a whole utterance rather than a word.
     *
     * `Tere!` and `Kuidas läheb?` have no example sentence and never will, and
     * saying "no example sentence for this one yet" about them told a beginner
     * the app had let them down on twenty of the first cards it ever shows.
     */
    isPhrase: boolean;
  } | null;
  /** Four options including the right one, when this card can be asked as multiple choice. */
  choices: string[] | null;
  scheduling: Omit<SchedulingState, "due" | "lastReview"> & { due: string; lastReview: string | null };
  /**
   * The stored English translation of a `CLOZE` card's own sentence, matched
   * off the lexeme's examples. Null on every other card type, and on a CLOZE
   * card whose sentence has not been translated yet.
   */
  sentenceEn: string | null;
  /** Whether this deployment has a model that could translate the sentence. */
  canTranslate: boolean;
}



/**
 * Which facet of a word this card is asking about.
 *
 * The case column where there is one, then `Card.slot`, which a conjugation
 * card carries since its front became a sentence with the form taken out, and
 * then the slot the front names, for a card built before the column existed
 * whose front is still `lugema → olevik · ta`. `slotOfCard` in
 * `lib/srs/slots.ts` is the same question answered from the columns alone.
 */
function slotAsked(card: ReviewCard): string {
  return card.targetCase ?? card.slot ?? conjugationSlotFromFront(card.front) ?? card.cardType;
}

/**
 * A front that is a sentence with the form taken out.
 *
 * The plain clause below is printed before the answer on a card whose front
 * already names what it wants (`hammas → kelle?`), where it cashes the name in.
 * On a gap it would name the case in front of the gap, which is the answer in
 * two pieces; the sentence is the ask there, and the clause is printed after
 * the answer instead, where it explains.
 */
const isGap = (card: ReviewCard) => card.front.includes(BLANK);

/**
 * What a card leaves behind for somebody who wants to see it again.
 *
 * Built from the card as it was drawn rather than from the row, which is
 * `lib/ux/lookBack.ts`'s own rule: `sizedBlank` is the question the learner
 * actually read, gap and all, and the plain clause is the one this screen
 * prints under it. A first meeting records the word and its meaning, since
 * that is what was on the screen and there was no question to ask.
 */
function shownAs(card: ReviewCard, met: boolean): Omit<SeenCard, "key"> {
  // A meeting is always the Estonian word over its English meaning, whatever
  // side the card it came from would have called Estonian.
  const word = card.intro?.lemma ?? card.lemma ?? card.front;
  const speakable = met
    ? spoken(word)
    : estonianSide(card.cardType, "back")
      ? spoken(card.back)
      : estonianSide(card.cardType, "front") && !isGap(card)
        ? spoken(card.lemma ?? card.front)
        : null;
  return {
    of: card.id,
    label: met
      ? (card.intro?.isPhrase ? "New phrase" : "New word")
      : TYPE_LABEL[card.cardType] ?? card.cardType,
    question: met ? word : sizedBlank(card.front, card.back),
    answer: met ? card.intro?.gloss ?? card.back : card.back,
    note: met ? null : plainAsk(slotAsked(card)) ? plainAskLine(slotAsked(card)) : null,
    questionLang: met ? "et" : estonianSide(card.cardType, "front") ? "et" : "en",
    answerLang: met ? "en" : estonianSide(card.cardType, "back") ? "et" : "en",
    speak: speakable,
  };
}

/**
 * "Why?", at the only moment anyone asks it.
 *
 * A reference page nobody can find is a reference page nobody reads, and the
 * moment a learner wants the rule is the second after the answer appears and
 * does not match what they thought. Both links are one tap and neither leaves
 * the answer behind: the grammar page explains the case this card drills, and
 * Anu opens with the question already written so it can be sent or edited.
 */
function WhyRow({ card }: { card: ReviewCard }) {
  // Named the way a class names it, because this question is going to a tutor
  // who is told to answer in the same words (lib/tutor/prompt.ts).
  const named = card.targetCase ? caseByKey(card.targetCase) : undefined;
  const caseName = named?.et ?? card.targetCase?.toLowerCase() ?? "";
  // A conjugation card names its slot the same way, off `Card.slot`: the front
  // is a sentence now and carries no label, and the label is what the learner
  // wants the moment the answer appears and is not what they thought.
  const verbSlot = card.slot ? slotLabel(card.slot) : null;
  const question = card.targetCase
    ? `Why is the ${caseName} of "${card.lemma ?? card.front}" what it is? I keep getting this form wrong.`
    : verbSlot
      ? `Why is "${card.lemma ?? card.front}" in the ${verbSlot} what it is? I keep getting this form wrong.`
      : `Explain "${card.lemma ?? card.front}" to me, what does it mean and when would an Estonian use it?`;

  const pill =
    "press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-ui hover:-translate-y-px";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
      {verbSlot && !card.targetCase && (
        <span className={pill} style={{ background: "var(--raised)", color: "var(--ink-2)" }} lang="et">
          {verbSlot}
        </span>
      )}
      {card.targetCase && (
        <Link
          href={`/grammar/${card.targetCase.toLowerCase()}`}
          className={pill}
          style={{ background: "var(--raised)", color: "var(--ink-2)" }}
        >
          <Compass size={12} aria-hidden /> Why the <span lang="et">{caseName}</span>?
        </Link>
      )}
      <Link
        href={`/tutor?q=${encodeURIComponent(question)}`}
        className={pill}
        style={{ background: "var(--raised)", color: "var(--ink-2)" }}
      >
        <MessageCircleQuestion size={12} aria-hidden /> Ask Anu
      </Link>
    </div>
  );
}

/**
 * A word's first outing: what it means, and it doing its job in a sentence
 * somebody actually wrote.
 *
 * What stood here was the answer, a line of instructions, and the four grading
 * buttons every other card carries. `askFor` had already worked out that this
 * is wrong and says so in its own comment: a card you have never seen cannot be
 * recalled, only met. It then handed over Again, Hard, Good and Easy anyway, so
 * the screen asked how well a memory had held up four seconds after admitting
 * there was no memory yet, and Easy scheduled the word a week out.
 *
 * So a first meeting teaches instead. The sentence is the part that does the
 * work: a gloss makes a word a label, and a word in a sentence is a word you
 * have seen behave. It is attested Estonian picked by `teachingSentence`, with
 * the form the card is about to ask for marked in it, and nothing here is
 * written or derived (ADR-005).
 */
function MeetWord({ card }: { card: ReviewCard }) {
  const lemma = card.intro?.lemma ?? card.lemma ?? card.front;
  const gloss = card.intro?.gloss ?? (card.cardType === "RECOGNITION" ? card.back : "");

  return (
    <WordIntro
      key={card.id}
      lemma={lemma}
      gloss={gloss}
      alsoSaid={card.intro?.alsoSaid ?? null}
      equivalent={card.intro?.equivalent ?? null}
      sentence={card.intro?.sentence ?? null}
      tokens={card.intro?.tokens ?? null}
      lexemeId={card.intro?.lexemeId ?? null}
      canTranslate={card.intro?.canTranslate ?? false}
      isPhrase={card.intro?.isPhrase ?? false}
    >
      {/* What this particular card will want back, once it starts asking. On a
          recognition card that is the word and its meaning, which is the whole
          screen already, so it would only be saying it twice. */}
      {card.cardType !== "RECOGNITION" && (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Next time this card asks:{" "}
          <span lang={estonianSide(card.cardType, "front") ? "et" : "en"} className="font-semibold">
            {card.front}
          </span>
        </p>
      )}
    </WordIntro>
  );
}

const TYPE_LABEL: Record<string, string> = {
  RECOGNITION: "Estonian → English",
  PRODUCTION: "English → Estonian",
  CASE_FORM: "Case form",
  GRADATION: "Gradation",
  GOVERNMENT: "Verb government",
  CLOZE: "Fill the gap",
  CONJUGATION: "Verb form",
};

/**
 * The one form to read aloud off a side that may print two.
 *
 * A case card's back is `tuppa / toasse`, both right and both printed, and a
 * speech service handed that string reads the slash. The first is the one the
 * dictionary leads with, which is the one worth hearing.
 */
const spoken = (side: string) => side.split(" / ")[0]!.trim();

/** Cards whose front or back is Estonian and therefore worth hearing. */
const estonianSide = (type: string, side: "front" | "back") =>
  side === "front"
    ? type !== "PRODUCTION"
    : type === "PRODUCTION" || type === "CASE_FORM" || type === "GRADATION" || type === "CLOZE"
      || type === "CONJUGATION";

/**
 * Card types whose answer is a single Estonian form, and so can be typed and
 * checked exactly. `GOVERNMENT` is excluded on purpose: its answer is a
 * sentence-ish gloss ("partitive — aitan sind"), and marking that wrong on a
 * word order difference would be punishing the learner for the card's format.
 */
/*
  `CONJUGATION` joined the set when the card became a sentence with a form
  taken out: its answer was always a single vouched form and `checkAnswer`
  could always have marked it, and for a year it was a flip anyway.
*/
const TYPEABLE = new Set(["PRODUCTION", "CASE_FORM", "GRADATION", "CLOZE", "CONJUGATION"]);

type Ask = "intro" | "type" | "choice" | "flip";

/**
 * WHAT COUNTS AS HAVING MET A WORD.
 *
 * The word, not the card. `addCardsFor` writes a recognition card, a production
 * card and one per case the dictionary can build, so `Euroopa` alone is five
 * cards; keyed on the card id, each of them got its own introduction. Those
 * screens differ only in a line at the bottom saying what the card will ask
 * later, because the introduction shows the lemma, the gloss and a sentence and
 * none of that changes between a word's cards. Driven in a browser, that was
 * five near-identical screens for one word before a single question.
 *
 * Keyed on the lemma, a word is introduced once and its other cards are asked
 * straight away, which is what the meeting was for. `spreadSiblings` keeps
 * those questions apart; this only decides which of them teach.
 *
 * A card with no lemma behind it falls back to its own id, so it is its own
 * word. Reading a missing lemma as one shared key would collapse every such
 * card together and the rest would be asked having never been shown.
 */
function wordKey(card: ReviewCard): string {
  return card.intro?.lemma ?? card.lemma ?? card.id;
}

function askFor(card: ReviewCard, mode: ReviewMode, met: ReadonlySet<string>): Ask {
  /*
    A card you have never seen cannot be recalled, only met. Asking someone to
    produce a word they have not been shown is a guessing game that teaches
    nothing, so a new card leads with its answer.

    MEETING IT IS NOT ANSWERING IT, THOUGH. That screen used to end in
    `submit(3)`: the card was graded Good, in the append-only log, on a word
    the learner had done nothing with but read. The scheduler then set the
    first interval from a recall that never happened, and the next real
    question was the next day. Karpicke and Roediger measured what that costs:
    learners who kept retrieving new pairs inside the first session recalled
    about 80 percent a week later, against about 35 for those who only
    restudied, and the whole difference was whether retrieval happened while
    the word was being learned.

    So the meeting writes nothing, and the card comes back a few places later
    as the question it would ordinarily be. That retrieval is the grade.
  */
  if (card.isNew && !met.has(wordKey(card))) return "intro";

  /*
    A CARD THIS APP CAN MARK IS NEVER MARKED BY THE LEARNER.

    `TYPEABLE` is the set whose answer is a single Estonian form the dictionary
    vouches for, and `checkAnswer` compares against it, tells a dropped õ from
    a wrong word, and names the case the learner reached for instead. All of
    that was reachable, and one preference in Settings turned every one of
    those cards into a flip with "Not yet" and "Got it" under it. So the app
    held the answer, could have marked it, and asked the learner to mark it.

    That is not only a weaker question. The judgment goes into `Review`, which
    is append-only and is what the weakest-case panel, the mastery counter, the
    readiness rungs and the exam confidence figure are all derived from, so a
    number this app presents as measured was partly self-reported. The
    preference's own copy has always said so: "easier to fool yourself with".

    The preference is still honored, because "I would rather not type" is a
    real thing to want and typing on a phone is most of why. It is honored
    with four forms of the same word instead (`lib/questions/caseChoices.ts`),
    which is one tap exactly as "Got it" was one tap, and which measures. Where
    a card cannot be given options the honest answer is to ask for it typed
    rather than to hand the marking back.

    The flip survives where there is genuinely nothing to compare: a government
    card, whose answer is a gloss rather than a form, and speaking, where
    ADR-018 says the learner is the only judge there is.
  */
  if (TYPEABLE.has(card.cardType)) {
    if (mode === "type") return "type";
    return card.choices && card.choices.length > 1 ? "choice" : "type";
  }
  if (card.cardType === "RECOGNITION" && card.choices && card.choices.length > 1) return "choice";
  return "flip";
}

interface Done {
  cardId: string;
  /** The word it was about, so putting that word aside can take its grades with it. */
  lexemeId: string | null;
  index: number;
  rating: RatingValue;
  /** The card's scheduling before the grade — everything undo needs. */
  before: ReviewCard["scheduling"];
}

export function ReviewSession({
  cards: initialCards, drillCase, drillUnit, drillScan, totalCards, mode, nextDue, title = "Review",
}: {
  cards: ReviewCard[];
  drillCase?: string;
  drillUnit?: string;
  /** A photographed page being drilled on its own: its id, and what it is called. */
  drillScan?: { id: string; title: string };
  totalCards: number;
  /**
   * What this screen is called, for the heading no round has room to draw.
   *
   * Two routes render this session, and the Flash cards round announced itself
   * as "Review" to a screen reader while its tab said "Flash cards". A screen
   * names itself, and it has to be the same name in both places.
   */
  title?: string;
  /**
   * One sentence saying when the next card comes back, or null.
   *
   * The only question an empty queue raises, and the one the caught-up screen
   * did not answer: it said "All 312 cards are scheduled for later", which is
   * a count the learner already knows. Worked out on the server, where the
   * learner's own zone lives, and only on the path where it is shown.
   */
  nextDue?: string | null;
  mode: ReviewMode;
}) {
  // Snapshotted once on mount, and never updated from later props. gradeCard()
  // is a Server Action, and Next.js refreshes this route's Server Component
  // after every call — which would hand down a shrinking `cards` prop as
  // graded cards drop out of the due pool. Without a frozen snapshot, the
  // *last* grade of a session would see an empty prop and render "nothing
  // due" instead of the session summary — the pool the page found on the
  // very first load is the only one this session should ever know about.
  const [queue, setQueue] = useState(initialCards);
  const [wasEmptyAtStart] = useState(initialCards.length === 0);
  // Which card to reopen on if this mount is a resume after a dictionary
  // detour, rather than a fresh start. See `components/useResumeCard.ts`.
  const { initialIndex, remember: rememberCard } = useResumeCard(initialCards);
  const uiText = useUiText();
  const [index, setIndex] = useState(initialIndex);
  const [revealed, setRevealed] = useState(false);
  /*
    WHAT THE "TOO COMPLICATED" BUTTON DID, SAID OUT LOUD.

    Its whole effect is that a word stops arriving for three weeks, which is
    nothing anybody can see tonight, so the sentence it hands back is printed
    under the card with the way to undo it beside it. Held until the next
    press rather than cleared on a timer: it is the only record on this screen
    that the press landed at all.
  */
  const [aside, setAside] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<AnswerCheck | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  /*
    A MISS IS TYPED AGAIN BEFORE THE CARD GOES.

    The correction used to sit on the screen over a button reading "Got it",
    and a learner who pressed it had read the right form and produced
    nothing. Producing it is the part that sticks, so a typed card marked
    wrong or nearly right asks for the form once more, against the answer
    printed above, and only a correct retype lets the card move on. The grade
    is unchanged: the retype is rehearsal rather than a second answer, and
    the log records the miss the scheduler needs to see.
  */
  const [retyped, setRetyped] = useState("");
  const [retypeOk, setRetypeOk] = useState(false);
  const [retypeNote, setRetypeNote] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Done[]>([]);
  /*
    WHAT HAS BEEN ON THIS SCREEN, SO IT CAN BE READ BACK.

    The browser's back button leaves the whole session, because a round is one
    history entry, so a learner who wanted to see the word before this one had
    no way to do it that did not cost them their place. This is that record:
    what was drawn, kept in the session, dropped with it, and read only.
    `lib/ux/lookBack.ts` is the rule and says at length why it is not undo.
  */
  const look = useLookBack();
  const { record, forget } = look;
  const recordSeen = useCallback((card: ReviewCard, met: boolean) => record(shownAs(card, met)), [record]);
  /*
    WHAT UNDO PUTS BACK IS WHAT THE SERVER LAST WROTE.

    `cards` is snapshotted on mount and its `scheduling` is deliberately never
    refreshed, which is right for the queue and was wrong here. An "Again" puts
    a card back into this same session, so a card can be graded twice, and both
    grades recorded the same mount-time state as the one to restore: undoing
    the second rewound past the first as well, dropping a lapse the learner
    really had made and sending a card they had just failed back out on its old
    interval.

    `gradeCard` already computes the next state in order to write it, so it
    hands it back and this is what the session remembers. A grade that could
    not reach the server leaves this untouched, which is exactly right: the row
    it describes was not updated either, and the outbox replays from whatever
    is actually there.
  */
  const scheduled = useRef(new Map<string, ReviewCard["scheduling"]>());
  /*
    A right answer stays on the screen for `VERDICT_PAUSE_MS` and then grades
    itself. The timer is held so that Enter or the button during the pause
    grades the card once rather than twice: the timer's own closure carries
    the card it was set on, so left running past an early press it would
    grade that card again after the queue had moved on.
  */
  const autoNext = useRef<number | null>(null);
  const clearAutoNext = useCallback(() => {
    if (autoNext.current !== null) { window.clearTimeout(autoNext.current); autoNext.current = null; }
  }, []);
  const gradeAfterPause = useCallback((rating: RatingValue, grade: (r: RatingValue) => Promise<void>) => {
    clearAutoNext();
    autoNext.current = window.setTimeout(() => { autoNext.current = null; void grade(rating); }, VERDICT_PAUSE_MS);
  }, [clearAutoNext]);
  useEffect(() => clearAutoNext, [clearAutoNext]);
  /** Cards whose word has been met this session and which are now asked properly. */
  const [met, setMet] = useState<ReadonlySet<string>>(() => new Set());
  const [pendingOffline, setPendingOffline] = useState(0);
  const { pending: outboxPending, refresh: refreshOutbox } = useOffline();
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const { voice, pace } = useAudioPrefs();
  const sound = useFeedbackSound();

  /*
    HOW MANY IN A ROW, WHICH IS WHAT THE RIGHT SOUND CLIMBS WITH.

    The two-note chime was the same every time, so the tenth card you got right
    sounded exactly like the first and a session had no shape to it. A run that
    goes up says what a counter would say and says it while you are already
    reading the next card, which is the one thing sound is better at than a
    number on a screen.

    A ref rather than state: nothing on the screen reads it, so putting it in
    state would re-render the card to change a frequency. Undo puts it back to
    nothing, because taking an answer back is not a run continuing.
  */
  const run = useRef(0);
  const cheer = useCallback((right: boolean) => {
    run.current = right ? run.current + 1 : 0;
    sound(right ? "right" : "wrong", run.current);
  }, [sound]);

  const card = queue[index];
  const finished = !card;
  const ask = card ? askFor(card, mode, met) : "flip";

  // Remembered so a detour to the dictionary can come back to this card
  // rather than to whatever a fresh queue opens with; cleared once the round
  // actually finishes.
  useEffect(() => { rememberCard(card); }, [rememberCard, card]);

  /*
    Whether the answer is on the screen, which is not the same question as
    whether the learner turned it over.

    A new card leads with its answer (`askFor`, "a card you have never seen
    cannot be recalled, only met"), so `intro` arrives with the answer already
    printed and the rating buttons already drawn. `revealed` stays false for
    it, because nothing was revealed.

    The render worked that out in four places and spelled it out in each of
    them; the keyboard handler is where the fifth copy should have been and
    was not, so it read `!revealed` and returned before the rating keys. The
    rating buttons sat on screen, the mouse graded the card and the number
    keys did nothing at all, on the one shape a learner meets every time they
    start a new word. Naming it once is what stops a sixth reader getting it
    wrong the same way.
  */
  const answerShown = revealed || ask === "intro";

  /*
    THE WAY OUT OF BEING STUCK, ON THE DAILY PATH.

    Drawn only once the learner has already been told no about this word in
    this sitting, or the card arrived carrying enough lapses that the clinic
    already calls it one they keep failing (`hintsOpen`). A typed card gets the
    letters of the answer uncovered a few at a time; a card asked as four
    options gets them crossed out, worst rival first. A flip and a first
    meeting get nothing, because neither is a question: one has its answer
    behind a press the learner controls already, and the other has it printed.

    `rivals` is every other form of this word the page fetched, so it is
    exactly the list `hintLadder` wants for working out which letters are the
    ending and which are the stem it went on. Nothing here decides that: see
    `lib/questions/hints.ts` on why the caller hands over what it has rather
    than picking.
  */
  const ladder = !card
    ? []
    : ask === "choice"
      ? narrowLadder(card.choices ?? [], card.back)
      : ask === "type"
        ? hintLadder({
          answer: card.back,
          stems: [...card.rivals, card.lemma],
          suffix: card.targetCase ? caseByKey(card.targetCase)?.suffix : null,
        })
        : [];
  /*
    Keyed on the word rather than on the card, which is what `met` above is
    keyed on and for the same reason: a deck holds several cards of one word,
    and being stuck on `toas` is being stuck on `tuba`. A miss requeues the card
    several places on, so the two goes at it are not next to each other, which
    is exactly the shape `hintsOpen` is about.
  */
  const hints = useHints({
    word: card ? wordKey(card) : null,
    // The card rather than the word: a deck holds several cards of one word,
    // and two letters of `toas` are not two letters of `toale`.
    question: card?.id ?? null,
    ladder,
    lapses: card?.scheduling.lapses ?? 0,
  });
  const struck = ask === "choice" && card
    ? struckOptions(card.choices ?? [], card.back, hints.taken)
    : [];
  /*
    The line that says being unable to answer is the ordinary state, on a word
    being asked for in writing for the first time. `isNew` is the card's own
    flag and the lapses are the card's own count, so a word that has already
    been round the houses does not get told it is fine not to know it.
  */
  const firstTry = card !== undefined && ask === "type" && isFirstProduction({
    produced: hints.missed + card.scheduling.reps + card.scheduling.lapses,
    typed: true,
  });

  /*
    WHAT THE SENTENCE AROUND THE GAP SAYS, ON THE QUESTION.

    `Kohtume kell ____.` used to be asked over the one word `four`, which is
    the missing word's meaning and says nothing about the line it is missing
    from. A learner reported it: the gloss tells you which word and the
    sentence tells you what you are saying, and a gap-fill is for producing a
    form *because a sentence needs it*. The line reads `Let's meet at four.`
    now, with `four` marked, which is the same gloss in the place it belongs.

    ASKED FOR NOTHING AND ANSWERED FROM WHAT IS ALREADY HELD. `sentenceEn` is
    the dictionary's own English, built once by `npm run translate:examples`
    and shipped, so this costs no call, no wait and no daily allowance, and
    works on a deployment with no model at all. Where the dictionary holds
    none, the card is exactly what it was before this existed. The reveal
    below is still where a translation is *asked* for, so a sentence nobody
    had a line for arrives on the question the next time it comes round.
  */
  const meaning = card && isGap(card)
    ? gapMeaning({ en: card.sentenceEn, answer: card.back, cue: card.hint, lemma: card.lemma })
    : null;
  /*
    And what the cue still has to say once that line has said it, which on a
    gap is the headword and never the gloss twice (`gapCue`). Every other card
    keeps its cue whole, since there is no sentence to have taken its place.
  */
  const cue = card ? gapCue({ hint: card.hint, lemma: card.lemma, marked: meaning?.marked ?? false }) : null;

  // Draining the queue is the provider's job, not this screen's — it has to keep
  // happening on pages that are not a review session. Here we only report it.
  useEffect(() => { setPendingOffline(outboxPending); }, [outboxPending]);

  // Two halves of offline review. When the server handed cards down, keep them:
  // a later visit with no connection needs something real to work through. When
  // it handed nothing down *and* the browser says it is offline, the empty state
  // is a lie — the page came from the service worker cache and the server never
  // ran — so fall back to what was stashed.
  useEffect(() => {
    if (initialCards.length > 0) {
      void stashSession(initialCards);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine) return;
    void readStashedSession().then((stashed) => {
      if (stashed.length > 0) setQueue(stashed);
    });
  }, [initialCards]);

  useEffect(() => {
    shownAt.current = Date.now();
    setRevealed(false);
    setTyped("");
    setVerdict(null);
    setChosen(null);
    setRetyped("");
    setRetypeOk(false);
    setRetypeNote(null);
  }, [index]);

  /*
    The next card's word is fetched while this one is being answered, so its
    speaker button and its autoplay are instant rather than a round trip to a
    speech service on every card. One card ahead is enough: the page cache
    holds two dozen clips and a session moves one card at a time.
  */
  useEffect(() => {
    const upcoming = queue[index + 1];
    if (!upcoming) return;
    // What the card will play: on meeting it, the Estonian front or the lemma;
    // on the answer, the back whenever the back is the Estonian side, which is
    // every case, conjugation and gradation card. Both, so neither round-trips.
    const heard = new Set<string>();
    if (estonianSide(upcoming.cardType, "front") && !isGap(upcoming)) heard.add(upcoming.lemma ?? upcoming.front);
    else if (upcoming.intro?.lemma ?? upcoming.lemma) heard.add(upcoming.intro?.lemma ?? upcoming.lemma!);
    if (estonianSide(upcoming.cardType, "back")) heard.add(upcoming.back);
    // The pace is part of what is warmed: `prefetchClip` stretches the clip to
    // the rate it will be played at, so warming a different one is two passes
    // over the samples and a cold press.
    for (const text of heard) prefetchClip({ text: spoken(text), voice, pace });
  }, [index, queue, voice, pace]);

  /**
   * The learner has met the word. Nothing is written, and the card comes back.
   *
   * `requeue` is the same helper the Again path uses, so a first meeting and a
   * miss are reinserted the same distance on: far enough that the answer is
   * not still on the screen, near enough that a short session still reaches
   * it. A session too short for the gap puts the card last, which is the best
   * a short session can do, and the card is asked either way.
   */
  const meetDone = useCallback(() => {
    if (!card || busy) return;
    recordSeen(card, true);
    setMet((m) => new Set(m).add(wordKey(card)));
    setQueue((q) => {
      const next = [...q];
      const [seen] = next.splice(index, 1);
      return seen ? requeue(next, seen, index) : next;
    });
    setRevealed(false);
    setTyped("");
    setVerdict(null);
    setChosen(null);
    setRetyped("");
    setRetypeOk(false);
    setRetypeNote(null);
    shownAt.current = Date.now();
  }, [card, busy, index, recordSeen]);

  /**
   * A word the learner has just put aside.
   *
   * Every card of that word goes out of this session, not only the one on
   * screen: `putWordAside` has pushed all of them, so leaving a sibling in the
   * queue would ask about a word the app has just promised not to ask about.
   * The index moves back by however many of them were already behind us, so
   * the position that was next stays next.
   *
   * Nothing is graded and nothing goes in the history, because nothing was
   * answered: undo rewinds a grade, and there is no grade here (ADR-016). The
   * way back is the one the note names.
   *
   * WHAT THE WORD'S OWN GRADES DO IS LEAVE WITH IT, WHICH IS NOT TIDINESS.
   * `undoGrade` restores the scheduling the card had before the grade, and
   * that includes the date it was due, which is earlier than the date
   * `putWordAside` has just written. So undoing a grade on a word the learner
   * has just put aside would quietly hand the word back and the note under
   * the card would go on saying it was gone for three weeks. The undo those
   * grades were for is the one the note offers, which takes the whole word
   * back rather than one card of it.
   *
   * And what is left moves up, because a `Done` holds a position in the queue
   * and this is the one thing in the session that shortens the queue behind
   * where the learner is standing. An entry pointing at where a card used to
   * be reopens on its neighbour.
   */
  const putAside = useCallback((note: string) => {
    // The button is drawn only on a card that names a word, and the guard is
    // here as well because a null one would read as "every card with no
    // lexeme" and take them all out of the queue together.
    if (!card?.lexemeId) return;
    const word = card.lexemeId;
    const goneBefore = (at: number) => queue.slice(0, at).filter((c) => c.lexemeId === word).length;
    setQueue((q) => q.filter((c) => c.lexemeId !== word));
    setIndex((i) => Math.max(0, i - goneBefore(i)));
    setHistory((h) => h
      .filter((d) => d.lexemeId !== word)
      .map((d) => ({ ...d, index: Math.max(0, d.index - goneBefore(d.index)) })));
    setAside(note);
    setRevealed(false);
    setTyped("");
    setVerdict(null);
    setChosen(null);
    setRetyped("");
    setRetypeOk(false);
    setRetypeNote(null);
    shownAt.current = Date.now();
  }, [card, queue, index]);

  const submit = useCallback(async (asked: RatingValue) => {
    if (!card || busy) return;
    /*
      Grading a card is the one event this timer exists to produce, so every
      path that grades one clears it here rather than at each call site: the
      keyboard handler can reach `submit` directly on a card the pause timer
      is also about to grade (pressing Enter right after a correct typed
      answer, before its own pause has run out), and without this the stale
      timer fired a second `submit` later, against whatever card the first
      one had already moved on to.
    */
    clearAutoNext();
    setBusy(true);
    /*
      A HINT IS PAID FOR, AND THIS IS WHERE IT IS PAID.

      `hintCeiling` is 4 with nothing taken, so a card nobody asked for help on
      grades exactly as it always did and Easy is still Easy on a flip. Once a
      rung has been taken the grade cannot rise above Hard, and once the answer
      itself has been shown it cannot rise above Again. `Math.min` rather than a
      branch, so a hint can only ever lower what the answer earned: a miss is
      still a miss. The argument is `lib/questions/hints.ts`'s and it is the one
      `audit:decks` makes, that a question whose answer is on the screen is a
      question nobody can fail.
    */
    const rating = Math.min(asked, hints.ceiling) as RatingValue;
    if (rating === 1) hints.noteMiss();
    const duration = Date.now() - shownAt.current;
    const answeredAt = new Date().toISOString();
    const before = scheduled.current.get(card.id) ?? card.scheduling;

    /*
      EVERY CONTROL ON THIS SCREEN IS DISABLED WHILE A GRADE IS IN FLIGHT, SO
      THE FLAG HAS TO COME BACK OFF WHATEVER HAPPENS.

      It used to be cleared on the last line, and the offline branch below
      `await`s a write to IndexedDB: a browser with storage blocked, a private
      window, or a device with no room left rejects it, the exception leaves
      this function, and `busy` stays true for ever. The card then sits there
      with a button that exists, is visible, and can never be pressed, which is
      the least useful shape a failure can take. A lost grade is bad; a session
      the learner cannot carry on with is worse, and the outbox count on screen
      is what tells them either way.
    */
    try {
    try {
      const result = await gradeCard(card.id, rating, duration, answeredAt);
      if (!result.ok) throw new Error(result.error);
      scheduled.current.set(card.id, result.scheduling);
    } catch {
      // No connection, or the write failed. The grade is still a fact about
      // something the learner did, so it goes to the durable outbox and is
      // replayed in order with this timestamp once there is a connection —
      // which, because Review is append-only, lands exactly where it would have.
      await enqueueGrade({
        id: crypto.randomUUID(),
        cardId: card.id,
        rating,
        durationMs: duration,
        reviewedAt: Date.parse(answeredAt),
      });
      refreshOutbox();
    }

    setDone((d) => d + 1);
    if (rating >= 3) setCorrect((c) => c + 1);
    setHistory((h) => [...h, { cardId: card.id, lexemeId: card.lexemeId, index, rating, before }]);
    recordSeen(card, false);

    // "Again" means it is not learned — put it back near the end of this session.
    if (rating === 1) {
      setQueue((q) => {
        const next = [...q];
        const [failed] = next.splice(index, 1);
        // The same distance a newly met word waits: see `requeue`.
        return failed ? requeue(next, failed, index) : next;
      });
      setRevealed(false);
      setTyped("");
      setVerdict(null);
      setChosen(null);
      setRetyped("");
      setRetypeOk(false);
      setRetypeNote(null);
      shownAt.current = Date.now();
    } else {
      setIndex((i) => i + 1);
    }
    } finally {
      setBusy(false);
    }
  }, [card, busy, index, refreshOutbox, hints, recordSeen, clearAutoNext]);

  /**
   * Puts the last graded card back.
   *
   * The Review row stays where it is — `Review` is append-only, and the card
   * really was answered. What is rewound is the scheduling, which is derived.
   */
  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || busy) return;
    /*
      The card on screen may be mid-pause on its own right answer, waiting to
      grade itself against `index` and `queue` as they stood at that moment.
      Undo is about to change both, so a timer left running would later submit
      that grade with a stale index. Cancelling it is safe either way: the
      answer is still on screen, revealed and marked, so Enter or the button
      grades it same as ever, just not on its own any more.
    */
    clearAutoNext();
    setBusy(true);
    const result = await undoGrade(last.cardId, last.before);
    if (result.ok) {
      scheduled.current.set(last.cardId, last.before);
      setHistory((h) => h.slice(0, -1));
      // The card is in front of the learner again, so that showing has not
      // happened any more and the look back must not offer it as the past.
      forget(last.cardId);
      setDone((d) => Math.max(0, d - 1));
      if (last.rating >= 3) setCorrect((c) => Math.max(0, c - 1));
      // Taking an answer back is not a run continuing.
      run.current = 0;
      setQueue((q) => {
        // The card may have been requeued by an "Again"; find it wherever it is.
        const without = q.filter((c) => c.id !== last.cardId);
        const original = queue.find((c) => c.id === last.cardId);
        if (!original) return q;
        without.splice(Math.min(last.index, without.length), 0, original);
        return without;
      });
      setIndex(last.index);
    }
    setBusy(false);
  }, [history, busy, queue, forget, clearAutoNext]);

  const checkTyped = useCallback(() => {
    if (!card || verdict) return;
    const language = card.cardType === "RECOGNITION" ? "en" : "et";
    const result = checkAnswer(typed, card.back, language, card.rivals);
    setVerdict(result);
    setRevealed(true);
    cheer(countsAsRecalled(result.verdict));
    if (result.verdict === "wrong" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(60);
    }
    // Right answers move on by themselves, the way a picked choice already
    // does. Typing the word correctly and then being asked to confirm that you
    // typed the word correctly is a click on the most common outcome in the
    // app. A miss keeps its screen: that is the one moment worth stopping at,
    // and the correction needs typing before anything moves.
    if (result.verdict === "correct") {
      gradeAfterPause(result.suggestedRating, submit);
    }
  }, [card, typed, verdict, submit, cheer, gradeAfterPause]);

  /** Whether the card is waiting for the miss to be typed again. */
  const needsRetype = ask === "type" && verdict !== null && verdict.verdict !== "correct" && !retypeOk;

  const checkRetype = useCallback(() => {
    if (!card || !verdict || retypeOk) return;
    const language = card.cardType === "RECOGNITION" ? "en" : "et";
    const again = checkAnswer(retyped, card.back, language, card.rivals);
    if (again.verdict === "correct") {
      setRetypeOk(true);
      setRetypeNote(null);
      // The pause a right answer gets, then the grade the miss already earned.
      gradeAfterPause(verdict.suggestedRating, submit);
    } else {
      setRetypeNote("Not yet. Copy the answer above exactly, letter for letter.");
    }
  }, [card, verdict, retyped, retypeOk, submit, gradeAfterPause]);

  const pickChoice = useCallback((choice: string) => {
    if (!card || chosen) return;
    setChosen(choice);
    setRevealed(true);
    const right = choice === card.back;
    cheer(right);
    if (!right && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(60);
    if (right) {
      // Right answers move on by themselves: multiple choice is the fast mode,
      // and a confirmation click on every correct card halves the throughput.
      // Not before the tile has been seen to turn, though (`VERDICT_PAUSE_MS`).
      gradeAfterPause(3, submit);
    }
  }, [card, chosen, submit, cheer, gradeAfterPause]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      const field = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
        ? e.target
        : null;
      const typing = field !== null;

      /*
        WHILE A LOOK BACK IS OPEN, THE ROUND IS NOT ON THE SCREEN.

        The card it replaced is not answerable and its keys must not be
        either, or a stray Enter over a word somebody is re-reading grades a
        card they are not looking at. Escape is the way out and the advance
        key walks forward, which is what the buttons under it say.
      */
      if (look.looking) {
        if (e.key === "Escape") { e.preventDefault(); look.close(); return; }
        if (isAdvanceKey(e) && !typing) { e.preventDefault(); look.forward(); return; }
        return;
      }

      /*
        UNDO IS REACHABLE FROM THE ANSWER BOX, AND NOT BY A LETTER.

        The reach is worth keeping and the comment that used to sit here made
        the case for it: grading a typed card advances to the next one, whose
        box takes focus on mount, so the moment you notice you hit the wrong
        key is a moment with the caret already inside a field. A shortcut that
        silently does nothing there is a shortcut nobody has, and typing is
        the mode this app opens in.

        What that comment got wrong is which keystrokes are safe. It allowed
        `u` while the box was still empty, on the argument that Estonian is
        full of u once there is anything typed. An empty box is where the
        *first* letter goes, and 46 entries in the shipped dictionary begin
        with one: `uks`, `uus`, `uni`, `ujuma`, `unustama`. A learner
        answering any of them undid the grade before it, lost the letter, and
        watched a card they had finished come back.

        So the reach is kept and the key is changed. A bare `u` is a letter
        wherever a field has focus and a shortcut everywhere else, and from
        inside the box undo is `Cmd`/`Ctrl` and `z`, which is the gesture
        everybody already has for taking something back and is a letter in no
        language. Only while the box is empty, so somebody who has typed
        something keeps the field's own undo for their own typing.
      */
      const startedAnswering = field !== null && field.value.length > 0;
      const takeItBack = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z";

      if (takeItBack && !startedAnswering && history.length > 0) {
        e.preventDefault();
        void undo();
        return;
      }

      /*
        `b` OPENS THE LOOK BACK, AND ONLY WHERE IT IS NOT A LETTER.

        This was written to reach from inside the answer box while that box
        was still empty, on the argument `u` makes above: the moment somebody
        wants the last word back is the moment just after it went, with focus
        already in the next card's box. That is where it costs most, because
        an empty box is exactly where the *first* letter of an answer is
        typed. Driven in a browser on a production card: pressing `b` opened
        the panel and swallowed the keystroke. 63 entries in the shipped
        dictionary begin with one, `buss`, `bussipilet`, `banaan`,
        `bensiin`, and a learner answering any of them met it every time.

        So it is a shortcut for the shapes where the keyboard is not typing
        Estonian: the flip, the choice and a first meeting. On a typed card
        the button in the footer is one press away and the letter is a letter.
      */
      if (e.key.toLowerCase() === "b" && !typing && look.seen.length > 0) {
        e.preventDefault();
        look.open();
        return;
      }

      if (e.key.toLowerCase() === "u" && !typing && history.length > 0) {
        e.preventDefault();
        void undo();
        return;
      }

      if (isAdvanceKey(e)) {
        // While the answer box has focus it owns both keys: a space belongs in
        // the answer, and Enter is the input's own "check this". React flushes
        // discrete events synchronously, so without this the *same* Enter would
        // be seen again here after the re-render — with the verdict already
        // set — and would grade the card before it had been read.
        if (typing) return;
        e.preventDefault();
        if (ask === "intro") { meetDone(); return; }
        if (ask === "type" && !verdict) { checkTyped(); return; }
        // A miss waits for its retype, which the answer box handles itself.
        if (ask === "type" && verdict) { if (!needsRetype && !retypeOk) void submit(verdict.suggestedRating); return; }
        // A right pick grades itself on a timer; a wrong one waits here.
        if (ask === "choice") { if (chosen && chosen !== card?.back) void submit(1); return; }
        if (!revealed) setRevealed(true);
        else void submit(3);
        return;
      }

      if (typing) return;
      if (ask === "intro") return;
      if (ask === "choice" && !chosen && card?.choices) {
        const n = Number(e.key);
        if (n >= 1 && n <= card.choices.length) {
          e.preventDefault();
          pickChoice(card.choices[n - 1]!);
        }
        return;
      }
      if (!revealed) return;
      // Only on a flip card, and only the two digits the buttons carry. On a
      // typed or picked card the mark has already been made, so a stray digit
      // must not overrule it: 4 used to grade any revealed card Easy, whatever
      // the app had just decided about the answer.
      if (ask !== "flip") return;
      const chosenGrade = SELF_GRADES.find((g) => g.key === e.key);
      if (chosenGrade) { e.preventDefault(); void submit(chosenGrade.rating); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answerShown, revealed, submit, finished, ask, verdict, checkTyped, chosen, card, pickChoice, meetDone, undo, history.length, needsRetype, retypeOk, look]);

  if (wasEmptyAtStart) {
    return (
      <Page title="Review" lead="Spaced repetition, timed to when you are about to forget.">
        {drillCase ? (
          <Empty
            title={`No ${drillCase.toLowerCase()} cards yet`}
            body="Tick 'Case form' when you add a word, or start a noun unit on the path."
            action={<ButtonLink href="/learn" variant="primary">Open the learning path</ButtonLink>}
          />
        ) : drillUnit ? (
          <Empty
            title="Nothing from this unit in your deck"
            body="Add the unit first and its words become cards you can drill here."
            action={<ButtonLink href={`/learn/${drillUnit}`} variant="primary">Open the unit</ButtonLink>}
          />
        ) : drillScan ? (
          <Empty
            title="Nothing from this page in your deck"
            body="The words are saved, they just have no cards yet. Add them and they turn up here."
            action={
              <ButtonLink href={`/scan/${drillScan.id}`} variant="primary">Open the page</ButtonLink>
            }
          />
        ) : totalCards === 0 ? (
          <Empty
            title="No cards yet"
            body="Start a unit on the path, or add words from the dictionary."
            action={<ButtonLink href="/learn" variant="primary">Open the learning path</ButtonLink>}
          />
        ) : (
          <Empty
            title="Nothing due, you're caught up"
            body={nextDue ?? (totalCards === 1
              ? "Your one card is scheduled for later."
              : `All ${totalCards} cards are scheduled for later.`)}
            action={<ButtonLink href="/learn/new" variant="primary">Learn new words instead</ButtonLink>}
          />
        )}
      </Page>
    );
  }

  /*
    WHAT THE "TOO COMPLICATED" BUTTON DID, DRAWN ONCE.

    Both screens below can be the one a press lands on: putting the last word
    of a session aside ends the session, so the note has to survive onto the
    summary or the press reads as a card that vanished. One expression rather
    than two copies, because the second copy is the one whose wording rots.
  */
  const asideNote = aside ? (
    <p className="mt-4 text-center text-sm" role="status" style={{ color: "var(--ink-2)" }}>
      {aside}{" "}
      <Link href="/words/mastery" className="underline" style={{ color: "var(--accent-deep)" }}>
        Bring it back
      </Link>
    </p>
  ) : null;

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const accuracy = done > 0 ? Math.round((correct / done) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <div className="pop-in text-center">
          <Mascot size={72} mood="cheer" className="float mx-auto" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            Session complete
          </h1>
          <p className="mx-auto mt-2 max-w-[46ch] text-base" style={{ color: "var(--ink-2)" }}>
            {drillCase
              ? <>{uiText("Tubli töö.", "Good work.")} That&rsquo;s the {drillCase.toLowerCase()} drill done. These cards still follow their normal schedule.</>
              : drillUnit
                ? <>{uiText("Tubli töö.", "Good work.")} That&rsquo;s this unit drilled. Its cards still follow their normal schedule.</>
                : drillScan
                  ? <>{uiText("Tubli töö.", "Good work.")} That&rsquo;s the whole page drilled. Its cards still follow their normal schedule.</>
                  : <>{uiText("Tubli töö.", "Good work.")} That&rsquo;s everything due right now.</>}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile value={done} label="Reviewed" tone="accent" />
          <StatTile value={`${accuracy}%`} label="Recalled" tone={accuracy >= 85 ? "mint" : "butter"} />
          <StatTile value={`${minutes}m`} label="Time" tone="sky" />
        </div>
        {/* A word put aside as the last card of a session ends it, so the note
            belongs here too: the one drawing is `asideNote`, because two
            wordings of what a press did is how the copy in one of them rots. */}
        {asideNote}
      {pendingOffline > 0 && (
          <p
            className="mt-4 rounded-[var(--r)] px-4 py-3 text-sm"
            style={{ background: "var(--hard-soft)", color: "var(--hard-ink)" }}
          >
            {pendingOffline} grade{pendingOffline === 1 ? "" : "s"} saved here while you were offline.
            They&rsquo;ll be sent the moment you&rsquo;re back online. You can close the tab.
          </p>
        )}
        <WayOut className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/practice" size="lg"><Zap size={15} aria-hidden /> Play a round</ButtonLink>
          <ButtonLink href="/learn/new" size="lg">Learn new words</ButtonLink>
          <ButtonLink href="/" variant="primary" size="lg">Back to Today</ButtonLink>
        </WayOut>
      </div>
    );
  }

  const remaining = queue.length - index;
  const progress = queue.length ? (index / queue.length) * 100 : 0;
  const frontLang = estonianSide(card.cardType, "front") ? "et" : "en";
  const backLang = estonianSide(card.cardType, "back") ? "et" : "en";

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 py-6 md:px-10 md:py-10">
      {/* The heading a session screen has no room to draw.

          These five screens are a progress bar, a card and four rating buttons,
          and there is nothing on them a title could be added to without taking
          space from the card. So they had no heading at all: somebody working
          down a page by its headings, or asking what this screen is, got
          nothing back, while the four modes that happen to have a title bar
          answered fine. The `Empty` and finished states of these same files
          already carry one, which is how the gap survived a sweep. */}
      <h1 className="sr-only">{title}</h1>
      <div className="mb-7 flex items-center gap-4">
        <EndSession />
        <div className="flex-1">
          <Meter pct={progress} label={`Session progress: ${index} of ${queue.length}`} height={10} />
        </div>
        <span
          className="tnum label-xs rounded-full px-2.5 py-1"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          {remaining} left
        </span>
      </div>

      {/* A look back stands in the round's place rather than over it: the card
          underneath must not be answerable while somebody is reading an older
          one, and one screen at a time is what every other step here does. */}
      {look.panel ? (
        <LookBackCard {...look.panel} />
      ) : (
      <div
        className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3" style={{ borderColor: "var(--rule-soft)" }}>
          <Chip tone="accent">{TYPE_LABEL[card.cardType] ?? card.cardType}</Chip>
          {card.isNew && <Chip tone="good">{card.intro?.isPhrase ? "New phrase" : "New word"}</Chip>}
          {drillCase && <Chip tone="hard">{drillCase.toLowerCase()} drill</Chip>}
          {drillScan && <Chip tone="sky">{drillScan.title}</Chip>}
          <div className="ml-auto flex items-center gap-1">
            {card.lemma && (
              <FullEntry lemma={card.lemma} />
            )}
            {/* The corner of the card, which is where somebody looks for this
                the moment a word turns out to be worth keeping. */}
            {card.lexemeId && (
              <StarWord
                lexemeId={card.lexemeId}
                starred={card.starred}
                label={card.lemma ?? card.front}
              />
            )}
            {/* And beside it, the other thing somebody wants to do with a word
                mid-card: keep it, or put it away. Both are about the word
                rather than about the answer, which is why they sit together
                and not among the rating keys. */}
            {card.lexemeId && (
              <TooComplicated
                key={card.lexemeId}
                lexemeId={card.lexemeId}
                label={card.lemma ?? card.front}
                context="/review"
                onDone={putAside}
              />
            )}
          </div>
        </div>

        <div
          key={`${card.id}-${revealed}`}
          className="pop-in flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-11 text-center md:min-h-[320px]"
          aria-live="polite"
        >
          {ask === "intro" && <MeetWord card={card} />}

          {ask !== "intro" && (
          <div className="flex items-center gap-2">
            <p
              lang={frontLang}
              className={
                // A gap-fill prompt is a whole sentence: at flashcard size it
                // wraps to four lines and stops being readable at a glance.
                card.cardType === "CLOZE"
                  ? "text-xl font-semibold leading-snug tracking-tight md:text-2xl"
                  : "text-3xl font-bold leading-tight tracking-tight md:text-4xl"
              }
              style={{ color: "var(--ink)" }}
            >
              {sizedBlank(card.front, card.back)}
            </p>
            {/* No audio on a gap-fill prompt: reading a sentence with a hole in
                it aloud is not a thing, and the reveal below plays the whole
                sentence once the answer is in. Not just `CLOZE`: a `CASE_FORM`
                or `CONJUGATION` front is a gap-fill sentence too now. */}
            {estonianSide(card.cardType, "front") && !isGap(card) && (
              <Speak text={card.lemma ?? card.front} />
            )}
          </div>
          )}

          {/*
            WHAT THE CARD IS ASKING, BEFORE WHAT IT IS CALLED.

            A `CASE_FORM` card's front is `tuba → milles? kus?` and its hint
            is `seesütlev · the inessive`, which is the naming rule this app
            follows and is two names and no instruction. A learner drove the
            flash round and reported that they could not tell what was being
            asked of them; the same is true here, on the daily path, and it is
            worth more here. So the plain sentence goes between the two: the
            question stays where it was, the name stays where it was, and
            somebody who has not met `seesütlev` yet can still answer the card.
          */}
          {(isGap(card) ? answerShown : !answerShown) && plainAsk(slotAsked(card)) && (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {plainAskLine(slotAsked(card))}
            </p>
          )}

          {meaning && !answerShown && <GapMeaning meaning={meaning} />}

          {/*
            AND THE GLOSS STAYS WHEREVER THE SENTENCE DID NOT TAKE ITS PLACE,
            WHILE THE WORD STAYS EITHER WAY.

            A marked line already says which word is wanted and says it in
            context, so printing `four` under `Let's meet at four.` is the
            same word twice. What it does not say is the Estonian headword,
            and this cue is `lemma, meaning` on two gap cards in three, so
            hiding the whole of it took `arst` off `Läksin ____ juurde.` and
            asked for the vocabulary as well as the form. `gapCue` is that
            rule: the gloss goes where the sentence took its place, the word
            never does, and an unmarked line keeps both.
          */}
          {cue && !answerShown && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>{cue}</p>
          )}

          {ask === "type" && !verdict && (
            <>
              {/*
                The one line that says being unable to answer is ordinary, on a
                word being asked for in writing for the first time. Above the
                box, because it is read while somebody is deciding whether to
                type anything at all. Once in a word's life: see
                `lib/copy/firstTry.ts` for why it is not under every box.
              */}
              {firstTry && (
                <p className="max-w-sm text-sm" style={{ color: "var(--ink-2)" }}>{FIRST_TRY_NOTE}</p>
              )}
              <div className="mt-2 w-full max-w-sm text-left">
                <label htmlFor="answer" className="label-xs mb-2 block" style={{ color: "var(--ink-3)" }}>
                  Type the answer
                </label>
                <EstonianInput
                  id="answer"
                  value={typed}
                  onChange={setTyped}
                  onEnter={checkTyped}
                  ariaLabel="Type your answer"
                  autoFocus
                  large
                />
              </div>
              <HintLadder
                ladder={ladder}
                taken={hints.taken}
                onTake={hints.take}
                open={hints.open && ask === "type"}
                label={card.lemma ?? card.front}
              />
            </>
          )}

          {ask === "type" && verdict && (
            <div className="w-full max-w-sm">
              <p
                className={`${verdict.verdict === "correct" ? "pop-in" : "shake"} ${VERDICT_CLASS[verdictOfCheck(verdict.verdict)]} verdict-panel`}
              >
                {verdict.verdict === "correct" ? uiText("Õige!", "Correct!") : verdict.note}
              </p>
              {typed.trim() && verdict.verdict !== "correct" && (
                <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
                  You typed <span lang={backLang}>{typed.trim()}</span>
                </p>
              )}
              {/*
                MARKED WRONG, AND THE LEARNER DISAGREES.

                The check is a string comparison against a form the dictionary
                vouches for, which is the right way round: no model decides
                whether somebody was right. What it cannot know is that the
                dictionary itself is wrong, or that Estonian has a second
                accepted form here, and the person who does know is looking at
                the screen at exactly this moment. Sending it does not change
                the grade they are about to give, which stays theirs.
              */}
              {verdict.verdict !== "correct" && (
                <div className="mt-3">
                  <SuggestFix
                    category="MARKED_WRONG"
                    categories={["MARKED_WRONG", "WRONG_MEANING", "WRONG_FORM"]}
                    lemma={card.lemma ?? card.front}
                    trigger={
                      `Asked: ${card.front}. Expected: ${card.back}. ` +
                      `Typed: ${typed.trim() || "nothing"}.`
                    }
                    label="I think that was right"
                  />
                </div>
              )}
              {verdict.verdict !== "correct" && (
                <div className="mt-4 text-left">
                  {retypeOk ? (
                    <p className={`pop-in ${VERDICT_CLASS.right} verdict-panel`}>
                      {uiText("Õige!", "Correct!")} That is the one.
                    </p>
                  ) : (
                    <>
                      <label htmlFor="retype" className="label-xs mb-2 block" style={{ color: "var(--ink-3)" }}>
                        Now type it again
                      </label>
                      <EstonianInput
                        id="retype"
                        value={retyped}
                        onChange={(v) => { setRetyped(v); setRetypeNote(null); }}
                        onEnter={checkRetype}
                        ariaLabel="Type the answer again"
                        autoFocus
                        large
                      />
                      {retypeNote && (
                        <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>{retypeNote}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {ask === "choice" && card.choices && !chosen && (
            <div className="mt-2 grid w-full max-w-md gap-2">
              {card.choices.map((choice, i) => (
                /*
                  `.choice-btn` and a tone through `--choice-bg`, like every
                  other option in the app. It painted its own background
                  inline, which is the fault that class's own comment names:
                  an inline style beats a class `:hover`, so the busiest
                  options in the app could never define one and moved under a
                  pointer without changing at all.
                */
                <button
                  key={choice}
                  type="button"
                  onClick={() => pickChoice(choice)}
                  className={`choice-btn ${struck.includes(choice) ? "line-through" : ""} flex items-center gap-3 rounded-[var(--r)] border px-4 py-3.5 text-left text-base font-medium`}
                  style={{
                    "--choice-bg": "var(--accent-soft)",
                    "--choice-border": "transparent",
                    color: struck.includes(choice) ? "var(--ink-3)" : "var(--accent-deep)",
                    boxShadow: "var(--shadow-sm)",
                  } as CSSProperties}
                >
                  <KeyCap>{i + 1}</KeyCap>
                  {choice}
                  {/*
                    Struck rather than removed, and still pressable. An option
                    that vanishes takes the rows under it up the screen while
                    somebody is reading them, and refusing the press would be
                    the app saying they are wrong before they have answered.
                  */}
                  {struck.includes(choice) && <span className="sr-only"> (ruled out by a hint)</span>}
                </button>
              ))}
            </div>
          )}

          {ask === "choice" && !chosen && (
            <HintLadder
              ladder={ladder}
              taken={hints.taken}
              onTake={hints.take}
              open={hints.open}
              label={card.lemma ?? card.front}
            />
          )}

          {ask === "choice" && chosen && (
            <div className="mt-2 grid w-full max-w-md gap-2">
              {card.choices?.map((choice) => {
                const state = optionState(choice === card.back, choice === chosen);
                return (
                  <div
                    key={choice}
                    className={`${OPTION_CLASS[state]} flex items-center gap-3 rounded-[var(--r)] border px-4 py-3.5 text-left text-base font-medium`}
                  >
                    <span className="flex-1">{choice}</span>
                    {state === "right" && <Check size={16} aria-label="Right" />}
                    {state === "wrong" && <X size={16} aria-label="Your pick" />}
                  </div>
                );
              })}
            </div>
          )}

          {revealed && ask !== "choice" && (
            <>
              <div className="my-1 h-1 w-14 rounded-full" style={{ background: "var(--accent-soft)" }} />
              {isGap(card) ? (
                /* A gap-fill is answered by a word but *learned* as a sentence,
                   so the reveal puts the word back where it came from and reads
                   the whole thing aloud. Not just `CLOZE`: a `CASE_FORM` or
                   `CONJUGATION` card is drilled in a sentence too now (see
                   CLAUDE.md, "A case is drilled in a sentence that uses it"),
                   and a learner who cannot read that sentence has no context
                   for the answer, only its isolated gloss. */
                <div className="flex flex-col items-center gap-2">
                  <p lang="et" className="text-xl leading-snug md:text-2xl" style={{ color: "var(--ink)" }}>
                    {card.front.split(BLANK)[0]}
                    <span data-answer style={{ color: "var(--accent-deep)", fontWeight: 600 }}>{card.back}</span>
                    {card.front.split(BLANK)[1]}
                  </p>
                  <Speak text={card.front.replace(BLANK, card.back)} label="Hear the whole sentence" autoplay />
                  <SentenceTranslation
                    key={card.front}
                    lexemeId={card.lexemeId}
                    et={card.front.replace(BLANK, card.back)}
                    en={card.sentenceEn}
                    canTranslate={card.canTranslate}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p
                    lang={backLang}
                    data-answer
                    className="text-2xl font-bold md:text-3xl"
                    style={{ color: "var(--accent-deep)" }}
                  >
                    {card.back}
                  </p>
                  {/* The answer, read aloud as it appears. On a typed card
                      this is the correction; on a flip it is the word you
                      were trying to recall, said properly. */}
                  {estonianSide(card.cardType, "back") && <Speak text={spoken(card.back)} autoplay />}
                </div>
              )}

              {/* Turning the answer over and finding the question is a card
                  that looks broken. It is a real fact about the word, so it is
                  said in words. */}
              {answerShown && sameSpelling(card.front, card.back) && (
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>{SAME_SPELLING}</p>
              )}

              {card.hint && <p className="text-xs" style={{ color: "var(--ink-3)" }}>{card.hint}</p>}
            </>
          )}

          {/* A first meeting carries these too. "What is the kaasaütlev?" is a
              question somebody has the moment they first see one, and the
              screen that introduces the form is the obvious place to answer
              it. */}
          {(revealed || chosen || ask === "intro") && <WhyRow card={card} />}
        </div>

        <div className="border-t px-6 py-4" style={{ borderColor: "var(--rule-soft)" }}>
          {/*
            WHO DECIDES WHETHER THE ANSWER WAS RIGHT.

            Four buttons used to sit here on every card in the app, and on most
            of them they were asking a question the app had already answered.
            `checkAnswer` compares what was typed against a form the dictionary
            vouches for and returns the rating to use; a multiple choice is
            right or it is not. The screen took that verdict, drew a ring round
            one of the four buttons, and waited for somebody to press it anyway.

            So the rule is: the app marks what it can mark, and the learner is
            asked only about what it cannot. A flip card is the one shape with
            nothing to compare, and there it is two buttons rather than four,
            because "how well did that go" has two honest answers and the middle
            two were guesses about a scheduler nobody can see.

            RATINGS still carries all four values and `submit` still takes any
            of them: the log, undo and the offline replay are unchanged, and
            Hard is still what a near miss is graded. What went is the asking.
          */}
          {ask === "intro" ? (
            <Button variant="primary" size="lg" className="w-full" onClick={meetDone} disabled={busy}>
              Got it, ask me later
              <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : ask === "type" && !verdict ? (
            <Button variant="primary" size="lg" className="w-full" onClick={checkTyped}>
              Check
              <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : ask === "type" && verdict ? (
            /* Marked already. A clean hit takes itself away (see `checkTyped`),
               so what reaches here is a miss, and a miss is the one moment in a
               review worth slowing down for: the correction is on screen, the
               form has to be typed once more, and this button checks that
               rather than grading anything. */
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={needsRetype ? checkRetype : () => void submit(verdict.suggestedRating)}
              disabled={busy || retypeOk}
            >
              {needsRetype ? "Check it again" : "Got it, next"}
              <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : ask === "choice" && !chosen ? (
            <p className="text-center text-xs" style={{ color: "var(--ink-3)" }}>
              Pick the meaning · keys 1 to {card.choices?.length ?? 4}
            </p>
          ) : ask === "choice" && chosen === card.back ? (
            <p className="text-center text-sm font-semibold" style={{ color: "var(--good-ink)" }}>{uiText("Õige!", "Correct!")}</p>
          ) : ask === "choice" ? (
            /* Picked the wrong one. Nothing to grade: the right answer is on
               the screen and the card comes back later in this session. */
            <Button variant="primary" size="lg" className="w-full" onClick={() => void submit(1)} disabled={busy}>
              Got it, next
              <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : !revealed ? (
            <Button variant="primary" size="lg" className="w-full" onClick={() => setRevealed(true)}>
              Show answer
              <KeyCap className="ml-1">{ADVANCE_KEY_GLYPH}</KeyCap>
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {SELF_GRADES.map((g) => (
                <button
                  key={g.rating}
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(g.rating)}
                  /* No `-translate-y` on hover: the buttons sit in a `gap-2.5`
                     grid and a hover that moves the box up loses contact with a
                     pointer resting near its lower edge, which un-hovers it,
                     which undoes the shift. `scale` grows the box from its own
                     centre and can only gain area under the pointer. The
                     interval preview under the label went the same way: how
                     many minutes the scheduler adds is a question about a
                     scheduler nobody can see, put to somebody trying to learn
                     Estonian. */
                  className={`${VERDICT_CLASS[verdictOfRating(g.rating)]} press flex items-center justify-center rounded-[var(--r)] px-2 py-3.5 transition-ui hover:scale-[1.02] disabled:opacity-40`}
                >
                  <span className="text-base font-bold">{g.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs" style={{ color: "var(--ink-3)" }}>
        <span className="flex items-center gap-1"><Check size={12} aria-hidden style={{ color: "var(--good-ink)" }} /> {correct} recalled</span>
        <span className="flex items-center gap-1"><RotateCcw size={12} aria-hidden /> {done} graded</span>
        <LookBackButton {...look.button} disabled={busy || look.looking} />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void undo()}
          /*
            AND IT STANDS DOWN WHILE A LOOK BACK IS OPEN, LIKE ITS OWN KEY.

            The keydown handler has refused `u` and `⌘Z` there since the panel
            was built, so the button beside it staying live was the control
            disagreeing with the shortcut printed on its own cap. What it
            would do is worse than the inconsistency: undo rewinds the *last*
            grade, which on a learner three cards back is not the card they
            are reading, so the one thing they can see is the panel vanishing
            under their hand. The round is not on the screen, so neither is
            the way to change it: the way out is the button that says so.

            DRAWN THE SAME WAY AS "SEE IT AGAIN" BESIDE IT, for the reason
            that button now is: two controls doing the same quiet job in one
            footer row should not read as one real button next to a bare
            line of tinted text.
          */
          disabled={history.length === 0 || busy || look.looking}
        >
          {/* The cap names the key that works on the card in front of you:
              `u` is a letter while a box has focus, so a typed card carries
              the gesture that is not one. Same rule as the hint beside it. */}
          <Undo2 size={13} aria-hidden /> Undo <KeyCap>{ask === "type" ? "⌘Z" : "U"}</KeyCap>
        </Button>
        <span className="hidden items-center gap-1 md:flex">
          <Keyboard size={12} aria-hidden />
          {/* Mirrors the footer button's own branches, so the hint cannot promise a
              key the card in front of you does not answer to. It had two arms for
              four shapes, which told anyone on a multiple-choice card to press
              Space to flip and 1-4 to grade, where nothing flips and 1-4 picks
              an option instead. */}
          {ask === "intro"
            ? `${ADVANCE_KEY_LABEL} for the next one`
            : ask === "type"
              ? (verdict ? (needsRetype ? `Type it again, then ${ADVANCE_KEY_LABEL}` : `${ADVANCE_KEY_LABEL} to carry on`) : `${ADVANCE_KEY_LABEL} to check`)
              : ask === "choice"
                ? (chosen ? `${ADVANCE_KEY_LABEL} to carry on` : `1 to ${card?.choices?.length ?? 4} to pick`)
                : !revealed
                  ? `${ADVANCE_KEY_LABEL} to flip`
                  : "1 not yet · 2 got it"}
        </span>
      </div>

      {asideNote}
      {pendingOffline > 0 && (
        <p className="mt-3 text-center text-xs" style={{ color: "var(--hard-ink)" }}>
          You&rsquo;re offline. {pendingOffline} grade{pendingOffline === 1 ? "" : "s"} saved here, sent once you reconnect.
        </p>
      )}
      {verdict && countsAsRecalled(verdict.verdict) && verdict.verdict !== "correct" && (
        <p className="sr-only" role="status">Close: {verdict.note}</p>
      )}
    </div>
  );
}
