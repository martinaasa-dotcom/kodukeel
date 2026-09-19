/**
 * TRY IT: THE READING ASKS BACK, ON THE TABLE IT JUST SHOWED.
 *
 * A reading step was a page of prose with a table under it, and a beginner
 * reads a table the way anybody reads one: once, quickly, and then presses
 * Continue with nothing to show for it. What turns a table into a thing
 * somebody has is being asked for one cell of it thirty seconds later, with
 * the whole table still on the screen above. That is not a test and grades
 * nothing, and it may not: the answer is printed two inches up, so a row in
 * the log would tell the scheduler somebody recalled a form they were looking
 * at, which is the fault `audit:questions` exists to catch one room over. It
 * is the build-a-word walk's last act, on a verb page and a case page.
 *
 * THREE QUESTIONS, EACH ABOUT ONE CELL, EACH WORDED AS A PERSON WOULD ASK IT.
 * "Which one is *we*, with `olema`?" rather than "select the first person
 * plural", because the point of the reading is that a form means something
 * and the question should say what. Every option on a question is a form the
 * page printed with its provenance, so nothing here is written or derived:
 * the questions are cut from the rows the page was handed and hold no
 * Estonian of their own.
 *
 * AND THE THREE ARE THREE DIFFERENT SHAPES where the table allows it, one per
 * verb, walked across the rows so the same verb is not asked three times
 * running. Deterministic given the rows and a random source, so a page can be
 * driven and a test can say which question came out.
 *
 * Pure, like the rest of `lib/course/`: no React, no Prisma, no clock.
 */

import { shuffle } from "@/lib/random/shuffle";

/** What a verb row on the reference page carries, structurally. */
export interface TryItVerb {
  readonly lemma: string;
  readonly translation: string;
  readonly forms: readonly { readonly code: string; readonly value: string }[];
}

/** What a case row on the reference page carries, structurally. */
export interface TryItCaseWord {
  readonly lemma: string;
  readonly translation: string;
  readonly genitive: string | null;
  /** The word in the case the page is about. */
  readonly form: string;
}

export interface TryItAsk {
  /** The question, in English, naming the word and what is wanted. */
  readonly prompt: string;
  /** The Estonian the question is about, for the screen to set `lang` on. */
  readonly about: string;
  /** Distinct forms to pick from, in the order to draw them. */
  readonly options: readonly string[];
  /** One of `options`. */
  readonly answer: string;
  /** Said after a right pick: what the form is. */
  readonly yes: string;
  /** Said after a wrong pick: the correction. */
  readonly no: string;
}

/** How many questions a reading asks back. */
export const TRY_IT_ASKS = 3;

/**
 * The six persons as a beginner reads them. The pronoun is the Estonian a
 * class uses and the English says who that is, which is the rule every
 * screen naming a form here follows (`lib/estonian/plainAsk.ts`).
 */
const PERSONS: readonly { code: string; pronoun: string; who: string }[] = [
  { code: "Sg1", pronoun: "ma", who: "I" },
  { code: "Sg2", pronoun: "sa", who: "you, to one person" },
  { code: "Sg3", pronoun: "ta", who: "he or she" },
  { code: "Pl1", pronoun: "me", who: "we" },
  { code: "Pl2", pronoun: "te", who: "you, to several or politely" },
  { code: "Pl3", pronoun: "nad", who: "they" },
];

const form = (verb: TryItVerb, code: string): string | undefined =>
  verb.forms.find((f) => f.code === code)?.value;

const distinct = (values: readonly (string | undefined)[]): string[] =>
  [...new Set(values.filter((v): v is string => Boolean(v)))];

/**
 * The persons table: one verb, six forms, which one is *we*.
 *
 * `olema` is `on` for `ta` and for `nad`, so the options are the distinct
 * forms and the question about `nad` still has one right answer, which is
 * what the note says out loud.
 */
function personAsk(verb: TryItVerb, prefix: "IndPr" | "KndPr", random: () => number): TryItAsk | null {
  const cells = PERSONS.map((p) => ({
    ...p,
    value: form(verb, `${prefix}${p.code === "Sg3" && prefix === "KndPr" ? "Ps" : p.code}`),
  })).filter((c): c is typeof c & { value: string } => Boolean(c.value));
  const options = distinct(cells.map((c) => c.value));
  if (options.length < 3) return null;
  const target = cells[Math.floor(random() * cells.length)]!;
  const sharing = cells.filter((c) => c.value === target.value && c.code !== target.code);
  const shared = sharing.map((c) => c.pronoun).join(" and ");
  const also = sharing.length > 0 ? `, and for ${shared} too` : "";
  const soDoes = sharing.length > 0 ? `, and so ${sharing.length > 1 ? "do" : "does"} ${shared}` : "";
  const mood = prefix === "KndPr" ? ", in the would-form" : "";
  return {
    prompt: `Which one is ${target.who}${mood}, with ${verb.lemma}, ${verb.translation}?`,
    about: verb.lemma,
    options: shuffle(options, random),
    answer: target.value,
    yes: `Yes. ${target.value} is ${verb.lemma} for ${target.pronoun}${also}.`,
    no: `Not that one. ${target.pronoun} takes ${target.value}${soDoes}.`,
  };
}

/**
 * The tables with one other form beside the first person: the negative, the
 * imperative and the past. The options are that form on each verb, so the
 * question is which verb says it, and the reading of the ending comes free.
 */
