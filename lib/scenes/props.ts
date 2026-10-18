/**
 * The role card, which is not a decoration.
 *
 * **The learner never plays themselves** (`docs/21-situations.md` §3). They are
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
      /**
       * A PLACE, SO A PLACE NAME THE LEARNER WRITES IS ONE THEY CHOSE.
       *
       * The words a slot can deal are common nouns, the station, the
       * hospital, the city centre, and at a bus station the first thing
       * anybody says is a town: `Tartusse`. The forms list holds no
       * capitalised word on purpose, so a town was read as a word nobody
       * could place and answered "sorry?", to a learner who had said exactly
       * where they were going. On a slot marked as a place, a capitalised
       * word the app cannot account for as anything else is that learner
       * changing the fact on their card (ADR-025 amendment 3), which the
       * route adopts like any other chosen value. Its ending is not checked
       * and it is never said back or graded, since nothing here can vouch
       * for a spelling the dictionary does not hold (ADR-005).
       */
      readonly places?: true;
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
      /**
       * Later in the day than the `differentFrom` slot, so "there is time
       * later" said of a slot that has gone is true of the one offered next.
       */
      readonly later?: true;
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
  /**
   * A plain number: a floor, a room, an amount. `theirs` where the number is
   * the other side's to give, a dose the doctor sets, so the learner reading
   * back another is corrected rather than credited with changing it.
   */
  | { readonly kind: "number"; readonly slot: string; readonly min: number; readonly max: number; readonly says: string; readonly theirs?: true }
  /**
   * A PRICE, IN WHOLE EUROS, WHICH IS THE FACT THE PRICE CURVEBALL CHANGES.
   *
   * `wrong-price` said "the amount is not the one you were told" in seven
   * scenes, and not one of them had told the learner an amount: there was no
   * price on the card, so the other side could say the price had changed and
   * could not say what it was. A learner at a ticket window asked "kui
   * palju?", which is exactly the way out the curveball names, and was told
   * `Ei tea.` The model was no help either, because a composed line naming a
   * price is a line with a number in it and the gate withholds any number
   * the card did not deal. So the curveball was a trap in a costume.
   *
   * A scene that admits it deals two: what the learner was told, printed on
   * their card, and the price the other side has now, `theirs` and drawn to
   * differ. The curveball's line says the second off the card, "how much?"
   * is answered with it, and the gate counts both as dealt. A price is a
   * `number` with a job, and it carries `price` on the drawn prop so the
   * aside can find the one fact a question about money is asking for.
   */
  | {
      readonly kind: "price";
      readonly slot: string;
      readonly min: number;
      readonly max: number;
      readonly says: string;
      readonly theirs?: true;
      /**
       * A sum of money that is pay rather than a price: a wage, a raise. It is
       * dealt and read back like a price, and it is never what a question about
       * what something costs is answered with, since "See maksab 1649 eurot."
       * at a job interview is the interviewer pricing the job (`priceOnCard`).
       */
      readonly pay?: true;
      readonly differentFrom?: string;
    }
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
  /** A price, so a question about money can find it (`priceOffCard`). */
  readonly price?: true;
  /** Pay rather than a price (`PropSpec.pay`): never the answer to "how much does it cost". */
  readonly pay?: true;
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
  /** The value of the `differentFrom` slot, which a `later` time is drawn after. */
  after?: string,
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
      const all = halfHours(spec.from, spec.to);
      const afterIt = spec.later && after ? all.filter((slot) => slot > after) : all;
      const slots = afterIt.length > 0 ? afterIt : all;
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
        literal: timeLiterals(value),
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
        ...(spec.theirs ? { theirs: true as const } : {}),
        ...worn(value, avoid),
      };
    }
    case "price": {
      const span = Array.from({ length: spec.max - spec.min + 1 }, (_, i) => String(spec.min + i));
      const value = pick(span, random, avoid);
      /*
        Digits, and the words for it where the numbers unit has them, exactly
        as a floor is dealt: a learner told the price is five euros may say
        `viis` back. Shown with the unit so the card reads as money rather
        than as a bare figure.
      */
      return {
        slot: spec.slot, card: spec.says, literal: [value], lemmas: numberWords(value), shown: [`${value} €`], value,
        price: true,
        ...(spec.pay ? { pay: true as const } : {}),
        ...worn(value, avoid),
        ...(spec.theirs ? { theirs: true as const } : {}),
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

/**
 * A drawn prop with a value the learner chose in place of the dealt one, in
 * the shape `drawProp` deals that kind of prop, or null where the prop is not
 * one of the kinds whose value is a figure. Beside the builders on purpose: a
 * copy of their literal and lemma rules written elsewhere is how a floor the
 * learner moved to `5` stopped hearing `viis`.
 */
export function restated(prop: DrawnProp, value: string): DrawnProp | null {
  const { english: _english, ...rest } = prop;
  if (TIME.test(prop.value)) {
    return TIME.test(value) ? { ...rest, value, lemmas: [], literal: timeLiterals(value), shown: [value] } : null;
  }
  if (/^\d+$/.test(prop.value)) {
    if (!/^\d+$/.test(value)) return null;
    return { ...rest, value, literal: [value], lemmas: numberWords(value), shown: [prop.price ? `${value} €` : value] };
  }
  if (prop.value.startsWith("KK-")) {
    return { ...rest, value, lemmas: [], literal: value.startsWith("KK-") ? [value, value.slice(3)] : [value], shown: [value] };
  }
  return null;
}

const TIME = /^\d{1,2}:\d{2}$/;

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
    props.push(drawProp(spec, random, shun, prefer, other));
  }
  return { you, props };
}

