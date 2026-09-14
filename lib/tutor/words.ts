import { CASES } from "@/lib/estonian/cases";
import { derivedVerbForms, type VerbStems } from "@/lib/estonian/conjugate";
import { caseAnswer, stemsFrom } from "@/lib/estonian/derive";
import { caseIndex, readCase, tidyForm } from "@/lib/estonian/whichCase";
import { GRAMMATICAL_TERMS } from "@/lib/tutor/verify";

/**
 * THE WORDS A QUESTION IS ABOUT, AND WHAT THE DICTIONARY HOLDS FOR THEM.
 *
 * Asked for every case of `jalg`, Anu wrote fourteen forms and eleven of
 * them were wrong: the genitive came out as the partitive and every case
 * after it was built on that. Asked about `Soome`, she put it in the
 * allative. Nothing in her briefing could have stopped either, because the
 * briefing told her the rules and not the facts, and Estonian is a language
 * where the rule is the easy half. `lib/tutor/verify.ts` settled this for the
 * grader years ago: the model is handed the forms the dictionary holds and
 * held to them. This is the same idea for the chat, where a form cannot be
 * withheld after the fact because it has already streamed.
 *
 * So the route reads the words in the question, asks the dictionary for
 * each one exactly as a scanned page is read (`matchEstonianForm`, ADR-021),
 * and hands the principal parts over in the live block. The forms are the
 * dictionary's, the model is told to build on them and never past them, and
 * a word the dictionary does not hold is one she is told to say she is not
 * sure of. Nothing here is generated: `wordsNote` prints rows, and a row is
 * Ekilex's.
 *
 * Pure. `questionWords` picks the tokens and `wordsNote` prints the facts;
 * the database read between them is `lib/progress/tutorWords.ts`, and the
 * eval harness reads the shipped dictionary file through the same two
 * functions so it measures the block the route sends.
 */

/** What the dictionary holds for one word the question named. */
export interface WordFacts {
  lemma: string;
  pos: string;
  translation: string;
  government: string | null;
  gradationNote: string | null;
  forms: { formType: string; value: string }[];
  /**
   * The spellings in the question that resolved to this word, so the line
   * can say which case each one is. "Which case is toas" is answered by the
   * app's own table, one case or the honest list of the cases that share the
   * spelling, and never by the model: asked about `toas` with the forms in
   * front of it, the model still called it the alalütlev once in thirty.
   */
  asked?: string[];
}

/** How many words one question is grounded on. A question is about one or two; a pasted paragraph is not a question. */
export const MAX_QUESTION_WORDS = 8;

/**
 * How many nominals get their whole case table printed. A table is about
 * sixty tokens of live block per word, which the model reads uncached, and a
 * question is about one or two words: the first three get the table and the
 * rest their principal parts.
 */
export const MAX_TABLED = 3;

/**
 * English function words a question is made of, which are never worth a
 * dictionary read. Deliberately a list of the commonest hundred or so rather
 * than an English dictionary: the cost of a miss is one spare lookup that
 * matches nothing, and the cost of over-reach is grounding `laps` on the
 * English word "last". A quoted word skips the list, because a learner who
 * quotes "see" is asking about the Estonian one.
 */
export const ENGLISH_FUNCTION_WORDS = new Set(`the and for you your this that with what when where which who why how
does did doing done have has had having was were are is be been being can could would should
will shall may might must not but from into onto about there here they them their then than
these those some any all each every both either neither much many more most other another
such only just also very too even still yet again ever never always often sometimes right
wrong correct please thanks thank hello give tell say said says show explain mean means
meaning word words form forms case cases sentence question answer example use using used
between difference different same like want need know think make take get got put let
one two three first second last next new old good bad big small long short here there
why yes okay also because before after over under out off up down back way ways day days
estonian english language plural singular see saw seen`.split(/\s+/));

/**
 * The tokens of the learner's newest turns worth asking the dictionary
 * about, in the order they appear. The last two user turns, because "and in
 * the plural?" names its word one turn back.
 */
