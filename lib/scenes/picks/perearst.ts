import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `perearst`, beat by beat. See `lib/scenes/picks.ts`. */
export const perearst: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  hurts: [
    { et: "Mul valutab {hurts}.", en: "My {hurts} hurts." },
    { et: "{hurts} valutab juba mitu päeva.", en: "My {hurts} has been hurting for several days." },
  ],
  since: [
    { et: "{since:ELATIVE}.", en: "Since {since}." },
    { et: "Juba {since:ELATIVE} peale.", en: "Since {since} already." },
    { et: "Alates {since:ELATIVE}.", en: "Starting from {since}." },
  ],
  bad: [
    { et: "Väga tugev.", en: "Very bad." },
    { et: "Ainult natuke.", en: "Only a little." },
    { et: "Päris tugev valu.", en: "Quite a strong pain." },
  ],
  take: [
    { et: "{times} korda päevas.", en: "{times} times a day." },
    { et: "Selge, {times} korda päevas söögi ajal.", en: "Got it, {times} times a day with food." },
    { et: "Nii et {times} korda päevas, eks?", en: "So {times} times a day, right?" },
  ],
  again: [
    { et: "Jah, sobib.", en: "Yes, that works." },
    { et: "{back:ADESSIVE} kell {time} sobib.", en: "{back} at {time} is fine." },
    { et: "Hästi, aitäh.", en: "All right, thank you." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh! Nägemist!", en: "Thanks so much! Goodbye!" },
  ],
};
