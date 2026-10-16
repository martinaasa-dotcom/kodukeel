import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `ootamine`, beat by beat. See `lib/scenes/picks.ts`. */
export const ootamine: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  weather: [
    { et: "Jah, jälle {weather}.", en: "Yes, {weather} again." },
    { et: "Jah, täna on nii palju {weather:PARTITIVE}.", en: "Yes, there's so much {weather} today." },
  ],
  time: [
    { et: "Mis kell on?", en: "What time is it?" },
    { et: "Vabandust, palju kell on?", en: "Excuse me, what's the time?" },
  ],
  when: [
    { et: "Millal buss tuleb?", en: "When is the bus coming?" },
    { et: "Kas te teate, millal buss tuleb?", en: "Do you know when the bus is coming?" },
    { et: "Kui kaua veel peab ootama?", en: "How much longer do we have to wait?" },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Nägemist, ilusat päeva!", en: "Bye, have a nice day!" },
  ],
};
