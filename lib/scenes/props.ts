/**
 * The role card, which is not a decoration.
 *
 * **The learner never plays themselves** (`docs/19-situations.md` §3). They are
 * handed a card: you are a patient, your throat has hurt since Tuesday, you can
 * come any afternoon except Wednesday. Two reasons, and the second is the one
 * that matters legally.
 *
 * The first is that marking has to know what the learner is trying to say. A
 * scene that invites somebody to describe their own symptoms cannot tell a
 * complete turn from an incomplete one, because it does not know what the
 * complete one was. `{ kind: "datum" }` is decidable only because the card
 * decided the answer before the conversation started.
 *
 * The second is that a doctor scene where somebody types about their own health
 * is a database holding health data about an identified person, which is
 * Article 9 special category data, in a product whose privacy notice is one of
 * the reasons people choose it. The role card removes the question: nothing in
 * a transcript is true about the person who wrote it. **No scene asks for a
 * real document number**, and a scene that needs one supplies a fictional one,
 * because an identity code typed into a practice app is the one thing this
 * module could collect that nobody could ever take back.
 *
 * WHAT THIS FILE MAY WRITE. English, and a lemma. That is the standing the
 * scene catalog already has: a lemma is a *request* against the dictionary,
 * so a misspelled one fails to arrive rather than becoming a wrong Estonian
 * word, and `catalogue.test.ts` checks every one against the units its scene
 * declares. What it may never write is a form or a sentence, which is why a
 * drawn prop carries lemmas for the caller to resolve rather than the Estonian
 * a learner would type.
 *
 * Pure: no React, no Next, no Prisma, no clock. The date arithmetic is over
 * plain numbers and never over `new Date()`, because a card drawn from a seed
 * has to be the same card on a reload.
 */

/**
 * One fact the card carries, before it is drawn.
 *
 * `word` is the kind that ties a card to the dictionary: the value is one of
 * the scene's own lemmas, so the Estonian the learner needs exists and the beat
 * that asks for it can be marked. The other four generate a value nobody has to
 * look up, and their accepted spellings are digits, which is how people write a
 * time or a number down anyway.
 */
export type PropSpec =
  /** A word off the scene's own units. The card prints its English gloss. */
  | {
      readonly kind: "word";
      readonly slot: string;
      readonly oneOf: readonly string[];
      /** How the card says it, with the gloss standing in for the word. */
      readonly says: string;
      /**
       * WHICH SENSE OF A WORD THIS SITUATION MEANS, WHERE ITS GLOSS CARRIES
       * MORE THAN ONE.
       *
       * An Estonian word covers what it covers, and the dictionary's gloss says
       * so: `tee` is "road, tea", `keel` is "language, tongue", `käsi` is
       * "hand, arm". That is right on an entry and wrong on a card, because a
       * card is not teaching the word's range, it is handing somebody one fact
       * and asking them to say it. A learner at a café counter read
       *
       *     Tell them what you would like to drink.
       *     road, tea
       *
       * and one of those is not a drink. The same card at a job interview
       * offered a tongue as something to be good at.
       *
       * So a scene says which sense it means, keyed on the lemma, and it may
       * only ever *narrow*: `catalogue.test.ts` holds every value here to a
       * sense the harvest's own gloss already lists, word for word, so a card
       * cannot invent a meaning the dictionary would not stand behind and the
       * entry everywhere else in the app is untouched. It is English, which is
       * the one language this file may write, and it is never the Estonian
       * (ADR-005): saying that is the exercise.
       *
       * Total rather than optional in practice: every lemma in `oneOf` whose
       * gloss carries more than one sense has an entry, and an entry for a
       * lemma whose gloss carries one is dead and fails. A rule with an
       * exemption list is the parking space that list becomes.
       */
      readonly means?: Readonly<Record<string, string>>;
    }
  /**
   * A time of day, on the hour or the half hour, inside a window.
   * `differentFrom` names an earlier slot whose value this one may not
   * repeat, so a second offer is a second time.
   *
   * `theirs` for the reason it is on a weekday below, and the type carried
   * it there and not here while three scenes drew a time the other side
   * offers: the desk's appointment, the second one it offers when the first
   * will not do, and the hour a shop opens. All three printed on the
   * learner's card, so "take the time offered" was answerable before an
   * offer and "say the time back, to check you heard it" needed no hearing.
   */
  | {
      readonly kind: "time";
      readonly slot: string;
      readonly from: number;
      readonly to: number;
      readonly differentFrom?: string;
      readonly theirs?: true;
      /** How the card labels it. The value is printed under it like every other. */
      readonly says?: string;
    }
  /**
   * A weekday, as one of the course's own weekday lemmas.
   *
   * `theirs` marks a fact that is the other side's rather than the learner's:
   * the day a landlord offers is drawn per run and stored with the card, so
   * a reload offers the same day and the debrief can say which, but it is
   * not printed on the role card, because a card telling you what the other
   * person is about to say is a script and not a role. The learner may still
   * say it back, so its spellings are in the marker's data like any other.
   */
  | {
      readonly kind: "weekday";
      readonly slot: string;
      readonly oneOf: readonly string[];
      readonly says: string;
      readonly theirs?: true;
      /** An earlier slot this one may not repeat: the second day offered is another day. */
      readonly differentFrom?: string;
    }
  /** A plain number: a floor, a room, an amount. */
  | { readonly kind: "number"; readonly slot: string; readonly min: number; readonly max: number; readonly says: string }
  /** A fictional reference, which is the only kind of code this module ever holds. */
  | { readonly kind: "code"; readonly slot: string; readonly says: string };

