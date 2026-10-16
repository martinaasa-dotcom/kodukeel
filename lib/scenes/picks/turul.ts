import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `turul`, beat by beat. See `lib/scenes/picks.ts`. */
export const turul: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  some: [
    { et: "Palun natuke {some:PARTITIVE}.", en: "Some {some}, please." },
    { et: "Kas teil on {some:PARTITIVE}?", en: "Do you have any {some}?" },
    { et: "Ma tahaksin {some:PARTITIVE}.", en: "I'd like some {some}." },
  ],
  weight: [
    { et: "{kilos} kilo, palun.", en: "{kilos} kilos, please." },
    { et: "Pool kilo, palun.", en: "Half a kilo, please." },
    { et: "Natuke, palun.", en: "Just a little, please." },
  ],
  pieces: [
    { et: "Ja {many} {pieces:PARTITIVE}, palun.", en: "And {pieces}, {many} of them, please." },
    { et: "Jah, palun veel {many} {pieces:PARTITIVE}.", en: "Yes, and {many} {pieces} as well, please." },
    { et: "Jah, mõni {pieces} ka.", en: "Yes, a few {pieces} too." },
  ],
  many: [
    { et: "{many}, palun.", en: "{many}, please." },
    { et: "{many} tükki.", en: "{many} of them." },
  ],
  price: [
    { et: "Kui palju see maksab?", en: "How much is that?" },
    { et: "Palju see kokku teeb?", en: "How much does that come to?" },
    { et: "Mis see kõik kokku maksab?", en: "What does it all cost together?" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Palun, siin on raha. Aitäh!", en: "Here's the money. Thank you!" },
    { et: "Maksan sularahas. Nägemist!", en: "I'll pay in cash. Goodbye!" },
  ],
};
