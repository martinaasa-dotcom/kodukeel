import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `tootukassa`, beat by beat. See `lib/scenes/picks.ts`. */
export const tootukassa: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere hommikust!", en: "Good morning!" },
  ],
  why: [
    { et: "Ma otsin tööd.", en: "I'm looking for work." },
    { et: "Ma olen praegu ilma tööta.", en: "I'm out of work at the moment." },
    { et: "Mu töö lõppes ja ma otsin uut tööd.", en: "My job ended and I'm looking for a new one." },
  ],
  job: [
    { et: "Ma olin {job}.", en: "I was a {job}." },
    { et: "Ma töötasin {job:ESSIVE}.", en: "I worked as a {job}." },
  ],
  ended: [
    { et: "{ended:INESSIVE}.", en: "In {ended}." },
    { et: "Töö lõppes {ended:INESSIVE}.", en: "The job ended in {ended}." },
  ],
  looking: [
    { et: "Sama tööd.", en: "The same kind of work." },
    { et: "Ma otsin jälle {job:GENITIVE} tööd.", en: "I'm looking for work as a {job} again." },
    { et: "Ma tahaksin nüüd teist tööd.", en: "I would like a different kind of work now." },
  ],
  next: [
    { et: "Millal ma pean uuesti tulema?", en: "When do I need to come back?" },
    { et: "Mis päeval ma tulen?", en: "Which day do I come in?" },
  ],
  again: [
    { et: "Jah, sobib.", en: "Yes, that works." },
    { et: "{day:ADESSIVE} kell {time} sobib hästi.", en: "{day} at {time} suits me fine." },
    { et: "Hästi, aitäh.", en: "All right, thank you." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Suur aitäh! Nägemist!", en: "Thanks so much! Goodbye!" },
  ],
};
