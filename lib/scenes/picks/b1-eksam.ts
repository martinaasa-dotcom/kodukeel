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
    { et: "Tere! Ma olen Tom ja ma olen pärit Inglismaalt. Ma elan perega Tallinnas ja töötan programmeerijana.", en: "Hello! I'm Tom, and I'm from England. I live in Tallinn with my family and I work as a programmer." },
    { et: "Ma elan Tallinnas ja töötan ühes väikeses firmas.", en: "I live in Tallinn and I work at a small company." },
  ],
  work: [
    { et: "Mulle meeldib mu töö, sest kolleegid on sõbralikud ja aitavad mind alati. Aga koosolekuid on natuke liiga palju.", en: "I like my job, because my colleagues are friendly and always help me. But there are a few too many meetings." },
    { et: "Mu kolleegid on sõbralikud.", en: "My colleagues are friendly." },
  ],
  choose: [
    { et: "Minu meelest võiksime minna maale, sest seal on suvel ilus ja vaikne.", en: "If you ask me, we could go to the country, because it's beautiful and quiet there in the summer." },
    { et: "Minu meelest võiksime minna metsa.", en: "If you ask me, we could go to the forest." },
  ],
  counter: [
    { et: "Ühest küljest on sul õigus. Aga mis sa arvad, kui me läheksime metsa jalutama?", en: "On the one hand, you're right. But what do you think about going for a walk in the forest?" },
    { et: "Ma ei ole nõus, sest seal on ilus.", en: "I don't agree, because it's beautiful there." },
  ],
  getthere: [
    { et: "Bussiga. See on lihtne ja odav.", en: "By bus. It's easy and cheap." },
    { et: "Bussiga.", en: "By bus." },
  ],
  decided: [
    { et: "Jah, lepime kokku!", en: "Yes, it's a deal!" },
    { et: "Lepime kokku!", en: "It's a deal!" },
  ],
  call: [
    { et: "Tere! Mul on küsimus ujumiskursuse kohta. Millal kursus algab?", en: "Hello! I have a question about the swimming course. When does the course start?" },
    { et: "Millal kursus algab?", en: "When does the course start?" },
  ],
  price: [
    { et: "Ja kui palju see maksab?", en: "And how much does it cost?" },
    { et: "Kui palju see maksab?", en: "How much does it cost?" },
  ],
  thanks: [
    { et: "Aitäh! Siis tulen esmaspäeval.", en: "Thank you! Then I'll come on Monday." },
    { et: "Aitäh!", en: "Thank you!" },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
