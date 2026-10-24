import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-piletikassa`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2Piletikassa: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  where: [
    { et: "Tallinnasse.", en: "To Tallinn." },
    { et: "Tartusse, palun.", en: "To Tartu, please." },
  ],
  time: [
    { et: "Kell kaheksa, palun.", en: "At eight, please." },
    { et: "Kell üheksa.", en: "At nine." },
  ],
  ticket: [
    { et: "Jah, tulen.", en: "Yes, I am." },
    { et: "Jah, ma tulen tagasi.", en: "Yes, I'm coming back." },
  ],
  back: [
    { et: "Pühapäeval. Kui kaua sõit kestab?", en: "On Sunday. How long does the ride take?" },
    { et: "Pühapäeval.", en: "On Sunday." },
  ],
  price: [
    { et: "Aitäh! Kui palju see maksab?", en: "Thank you! How much is it?" },
    { et: "Kui palju see maksab?", en: "How much is it?" },
  ],
  pay: [
    { et: "Kaardiga, palun.", en: "By card, please." },
    { et: "Sularahas.", en: "In cash." },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
