import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `palk`, beat by beat. See `lib/scenes/picks.ts`. */
export const palk: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  topic: [
    { et: "Ma tahan rääkida palgast.", en: "I want to talk about my pay." },
    { et: "Ma sooviksin rääkida oma palgast.", en: "I'd like to talk about my pay." },
  ],
  did: [
    { et: "Ma tegin sel aastal valmis suure {did:GENITIVE}.", en: "This year I finished a big {did}." },
    { et: "Sel aastal oli minu {did} väga hea.", en: "This year my {did} went really well." },
  ],
  amount: [
    { et: "{ask} eurot.", en: "{ask}." },
    { et: "Ma sooviksin {ask} eurot kuus rohkem.", en: "I'd like {ask} more a month." },
  ],
  offer: [
    { et: "Jah, see sobib.", en: "Yes, that works." },
    { et: "Hea, olen nõus.", en: "Good, I agree." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, goodbye!" },
  ],
};
