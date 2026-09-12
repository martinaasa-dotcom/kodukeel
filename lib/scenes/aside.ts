/**
 * What the other side says about a question the scene did not anticipate.
 *
 * A learner told `Minge otse edasi.` who writes `okei, otse, ja kuhu siis?`
 * has asked a question the beat did not ask for, and the first version of
 * this module walked straight past it to the next move. That is the machine
 * showing through: a person caught off guard by a question still answers it,
 * as best they can from what they know, and then gets back to what they were
 * doing. This is the "as best they can", said once, and it is a ladder like
 * the one for a beat's own line, cheapest and surest first:
 *
 *   1. the beat's own answer  where the beat asked for the question, the
 *                             bank holds what they say (`answer:<beat>`),
 *                             written against the beat's own `answer` line
 *   2. how are you            `Hästi, aitäh.`, because that is the answer
 *   3. a fact off the card    "when?" gets the day and the time the run dealt
 *   4. more about it          another line for the beat they just spoke, so
 *                             "and where then?" gets the rest of the directions
 *   5. a model                one line inside the list, gated, in the route
 *   6. don't know             `Ei tea.`, which is what a stranger says
 *
 * WHAT IT MAY WRITE. Nothing. Every rung is a line the dictionary already
 * vouches for: the course's own phrases as parts (`ASIDES`), a case form off
 * `Lexicon.caseForm`, a line drafted and gated for the beat, or a line the
 * route composed and gated. The one verb form in it, `tea` after `ei`, is
 * the derived negative of `teadma` and is withheld whole where the rule
 * cannot reach it. A question this cannot answer is answered with the fifth
 * rung rather than with silence, because silence is the one thing a person
 * never does with a question.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import { ASIDES } from "./catalogue";
import type { SpokenLine } from "./line";
import { caseKeyFor, type Lexicon } from "./lexicon";
import { priceOnCard, type RoleCard } from "./props";
import { partsLine } from "./reply";
import { leafNeeds, type BeatSpec, type MoveKind } from "./types";

export interface AsideInput {
  /** The question word the learner used, or `?` for a bare mark. Null where nothing was asked. */
  readonly asked: string | null;
  /** Every lowercased word of the learner's turn. */
  readonly spoken: readonly string[];
  /**
   * The turn as typed, for the one question `spoken` cannot carry: `5?` is
   * somebody checking the price and holds no letters at all. Absent on a
   * caller that has not kept it, and then a bare mark is a bare mark.
   */
  readonly said?: string;
  /** The beat the turn was read against, whose line the question is probably about. */
  readonly answered: BeatSpec | null;
  readonly card: RoleCard | null;
  readonly lexicon: Lexicon;
  /** Lines this run has not yet said for the answered beat, best first. */
  readonly more: readonly string[];
  /**
   * The beat's own banked answers (`answer:<beat>`), where the beat asked
   * the learner for a question: "ask whether it is near" is met by a
   * question and this is what answers it. Empty where the beat wanted no
   * question or the bank has nothing for it.
   */
  readonly answers: readonly string[];
  /**
   * Whether the question came on a turn that missed the beat. Then only a
   * fact can answer it: the bank's answer and "more of what they said" are
   * both about a beat the learner has not met, and stacking either on the
   * question said again is two questions. A fact off the card is one
   * sentence, and it is the one a learner who asked the price was owed.
   */
  readonly missed?: boolean;
}

/** Question words that ask about a place, a time, a price. Keys, not vocabulary. */
const PLACE = new Set(["kus", "kuhu", "kust"]);
const TIME = new Set(["millal"]);
const HOW = new Set(["kuidas"]);
/**
 * The words a question about money is made of, as lemma requests against
 * `ostmine` and `kusisonad`: `kui palju`, `mis hind`, `maksab`, `eurot`.
 * Resolved through the scene's own lexicon, so nothing here is a form.
 */
const MONEY = ["hind", "maksma", "euro"] as const;
const HOW_MUCH = ["palju", "mitu"] as const;

/**
 * Moves on which the other side was giving information, so "more" is more of
 * it. A question after a greeting or after they asked something is not
 * answered with a second greeting.
 */
