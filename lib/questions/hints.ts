import { LEECH_LAPSES } from "@/lib/analysis/leeches";

/**
 * THE WAY OUT OF BEING STUCK, AND WHY IT COSTS SOMETHING.
 *
 * A learner drove the Learn ladder, met a word for the first time, was asked to
 * write it, and had nothing to do but guess or leave. Guessing is right and the
 * app should say so; leaving is what actually happens on the second miss, and
 * what it leaves behind is somebody who has decided the app is above them. The
 * scenes module reached this conclusion first and wrote it down in
 * `lib/scenes/coach.ts`: two people reported a conversation that kept refusing
 * them and both used the same words, that it makes you feel stupid. A
 * conversation could answer that by stepping out of character. Every other
 * screen in the app could not answer it at all.
 *
 * So there is a hint, everywhere somebody has to produce an answer, and it is a
 * ladder rather than a button that hands over the word. Each press says a
 * little more than the last, and the learner decides how far down it they need
 * to go.
 *
 * NOTHING HERE IS WRITTEN AND NOTHING HERE IS ESTONIAN. Every character a hint
 * puts on the screen is a character of the answer the caller was already
 * holding, which came from Ekilex or from the app's own derivation off a stored
 * stem, and the only thing this module does to it is decide which of its letters
 * to cover up. That is `buildCloze`'s standing exactly (ADR-005): hiding part of
 * a form a lexicographer wrote is not writing one. The English around it is
 * authored, which is the one language this project writes.
 *
 * A HINT IS PAID FOR, AND THE PRICE IS THE SCHEDULER HEARING ABOUT IT. This is
 * the half worth arguing with, so here is the argument. `npm run audit:decks`
 * exists because a card whose answer is printed in its own question is a card
 * nobody can fail: the learner reads the answer off the screen, the log records
 * a recall, the interval stretches, and the slot is spent for ever. A hint is
 * that fault made deliberate, and the only thing that stops it being the same
 * fault is that the grade says so. So a hint that narrows caps the grade at
 * Hard, and the rung that spells the answer out caps it at Again. Neither is a
 * punishment: Hard means the word comes back sooner, which is exactly what
 * should happen to a word somebody needed help with, and `lib/scenes/coach.ts`
 * already grades a handed-over word `Again` for the same reason. `RATINGS` and
 * the scheduler are untouched; which of the four a round sends is the round's
 * own decision (ADR-016).
 *
 * THE LETTERS ARE UNCOVERED FROM THE END FIRST, WHICH IS A FACT ABOUT ESTONIAN
 * RATHER THAN A CHOICE ABOUT PUZZLES. `/grammar/build-a-word` teaches the one
 * claim this course rests on: eleven cases are the second stored form with a
 * fixed ending on it, the same ending for every word there is. The ending is the
 * half a rule gives you and the stem is the half you have to have memorised
 * (`tuba` goes to `toa`, `aeg` to `aja`), so handing over the ending is the mild
 * hint and handing over the stem is the strong one. A word with no stem behind
 * it, which is every English gloss and every phrase, has no ending rung and is
 * uncovered from the front instead.
 *
 * Pure: no React, no Prisma, no clock, no Estonian of its own.
 */

/** What a rung of the ladder gives away. */
export type HintKind = "shape" | "ending" | "start" | "more" | "answer";

export interface Hint {
  kind: HintKind;
  /** What this rung is offering, in English. A label, not a sentence. */
  label: string;
  /**
   * The answer with some of its letters still covered.
   *
   * Every letter in it is the answer's own. A space, a hyphen and a full stop
   * are never covered, because covering them says nothing and a learner
   * counting blanks through a phrase is counting the wrong thing.
   */
  shown: string;
  /**
   * The highest rating a round may still send once this rung has been taken.
   *
   * 2 (Hard) for a rung that narrows, 1 (Again) for the rung that spells it
   * out. See the header: the point is that the log says the retrieval was
   * helped, so the word comes back sooner rather than being written down as
   * something the learner produced unaided.
   */
  ceiling: 1 | 2;
}

/** The character a covered letter is drawn as. `buildCloze` already uses it. */
export const COVER = "_";

