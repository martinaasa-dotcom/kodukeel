import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `toovestlus`, beat by beat. See `lib/scenes/picks.ts`. */
export const toovestlus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, meeldiv tutvuda!", en: "Hello, nice to meet you!" },
  ],
  before: [
    { et: "{before:INESSIVE}.", en: "At a {before}." },
    { et: "Ma töötasin {before:INESSIVE}.", en: "I worked at a {before}." },
    { et: "Varem töötasin {before:INESSIVE}.", en: "Before this I worked at a {before}." },
  ],
  skill: [
    { et: "Ma oskan hästi {skill:COMITATIVE} töötada.", en: "I'm good at working with a {skill}.", when: { slot: "skill", oneOf: ["arvuti"] } },
    { et: "Ma töötan iga päev arvutiga.", en: "I work with a computer every day.", when: { slot: "skill", oneOf: ["arvuti"] } },
    { et: "Ma räägin hästi {skill} keelt.", en: "I speak good {skill}.", when: { slot: "skill", oneOf: ["vene", "prantsuse"] } },
    { et: "Ma oskan väga hästi {skill} keelt.", en: "I know {skill} very well.", when: { slot: "skill", oneOf: ["vene", "prantsuse"] } },
  ],
  why: [
    { et: "Ma tahan uut tööd.", en: "I want a new job." },
    { et: "Sest see töö on huvitav.", en: "Because this job is interesting." },
    { et: "Mulle meeldib teie ettevõte.", en: "I like your company." },
  ],
  pay: [
    { et: "Kui suur on palk?", en: "How much is the pay?" },
    { et: "Mul on üks küsimus: kui suur on palk?", en: "I have one question: how much is the pay?" },
    { et: "Kui palju te maksate?", en: "How much do you pay?" },
  ],
  wage: [
    { et: "Jah, sobib.", en: "Yes, that works." },
    { et: "Jah, see on hea.", en: "Yes, that's good." },
    { et: "Hästi, ma olen nõus.", en: "All right, I agree." },
  ],
  start: [
    { et: "{start:ADESSIVE}.", en: "On {start}." },
    { et: "Ma saan alustada {start:ADESSIVE}.", en: "I can start on {start}." },
    { et: "Juba {start:ADESSIVE}.", en: "As early as {start}." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, see you!" },
  ],
};
