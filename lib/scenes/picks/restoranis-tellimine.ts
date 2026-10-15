import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `restoranis-tellimine`, beat by beat. See `lib/scenes/picks.ts`. */
export const restoranisTellimine: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere õhtust!", en: "Good evening!" },
  ],
  "how-many": [
    { et: "Üks.", en: "Just one." },
    { et: "Ainult mina.", en: "Just me." },
  ],
  order: [
    { et: "{dish:PARTITIVE}, palun.", en: "The {dish}, please." },
    { et: "Ma võtan {dish:PARTITIVE}.", en: "I'll have the {dish}." },
    { et: "Ma sooviksin {dish:PARTITIVE}.", en: "I'd like the {dish}." },
  ],
  contents: [
    { et: "Mis seal sees on?", en: "What's in it?" },
    { et: "Kas seal on liha sees?", en: "Is there meat in it?" },
  ],
  drink: [
    { et: "{drink:PARTITIVE}, palun.", en: "Some {drink}, please." },
    { et: "Ma võtaksin {drink:PARTITIVE}.", en: "I'll have some {drink}." },
  ],
  bill: [
    { et: "Arve, palun.", en: "The bill, please." },
    { et: "Väga maitsev, aitäh. Kas ma saaksin arve?", en: "Delicious, thank you. Could I have the bill?" },
    { et: "Jah, väga hea. Ma tahaksin maksta.", en: "Yes, very good. I'd like to pay." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thank you so much, bye!" },
  ],
};
