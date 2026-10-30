import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-mutsipood`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Mutsipood: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  item: [
    { et: "Mul on vaja {item:PARTITIVE}.", en: "I need a {item}." },
    { et: "{item:PARTITIVE}, palun.", en: "A {item}, please." },
  ],
  colour: [
    { et: "{colour}, palun.", en: "The {colour} one, please." },
    { et: "{colour}.", en: "The {colour} one." },
  ],
  price: [
    { et: "Kui palju see maksab?", en: "How much is it?" },
    { et: "Ilus! Kui palju see maksab?", en: "Nice! How much is it?" },
  ],
  pay: [
    { et: "Kaardiga, palun.", en: "By card, please." },
    { et: "Selge. Kaardiga, palun.", en: "Okay. By card, please." },
    { et: "Sularahas.", en: "In cash." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thanks! Bye!" },
    { et: "Head aega!", en: "Bye!" },
  ],
};
