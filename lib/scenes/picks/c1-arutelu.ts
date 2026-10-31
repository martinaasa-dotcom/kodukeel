import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-arutelu`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Arutelu: ScenePicks = {
  name: [
    { et: "Mina olen Tom ja elan peatänava ääres.", en: "I'm Tom, and I live on the main street." },
    { et: "Tere! Mina olen Anna ja elan siin tänaval.", en: "Hello! I'm Anna, and I live on this street." },
  ],
  figure: [
    { et: "Ei, tegelikult jääb parkimiskohti nelikümmend võrra vähem, mitte sada.", en: "No, in fact there'll be forty parking places fewer, not a hundred." },
    { et: "Vabandust, aga see ei ole päris õige. Kohti jääb nelikümmend võrra vähem.", en: "Sorry, but that isn't quite right. There'll be forty places fewer." },
  ],
  both: [
    { et: "Kui ma saan õigesti aru, siis ühelt poolt muutub tänav ohutumaks, teisalt jääb parkimiskohti vähem.", en: "If I understand correctly, on the one hand the street gets safer, and on the other there'll be fewer parking places." },
    { et: "Iseenesest on plaan hea. Teisalt jääb parkimiskohti vähem, nii et parkla peaks tulema enne tänavat.", en: "In itself the plan is good. On the other hand there'll be fewer parking places, so the car park should come before the street." },
  ],
  question: [
    { et: "Kas parklat ei võiks ehitada enne tänavat?", en: "Couldn't the car park be built before the street?" },
    { et: "Kas te võiksite ehitada kõigepealt parkla?", en: "Could you build the car park first?" },
  ],
  council: [
    { et: "Millal volikogu otsustab?", en: "When does the council decide?" },
    { et: "Ja kas te kirjutate minu ettepaneku üles?", en: "And will you write my suggestion down?" },
  ],
  close: [
    { et: "Aitäh!", en: "Thank you!" },
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
  ],
};