/**
 * How many misses on one word before the hint is offered.
 *
 * One, which is the learner's own wording: the second go around the same word.
 * Not nought, because a hint on the first ask answers the question before
 * anybody has had a go at it, and having a go is the whole thing this is here
 * to protect. Not two, because most rounds requeue a missed card once and a
 * hint that arrived on the third ask would arrive after the round had moved on.
 *
 * `lib/scenes/coach.ts` sits at two for a reason that does not apply here: a
 * beat is asked two or three times inside one conversation, so its second miss
 * is mid-round, where a card's second miss is a second sitting with the card.
 */
export const HINT_AFTER_MISSES = 1;

/**
 * Whether the hint is offered at all.
 *
 * Either the learner has already missed this word in this sitting, or the card
 * arrived carrying enough lapses that the clinic already calls it a word they
 * keep failing. The second door matters: a leech met fresh tomorrow morning is
 * demonstrably a struggle, and making somebody miss it once more before the
 * app will help is the app knowing something and sitting on it.
 *
 * `LEECH_LAPSES` is imported rather than restated, because "this word is one
 * they keep failing" is one fact and two copies of it drift.
 */
export function hintsOpen(missesThisSitting: number, lapses = 0): boolean {
  return missesThisSitting >= HINT_AFTER_MISSES || lapses >= LEECH_LAPSES;
}

/** What is being asked, in the shape a ladder can be built from. */
export interface HintAsk {
  /**
   * The answer, spelled as the dictionary holds it.
   *
   * Where a slot genuinely has two right spellings the caller passes the one it
   * prints, which is `shownForms`' lead. A ladder over both would cover two
   * words at once and count letters that belong to neither.
   */
  answer: string;
  /**
   * Every form the caller knows the answer might be built on.
   *
   * A list rather than one stem, and that is what makes this wirable into
   * twenty rounds rather than five. A round holds different things depending on
   * what it is: the deck holds a card and no stems at all, the conjugation
   * drill holds a stored first person, a case card's page holds the whole of
   * `stemsFrom`. Asking each of them to work out which single form is "the
   * stem" is asking twenty screens to agree about Estonian morphology, which is
   * the shape of fault this app keeps finding in itself. So a caller hands over
   * whatever it has, nulls and all, and the longest one that really is a proper
   * prefix of the answer wins.
   *
   * Empty is an ordinary answer rather than a gap. A gloss has no stem, a
   * phrase has no stem, and a stored form nothing derived has none either, and
   * in every one of those the ladder uncovers from the front instead.
   */
  stems?: readonly (string | null | undefined)[];
  /**
   * The ending the app's own table says this slot adds, where the ask is about
   * a case: `CASES`' own `suffix`, which is `s` for the seesütlev and `ga` for
   * the kaasaütlev.
   *
   * The other half of the same question as `stems`, and worth having because a
   * round usually knows which case it asked and often does not hold the word's
   * principal parts. It is checked against the answer rather than trusted: the
   * short illative is stored rather than built, so `tuba` goes to `tuppa`,
   * which does not end in `sse`, and no ending is claimed about it. The three
   * principal parts add nothing, so their empty suffix says nothing either.
   */
  suffix?: string | null;
}

/** Whether a character is a letter, which is the only kind a hint covers. */
function isLetter(ch: string): boolean {
  return /\p{L}/u.test(ch);
}

/**
 * The answer with all but the named letters covered.
 *
 * `first` and `last` count *letters* rather than characters, so a phrase's
 * spaces and its exclamation mark are outside the arithmetic and stay on the
 * screen. Without that, `Head aega!` uncovered two characters and the learner
 * was shown a space.
 */
function cover(answer: string, first: number, last: number): string {
  const letters: number[] = [];
  for (let i = 0; i < answer.length; i += 1) if (isLetter(answer[i] ?? "")) letters.push(i);
  const shown = new Set<number>();
  for (let i = 0; i < first && i < letters.length; i += 1) shown.add(letters[i] as number);
  for (let i = 0; i < last && i < letters.length; i += 1) shown.add(letters[letters.length - 1 - i] as number);
  return [...answer]
    .map((ch, i) => (!isLetter(ch) || shown.has(i) ? ch : COVER))
    .join("");
}

/** How many letters an answer has, which is what every rung counts in. */
function letterCount(answer: string): number {
  return [...answer].filter(isLetter).length;
}

/**
 * How many letters of the answer belong to the form it was built on.
 *
 * The longest candidate that is a proper prefix, compared with case folded away
 * because a sentence starts with a capital and a stored stem does not. Nought
 * where none of them fits, which is the ordinary case for a gloss and for every
 * caller that had nothing to offer.
 */
