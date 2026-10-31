import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-ohtusook`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Ohtusook: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere õhtust!", en: "Good evening!" },
  ],
  how: [
    { et: "Täitsa hästi, aitäh.", en: "Pretty well, thanks." },
    { et: "Hästi, aitäh.", en: "Fine, thanks." },
  ],
  once: [
    { et: "Mitte eriti. Üks korraga, palun!", en: "Not really. One at a time, please!" },
    { et: "Üks korraga, palun!", en: "One at a time, please!" },
  ],
  english: [
    { et: "Ei, aitäh. Räägime eesti keeles edasi, ma tahan harjutada.", en: "No, thanks. Let's carry on in Estonian, I want to practice." },
    { et: "Räägime eesti keeles edasi.", en: "Let's carry on in Estonian." },
  ],
  concert: [
    { et: "Jah. Ta kohtas seal sind ja see oli täitsa veider!", en: "Yes. She ran into you there, and it was totally weird!" },
    { et: "Jah, see oli täitsa veider!", en: "Yes, it was totally weird!" },
  ],
  true: [
    { et: "See pole tõsi! Sa lähed kell üheksa magama!", en: "That's not true! You go to bed at nine!" },
    { et: "Pole tõsi!", en: "Not true!" },
  ],
  close: [
    { et: "Aitäh! Head isu!", en: "Thank you! Enjoy your meal!" },
    { et: "Head isu!", en: "Enjoy your meal!" },
  ],
};
