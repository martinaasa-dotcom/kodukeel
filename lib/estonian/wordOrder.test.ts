import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaryRows } from "../../scripts/lib/dictionary";
import { isKnownForm } from "../dict/forms";
import { sentenceTiles } from "./cloze";
import {
  acceptedOrders, alsoRightOrders, orderIsRight, BOUND_PARTICLES, CLAUSE_JOINERS, FOCUS_PARTICLES,
  FREE_PARTICLES, MOBILE_ADVERBS, orderContextFrom, readOrder, sentenceClauses,
} from "./wordOrder";

const ROWS = dictionaryRows();
const DICT = orderContextFrom(ROWS);

const tiles = (s: string) => sentenceTiles(s);

describe("readOrder", () => {
  const reported = "Muidugi tuleb ette näpukaid.";

  it("takes the order the writer chose", () => {
    const v = readOrder(tiles(reported), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("exact");
  });

  /*
    The report this module was written for. A learner rebuilt the app's own
    first-unit sentence the way anybody says it and was told it was not the
    order Estonian uses.
  */
  it("takes the particle at the end of the clause", () => {
    const v = readOrder(tiles("Muidugi tuleb näpukaid ette"), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("variant");
    // The particle that moved, not the word that shifted into its place.
    expect(v.moved).toBe("ette");
  });

  it("still refuses an order Estonian does not use", () => {
    const v = readOrder(tiles("Näpukaid ette tuleb muidugi"), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("wrong");
  });

  it("ignores case and punctuation, as the exact reading always did", () => {
    const v = readOrder(tiles("muidugi tuleb ette näpukaid"), reported, alsoRightOrders(reported, DICT));
    expect(v.reading).toBe("exact");
  });

  it("refuses a sentence that is short of a word", () => {
    expect(readOrder(tiles("Muidugi tuleb ette"), reported, alsoRightOrders(reported, DICT)).reading)
      .toBe("wrong");
  });
});

describe("what it refuses", () => {
  /*
    Every one of these was accepted by a version of this rule, and each is why
    one of its conditions exists. They are the whole argument for the module
    being this narrow, so they are asserted rather than described.
  */
  const refused: [string, string][] = [
    // A postposition and its complement, with the verb at the front because
    // Estonian drops a pronoun subject.
    ["Pühkisin otsa eest higi.", "Pühkisin otsa higi eest"],
    ["Olen võidu üle uhke.", "Olen võidu uhke üle"],
    ["Ta määris leiva peale võid.", "Ta määris leiva võid peale"],
    // A spelling that is a verb and a noun at once.
    ["Heaolutunne kadus, kui maiasmokk kaalu peale astus.", "Heaolutunne kadus kui maiasmokk kaalu astus peale"],
    // Past a joiner, which is a second clause or a second adjective and this
    // cannot tell those apart.
    ["Nad kõndisid edasi ja jõudsid järveni.", "Nad kõndisid ja jõudsid järveni edasi"],
    ["Mees nägi välja rõõsa ja ümarik.", "Mees nägi rõõsa välja ja ümarik"],
    /*
      Past a participle, where the particle belongs to it. The infinitive is
      deliberately not in this list: `tahab anda saagalikkust edasi` is
      ordinary Estonian and an earlier version of the rule refused it.
    */
    ["Ajaloolise ülevaate kõrval on ära toodud statistilised andmed.", "Ajaloolise ülevaate kõrval on toodud statistilised andmed ära"],
    // A particle the writer put at the end stays there: the stated residual.
    ["Ta pani raamatu ära.", "Ta pani ära raamatu"],
    /*
      AND PAST A PARTICIPLE THAT IS THE LAST WORD, which is how Estonian
      writes its perfect and was the one shape the guard could not see: it
      read the words the particle passes *between* rather than the words it
      passes, and the word it left out is the one the particle ends up behind.
    */
    ["Ei puudunud palju, et tuumasõda oleks lahti läinud.", "Ei puudunud palju et tuumasõda oleks läinud lahti"],
    /*
      And past one on a verb the dictionary does not hold, which is why the
      ending is a backstop under `OrderContext.participle`. Nothing here has
      an entry for `hallitama` or `kärvama`, so the dictionary has no opinion
      and the `nud` does.
    */
    ["Leib on ära hallitanud.", "Leib on hallitanud ära"],
    ["Hobune on ära kärvanud.", "Hobune on kärvanud ära"],
    /*
      A COMMA THAT SEPARATES A LIST IS NOT THE END OF A CLAUSE. `täis` governs
      the list that carries on past it, so the segment before the comma does
      not end anything and the swap inside it strands the rest of the list
      behind the word governing it.
    */
    ["Sünnipäevapidu oli täis muusikat, naeratusi ja õnnitlusi.", "Sünnipäevapidu oli muusikat täis naeratusi ja õnnitlusi"],
    /*
      AND NOTHING CROSSES A COMMA, whatever the dictionary can see on the
      other side of it. The first fix for the list above folded the two
      segments into one clause, which moved the particle to the end of the
      merged run: `voolas` is a simple past no rule here derives, so the verb
      in the second clause was invisible, the two merged, and `katki` was
      carried into a clause it has no business in. A reading of what follows a
      comma may take an order away and may never add one.
    */
    ["Kraadiklaas läks katki, elavhõbe voolas laiali.", "Kraadiklaas läks elavhõbe voolas laiali katki"],
    /*
      AND THE SIX SHAPES THE TIME ADVERB IS REFUSED IN, each off the list
      `npm run audit:order` prints and each a sentence that came back wrong
      before the guard for it existed.
    */
    // Part of a longer adverbial: taking the first word out strands the rest.
    ["Ärkasin täna hommikul kell 7.", "Ärkasin hommikul kell täna"],
    ["Tänavu veebruaris ilmus bändilt singel ja video.", "veebruaris ilmus Tänavu bändilt singel ja video"],
    ["Peame otsuse langetama veel täna.", "Peame täna otsuse langetama veel"],
    // In front of a participle with no verb before it, which is an attribute.
    ["Eile lõppenud Berliini filmifestivali peaauhind läks jagamisele.", "lõppenud Berliini filmifestivali peaauhind läks jagamisele Eile"],
    // Leaving the verb first, which is how Estonian opens a question.
    ["Täna on väljas külm ilm.", "on väljas külm ilm Täna"],
    // Between the negator and its verb, which are one form in two words.
    ["Täna kirikut ei ole.", "kirikut ei Täna ole"],
    // In front of a question word, and in front of a subordinator.
    ["Kus sa praegu töötad?", "praegu Kus sa töötad"],
    ["Nõder sulg ei suuda kirjeldada, mis nüüd juhtus.", "Nõder sulg ei suuda kirjeldada nüüd mis juhtus"],
  ];

  for (const [original, built] of refused) {
    it(`refuses ${built}`, () => {
      expect(readOrder(tiles(built), original, alsoRightOrders(original, DICT)).reading).toBe("wrong");
    });
  }
});

/*
  THE FOUR SENTENCES THE RULE WAS REPORTED IN. A time adverb stands at either
  edge of its clause or on either side of the verb, and the report was those
  four orders of one sentence, named as all being said.
*/
describe("a time adverb", () => {
  const written = "Ma loen raamatut täna.";
  const said = [
    "Ma loen raamatut täna",  // the writer's own
    "Ma loen täna raamatut",
    "Täna ma loen raamatut",
    "Ma täna loen raamatut",
  ];

  for (const built of said) {
    it(`takes ${built}`, () => {
      const v = readOrder(tiles(built), written, alsoRightOrders(written, DICT));
      expect(orderIsRight(v.reading), v.reading).toBe(true);
    });
  }

  /*
    And nowhere else. The four are the positions the app can name with no
    parser; anything between would have to be read off a phrase it cannot
    see, and this is the one that would split `huvitavat raamatut`.
  */
  it("does not put it inside a phrase", () => {
    const long = "Ma loen huvitavat raamatut täna.";
    const v = readOrder(tiles("Ma loen huvitavat täna raamatut"), long, alsoRightOrders(long, DICT));
    expect(v.reading).toBe("wrong");
  });

  /*
    AND THE WORD IT NAMES IS THE ONE THAT MOVED. At the first position two
    orders differ, one of them holds the mover and the other holds the word
    that shifted into its place, and which is which is the direction it went.
    Read the way the particle is read, this named `Ma`, which is the word that
    stayed put, and said the writer had it earlier when the writer had it at
    the other end of the sentence.
  */
  it("names the word that moved and which way the writer had it", () => {
    const forward = readOrder(tiles("Täna ma loen raamatut"), written, alsoRightOrders(written, DICT));
    expect(forward.moved).toBe("täna");
    expect(forward.writerPut).toBe("later");

    const middle = readOrder(tiles("Ma loen täna raamatut"), written, alsoRightOrders(written, DICT));
    expect(middle.moved).toBe("täna");
    expect(middle.writerPut).toBe("later");
  });

  /*
    And the particle, which only ever goes the other way, is unchanged: the
    reported sentence has `ette` further forward than the learner put it.
  */
  it("still reads the particle the way it always did", () => {
    const reported = "Muidugi tuleb ette näpukaid.";
    const v = readOrder(tiles("Muidugi tuleb näpukaid ette"), reported, alsoRightOrders(reported, DICT));
    expect(v.moved).toBe("ette");
    expect(v.writerPut).toBe("earlier");
  });
});

describe("what it accepts", () => {
  const accepted: [string, string][] = [
    ["Muidugi tuleb ette näpukaid.", "Muidugi tuleb näpukaid ette"],
    ["President kuulutas välja sõjaseisukorra.", "President kuulutas sõjaseisukorra välja"],
    ["Paraadi võtab vastu president.", "Paraadi võtab president vastu"],
    ["Rong sõidab mööda raudteed.", "Rong sõidab raudteed mööda"],
    ["Kella tuleb tagasi keerata.", "Kella tuleb keerata tagasi"],
    // Past the infinitive the particle belongs to, which is where it goes.
    ["Näitleja Liv Ullmann tahab edasi anda saagalikkust.", "Näitleja Liv Ullmann tahab anda saagalikkust edasi"],
    ["Valitsus peab kokku leppima järgmise aasta eelarves.", "Valitsus peab leppima järgmise aasta eelarves kokku"],
    // And a spelling that is a verb form and a determiner is neither, so it
    // does not block: `oma` is a form of `omama` and the word anybody says.
    ["Kunstnik annab edasi oma nägemuse.", "Kunstnik annab oma nägemuse edasi"],
    /*
      And a clause that really does end at its comma still moves, so the
      reading of what follows one refuses a list without costing a sentence:
      the segment after this comma holds `on`, which is a verb of its own.
    */
    ["Hai tunned ära selle järgi, et tal on suu koonu all.", "Hai tunned selle järgi ära et tal on suu koonu all"],
    /*
      A time adverb at each of its other three positions, in a sentence a
      lexicographer recorded. `Meri on täna tormine` is the same sentence and
      is refused, because `tormine` is in no entry of the shipped dictionary
      and a neighbour this cannot place blocks the move: that is the
      over-refusal `plainWord` describes, doing what it says on a real word.
    */
    ["Meri on täna tige.", "Täna meri on tige"],
    ["Meri on täna tige.", "Meri täna on tige"],
    ["Meri on täna tige.", "Meri on tige täna"],
  ];
  for (const [original, built] of accepted) {
    it(`accepts ${built}`, () => {
      expect(readOrder(tiles(built), original, alsoRightOrders(original, DICT)).reading).toBe("variant");
    });
  }
});

describe("sentenceClauses", () => {
  it("splits on a comma and nowhere else", () => {
    expect(sentenceClauses("Söö korralikult, ära näkitse toitu."))
      .toEqual([["Söö", "korralikult"], ["ära", "näkitse", "toitu"]]);
  });

  it("keeps a joiner inside the clause it joins", () => {
    expect(sentenceClauses("Nad kõndisid edasi ja jõudsid järveni.")).toHaveLength(1);
  });
});

describe("the word lists", () => {
  /*
    EVERY WORD NAMED HERE IS A REQUEST, NOT A FACT, which is the rule the
    syllabus states about its own word lists. These are uninflected adverbs
    and conjunctions, so the lemma is the spelling and there is no morphology
    to invent; what a typo would do is switch a rule off in silence, so each
    one is asked of `prisma/data/forms/`, the accept list, which is read here
    for exactly the question it exists to answer: is that a word.
  */
  const ALL = [
    ...FREE_PARTICLES, ...BOUND_PARTICLES, ...CLAUSE_JOINERS,
    ...MOBILE_ADVERBS, ...FOCUS_PARTICLES,
  ];

  for (const word of ALL) {
    it(`${word} is a word Estonian has`, async () => {
      expect(await isKnownForm(word)).toBe(true);
    });
  }

  it("names no word twice", () => {
    const all = [...FREE_PARTICLES, ...BOUND_PARTICLES];
    expect(new Set(all).size).toBe(all.length);
  });

  /*
    And a word cannot be mobile and a particle at once, or the two moves
    would disagree about it: a particle goes to the end of its clause on one
    rule and anywhere on the other.
  */
  it("keeps the mobile adverbs apart from the particles", () => {
    const particles = new Set([...FREE_PARTICLES, ...BOUND_PARTICLES]);
    expect(MOBILE_ADVERBS.filter((w) => particles.has(w))).toEqual([]);
    expect(MOBILE_ADVERBS.filter((w) => FOCUS_PARTICLES.includes(w))).toEqual([]);
  });

  it("holds no Estonian beyond those lists", () => {
    const source = readFileSync(join(import.meta.dirname, "wordOrder.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const named = new Set(ALL);
    const estonian = [...code.matchAll(/"([a-zõäöüšž]+)"/g)]
      .map((m) => m[1]!)
      .filter((w) => /[õäöüšž]/.test(w) && !named.has(w));
    expect(estonian).toEqual([]);
  });
});

describe("over the shipped dictionary", () => {
  /*
    THE NUMBER IS READ RATHER THAN ASSERTED AT, which is `eval:scene`'s own
    discipline: what matters is that a person has read the list of orders this
    accepts, and `npm run audit:order` is how they do it. The floor here is
    that it still fires at all and that it has not quietly become a rule that
    accepts anything.
  */
  it("offers an alternative for a few sentences and not for most", () => {
    let sentences = 0;
    let variants = 0;
    for (const row of ROWS) {
      for (const example of row.examples) {
        sentences++;
        variants += alsoRightOrders(example.et, DICT).length;
      }
    }
    expect(sentences).toBeGreaterThan(5_000);
    expect(variants).toBeGreaterThan(20);
    expect(variants).toBeLessThan(sentences / 20);
  });

  it("never offers an order that is not read back as a variant", () => {
    for (const row of ROWS) {
      for (const example of row.examples) {
        const alts = alsoRightOrders(example.et, DICT);
        for (const alt of alts) {
          expect(readOrder(sentenceTiles(alt), example.et, alts).reading).toBe("variant");
        }
      }
    }
  });

  /*
    ONE WORD MOVES, AND A TIME ADVERB HAS FOUR PLACES TO MOVE TO. The claim
    was one alternative per sentence while a particle was the only thing that
    moved, and it is the wrong shape for the adverb: `Meri on täna tormine`
    has three other orders and all three were asked for. What is bounded is
    the number of words that move, which is one, so a sentence cannot offer
    more than three alternatives per mobile word in it and no order differs
    from the recording by more than one word's position.
  */
  it("moves one word and no more", () => {
    for (const row of ROWS) {
      for (const example of row.examples) {
        const target = sentenceTiles(example.et);
        for (const order of acceptedOrders(example.et, DICT).slice(1)) {
          const moved = order.filter((w, i) => w.toLowerCase() !== target[i]?.toLowerCase());
          /*
            Taking one word out and putting it back shifts everything between
            the two positions by one, so the run that differs is that whole
            stretch and what it has to be is a rotation of itself: the same
            words in the same order with one of them carried to the other end.
          */
          const start = moved.length > 0 ? order.findIndex((w, i) => w.toLowerCase() !== target[i]?.toLowerCase()) : 0;
          const end = start + moved.length;
          const before = target.slice(start, end).map((w) => w.toLowerCase());
          const after = order.slice(start, end).map((w) => w.toLowerCase());
          const rotations = [
            [...before.slice(1), before[0]!].join(" "),
            [before[before.length - 1]!, ...before.slice(0, -1)].join(" "),
          ];
          expect(rotations, `${example.et} -> ${order.join(" ")}`).toContain(after.join(" "));
        }
      }
    }
  });
});
