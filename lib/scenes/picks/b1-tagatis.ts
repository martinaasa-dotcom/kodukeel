import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b1-tagatis`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b1Tagatis: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  order: [
    { et: "Jah, kõik on korras. Ma koristasin eile terve päeva.", en: "Yes, everything's in order. I cleaned all day yesterday." },
    { et: "Kõik on korras.", en: "Everything's in order." },
  ],
  floor: [
    { et: "See oli juba enne mind kriimustatud.", en: "It was scratched before I came." },
    { et: "Kui ma sisse kolisin, oli põrand juba kriimustatud.", en: "When I moved in, the floor was already scratched." },
  ],
  deposit: [
    { et: "Vabandage, aga see on lepingus kirjas.", en: "Excuse me, but it's written in the contract." },
    { et: "Vaatame lepingut.", en: "Let's look at the contract." },
  ],
  else: [
    { et: "Ei. Ma parandasin ise köögis kraani.", en: "No. I fixed the kitchen tap myself." },
    { et: "Ei, kõik töötab.", en: "No, everything works." },
  ],
  back: [
    { et: "Kas ma saan terve tagatisraha tagasi?", en: "Do I get the whole deposit back?" },
    { et: "Nii et ma saan tagatisraha tagasi?", en: "So I get the deposit back?" },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
