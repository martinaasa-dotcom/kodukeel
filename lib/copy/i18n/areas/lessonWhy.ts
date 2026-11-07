import type { Area } from "../area";

/**
 * THE "WHY THIS FORM?" QUESTIONS, IN RUSSIAN AND UKRAINIAN.
 *
 * The questions a lesson's "Why this form?" step walks (`lib/course/lessons/why.ts`)
 * are shared across lessons, so they are translated once here rather than in
 * each part's area: two areas translating one English line differently fail
 * `locale.test.ts`. Machine translated on the lesson terms, not yet read by
 * somebody fluent.
 */
export const LESSON_WHY: Area = {
  ru: {
    "Is there a number in front of it, like two, three or ten?": "Перед ним стоит число, например два, три или десять?",
    "Yes, a number": "Да, число",
    "One, or more than one?": "Один или больше одного?",
    "Did the job get done, and is it a yes, not a no?": "Дело доведено до конца, и это утверждение, а не отрицание?",
    "Yes, done": "Да, сделано",
    "No, still going, or a no": "Нет, ещё в процессе, или это отрицание",
    "Is it a set amount: these ones, all of them?": "Это определённое количество: именно эти, все?",
    "No, just some, an open amount": "Нет, просто сколько-то, без счёта",
    "Yes, a known set": "Да, известный набор",
  },
  uk: {
    "Is there a number in front of it, like two, three or ten?": "Перед ним стоїть число, наприклад два, три або десять?",
    "Yes, a number": "Так, число",
    "One, or more than one?": "Один чи більше одного?",
    "Did the job get done, and is it a yes, not a no?": "Справу доведено до кінця, і це ствердження, а не заперечення?",
    "Yes, done": "Так, зроблено",
    "No, still going, or a no": "Ні, ще триває, або це заперечення",
    "Is it a set amount: these ones, all of them?": "Це визначена кількість: саме ці, усі?",
    "No, just some, an open amount": "Ні, просто якась кількість, без лічби",
    "Yes, a known set": "Так, відомий набір",
  },
};
