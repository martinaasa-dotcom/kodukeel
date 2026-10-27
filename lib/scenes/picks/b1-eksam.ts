import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b1-eksam`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b1Eksam: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  about: [
    { et: "Tere! Ma olen Tom. Ma elan Tallinnas ja töötan programmeerijana.", en: "Hello! I'm Tom. I live in Tallinn and I work as a programmer." },
    { et: "Ma elan Tallinnas ja töötan ühes uues firmas.", en: "I live in Tallinn and I work at a new company." },
  ],
  work: [
    { et: "Mulle meeldib mu töö, sest kolleegid aitavad mind alati.", en: "I like my job, because my colleagues always help me." },
    { et: "Mu kolleegid on sõbralikud.", en: "My colleagues are friendly." },
  ],
  problem: [
    { et: "Ma kaotasin rahakoti ära. Ma panin kaardi kohe kinni.", en: "I lost my wallet. I got my card blocked right away." },
    { et: "Ma lahendasin probleemi ise.", en: "I solved the problem myself." },
  ],
  nexttime: [
    { et: "Järgmine kord ma vaataksin enne laua peale.", en: "Next time I'd look on my desk first." },
    { et: "Ma oleksin pidanud enne vaatama.", en: "I should have looked first." },
  ],
  opinion: [
    { et: "Minu arvates ei ole, sest kesklinnas on vähe parkimiskohti.", en: "In my opinion it isn't, because there are few parking spaces in the center." },
    { et: "Minu arvates ei ole see lihtne, kuigi mul on parkimisluba.", en: "In my opinion it isn't easy, although I have a parking permit." },
  ],
  compare: [
    { et: "Minu arvates on linnas parem, sest seal on töö ja kool lähedal.", en: "In my opinion town is better, because work and school are close by there." },
    { et: "Maal on vaikne ja ilus.", en: "The country is quiet and beautiful." },
  ],
  learn: [
    { et: "Ma õppisin iga päev ja rääkisin palju kolleegidega.", en: "I studied every day and talked a lot with my colleagues." },
    { et: "Ma õppisin iga päev.", en: "I studied every day." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
