import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-kohvik`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Kohvik: ScenePicks = {
  greet: [
    { et: "Tere õhtust!", en: "Good evening!" },
    { et: "Tere!", en: "Hello!" },
  ],
  order: [
    { et: "{drink:PARTITIVE}, palun.", en: "Some {drink}, please." },
    { et: "Ma soovin {drink:PARTITIVE}.", en: "I'd like some {drink}." },
  ],
  more: [
    { et: "{food:PARTITIVE} ka, palun.", en: "Some {food} too, please." },
    { et: "Ei, aitäh.", en: "No, thank you." },
  ],
  price: [
    { et: "Kui palju see maksab?", en: "How much is it?" },
    { et: "Vabandust, kui palju see maksab?", en: "Excuse me, how much is it?" },
  ],
  pay: [
    { et: "Kaardiga, palun.", en: "By card, please." },
    { et: "Sularahas.", en: "In cash." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thanks! Bye!" },
    { et: "Aitäh!", en: "Thank you!" },
  ],
};
