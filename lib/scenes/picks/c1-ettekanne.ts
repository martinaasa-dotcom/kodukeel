import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-ettekanne`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Ettekanne: ScenePicks = {
  problem: [
    { et: "Testime käsitsi ja see võtab liiga palju aega. Sel kuul hilines kood kaks korda.", en: "We test by hand, and it takes too long. This month the code was late twice." },
    { et: "Meie probleem on see, et testime käsitsi.", en: "Our problem is that we test by hand." },
  ],
  options: [
    { et: "Kaalusime kahte varianti: teist testijat või automaatseid teste.", en: "We weighed up two options: a second tester, or automated tests." },
    { et: "Meil on kaks varianti: teine testija või automaatsed testid.", en: "We have two options: a second tester, or automated tests." },
  ],
  cutin: [
    { et: "Kiirustamine toob rohkem vigu. Jõuan sinna kohe, kui lubate.", en: "Rushing brings more bugs. I'm coming to that, if you'll allow me." },
    { et: "Kiirustamine toob rohkem vigu. Kui lubate, jätkan.", en: "Rushing brings more bugs. If you'll allow me, I'll go on." },
  ],
  cost: [
    { et: "Automaatsed testid maksavad alguses rohkem, aga testija saab palka iga kuu.", en: "Automated tests cost more at the start, but a tester gets paid every month." },
    { et: "Alguses on kulu suurem: umbes kaks kuud tööd.", en: "The cost is higher at the start: about two months of work." },
  ],
  worth: [
    { et: "Kuigi alguses on kulu suurem, säästame pikas plaanis aega ja raha.", en: "Although the cost is higher at the start, in the long run we save time and money." },
    { et: "Kuigi kaks kuud on palju, töötavad testid aastaid.", en: "Although two months is a lot, the tests work for years." },
  ],
  recommend: [
    { et: "Soovitan teist varianti, nimelt testid automatiseerida. Kui juhatus on nõus, alustame juunis.", en: "I recommend the second option, namely automating the tests. If the board agrees, we'll start in June." },
    { et: "Soovitan automaatseid teste.", en: "I recommend automated tests." },
  ],
  close: [
    { et: "Aitäh, et kuulasite!", en: "Thank you for listening!" },
    { et: "Suur aitäh!", en: "Thank you very much!" },
  ],
};
