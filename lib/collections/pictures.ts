/**
 * SIXTEEN PICTURES TO WRITE ABOUT, MADE OF EMOJI.
 *
 * "Say what you see" is the writing part of the state examination in
 * miniature: look at a scene and write five sentences about what is in it and
 * what might be going on. The examination uses drawings. This app has no
 * artist yet and a generated picture is a licence question nobody here can
 * answer, so a picture is a scene laid out in emoji: characters drawn by the
 * reader's own font, so nothing ships and no licence is carried. When there is
 * money for an Estonian illustrator these sixteen are the briefs.
 *
 * SIXTEEN AND NOT AN ENDLESS SUPPLY, on purpose. Each is composed to be rich
 * enough for five different sentences (people, things, a place and something
 * happening), which a random draw of three nouns never was, and a learner who
 * meets the same one twice writes five new sentences about it. A round is two
 * or three of them, because writing five sentences is the tiring part.
 *
 * WHAT IS AUTHORED AND WHAT IS NOT. The title is English, which is the one
 * language this project may write. The things are **requests** against the
 * dictionary, exactly as a syllabus unit's lemmas are: a lemma named here
 * asks whether the dictionary has the word, `pictures.test.ts` fails on one it
 * does not hold, and the marking reads every form of it off the dictionary.
 * The one Estonian sentence per picture is the example shown before the
 * learner writes, so they know what kind of sentence is wanted. It is an
 * authored sentence in the sense `lib/dict/authored.ts` is (ADR-005
 * amendment 4): drafted, held to a mechanical rule, and read by the native
 * Estonian speaker who develops this app in the pull request that changes it.
 * The rule is that every word of it is one the forms list vouches for, and
 * it is asserted. It is never a card answer, an exam answer or a marking
 * target: it is shown, once, as a model.
 *
 * Ids are English slugs and are keys: renaming one orphans nothing today and
 * should stay that way.
 *
 * Pure. No React, no Prisma, no clock.
 */

export interface PictureThing {
  /** The character as it is drawn in the scene. */
  readonly emoji: string;
  /** A request against the dictionary: the word for it. */
  readonly lemma: string;
  /**
   * The one sense the picture shows, where the dictionary's gloss lists more
   * than one and the others would be wrong under it: a road is `tee`, and
   * "road, tea" printed under a road is a cup of tea on the motorway. It may
   * only narrow, so it is always a sense the gloss already gives, word for
   * word (`pictures.test.ts`). English, never Estonian.
   */
  readonly means?: string;
}

export interface Picture {
  readonly id: string;
  /** What is going on, in English. */
  readonly title: string;
  /** The scene, a row of emoji at a time. Spaces separate the characters. */
  readonly rows: readonly string[];
  /**
   * What is drawn, in English, for a reader who cannot see it. An emoji
   * carries its meaning to a sighted reader without a word of text, so the
   * same information has to reach everybody else in the same place. It names
   * things in English, which is parity and not a giveaway: the exercise is
   * the Estonian.
   */
  readonly alt: string;
  /** What in it has a word, for checking that a sentence is about the picture. */
  readonly things: readonly PictureThing[];
  /** A model sentence about this picture, and what it says. */
  readonly example: { readonly et: string; readonly en: string };
}

