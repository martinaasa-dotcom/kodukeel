import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-intervjuu`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2Intervjuu: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  about: [
    { et: "Ma olen Tom. Ma olen programmeerija.", en: "I'm Tom. I'm a programmer." },
    { et: "Ma olen õpetaja ja elan Tallinnas.", en: "I'm a teacher and I live in Tallinn." },
  ],
  before: [
    { et: "Ma töötasin Londonis programmeerijana.", en: "I worked in London as a programmer." },
    { et: "Ma töötasin koolis.", en: "I worked at a school." },
  ],
  experience: [
    { et: "Jah, mul on viis aastat kogemust.", en: "Yes, I have five years of experience." },
    { et: "Jah, kaks aastat.", en: "Yes, two years." },
  ],
  estonian: [
    { et: "Jah, natuke. Ma õpin iga päev.", en: "Yes, a little. I study every day." },
    { et: "Natuke.", en: "A little." },
  ],
  start: [
    { et: "Järgmisest kuust.", en: "From next month." },
    { et: "Kohe.", en: "Right away." },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
