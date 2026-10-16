/**
 * HOW PEOPLE ACTUALLY SAY HELLO AND GOODBYE, WHICH IS NOT HOW THE COURSE SAYS IT.
 *
 * A scene's greet beat is met by anything the learner says back, and its close
 * beat by `Head aega!`, `Nägemist!` or a plain thanks. Those are the greetings
 * the course teaches, and they are not the ones anybody uses with a friend: a
 * learner ended a scene with "ciao", another with "tsau", and the friend on the
 * phone answered "Vabandust!" and asked the same question again. Somebody who
 * says goodbye has left, whichever word they left with, and a scene that
 * cannot hear "tsau" is a scene that has never been on an Estonian street.
 *
 * ACCEPT ONLY. This table is read by `readTurn` to decide whether a turn
 * greeted or took its leave, and by nothing else: nothing here is ever said by
 * the other side, banked, graded or put on a card, and a beat met through it
 * is written down as a substitution so no row in the review log claims the
 * learner produced the course's own farewell. That is the shape `ENGLISH` in
 * `turn.ts` already takes and the shape ADR-005 allows: a word list read to
 * understand, never to answer.
 *
 * Two halves, kept apart because they are two claims. `et` is Estonian as it
 * is spoken, loans included, and every entry is a spelling the forms list
 * (`prisma/data/forms/`, Ekilex and Vabamorf with guessing off) vouches for,
 * asserted in `casual.test.ts`, so this file writes no Estonian the language
 * has not already written down. `other` is what a learner brings with them
 * from another language, which English, German, Russian, Finnish and Italian
 * all leave on an Estonian street corner; those are written here on the
 * latitude `ENGLISH` takes, since they are not Estonian and cannot be checked
 * against it.
 *
 * `tsau` is in both halves of the day, exactly as "ciao" is, so which it means
 * is the beat's to say: on the greet beat it is hello and anywhere else it is
 * goodbye, which is what a person on the other end of the phone would take it
 * as too.
 *
 * Pure: no React, no Next, no Prisma, no network.
 */
import { fold } from "@/lib/estonian/fold";

export const CASUAL = {
  hello: {
    et: ["tsau", "tšau", "tsauki", "hei", "tervist", "hai"],
    other: ["hi", "hello", "hey", "ciao", "hallo", "hej", "moi", "privet", "salut", "hola", "yo"],
  },
  bye: {
    et: ["tsau", "tšau", "tsauki", "pakaa", "hüvasti", "nägemiseni", "kohtumiseni", "davai", "näeme"],
    other: ["bye", "goodbye", "ciao", "tschüss", "adieu", "adios", "hejdå", "poka", "cheers", "later"],
  },
} as const;

/**
 * THE ONE-WORD LEAVE-TAKINGS THAT MEAN NOTHING ELSE, AS WHOLE PHRASES FOR THE
 * GATE. A line on a beat that is not the goodbye is withheld for saying one,
 * and the gate knew only the two the course teaches, so `Kohtumiseni!` ended a
 * phone call mid-question with every check green. Words that are also hello
 * (`tsau`) are left out, since a line may open on one.
 */
export const CLOSING_WORDS = ["nägemiseni", "kohtumiseni", "hüvasti"] as const;

/**
 * What a learner says on their way out that is not a farewell the course
 * teaches: a customer who wrote "aitäh, näeme veel!" and asked one last thing
 * was answered as somebody still at the counter, with the goodbye held back
 * for them to say first. Read off the learner's turn and never the other
 * side's line, since a landlord's `näeme teisipäeval` is a plan, not a leaving.
 */
export const LEAVING = ["näeme veel", "näeme hiljem", "head päeva", "ilusat päeva", ...CLOSING_WORDS] as const;

/**
 * How long a turn may be and still be read as a bare leave-taking.
 *
 * `Head aega!` is credited anywhere in a turn because a scene names it; a word
 * that means hello as readily as goodbye is credited only where it is most of
 * what was said. "ok tsau" is somebody leaving; "tsau, kuhu ma pean minema?"
 * is somebody asking, and reading it as a goodbye would end the scene on a
 * question the learner wanted answered.
 */
export const CASUAL_BYE_WORDS = 3;

const HELLO = new Set([...CASUAL.hello.et, ...CASUAL.hello.other].map(fold));
const BYE = new Set([...CASUAL.bye.et, ...CASUAL.bye.other].map(fold));

/** The casual hello in a turn, or null. Folded, since `tšau` is typed on a keyboard with no š. */
export function casualHello(spoken: readonly string[]): string | null {
  return spoken.find((word) => HELLO.has(fold(word))) ?? null;
}

/** The casual goodbye in a short turn, or null. */
export function casualBye(spoken: readonly string[]): string | null {
  if (spoken.length === 0) return null;
  /*
    A two-word goodbye is a goodbye at any length a goodbye is said in:
    "Aitäh, kõike head ja head õhtut" is somebody leaving, and the length
    limit below is about a single word that is also hello on the way in,
    which none of these is.
  */
  const text = ` ${spoken.map(fold).join(" ")} `;
  const phrase = BYE_PHRASES.find((bye) => text.includes(` ${fold(bye)} `));
  if (phrase && spoken.length <= BYE_PHRASE_WORDS) return phrase;
  if (spoken.length > CASUAL_BYE_WORDS) return null;
  return spoken.find((word) => BYE.has(fold(word))) ?? null;
}

