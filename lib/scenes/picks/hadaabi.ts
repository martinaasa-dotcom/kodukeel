import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `hadaabi`, beat by beat. See `lib/scenes/picks.ts`. */
export const hadaabi: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, mul on abi vaja!", en: "Hello, I need help!" },
  ],
  what: [
    { et: "Keegi kukkus. Tal valutab {what}.", en: "Somebody fell. Their {what} hurts." },
    { et: "Keegi kukkus ja tal on {what} haige.", en: "Somebody fell and hurt their {what}." },
  ],
  part: [
    { et: "{what}.", en: "Their {what}." },
    { et: "Tal valutab {what}.", en: "Their {what} hurts." },
  ],
  where: [
    { et: "{where:GENITIVE} juures, maja number {house}.", en: "By the {where}, house number {house}." },
    { et: "Me oleme {where:GENITIVE} kõrval.", en: "We're next to the {where}." },
  ],
  house: [
    { et: "Maja number {house}.", en: "House number {house}." },
    { et: "{house}.", en: "{house}." },
  ],
  hurt: [
    { et: "Ei.", en: "No." },
    { et: "Ei, ta ei saa seista.", en: "No, they can't stand up." },
    { et: "Jah, ta saab seista.", en: "Yes, they can stand up." },
  ],
  wait: [
    { et: "Jah, selge.", en: "Yes, understood." },
    { et: "Hästi, me ootame.", en: "OK, we'll wait." },
    { et: "Selge, aitäh!", en: "Got it, thank you!" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh!", en: "Thank you so much!" },
  ],
};
