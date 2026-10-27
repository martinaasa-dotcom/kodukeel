import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b1-vaidlus`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b1Vaidlus: ScenePicks = {
  view: [
    { et: "Ma ei ole päris nõus.", en: "I don't quite agree." },
    { et: "Minu meelest on kontoris parem.", en: "If you ask me, the office is better." },
  ],
  why: [
    { et: "Kuigi kodus on mugav, on mul seal igav.", en: "Although it's comfortable at home, I get bored there." },
    { et: "Kontoris saab kohvi koos juua.", en: "At the office you can have coffee together." },
  ],
  cost: [
    { et: "Ühest küljest on sul õigus.", en: "On the one hand, you're right." },
    { et: "Teisest küljest on kodus igav.", en: "On the other hand, it's boring at home." },
  ],
  plan: [
    { et: "Kaks päeva kontoris ja kolm päeva kodus.", en: "Two days at the office and three at home." },
    { et: "Kolm päeva kodus ja kaks kontoris.", en: "Three days at home and two at the office." },
  ],
  agree: [
    { et: "Sellega olen ma nõus.", en: "I'll agree to that." },
    { et: "Olen nõus.", en: "Agreed." },
  ],
  close: [
    { et: "Lepime kokku! Head aega!", en: "It's a deal! Goodbye!" },
    { et: "Head aega!", en: "Goodbye!" },
  ],
};
