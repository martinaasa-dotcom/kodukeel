import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `nadalavahetus`, beat by beat. See `lib/scenes/picks.ts`. */
export const nadalavahetus: ScenePicks = {
  greet: [
    { et: "Tere, tere!", en: "Hello, hello!" },
    { et: "Tere!", en: "Hi!" },
  ],
  how: [
    { et: "Hea oli, aitäh!", en: "It was good, thanks!" },
    { et: "Väga tore oli!", en: "It was really nice!" },
    { et: "Hästi, rahulik.", en: "Fine, nice and quiet." },
  ],
  did: [
    { et: "Ma käisin {did:INESSIVE}.", en: "I went to the {did}." },
    { et: "Laupäeval olin {did:INESSIVE}. Väga tore oli!", en: "On Saturday I was at the {did}. It was really nice!" },
  ],
  back: [
    { et: "Tore! Mis huvitavat oli?", en: "Nice! Anything interesting?" },
    { et: "Ja mis sul toredat oli?", en: "And what made yours nice?" },
  ],
  close: [
    { et: "Nägemist!", en: "See you!" },
    { et: "Hea küll, nägemist!", en: "All right, see you!" },
    { et: "Aitäh, head päeva!", en: "Thanks, have a good day!" },
  ],
};
