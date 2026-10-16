import type { PickSpec } from "../picks";

/**
 * What a learner may pick to say when a curveball comes up, by curveball id.
 * Shared across scenes because the move is the same at any counter; a scene
 * that needs its own writes it under `hurdle:<id>` in its own file. A line that
 * says "you" is written in both registers and a scene takes its own.
 */
export const curveballPicks: Readonly<Record<string, readonly PickSpec[]>> = {
  "small-talk": [
    { et: "Jah, täna on ilus ilm.", en: "Yes, it's nice weather today." },
    { et: "Jah, täna on külm.", en: "Yes, it's cold today." },
  ],
  misheard: [
    { et: "Ei, mitte see.", en: "No, not that." },
    { et: "Ei, see ei ole õige.", en: "No, that's not right." },
  ],
  english: [
    { et: "Ma saan aru, aitäh.", en: "I understand, thank you." },
    { et: "Jah, selge, aitäh.", en: "Yes, got it, thanks." },
  ],
  interrupted: [
    { et: "Pole midagi.", en: "No problem." },
    { et: "Hästi, pole midagi.", en: "All right, no problem." },
  ],
  faster: [
    { et: "Vabandust, palun rääkige aeglaselt.", en: "Sorry, please speak slowly.", register: "teie" },
    { et: "Palun öelge uuesti.", en: "Please say it again.", register: "teie" },
    { et: "Vabandust, palun räägi aeglaselt.", en: "Sorry, please speak slowly.", register: "sina" },
    { et: "Palun ütle uuesti.", en: "Please say it again.", register: "sina" },
  ],
  "their-order": [
    { et: "Hästi, muidugi.", en: "All right, of course." },
    { et: "Jah, selge.", en: "Yes, got it." },
  ],
  "not-possible": [
    { et: "Millal see on võimalik?", en: "When will it be possible?" },
    { et: "Mida te saate teha?", en: "What can you do?", register: "teie" },
    { et: "Mida sa saad teha?", en: "What can you do?", register: "sina" },
  ],
  "other-register": [
    { et: "Hästi.", en: "All right." },
    { et: "Jah, selge.", en: "Yes, got it." },
  ],
  "wrong-price": [
    { et: "Kui palju see nüüd maksab?", en: "How much is it now?" },
    { et: "Jah, see on hea.", en: "Yes, that's fine." },
  ],
  contradiction: [
    { et: "Ei, see ei ole õige.", en: "No, that's not right." },
    { et: "Vabandust, see ei ole õige.", en: "Sorry, that's not right." },
  ],
  "place-instruction": [
    { et: "Kus see on?", en: "Where is that?" },
    { et: "Vabandust, kus see on?", en: "Sorry, where is that?" },
  ],
  "missing-document": [
    { et: "Ei, mul ei ole seda.", en: "No, I don't have it." },
    { et: "Vabandust, mul seda ei ole.", en: "Sorry, I don't have that." },
  ],
  "slot-gone": [
    { et: "Millal veel saab?", en: "When else is possible?" },
    { et: "Mis aegu teil veel on?", en: "What other times do you have?" },
  ],
};
