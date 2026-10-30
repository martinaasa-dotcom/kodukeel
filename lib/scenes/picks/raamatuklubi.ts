import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `raamatuklubi`, beat by beat. See `lib/scenes/picks.ts`. */
export const raamatuklubi: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, kuidas läheb?", en: "Hi, how's it going?" },
  ],
  thought: [
    { et: "Väga huvitav.", en: "Really interesting." },
    { et: "Mulle tundus see raamat väga huvitav.", en: "I found the book really interesting." },
    { et: "Huvitav, aga natuke liiga pikk.", en: "Interesting, but a bit too long." },
  ],
  hero: [
    { et: "Jah, ta meeldis mulle.", en: "Yes, I liked them." },
    { et: "Ei, ta ei meeldinud mulle eriti.", en: "No, I didn't really like them." },
    { et: "Huvitav tegelane, aga mitte eriti meeldiv.", en: "An interesting character, but not very likeable." },
  ],
  change: [
    { et: "Ma muudaksin lõppu.", en: "I'd change the ending." },
    { et: "Ma teeksin lõpu õnnelikuks.", en: "I'd give it a happy ending." },
    { et: "Algus oli liiga pikk, seda ma muudaksin.", en: "The beginning was too long, I'd change that." },
  ],
  agree: [
    { et: "Jah, ma arvan ka.", en: "Yes, I think so too." },
    { et: "Jah, lõpp oli tõesti hea.", en: "Yes, the ending really was good." },
    { et: "Ei, mulle meeldis rohkem algus.", en: "No, I liked the beginning more." },
  ],
  close: [
    { et: "Head aega!", en: "Bye!" },
    { et: "Head aega, järgmise kuuni!", en: "Bye, see you next month!" },
    { et: "Aitäh, nägemist!", en: "Thanks, see you!" },
  ],
};
