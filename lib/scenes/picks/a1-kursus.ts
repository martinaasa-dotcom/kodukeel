import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `a1-kursus`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker has read; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const a1Kursus: ScenePicks = {
  greet: [
    { et: "Tere õhtust!", en: "Good evening!" },
    { et: "Tere!", en: "Hello!" },
  ],
  name: [
    { et: "Minu nimi on Tom.", en: "My name is Tom." },
    { et: "Mina olen Anna.", en: "I'm Anna." },
  ],
  from: [
    { et: "Ma olen pärit {from:ABLATIVE}.", en: "I'm from {from}." },
    { et: "{from}.", en: "{from}." },
  ],
  live: [
    { et: "Ma elan Tallinnas.", en: "I live in Tallinn." },
    { et: "Ma elan Tartus.", en: "I live in Tartu." },
  ],
  family: [
    { et: "Jah, mul on abikaasa ja poeg.", en: "Yes, I have a wife and a son." },
    { et: "Jah, mul on pere.", en: "Yes, I have a family." },
  ],
  speak: [
    { et: "Natuke, aga ma õpin.", en: "A little, but I'm learning." },
    { et: "Jah, natuke.", en: "Yes, a little." },
  ],
  close: [
    { et: "Palun!", en: "You're welcome!" },
    { et: "Aitäh!", en: "Thank you!" },
  ],
};
