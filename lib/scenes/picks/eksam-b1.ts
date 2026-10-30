import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `eksam-b1`, beat by beat. See `lib/scenes/picks.ts`. */
export const eksamB1: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  home: [
    { et: "Ma elan linnas.", en: "I live in town." },
    { et: "Elan maal, väikeses külas.", en: "I live in the country, in a small village." },
    { et: "Ma elan korteris, kesklinna lähedal.", en: "I live in a flat near the city center." },
  ],
  work: [
    { et: "Ma töötan ühes firmas.", en: "I work at a company." },
    { et: "Ma õpin ülikoolis.", en: "I study at university." },
    { et: "Praegu töötan ja õpin ka.", en: "At the moment I work and study as well." },
  ],
  plan: [
    { et: "Mina valiksin {place:GENITIVE}.", en: "I'd choose the {place}." },
    { et: "Kino on tore, aga mina eelistaksin {place:PARTITIVE}.", en: "The cinema's nice, but I'd prefer the {place}." },
  ],
  why: [
    { et: "Sest see on huvitav.", en: "Because it's interesting." },
    { et: "Sest seal on alati midagi huvitavat.", en: "Because there's always something interesting there." },
    { et: "Sest ma pole seal ammu käinud.", en: "Because I haven't been there for ages." },
  ],
  agree: [
    { et: "Hästi!", en: "Great!" },
    { et: "Jah, see sobib mulle.", en: "Yes, that suits me." },
    { et: "Tore, siis on otsustatud.", en: "Good, then it's decided." },
  ],
  call: [
    { et: "Millal tunnid õhtul algavad?", en: "When do the evening lessons start?" },
    { et: "Tere, kas te ütleksite, millal õhtul tunnid algavad?", en: "Hello, could you tell me when the evening lessons start?" },
  ],
  when: [
    { et: "Jah, sobib.", en: "Yes, that works." },
    { et: "Hästi, see sobib mulle.", en: "All right, that suits me." },
    { et: "{day:ADESSIVE} kell {time} sobib väga hästi.", en: "{day} at {time} suits me very well." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Aitäh teile!", en: "Thank you!" },
    { et: "Suur aitäh, nägemist!", en: "Thank you very much, goodbye!" },
  ],
};
