import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a2-raamatukogu`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a2Raamatukogu: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  card: [
    { et: "Ma soovin raamatukogukaarti.", en: "I'd like a library card." },
    { et: "Raamatukogukaarti, palun.", en: "A library card, please." },
  ],
  name: [
    { et: "Tom Smith.", en: "Tom Smith." },
    { et: "Minu nimi on Anna.", en: "My name is Anna." },
  ],
  address: [
    { et: "Pikk tänav kaks, korter neli.", en: "Pikk Street two, apartment four." },
    { et: "Pikk tänav kaks.", en: "Pikk Street two." },
  ],
  birth: [
    { et: "Kümnes juuni.", en: "The tenth of June." },
    { et: "Esimene mai.", en: "The first of May." },
  ],
  phone: [
    { et: "Vabandust, kelle telefon see on?", en: "Excuse me, whose phone is this?" },
    { et: "Kelle telefon see on?", en: "Whose phone is this?" },
  ],
  thanks: [
    { et: "Palun! Head aega!", en: "You're welcome! Goodbye!" },
    { et: "Palun!", en: "You're welcome!" },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