function stemBehind(answer: string, stems: readonly (string | null | undefined)[] | undefined): number {
  const lower = answer.toLowerCase();
  let best = 0;
  for (const raw of stems ?? []) {
    const stem = raw?.trim();
    if (!stem || stem.length >= answer.length) continue;
    if (!lower.startsWith(stem.toLowerCase())) continue;
    best = Math.max(best, letterCount(stem));
  }
  return best;
}

/** `4 letters`, or `2 words, 14 letters` where there is more than one word. */
function lengthLabel(answer: string): string {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const letters = letterCount(answer);
  const tail = `${letters} ${letters === 1 ? "letter" : "letters"}`;
  return words > 1 ? `${words} words, ${tail}` : tail;
}

/**
 * The whole ladder for one ask, mildest rung first.
 *
 * Returned whole rather than one rung at a time, so a screen can say how many
 * are left and a test can read the progression rather than call the function
 * five times and hope. A caller shows `ladder.slice(0, taken)`.
 *
 * Every ladder ends on the answer and no two rungs cover the same letters, so
 * pressing again always says something new. An answer of one letter has two
 * rungs and an empty answer has none, which is the honest reading of a caller
 * that has nothing to be asked about.
 */
export function hintLadder(ask: HintAsk): Hint[] {
  const answer = ask.answer.trim();
  const n = letterCount(answer);
  if (n === 0) return [];

  const rungs: Hint[] = [
    { kind: "shape", label: "How long it is", shown: cover(answer, 0, 0), ceiling: 2 },
  ];

  /*
    The ending, where one of the forms the caller offered really is the front of
    the answer. The guard is not decoration: the short illative is stored rather
    than derived, so `tuba` goes to `tuppa` and the letters past `toa` are not
    an ending at all. A form that does not prefix the answer is not the form the
    ending went on, and the honest thing to do with it is to say nothing about
    endings. A form equal to the whole answer is not one either, or the ending
    rung would be the answer rung wearing a milder label.
  */
  const stemLetters = stemBehind(answer, ask.stems);
  const suffix = ask.suffix?.trim() ?? "";
  const bySuffix = suffix && suffix.length < answer.length
    && answer.toLowerCase().endsWith(suffix.toLowerCase())
    ? letterCount(suffix)
    : 0;
  /*
    Whichever of the two the caller could answer. They agree where both are
    known, since a regular case form is the stem with that very suffix on it,
    and where they disagree the stem is the one to believe: it is a fact about
    this word, and the suffix is a fact about the case, which a stored form is
    under no obligation to have been built with.
  */
  const ending = stemLetters > 0 ? n - stemLetters : bySuffix;

  if (ending > 0 && ending < n) {
    rungs.push({
      kind: "ending",
      label: "The ending it takes",
      shown: cover(answer, 0, ending),
      ceiling: 2,
    });
    /*
      Then half of what is left, from the front, but only while that leaves a
      letter still covered. Where it does not, the next press is the answer,
      which is a shorter ladder rather than a rung that hands the word over
      under a label promising less.
    */
    const front = Math.max(1, Math.ceil((n - ending) / 2));
    if (front + ending < n) {
      rungs.push({
        kind: "start",
        label: "How it starts",
        shown: cover(answer, front, ending),
        ceiling: 2,
      });
    }
  } else {
    /*
      No stem, so no ending worth naming, and the word is uncovered from the
      front in two steps: a third of it, then two thirds. Two steps rather than
      one because without the ending rung this ladder would otherwise be three
      rungs where the other is four, and the whole promise is that pressing
      again says a little more rather than a lot.
    */
    const first = Math.max(1, Math.floor(n / 3));
    const second = Math.max(first + 1, Math.ceil((n * 2) / 3));
    if (first < n) {
      rungs.push({ kind: "start", label: "How it starts", shown: cover(answer, first, 0), ceiling: 2 });
    }
    if (second < n) {
      rungs.push({ kind: "more", label: "A bit more", shown: cover(answer, second, 0), ceiling: 2 });
    }
  }

  rungs.push({ kind: "answer", label: "The answer", shown: answer, ceiling: 1 });
  rungs[0] = { ...(rungs[0] as Hint), label: lengthLabel(answer) };
  return rungs;
}

