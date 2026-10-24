import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-linnas`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2Linnas: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hi there!" },
  ],
  where: [
    { et: "Ma olen kesklinnas, panga ees.", en: "I'm in town, in front of the bank." },
    { et: "Kesklinnas.", en: "In town." },
  ],
  come: [
    { et: "Jah. Kuidas ma turule saan?", en: "Yes. How do I get to the market?" },
    { et: "Jah, ma tulen.", en: "Yes, I'm coming." },
  ],
  way: [
    { et: "Selge. Kas me läheme pärast kohvikusse?", en: "Got it. Shall we go to a café afterwards?" },
    { et: "Selge, aitäh!", en: "Got it, thanks!" },
  ],
  cafe: [
    { et: "Tore! Ma olen seal kümne minuti pärast.", en: "Great! I'll be there in ten minutes." },
    { et: "Tore!", en: "Great!" },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
