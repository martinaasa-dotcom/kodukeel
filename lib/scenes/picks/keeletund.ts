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
    { et: "Ma olen pärit {from:ELATIVE}.", en: "I'm from {from}." },
    { et: "Olen pärit {from:ELATIVE}, aga elan nüüd Eestis.", en: "I'm from {from}, but I live in Estonia now." },
  ],
  why: [
    { et: "{why:GENITIVE} pärast.", en: "Because of my {why}." },
    { et: "Ma õpin eesti keelt {why:GENITIVE} pärast.", en: "I'm learning Estonian because of my {why}." },
  ],
  word: [
    { et: "Mida see sõna tähendab?", en: "What does that word mean?" },
    { et: "Vabandust, mis sõna see oli?", en: "Sorry, what was that word?" },
    { et: "Kas te saate seda sõna seletada?", en: "Could you explain that word?" },
  ],
  howlong: [
    { et: "Kuu aega.", en: "A month." },
    { et: "Juba aasta.", en: "A year now." },
    { et: "Ainult kaks nädalat.", en: "Only two weeks." },
  ],
  close: [
    { et: "Aitäh!", en: "Thank you!" },
    { et: "Suur aitäh!", en: "Thanks a lot!" },
  ],
};
