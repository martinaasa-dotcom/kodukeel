import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `keeletund`, beat by beat. See `lib/scenes/picks.ts`. */
export const keeletund: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere õhtust!", en: "Good evening!" },
  ],
  name: [
    { et: "Minu nimi on Anna.", en: "My name is Anna." },
    { et: "Ma olen Anna.", en: "I'm Anna." },
  ],
  from: [
    { et: "Minu kodumaa on {from}.", en: "My home country is {from}." },
    { et: "Minu kodumaa on {from}, aga elan nüüd Eestis.", en: "My home country is {from}, but I live in Estonia now." },
  ],
  why: [
    { et: "{why:GENITIVE} pärast.", en: "Because of my {why}." },
    { et: "Ma õpin eesti keelt {why:GENITIVE} pärast.", en: "I'm learning Estonian because of my {why}." },
  ],
  word: [
    { et: "Mida see sõna tähendab?", en: "What does that word mean?" },
    { et: "Vabandust, kas te saate seda uuesti öelda?", en: "Sorry, could you say that again?" },
    { et: "Kas te saate seda sõna seletada?", en: "Could you explain that word?" },
  ],
  howlong: [
    { et: "Üks kuu.", en: "One month." },
    { et: "Ma õpin juba aasta.", en: "I've been learning for a year already." },
    { et: "Ainult kaks nädalat.", en: "Only two weeks." },
  ],
  close: [
    { et: "Aitäh!", en: "Thank you!" },
    { et: "Suur aitäh!", en: "Thanks a lot!" },
  ],
};
