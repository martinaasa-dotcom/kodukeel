import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `ametiasutus`, beat by beat. See `lib/scenes/picks.ts`. */
export const ametiasutus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  purpose: [
    { et: "Ma tahan {paper:GENITIVE} ära anda.", en: "I'd like to hand in my {paper}." },
    { et: "Tõin {paper:GENITIVE}.", en: "I've brought my {paper}." },
    { et: "Mul on siin {paper}.", en: "I've got my {paper} here." },
  ],
  document: [
    { et: "Jah, see on siin.", en: "Yes, it's here." },
    { et: "Jah, palun, siin see on.", en: "Yes, here you go." },
    { et: "Ei, mul ei ole seda kaasas.", en: "No, I don't have it with me." },
  ],
  wait: [
    { et: "Kui kaua ma pean ootama?", en: "How long do I have to wait?" },
    { et: "Mitu minutit see umbes võtab?", en: "About how many minutes will it take?" },
    { et: "Kas see võtab kaua aega?", en: "Will it take long?" },
  ],
  fill: [
    { et: "Hästi, ma täidan selle ära.", en: "All right, I'll fill it in." },
    { et: "Selge, täidan ära ja kirjutan alla.", en: "Got it, I'll fill it in and sign." },
  ],
  confirm: [
    { et: "Millal see valmis on?", en: "When will it be ready?" },
    { et: "Mitu päeva see võtab?", en: "How many days will it take?" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh!", en: "Thanks a lot!" },
  ],
};
