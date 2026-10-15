import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `elanike-koosolek`, beat by beat. See `lib/scenes/picks.ts`. */
export const elanikeKoosolek: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere õhtust!", en: "Good evening!" },
  ],
  idea: [
    { et: "Puid ja lilli, et oleks ilus.", en: "Trees and flowers, so it looks nice." },
    { et: "Ma tahaksin, et maja taga oleks puid ja lilli.", en: "I'd like there to be trees and flowers behind the building." },
    { et: "Mul on mõte: teeme maja taha väikese pargi.", en: "I have an idea: let's make a little park behind the building." },
  ],
  why: [
    { et: "Lastele.", en: "For the children." },
    { et: "Sest lastel oleks seal ohutu.", en: "Because it would be safe for the children there." },
    { et: "See on hea meie kogukonnale ja keskkonnale.", en: "It's good for our community and for the environment." },
  ],
  cost: [
    { et: "Me võiksime seda koos teha.", en: "We could do it together." },
    { et: "See ei pea olema kallis, teeme ise.", en: "It doesn't have to be expensive, we'll do it ourselves." },
    { et: "Kui kõik aitavad, on see odav.", en: "If everyone helps, it's cheap." },
  ],
  vote: [
    { et: "Jah!", en: "Yes!" },
    { et: "Jah, ma olen nõus.", en: "Yes, I agree." },
    { et: "Jah, hääletame.", en: "Yes, let's vote." },
  ],
  close: [
    { et: "Head aega!", en: "Goodbye!" },
    { et: "Aitäh, head õhtut!", en: "Thanks, have a good evening!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
