/**
 * What the marker makes of what people actually type.
 *
 *   npx tsx scripts/probe-turns.ts        (no database, no key)
 *
 * `play-scene.ts` drives whole conversations with a generated learner, which
 * finds what the other side *says*. This asks the other half: given a turn a
 * real person would write, is it understood. Each line is a scene, a beat and
 * a sentence somebody at that level would plausibly type, including the wrong
 * word order, the missing verb, the English word in the middle and the
 * spelling with no diacritics; the run prints how it was read, what slipped,
 * and which words the app could not account for.
 *
 * `!!` is the line to hunt: a turn nobody could make out, which is what the
 * other side answers with "I did not catch that". Reading those is how the
 * course-wide vouching, the digits rule and the typo guard were found, and
 * how it was noticed that `minu pea valutab` was being corrected to a word
 * that is not the one the learner wrote.
 *
 * The Estonian here is a fixture, in the standing `turn.test.ts` and the fuzz
 * harness already have: it is what a learner types rather than anything the
 * app stores, and every word is a course word. Two of the scenes carry the
 * turns a learner actually wrote off a run they reported, with the card they
 * were holding forced, so the two faults that run found stay watched.
 */
import { acceptFromRows, contextFromRows, knowing, sceneLemmas, type Row } from "../lib/progress/scene";
import { sceneById } from "../lib/scenes/catalogue";
import { readTurn } from "../lib/scenes/turn";
import { dataFor } from "../lib/progress/scene";
import { planRun } from "../lib/scenes/run";
import { numberWords } from "../lib/scenes/props";
import { shippedDictionary } from "./lib/dictionary";
import { SYLLABUS } from "../lib/collections/syllabus";
import { formsOf } from "../lib/scenes/lexicon";

const rows: Row[] = shippedDictionary().map((e) => ({ id: e.lemma, lemma: e.lemma, pos: e.pos, cefr: e.cefr, parts: e.parts, extraForms: e.extraForms, usages: e.usages, government: e.government, gloss: e.gloss }));

const COURSE = new Set(SYLLABUS.flatMap((u) => u.lemmas));
const KNOWN = new Set<string>();
for (const r of rows) if (COURSE.has(r.lemma)) for (const f of formsOf(r)) KNOWN.add(f);

const CASES: Record<string, [string, string][]> = {
  "arsti-aeg": [
    ["greet", "tere"], ["greet", "tere hommikust"], ["greet", "tere, kuidas läheb"],
    ["reason", "mul on valu"], ["reason", "mul on pea valus"], ["reason", "minu pea valutab"],
    ["reason", "mul pea valu"], ["reason", "ma olen haige"], ["reason", "mul on migraine"],
    ["reason", "valu mul on"], ["reason", "mul on palavk"], ["reason", "ma tahan arsti juurde"],
    ["where", "pea"], ["where", "mul on peas valu"], ["where", "minu peas"],
    ["since", "esmaspäevast"], ["since", "alates esmaspäev"], ["since", "esmaspäeval"],
    ["offer", "jah sobib"], ["offer", "jah, aitäh"], ["offer", "see sobib mulle"], ["offer", "ei sobi"],
    ["close", "aitäh, head aega"], ["close", "nägemist"], ["close", "aitäh teile"],
  ],
  "poodi-piima": [
    ["going", "ma lähen poodi"], ["going", "poodi"], ["going", "ma lähen poe"], ["going", "lähen poodi piima ostma"],
    ["inside", "ma olen poes"], ["inside", "olen praegu poes"], ["inside", "poes olen"],
    ["item", "ma tahan piima"], ["item", "piima"], ["item", "ma ostan piim"], ["item", "mulle piima palun"],
    ["back", "ma tulen poest"], ["back", "poest"], ["back", "ma tulen koju"],
  ],
  "kohvikus": [
    ["order", "üks kohv palun"], ["order", "ma tahan kohvi"], ["order", "kohvi palun"], ["order", "mulle üks tee"],
    ["size", "suur palun"], ["size", "väike palun"], ["size", "suur"], ["size", "väike"],
    ["bill", "arve palun"], ["bill", "ma tahan maksta"], ["bill", "kui palju see maksab"], ["bill", "palun arve"],
  ],
  "tee-kusimine": [
    ["where", "vabandust, kus on pank"], ["where", "kus on pank?"], ["where", "kuidas ma saan panka"],
    ["where", "kas te teate kus on pank"], ["where", "ma otsin panka"],
    ["way", "otse"], ["way", "aitäh"], ["way", "otse edasi, selge"], ["way", "ah, otse ja vasakule"],
    ["far", "kas see on kaugel"], ["far", "kas on lähedal?"], ["far", "kui kaua läheb"],
  ],
  "bussipilet": [
    ["want", "üks pilet palun"], ["want", "ma tahan piletit"], ["want", "pilet palun"],
    ["to", "tartusse"], ["to", "ma lähen jaama"], ["to", "jaam palun"],
    ["when", "kell kaheksa"], ["when", "08:30"], ["when", "hommikul"],
    ["pay", "kaardiga"], ["pay", "ma maksan kaardiga"], ["pay", "sularahaga"], ["pay", "jah"],
  ],
  /*
    THE TURNS A LEARNER ACTUALLY WROTE, OFF A RUN THEY REPORTED AS THE APP
    HAVING "ZERO CLUE" WHAT THEY WERE TALKING ABOUT. Every one of these is
    correct Estonian and every one of them was refused: the floor said in
    words, because a dealt number accepted the digit alone, and the husband
    said with the word they had rather than the word the card dealt. The card
    is forced here, since the point is these values and not a draw.
  */
  trepikoda: [
    ["new", "jah, ma just kolisin sisse"], ["new", "ma olen uus siin"],
    ["floor", "kolmandal korrusel"], ["floor", "mu korter on kolmandal korrusel"],
    ["floor", "kolmas korrus"], ["floor", "3"],
    ["from", "soomest"], ["from", "ma olen soomest"],
    ["with", "ma elan siin koos oma abikaasaga"], ["with", "ma elan koos mehega"],
    ["close", "nägemist"],
  ],
  toovestlus: [
    ["before", "ma töötasin ülikoolis"], ["before", "ülikoolis"],
    ["skill", "ma olen tugev inimestega"],
    ["why", "ma tahan seda tööd, sest palk on hea"],
    ["pay", "kui suur on kuupalk?"], ["pay", "ma tahan palga kohta küsida"],
    ["start", "esmaspäeval"], ["close", "aitäh, head aega"],
  ],
};

