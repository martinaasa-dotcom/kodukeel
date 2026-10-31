import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-teade`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Teade: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere! Hästi läks.", en: "Hi! It went fine." },
  ],
  theater: [
    { et: "Jah. Teater olevat nüüd reedel, mitte neljapäeval.", en: "Yes. The theater's on Friday now, apparently, not Thursday." },
    { et: "Teater olevat nüüd reedel.", en: "The theater's on Friday now, apparently." },
  ],
  why: [
    { et: "Lasteaias olevat mitu last haige.", en: "Several children at the kindergarten are ill, apparently." },
    { et: "Mitu last olevat haige.", en: "Several children are ill, apparently." },
  ],
  time: [
    { et: "Ta palus, et me tooksime lapse kella kaheksaks.", en: "She asked us to bring our child in by eight." },
    { et: "Kella kaheksaks.", en: "By eight." },
  ],
  money: [
    { et: "Jah, viis eurot ümbrikus.", en: "Yes, five euros in an envelope." },
    { et: "Viis eurot, nagu enne.", en: "Five euros, like before." },
  ],
  asked: [
    { et: "Ta küsis, kas sina saaksid kaasa tulla.", en: "She asked whether you could go along." },
    { et: "Ta küsis, kas sa saaksid kaasa tulla.", en: "She asked whether you could go along." },
  ],
  check: [
    { et: "Kas ma saan õigesti aru, et sa reedel ei saa?", en: "Do I understand right that you can't on Friday?" },
    { et: "Kas ma saan õigesti aru, et sina reedel ei saa?", en: "Do I understand right that you can't on Friday?" },
  ],
  decide: [
    { et: "Olgu. Siis küsin töölt vaba päeva ja lähen ise.", en: "All right. Then I'll ask for a day off work and go myself." },
    { et: "Jah, ma lähen ise.", en: "Yes, I'll go myself." },
  ],
  close: [
    { et: "Hästi.", en: "Good." },
    { et: "Aitäh!", en: "Thanks!" },
  ],
};
