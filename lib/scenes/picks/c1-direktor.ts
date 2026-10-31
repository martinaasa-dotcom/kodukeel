import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-direktor`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Direktor: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, aitäh!", en: "Hello, thank you!" },
  ],
  what: [
    { et: "Aitäh, et leidsite aega. Meie poeg jääb juba mitu nädalat vahetundides kõrvale.", en: "Thank you for finding the time. Our son has been left out at break for several weeks now." },
    { et: "Meie poeg on vahetunnis juba mitu nädalat üksi.", en: "Our son has been on his own at break for several weeks now." },
  ],
  disagree: [
    { et: "Ma saan aru, aga ma ei ole sellega päris nõus. See on kestnud juba mitu nädalat.", en: "I understand, but I don't quite agree. It's been going on for several weeks now." },
    { et: "Ma saan aru, aga ise see üle ei lähe.", en: "I understand, but it won't go away by itself." },
  ],
  notask: [
    { et: "Seda me ei palu. Me palume, et kool aitaks neil koos midagi teha.", en: "That's not what we're asking. We're asking the school to help them do things together." },
    { et: "Me ei palu kedagi sundida. Palume, et kool aitaks.", en: "We're not asking you to force anybody. We're asking the school to help." },
  ],
  exactly: [
    { et: "Sooviksime, et vahetunnis oleks mänge, kus kõik saavad kaasa teha.", en: "We would like there to be games at break that everybody can join in." },
    { et: "Palume, et kooli psühholoog räägiks meie pojaga.", en: "We ask that the school psychologist talk to our son." },
  ],
  parents: [
    { et: "Ma arvan, et seda ei ole vaja. Aitab, kui õpetaja räägib kahe poisiga.", en: "I don't think there's any need. It's enough if the teacher talks to the two boys." },
    { et: "Ei, seda ei ole vaja.", en: "No, there's no need." },
  ],
  close: [
    { et: "Väga hea, nii teeme. Aitäh! Head aega!", en: "Very good, let's do that. Thank you! Goodbye!" },
    { et: "Aitäh teile! Nägemist!", en: "Thank you! Goodbye!" },
  ],
};
