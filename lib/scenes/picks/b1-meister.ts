import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b1-meister`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b1Meister: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  broken: [
    { et: "Dušš tilgub ja aken ei lähe kinni.", en: "The shower drips and the window won't close." },
    { et: "Dušš tilgub.", en: "The shower drips." },
  ],
  fixed: [
    { et: "Kraani parandasin ma ise ära.", en: "I fixed the tap myself." },
    { et: "Jah, kraani.", en: "Yes, the tap." },
  ],
  notdone: [
    { et: "Köögis ei põle lamp.", en: "The kitchen light isn't working." },
    { et: "Aken ei lähe ikka kinni.", en: "The window still won't close." },
  ],
  when: [
    { et: "Reedel ma olen tööl. Kas esmaspäeval sobib?", en: "On Friday I'm at work. Does Monday suit you?" },
    { et: "Reedel sobib.", en: "Friday suits me." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Head aega!", en: "Goodbye!" },
  ],
};
