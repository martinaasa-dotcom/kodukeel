import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `trepikoda`, beat by beat. See `lib/scenes/picks.ts`. */
export const trepikoda: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  new: [
    { et: "Jah, ma olen uus.", en: "Yes, I'm new." },
    { et: "Jah, ma elan nüüd siin.", en: "Yes, I live here now." },
  ],
  floor: [
    { et: "{floor}. korrusel.", en: "On floor {floor}." },
    { et: "Ma elan {floor}. korrusel.", en: "I live on floor {floor}." },
  ],
  from: [
    { et: "Minu kodumaa on {from}.", en: "My home country is {from}." },
    { et: "Kodumaa on {from}, aga nüüd elan Eestis.", en: "Home is {from}, but I live in Estonia now." },
  ],
  with: [
    { et: "Koos {with:COMITATIVE}.", en: "With my {with}." },
    { et: "Ma elan siin koos {with:COMITATIVE}.", en: "I live here with my {with}." },
  ],
  weather: [
    { et: "Jah, täna on ilus ilm.", en: "Yes, it's lovely weather today." },
    { et: "Jah, aga homme tuleb vihma.", en: "Yes, but it's going to rain tomorrow." },
  ],
  close: [
    { et: "Head aega!", en: "Bye!" },
    { et: "Nägemist! Ilusat päeva!", en: "See you! Have a nice day!" },
  ],
};