/**
 * The highest rating still available after taking the first `taken` rungs.
 *
 * 4 with nothing taken, which is no ceiling at all rather than nearly none, and
 * the difference is a real one: a flip card and the speaking round are
 * self-graded and Easy is one of the four they offer, so a ceiling of 3 on an
 * untouched ladder would quietly take Easy off every screen in the app that has
 * a hint button on some other card. A round applies this with `Math.min`
 * against the rating it had already worked out, so a miss is still a miss and a
 * hint can only ever lower what the answer earned.
 */
export function hintCeiling(ladder: readonly Hint[], taken: number): 1 | 2 | 3 | 4 {
  let ceiling: 1 | 2 | 3 | 4 = 4;
  for (const hint of ladder.slice(0, Math.max(0, taken))) {
    if (hint.ceiling < ceiling) ceiling = hint.ceiling;
  }
  return ceiling;
}

/**
 * NARROWING, WHICH IS THE SAME LADDER ON A SCREEN THAT OFFERS OPTIONS.
 *
 * A question with four answers on the screen cannot be hinted by uncovering
 * letters, because the letters are all already there. What a teacher does
 * instead is cross one out, so that is what this does, and the ceiling rule is
 * unchanged: crossing out narrows, so Hard, and crossing out until one is left
 * is the answer, so Again.
 *
 * THE WORST WRONG ANSWER GOES FIRST, which is the whole of getting this right.
 * Striking the nearest rival would leave the learner choosing between the answer
 * and two options nobody could confuse it with, which is the answer handed over
 * on the first press under a label saying it was not. The options that survive
 * longest are the ones worth telling apart, which is `lib/questions/distractors.ts`'s
 * own argument about which wrong answers are worth printing, asked backwards.
 *
 * Nearness is measured on the strings themselves rather than through the
 * dictionary, because a caller here is holding four rendered options and often
 * nothing else: a gloss, an ending, a spoken word. Shared opening letters and a
 * similar length is what makes two written options hard to tell apart, and it
 * needs no lexeme.
 */
function nearness(option: string, answer: string): number {
  const a = option.toLowerCase();
  const b = answer.toLowerCase();
  let shared = 0;
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared += 1;
  const longest = Math.max(a.length, b.length, 1);
  return shared / longest + (1 - Math.abs(a.length - b.length) / longest);
}

/**
 * Which options are struck out after `taken` presses, worst rival first.
 *
 * The answer is never struck, however it scores, and an option equal to the
 * answer is never struck either: several rounds offer a pair of spellings that
 * are both right, and striking one of those would tell a learner their correct
 * answer was wrong, which is the fault this app is built against.
 *
 * The comparator ends on the option's own text, because two options can score
 * the same and `sort` is stable: without it, which option a learner is helped
 * with would be decided by the order the round happened to shuffle them into,
 * and pressing hint twice on one question could strike two different options on
 * two renders.
 */
export function struckOptions(
  options: readonly string[],
  answer: string,
  taken: number,
): readonly string[] {
  const wrong = options.filter((o) => o !== answer);
  const ranked = [...wrong].sort(
    (a, b) => nearness(a, answer) - nearness(b, answer) || a.localeCompare(b),
  );
  return ranked.slice(0, Math.max(0, Math.min(taken, ranked.length)));
}

/**
 * How many presses a narrowing ladder has, and what each costs.
 *
 * One rung per wrong option. The last of them leaves the answer standing alone,
 * which is the answer, so it costs what the answer rung costs.
 */
export function narrowLadder(options: readonly string[], answer: string): Hint[] {
  const wrong = options.filter((o) => o !== answer).length;
  return Array.from({ length: wrong }, (_, i) => ({
    kind: (i === wrong - 1 ? "answer" : "shape") as HintKind,
    label: i === wrong - 1 ? "The answer" : "One of these is out",
    shown: "",
    ceiling: (i === wrong - 1 ? 1 : 2) as 1 | 2,
  }));
}

/**
 * What the screen says about what a hint costs, once one has been taken.
 *
 * Said plainly and once, because a learner who presses a button and watches
 * their grade change without being told has been tricked, and a learner told
 * about it before they press has been warned off the thing this exists to
 * offer. Not a scold: coming back sooner is what should happen to a word
 * somebody needed help with.
 */
export const HINT_COST_NOTE = "We will bring this one back sooner.";
