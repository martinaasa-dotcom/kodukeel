import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const RECOMMENDATION: SceneSpec = {
  id: "soovitus",
  title: "Recommending something to a friend",
  place: "A café table, with a friend you haven't seen for a while",
  tests: "vordlemine",
  /*
    `vordlemine` for better and worse, which is the claim it tests. `vaba-aeg`
    for the film and the exhibition, `meedia` for the programme, which is the
    evening this sits on, `kirjeldamine` for what it was like, `kodu` for the
    book, `tingiv` for recommending, `iga-paev` for seeing, and `omadussonad`
    for slowly. `sina`,
    because it is a friend.
  */
  units: [...COMMON, "vaba-aeg", "meedia", "kirjeldamine", "vordlemine", "kodu", "tingiv", "iga-paev", "omadussonad"],
  register: "sina",
  role: "This is a role. You're having coffee with a friend, and you saw something good recently. Your card says what it was.",
  props: [
    {
      kind: "word", slot: "what", oneOf: ["film", "raamat", "saade", "näitus"],
      says: "What you saw or read.",
      means: { saade: "program" },
    },
  ],
  curveballs: ["faster", "interrupted", "contradiction", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to your friend.",
      they: "Your friend sits down and says hello.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "seen",
      goal: "Tell them about something good you saw or read recently.",
      they: "They ask if you've seen anything good lately.",
      move: "ask",
      topic: ["hea", "nägema", "huvitav"],
      needs: [{ kind: "datum", slot: "what" }],
      required: true,
      patience: 3,
      shape: "sentence",
    },
    {
      id: "like",
      goal: "Tell them what it was like: interesting, fun, beautiful.",
      they: "They ask what it was like.",
      feel: "glad",
      move: "ask",
      topic: ["huvitav", "lõbus", "ilus"],
      needs: [{ kind: "lemma", oneOf: ["huvitav", "lõbus", "tore", "ilus", "hea"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "compare",
      goal: "They mention the last one you told them about. Say whether this one is better or worse.",
      they: "They ask whether it's better than the last one you told them about.",
      move: "ask",
      topic: ["parem", "halvem", "eelmine"],
      needs: [{ kind: "lemma", oneOf: ["parem", "halvem", "sarnane", "erinev"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "recommend",
      goal: "Tell them they should definitely see it.",
      they: "They ask whether they should go and see it.",
      move: "ask",
      topic: ["soovitama", "kindlasti", "pidama"],
      needs: [{ kind: "lemma", oneOf: ["soovitama", "kindlasti", "jah", "pidama"] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "close",
      goal: "Say goodbye, and see you soon.",
      they: "They thank you for the tip and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "sold", when: ["greet", "seen", "like", "compare", "recommend", "close"], says: "You said what it was, what it was like, how it compared and that they should go. That's a recommendation in Estonian, and they're going." },
    { id: "sold-thin", when: ["seen", "like", "recommend"], says: "They're going to see it. Comparing it with the last one would have sealed it." },
    { id: "busy", when: ["greet", "seen"], says: "Their phone went and they had to leave. That's them, not your Estonian." },
    { id: "left", when: [], says: "You left before you'd said what it was. Next coffee." },
  ],
};

export default RECOMMENDATION;
