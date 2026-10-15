import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `nadalavahetus`, beat by beat. See `lib/scenes/picks.ts`. */
export const nadalavahetus: ScenePicks = {
  greet: [
    { et: "Tere hommikust!", en: "Good morning!" },
    { et: "Tere!", en: "Hi!" },
  ],
  how: [
    { et: "Hea, aitäh!", en: "Good, thanks!" },
    { et: "Väga tore oli!", en: "It was really nice!" },
    { et: "Hästi, rahulik.", en: "Fine, nice and quiet." },
  ],
  did: [
    { et: "{did} oli väga tore!", en: "The {did} was really nice!" },
    { et: "Laupäeval oli {did}. Väga tore!", en: "On Saturday there was a {did}. Really nice!" },
  ],
  back: [
    { et: "Aga sina?", en: "And you?" },
    { et: "Kuidas sinu nädalavahetus oli?", en: "How was your weekend?" },
    { et: "Kas sul oli ka tore?", en: "Did you have a nice time too?" },
  ],
  close: [
    { et: "Nägemist!", en: "See you!" },
    { et: "Hea küll, nägemist!", en: "All right, see you!" },
    { et: "Aitäh, head päeva!", en: "Thanks, have a good day!" },
  ],
};
