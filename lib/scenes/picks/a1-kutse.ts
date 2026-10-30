import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-kutse`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Kutse: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hi there!" },
  ],
  name: [
    { et: "Väga meeldiv! Mina olen Anna.", en: "Nice to meet you! I'm Anna." },
    { et: "Minu nimi on Tom.", en: "My name is Tom." },
  ],
  from: [
    { et: "Ma olen pärit {from:FROM}.", en: "I'm from {from}." },
    { et: "{from:FROM}.", en: "From {from}." },
  ],
  praise: [
    { et: "Aitäh! Ma õpin veel.", en: "Thank you! I'm still learning." },
    { et: "Aitäh!", en: "Thank you!" },
  ],
  invite: [
    { et: "Aitäh! Mis kell?", en: "Thank you! What time?" },
    { et: "Jah, kindlasti!", en: "Yes, definitely!" },
  ],
  time: [
    { et: "Jah, kindlasti!", en: "Yes, definitely!" },
    { et: "Jah, saan.", en: "Yes, I can." },
  ],
  close: [
    { et: "Nägemist!", en: "See you!" },
    { et: "Head aega!", en: "Bye!" },
  ],
};