function acrossVerbsAsk(
  verbs: readonly TryItVerb[],
  target: TryItVerb,
  code: string,
  dress: (value: string) => string,
  wanted: (verb: TryItVerb) => string,
  what: string,
  random: () => number,
): TryItAsk | null {
  const answer = form(target, code);
  if (!answer) return null;
  const options = distinct(verbs.map((v) => form(v, code))).map(dress);
  if (options.length < 2) return null;
  return {
    prompt: wanted(target),
    about: target.lemma,
    options: shuffle(options, random),
    answer: dress(answer),
    yes: `Yes. ${dress(answer)} is ${what} ${target.lemma}, ${target.translation}.`,
    no: `Not that one. ${what[0]!.toUpperCase()}${what.slice(1)} ${target.lemma} is ${dress(answer)}.`,
  };
}

/**
 * The past table: one verb, three forms, which is the past and whose.
 */
function pastAsk(verb: TryItVerb, random: () => number): TryItAsk | null {
  const now = form(verb, "IndPrSg1");
  const me = form(verb, "IndIpfSg1");
  const them = form(verb, "IndIpfSg3");
  const options = distinct([now, me, them]);
  if (!me || !them || options.length < 3) return null;
  const aboutMe = random() < 0.5;
  const answer = aboutMe ? me : them;
  const who = aboutMe ? "I did it" : "he or she did it";
  return {
    prompt: `${verb.lemma}, ${verb.translation}: which one says ${who}, already over?`,
    about: verb.lemma,
    options: shuffle(options, random),
    answer,
    yes: `Yes. ${answer} is the past${aboutMe ? " about yourself" : " about somebody else"}, and ${now} is now.`,
    no: `Not that one. ${answer} is the one already over${aboutMe ? ", about yourself" : ", about somebody else"}.`,
  };
}

/**
 * Three questions off a verb table, or fewer where the rows cannot carry
 * three, or none at all: a page with one verb and one form has nothing to
 * ask, and asking anyway would be the question this whole module refuses.
 */
export function verbAsks(
  verbs: readonly TryItVerb[],
  show: "present" | "negative" | "conditional" | "imperative" | "past",
  random: () => number = Math.random,
): TryItAsk[] {
  const asks: TryItAsk[] = [];
  const rows = shuffle(verbs, random);
  for (let i = 0; i < rows.length && asks.length < TRY_IT_ASKS; i += 1) {
    const verb = rows[i]!;
    const ask = show === "present" ? personAsk(verb, "IndPr", random)
      : show === "conditional" ? personAsk(verb, "KndPr", random)
      : show === "past" ? pastAsk(verb, random)
      : show === "negative"
        ? acrossVerbsAsk(
            verbs, verb, "IndPrPs_", (v) => `ei ${v}`,
            (v) => `Which one says not, with ${v.lemma}, ${v.translation}?`,
            "the no-form of", random,
          )
        : acrossVerbsAsk(
            verbs, verb, "ImpPrSg2", (v) => `${v}!`,
            (v) => `Which one tells one person to do it, with ${v.lemma}, ${v.translation}?`,
            "the do-it form of", random,
          );
    if (ask) asks.push(ask);
  }
  /*
    A one-verb table asks the same verb up to three times, which is `olema`'s
    page and is right there: six persons of one verb is three questions'
    worth, on different persons. Only the seat is re-drawn, so the same
    person is not asked twice.
  */
  if (asks.length < TRY_IT_ASKS && verbs.length === 1 && (show === "present" || show === "conditional")) {
    const prefix = show === "present" ? "IndPr" : "KndPr";
    for (let tries = 0; tries < 12 && asks.length < TRY_IT_ASKS; tries += 1) {
      const ask = personAsk(verbs[0]!, prefix, random);
      if (ask && !asks.some((a) => a.answer === ask.answer && a.prompt === ask.prompt)) asks.push(ask);
    }
  }
  return asks;
}

/**
 * Three questions off a case table: the page shows six words in one case,
 * and the question is which of them is this word. The stem is what makes it
 * a question, since `tuba` is `toas` and nothing about the first says the
 * second, and the stem is what the page is about.
 */
export function caseAsks(
  words: readonly TryItCaseWord[],
  caseNameEt: string,
  ending: string,
  random: () => number = Math.random,
): TryItAsk[] {
  const usable = words.filter((w) => w.form && w.form !== w.lemma);
  if (distinct(usable.map((w) => w.form)).length < 3) return [];
  const asks: TryItAsk[] = [];
  for (const word of shuffle(usable, random).slice(0, TRY_IT_ASKS)) {
    const others = shuffle(usable.filter((w) => w.form !== word.form), random).slice(0, 3);
    const options = shuffle(distinct([word.form, ...others.map((o) => o.form)]), random);
    const stem = word.genitive && ending && word.form.endsWith(ending)
      ? ` The stem is ${word.genitive}, then ${ending}.`
      : "";
    asks.push({
      prompt: `Which one is ${word.lemma}, ${word.translation}, in the ${caseNameEt}?`,
      about: word.lemma,
      options,
      answer: word.form,
      yes: `Yes. ${word.form} is ${word.lemma} with the ending on.${stem}`,
      no: `Not that one. ${word.lemma} becomes ${word.form}.${stem}`,
    });
  }
  return asks;
}