const INFORMING: ReadonlySet<MoveKind> = new Set(["instruct", "offer", "confirm", "refuse", "correct"]);

/**
 * The aside, or null where the route should try a model and then the shrug.
 * `shrug` is what to say when both of those have nothing.
 */
export function asideFor(input: AsideInput): SpokenLine | null {
  if (!input.asked) return null;
  const { asked, spoken, answered, card, lexicon } = input;

  /*
    The beat asked for this question, so the answer is the beat's own and
    was written for it. First, because it is the one rung that knows what
    was asked rather than guessing from the question word.
  */
  if (answered && wantsQuestion(answered) && !input.missed) {
    const banked = input.answers[0];
    /*
      AND WHERE THE BANK HOLDS NONE, THIS RETURNED NOTHING AND SAID NOTHING
      WAS OWED, WHICH IS HOW A QUESTION CAME TO BE IGNORED.

      The argument was that the next move is the answer, which is how "where
      is the station?" is answered by the directions rather than by a shrug.
      That is true of four of the eleven beats whose goal is to ask something
      and false of the rest, and nothing checked which: at a job interview the
      learner was told to ask about the pay, asked, and was answered with the
      next question, three times, while they insisted. They reported it as the
      app leaving them hanging, and it is.

      So the scene says which it is (`answeredNext`), and where it does not,
      a question with nothing banked falls through to the rungs below and then
      to the model and the shrug (`asideOwed`). Silence is the one thing
      nobody does with a question.
    */
    if (banked) return { text: banked, provenance: "scripted" };
    if (answered.answeredNext) return null;
  }

  /*
    "Kuidas läheb?" is the one question everybody can answer, and the answer
    is two course words. Read as the question word beside a form of `minema`,
    since `Kuidas?` on its own is somebody asking to hear it again.
  */
  const goes = lexicon.byLemma.get("minema");
  if (HOW.has(asked) && goes && spoken.some((w) => goes.has(w))) {
    return partsLine(ASIDES.howAreYou, { lexicon, mark: ".", join: ", " });
  }

  /*
    THE PRICE, WHICH IS THE ONE FACT A QUESTION ABOUT MONEY IS ASKING FOR.

    "Kui palju?" at a ticket window was answered `Ei tea.`, because nothing
    on the card held an amount and nothing could say one. A scene that deals
    a price says it here, and the card handed in is the one in play, so once
    the price curveball has been raised the answer is the new price rather
    than the one the learner was told (`cardAfterHurdles`). The line is parts
    off the card and the dictionary's case table, and it is withheld whole
    where a part is missing, like every other line said off the card.
  */
  if (asksPrice(spoken, lexicon) || (asked === "?" && /\d/.test(input.said ?? ""))) {
    const price = priceOffCard(card, lexicon, input.said ?? "");
    if (price) return price;
  }

  /*
    A fact off the card. "When?" is answered with the day and the time this
    run dealt, in the shape an offer already takes: the weekday in the
    adessive off the case table, and the clock time as the card spells it.
    Only where the card holds one, and then whole.
  */
  if (TIME.has(asked) || (asked === "mis" && spoken.includes("kell")) || spoken.includes("kell")) {
    const when = whenOffCard(card, lexicon);
    if (when) return when;
  }

  /*
    More about what they just said. A question straight after directions, an
    offer or a refusal is nearly always about them, and the bank usually holds
    a second line for the beat: "and where then?" gets "Otse edasi ja siis
    vasakule, see on lähedal." A place question in particular; a bare `?` or
    a `mis` too, since those are "sorry, what?" as often as anything.
  */
  const about = answered && INFORMING.has(answered.move) && !input.missed;
  if (about && (PLACE.has(asked) || asked === "?" || asked === "mis" || asked === "kuidas")) {
    const next = input.more[0];
    if (next) return { text: next, provenance: "scripted" };
  }

  return null;
}

/**
 * Whether a question on this turn is owed an answer nothing else supplies,
 * so the route should ask a model and, failing that, shrug. False only where
 * something has already answered it: the beat says the next move does
 * (`answeredNext`), or the bank held a line and the rung above said it.
 */
