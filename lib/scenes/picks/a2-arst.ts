import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-arst`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2Arst: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  wrong: [
    { et: "Mul valutab kurk.", en: "My throat hurts." },
    { et: "Mul valutab pea.", en: "My head hurts." },
  ],
  temperature: [
    { et: "Jah, natuke. Ma olen väga väsinud.", en: "Yes, a little. I'm very tired." },
    { et: "Ei.", en: "No." },
  ],
  when: [
    { et: "Eile hommikul.", en: "Yesterday morning." },
    { et: "Eile õhtul.", en: "Yesterday evening." },
  ],
  work: [
    { et: "Kas ma tohin tööle minna?", en: "Am I allowed to go to work?" },
    { et: "Kas ma tohin homme tööle minna?", en: "Am I allowed to go to work tomorrow?" },
  ],
  advice: [
    { et: "Aitäh, doktor!", en: "Thank you, doctor!" },
    { et: "Aitäh!", en: "Thank you!" },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
