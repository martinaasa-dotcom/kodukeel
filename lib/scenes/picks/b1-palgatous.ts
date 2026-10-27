import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b1-palgatous`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b1Palgatous: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  topic: [
    { et: "Ma tahaksin rääkida oma palgast.", en: "I'd like to talk about my pay." },
    { et: "Oma palgast.", en: "About my pay." },
  ],
  done: [
    { et: "Ma lõpetasin kaks projekti ja aitasin uut kolleegi.", en: "I finished two projects and helped the new colleague." },
    { et: "Ma lõpetasin kaks projekti.", en: "I finished two projects." },
  ],
  earlier: [
    { et: "Ma oleksin tahtnud varem küsida, aga ma ei julgenud.", en: "I'd have liked to ask earlier, but I didn't dare." },
    { et: "Ma ei julgenud.", en: "I didn't dare." },
  ],
  amount: [
    { et: "Ma arvan, et kümme protsenti rohkem oleks õiglane.", en: "I think ten percent more would be fair." },
    { et: "Kümme protsenti.", en: "Ten percent." },
  ],
  offer: [
    { et: "Kas me võiksime aasta lõpus uuesti rääkida?", en: "Could we talk again at the end of the year?" },
    { et: "See sobib mulle.", en: "That works for me." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
