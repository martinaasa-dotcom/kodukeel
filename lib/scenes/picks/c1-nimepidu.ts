import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-nimepidu`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Nimepidu: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere õhtust!", en: "Good evening!" },
  ],
  congratulate: [
    { et: "Palju õnne teile! Kasvagu ta suureks!", en: "Congratulations to you both! May he grow up big!" },
    { et: "Palju õnne! Olgu ta alati terve!", en: "Congratulations! May he always be healthy!" },
  ],
  english: [
    { et: "Aitäh, aga räägime eesti keeles edasi. Ma tahan harjutada.", en: "Thanks, but let's carry on in Estonian. I want to practice." },
    { et: "Räägime eesti keeles edasi.", en: "Let's carry on in Estonian." },
  ],
  helgi: [
    { et: "Ta palus vabandust. Tema vend suri hiljuti, aga ta saatis teile kaardi.", en: "She asked us to say sorry. Her brother died recently, but she sent you a card." },
    { et: "Tema vend suri hiljuti. Ta saatis teile kaardi.", en: "Her brother died recently. She sent you a card." },
  ],
  toast: [
    { et: "Head sõbrad! Tõstame klaasid Mihkli terviseks. Kasvagu ta suureks ja olgu ta alati terve!", en: "Friends! Let's raise our glasses to Mihkel. May he grow up big, and may he always be healthy!" },
    { et: "Tõstame klaasid! Kasvagu ta suureks!", en: "Let's raise our glasses! May he grow up big!" },
  ],
  joke: [
    { et: "Siis on ta täpselt nagu minu ülemus. Ainult et minu ülemus nutab, kui kohvi pole!", en: "Then he's just like my boss. Only my boss cries when there's no coffee!" },
    { et: "Täpselt nagu minu ülemus!", en: "Just like my boss!" },
  ],
  exam: [
    { et: "Jah, sain läbi! Olen väga tänulik ja natuke üllatunud ka.", en: "Yes, I passed! I'm very grateful, and a bit surprised too." },
    { et: "Sain läbi! Olen väga õnnelik.", en: "I passed! I'm very happy." },
  ],
  close: [
    { et: "Aitäh kutse eest! Head aega!", en: "Thanks for having us! Goodbye!" },
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
  ],
};
