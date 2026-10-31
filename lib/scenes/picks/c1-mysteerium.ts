import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-mysteerium`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Mysteerium: ScenePicks = {
  greet: [
    { et: "Tere! Jah, täna küsin mina.", en: "Hi! Yes, this evening I'm the one asking." },
    { et: "Tere! Jah, mina.", en: "Hi! Yes, me." },
  ],
  where: [
    { et: "Kus sa olid, kui keegi koka tappis?", en: "Where were you when somebody killed the cook?" },
    { et: "Kus sa terve õhtu olid?", en: "Where were you all evening?" },
  ],
  reference: [
    { et: "Vabandust, ma ei olnud eelmisel aastal siin. Millele sa viitad?", en: "Sorry, I wasn't here last year. What are you referring to?" },
    { et: "Millele sa viitad? Ma ei saa aru.", en: "What are you referring to? I don't follow." },
  ],
  heard: [
    { et: "Keegi olevat näinud köögi akna all kedagi punase mütsiga.", en: "Somebody's supposed to have seen someone in a red hat under the kitchen window." },
    { et: "Kuuldavasti nägi keegi akna all kedagi punase mütsiga.", en: "Word is that somebody saw someone in a red hat under the window." },
  ],
  who: [
    { et: "Ma arvan, et süüdi on Anna, sest tal oli eelmisel aastal punane müts.", en: "I think it was Anna, because she had a red hat last year." },
    { et: "Ma arvan, et sina oled süüdi.", en: "I think you did it." },
  ],
  weapon: [
    { et: "Relv kadus ära, täpselt nagu kook.", en: "The weapon's disappeared, just like the cake." },
    { et: "Relv kadus ära. Ja kook ka!", en: "The weapon's gone. And so is the cake!" },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thanks! Goodbye!" },
    { et: "Aitäh! Nägemist!", en: "Thanks! Bye!" },
  ],
};
