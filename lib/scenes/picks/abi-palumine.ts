import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `abi-palumine`, beat by beat. See `lib/scenes/picks.ts`. */
export const abiPalumine: ScenePicks = {
  greet: [
    { et: "Vabandust!", en: "Excuse me!" },
    { et: "Vabandust, üks hetk!", en: "Excuse me, one moment!" },
  ],
  ask: [
    { et: "Kas te saate mind aidata?", en: "Could you help me?" },
    { et: "Palun aidake, kott on raske.", en: "Please help, the bag is heavy." },
    { et: "Kas te saaksite ust hoida?", en: "Could you hold the door?" },
  ],
  how: [
    { et: "Vabandust, ma ei saa aru.", en: "Sorry, I don't understand." },
    { et: "Vabandust, kas te saate seda uuesti öelda?", en: "Sorry, could you say that again?" },
    { et: "Palun öelge uuesti, aeglaselt.", en: "Please say it again, slowly." },
  ],
  again: [
    { et: "Jah, selge.", en: "Yes, got it." },
    { et: "Hästi, sain aru.", en: "OK, I understand now." },
  ],
  thanks: [
    { et: "Aitäh ja vabandust! Head aega!", en: "Thank you, and sorry! Goodbye!" },
    { et: "Suur aitäh! Vabandust, et teid kinni hoidsin.", en: "Thanks so much! Sorry for holding you up." },
    { et: "Vabandust, et teie aega võtsin. Aitäh, head aega!", en: "Sorry for taking your time. Thank you, goodbye!" },
  ],
};
