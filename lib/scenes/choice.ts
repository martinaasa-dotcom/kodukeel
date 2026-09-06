/**
 * WHEN A PERSON CANNOT UNDERSTAND YOU, THEY OFFER YOU A CHOICE.
 *
 * Asking the same question a third time is what a machine does. What a person
 * at a counter does, once it is clear the words are not landing, is narrow it
 * to two: "poodi voi kooli?", "valu voi palavik?". It is the single most
 * human repair move there is, and it is the one this module was missing: the
 * conversation had a way to say "I did not catch that" and a way to give up,
 * and nothing in between except asking again in the same words.
 *
 * It is worth more than the English hint beside it, and for a reason that is
 * about learning rather than about tone. A choice is **recognition** where the
 * beat wanted production, which is the step down a teacher takes when
 * production is not coming, and it stays in Estonian and in character. So the
 * other side tries this first and the app steps out of character only where no
 * choice can be built (`lib/scenes/coach.ts`).
 *
 * NOTHING HERE IS WRITTEN. Every option is a lemma the beat itself names or a
 * form read off `Lexicon.caseForm`, which is the same table every case card in
 * the app reads; the word between them is the course's own `voi`, taught by a
 * unit every scene declares. A part the dictionary cannot supply withholds the
 * whole line, which is `datumLine`'s rule and for its reason: half a choice is
 * worse than none.
 *
 * AND IT IS NOT A GIVEAWAY, THOUGH IT IS HELP. Two options is a coin toss on
 * the word and no help at all on the ending, which is what a case beat is
 * drilling; a learner who takes the offered word still has to inflect it. The
 * grades already read a beat met after two attempts as `Hard` rather than
 * `Good`, so nothing here has to be told about it.
 *
 * Pure: no React, no Next, no Prisma, no network, no clock.
 */
import { caseKeyFor, type Lexicon } from "./lexicon";
import { propBySlot, type RoleCard } from "./props";
import { leafNeeds, type BeatSpec } from "./types";

/**
 * The word between the two options.
 *
 * A lemma the course teaches, like every other Estonian word this module
 * names, and `catalogue.test.ts` checks it against the units every scene
 * declares along with the reactions.
 */
export const CHOICE_WORD = "või";

/** How many options a narrowed question offers. Two: more is a list, not a choice. */
const OPTIONS = 2;

export interface ChoiceInput {
  readonly beat: BeatSpec;
  readonly card: RoleCard | null;
  readonly lexicon: Lexicon;
  /**
   * The values a word-shaped prop could have dealt, so a `datum` beat can
   * offer the card's own value against another one the scene might have
   * dealt. Absent where the scene deals no words for that slot.
   */
  readonly dealt?: ReadonlyMap<string, readonly string[]>;
  /**
   * Which way round to print them. Anything stable across a re-render will do,
   * and the turn count is what the route has: a choice that flipped every time
   * the transcript was replayed would move under a learner reading it.
   */
  readonly roll: number;
}

/** The narrowed question, or null where the beat has no two options to offer. */
export function choiceOf(input: ChoiceInput): string | null {
  const options = optionsFor(input);
  if (options.length < OPTIONS) return null;
  const [first, second] = input.roll % 2 === 0 ? options : [options[1]!, options[0]!];
  const line = `${first} ${CHOICE_WORD} ${second}`;
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}?`;
}

/**
 * Two spellings to choose between, the right one among them.
 *
 * The first requirement that can supply a pair, which keeps the question about
 * one thing: a beat wanting a word and a case of it is narrowed on the word,
 * because that is the half a learner who has said nothing usable is missing.
 */
function optionsFor(input: ChoiceInput): string[] {
  const { beat, card, lexicon } = input;
  for (const { need } of leafNeeds(beat.needs)) {
    if (need.kind === "lemma") {
      /*
        Any of a beat's own words is a right answer, so both options are true
        and the learner cannot be caught out by taking either.
      */
      const said = need.oneOf.filter((lemma) => lexicon.byLemma.has(lemma)).slice(0, OPTIONS);
      if (said.length === OPTIONS) return said;
      continue;
    }
    if (need.kind === "case") {
      /*
        The form the beat wants against another case of the same word, which
        is the confusion the beat is about and the pool `caseFormChoices`
        draws from on a card. Read off the table rather than derived, and a
        spelling that also counts as the wanted case is never the wrong one,
        or the learner would be marked wrong for the other true answer.
      */
      const wanted = lexicon.caseForm.get(caseKeyFor(need.lemma, need.grammCase));
      if (!wanted) continue;
      const accepted = lexicon.byCase.get(caseKeyFor(need.lemma, need.grammCase));
      const other = otherForm(lexicon, need.lemma, wanted, accepted);
      if (other) return [wanted, other];
      continue;
    }
    if (need.kind === "datum") {
      const prop = card ? propBySlot(card, need.slot) : undefined;
      const drawn = prop?.lemmas[0];
      if (!drawn) continue;
      const rival = (input.dealt?.get(need.slot) ?? []).find((lemma) => lemma !== drawn);
      if (!rival) continue;
      const say = (lemma: string) => (need.grammCase
        ? lexicon.caseForm.get(caseKeyFor(lemma, need.grammCase))
        : lemma);
      const mine = say(drawn);
      const theirs = say(rival);
      if (mine && theirs) return [mine, theirs];
    }
  }
  return [];
}

/** Another case of the word, spelled differently and not itself a right answer. */
function otherForm(
  lexicon: Lexicon,
  lemma: string,
  wanted: string,
  accepted: ReadonlySet<string> | undefined,
): string | null {
  const prefix = `${lemma}|`;
  for (const [key, form] of lexicon.caseForm) {
    if (!key.startsWith(prefix)) continue;
    if (form === wanted || accepted?.has(form)) continue;
    return form;
  }
  return null;
}
