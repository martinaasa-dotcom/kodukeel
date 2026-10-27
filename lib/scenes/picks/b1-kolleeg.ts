import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b1-kolleeg`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b1Kolleeg: ScenePicks = {
  greet: [
    { et: "Muidugi aitan. Tere tulemast!", en: "Of course I'll help. Welcome!" },
    { et: "Tere! Muidugi.", en: "Hi! Of course." },
  ],
  computer: [
    { et: "Arvutiga aitab sind Anna.", en: "Anna helps with computers." },
    { et: "Anna aitab sind.", en: "Anna will help you." },
  ],
  report: [
    { et: "Räägi ülemusega.", en: "Talk to the boss." },
    { et: "Ülemusega.", en: "With the boss." },
  ],
  into: [
    { et: "Ma huvitun muusikast.", en: "I'm into music." },
    { et: "Ma olen huvitatud ajaloost.", en: "I'm interested in history." },
  ],
  offer: [
    { et: "Jah! Tule reedel meiega sööma.", en: "Yes! Come and eat with us on Friday." },
    { et: "Jah, aitäh!", en: "Yes, thanks!" },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
