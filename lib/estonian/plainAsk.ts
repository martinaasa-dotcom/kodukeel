import { caseByKey } from "./cases";
import type { Locale } from "@/lib/copy/locale";

/**
 * WHAT A SLOT IS ASKING FOR, IN THE WORDS SOMEBODY WOULD USE OUT LOUD.
 *
 * A learner reported a flash card headed "Put it in the lihtminevik · ma" and
 * said they could not tell what it wanted. They were right, and the reply they
 * wrote is the specification for this file: the word is `kohtuma`, and what the
 * card is actually asking is how you say it about yourself, in the past. The
 * answer was `kohtusin`, and nothing on the screen said so in a way somebody
 * could act on without already knowing what `lihtminevik` means.
 *
 * That is not an argument against the Estonian names. CLAUDE.md is emphatic
 * about them and it is right: a class in Tallinn, a school textbook and the
 * state examination all name a case by its Estonian name and by the question it
 * answers, and a learner who has only ever met "the inessive" cannot follow
 * their own teacher. What was missing is the layer under it. Somebody who has
 * not met `seesütlev` yet needs to know what is being asked *before* they can
 * learn what it is called, and a name they cannot cash in is furniture.
 *
 * So this is the third thing a screen can say about a slot, beside the Estonian
 * name and the English one, and it is the one that leads on a card: a clause
 * that finishes "How do you say this ...?" and means something to a person who
 * has never opened a grammar book. The name stays on the screen underneath it,
 * where it is the cross-reference it was always meant to be.
 *
 * NOTHING HERE IS GENERATED AND NOTHING HERE IS ESTONIAN. Every clause is
 * authored English about a slot key, which is the same latitude
 * `lib/estonian/grammar.ts` takes: English is the one language this project
 * writes. In particular a clause never inflects the learner's word in either
 * language. "I met" would read better than "about yourself, already happened",
 * and there is no rule that turns "to meet" into "met" for every verb in
 * English any more than there is one that turns `kohtuma` into `kohtusin`, so
 * the clause describes the form rather than spelling it. The dictionary spells
 * it, after the answer.
 *
 * DELIBERATELY PARTIAL, like `lib/estonian/terms.ts` and for its reason. A slot
 * is in the table only where a plain sentence says something a name does not.
 * `PRODUCTION` is not in it, because "how do you say this word" is already the
 * whole question and a clause under it would be the question again.
 *
 * Pure: no React, no Prisma, no Estonian.
 */

/** Completes "How do you say this ...?" for one slot. Null where nothing to add. */
const CLAUSES: Record<string, string> = {
  /*
    The cases, said as the thing you would be doing when you reach for one.

    Written as "something" and "somebody" rather than with the learner's own
    word in them, because the word is already at the top of the card in both
    languages and a gloss dropped into a frame reads badly the moment it is a
    list: `tuba` is glossed "room, chamber" and "when something is inside room,
    chamber" is worse than no sentence at all.
  */
  NOMINATIVE: "as the plain dictionary word",
  GENITIVE: "when something belongs to it, like English “of” or “’s”",
  PARTITIVE: "when you mean some of it, or the action isn't finished",
  ILLATIVE: "when something goes into it",
  INESSIVE: "when something is inside it",
  ELATIVE: "when something comes out of it, or is about it",
  ALLATIVE: "when something goes to it, or is given to somebody",
  ADESSIVE: "when something is on it, or somebody has it",
  ABLATIVE: "when something comes off it, or from it",
  TRANSLATIVE: "when something turns into it",
  TERMINATIVE: "when you mean up to it, or until it",
  ESSIVE: "when somebody is working or acting as it",
  ABESSIVE: "when something is done without it",
  COMITATIVE: "when something is done with it",

  /*
    The verb, said as the two things a course keeps apart that a learner can
    feel: who is doing it, and when. The four axes are on the card underneath
    in their own names, which is where somebody sitting a course will want
    them.
  */
  IndPrSg1: "about yourself, right now",
  IndPrSg3: "about somebody else, right now",
  IndPrPl1: "about you and others, right now",
  IndPrPs_: "to say you don't do it",
  IndIpfSg1: "about yourself, in the past",
  IndIpfSg3: "about somebody else, in the past",
  KndPrSg1: "about yourself, as something you'd do",
  ImpPrSg2: "to tell one person you know to do it",
  ImpPrPl2: "to ask a group, or somebody politely, to do it",

  /*
    The infinitive and the participles, which are the verb forms a gap-fill
    actually asks for: 210 of the 249 verb gaps the shipped dictionary builds
    want one of these three, because a sentence a lexicographer wrote is far
    likelier to hold an infinitive or a participle than a first person.

    Said as what the form means rather than as what it is built out of. There
    is no way to name the da-infinitive apart from the ma-infinitive in plain
    English without naming the Estonian verbs it follows, which this module may
    not do, so the clause says the half that is always true and the name under
    it on the card is where the rest lives.
  */
  Inf: "when you mean “to do it”",
  PtsPtPs: "when somebody has already done it",
  PtsPtIps: "when it's been done and nobody says who did it",
  PtsPrPs: "when you mean the one doing it",
};