/*
  What the reported runs were dealt, so the two scenes above are probed against
  the card the learner was holding rather than against a draw.
*/
const DEALT: Record<string, Record<string, string>> = {
  trepikoda: { floor: "3", from: "Soome", with: "mees" },
  toovestlus: { before: "ülikool", skill: "inimene", start: "esmaspäev" },
};

async function main() {
  for (const [sceneId, cases] of Object.entries(CASES)) {
    const scene = sceneById(sceneId)!;
    const base = contextFromRows(scene, rows.filter((r) => sceneLemmas(scene).has(r.lemma)));
    /*
      MARKED THE WAY THE ROUTE MARKS IT. The route widens three times before it
      reads a turn: the course (`courseForms`), the forms list (`knowing`), and
      the two accept-only halves the dictionary derives. This probe had the first
      and none of the rest, so `kuupalk` read as a word nobody could account for
      and `abikaasaga` as a turn off the point, both of which the app understands.
      A probe that judges more harshly than the app sends whoever reads it after
      a fault that is not there.
    */
    const ctx = await knowing(
      { ...base, marker: { ...base.marker, ...acceptFromRows(scene, rows), known: (w: string) => KNOWN.has(w) } },
      cases.map(([, said]) => said),
    );
    const run = planRun(scene, "probe", scene.level, "textbook");
    const forced = DEALT[sceneId] ?? {};
    const card = {
      ...run.card,
      props: run.card.props.map((prop) => {
        const value = forced[prop.slot];
        if (!value) return prop;
        return /^\d+$/.test(value)
          ? { ...prop, value, literal: [value], shown: [value], lemmas: numberWords(value) }
          : { ...prop, value, literal: [], shown: [], lemmas: [value] };
      }),
    };
    const data = dataFor(card, ctx.lexicon);
    const dataLemmas = new Map(card.props.map((prop) => [prop.slot, prop.lemmas] as const));
    console.log(`\n=== ${sceneId} ===  card: ${card.props.map((p) => `${p.slot}=${p.value}`).join(" ")}`);
    for (const [beatId, said] of cases) {
      const beat = scene.beats.find((b) => b.id === beatId)!;
      const e = readTurn(said, beat, { ...ctx.marker, data, dataLemmas, previous: "" });
      const flag = e.reading === "complete" ? "  " : e.reading === "unrecognised" ? "!!" : " ~";
      const unv = e.words.filter((w) => !w.vouched).map((w) => w.word);
      console.log(`${flag} ${said.padEnd(34)} ${e.reading.padEnd(13)} ${e.slips.map((s) => s.kind + ":" + s.said + ">" + s.form).join(",")}${unv.length ? "   unvouched: " + unv.join(" ") : ""}`);
    }
  }
}

void main();
