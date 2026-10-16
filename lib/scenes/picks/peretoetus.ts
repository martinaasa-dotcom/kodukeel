import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `peretoetus`, beat by beat. See `lib/scenes/picks.ts`. */
export const peretoetus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  why: [
    { et: "Raha ei ole tulnud.", en: "The money hasn't come." },
    { et: "Minu lapse raha ei ole sel kuul tulnud.", en: "The money for my child hasn't come this month." },
  ],
  ref: [
    { et: "{ref}", en: "{ref}" },
    { et: "Minu avalduse number on {ref}.", en: "My application number is {ref}." },
  ],
  last: [
    { et: "{last:INESSIVE}.", en: "In {last}." },
    { et: "Viimati {last:INESSIVE}.", en: "Last in {last}." },
  ],
  check: [
    { et: "Hästi, ma saadan selle.", en: "All right, I'll send it." },
    { et: "Kuidas ma saan selle saata?", en: "How can I send it?" },
    { et: "Selge. Kuhu ma selle saadan?", en: "Got it. Where do I send it?" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, goodbye!" },
  ],
};
