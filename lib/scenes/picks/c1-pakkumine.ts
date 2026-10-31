import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `c1-pakkumine`, beat by beat. See `lib/scenes/picks.ts`.
 * Most are the lesson's own role-play answers, which the native speaker reads; every word is one
 * the lessons have taught by this scene's lesson, which `lessonScenes.test.ts` asserts.
 */
export const c1Pakkumine: ScenePicks = {
  offer: [
    { et: "Arvestades ülevaatuse tulemusi, ei saa me nii palju pakkuda.", en: "Given what the survey found, we can't offer that much." },
    { et: "See hind on liiga kõrge, arvestades ülevaatuse tulemusi.", en: "That price is too high, given what the survey found." },
  ],
  survey: [
    { et: "Katus laseb vett läbi ja kelder on niiske. Remont maksab umbes kaheksa tuhat eurot.", en: "The roof lets water through and the cellar is damp. The repairs come to about eight thousand euros." },
    { et: "Keldris on hallitus ja katus laseb vett läbi.", en: "There's mold in the cellar, and the roof lets water through." },
  ],
  number: [
    { et: "Vaatamata uuele köögile on maja vana. Me pakume 230 000.", en: "Despite the new kitchen, the building is old. We're offering 230,000." },
    { et: "Köök on küll uus, aga maja on vana. Me pakume 230 000.", en: "The kitchen is new, it's true, but the building is old. We're offering 230,000." },
  ],
  another: [
    { et: "Selle asemel, et hinda alandada, võib müüja keldri enne lepingut korda teha.", en: "Instead of lowering the price, the seller could have the cellar put right before the contract." },
    { et: "Siis laske kelder enne lepingut korda teha.", en: "Then have the cellar put right before the contract." },
  ],
  hold: [
    { et: "Ei. Meie pakkumine on 230 000 ja see on meie viimane hind.", en: "No. Our offer is 230,000, and that's our last price." },
    { et: "Ei, see on meie viimane hind.", en: "No, that's our last price." },
  ],
  notary: [
    { et: "On. Kui müüja on nõus, kirjutame lepingule kohe notari juures alla.", en: "It is. If the seller agrees, we'll sign the contract at the notary's straight away." },
    { et: "Jah. Kui müüja on nõus, sõlmime lepingu kohe.", en: "Yes. If the seller agrees, we'll sign the contract straight away." },
  ],
  close: [
    { et: "Aitäh! Head aega!", en: "Thank you! Goodbye!" },
    { et: "Väga hea uudis, aitäh! Head aega!", en: "Very good news, thank you! Goodbye!" },
  ],
};
