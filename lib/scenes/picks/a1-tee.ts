import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-tee`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Tee: ScenePicks = {
  greet: [
    { et: "Vabandust!", en: "Excuse me!" },
    { et: "Tere!", en: "Hello!" },
  ],
  where: [
    { et: "Vabandust, kus on {place}?", en: "Excuse me, where is the {place}?" },
    { et: "Kus on {place}?", en: "Where is the {place}?" },
  ],
  way: [
    { et: "Otse. Selge, aitäh!", en: "Straight on. Got it, thanks!" },
    { et: "Aitäh!", en: "Thank you!" },
  ],
  far: [
    { et: "Kas see on kaugel?", en: "Is it far?" },
    { et: "Kas see on lähedal?", en: "Is it close?" },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thanks! Bye!" },
    { et: "Head aega!", en: "Bye!" },
  ],
};
