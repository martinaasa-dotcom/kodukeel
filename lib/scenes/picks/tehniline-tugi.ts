import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `tehniline-tugi`, beat by beat. See `lib/scenes/picks.ts`. */
export const tehnilineTugi: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, mul on küsimus.", en: "Hello, I have a question." },
  ],
  problem: [
    { et: "Ühendus ei tööta.", en: "The connection isn't working." },
    { et: "Võrk ei tööta alates hommikust.", en: "The network hasn't worked since this morning." },
  ],
  device: [
    { et: "{device}.", en: "The {device}." },
    { et: "Praegu {device:COMITATIVE}.", en: "With the {device}, right now." },
  ],
  screen: [
    { et: "Ekraanil on viga.", en: "There's an error on the screen." },
    { et: "Ekraan on must.", en: "The screen is black." },
    { et: "Ekraan on tühi.", en: "The screen is empty." },
  ],
  tried: [
    { et: "Ma ei ole veel midagi proovinud.", en: "I haven't tried anything yet." },
    { et: "Panin kinni ja uuesti käima.", en: "I switched it off and on again." },
  ],
  fix: [
    { et: "Hästi, nüüd töötab.", en: "Right, it works now." },
    { et: "Jah, aitäh, töötab!", en: "Yes, thanks, it works!" },
    { et: "Kui kaua ma pean ootama?", en: "How long do I have to wait?" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, goodbye!" },
  ],
};
