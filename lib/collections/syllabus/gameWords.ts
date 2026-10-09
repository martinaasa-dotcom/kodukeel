/**
 * The words a game needs and no unit teaches.
 *
 * Twenty questions answers about a few hundred things and has to read the
 * questions a learner asks about them, so it needs words a course would teach
 * late or never: a toy, outer space, a reptile, electric. The dictionary held
 * none of those, and a question built on one came back as a word the game did
 * not know, which is the commonest reason a round answered "Ei tea".
 *
 * Same standing as `retired.ts`: a request list in a unit's shape, with the
 * level a learner is likely to meet the word at, read by the harvest beside
 * the units, and Ekilex decides whether each one exists. Not a unit, so no
 * screen lists it and no card is built from it unasked.
 */
import type { Level } from "./types";
import type { Pos } from "./types";

export type GameWord = readonly [lemma: string, gloss: string, pos: Pos, level: Level];

export const GAME_WORDS: readonly GameWord[] = [
  // Kinds of thing.
  ["elusolend", "living being", "NOUN", "B1"],
  ["metsloom", "wild animal", "NOUN", "A2"],
  ["kiskja", "predator", "NOUN", "B1"],
  ["roomaja", "reptile", "NOUN", "B1"],
  ["mänguasi", "toy", "NOUN", "A1"],
  ["maiustus", "sweet, treat", "NOUN", "A2"],
  ["materjal", "material", "NOUN", "A2"],
  ["kosmos", "outer space", "NOUN", "A2"],
  ["Aafrika", "Africa", "NOUN", "A2"],
  // Parts.
  ["soomus", "scale (of a fish or a snake)", "NOUN", "B1"],
  ["küünis", "claw", "NOUN", "B1"],
  ["lont", "trunk (of an elephant)", "NOUN", "B1"],
  ["mootor", "engine, motor", "NOUN", "A2"],
  ["käepide", "handle", "NOUN", "B1"],
  // Materials.
  ["kangas", "fabric, cloth", "NOUN", "A2"],
  ["plastik", "plastic", "NOUN", "A2"],
  // Things to be thinking of.
  ["krokodill", "crocodile", "NOUN", "A2"],
  ["kaelkirjak", "giraffe", "NOUN", "A2"],
  ["kaktus", "cactus", "NOUN", "A2"],
  ["mänd", "pine", "NOUN", "A2"],
  ["pitsa", "pizza", "NOUN", "A1"],
  ["küpsis", "biscuit, cookie", "NOUN", "A1"],
  ["jogurt", "yoghurt", "NOUN", "A1"],
  ["melon", "melon", "NOUN", "A2"],
  ["kardin", "curtain", "NOUN", "A2"],
  ["tekk", "blanket, duvet", "NOUN", "A2"],
  ["rahakott", "wallet, purse", "NOUN", "A2"],
  ["seljakott", "backpack", "NOUN", "A2"],
  ["kelk", "sledge, sled", "NOUN", "A2"],
  ["suusk", "ski", "NOUN", "A2"],
  ["pusle", "jigsaw puzzle", "NOUN", "A2"],
  ["trumm", "drum", "NOUN", "A2"],
  ["trompet", "trumpet", "NOUN", "B1"],
  ["rakett", "rocket", "NOUN", "B1"],
  ["kaisukaru", "teddy bear", "NOUN", "A2"],
  ["limonaad", "lemonade", "NOUN", "A2"],
  ["tahvelarvuti", "tablet computer", "NOUN", "B1"],
  // Describing words.
  ["elektriline", "electric", "ADJECTIVE", "A2"],
  ["ümmargune", "round", "ADJECTIVE", "A2"],
  ["kandiline", "square, angular", "ADJECTIVE", "B1"],
  ["värviline", "colourful", "ADJECTIVE", "A2"],
  ["mitmevärviline", "multicoloured", "ADJECTIVE", "B1"],
  ["läbipaistev", "transparent", "ADJECTIVE", "B1"],
  ["lärmakas", "noisy", "ADJECTIVE", "B1"],
  ["vali", "loud", "ADJECTIVE", "A2"],
  // What it does.
  ["ronima", "to climb", "VERB", "A2"],
  ["roomama", "to crawl", "VERB", "B1"],
  ["helendama", "to glow", "VERB", "B2"],
  ["hammustama", "to bite", "VERB", "A2"],
  ["munema", "to lay eggs", "VERB", "B1"],
  ["esinema", "to occur, to appear", "VERB", "B1"],
  ["kõikjal", "everywhere", "ADVERB", "A2"],
];