/** One fact, drawn. */
export interface DrawnProp {
  readonly slot: string;
  /** The line the role card prints. English. */
  readonly card: string;
  /**
   * Spellings that count and need no dictionary: digits, and a code.
   *
   * A time is accepted as digits because that is how anybody writes one down,
   * in Estonian as in English, and because the alternative is this module
   * deciding that `kell kaks` is how you say 14:00, which is Estonian it may
   * not write.
   */
  readonly literal: readonly string[];
  /**
   * Lemmas whose forms also count. Resolved against the dictionary by the
   * caller, which is what keeps this file free of Estonian forms.
   */
  readonly lemmas: readonly string[];
  /**
   * What the card prints as the value, where the value prints itself.
   *
   * EVERY LINE OF A CARD IS A LABEL AND A VALUE, AND THREE OF THEM WERE NOT.
   * A `word` prop drew a lemma and the briefing printed its English gloss
   * underneath the label; a number, a time and a code each folded the value
   * into the label instead, so one card read "Where you are from." over
   * "Finland" and "You live on floor 3" as one sentence with a digit in the
   * middle of it. A learner sent a screenshot of that card and said it was
   * hard to tell where the information was, and it is: the three shapes are
   * three different places to look.
   *
   * So a label is a label on every line and this is the other half, which
   * the briefing prints where the dictionary has no gloss to print. Empty on
   * a `word` or a `weekday`, whose value is a lemma and whose card says it
   * in English, because saying it in Estonian is the exercise.
   */
  readonly shown: readonly string[];
  /** What was drawn, for the recency rule in §5. */
  readonly value: string;
  /** The other side's fact, drawn and stored but never printed on the card. */
  readonly theirs?: true;
  /**
   * The English of a drawn lemma, for a stage direction that names it: "They
   * offer Tuesday at 14:00" rather than the lemma inside an English sentence.
   * Filled by the caller from the dictionary's own gloss, since this module
   * holds no dictionary; absent on a value that prints itself.
   */
  readonly english?: string;
  /**
   * Set when every candidate was in `avoid` and one was drawn regardless.
   *
   * §5 promises no prop value repeats within three runs, and a pool of three
   * cannot keep it. A pool too thin for the promise is a fact about the scene
   * and is **reported rather than papered over**, the way `paper.ts` reports a
   * shortfall: the alternative is a card that comes out empty.
   */
  readonly repeated?: true;
  /**
   * Set when the word was drawn because the learner reached for it in a
   * recent scene and did not have it. `SceneGap` is where that is written
   * and this is the one place it is read back into a conversation, which is
   * the design's own promise (`docs/21-situations.md` §19): a word you could
   * not say last week comes back in the next scene's props.
   */
  readonly returned?: true;
}

