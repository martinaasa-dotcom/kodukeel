import type { ScenePicks } from "../picks";

/** What a learner may pick to say in `riidepood`, beat by beat. See `lib/scenes/picks.ts`. */
export const riidepood: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, tere!", en: "Hello, hello!" },
  ],
  want: [
    { et: "Kas teil on minu suuruses {item}?", en: "Do you have a {item} in my size?" },
    { et: "{item} minu suuruses, palun.", en: "A {item} in my size, please." },
  ],
  size: [
    { et: "Suurus {size}.", en: "Size {size}." },
    { et: "Mul on suurus {size}.", en: "I'm a size {size}." },
  ],
  colour: [
    { et: "{colour}, palun.", en: "In {colour}, please." },
    { et: "Kas teil on seda {colour:ESSIVE}?", en: "Do you have it in {colour}?" },
  ],
  proov: [
    { et: "Jah, palun.", en: "Yes, please." },
    { et: "Jah, ma tahaksin proovida.", en: "Yes, I'd like to try it on." },
    { et: "Jah, kus ma saan proovida?", en: "Yes, where can I try it on?" },
  ],
  sobib: [
    { et: "See sobib hästi.", en: "It fits well." },
    { et: "See on natuke suur.", en: "It's a bit big." },
    { et: "See on liiga väike.", en: "It's too small." },
  ],
  hind: [
    { et: "Kui palju see maksab?", en: "How much is it?" },
    { et: "Mis hind on?", en: "What's the price?" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thanks, bye!" },
    { et: "Ma maksan sularahas. Aitäh!", en: "I'll pay in cash. Thanks!" },
  ],
};
