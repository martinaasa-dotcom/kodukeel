import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `graafik`, beat by beat. See `lib/scenes/picks.ts`. */
export const graafik: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere hommikust!", en: "Good morning!" },
  ],
  what: [
    { et: "Sel kuul on {trend}.", en: "This month there's a {trend}." },
    { et: "See näitab {trend:PARTITIVE}.", en: "It shows a {trend}." },
    { et: "Sel kuul näeme selget {trend:PARTITIVE}.", en: "This month we see a clear {trend}." },
  ],
  much: [
    { et: "{percent} protsenti.", en: "{percent} per cent." },
    { et: "{percent} protsenti, see on palju.", en: "{percent} per cent, that's a lot." },
    { et: "Ühe kuuga {percent} protsenti.", en: "{percent} per cent in a single month." },
  ],
  why: [
    { et: "Hindade pärast.", en: "Because of prices." },
    { et: "Peamiselt turu pärast.", en: "Mostly because of the market." },
    { et: "Ma arvan, et põhjus on nõudluses.", en: "I think the reason is demand." },
  ],
  close: [
    { et: "Aitäh, see on kõik!", en: "Thanks, that's all!" },
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
