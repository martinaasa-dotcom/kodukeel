import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-vana-sober`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2VanaSober: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hi there!" },
  ],
  did: [
    { et: "Ma olin Tartus, töötasin seal.", en: "I was in Tartu. I worked there." },
    { et: "Ma töötasin.", en: "I worked." },
  ],
  liked: [
    { et: "Ma arvan, et see on Eesti kõige ilusam linn.", en: "I think it's the prettiest town in Estonia." },
    { et: "Väga meeldis!", en: "I loved it!" },
  ],
  plans: [
    { et: "Suvel kavatsen Saaremaale minna.", en: "In the summer I plan to go to Saaremaa." },
    { et: "Suvel lähen maale.", en: "In the summer I'm going to the country." },
  ],
  with: [
    { et: "Jaaniga. Kas tuleksid ka kaasa?", en: "With Jaan. Would you come along too?" },
    { et: "Kas tuleksid kaasa?", en: "Would you come along?" },
  ],
  meet: [
    { et: "Kas sulle sobib laupäeval kell kuus?", en: "Does Saturday at six suit you?" },
    { et: "Äkki laupäeval?", en: "Maybe Saturday?" },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
