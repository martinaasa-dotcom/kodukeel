import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `uuri-remont`, beat by beat. See `lib/scenes/picks.ts`. */
export const uuriRemont: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, siin on teie üürnik.", en: "Hello, it's your tenant here." },
  ],
  problem: [
    { et: "{problem} on katki.", en: "The {problem} is broken." },
    { et: "Meil on {problem} katki.", en: "Our {problem} is broken." },
    { et: "{problem} ei ole korras.", en: "Something's wrong with the {problem}." },
  ],
  where: [
    { et: "Köögis, {floor}. korrusel.", en: "In the kitchen, on floor {floor}." },
    { et: "See on toas. Ma elan {floor}. korrusel.", en: "It's in the room. I live on floor {floor}." },
  ],
  since: [
    { et: "Alates {since:ELATIVE}.", en: "Since {since}." },
    { et: "Juba {since:ELATIVE}.", en: "Ever since {since}." },
    { et: "See läks katki {since:ADESSIVE}.", en: "It broke on {since}." },
  ],
  refuse: [
    { et: "Aga millal saab?", en: "But when can somebody come?" },
    { et: "Millal siis keegi saab tulla?", en: "So when can somebody come?" },
    { et: "Kas järgmisel nädalal saab?", en: "Is next week possible?" },
  ],
  agree: [
    { et: "Jah, sobib.", en: "Yes, that works." },
    { et: "Jah, {day:ADESSIVE} kell {time} sobib.", en: "Yes, {day} at {time} works." },
    { et: "Jah, ma olen siis kodus.", en: "Yes, I'll be home then." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, see you!" },
  ],
};
