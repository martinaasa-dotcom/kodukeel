import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `arsti-aeg`, beat by beat. See `lib/scenes/picks.ts`. */
export const arstiAeg: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere hommikust!", en: "Good morning!" },
  ],
  reason: [
    { et: "Ma olen haige.", en: "I'm ill." },
    { et: "Mul on palavik.", en: "I've got a fever." },
    { et: "Mul on valu ja ma olen väga väsinud.", en: "I'm in pain and I'm very tired." },
  ],
  where: [
    { et: "Pea valutab.", en: "My head hurts." },
    { et: "Mul valutab selg.", en: "My back hurts." },
    { et: "Mul on valu jalas.", en: "I've got a pain in my leg." },
  ],
  since: [
    { et: "Alates {since:ELATIVE}.", en: "Since {since}." },
    { et: "See algas {since:ADESSIVE}.", en: "It started on {since}." },
  ],
  offer: [
    { et: "Jah, sobib.", en: "Yes, that works." },
    { et: "Kell {time} sobib mulle hästi.", en: "{time} suits me fine." },
  ],
  confirm: [
    { et: "Kell {time}, selge.", en: "At {time}, got it." },
    { et: "Hästi, aitäh.", en: "Great, thank you." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, goodbye!" },
    { et: "Suur aitäh, nägemist!", en: "Thank you so much, bye!" },
  ],
};
