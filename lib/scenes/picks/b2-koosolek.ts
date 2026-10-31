import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-koosolek`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Koosolek: ScenePicks = {
  propose: [
    { et: "Mul on ettepanek: investeerime osa eelarvest testimisse.", en: "I've got a proposal: let's invest part of the budget in testing." },
    { et: "Investeerime testimisse.", en: "Let's invest in testing." },
  ],
  why: [
    { et: "Kui vigu on vähem, on kliendid rahul.", en: "If there are fewer bugs, the clients are happy." },
    { et: "Sest kliendid tahavad vähem vigu.", en: "Because the clients want fewer bugs." },
  ],
  budget: [
    { et: "Ma saan aru, aga eelarve ei luba uut inimest.", en: "I understand, but the budget won't allow a new person." },
    { et: "Programmeerija on liiga kallis.", en: "A programmer is too expensive." },
  ],
  hold: [
    { et: "Üks hetk, las ma lõpetan.", en: "One moment, let me finish." },
    { et: "Hetk, las ma lõpetan.", en: "Just a moment, let me finish." },
  ],
  finish: [
    { et: "Testimine on odavam ja aitab tõenäoliselt kiiresti.", en: "Testing is cheaper, and it'll probably help quickly." },
    { et: "Testimine on odavam.", en: "Testing is cheaper." },
  ],
  doubt: [
    { et: "Siis vaatame sügisel uuesti.", en: "Then we'll look at it again in the autumn." },
    { et: "Siis proovime uuesti.", en: "Then we'll try again." },
  ],
  close: [
    { et: "Tore, aitäh!", en: "Great, thanks!" },
    { et: "Hea, aitäh!", en: "Good, thanks!" },
  ],
};
