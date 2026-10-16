import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `kaebus`, beat by beat. See `lib/scenes/picks.ts`. */
export const kaebus: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hello!" },
    { et: "Tere, mul on üks probleem.", en: "Hello, I have a problem." },
  ],
  problem: [
    { et: "{item} on katki.", en: "The {item} is broken." },
    { et: "{item:COMITATIVE} on probleem.", en: "There's a problem with the {item}." },
    { et: "Ma ostsin siit {item:GENITIVE}, aga see on juba katki.", en: "I bought a {item} here, but it's already broken." },
  ],
  when: [
    { et: "{bought:ADESSIVE}.", en: "On {bought}." },
    { et: "Ma ostsin selle {bought:ADESSIVE}.", en: "I bought it on {bought}." },
    { et: "Eelmisel nädalal, {bought:ADESSIVE}.", en: "Last week, on {bought}." },
  ],
  receipt: [
    { et: "Jah, siin.", en: "Yes, here." },
    { et: "Jah, tšekk on mul kaasas.", en: "Yes, I've got the receipt with me." },
    { et: "Ei, kahjuks mitte.", en: "No, unfortunately not." },
  ],
  want: [
    { et: "Ma tahan raha tagasi.", en: "I'd like my money back." },
    { et: "Palun parandage see ära.", en: "Please repair it." },
    { et: "Kas ma saan uue?", en: "Can I get a new one?" },
  ],
  insist: [
    { et: "Mida te siis saate teha?", en: "Then what can you do?" },
    { et: "Kas on mõni teine lahendus?", en: "Is there another solution?" },
    { et: "Siis ma tahaksin esitada kaebuse.", en: "Then I'd like to make a complaint." },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Hästi, aitäh!", en: "All right, thank you!" },
  ],
};
