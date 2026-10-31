import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-pidu`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Pidu: ScenePicks = {
  greet: [
    { et: "Tere! Jah, olen küll. Eksam oli täna hommikul.", en: "Hello! Yes, I am. The exam was this morning." },
    { et: "Tere! Jah, olen küll.", en: "Hello! Yes, I am." },
  ],
  how: [
    { et: "Alguses olin närvis, aga siis läks nagu tavaline vestlus.", en: "At first I was nervous, but then it went like an ordinary conversation." },
    { et: "Hästi, aitäh!", en: "Well, thanks!" },
  ],
  hardest: [
    { et: "Kõige raskem oli arutelu. Teine eksaminand ei olnud minuga nõus, aga ma jäin oma arvamuse juurde.", en: "The discussion was the hardest. The other candidate didn't agree with me, but I stuck to my view." },
    { et: "Kõige raskem oli arutelu.", en: "The discussion was the hardest." },
  ],
  english: [
    { et: "Pole hullu. Räägime eesti keeles, aeglaselt. Ma aitan sind.", en: "No problem. Let's speak Estonian, slowly. I'll help you." },
    { et: "Räägime eesti keeles edasi. Ma aitan.", en: "Let's carry on in Estonian. I'll help." },
  ],
  giveup: [
    { et: "Selles on sul õigus, paljud räägivad inglise keelt. Aga eesti keeles saad sa siin päriselt elada.", en: "You've got a point there, lots of people speak English. But in Estonian you can really live here." },
    { et: "Selles on sul õigus, aga eesti keel on seda väärt.", en: "You've got a point there, but Estonian is worth it." },
  ],
  advice: [
    { et: "Räägi iga päev eesti keelt ja ära karda vigu. Ja kui keegi läheb inglise keelele üle, palu, et ta räägiks eesti keeles edasi.", en: "Speak Estonian every day, and don't be afraid of mistakes. And if somebody switches to English, ask them to carry on in Estonian." },
    { et: "Räägi iga päev eesti keelt ja ära karda vigu.", en: "Speak Estonian every day, and don't be afraid of mistakes." },
  ],
  close: [
    { et: "Kõike head! Terviseks!", en: "All the best! Cheers!" },
    { et: "Aitäh! Head aega!", en: "Thanks! Goodbye!" },
  ],
};
