import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `lastevanemad`, beat by beat. See `lib/scenes/picks.ts`. */
export const lastevanemad: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, meeldiv tutvuda!", en: "Hello, nice to meet you!" },
  ],
  who: [
    { et: "Minu {child} on teie klassis.", en: "My {child} is in your class." },
    { et: "Ma tulin oma {child:GENITIVE} pärast.", en: "I've come about my {child}." },
  ],
  how: [
    { et: "Kas vead on suured?", en: "Are the mistakes big?" },
    { et: "Kas need on suured vead?", en: "Are they big mistakes?" },
  ],
  home: [
    { et: "Ta on kodus {home}.", en: "At home they're {home}." },
    { et: "Viimasel ajal on ta kodus natuke {home}.", en: "Lately they've been a bit {home} at home." },
  ],
  practise: [
    { et: "Jah, me loeme kodus iga päev.", en: "Yes, we'll read at home every day." },
    { et: "Hästi, loeme koos.", en: "All right, we'll read together." },
    { et: "Selge, nii me teeme.", en: "Got it, we'll do that." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thanks a lot, goodbye!" },
  ],
};
