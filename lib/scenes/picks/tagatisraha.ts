import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `tagatisraha`, beat by beat. See `lib/scenes/picks.ts`. */
export const tagatisraha: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  why: [
    { et: "Ma tahan oma raha tagasi.", en: "I want my money back." },
    { et: "Ma pole oma raha veel tagasi saanud.", en: "I haven't got my money back yet." },
  ],
  moved: [
    { et: "{moved:INESSIVE}.", en: "In {moved}." },
    { et: "Ma kolisin ära {moved:INESSIVE}.", en: "I moved out in {moved}." },
    { et: "{moved:GENITIVE} lõpus.", en: "At the end of {moved}." },
  ],
  clean: [
    { et: "Ei, korter oli puhas.", en: "No, the flat was clean." },
    { et: "Ma koristasin korteri ise.", en: "I cleaned the flat myself." },
    { et: "See pole õige, ma koristasin ju kõik ära.", en: "That's not right, I cleaned everything up." },
  ],
  offer: [
    { et: "Jah, see sobib.", en: "Yes, that works." },
    { et: "Hea küll, olen nõus.", en: "All right, I agree." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Aitäh, nägemist!", en: "Thanks, goodbye!" },
  ],
};
