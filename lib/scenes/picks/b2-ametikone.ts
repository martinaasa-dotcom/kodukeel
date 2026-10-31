import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-ametikone`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Ametikone: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  why: [
    { et: "Ma sain töötukassalt otsuse ja selles on viga.", en: "I got a decision from the unemployment office, and there's a mistake in it." },
    { et: "Mul on küsimus otsuse kohta. Selles on viga.", en: "I have a question about a decision. There's a mistake in it." },
  ],
  wrong: [
    { et: "Otsuses on kirjas, et ma asusin tööle esimesel juunil. Aga tegelikult asusin ma tööle alles esimesel juulil.", en: "The decision says I started work on the first of June. But in fact I only started on the first of July." },
    { et: "Kuupäev on vale. Ma asusin tööle esimesel juulil.", en: "The date is wrong. I started work on the first of July." },
  ],
  proof: [
    { et: "Jah, mul on see paber, millele ma koos tööandjaga alla kirjutasin.", en: "Yes, I have the paper I signed with my employer." },
    { et: "Jah, mul on leping. Seal on kuupäev kirjas.", en: "Yes, I have the contract. The date is written in it." },
  ],
  now: [
    { et: "Ja mis nüüd saab? Kas ma pean raha tagasi maksma?", en: "So what happens now? Do I have to pay the money back?" },
    { et: "Kas ma pean hüvitise tagasi maksma?", en: "Do I have to pay the benefit back?" },
  ],
  when: [
    { et: "Millal uus otsus tuleb?", en: "When does the new decision come?" },
    { et: "Millal ma uue otsuse saan?", en: "When do I get the new decision?" },
  ],
  close: [
    { et: "Pole hullu. Aitäh abi eest!", en: "No problem. Thanks for your help!" },
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
  ],
};
