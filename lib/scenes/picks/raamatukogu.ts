import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `raamatukogu`, beat by beat. See `lib/scenes/picks.ts`. */
export const raamatukogu: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  want: [
    { et: "Kas ma saaksin raamatukogu kaardi?", en: "Could I get a library card?" },
    { et: "Ma tahaksin raamatukogu kaardi teha.", en: "I'd like to get a library card." },
  ],
  month: [
    { et: "{month:INESSIVE}.", en: "In {month}." },
    { et: "Ma olen sündinud {month:INESSIVE}.", en: "I was born in {month}." },
  ],
  phone: [
    { et: "{phone}.", en: "{phone}." },
    { et: "Minu number on {phone}.", en: "My number is {phone}." },
  ],
  check: [
    { et: "{phone}.", en: "{phone}." },
    { et: "Muidugi. {phone}.", en: "Of course. {phone}." },
    { et: "Jah, uuesti: {phone}.", en: "Sure, once more: {phone}." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh! Nägemist!", en: "Thanks a lot! Goodbye!" },
  ],
};
