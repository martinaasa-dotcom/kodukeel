import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-lastevanemad`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Lastevanemad: ScenePicks = {
  greet: [
    { et: "Tere õhtust!", en: "Good evening!" },
    { et: "Tere!", en: "Hello!" },
  ],
  who: [
    { et: "Minu poeg tuleb sügisel teie klassi.", en: "My son is joining your class in the autumn." },
    { et: "Mu tütar tuleb teie klassi.", en: "My daughter is joining your class." },
  ],
  after: [
    { et: "Kas ta saab pärast tunde koolis olla?", en: "Can he stay at school after lessons?" },
    { et: "Kas laps saab pärast tunde koolis olla?", en: "Can a child stay at school after lessons?" },
  ],
  group: [
    { et: "Vabandust, mis on pikapäevarühm?", en: "Sorry, what's an after-school group?" },
    { et: "Mis see tähendab?", en: "What does that mean?" },
  ],
  remember: [
    { et: "Selge. Pikapäevarühm. Ma jätan meelde.", en: "I see. An after-school group. I'll remember that." },
    { et: "Selge, aitäh!", en: "I see, thank you!" },
  ],
  road: [
    { et: "Äkki saaksid vanemad hommikul kordamööda tee ääres olla?", en: "Maybe parents could take turns standing by the road in the morning?" },
    { et: "Vanemad võiksid hommikul kordamööda tee ääres olla.", en: "Parents could take turns standing by the road in the morning." },
  ],
  week: [
    { et: "Jah, esmaspäeva hommikul saan, tööle minnes.", en: "Yes, I can on Monday morning, on my way to work." },
    { et: "Muidugi, esmaspäeva hommikul.", en: "Of course, on Monday morning." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
