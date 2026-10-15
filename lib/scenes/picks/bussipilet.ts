import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `bussipilet`, beat by beat. See `lib/scenes/picks.ts`. */
export const bussipilet: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere hommikust!", en: "Good morning!" },
  ],
  want: [
    { et: "Üks pilet, palun.", en: "One ticket, please." },
    { et: "Mul on vaja piletit.", en: "I need a ticket." },
  ],
  to: [
    { et: "{to:ILLATIVE}, palun.", en: "To the {to}, please." },
    { et: "Ma sõidan {to:ILLATIVE}.", en: "I'm going to the {to}." },
  ],
  when: [
    { et: "Kell {time}.", en: "At {time}." },
    { et: "Kell {time}, palun.", en: "The {time} one, please." },
  ],
  pay: [
    { et: "Jah, kaardiga.", en: "Yes, by card." },
    { et: "Ei, sularahaga.", en: "No, in cash." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, see you!" },
  ],
};
