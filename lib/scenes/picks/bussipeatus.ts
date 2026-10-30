import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `bussipeatus`, beat by beat. See `lib/scenes/picks.ts`. */
export const bussipeatus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Vabandust!", en: "Excuse me!" },
    { et: "Tere, vabandust!", en: "Hello, excuse me!" },
  ],
  this: [
    { et: "Kas see buss sõidab {to:TERMINATIVE}?", en: "Does this bus go as far as the {to}?" },
    { et: "Kas see buss läheb {to:GENITIVE} poole?", en: "Is this bus going towards the {to}?" },
    { et: "Vabandust, kas selle bussiga saab {to:TERMINATIVE}?", en: "Excuse me, can I get to the {to} on this bus?" },
  ],
  yes: [
    { et: "Aitäh!", en: "Thanks!" },
    { et: "Hästi, aitäh!", en: "Great, thank you!" },
    { et: "Selge, aitäh!", en: "Got it, thanks!" },
  ],
  stops: [
    { et: "Mitu peatust on {to:TERMINATIVE}?", en: "How many stops is it to the {to}?" },
    { et: "Kus ma pean maha minema?", en: "Where do I need to get off?" },
    { et: "Kas te ütlete, kus ma pean maha minema?", en: "Could you tell me where I need to get off?" },
  ],
  close: [
    { et: "Aitäh!", en: "Thank you!" },
    { et: "Suur aitäh!", en: "Thanks a lot!" },
  ],
};
