import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-suvi`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2Suvi: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  summer: [
    { et: "Väga hea! Ma käisin Saaremaal.", en: "Really good! I went to Saaremaa." },
    { et: "Hea!", en: "Good!" },
  ],
  did: [
    { et: "Me käisime saunas ja sõime palju kala.", en: "We went to the sauna and ate lots of fish." },
    { et: "Ma lugesin ja magasin.", en: "I read and slept." },
  ],
  before: [
    { et: "Ei, see oli esimene kord. Aga mis sina suvel tegid?", en: "No, it was the first time. What about you, what did you do in the summer?" },
    { et: "Ei, see oli esimene kord.", en: "No, it was the first time." },
  ],
  her: [
    { et: "Kahju!", en: "What a pity!" },
    { et: "Kahju! Tule järgmisel suvel ka Saaremaale!", en: "What a pity! Next summer come to Saaremaa too!" },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