/** The card as a whole: what you are doing here, and the facts you were given. */
export interface RoleCard {
  /** English, one line. Who you are today. */
  readonly you: string;
  readonly props: readonly DrawnProp[];
}

/**
 * Draws one prop.
 *
 * `avoid` carries the values this scene used in its last three runs, which §5
 * promises will not repeat, and the promise is kept by derivation rather than
 * by a counter: `SceneRun` is append-only and the last runs are one indexed
 * read (ADR-014). Where every candidate is in `avoid` the draw takes one
 * anyway rather than failing, because a thin pool is a fact about the scene
 * and a card that cannot be drawn is worse than one that repeats.
 */
export function drawProp(
  spec: PropSpec,
  random: () => number,
  avoid: ReadonlySet<string> = new Set(),
  prefer: ReadonlySet<string> = new Set(),
): DrawnProp {
  switch (spec.kind) {
    case "word": {
      const lemma = pick(spec.oneOf, random, avoid, prefer);
      /*
        The sense this situation means, where the word has more than one, and
        the whole gloss otherwise. `shown` is what a card prints as the value,
        so the briefing needs no second reader: it already prefers this over
        the dictionary's gloss for the three kinds whose value prints itself.
      */
      const sense = spec.means?.[lemma];
      return {
        slot: spec.slot, card: spec.says, literal: [], lemmas: [lemma],
        shown: sense ? [sense] : [], value: lemma,
        ...worn(lemma, avoid),
        ...(prefer.has(lemma) ? { returned: true as const } : {}),
      };
    }
    case "weekday": {
      const lemma = pick(spec.oneOf, random, avoid);
      return {
        slot: spec.slot, card: spec.says, literal: [], lemmas: [lemma], shown: [], value: lemma,
        ...worn(lemma, avoid),
        ...(spec.theirs ? { theirs: true as const } : {}),
      };
    }
    case "time": {
      const slots = halfHours(spec.from, spec.to);
      const value = pick(slots, random, avoid);
      return {
        ...worn(value, avoid),
        slot: spec.slot,
        card: spec.says ?? "The time you were given",
        shown: [value],
        /*
          `14:00`, `14.00` and `14` are all how somebody writes a time down.

          THE BARE HOUR ONLY WHERE THE TIME IS ON THE HOUR, which is the half
          this got wrong. `value.slice(0, 2)` handed `15` to a card that said
          **15:30**, and the marker looks for a literal anywhere in the text,
          so `ma tulen 15 minuti pärast` met the beat: a learner who said they
          were coming in a quarter of an hour was recorded as having given the
          departure time. Half past three is not three, and the way to say it
          is `pool neli`, which `timeWords` already supplies.

          AND BOTH SPELLINGS OF IT, which is the other half. The hour was taken
          as the first two characters, so an `08:00` card accepted `08` and
          never `8`, while a `15:00` card accepted `15`: whether a learner
          could write the hour the way anybody writes it depended on a leading
          zero the card printed and they did not.
        */
        literal: [
          value,
          value.replace(":", "."),
          stripLeadingZero(value),
          ...(value.endsWith(":00") ? [value.slice(0, 2), stripLeadingZero(value.slice(0, 2))] : []),
        ],
        lemmas: [],
        value,
        ...(spec.theirs ? { theirs: true as const } : {}),
      };
    }
    case "number": {
      const span = Array.from({ length: spec.max - spec.min + 1 }, (_, i) => String(spec.min + i));
      const value = pick(span, random, avoid);
      return {
        slot: spec.slot, card: spec.says, literal: [value], lemmas: numberWords(value), shown: [value], value,
        ...worn(value, avoid),
      };
    }
    case "code": {
      /*
        Fictional, and visibly so. Letters and digits in a shape no Estonian
        register uses, because the failure to avoid is a learner reading it as
        a real reference and typing their own instead.
      */
      const value = `KK-${digits(random, 4)}`;
      return { slot: spec.slot, card: spec.says, literal: [value, value.slice(3)], lemmas: [], shown: [value], value };
    }
  }
}

