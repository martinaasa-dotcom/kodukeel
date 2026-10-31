import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `b2-monoloog`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const b2Monoloog: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere päevast!", en: "Good afternoon!" },
  ],
  topic: [
    { et: "Olen valmis. Ma räägin jaanipäevast.", en: "I'm ready. I'll talk about Midsummer." },
    { et: "Olen valmis. Ma räägin saunast.", en: "I'm ready. I'll talk about the sauna." },
  ],
  talk: [
    { et: "Jaaniõhtul tehakse lõket ja käiakse saunas. Kes üle lõkke hüppab, sel läheb terve aasta hästi. Ilm on tihti vihmane, aga see on meil juba traditsioon. Minu arvates on see aasta kõige ilusam öö, sest öö on nii valge.", en: "On Midsummer Eve people light a bonfire and go to the sauna. Whoever jumps over the fire has a good year. The weather's often rainy, but that's a tradition by now. I think it's the most beautiful night of the year, because the night is so light." },
    { et: "Eestis käiakse saunas tihti koos perega. Kõigepealt viskad leili, siis vihtled ennast ja lõpuks hüppad järve. Minu arvates on saun parim asi Eestis, sest pärast on keha ja pea puhtad.", en: "In Estonia people often go to the sauna with the family. First you throw water on the stones, then you whisk yourself, and at the end you jump in the lake. I think the sauna is the best thing in Estonia, because afterwards your body and your head are clean." },
  ],
  followup: [
    { et: "Meil jaanipäeva ei ole. Aga suvel on inimesed seal ka palju õues.", en: "We don't have Midsummer. But in summer people spend a lot of time outside there too." },
    { et: "Vähe. Ja kui käiakse, siis mitte koos perega.", en: "Not much. And when they do, it's not with the family." },
  ],
  swap: [
    { et: "Päriselt? Mis aastal see oli?", en: "Really? What year was that?" },
    { et: "Päriselt või? Kuidas see oli?", en: "Really? What was it like?" },
  ],
  why: [
    { et: "Kuidas nii? Mis siis juhtus?", en: "How come? What happened?" },
    { et: "Kuidas nii?", en: "How come?" },
  ],
  next: [
    { et: "Ja mis siis edasi sai?", en: "And what happened next?" },
    { et: "Päriselt? Mis siis edasi sai?", en: "Really? What happened next?" },
  ],
  laugh: [
    { et: "Mulle teeb nalja, et kui sajab vihma, ütlevad eestlased: ilus ilm. Minu arvates on eesti huumor väga kuiv, aga hea.", en: "It makes me laugh that when it rains, Estonians say: lovely weather. I think Estonian humor is very dry, but good." },
    { et: "Mulle teeb nalja, et saunas räägitakse nii vähe.", en: "It makes me laugh that people talk so little in the sauna." },
  ],
  close: [
    { et: "Aitäh! Nägemist!", en: "Thank you! Goodbye!" },
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
  ],
};