/** The slot a beat's `datum` requirement names, as the marker wants it. */
export function propBySlot(card: RoleCard, slot: string): DrawnProp | undefined {
  return card.props.find((prop) => prop.slot === slot);
}

/**
 * The price on the card, where the scene deals one.
 *
 * The learner's own, unless the caller has already stood the other side's in
 * for it (`cardAfterHurdles`): once the price has changed, the price is the
 * new one, and a card read through that swap carries it under the same slot.
 */
/*
 * AND WHERE THE ONLY PRICE IS THEIRS, THAT ONE. A clothes shop deals the price
 * as the shop's own fact, said when the learner asks rather than printed on
 * their card, so asked "how much?" with no model the assistant found no price
 * of the learner's and said `Ei tea.` at the till. The other side's price is
 * the answer wherever the learner holds none; where they hold one, a second
 * price of theirs is the price curveball's and is stood in only once it is
 * raised (`cardAfterHurdles`).
 */
export function priceOnCard(card: RoleCard | null): DrawnProp | undefined {
  return card?.props.find((prop) => prop.price && !prop.pay && !prop.theirs)
    ?? card?.props.find((prop) => prop.price && !prop.pay && prop.theirs);
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

/**
 * Every spelling a clock time on a card is accepted in: `14:00`, `14.00`,
 * `9:30` and `9.30` without the zero, and on the hour `14` and `2`. One builder, because the card and a time the
 * learner named themselves (`timeFromText`) have to be accepted the same way.
 */
export function timeLiterals(value: string): string[] {
  return [
    value,
    value.replace(":", "."),
    stripLeadingZero(value),
    // And the dot without the zero, `9.30`, which is how the time is written
    // here as often as with a colon: a card dealing 09:30 refused it.
    stripLeadingZero(value.replace(":", ".")),
    ...(value.endsWith(":00") ? [value.slice(0, 2), stripLeadingZero(value.slice(0, 2))] : []),
  ];
}

/**
 * WHAT KIND OF THING A SLOT HOLDS, FOR A MARKER THAT LETS THE LEARNER CHANGE IT.
 *
 * The card deals a value so a learner has something to say, and for a year
 * the marker held them to it: somebody who wrote `Tartusse` at a ticket
 * window whose card said the station was told they had not been understood,
 * for naming a real place in perfect Estonian. A person behind a counter
 * takes the destination they are given. So a `datum` requirement is met by
 * any value of the slot's kind the dictionary can read (ADR-025 amendment 3),
 * and this is the kind: which words a word slot could have dealt, the hours a
 * time slot spans, whether a number is a floor or a price.
 *
 * `theirs` marks a fact that belongs to the other side, a time they offer or
 * a price they are holding, which is not the learner's to change: a learner
 * who answers an offered time with another time is countering, which the
 * beat reads for itself.
 */
export type SlotKind =
  | { readonly kind: "word" | "weekday"; readonly oneOf: readonly string[]; readonly theirs?: true; readonly places?: true }
  | { readonly kind: "time"; readonly from: number; readonly to: number; readonly theirs?: true }
  | { readonly kind: "number" | "price"; readonly min: number; readonly max: number; readonly theirs?: true }
  | { readonly kind: "code" };

/** Slot to what it holds, read off a scene's own props. */
export function slotKinds(specs: readonly PropSpec[]): Map<string, SlotKind> {
  const out = new Map<string, SlotKind>();
  for (const spec of specs) {
    switch (spec.kind) {
      case "word":
        out.set(spec.slot, { kind: "word", oneOf: spec.oneOf, ...(spec.places ? { places: true as const } : {}), ...("theirs" in spec && spec.theirs ? { theirs: true as const } : {}) });
        break;
      case "weekday":
        out.set(spec.slot, { kind: "weekday", oneOf: spec.oneOf, ...(spec.theirs ? { theirs: true as const } : {}) });
        break;
      case "time":
        out.set(spec.slot, { kind: "time", from: spec.from, to: spec.to, ...(spec.theirs ? { theirs: true as const } : {}) });
        break;
      case "number":
        out.set(spec.slot, { kind: "number", min: spec.min, max: spec.max, ...(spec.theirs ? { theirs: true as const } : {}) });
        break;
      case "price":
        out.set(spec.slot, { kind: "price", min: spec.min, max: spec.max, ...(spec.theirs ? { theirs: true as const } : {}) });
        break;
      case "code":
        out.set(spec.slot, { kind: "code" });
        break;
    }
  }
  return out;
}

/**
 * A clock time the learner wrote, as `HH:MM`, or null where the turn names
 * none.
 *
 * Digits first (`14:30`, `14.30`, `kell 14`), then the hour said in words
 * the way `timeWords` spells a card's (`kell kaks`, `pool kolm`), read off
 * the same lemma list, so what a card is dealt and what a learner may name
 * are one vocabulary. An hour in words is on a twelve-hour clock, so it is
 * read into the span the slot covers where that settles it, and as the
 * afternoon otherwise, since the scenes' windows all fall there.
 */
export function timeFromText(text: string, span: { from: number; to: number }): string | null {
  const lower = text.toLowerCase();
  const digits = /(?:^|\D)(\d{1,2})[:.](\d{2})(?!\d)/.exec(lower);
  if (digits) {
    const hour = Number(digits[1]);
    const minute = Number(digits[2]);
    if (hour <= 23 && minute <= 59) return `${pad(hour)}:${pad(minute)}`;
  }
  /*
    Then `kell` and what follows it, digits or words, and the half hour, read
    by `clockFromText`, which the numbers round reads too: `kell neliteist
    viisteist` is 14:15 and `kell 14 15` the same typed, which a scene could
    not hear before. A dot that ends the sentence is not a minute: `Kell 10.`
    is ten o'clock, `kell 10.30` was read above.
  */
  const said = clockFromText(lower);
  if (!said) return null;
  const place = (hour12: number) => {
    const morning = hour12 % 12;
    const afternoon = morning + 12;
    const fits = (h: number) => h >= span.from && h <= span.to;
    return fits(afternoon) || !fits(morning) ? afternoon : morning;
  };
  const hour = said.twelve ? place(said.hour) : said.hour;
  return `${pad(hour)}:${pad(said.minute)}`;
}

/**
 * A whole number the learner wrote, as a digit string, with the number word
 * it was said in where it was said in one. Digits first, then a form of a
 * number lemma the lexicon holds, read off the same lists a card's number is
 * said with, so `kolmandal` reads as 3 exactly as `kolmas` on the card does.
 * Bounded to the slot's own span, so a house number is not read as a floor.
 */
/**
 * The numbers a turn says in words, as digits: `kakskümmend viis` is 25,
 * `sada kakskümmend` is 120, and a run of single digits read one by one,
 * `null viis neli null` or `kolm kaks üks kaheksa`, is the digit string a
 * phone number or a reference is read out as.
 *
 * Only the nominative, which is how a number is read out, and only the
 * compounds the language builds by plain concatenation of a digit's own
 * nominative: `-teist` for the teens, `-kümmend` for the tens, `-sada` for
 * the hundreds. Nothing here is a form to show anybody: it is read to
 * accept, the way a learner's digits are (ADR-005).
 */
export function spokenNumbers(text: string): string[] {
  const words = text.toLowerCase().split(/[^a-zõäöüšž]+/).filter(Boolean);
  return numberRuns(words).map((run) => run.digits ?? String(run.n));
}

/** One number a turn says: its value, and the words it spans, from `from` up to `to`. */
interface NumberRun {
  readonly n: number;
  /** A run of bare digits read out one at a time, kept as its digit string (`0540`). */
  readonly digits?: string;
  readonly from: number;
  readonly to: number;
  /** Said in number words rather than written in digits. */
  readonly words: boolean;
}

type PartKind = "unit" | "teen" | "ten" | "hundred" | "thousand";

function unitOf(word: string): number | null {
  const at = CARDINALS.indexOf(word as (typeof CARDINALS)[number]);
  return at >= 0 && at <= 9 ? at : null;
}

/** What one number word is worth, read off the cardinals and the three suffixes Estonian builds with. */
function partOf(word: string): { n: number; kind: PartKind } | null {
  if (word === "kümme") return { n: 10, kind: "teen" };
  if (word === "sada") return { n: 100, kind: "hundred" };
  if (word === "tuhat") return { n: 1000, kind: "thousand" };
  const u = unitOf(word);
  if (u !== null) return { n: u, kind: "unit" };
  for (const [suffix, kind, scale] of [["teist", "teen", 0], ["kümmend", "ten", 10], ["sada", "hundred", 100]] as const) {
    if (word.endsWith(suffix)) {
      const head = unitOf(word.slice(0, -suffix.length));
      if (head !== null && head > 0) return { n: kind === "teen" ? 10 + head : head * scale, kind };
    }
  }
  return null;
}

/**
 * A number under a thousand said in words from `at`: hundreds, then a ten and
 * a unit or a teen, or a unit alone.
 *
 * SAID AS ITS PARTS AS WELL AS IN ONE WORD (docs/41-fifth-batch.md, VB-7).
 * Estonian writes `kakssada` as one word, and a learner saying it, or a
 * recognizer hearing it, often makes it two: `kaks sada`. Read as two numbers
 * that was 2 and 100, which is neither the number said nor anything the
 * learner meant. A unit straight before `sada` multiplies it, which is the
 * arithmetic the one-word spelling already got, and the same goes for
 * `tuhat` in `saidNumber`.
 */
function belowThousand(words: readonly string[], at: number): { n: number; to: number } | null {
  const part = (k: number) => (words[k] === undefined ? null : partOf(words[k]!));
  let n = 0;
  let k = at;
  let any = false;
  const first = part(k);
  if (first?.kind === "hundred") {
    n += first.n;
    k += 1;
    any = true;
  } else if (first?.kind === "unit" && first.n > 0 && words[k + 1] === "sada") {
    n += first.n * 100;
    k += 2;
    any = true;
  }
  const next = part(k);
  if (next?.kind === "ten") {
    n += next.n;
    k += 1;
    any = true;
    const unit = part(k);
    if (unit?.kind === "unit" && unit.n > 0) {
      n += unit.n;
      k += 1;
    }
  } else if (next?.kind === "teen") {
    n += next.n;
    k += 1;
    any = true;
  } else if (next?.kind === "unit" && (!any || next.n > 0)) {
    n += next.n;
    k += 1;
    any = true;
  }
  return any ? { n, to: k } : null;
}

/** A whole number said in words from `at`, a thousand and up included. */
function saidNumber(words: readonly string[], at: number): { n: number; to: number } | null {
  const lead = belowThousand(words, at);
  // `tuhat`, `kaks tuhat`, `kakskümmend tuhat`: whatever comes before it counts the thousands.
  const thousandAt = lead ? lead.to : at;
  if (words[thousandAt] === "tuhat") {
    const thousands = (lead ? lead.n : 1) * 1000;
    const rest = belowThousand(words, thousandAt + 1);
    return { n: thousands + (rest?.n ?? 0), to: rest?.to ?? thousandAt + 1 };
  }
  return lead;
}

/**
 * Every number a run of words says, in order, with where each sits.
 *
 * A run of three or more bare digits is a number read out one digit at a
 * time, a phone number or a reference, and is kept as its digit string. A
 * digit token, where the caller kept digits among the words, is a number as
 * it is written.
 */
function numberRuns(words: readonly string[]): NumberRun[] {
  const out: NumberRun[] = [];
  let i = 0;
  while (i < words.length) {
    const word = words[i]!;
    if (/^\d+$/.test(word)) {
      out.push({ n: Number(word), from: i, to: i + 1, words: false });
      i += 1;
      continue;
    }
    if (!partOf(word)) {
      i += 1;
      continue;
    }
    let j = i;
    let digits = "";
    while (j < words.length && unitOf(words[j]!) !== null) {
      digits += String(unitOf(words[j]!));
      j += 1;
    }
    // Three bare digits in a row are a number read out, unless the last of them multiplies what follows.
    if (j - i >= 3 && words[j] !== "sada" && words[j] !== "tuhat") {
      out.push({ n: Number(digits), digits, from: i, to: j, words: true });
      i = j;
      continue;
    }
    const said = saidNumber(words, i);
    if (said) {
      out.push({ n: said.n, from: i, to: said.to, words: true });
      i = Math.max(said.to, i + 1);
    } else {
      i += 1;
    }
  }
  return out;
}

/** The words of a turn with its digits kept, for the readers that take both. */
function wordsAndDigits(text: string): string[] {
  return text.toLowerCase().split(/[^a-zõäöüšž0-9]+/).filter(Boolean);
}

/** A form of `euro`, the lemma the shopping unit teaches. Read, never written. */
function isEuro(word: string): boolean {
  return word.startsWith("euro");
}

/**
 * A CLOCK TIME SAID AS TWO NUMBERS, WHICH IS HOW A TIMETABLE IS READ OUT.
 *
 * `kell neliteist viisteist` is 14:15, and so is `kell 14 15` typed by
 * somebody who has the numbers and not the colon. Before this a time was an
 * hour in words, a half hour (`pool kolm`) or digits with a colon, so the
 * quarter past a bus leaves at could not be said at all, and neither could an
 * hour past twelve said in words (docs/41-fifth-batch.md, VB-7). Accept-only,
 * read off the number words the course teaches; the quarter-hour words are
 * not read, since `veerand` is in no unit (D17).
 *
 * The minute is a number from ten to fifty-nine, or `null` and a digit, which
 * is how a minute under ten is read out: a bare `kaks` after the hour is never
 * a minute, so `kell kolm kaks inimest` is three o'clock and two people.
 *
 * `bare` is the numbers round's reading, where the question is already a
 * clock: two numbers with no `kell` in front are an hour and its minutes, and
 * one number alone is the hour. The scenes never pass it, since there a
 * number with no `kell` is a count.
 */
export interface SaidClock {
  readonly hour: number;
  readonly minute: number;
  /** Said on a twelve-hour reading (`kolm`, `pool kolm`), so it could be morning or afternoon. */
  readonly twelve: boolean;
}

export function clockFromText(text: string, options: { readonly bare?: boolean } = {}): SaidClock | null {
  const lower = text.toLowerCase();
  const digits = /(?:^|\D)(\d{1,2})[:.](\d{2})(?!\d)/.exec(lower);
  if (digits) {
    const hour = Number(digits[1]);
    const minute = Number(digits[2]);
    if (hour <= 23 && minute <= 59) return { hour, minute, twelve: false };
  }
  const words = wordsAndDigits(lower);
  for (let at = 0; at < words.length; at += 1) {
    if (words[at] !== HALF) continue;
    const hour = (HOUR_WORDS as readonly string[]).indexOf(words[at + 1] ?? "");
    if (hour >= 0) return { hour: hour === 0 ? 11 : hour - 1, minute: 30, twelve: true };
  }
  const starts = words.flatMap((word, at) => (word === CLOCK_LEMMA ? [at + 1] : []));
  if (starts.length === 0 && options.bare) starts.push(0);
  for (const at of starts) {
    const said = hourAndMinute(words.slice(at));
    if (said) return said;
  }
  return null;
}

/** An hour and the minute after it, said at the start of `rest`. */
function hourAndMinute(rest: readonly string[]): SaidClock | null {
  const runs = numberRuns(rest);
  const hour = runs[0];
  // `kaheksa null viis` reads as three digits in a row, and is five past eight; `kolm null null` is three o'clock.
  if (hour && hour.from === 0 && hour.digits !== undefined && /^[1-9]0\d$/.test(hour.digits)) {
    return { hour: Number(hour.digits[0]), minute: Number(hour.digits[2]), twelve: true };
  }
  // The hour is the first thing said after `kell`, or the first thing said at all in a bare reading.
  if (!hour || hour.from !== 0 || hour.digits !== undefined || hour.n > 23) return null;
  let minute = 0;
  const next = runs[1];
  if (next && next.from === hour.to) {
    if (next.digits !== undefined) {
      // `null viis` read out digit by digit is five past.
      if (/^0[1-9]$/.test(next.digits)) minute = next.n;
    } else if (!next.words) {
      if (/^\d{2}$/.test(rest[next.from]!) && next.n <= 59) minute = next.n;
    } else if (next.n >= 10 && next.n <= 59) {
      minute = next.n;
    } else if (next.n === 0) {
      const unit = unitOf(rest[next.to] ?? "");
      if (unit !== null && unit > 0) minute = unit;
    }
  }
  return { hour: hour.n, minute, twelve: hour.words && hour.n <= 12 };
}

/**
 * A PRICE SAID AS EUROS AND CENTS, in cents (docs/41-fifth-batch.md, VB-7).
 *
 * `kolm eurot viiskümmend`, `kolm eurot ja viiskümmend senti`, and `kolm
 * viiskümmend eurot`, which is the shape a price tag is read out in, are all
 * 3,50 €; `3,50`, `3.50 €` and `3 eurot 50` are the same thing typed. A word
 * for cents is never needed and never read: the number after the euros is the
 * cents, whatever follows it, and no unit teaches the word.
 *
 * Only for the numbers round, which knows its question is a price, so a lone
 * number is whole euros. The scenes deal whole euros and read them as a
 * number (`numberFromText`), so they never call this.
 */
export function priceFromText(text: string): number | null {
  const lower = text.toLowerCase();
  const decimal = /(?:^|[^\d])(\d{1,4})[.,](\d{1,2})(?!\d)/.exec(lower);
  if (decimal) {
    const cents = decimal[2]!.length === 1 ? Number(decimal[2]) * 10 : Number(decimal[2]);
    return Number(decimal[1]) * 100 + cents;
  }
  const words = wordsAndDigits(lower);
  const runs = numberRuns(words).filter((run) => run.digits === undefined);
  const euros = runs[0];
  if (!euros) return null;
  const cents = runs[1];
  if (cents && cents.n < 100) {
    // Between the euros and the cents: nothing, the euro word, `ja`, or both.
    const between = words.slice(euros.to, cents.from);
    if (between.every((word) => isEuro(word) || word === "ja") && between.filter((w) => w === "ja").length <= 1) {
      return euros.n * 100 + cents.n;
    }
  }
  return euros.n * 100;
}

export function numberFromText(
  text: string,
  span: { min: number; max: number },
  formsOf: (lemma: string) => ReadonlySet<string> | undefined,
): { value: string; lemma?: string } | null {
  const fits = (n: number) => Number.isInteger(n) && n >= span.min && n <= span.max;
  for (const run of text.match(/\d+/g) ?? []) {
    if (fits(Number(run))) return { value: String(Number(run)) };
  }
  // A number said in words past the ones a card names a lemma for: `kakskümmend viis`.
  const composed = spokenNumbers(text).filter((said) => Number(said) > 10);
  for (const said of composed) {
    if (fits(Number(said))) return { value: String(Number(said)) };
  }
  // `kakskümmend viis` is 25 and not the 5 inside it.
  if (composed.length > 0) return null;
  const spoken = new Set(text.toLowerCase().split(/[^a-zõäöüšž]+/).filter(Boolean));
  for (let n = span.min; n <= span.max; n += 1) {
    for (const lemma of numberWords(String(n))) {
      const forms = formsOf(lemma);
      if (!forms) continue;
      if ([...forms].some((form) => spoken.has(form))) return { value: String(n), lemma };
    }
  }
  return null;
}