export const PICTURES: readonly Picture[] = [
  {
    id: "birthday",
    alt: "Balloons and streamers over a girl, a boy and a child, with a birthday cake, a gift and a drink.",
    title: "A birthday party",
    rows: ["🎈 🎉 🎈", "👧 🎂 👦", "🎁 🧒 🥤"],
    things: [
      { emoji: "🎂", lemma: "sünnipäevatort" }, { emoji: "🎈", lemma: "õhupall" },
      { emoji: "👧", lemma: "tüdruk" }, { emoji: "👦", lemma: "poiss" },
      { emoji: "🧒", lemma: "laps" }, { emoji: "🎁", lemma: "kink" },
      { emoji: "🎉", lemma: "pidu" }, { emoji: "🥤", lemma: "jook" },
    ],
    example: { et: "Tüdruk ja poiss söövad sünnipäevatorti.", en: "The girl and the boy are eating birthday cake." },
  },
  {
    id: "beach",
    alt: "A sunny beach with palm trees and waves, a woman and a child with a watermelon, a crab, a shell and sunglasses.",
    title: "A day at the beach",
    rows: ["☀️ 🌴 ☀️", "🌊 🏖️ 🌊", "👩 🧒 🍉", "🦀 🐚 🕶️"],
    things: [
      { emoji: "☀️", lemma: "päike" }, { emoji: "🌊", lemma: "laine" },
      { emoji: "🏖️", lemma: "rand" }, { emoji: "👩", lemma: "naine", means: "woman" },
      { emoji: "🧒", lemma: "laps" }, { emoji: "🍉", lemma: "arbuus" },
      { emoji: "🦀", lemma: "krabi" }, { emoji: "🕶️", lemma: "päikeseprillid" },
    ],
    example: { et: "Päike paistab ja naine on rannas.", en: "The sun is shining and the woman is on the beach." },
  },
  {
    id: "market",
    alt: "A market stall of carrots, tomatoes, onions, potatoes, apples and pears, with bread, cheese and fish, a basket, a woman and a man.",
    title: "At the market",
    rows: ["🥕 🍅 🧅", "🥔 🍎 🍐", "👩 🧺 👨", "🥖 🧀 🐟"],
    things: [
      { emoji: "🥕", lemma: "porgand" }, { emoji: "🍅", lemma: "tomat" },
      { emoji: "🧅", lemma: "sibul" }, { emoji: "🥔", lemma: "kartul" },
      { emoji: "🍎", lemma: "õun" }, { emoji: "🍐", lemma: "pirn" },
      { emoji: "👩", lemma: "naine", means: "woman" }, { emoji: "👨", lemma: "mees", means: "man" },
      { emoji: "🧺", lemma: "korv" }, { emoji: "🧀", lemma: "juust" },
      { emoji: "🐟", lemma: "kala" },
    ],
    example: { et: "Naine ostab turul tomateid ja porgandeid.", en: "The woman is buying tomatoes and carrots at the market." },
  },
  {
    id: "winter",
    alt: "A snowy day with fir trees, a snowman, two children, a dog, a scarf, gloves and a hot drink.",
    title: "A winter day",
    rows: ["❄️ 🌲 ❄️ 🌲", "⛄ 🧒 🧒 🐕", "🧣 🧤 ☕"],
    things: [
      { emoji: "❄️", lemma: "lumi" }, { emoji: "🌲", lemma: "kuusk", means: "spruce" },
      { emoji: "⛄", lemma: "lumememm" }, { emoji: "🧒", lemma: "laps" },
      { emoji: "🐕", lemma: "koer" }, { emoji: "🧣", lemma: "sall" },
      { emoji: "☕", lemma: "kohv" },
    ],
    example: { et: "Lapsed mängivad lumes.", en: "The children are playing in the snow." },
  },
  {
    id: "kitchen",
    alt: "A kitchen with a frying pan, an egg and salt, a woman with a knife and a carrot, and a pot of soup, bread and a spoon.",
    title: "In the kitchen",
    rows: ["🍳 🥚 🧂", "👩 🔪 🥕", "🍲 🍞 🥄"],
    things: [
      { emoji: "🍳", lemma: "pann" }, { emoji: "🥚", lemma: "muna" },
      { emoji: "🧂", lemma: "sool" }, { emoji: "👩", lemma: "naine", means: "woman" },
      { emoji: "🔪", lemma: "nuga" }, { emoji: "🥕", lemma: "porgand" },
      { emoji: "🍲", lemma: "supp" }, { emoji: "🍞", lemma: "sai" },
      { emoji: "🥄", lemma: "lusikas" },
    ],
    example: { et: "Naine lõikab noaga porgandit.", en: "The woman is cutting a carrot with a knife." },
  },
  {
    id: "station",
    alt: "A railway station with trains, a suitcase, a man, a woman and a child, a ticket, a clock and a bus.",
    title: "At the station",
    rows: ["🚉 🚆 🚆", "🧳 👨 👩 🧒", "🎫 🕐 🚌"],
    things: [
      { emoji: "🚉", lemma: "jaam" }, { emoji: "🚆", lemma: "rong" },
      { emoji: "🧳", lemma: "kohver" }, { emoji: "👨", lemma: "mees", means: "man" },
      { emoji: "👩", lemma: "naine", means: "woman" }, { emoji: "🧒", lemma: "laps" },
      { emoji: "🎫", lemma: "pilet" }, { emoji: "🕐", lemma: "kell", means: "clock" },
      { emoji: "🚌", lemma: "buss" },
    ],
    example: { et: "Mees ootab jaamas rongi.", en: "The man is waiting for the train at the station." },
  },
  {
    id: "farm",
    alt: "A farm with a cow, a pig, a sheep, a rooster, a horse and a dog, a tractor, a field of wheat, a farmhouse, a farmer, the sun and a tree.",
    title: "On the farm",
    rows: ["🐄 🐖 🐑", "🐓 🐎 🐕", "🚜 🌾 🏡", "👨 ☀️ 🌳"],
    things: [
      { emoji: "🐄", lemma: "lehm" }, { emoji: "🐖", lemma: "siga" },
      { emoji: "🐑", lemma: "lammas" }, { emoji: "🐓", lemma: "kukk", means: "rooster" },
      { emoji: "🐎", lemma: "hobune" }, { emoji: "🐕", lemma: "koer" },
      { emoji: "🚜", lemma: "traktor" }, { emoji: "🌾", lemma: "nisu" },
      { emoji: "🏡", lemma: "maja" }, { emoji: "👨", lemma: "mees", means: "man" },
      { emoji: "☀️", lemma: "päike" }, { emoji: "🌳", lemma: "puu" },
    ],
    example: { et: "Hobune ja lehm on karjamaal.", en: "The horse and the cow are in the pasture." },
  },
  {
    id: "classroom",
    alt: "A school classroom with books, a pencil, a teacher, three pupils, a notebook, a school bag and a clock.",
    title: "In the classroom",
    rows: ["🏫 📚 ✏️", "👩 🧒 👧 👦", "📓 🎒 🕐"],
    things: [
      { emoji: "🏫", lemma: "kool" }, { emoji: "📚", lemma: "raamat" },
      { emoji: "✏️", lemma: "pliiats" }, { emoji: "👩", lemma: "õpetaja" },
      { emoji: "👧", lemma: "tüdruk" }, { emoji: "👦", lemma: "poiss" },
      { emoji: "🧒", lemma: "laps" }, { emoji: "📓", lemma: "vihik" },
      { emoji: "🕐", lemma: "kell", means: "clock" },
    ],
    example: { et: "Tüdruk kirjutab vihikusse.", en: "The girl is writing in a notebook." },
  },
  {
    id: "forest",
    alt: "A forest with fir trees, a mushroom, a squirrel, a deer, a bird, a bear and a fox, a tent, a campfire and a compass.",
    title: "In the forest",
    rows: ["🌲 🍄 🐿️ 🌲", "🦌 🐦 🐻 🦊", "⛺ 🔥 🧭"],
    things: [
      { emoji: "🌲", lemma: "mets" }, { emoji: "🍄", lemma: "seen" },
      { emoji: "🐿️", lemma: "orav" }, { emoji: "🦌", lemma: "hirv" },
      { emoji: "🐦", lemma: "lind" }, { emoji: "🐻", lemma: "karu" },
      { emoji: "🦊", lemma: "rebane" }, { emoji: "⛺", lemma: "telk" },
      { emoji: "🔥", lemma: "tuli" }, { emoji: "🧭", lemma: "kompass" },
    ],
    example: { et: "Karu ja hirv on metsas.", en: "The bear and the deer are in the forest." },
  },
  {
    id: "cafe",
    alt: "A café with coffee, cake and a croissant, a woman and a man at a table, a book, a drink and a window.",
    title: "At a café",
    rows: ["☕ 🍰 🥐", "👩 🪑 👨", "📖 🥤 🪟"],
    things: [
      { emoji: "☕", lemma: "kohv" }, { emoji: "🍰", lemma: "kook" },
      { emoji: "🥐", lemma: "saiake" }, { emoji: "👩", lemma: "naine", means: "woman" },
      { emoji: "👨", lemma: "mees", means: "man" }, { emoji: "🪑", lemma: "tool" },
      { emoji: "📖", lemma: "raamat" }, { emoji: "🥤", lemma: "jook" },
      { emoji: "🪟", lemma: "aken" },
    ],
    example: { et: "Naine joob kohvi ja sööb kooki.", en: "The woman is drinking coffee and eating cake." },
  },
  {
    id: "rain",
    alt: "A rainy street with an umbrella, tall buildings, a taxi and a bus, a traffic light, a woman in a coat and a rainbow.",
    title: "A rainy day in town",
    rows: ["🌧️ ☂️ 🌧️", "🏢 🚕 🚌", "🚦 👩 🧥 🌈"],
    things: [
      { emoji: "🌧️", lemma: "vihm" }, { emoji: "☂️", lemma: "vihmavari" },
      { emoji: "🏢", lemma: "maja" }, { emoji: "🚕", lemma: "takso" },
      { emoji: "🚌", lemma: "buss" }, { emoji: "🚦", lemma: "foor" },
      { emoji: "👩", lemma: "naine", means: "woman" }, { emoji: "🧥", lemma: "mantel" },
      { emoji: "🌈", lemma: "vikerkaar" },
    ],
    example: { et: "Sajab vihma ja naine kannab mantlit.", en: "It is raining and the woman is wearing a coat." },
  },
  {
    id: "garden",
    alt: "A garden with tulips, sunflowers and roses, a tree, a bee and a butterfly, a house, a person and a cat.",
    title: "In the garden",
    rows: ["🌷 🌻 🌹", "🌳 🐝 🦋", "🏠 🧑 🐈"],
    things: [
      { emoji: "🌷", lemma: "tulp" }, { emoji: "🌻", lemma: "päevalill" },
      { emoji: "🌹", lemma: "roos" }, { emoji: "🌳", lemma: "puu" },
      { emoji: "🐝", lemma: "mesilane" }, { emoji: "🦋", lemma: "liblikas" },
      { emoji: "🏠", lemma: "maja" }, { emoji: "🧑", lemma: "isik" },
      { emoji: "🐈", lemma: "kass" },
    ],
    example: { et: "Kass istub puu all.", en: "The cat is sitting under the tree." },
  },
  /*
    FOUR THAT ARE SILLY ON PURPOSE. A cow in the sauna is still a cow and a
    sauna, so every word is as useful as a farm's, and a picture that makes
    somebody smile is a picture they write five sentences about without
    noticing. The round already says any story they invent is fine, and these
    four are the invitation (docs/18-voice.md, section 3c).
  */
  {
    id: "sauna-cow",
    alt: "A cow sitting in a steamy sauna, with a bucket of water, a sauna whisk, a fire, a carton of juice, a basket and a spruce tree outside.",
    title: "A cow at the sauna",
    rows: ["🧖 🐄 💦", "🪣 🌿 🔥", "🧃 🌲 🧺"],
    things: [
      { emoji: "🐄", lemma: "lehm" }, { emoji: "🧖", lemma: "saun" },
      { emoji: "💦", lemma: "vesi" }, { emoji: "🪣", lemma: "ämber" },
      { emoji: "🌿", lemma: "viht" }, { emoji: "🔥", lemma: "tuli" },
      { emoji: "🧃", lemma: "mahl" }, { emoji: "🌲", lemma: "kuusk", means: "spruce" },
      { emoji: "🧺", lemma: "korv" },
    ],
    example: { et: "Lehm istub saunas ja joob mahla.", en: "The cow is sitting in the sauna, drinking juice." },
  },
  {
    id: "cat-driver",
    alt: "A cat driving a car past a traffic light, with a dog running after it, a road, a tree, a house and a chequered flag.",
    title: "A cat at the wheel",
    rows: ["🐈 🚗 💨", "🚦 🐕 🛣️", "🌳 🏠 🏁"],
    things: [
      { emoji: "🐈", lemma: "kass" }, { emoji: "🚗", lemma: "auto" },
      { emoji: "🚦", lemma: "foor" }, { emoji: "🐕", lemma: "koer" },
      { emoji: "🛣️", lemma: "tee", means: "road" }, { emoji: "🌳", lemma: "puu" },
      { emoji: "🏠", lemma: "maja" }, { emoji: "🏁", lemma: "lipp" },
    ],
    example: { et: "Kass sõidab autoga ja koer jookseb talle järele.", en: "The cat is driving the car and the dog is running after it." },
  },
  {
    id: "dog-office",
    alt: "A dog at a desk with a laptop and a cup of coffee, a phone, a printer and a calendar, a man and a woman watching, and a pot plant.",
    title: "A dog at the office",
    rows: ["🐕 💻 ☕", "📞 🖨️ 📅", "👨 👩 🪴"],
    things: [
      { emoji: "🐕", lemma: "koer" }, { emoji: "💻", lemma: "arvuti" },
      { emoji: "☕", lemma: "kohv" }, { emoji: "📞", lemma: "telefon" },
      { emoji: "🖨️", lemma: "printer" }, { emoji: "📅", lemma: "kalender" },
      { emoji: "👨", lemma: "mees", means: "man" }, { emoji: "👩", lemma: "naine", means: "woman" },
      { emoji: "🪴", lemma: "taim" },
    ],
    example: { et: "Koer töötab arvutiga ja joob kohvi.", en: "The dog is working on the computer and drinking coffee." },
  },
  {
    id: "bear-shop",
    alt: "A bear pushing a shopping trolley with honey, bread, milk and cheese, a shop assistant, a receipt and some money.",
    title: "A bear doing the shopping",
    rows: ["🐻 🛒 🍯", "🍞 🥛 🧀", "👩 🧾 💶"],
    things: [
      { emoji: "🐻", lemma: "karu" }, { emoji: "🛒", lemma: "ostukäru" },
      { emoji: "🍯", lemma: "mesi" }, { emoji: "🍞", lemma: "sai" },
      { emoji: "🥛", lemma: "piim" }, { emoji: "🧀", lemma: "juust" },
      { emoji: "👩", lemma: "naine", means: "woman" }, { emoji: "🧾", lemma: "kviitung", means: "receipt" },
      { emoji: "💶", lemma: "raha" },
    ],
    example: { et: "Karu ostab poest mett ja saia.", en: "The bear is buying honey and bread at the shop." },
  },
];

/** Every word any picture asks the dictionary about, once. */
export const PICTURE_LEMMAS: readonly string[] =
  [...new Set(PICTURES.flatMap((p) => p.things.map((t) => t.lemma)))].sort((a, b) => a.localeCompare(b, "et"));

export function pictureById(id: string): Picture | undefined {
  return PICTURES.find((p) => p.id === id);
}

/** How many pictures a round shows: writing five sentences is the tiring part. */
export function roundSize(level: string): number {
  return level === "A1" || level === "A2" || level === "pre-A1" ? 2 : 3;
}

/** How many sentences each picture asks for. */
export const SENTENCES_PER_PICTURE = 5;
