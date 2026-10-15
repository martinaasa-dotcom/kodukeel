import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `kuulsin`, beat by beat. See `lib/scenes/picks.ts`. */
export const kuulsin: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere hommikust!", en: "Good morning!" },
    { et: "Tere, kuidas läheb?", en: "Hello, how are you?" },
  ],
  news: [
    { et: "Siin lähedal tuleb uus {news}.", en: "There's a new {news} coming nearby." },
    { et: "Kas te olete kuulnud? Siin lähedal tuleb uus {news}.", en: "Have you heard? A new {news} is coming nearby." },
    { et: "Lugesin, et siin lähedal avab varsti uus {news}.", en: "I read that a new {news} is opening near here soon." },
  ],
  when: [
    { et: "{when:ADESSIVE}.", en: "On {when}." },
    { et: "Vist {when:ADESSIVE}.", en: "On {when}, I think." },
    { et: "Lugesin, et juba {when:ADESSIVE}.", en: "I read it's as soon as {when}." },
  ],
  source: [
    { et: "Ajalehest.", en: "In the paper." },
    { et: "Lugesin seda ajalehest.", en: "I read it in the paper." },
    { et: "Kuulsin seda raadiost, uudistes.", en: "I heard it on the radio, on the news." },
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