/**
 * Goodbyes of two or more words that no unit teaches whole and everybody
 * says: "all the best", "good night", "have a good evening", "see you". Read
 * to accept on a closing beat and never said (ADR-005: the other side says
 * only the course's farewells).
 */
export const BYE_PHRASES = [
  "kõike head", "head ööd", "head õhtut", "head päeva", "ilusat päeva", "ilusat õhtut",
  "head nädalavahetust", "näeme homme", "näeme hiljem", "näeme veel", "näeme siis",
] as const;
const BYE_PHRASE_WORDS = 8;

/**
 * Yes, said the way people say it: "ok", "olgu", "hea küll", "hea mõte",
 * "kokku lepitud". A beat that takes `jah` or `hästi` as agreement takes these
 * too, met as a substitution so no row claims the learner produced the
 * course's word. Read to accept and never to answer.
 */
export const AGREE = {
  words: ["ok", "okei", "okay", "olgu", "kokkulepitud", "sobib", "selge", "kindlasti", "muidugi", "aitäh", "jaa", "jep"],
  phrases: ["hea küll", "hea mõte", "kokku lepitud", "olgu siis", "nii teeme", "teeme nii", "väga hea"],
} as const;
const AGREE_WORDS = new Set(AGREE.words.map(fold));
const AGREE_TURN_WORDS = 5;

/** The agreement a short turn says, or null. */
export function casualYes(spoken: readonly string[]): string | null {
  if (spoken.length === 0 || spoken.length > AGREE_TURN_WORDS) return null;
  const text = ` ${spoken.map(fold).join(" ")} `;
  const phrase = AGREE.phrases.find((yes) => text.includes(` ${fold(yes)} `));
  return phrase ?? spoken.find((word) => AGREE_WORDS.has(fold(word))) ?? null;
}

/**
 * Whether a turn takes leave, rather than only thanking somebody: one of the
 * course's farewells anywhere in it (`FAREWELLS`, handed in so this module
 * stays free of the catalogue), or a casual goodbye that is most of it. A
 * bare `Aitäh` is thanks, and read as leaving it ended a doctor's
 * appointment the moment the learner thanked the receptionist for an answer.
 */
export function saysGoodbye(said: string, farewells: readonly string[]): boolean {
  const spoken = (said.match(/[\p{L}]+/gu) ?? []).map((w) => w.toLowerCase());
  const text = ` ${fold(spoken.join(" "))} `;
  const named = farewells.some((bye) => {
    const parts = (bye.match(/[\p{L}]+/gu) ?? []).map((w) => w.toLowerCase());
    return parts.length > 0 && text.includes(` ${fold(parts.join(" "))} `);
  });
  return named || casualBye(spoken) !== null;
}

/**
 * HOW A LEARNER ASKS THE OTHER SIDE TO SLOW DOWN OR SAY IT AGAIN.
 *
 * `rääkige aeglasemalt` is the single most useful sentence a learner owns, as
 * the course says where it teaches `aeglaselt`, and a scene answered it with
 * `Ei tea.`: the request rode in a turn with a question mark, the turn had met
 * its beat, and nothing the scene could say about the card answered "could you
 * speak more slowly?". That is a shrug at somebody asking for help, which the
 * keyless critic flagged in every scene a confused learner played.
 *
 * ACCEPT ONLY, in `CASUAL`'s two halves and for its reason. The Estonian half
 * is what people say, the comparative the course does not store among it, and
 * every entry is a spelling the forms list vouches for, asserted. `korda` is
 * deliberately not here: it is "repeat!" and also `kaks korda`, "twice", which
 * is how a pharmacist says how often to take something. What it changes is
 * small and safe: such a turn is never shrugged at, and nothing about how it is
 * marked or graded moves.
 */
export const AGAIN = {
  et: ["aeglasemalt", "aeglaselt", "korrake", "korrata", "kordaksite", "kordate"],
  other: ["slowly", "slower", "repeat", "langsamer", "медленнее"],
} as const;

const AGAIN_WORDS = new Set([...AGAIN.et, ...AGAIN.other].map(fold));

/** Whether the turn asks the other side to slow down or say it again. */
/**
 * HOW A LEARNER ASKS THE OTHER SIDE TO WAIT, WHICH IS NOT A MISS.
 *
 * "oota", "üks hetk" and "ma mõtlen" were read as real Estonian off the
 * point: the other side said "Selge.", the app stepped in with a tip, and the
 * question came again, at somebody who had only asked for a moment. A person
 * says "Hästi." and waits. Accept only, like `AGAIN`: a short turn made of
 * these and nothing else, with at least one word that asks for the time.
 */
export const HOLD = {
  asks: ["oota", "oodake", "ootke", "hetk", "hetke", "hetkeks", "moment", "momendike", "mõtlen", "mõtleme"],
  around: ["üks", "ma", "me", "palun", "natuke", "korraks", "nüüd", "kohe", "las"],
} as const;
const HOLD_ASKS = new Set(HOLD.asks.map(fold));
const HOLD_AROUND = new Set(HOLD.around.map(fold));

export function asksToWait(spoken: readonly string[]): boolean {
  return spoken.length > 0 && spoken.length <= 4
    && spoken.every((word) => HOLD_ASKS.has(fold(word)) || HOLD_AROUND.has(fold(word)))
    && spoken.some((word) => HOLD_ASKS.has(fold(word)));
}

export function asksSlower(spoken: readonly string[]): boolean {
  return spoken.some((word) => AGAIN_WORDS.has(fold(word)));
}
