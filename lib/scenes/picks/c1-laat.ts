import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-laat`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Laat: ScenePicks = {
  greet: [
    { et: "Tere! Jah, palun.", en: "Hello! Yes, please." },
    { et: "Tere päevast! Jah, palun.", en: "Good afternoon! Yes, please." },
  ],
  life: [
    { et: "Kas te olete siin kogu elu elanud?", en: "Have you lived here all your life?" },
    { et: "Aitäh! Kas te olete siit pärit?", en: "Thank you! Are you from here?" },
  ],
  rehi: [
    { et: "Rehe all? Ehk siis selline suur maja, kus vilja kuivatati?", en: "Under the threshing barn? You mean the big building where grain was dried?" },
    { et: "Rehi, ehk siis suur maja talu juures?", en: "A rehi, you mean a big building by the farm?" },
  ],
  then: [
    { et: "Ja mis siis juhtus?", en: "So what happened?" },
    { et: "Miks neid nii vähe alles on?", en: "Why are so few of them left?" },
  ],
  stayed: [
    { et: "Aga teie jäite siia. Miks?", en: "But you stayed here. Why?" },
    { et: "Miks teie siia jäite?", en: "Why did you stay here?" },
  ],
  kirmas: [
    { et: "Kirmasel, ehk siis laadal kiriku juures?", en: "At a kirmas, you mean a fair by the church?" },
    { et: "Kirmas, ehk siis laat kiriku juures?", en: "A kirmas, you mean a fair by the church?" },
  ],
  close: [
    { et: "Aitäh, me tuleme kindlasti! Head aega!", en: "Thank you, we'll come for sure! Goodbye!" },
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
  ],
};