/**
 * The plain-English clause for a slot, or null where there is nothing to add.
 *
 * Null is an answer rather than a gap: a screen with no clause prints the name
 * on its own, exactly as it did before this existed.
 */
export function plainAsk(slot: string, locale: Locale = "en"): string | null {
  if (locale !== "en") return CLAUSES_IN[locale][slot] ?? null;
  return CLAUSES[slot] ?? null;
}

/*
  SAY IT, IN THE FEWEST WORDS THAT ARE TRUE.

  "lind", then "millega?", then "How do you say this when something is done
  with it?", then "kaasaütlev, with whom? with what?" is four lines for one
  instruction, and a learner reported the card as busy and wordy for no reason.
  They said what the card should say, and it is the whole of this section: the
  ending means "with", so ask for "with it", and where the screen holds the
  word's gloss, "with the bird" (`lib/estonian/sayIt.ts`, which adds the gloss
  and is kept apart because it reads the dictionary's sense table, which the
  modules that mark answers may not reach). The Estonian name goes after the
  answer, where it is the thing to remember rather than a thing to decode.
*/

/** The short phrase per case where there is no gloss to put in it. */
export const CASE_SHORT: Readonly<Record<string, string>> = {
  NOMINATIVE: "the plain word",
  GENITIVE: "of it",
  PARTITIVE: "some of it",
  ILLATIVE: "into it",
  INESSIVE: "in it",
  ELATIVE: "out of it",
  ALLATIVE: "onto it, or to someone",
  ADESSIVE: "on it, or someone has it",
  ABLATIVE: "off it, or from someone",
  TRANSLATIVE: "becoming it",
  TERMINATIVE: "up to it",
  ESSIVE: "as it",
  ABESSIVE: "without it",
  COMITATIVE: "with it",
};

/** Verb slots said without the verb, for a screen that holds no gloss. */
export const VERB_SHORT: Readonly<Record<string, string>> = {
  IndPrSg1: "I …, now",
  IndPrSg3: "he/she …, now",
  IndPrPl1: "we …, now",
  IndPrPs_: "don't …",
  IndIpfSg1: "I …, in the past",
  IndIpfSg3: "he/she …, in the past",
  KndPrSg1: "I would …",
  ImpPrSg2: "do it! (to a friend)",
  ImpPrPl2: "do it! (politely)",
  Inf: "to …",
  PtsPtPs: "has done it",
  PtsPtIps: "was done, by nobody named",
  PtsPrPs: "the one doing it",
};

/** The short phrase for a slot with no word in it, or null for a question about meaning. */
export function sayShort(slot: string, locale: Locale = "en"): string | null {
  if (locale !== "en") return CASE_SHORT_IN[locale][slot] ?? VERB_SHORT_IN[locale][slot] ?? null;
  return CASE_SHORT[slot] ?? VERB_SHORT[slot] ?? null;
}

/**
 * The whole instruction, ready to print above a box: `Say “with it”`.
 *
 * This was "How do you say this when something is done with it?", eleven words
 * for two. A screen holding the word's gloss reads `sayLine` in
 * `lib/estonian/sayIt.ts` instead, which says "with the bird".
 */
export function plainAskLine(slot: string, locale: Locale = "en"): string | null {
  const phrase = sayShort(slot, locale);
  if (!phrase) return null;
  if (locale === "ru") return `Скажите «${phrase}»`;
  if (locale === "uk") return `Скажіть «${phrase}»`;
  return `Say “${phrase}”`;
}

/*
  THE NAME OF AN ENDING, AFTER THE ANSWER, IN THE FEWEST WORDS.

  Once the answer is on the screen the card names the ending, so the learner
  has something to call it, by the Estonian name their class uses. It used to
  print that name, then the two questions the case answers in Estonian, then
  the same two in English, and a learner asked for that to be simpler too. The
  name and the one English word it means is enough: "<name>: the “with”
  ending". The name is read off `CASES`, so this file still types no Estonian.
*/

/** The one English word each case means, for naming it after the answer. */
const ENDING_WORD: Readonly<Record<string, string>> = {
  GENITIVE: "of",
  PARTITIVE: "some of",
  ILLATIVE: "into",
  INESSIVE: "in",
  ELATIVE: "out of",
  ALLATIVE: "onto, or to",
  ADESSIVE: "on, or has",
  ABLATIVE: "off, or from",
  TRANSLATIVE: "becoming",
  TERMINATIVE: "up to",
  ESSIVE: "as",
  ABESSIVE: "without",
  COMITATIVE: "with",
};

