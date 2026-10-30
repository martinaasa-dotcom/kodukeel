/**
 * WHAT A NATIVE SPEAKER DOES NOT SAY, WRITTEN DOWN SO NOBODY WRITES IT AGAIN.
 *
 * Every line a learner reads in a lesson, a scene, a pick, a written sentence
 * or a joke has to be what an ordinary Estonian would actually say to a friend,
 * a neighbor, a shop assistant or a colleague. Correct is not the bar. A line
 * can pass every grammar check this app has and still be a textbook sentence,
 * an English sentence in Estonian words, or a reply nobody would make, and a
 * learner who copies it sounds like a phrasebook. The operator, who is a native
 * speaker, reported exactly that off a lesson ("Kõik? Tubli!" about a book read
 * to the end, where anybody says "Terve raamatu?"), and two sweeps of every
 * lesson and scene followed.
 *
 * No check can hear whether a sentence is natural, so the judgment stays with
 * the native speaker who reads every new line in the pull request
 * (ADR-005 amendments 4 to 6). What a check can do is refuse the mistakes that
 * have already been found and are wrong wherever they appear, so the same
 * calque cannot come back in the next lesson somebody writes.
 * `lib/course/lessons/spoken.test.ts` sweeps every line against this table.
 *
 * An entry goes in only when the phrase is wrong in every context it could
 * appear in. A phrase that is right somewhere ("Siin on jälle sama viga") is
 * not a pattern: it is a line for the native speaker to read. Each entry says
 * what people say instead and why, in English.
 */

export interface NotSaid {
  /** The phrase as an author would write it, matched case-insensitively. */
  readonly pattern: RegExp;
  /** A line that breaks it, so the pattern is checked to fire. */
  readonly example: string;
  /** What an Estonian says instead, checked not to fire. */
  readonly say: string;
  /** Why, in one line of English. */
  readonly why: string;
}

/** A word boundary that knows õ, ä, ö, ü, š and ž are letters, which `\b` does not. */
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const re = (body: string) => new RegExp(`${B}${body}${E}`, "iu");

export const NOT_SAID: readonly NotSaid[] = [
  {
    pattern: re("kuidas ma saan (teid |sind )?aidata"),
    example: "Tere! Kuidas ma saan aidata?",
    say: "Kuidas saan aidata? / Kuidas saan teid aidata? / Millega saan aidata?",
    why: "The pronoun in front is English word order; a shop, a desk or a phone line drops it.",
  },
  {
    pattern: new RegExp(`(?:^|[.!?]\\s+)lepime kokku!`, "iu"),
    example: "Hea küll. Lepime kokku!",
    say: "Kokku lepitud!",
    why: "Lepime kokku proposes a plan; the one who agrees answers Kokku lepitud.",
  },
  {
    pattern: new RegExp(`${B}[Ss]iin on jälle \\p{Lu}`, "u"),
    example: "Tere, Urmas! Siin on jälle Tom.",
    say: "Siin jälle Tom.",
    why: "On the phone people say Siin jälle and a name, without on.",
  },
  {
    pattern: re("midagi on (ikka |jälle )?vale"),
    example: "Ma proovisin, aga midagi on ikka vale.",
    say: "Midagi on valesti.",
    why: "Something is wrong is valesti; vale here is the English sentence in Estonian words.",
  },
  {
    pattern: re("jah, kuna"),
    example: "Jah, kuna see on oluline.",
    say: "Jah, sest...",
    why: "A spoken yes-because takes sest; kuna is the written word that leads a sentence.",
  },
  {
    pattern: re("(buss|rong|tramm|troll|praam) sõidab iga"),
    example: "Jah, buss sõidab iga tund.",
    say: "Buss käib iga tund.",
    why: "A regular service käib; sõidab is a vehicle on a particular trip.",
  },
  {
    pattern: re("kõik\\? tubli"),
    example: "Kõik? Tubli!",
    say: "Terve raamatu? Tubli!",
    why: "Kõik is all of several things; one whole thing is terve.",
  },
  {
    pattern: re("tere (hommikust|päevast|õhtust), kõik!"),
    example: "Tere hommikust, kõik!",
    say: "Tere hommikust kõigile!",
    why: "Greeting everybody is kõigile; a bare kõik after the greeting is the English sentence in Estonian words.",
  },
  {
    pattern: re("mida (sa|te) sellest mõtle(d|te)"),
    example: "Ma tahan ka kooris laulda. Mida sa sellest mõtled?",
    say: "Mis sa arvad?",
    why: "An opinion is asked with arvama; mõtlema here is a calque of what do you think of it.",
  },
  {
    pattern: re("mis (teid|sind) täna toob"),
    example: "Tere! Mis teid täna toob?",
    say: "Millest te rääkida tahate? / Kuidas saan aidata?",
    why: "A calque of what brings you here today.",
  },
  {
    pattern: re("seda riiet proovida"),
    example: "Kas te soovite seda riiet proovida?",
    say: "Kas soovite seda proovida?",
    why: "Riie is cloth; a garment you try on is just seda, or selga proovida.",
  },
  {
    pattern: re("ei, on (väike|suur|vana|uus|hea|halb|ilus|kallis|odav|noor|pikk|lühike|kerge|raske)"),
    example: "Ei, on väike. Aga ilus.",
    say: "Ei, see on väike. / Ei, väike.",
    why: "A no cannot drop the subject and keep on: keep see on, or drop both.",
  },
  {
    pattern: re("(kiire on|mul on kiire), (öelge|rääkige|räägi|ütle) kohe"),
    example: "Kiire on, öelge kohe.",
    say: "Mul on natuke kiire. / Vabandust, mul on kiire.",
    why: "A hurried person says they are in a hurry; ordering the other side to say it now is a phrasebook line.",
  },
];

/** Every entry the text breaks, empty where it reads as people talk. */
export function notSaidIn(text: string): readonly NotSaid[] {
  return NOT_SAID.filter((entry) => entry.pattern.test(text));
}
