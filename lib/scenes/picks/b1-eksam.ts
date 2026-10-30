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
    { et: "Ma olen Tom ja ma olen pärit Inglismaalt. Ma elan perega Tallinnas ja töötan programmeerijana.", en: "I'm Tom, and I'm from England. I live in Tallinn with my family and I work as a programmer." },
    { et: "Ma elan Tallinnas ja töötan ühes väikeses firmas.", en: "I live in Tallinn and I work at a small company." },
  ],
  work: [
    { et: "Mulle meeldib mu töö, sest kolleegid on sõbralikud ja aitavad mind alati. Aga koosolekuid on natuke liiga palju.", en: "I like my job, because my colleagues are friendly and always help me. But there are a few too many meetings." },
    { et: "Mu kolleegid on sõbralikud.", en: "My colleagues are friendly." },
  ],
  lost: [
    { et: "Tere! Ma kaotasin eile bussis oma rahakoti ära. Palun pange mu kaart kohe kinni.", en: "Hello! I lost my wallet on the bus yesterday. Please block my card right away." },
    { et: "Ma kaotasin rahakoti ära.", en: "I've lost my wallet." },
  ],
  card: [
    { et: "Jah, palun. Mida ma pean tegema? Ja millal uus kaart tuleb?", en: "Yes, please. What do I have to do? And when does the new card come?" },
    { et: "Jah, palun.", en: "Yes, please." },
  ],
  form: [
    { et: "Hästi, ma täidan blanketi kohe ära. Aitäh!", en: "All right, I'll fill in the form right away. Thank you!" },
    { et: "Aitäh!", en: "Thank you!" },
  ],
  opinion: [
    { et: "Minu arvates ei ole. Kuigi mul on nüüd parkimisluba, on kesklinnas vähe parkimiskohti. Nii et tööle sõidan ma bussiga.", en: "In my opinion it isn't. Although I've got a parking permit now, there are few parking spaces in the center. So I take the bus to work." },
    { et: "Minu arvates ei ole see lihtne, kuigi mul on parkimisluba.", en: "In my opinion it isn't easy, although I have a parking permit." },
  ],
  compare: [
    { et: "Minu arvates on linnas parem, sest seal on töö ja kool lähedal. Aga maal on vaikne ja ilus, ja seal on rohkem loodust.", en: "In my opinion the city is better, because work and school are close by there. But the country is quiet and beautiful, and there's more nature." },
    { et: "Maal on vaikne ja ilus.", en: "The country is quiet and beautiful." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Nägemist!", en: "See you!" },
  ],
};
