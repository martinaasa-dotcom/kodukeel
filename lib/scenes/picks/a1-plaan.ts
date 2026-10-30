import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-plaan`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Plaan: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  saturday: [
    { et: "Ma ei tööta.", en: "I'm not working." },
    { et: "Ma töötan.", en: "I'm working." },
  ],
  invite: [
    { et: "Jah! Mis kell?", en: "Yes! What time?" },
    { et: "Jah, tulen!", en: "Yes, I'll come!" },
  ],
  time: [
    { et: "Jah, saan.", en: "Yes, I can." },
    { et: "Kell kuus ma ei saa. Kell seitse?", en: "I can't at six. Seven?" },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thanks! Bye!" },
    { et: "Head aega!", en: "Bye!" },
  ],
};
