import type { SceneSpec } from "../types";
import { COMMON, HELLOS, CLOSING_WORDS, FAREWELLS } from "./shared";

const PARENTS_EVENING: SceneSpec = {
  id: "lastevanemad",
  title: "Talking to your child's teacher",
  place: "Your child's classroom, after school",
  tests: "haridus",
  /*
    `haridus` for marks, the subject and what is taught, which is the claim it
    tests. `inimsuhted` for how your child gets on with the others, `inimesed`
    for your son or daughter, `kool-ja-keel` for reading, mistakes and
    practising, `iseloom` for how the teacher describes them, `tunded` for how
    they seem at home, `iga-paev` for every day, and `omadussonad` for slowly.
    It sits on `keskkond`, the last free B1 evening.

    `teie`, because a parent meeting a teacher at school starts there. The
    brief asked for the register to be dealt by the teacher's age, and the
    machine holds one register per scene (`SceneSpec.register`), so what a run
    can deal instead is the teacher switching to `sina` partway, which is the
    `other-register` curveball and is exactly what a younger teacher does.

    The child is on the card and is fiction; nothing here is about a real one.
  */
  units: [...COMMON, "haridus", "inimsuhted", "inimesed", "kool-ja-keel", "iseloom", "tunded", "iga-paev", "kodu", "omadussonad"],
  register: "teie",
  role: "This is a role. You've come to talk to your child's teacher about how they're doing at school. Your card says whether it's your son or your daughter, and how they seem at home.",
  props: [
    {
      kind: "word", slot: "child", oneOf: ["poeg", "tütar"],
      says: "Your child.",
    },
    {
      kind: "word", slot: "home", oneOf: ["kurb", "murelik", "vihane"],
      says: "How they seem at home lately.",
    },
  ],
  curveballs: ["other-register", "interrupted", "misheard", "english"],
  beats: [
    {
      id: "greet",
      goal: "Say hello back to the teacher.",
      they: "The teacher says hello and asks you to sit down.",
      move: "greet",
      topic: [...HELLOS],
      needs: [{ kind: "lemma", oneOf: [...HELLOS] }],
      required: true,
      patience: 2,
      shape: "word",
    },
    {
      id: "who",
      goal: "Tell them whose parent you are: say it's about your son or your daughter.",
      they: "They ask whose parent you are.",
      move: "ask",
      topic: ["laps", "ema", "isa"],
      needs: [{ kind: "anyOf", of: [
        { kind: "datum", slot: "child" },
        { kind: "lemma", oneOf: ["laps", "ema", "isa"] },
      ] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "how",
      goal: "They tell you how your child is doing. Ask them one question about it.",
      they: "They say your child is hard-working and friendly, but makes mistakes when writing.",
      answer: "They say the mistakes are small, and that your child is learning well.",
      move: "instruct",
      topic: ["viga", "kirjutama", "hinne"],
      needs: [{ kind: "question" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "home",
      goal: "Tell them how your child seems at home lately.",
      they: "They ask how your child seems at home.",
      feel: "noted",
      move: "ask",
      topic: ["kodu", "tunduma", "tuju"],
      needs: [{ kind: "datum", slot: "home" }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "practise",
      goal: "Say you'll read with them at home every day.",
      they: "They suggest reading together at home, a little every day.",
      move: "instruct",
      topic: ["lugema", "kodu", "päev"],
      /*
        Agreeing to read is the beat, and "Hea mõte", "Kindlasti" and a plain
        thanks are how a parent agrees to a teacher's suggestion.
      */
      needs: [{ kind: "lemma", oneOf: ["lugema", "jah", "hästi", "selge", "hea", "kindlasti", "proovima", "Aitäh!"] }],
      required: true,
      patience: 2,
      shape: "sentence",
    },
    {
      id: "close",
      goal: "Thank them and say goodbye.",
      they: "They thank you for coming, and say goodbye.",
      move: "close",
      topic: [...FAREWELLS],
      needs: [{ kind: "lemma", oneOf: [...CLOSING_WORDS] }],
      required: true,
      patience: 1,
      shape: "word",
    },
  ],
  outcomes: [
    { id: "talked", when: ["greet", "who", "how", "home", "practise", "close"], says: "You asked a follow-up question instead of nodding, said how things are at home, and you know what to practise. That's a parents' evening in Estonian." },
    { id: "talked-thin", when: ["who", "how", "practise"], says: "You heard how your child is doing and what to practise. Saying more about home can come next time." },
    { id: "cut-short", when: ["greet", "who"], says: "The next parent was waiting and the teacher had to stop. That's the evening, not your Estonian." },
    { id: "left", when: [], says: "You left before the talk had properly started. Teachers are used to a quick hello." },
  ],
};

export default PARENTS_EVENING;
