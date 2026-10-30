import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `kuulsin`, beat by beat. See `lib/scenes/picks.ts`. */
export const kuulsin: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere! Hästi, aitäh. Kuidas teil läheb?", en: "Hello! Fine, thanks. How are you?" },
  ],
  news: [
    { et: "Siin lähedal tuleb uus {news}.", en: "A new {news} is opening nearby." },
    { et: "Kas te olete kuulnud? Siin lähedal tuleb uus {news}.", en: "Have you heard? A new {news} is opening nearby." },
    { et: "Lugesin, et siin lähedal tuleb varsti uus {news}.", en: "I read that a new {news} is opening near here soon." },
  ],
  when: [
    { et: "{when:ADESSIVE}.", en: "On {when}." },
    { et: "Vist {when:ADESSIVE}.", en: "On {when}, I think." },
    { et: "Lugesin, et juba {when:ADESSIVE}.", en: "I read it's as soon as {when}." },
  ],
  source: [
    { et: "Lugesin seda ajalehest.", en: "I read it in the paper." },
    { et: "Kuulsin seda raadiost, uudistes.", en: "I heard it on the radio, on the news." },
    { et: "Sõber rääkis.", en: "A friend told me." },
  ],
  sure: [
    { et: "Ei, ma ei ole kindel.", en: "No, I'm not sure." },
    { et: "Vist küll, aga päris kindel ma pole.", en: "I think so, but I'm not completely sure." },
    { et: "Ma ei ole kindel, lugesin seda ainult ajalehest.", en: "I'm not sure, I only read it in the paper." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, goodbye!" },
    { et: "Nägemist!", en: "See you!" },
    { et: "Aitäh, ilusat päeva!", en: "Thanks, have a nice day!" },
  ],
};
