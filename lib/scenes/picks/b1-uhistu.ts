import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b1-uhistu`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b1Uhistu: ScenePicks = {
  greet: [
    { et: "Tere õhtust!", en: "Good evening!" },
    { et: "Tere!", en: "Hello!" },
  ],
  what: [
    { et: "Öösel läks keldris toru katki.", en: "A pipe burst in the cellar during the night." },
    { et: "Toru läks katki.", en: "A pipe burst." },
  ],
  done: [
    { et: "Torumees kutsuti ja toru vahetati välja.", en: "A plumber was called and the pipe was replaced." },
    { et: "Toru vahetati välja.", en: "The pipe was replaced." },
  ],
  before: [
    { et: "Ei, toru oli juba eelmisel talvel katki läinud.", en: "No, the pipe had already burst last winter." },
    { et: "Ei, see oli juba katki läinud.", en: "No, it had burst before." },
  ],
  suggest: [
    { et: "Minu arvates tuleb vanad torud välja vahetada.", en: "In my opinion the old pipes have to be replaced." },
    { et: "Vanad torud tuleb välja vahetada.", en: "The old pipes have to be replaced." },
  ],
  when: [
    { et: "Kevadel. Siis ei ole külm.", en: "In the spring. It isn't cold then." },
    { et: "Kevadel.", en: "In the spring." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
