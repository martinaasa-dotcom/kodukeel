import type { ScenePicks } from "../picks";

/**
 * What a learner may pick to say in `kolm-palvet`, beat by beat. See `lib/scenes/picks.ts`.
 *
 * The scene's own register is `sina` and two of its beats are `teie`, so the
 * shared `faster` lines, which a scene takes in its own register, would ask the
 * manager or the official to slow down as a friend. This scene's are worded
 * without a "you" at all, so they are right in front of any of the three.
 */
export const kolmPalvet: ScenePicks = {
  greet: [
    { et: "Tere!", en: "Hi!" },
    { et: "Tere, kuidas läheb?", en: "Hi, how's it going?" },
  ],
  friend: [
    { et: "Kas sa saaksid mind aidata?", en: "Could you help me?" },
    { et: "Kuule, mul on sinu abi vaja.", en: "Listen, I need your help." },
    { et: "Kas sa aitaksid mind ühe asjaga?", en: "Would you help me with something?" },
  ],
  manager: [
    { et: "Kas te saaksite mind aidata?", en: "Could you help me?" },
    { et: "Vabandage, kas te saate mind aidata?", en: "Excuse me, can you help me?" },
    { et: "Kas te aitaksite mind ühe asjaga?", en: "Would you help me with something?" },
  ],
  official: [
    { et: "Tere, kas te saaksite mind palun aidata?", en: "Hello, could you please help me?" },
    { et: "Vabandage, mul oleks teie abi vaja.", en: "Excuse me, I would need your help." },
    { et: "Kas oleks võimalik, et te mind aitaksite?", en: "Would it be possible for you to help me?" },
  ],
  close: [
    { et: "Aitäh, head aega!", en: "Thank you, goodbye!" },
    { et: "Aitäh teile, head päeva!", en: "Thank you, have a good day!" },
    { et: "Suur aitäh, nägemist!", en: "Thank you very much, goodbye!" },
  ],
  "hurdle:faster": [
    { et: "Palun uuesti.", en: "Again, please." },
    { et: "Vabandust, kas saaks uuesti?", en: "Sorry, could you say that again?" },
  ],
};