/**
 * `<name>: the “with” ending`, or null for a slot that is not a case.
 *
 * The nominative is the plain word rather than an ending, so it says so.
 */
export function endingName(slot: string, locale: Locale = "en"): string | null {
  const spec = caseByKey(slot);
  if (!spec) return null;
  if (locale !== "en") {
    if (spec.key === "NOMINATIVE") return locale === "ru" ? `${spec.et}: слово как есть` : `${spec.et}: слово як є`;
    const said = ENDING_WORD_IN[locale][spec.key];
    if (!said) return spec.et;
    return locale === "ru" ? `${spec.et}: окончание «${said}»` : `${spec.et}: закінчення «${said}»`;
  }
  if (spec.key === "NOMINATIVE") return `${spec.et}: the plain word`;
  const word = ENDING_WORD[spec.key];
  return word ? `${spec.et}: the “${word}” ending` : spec.et;
}

/*
  THE SAME FOUR TABLES IN RUSSIAN AND UKRAINIAN, KEYED BY THE SAME SLOTS.

  Parallel tables rather than the English strings looked up in a translation
  table, because the clauses here are pieces a screen drops into a frame of
  its own ("How do you say this ...?", `Say “...”`) and a piece is not a line:
  a translation table keyed on a fragment invites somebody to build a sentence
  out of fragments, which the interface standard forbids. Each function above
  takes the reader's locale, defaulting to English, and returns for English
  exactly what it always did, so an English screen is byte for byte unchanged.

  The Russian and Ukrainian clauses complete «Как это сказать ...?» and
  «Як це сказати ...?» the way the English completes "How do you say this
  ...?", and they describe the form without spelling it, for the reason the
  header gives. Nothing here is Estonian (ADR-005): the case names come off
  `CASES`, as above.
*/
type Translated = Exclude<Locale, "en">;

const CLAUSES_IN: Readonly<Record<Translated, Readonly<Record<string, string>>>> = {
  ru: {
    NOMINATIVE: "в словарной форме",
    GENITIVE: "когда что-то принадлежит ему, как английские «of» или «’s»",
    PARTITIVE: "когда имеется в виду часть чего-то или действие не закончено",
    ILLATIVE: "когда что-то движется внутрь него",
    INESSIVE: "когда что-то находится внутри него",
    ELATIVE: "когда что-то выходит из него или речь идёт о нём",
    ALLATIVE: "когда что-то движется на него или что-то дают кому-то",
    ADESSIVE: "когда что-то находится на нём или у кого-то что-то есть",
    ABLATIVE: "когда что-то сходит с него или приходит от кого-то",
    TRANSLATIVE: "когда что-то превращается в это",
    TERMINATIVE: "когда имеется в виду «до него» или «до тех пор»",
    ESSIVE: "когда кто-то работает или выступает в этой роли",
    ABESSIVE: "когда что-то делается без этого",
    COMITATIVE: "когда что-то делается с этим",
    IndPrSg1: "о себе, сейчас",
    IndPrSg3: "о ком-то другом, сейчас",
    IndPrPl1: "о себе и других, сейчас",
    IndPrPs_: "чтобы сказать, что вы этого не делаете",
    IndIpfSg1: "о себе, в прошлом",
    IndIpfSg3: "о ком-то другом, в прошлом",
    KndPrSg1: "о себе, как о том, что вы сделали бы",
    ImpPrSg2: "чтобы сказать знакомому человеку это сделать",
    ImpPrPl2: "чтобы попросить группу или кого-то вежливо это сделать",
    Inf: "когда имеется в виду «делать это»",
    PtsPtPs: "когда кто-то уже это сделал",
    PtsPtIps: "когда это сделано, а кем, не говорится",
    PtsPrPs: "когда имеется в виду тот, кто это делает",
  },
  uk: {
    NOMINATIVE: "у словниковій формі",
    GENITIVE: "коли щось належить йому, як англійські «of» або «’s»",
    PARTITIVE: "коли мається на увазі частина чогось або дію не завершено",
    ILLATIVE: "коли щось рухається всередину нього",
    INESSIVE: "коли щось перебуває всередині нього",
    ELATIVE: "коли щось виходить із нього або йдеться про нього",
    ALLATIVE: "коли щось рухається на нього або щось дають комусь",
    ADESSIVE: "коли щось перебуває на ньому або в когось щось є",
    ABLATIVE: "коли щось сходить із нього або надходить від когось",
    TRANSLATIVE: "коли щось перетворюється на це",
    TERMINATIVE: "коли мається на увазі «до нього» або «доти»",
    ESSIVE: "коли хтось працює чи виступає в цій ролі",
    ABESSIVE: "коли щось робиться без цього",
    COMITATIVE: "коли щось робиться з цим",
    IndPrSg1: "про себе, зараз",
    IndPrSg3: "про когось іншого, зараз",
    IndPrPl1: "про себе й інших, зараз",
    IndPrPs_: "щоб сказати, що ви цього не робите",
    IndIpfSg1: "про себе, у минулому",
    IndIpfSg3: "про когось іншого, у минулому",
    KndPrSg1: "про себе, як про те, що ви зробили б",
    ImpPrSg2: "щоб сказати знайомій людині це зробити",
    ImpPrPl2: "щоб попросити групу або когось увічливо це зробити",
    Inf: "коли мається на увазі «робити це»",
    PtsPtPs: "коли хтось уже це зробив",
    PtsPtIps: "коли це зроблено, а ким, не кажуть",
    PtsPrPs: "коли мається на увазі той, хто це робить",
  },
};

