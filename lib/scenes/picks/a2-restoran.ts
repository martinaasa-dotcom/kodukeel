import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-restoran`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2Restoran: ScenePicks = {
  greet: [
    { et: "Tere õhtust!", en: "Good evening!" },
    { et: "Tere!", en: "Hello!" },
  ],
  table: [
    { et: "Ei. Kas teil on laud kahele?", en: "No. Do you have a table for two?" },
    { et: "Ei ole.", en: "No." },
  ],
  drink: [
    { et: "Ma võtaksin {drink:PARTITIVE}.", en: "I'd have {drink}." },
    { et: "{drink:PARTITIVE}, palun.", en: "{drink}, please." },
  ],
  order: [
    { et: "Mida te soovitate?", en: "What do you recommend?" },
    { et: "Jah. Mida te soovitate?", en: "Yes. What do you recommend?" },
  ],
  food: [
    { et: "Siis ma võtaksin kala.", en: "Then I'd have the fish." },
    { et: "Mulle salatit, palun.", en: "A salad for me, please." },
  ],
  bill: [
    { et: "Väga maitsev, aitäh. Kas me saaksime arve?", en: "Delicious, thank you. Could we have the bill?" },
    { et: "Väga maitsev, aitäh.", en: "Delicious, thank you." },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
