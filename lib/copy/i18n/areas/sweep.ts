import type { Area } from "../area";

/**
 * The lines `scripts/test-locales.mjs` found printed in English on a screen
 * set to Russian or Ukrainian, which no earlier area had reached. Keyed on the
 * English each line translates. See lib/copy/locale.ts and
 * docs/34-interface-languages.md. No Estonian here.
 */
export const SWEEP: Area = {
  ru: {
    // The rail's row for a class the learner belongs to, as its hover title.
    "Your homework, and how the class is getting on": "Ваше домашнее задание и как идут дела у группы",

    // The ways a word is asked, on the mastery bar's label (`lib/srs/slots.ts`).
    "what it means": "что значит",
    "saying it": "как сказать",
    "in a sentence": "в предложении",
    "a named form": "форма по названию",
    "a case": "падеж",

    // The tail of a form's English name, said after the question it answers.
    "the short one": "краткий",
    "plural": "множественное число",

    // The exam hub's way into practice for the reading part.
    "Fill some gaps": "Заполнить пропуски",

    // A written task's mark on the exam result (`lib/exam/score.ts`).
    "{min} to {max} words": "от {min} до {max} слов",
    "{min} words or more": "не меньше {min} слов",
    "{range}, using {words}": "{range}, со словами {words}",
    "{n} words": "слов: {n}",
    "That's over the limit of {max} words, which costs length marks.":
      "Это больше предела в {max} слов, и за длину снимаются баллы.",
    "You didn't use {words}.": "Вы не использовали {words}.",
  },
  uk: {
    "Your homework, and how the class is getting on": "Ваше домашнє завдання і як ідуть справи в групі",

    "what it means": "що означає",
    "saying it": "як сказати",
    "in a sentence": "у реченні",
    "a named form": "форма за назвою",
    "a case": "відмінок",

    "the short one": "короткий",
    "plural": "множина",

    "Fill some gaps": "Заповнити пропуски",

    "{min} to {max} words": "від {min} до {max} слів",
    "{min} words or more": "не менше {min} слів",
    "{range}, using {words}": "{range}, зі словами {words}",
    "{n} words": "слів: {n}",
    "That's over the limit of {max} words, which costs length marks.":
      "Це більше за межу в {max} слів, і за довжину знімаються бали.",
    "You didn't use {words}.": "Ви не використали {words}.",
  },
};
