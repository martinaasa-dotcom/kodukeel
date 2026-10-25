import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `pangas`, beat by beat. See `lib/scenes/picks.ts`. */
export const pangas: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  want: [
    { et: "Ma tahaksin konto avada.", en: "I'd like to open an account." },
    { et: "Mul oleks vaja kontot.", en: "I need an account, please." },
  ],
  for: [
    { et: "Palga jaoks.", en: "For my wages." },
    { et: "Mul on uus töö. See on palga jaoks.", en: "I've got a new job. It's for my wages." },
  ],
  brought: [
    { et: "Siin on {brought}.", en: "Here's the {brought}." },
    { et: "Mul on {brought} kaasas.", en: "I've got the {brought} with me." },
  ],
  card: [
    { et: "Jah, palun.", en: "Yes, please." },
    { et: "Jah, kaart oleks hea.", en: "Yes, a card would be good." },
  ],
  sign: [
    { et: "Hästi.", en: "OK." },
    { et: "Jah, selge.", en: "Yes, got it." },
    { et: "Hästi, kirjutan alla.", en: "OK, I'll sign." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh! Nägemist!", en: "Thanks a lot! Goodbye!" },
  ],
};
