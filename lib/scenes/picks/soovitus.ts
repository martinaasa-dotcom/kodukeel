import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `soovitus`, beat by beat. See `lib/scenes/picks.ts`. */
export const soovitus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, kaua pole näinud!", en: "Hi, long time no see!" },
  ],
  seen: [
    { et: "Jah, üks väga hea {what}.", en: "Yes, a really good {what}." },
    { et: "Jah, ma tean üht väga head {what:PARTITIVE}.", en: "Yes, I know a really good {what}." },
  ],
  like: [
    { et: "Väga huvitav!", en: "Really interesting!" },
    { et: "See oli väga lõbus.", en: "It was a lot of fun." },
    { et: "Ilus ja huvitav.", en: "Beautiful and interesting." },
  ],
  compare: [
    { et: "Parem!", en: "Better!" },
    { et: "See on palju parem.", en: "This one is much better." },
    { et: "Natuke halvem, aga ikka hea.", en: "A bit worse, but still good." },
  ],
  recommend: [
    { et: "Jah, kindlasti!", en: "Yes, definitely!" },
    { et: "Ma soovitan seda väga.", en: "I really recommend it." },
  ],
  close: [
    { et: "Head aega!", en: "Bye!" },
    { et: "Nägemist, näeme varsti!", en: "Bye, see you soon!" },
  ],
};