export function questionWords(messages: readonly { role: string; content: string }[]): string[] {
  const users = messages.filter((m) => m.role === "user").slice(-2).map((m) => m.content);
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (word: string) => {
    const key = word.toLowerCase();
    if (seen.has(key) || out.length >= MAX_QUESTION_WORDS * 3) return;
    seen.add(key);
    out.push(word);
  };
  for (const text of users.reverse()) {
    // A quoted word is the one the question is about, and skips the English list.
    for (const m of text.matchAll(/["'“”‘’]([\p{L}\p{M}-]{2,})["'“”‘’]/gu)) add(m[1]!);
    for (const m of text.matchAll(/[\p{L}\p{M}][\p{L}\p{M}-]{2,}/gu)) {
      const word = m[0];
      const key = word.toLowerCase();
      if (ENGLISH_FUNCTION_WORDS.has(key) || GRAMMATICAL_TERMS.has(key) || CASE_NAMES.has(key)) continue;
      add(word);
    }
  }
  return out;
}

/**
 * The English words of a question worth asking the dictionary's glosses about,
 * for a question that named no Estonian at all: "how do you say Tuesday" is
 * grounded on `teisipäev` only if something resolves Tuesday. Asked only where
 * the question resolved no Estonian word at all, so a question already about
 * a word is not padded with its English neighbours ("table" is `laud`, and a
 * question asking for a table of `olema` is not about one), and capped,
 * because a gloss lookup is one query and a paragraph is not a question.
 */
export const MAX_GLOSS_WORDS = 4;
export function glossWords(tokens: readonly string[], resolved: readonly WordFacts[]): string[] {
  if (resolved.length > 0) return [];
  const asked = new Set(resolved.flatMap((w) => (w.asked ?? []).map((t) => t.toLowerCase())));
  return tokens
    .filter((t) => /^[a-z]{3,}$/i.test(t) && !asked.has(t.toLowerCase()))
    .slice(0, MAX_GLOSS_WORDS);
}

/** Whether a dictionary gloss answers an English word: the whole gloss, its first sense, or a verb's "to X". */
export function glossAnswers(gloss: string, word: string): boolean {
  const first = gloss.split(/[,;]/)[0]!.trim().toLowerCase();
  const w = word.toLowerCase();
  return first === w || first === `to ${w}` || first === `a ${w}` || first === `an ${w}` || first === `the ${w}`;
}

/** A case the way the prompt names one: Estonian first, English after. */
function caseName(key: string): string {
  const c = CASES.find((one) => one.key === key);
  return c ? `${c.et} (${c.en.toLowerCase()})` : key.toLowerCase();
}

const CASE_NAMES = new Set(CASES.flatMap((c) => [c.et.toLowerCase(), c.en.toLowerCase()]));

const NOUN_PARTS: readonly [string, string][] = [
  ["NOM_SG", ""], ["GEN_SG", "genitive"], ["PART_SG", "partitive"], ["ILL_SG_SHORT", "short illative"],
  ["NOM_PL", "plural"], ["GEN_PL", "genitive plural"], ["PART_PL", "partitive plural"],
];
const VERB_PARTS: readonly [string, string][] = [
  ["INF_MA", ""], ["INF_DA", "da-infinitive"], ["PRES_1SG", "I"], ["PAST_1SG", "I (past)"], ["PART_TUD", "tud-participle"],
];

function first(forms: WordFacts["forms"], type: string): string | null {
  return forms.find((f) => f.formType === type)?.value ?? null;
}


const PRESENT_CODES = ["IndPrSg1", "IndPrSg2", "IndPrSg3", "IndPrPl1", "IndPrPl2", "IndPrPl3"] as const;

/**
 * A verb's present tense as one line, the negative and the simple past third
 * person after it where the dictionary holds them. A stored person wins over a
 * derived one, which is what lets `olema` be printed at all: no rule reaches
 * `on`, the harvest stores it, and without this line the cheapest model wrote
 * `olette` for the second person plural in a table it was asked for.
 */
export function personsLine(word: WordFacts): string | null {
  const stored = (code: string) => word.forms.find((f) => f.formType === `EKILEX:${code}`)?.value ?? null;
  const verb: VerbStems = { lemma: word.lemma, pres1sg: first(word.forms, "PRES_1SG") };
  const derived = new Map(derivedVerbForms(verb).map((f) => [f.morphCode, f.value]));
  const persons = PRESENT_CODES.map((code) => stored(code) ?? derived.get(code) ?? (code === "IndPrSg1" ? verb.pres1sg ?? null : null));
  if (persons.some((p) => p === null)) return null;
  const bits = [`present ${persons.join(", ")}`];
  const negative = stored("IndPrPs_") ?? derived.get("IndPrPs_") ?? stored("IndPrPsN");
  if (negative) bits.push(`after ei: ${negative}`);
  const past3 = stored("IndIpfSg3");
  if (past3) bits.push(`past he/she ${past3}`);
  return bits.join("; ");
}

/**
 * The eleven cases a nominal takes after the three it memorises, each with its
 * name, so a case is named off the table rather than guessed at: asked for
 * "on Tuesday" the cheapest model wrote the right form and called it the
 * seesütlev, which is the slip the prompt warns against, and the table is
 * what makes the warning checkable. `caseAnswer` puts an attested form ahead
 * of the rule, so `tuppa / toasse` prints as the pair it is.
 */
export function casesLine(word: WordFacts): string | null {
  const stems = stemsFrom(word.forms);
  if (!stems.genSg) return null;
  const cells: string[] = [];
  for (const c of CASES) {
    if (c.principal) continue;
    const answer = caseAnswer(stems, c.key);
    if (!answer) continue;
    const shown = answer.alsoRight ? `${answer.value} / ${answer.alsoRight}` : answer.value;
    cells.push(`${shown} (${c.et})`);
  }
  return cells.length ? `cases ${cells.join(", ")}` : null;
}

/**
 * One line per word, the dictionary's own principal parts and nothing else.
 * A nominal gets its seven, a verb its five, and a word with none of them
 * is named with its meaning alone, which is still worth saying: it tells
 * the model the word exists and what it means.
 */
export function wordLine(word: WordFacts, tabled = false): string {
  const isVerb = word.pos === "VERB";
  const parts = (isVerb ? VERB_PARTS : NOUN_PARTS)
    .map(([type, label]) => {
      const value = first(word.forms, type);
      if (!value) return null;
      // The short illative is only news where it differs from the three the learner memorises.
      if (type === "ILL_SG_SHORT" && [first(word.forms, "GEN_SG"), first(word.forms, "PART_SG"), word.lemma].includes(value)) return null;
      return label ? `${label} ${value}` : value;
    })
    .filter((p): p is string => p !== null);
  const head = `${word.lemma} (${word.pos.toLowerCase()}, ${word.translation})`;
  const bits = [parts.join(", ")];
  if (word.gradationNote) {
    const plain = gradePlain(word.gradationNote, word.lemma, first(word.forms, isVerb ? "PRES_1SG" : "GEN_SG"));
    bits.push(`grade change ${word.gradationNote}${plain ? `, which is ${plain}` : ""}`);
  }
  if (word.government) bits.push(`takes ${word.government}`);
  if (isVerb) {
    const persons = personsLine(word);
    if (persons) bits.push(persons);
  } else if (tabled) {
    const cases = casesLine(word);
    if (cases) bits.push(cases);
  }
  if (!isVerb && first(word.forms, "GEN_SG")) {
    const index = caseIndex(stemsFrom(word.forms));
    for (const spelling of word.asked ?? []) {
      const written = tidyForm(spelling);
      if (!written || written === word.lemma.toLowerCase()) continue;
      const verdict = readCase(index, written);
      if (verdict.kind === "one") bits.push(`${written} is its ${caseName(verdict.key)}`);
      else if (verdict.kind === "shared") {
        const names = verdict.keys.map(caseName);
        bits.push(`${written} is its ${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`);
      }
    }
  }
  const rest = bits.filter(Boolean).join("; ");
  return rest ? `- ${head}: ${rest}` : `- ${head}`;
}

/**
 * The grade note said in words, because the note alone was not enough.
 *
 * Asked to explain `tuba : toa` with `b : ∅` in front of it, the cheapest
 * model that otherwise teaches well wrote twice that a "double vowel u
 * softens", which is not what happens and is the one fault worse than no
 * answer on the one question about gradation. The note is two spellings and a
 * colon, and a model reads that as a hint rather than as the fact. This says
 * the fact: which letters, in which form, and what they become, built out of
 * the note and the two forms it is about, so nothing here is typed. A note
 * this cannot read is left as the note.
 */
export function gradePlain(note: string, strongForm: string, weakForm: string | null): string | null {
  const m = /^(\S+) : (\S+)$/.exec(note.trim());
  if (!m || !weakForm) return null;
  const [, strong, weak] = m;
  if (weak === "∅") return `the ${strong} in ${strongForm} dropping out in ${weakForm}`;
  if (strong === "∅") return `${weakForm} gaining ${weak} that ${strongForm} does not have`;
  return `the ${strong} in ${strongForm} becoming ${weak} in ${weakForm}`;
}

/**
 * Whether the question is about forms, which is when a case table helps.
 *
 * Measured both ways on the cheapest model. With the table under every
 * nominal, "how do you say on Tuesday" stopped calling the alalütlev the
 * seesütlev; and "is this right: ma töötan kool" went from `koolis` three
 * times in three to `koolil` and `koolina`, the model shopping among eleven
 * forms it had been handed for a sentence that needed one. So the table goes
 * where somebody asked for a form, by a case name, a word like ending or
 * case, or a question with no Estonian in it (`asked` empty, which is a word
 * reached through its gloss: "how do you say Tuesday"), and a sentence to
 * correct gets the principal parts alone.
 */
const FORM_WORDS = /\b(cases?|endings?|forms?|declin\w*|inflect\w*|conjugat\w*|tables?|genitive|partitive|nominative|illative|inessive|elative|allative|adessive|ablative|translative|terminative|essive|abessive|comitative)\b/i;
export function asksForForms(messages: readonly { role: string; content: string }[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (FORM_WORDS.test(last)) return true;
  const lower = last.toLowerCase();
  return CASES.some((c) => lower.includes(c.et));
}

function tabledLines(words: readonly WordFacts[], forms: boolean): string[] {
  let tabled = 0;
  return words.map((word) => {
    const table = word.pos !== "VERB" && tabled < MAX_TABLED && (forms || (word.asked ?? []).length === 0);
    if (table) tabled += 1;
    return wordLine(word, table);
  });
}

/**
 * The block the route sends after the learner's note. Empty where the
 * question named no word the dictionary holds, so a question about English
 * grammar costs nothing here.
 */
export function wordsNote(words: readonly WordFacts[], forms = false): string {
  if (words.length === 0) return "";
  return [
    "WORDS IN THE QUESTION, AS THE DICTIONARY HOLDS THEM",
    "These forms are checked. Use them as they are, build the regular cases on the genitive given here, and never contradict them. A word the question is about that is not listed here is one whose forms you are not sure of: say so rather than guess. A change inside a word is exactly what the grade change says, a consonant becoming another or dropping out between two forms; it is never a vowel, a rhythm or a softening, so say which letters change and into what, and stop. Where a word's cases are listed, the name in brackets after a form is the name of that case, and it is the only name you may give it.",
    ...tabledLines(words.slice(0, MAX_QUESTION_WORDS), forms),
  ].join("\n");
}
