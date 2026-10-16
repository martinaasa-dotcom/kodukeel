import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `elamisluba`, beat by beat. See `lib/scenes/picks.ts`. */
export const elamisluba: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  want: [
    { et: "Ma tulin uue loa pärast.", en: "I've come about a new permit." },
    { et: "Ma tahaksin taotlust esitada.", en: "I'd like to hand in an application." },
  ],
  booking: [
    { et: "Palun, {ref}.", en: "Here you are, {ref}." },
    { et: "Minu broneeritud aja number on {ref}.", en: "My booking number is {ref}." },
  ],
  brought: [
    { et: "Siin on {brought}.", en: "Here's the {brought}." },
    { et: "Mul on kaasas {brought}.", en: "I've brought the {brought} with me." },
  ],
  next: [
    { et: "Millal kaart valmis on?", en: "When will the card be ready?" },
    { et: "Millal ma kaardi saan?", en: "When do I get the card?" },
  ],
  collect: [
    { et: "Selge, aitäh.", en: "Got it, thank you." },
    { et: "{ready:ADESSIVE}, hästi.", en: "On {ready}, good." },
    { et: "Jah, see sobib.", en: "Yes, that suits me." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh! Nägemist!", en: "Thanks so much! Goodbye!" },
  ],
};
