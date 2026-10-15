import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `bussipeatus`, beat by beat. See `lib/scenes/picks.ts`. */
export const bussipeatus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Vabandust!", en: "Excuse me!" },
    { et: "Tere, vabandust!", en: "Hello, excuse me!" },
  ],
  this: [
    { et: "Kas see buss läheb {to:TERMINATIVE}?", en: "Does this bus go to the {to}?" },
    { et: "Kas see on {to:GENITIVE} buss?", en: "Is this the bus for the {to}?" },
    { et: "Ma pean minema {to:TERMINATIVE}. Kas see on õige buss?", en: "I need to get to the {to}. Is this the right bus?" },
  ],
  yes: [
    { et: "Aitäh!", en: "Thanks!" },
    { et: "Hästi, aitäh!", en: "Great, thank you!" },
    { et: "Selge, aitäh!", en: "Got it, thanks!" },
  ],
  stops: [
    { et: "Mitu peatust {to:TERMINATIVE} on?", en: "How many stops is it to the {to}?" },
    { et: "Kus ma pean maha minema?", en: "Where do I need to get off?" },
    { et: "Palun öelge, millal ma pean väljuma?", en: "Could you tell me when to get off?" },
  ],
  close: [
    { et: "Aitäh!", en: "Thank you!" },
    { et: "Suur aitäh!", en: "Thanks a lot!" },
  ],
};
