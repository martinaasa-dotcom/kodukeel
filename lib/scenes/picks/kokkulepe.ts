import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `kokkulepe`, beat by beat. See `lib/scenes/picks.ts`. */
export const kokkulepe: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, kuidas läheb?", en: "Hi, how's it going?" },
  ],
  idea: [
    { et: "Jah, muidugi!", en: "Yes, of course!" },
    { et: "Tore, ma tahan küll!", en: "Great, I'd love to!" },
  ],
  day: [
    { et: "Homme ei sobi.", en: "Tomorrow doesn't work." },
    { et: "Vabandust, homme ma ei saa.", en: "Sorry, I can't tomorrow." },
  ],
  free: [
    { et: "{free:ADESSIVE}.", en: "On {free}." },
    { et: "{free:GENITIVE} õhtul olen vaba.", en: "I'm free on {free} evening." },
    { et: "Kas {free:ADESSIVE} sobib?", en: "Does {free} work?" },
  ],
  time: [
    { et: "Jah, sobib.", en: "Yes, that works." },
    { et: "Hästi, kell {time} sobib.", en: "OK, {time} works." },
  ],
  close: [
    { et: "Nägemist!", en: "See you!" },
    { et: "Tore, näeme siis!", en: "Great, see you then!" },
  ],
};
