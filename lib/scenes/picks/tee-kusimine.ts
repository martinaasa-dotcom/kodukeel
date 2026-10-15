import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `tee-kusimine`, beat by beat. See `lib/scenes/picks.ts`. */
export const teeKusimine: ScenePicks = {
  greet: [
    { et: "Vabandust!", en: "Excuse me!" },
    { et: "Tere! Vabandust.", en: "Hi! Sorry to bother you." },
  ],
  where: [
    { et: "Kus on {place}?", en: "Where's the {place}?" },
    { et: "Ma otsin {place:PARTITIVE}.", en: "I'm looking for the {place}." },
    { et: "Kas {place} on siin lähedal?", en: "Is the {place} near here?" },
  ],
  way: [
    { et: "Otse ja siis vasakule?", en: "Straight on and then left?" },
    { et: "Selge, aitäh!", en: "Got it, thanks!" },
  ],
  far: [
    { et: "Kas see on kaugel?", en: "Is it far?" },
    { et: "Kas ma saan sinna kõndida?", en: "Can I walk there?" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
    { et: "Suur aitäh! Nägemist!", en: "Thanks a lot! Bye!" },
  ],
};