export function asideOwed(input: AsideInput): boolean {
  if (!input.asked) return false;
  /*
    A beat that says the next move answers it owes nothing, and one that
    wanted the question and has an answer banked has already said it. Every
    other question is owed something, including one on a beat that asked for
    it and whose bank came up empty, which is the case that used to be
    answered with nothing at all.
  */
  const beat = input.answered;
  if (beat && wantsQuestion(beat) && (beat.answeredNext || input.answers.length > 0)) return false;
  return true;
}

function wantsQuestion(beat: BeatSpec): boolean {
  return leafNeeds(beat.needs).some(({ need }) => need.kind === "question");
}

/** `Ei tea.`, off the course: what a stranger says to a question they cannot answer. */
export function shrug(lexicon: Lexicon): SpokenLine | null {
  return partsLine(ASIDES.unknown, { lexicon, mark: "." });
}

/** Whether the turn asks what something costs: a money word, or "how much/many". */
export function asksPrice(spoken: readonly string[], lexicon: Lexicon): boolean {
  const said = new Set(spoken);
  for (const lemma of MONEY) {
    for (const form of lexicon.byLemma.get(lemma) ?? []) if (said.has(form)) return true;
  }
  return HOW_MUCH.some((word) => said.has(word));
}

/**
 * `See maksab 5 eurot.`, off the card. The verb and the unit are lemma
 * requests the scenes that deal a price all teach (`ostmine`, `asesonad`),
 * and the shorter `5 eurot.` stands in where the lexicon cannot supply the
 * longer one, so a thin lexicon costs a verb and never the answer.
 */
export function priceOffCard(card: RoleCard | null, lexicon: Lexicon, said = ""): SpokenLine | null {
  const price = priceOnCard(card);
  if (!price) return null;
  const unit = { lemma: "euro", grammCase: "PARTITIVE" as const };
  const line = partsLine([{ lemma: "see" }, { lemma: "maksma", verb: "IndPrSg3" }, { slot: price.slot }, unit], { card, lexicon, mark: "." })
    ?? partsLine([{ slot: price.slot }, unit], { card, lexicon, mark: "." })
    ?? partsLine([{ slot: price.slot }], { card, lexicon, mark: "." });
  if (!line) return null;
  /*
    A PRICE THE LEARNER NAMED IS ANSWERED YES OR NO. `Kas 5 eurot?` and `5?`
    are somebody checking what they heard, and a person says "jah" or "ei,
    see maksab 2 eurot" rather than stating the price as though nothing had
    been asked. The digit runs are compared whole, as the marker compares a
    dealt number, so `15` is not `5`. Both words are the course's own and the
    price line is the same one, lowercased into the second half.
  */
  const runs: readonly string[] = said.match(/\d+/g) ?? [];
  if (runs.length === 0) return line;
  const word = runs.includes(price.value) ? "jah" : "ei";
  const yes = partsLine([{ lemma: word }], { lexicon, mark: "." });
  if (!yes) return line;
  return { ...line, text: `${yes.text.slice(0, -1)}, ${line.text.charAt(0).toLowerCase()}${line.text.slice(1)}` };
}

function whenOffCard(card: RoleCard | null, lexicon: Lexicon): SpokenLine | null {
  if (!card) return null;
  const pieces: string[] = [];
  const day = card.props.find((prop) => prop.theirs && prop.lemmas.length > 0);
  if (day) {
    const form = day.lemmas[0] ? lexicon.caseForm.get(caseKeyFor(day.lemmas[0], "ADESSIVE")) : undefined;
    if (form) pieces.push(form);
  }
  const time = card.props.find((prop) => /^\d{1,2}:\d{2}$/.test(prop.value));
  if (time && lexicon.byLemma.has("kell")) pieces.push(`kell ${time.value}`);
  if (pieces.length === 0) return null;
  const text = pieces.join(" ");
  return { text: `${text.charAt(0).toUpperCase()}${text.slice(1)}.`, provenance: "attested", from: day?.lemmas[0] ?? "kell" };
}
