import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-trepil`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Trepil: ScenePicks = {
  greet: [
    { et: "Tere õhtust!", en: "Good evening!" },
    { et: "Tere!", en: "Hello!" },
  ],
  name: [
    { et: "Minu nimi on Tom.", en: "My name is Tom." },
    { et: "Mina olen Anna.", en: "I'm Anna." },
  ],
  estonian: [
    { et: "Ei, ma ei ole eestlane. Ma olen inglane.", en: "No, I'm not Estonian. I'm English." },
    { et: "Ei, ma olen ameeriklane.", en: "No, I'm American." },
    { et: "Jah, ma olen eestlane.", en: "Yes, I'm Estonian." },
  ],
  how: [
    { et: "Hästi, aitäh! Ja sinul?", en: "Good, thanks! And you?" },
    { et: "Hästi, aitäh!", en: "Good, thanks!" },
  ],
  close: [
    { et: "Nägemist!", en: "See you!" },
    { et: "Head aega!", en: "Bye!" },
  ],
};
