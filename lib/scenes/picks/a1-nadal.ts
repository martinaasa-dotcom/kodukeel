import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-nadal`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Nadal: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  how: [
    { et: "Hästi, aitäh! Ja sinul?", en: "Good, thanks! And you?" },
    { et: "Hästi, aitäh!", en: "Good, thanks!" },
  ],
  saturday: [
    { et: "Ma käisin poes ja lugesin raamatut.", en: "I went to the shop and read a book." },
    { et: "Ma olin kodus.", en: "I was at home." },
  ],
  sunday: [
    { et: "Pühapäeval olin kodus.", en: "On Sunday I was at home." },
    { et: "Ma käisin poes.", en: "I went to the shop." },
  ],
  meet: [
    { et: "Jah, kindlasti!", en: "Yes, definitely!" },
    { et: "Muidugi!", en: "Of course!" },
  ],
  close: [
    { et: "Head aega!", en: "Bye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
