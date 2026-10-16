import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `koosolek`, beat by beat. See `lib/scenes/picks.ts`. */
export const koosolek: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  idea: [
    { et: "Ma ei ole nõus.", en: "I don't agree." },
    { et: "Ma kahtlen, kas see homme valmis saab.", en: "I doubt it'll be ready by tomorrow." },
    { et: "Vabandust, aga ma ei nõustu.", en: "Sorry, but I don't agree." },
  ],
  why: [
    { et: "Sest meil ei ole nii palju aega.", en: "Because we don't have that much time." },
    { et: "Mul on praegu palju tööd.", en: "I have a lot of work right now." },
  ],
  propose: [
    { et: "{myday:ADESSIVE}.", en: "On {myday}." },
    { et: "Äkki {myday:ADESSIVE}?", en: "Maybe {myday}?" },
  ],
  agree: [
    { et: "Jah, kindlasti.", en: "Yes, definitely." },
    { et: "Aitäh, see tuleb kindlasti hea.", en: "Thanks, it'll definitely be good." },
  ],
  close: [
    { et: "Head aega!", en: "Bye!" },
    { et: "Aitäh, nägemist!", en: "Thanks, see you!" },
  ],
};
