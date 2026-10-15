import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `kohvikus`, beat by beat. See `lib/scenes/picks.ts`. */
export const kohvikus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere hommikust!", en: "Good morning!" },
  ],
  order: [
    { et: "{drink:PARTITIVE}, palun.", en: "Some {drink}, please." },
    { et: "Ma sooviksin {drink:PARTITIVE}.", en: "I'd like some {drink}." },
    { et: "Ma võtan {drink:PARTITIVE}.", en: "I'll have {drink}." },
  ],
  size: [
    { et: "Suur, palun.", en: "A large one, please." },
    { et: "Väike, aitäh.", en: "A small one, thanks." },
  ],
  bill: [
    { et: "Jah, see on kõik.", en: "Yes, that's everything." },
    { et: "Jah, aitäh. Kui palju see maksab?", en: "Yes, thanks. How much is it?" },
    { et: "Jah, ma tahaksin maksta.", en: "Yes, I'd like to pay." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, see you!" },
  ],
};
