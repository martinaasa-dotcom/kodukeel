import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `apteek`, beat by beat. See `lib/scenes/picks.ts`. */
export const apteek: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  what: [
    { et: "Mul valutab {hurts}.", en: "My {hurts} hurts." },
    { et: "Mu {hurts} valutab. Kas te saate aidata?", en: "My {hurts} hurts. Can you help?" },
  ],
  since: [
    { et: "Alates {since:ELATIVE}.", en: "Since {since}." },
    { et: "See hakkas {since:ADESSIVE}.", en: "It started on {since}." },
  ],
  medicine: [
    { et: "Mida te soovitate?", en: "What would you recommend?" },
    { et: "Kas teil on mõni hea ravim?", en: "Do you have something good for it?" },
  ],
  how: [
    { et: "Kuidas ma seda võtan?", en: "How do I take it?" },
    { et: "Mitu tabletti päevas?", en: "How many tablets a day?" },
    { et: "Kas hommikul ja õhtul?", en: "Morning and evening?" },
  ],
  pay: [
    { et: "Jah, ma võtan selle.", en: "Yes, I'll take it." },
    { et: "Hästi, aitäh. Kui palju see maksab?", en: "Great, thanks. How much is it?" },
  ],
  card: [
    { et: "Kaardiga, palun.", en: "By card, please." },
    { et: "Sularahaga.", en: "In cash." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thank you so much, bye!" },
  ],
};