/** The whole card for one run. */
export function drawCard(
  you: string,
  specs: readonly PropSpec[],
  random: () => number,
  avoid: ReadonlySet<string> = new Set(),
  prefer: ReadonlySet<string> = new Set(),
): RoleCard {
  const props: DrawnProp[] = [];
  for (const spec of specs) {
    /*
      A slot drawn to differ from an earlier one adds that one's value to
      what it avoids. `pick` prefers a fresh candidate, so the two differ
      wherever the pool has two, and a pool of one repeats rather than fails.
    */
    const other = "differentFrom" in spec && spec.differentFrom
      ? props.find((p) => p.slot === spec.differentFrom)?.value
      : undefined;
    const shun = other ? new Set([...avoid, other]) : avoid;
    props.push(drawProp(spec, random, shun, prefer));
  }
  return { you, props };
}

/** The slot a beat's `datum` requirement names, as the marker wants it. */
export function propBySlot(card: RoleCard, slot: string): DrawnProp | undefined {
  return card.props.find((prop) => prop.slot === slot);
}

/**
 * Prefers a candidate nobody has seen lately, and takes one regardless.
 *
 * Never throws and never returns nothing: a scene whose pool is thinner than
 * its recency window is a fact worth reporting (§5 says a run says so rather
 * than quietly cycling) and is not a reason for a card to come out empty.
 */
function worn(value: string, avoid: ReadonlySet<string>): { repeated?: true } {
  return avoid.has(value) ? { repeated: true } : {};
}

function pick(
  from: readonly string[],
  random: () => number,
  avoid: ReadonlySet<string>,
  prefer: ReadonlySet<string> = new Set(),
): string {
  const fresh = from.filter((value) => !avoid.has(value));
  /*
    A word the learner could not say recently comes first, and only among
    the fresh ones: the recency promise still holds, so a gap met in this
    scene's own last run waits a run before it comes back.
  */
  const wanted = fresh.filter((value) => prefer.has(value));
  const pool = wanted.length > 0 ? wanted : fresh.length > 0 ? fresh : from;
  return pool[Math.floor(random() * pool.length)] ?? pool[0] ?? "";
}

