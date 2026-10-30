import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `eksam-b2`, beat by beat. See `lib/scenes/picks.ts`. */
export const eksamB2: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  work: [
    { et: "Ma töötan ühes firmas.", en: "I work at a company." },
    { et: "Ma õpin ülikoolis.", en: "I study at university." },
    { et: "Ma töötan meeskonnas, kus on kümme inimest.", en: "I work in a team of ten people." },
  ],
  like: [
    { et: "Mulle meeldib see töö.", en: "I like the work." },
    { et: "Sest töö on huvitav ja iga päev on erinev.", en: "Because the work is interesting and every day is different." },
    { et: "Mulle meeldivad mu kolleegid, meil on hea meeskond.", en: "I like my colleagues, we have a good team." },
  ],
  side: [
    { et: "Jah, kindlasti.", en: "Yes, definitely." },
    { et: "Ma arvan, et neli päeva nädalas oleks õige.", en: "I think four days a week would be right." },
    { et: "Ei, ma ei usu, et see töötaks.", en: "No, I don't think it would work." },
  ],
  reason: [
    { et: "Sest siis on rohkem aega perele.", en: "Because then there's more time for family." },
    { et: "Inimesed oleksid vähem väsinud.", en: "People would be less tired." },
    { et: "Sest tööd on sama palju, aga aega on vähem.", en: "Because there's the same amount of work, but less time." },
  ],
  counter: [
    { et: "Osaliselt olen nõus, aga mitte kõiges.", en: "I partly agree, but not with everything." },
    { et: "See pole lihtne, aga ma arvan ikka sama.", en: "It isn't simple, but I still think the same." },
    { et: "Ma saan aru, aga minu põhjus on ikka sama.", en: "I understand, but my reason is still the same." },
  ],
  decide: [
    { et: "Jah, võiks proovida.", en: "Yes, it's worth a try." },
    { et: "Kokkuvõttes on see hea, aga mitte igale firmale.", en: "All in all it's good, but not for every company." },
    { et: "Teeme siis kompromissi ja proovime.", en: "So let's meet halfway and give it a try." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Aitäh teile!", en: "Thank you!" },
    { et: "Suur aitäh, nägemist!", en: "Thank you very much, goodbye!" },
  ],
};