const CASE_SHORT_IN: Readonly<Record<Translated, Readonly<Record<string, string>>>> = {
  ru: {
    NOMINATIVE: "слово как есть",
    GENITIVE: "чего-то",
    PARTITIVE: "часть чего-то",
    ILLATIVE: "внутрь",
    INESSIVE: "внутри",
    ELATIVE: "изнутри",
    ALLATIVE: "на это, или кому-то",
    ADESSIVE: "на этом, или у кого-то есть",
    ABLATIVE: "с этого, или от кого-то",
    TRANSLATIVE: "становясь этим",
    TERMINATIVE: "до этого",
    ESSIVE: "в качестве этого",
    ABESSIVE: "без этого",
    COMITATIVE: "с этим",
  },
  uk: {
    NOMINATIVE: "слово як є",
    GENITIVE: "чогось",
    PARTITIVE: "частина чогось",
    ILLATIVE: "всередину",
    INESSIVE: "всередині",
    ELATIVE: "зсередини",
    ALLATIVE: "на це, або комусь",
    ADESSIVE: "на цьому, або в когось є",
    ABLATIVE: "з цього, або від когось",
    TRANSLATIVE: "стаючи цим",
    TERMINATIVE: "до цього",
    ESSIVE: "у ролі цього",
    ABESSIVE: "без цього",
    COMITATIVE: "з цим",
  },
};

const VERB_SHORT_IN: Readonly<Record<Translated, Readonly<Record<string, string>>>> = {
  ru: {
    IndPrSg1: "я …, сейчас",
    IndPrSg3: "он/она …, сейчас",
    IndPrPl1: "мы …, сейчас",
    IndPrPs_: "не …",
    IndIpfSg1: "я …, в прошлом",
    IndIpfSg3: "он/она …, в прошлом",
    KndPrSg1: "я бы …",
    ImpPrSg2: "сделай! (другу)",
    ImpPrPl2: "сделайте! (вежливо)",
    Inf: "что делать?",
    PtsPtPs: "сделал это",
    PtsPtIps: "сделано, неизвестно кем",
    PtsPrPs: "тот, кто это делает",
  },
  uk: {
    IndPrSg1: "я …, зараз",
    IndPrSg3: "він/вона …, зараз",
    IndPrPl1: "ми …, зараз",
    IndPrPs_: "не …",
    IndIpfSg1: "я …, у минулому",
    IndIpfSg3: "він/вона …, у минулому",
    KndPrSg1: "я б …",
    ImpPrSg2: "зроби! (другові)",
    ImpPrPl2: "зробіть! (увічливо)",
    Inf: "що робити?",
    PtsPtPs: "зробив це",
    PtsPtIps: "зроблено, невідомо ким",
    PtsPrPs: "той, хто це робить",
  },
};

const ENDING_WORD_IN: Readonly<Record<Translated, Readonly<Record<string, string>>>> = {
  ru: {
    GENITIVE: "чего",
    PARTITIVE: "часть",
    ILLATIVE: "внутрь",
    INESSIVE: "внутри",
    ELATIVE: "изнутри",
    ALLATIVE: "на, или кому",
    ADESSIVE: "на, или у кого есть",
    ABLATIVE: "с, или от",
    TRANSLATIVE: "становясь",
    TERMINATIVE: "до",
    ESSIVE: "в качестве",
    ABESSIVE: "без",
    COMITATIVE: "с",
  },
  uk: {
    GENITIVE: "чого",
    PARTITIVE: "частина",
    ILLATIVE: "всередину",
    INESSIVE: "всередині",
    ELATIVE: "зсередини",
    ALLATIVE: "на, або кому",
    ADESSIVE: "на, або в кого є",
    ABLATIVE: "з, або від",
    TRANSLATIVE: "стаючи",
    TERMINATIVE: "до",
    ESSIVE: "у ролі",
    ABESSIVE: "без",
    COMITATIVE: "з",
  },
};