/** Every half hour in a window, as `HH:MM`. */
function halfHours(from: number, to: number): string[] {
  const out: string[] = [];
  for (let hour = from; hour <= to; hour += 1) {
    out.push(`${pad(hour)}:00`);
    if (hour < to) out.push(`${pad(hour)}:30`);
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
const stripLeadingZero = (time: string) => time.replace(/^0/, "");

function digits(random: () => number, count: number): string {
  let out = "";
  for (let i = 0; i < count; i += 1) out += Math.floor(random() * 10);
  return out;
}

/**
 * The number words a time is said with, as lemma requests against `arvud`.
 *
 * `kell üksteist` for 11:00 and `pool kaksteist` for 11:30, which is what a
 * person says and what a card printing `11:30` should accept. Estonian tells
 * the time on a twelve-hour clock in speech, so 13:00 is `üks`. Lemmas rather
 * than forms, every one of them a word the numbers unit teaches, so a
 * misspelling here fails the catalog test rather than reaching a marker; the
 * half hour is two lemmas that have to appear together, which `dataFor` joins
 * with a space and the marker looks for in the text.
 */
const HOUR_WORDS = [
  "kaksteist", "üks", "kaks", "kolm", "neli", "viis", "kuus", "seitse", "kaheksa", "üheksa", "kümme", "üksteist",
] as const;
const HALF = "pool";

export function timeWords(value: string): string[] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return [];
  const hour = Number(match[1]) % 12;
  const word = HOUR_WORDS[hour];
  if (!word) return [];
  if (match[2] === "30") return [`${HALF} ${HOUR_WORDS[(hour + 1) % 12]}`];
  return [word];
}

/** Every lemma `timeWords` can name, for the test that checks they are taught. */
export const TIME_LEMMAS: readonly string[] = [...HOUR_WORDS, HALF];

/**
 * A NUMBER ON A CARD IS SAID IN WORDS, AND FOR A YEAR ONLY THE DIGIT COUNTED.
 *
 * A card dealing a floor accepted `3` and nothing else. A learner told to say
 * which floor they live on wrote `kolmandal korrusel`, then `Mu korter on
 * kolmandal korrusel.`, and the neighbor answered both with "sorry?" and the
 * same question again. Nobody says a floor as a digit out loud; the whole of
 * what the beat is drilling is saying it in Estonian, and the one spelling the
 * marker took was the one spelling that is not Estonian at all.
 *
 * So a dealt number carries the words for it, exactly as a dealt time carries
 * `timeWords`: the cardinal, because `kolm` is an answer to "which floor", and
 * the **ordinal**, because `kolmas` is the answer anybody gives and its case
 * forms are where `kolmandal` comes from. Lemmas rather than forms, so the
 * caller resolves them through the dictionary's own case table and this file
 * writes no Estonian; every one is a word `arvud` teaches, so a misspelling
 * here fails the catalog test rather than reaching a marker.
 *
 * The ordinals stopped at `teine` when this was written and the unit was
 * widened for it, which is the finding in `docs/21-situations.md` §29 arriving
 * a fourth time: the course teaches the nouns of a situation and not the words
 * that do things with them.
 */
const CARDINALS = [
  "null", "üks", "kaks", "kolm", "neli", "viis", "kuus", "seitse", "kaheksa", "üheksa", "kümme",
] as const;
const ORDINALS = [
  "", "esimene", "teine", "kolmas", "neljas", "viies",
] as const;

export function numberWords(value: string): string[] {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return [];
  const said: (string | undefined)[] = [CARDINALS[n], ORDINALS[n]];
  return said.filter((word): word is string => Boolean(word));
}

/** Every lemma `numberWords` can name, for the test that checks they are taught. */
export const NUMBER_LEMMAS: readonly string[] = [...CARDINALS, ...ORDINALS].filter((word) => word !== "");

/**
 * The word a time is told with, as a lemma request like the hours themselves.
 *
 * What makes a line a claim about the clock rather than a line with a number
 * in it: `kolm minutit` is three minutes and `kell kolm` is an appointment.
 */
export const CLOCK_LEMMA = "kell";

/**
 * The hour words the times on this card name.
 *
 * A NUMBER SAID IN WORDS IS STILL A NUMBER, which `dealtNumbers` says it is
 * not. Its reasoning was that `kolm` is a word the course teaches and a line
 * saying it has not made anything up, and that was true while a beat naming a
 * dealt value was answered off the card. With the model asked first it is
 * false in the way that matters: a card dealing 16:00 was answered `Teil on
 * kohtumine homme kell kolm`, which is an appointment nobody offered, told in
 * perfectly in-scope Estonian, and every check on the page passed it.
 *
 * Read through `timeWords`, so what the other side may say and what the marker
 * accepts from the learner are the one table, and split to the hour because
 * `pool neli` is half past three and the hour is the half that can be wrong.
 */
export function dealtHours(card: RoleCard | null): ReadonlySet<string> {
  const out = new Set<string>();
  for (const prop of card?.props ?? []) {
    for (const said of timeWords(prop.value ?? "")) {
      for (const word of said.split(" ")) {
        if ((HOUR_WORDS as readonly string[]).includes(word)) out.add(word);
      }
    }
  }
  return out;
}

/** Every hour word there is, so the gate can tell one from an ordinary count. */
export const HOUR_LEMMAS: readonly string[] = [...HOUR_WORDS];

/**
 * Every number this run was dealt, as it may be written.
 *
 * THE GATE'S FIFTH CHECK NEEDS THIS AND NOTHING ELSE DOES. Vouching is about
 * words and a number is not one, so a composed line naming a time the card
 * never dealt passes every check the gate had: the learner is asked to agree
 * to an appointment nobody offered them, in perfectly in-scope Estonian. That
 * was invisible while a beat naming a dealt value was answered off the card
 * before a model was asked, and it stops being invisible the moment the model
 * is asked first.
 *
 * Read off `literal`, which is already every spelling of the value the marker
 * will accept from the learner, so what the other side may say and what the
 * learner may say are the one list. Words are not in it: `kolm` is a word, it
 * is vouched by the lexicon like any other, and a line saying it has said
 * something the course teaches rather than made a number up.
 */
export function dealtNumbers(card: RoleCard | null): ReadonlySet<string> {
  const out = new Set<string>();
  for (const prop of card?.props ?? []) {
    for (const spelling of prop.literal) {
      if (/\d/.test(spelling)) out.add(spelling);
    }
  }
  return out;
}
