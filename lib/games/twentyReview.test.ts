import { describe, expect, it } from "vitest";
import { SUGGESTIONS, type Answer } from "./twenty";
import { THING_BY_LEMMA } from "./twentyThings";

/*
  The fifth native-speaker review of Kakskümmend küsimust, kept as cells: a question
  the game suggests, the things it was asked about, and what the answer has to be.
  A review that is only applied once is a review the next edit undoes in silence.
*/
const Y = "yes", N = "no", S = "sometimes", U = "unknown";
type Cell = [question: string, lemmas: string, want: Answer];

const CELLS: readonly Cell[] = [
  // 2.1: only a living thing lives anywhere.
  ["Kas see elab Eestis?", "leib raamat auto telefon tool", N],
  // 2.2: "bigger than" reads the size steps, and the same step is not bigger.
  ["Kas see on suurem kui auto?", "põder kaamel jõehobu ninasarvik traktor kaelkirjak", Y],
  ["Kas see on suurem kui auto?", "korter kohvik takso", N],
  ["Kas see on suurem kui leib?", "jope särk kleit püksid kampsun pidžaama rott orav küülik roos tulp kaelakee", N],
  ["Kas see on suurem kui leib?", "kala", Y],
  // 2.3: a heap of something has no size, and weather is as big as it is that day.
  ["Kas see on suur?", "suhkur sool pipar riis puder liiv muld", U],
  ["Kas see on väike?", "suhkur sool pipar riis puder liiv muld", U],
  ["Kas see on suur?", "vihm lumi tuul udu pilv", S],
  ["Kas see on väike?", "vihm lumi tuul udu pilv", S],
  ["Kas see on suurem kui auto?", "vihm lumi tuul udu pilv", S],
  // 3.1
  ["Kas see on pruun?", "karu", Y],
  ["Kas sellega saab helistada?", "telefon", Y],
  ["Kas sellel on ekraan?", "telefon", Y],
  ["Kas see liigub?", "jalgratas", Y],
  ["Kas see on elektriline?", "tramm", Y],
  ["Kas see on elektriline?", "rong", S],
  ["Kas see sööb liha?", "koer", Y],
  ["Kas see on kiskja?", "kass", Y],
  ["Kas see on kiskja?", "koer", S],
  ["Kas sellel on varrukad?", "särk jope kampsun", Y],
  ["Kas see muneb?", "kukk", N],
  ["Kas see on taevas?", "kukk kalkun pingviin kana", N],
  ["Kas see on taevas?", "part hani pääsuke", S],
  ["Kas see on õues?", "korter", N],
  ["Kas see on linnas?", "rakett", N],
  ["Kas see on valge?", "tiiger", S],
  ["Kas see on klaasist?", "taldrik telefon", S],
  ["Kas see on metallist?", "televiisor tolmuimeja veekeetja raadio kaamera telefon", S],
  ["Kas see on riidest?", "vöö", S],
  ["Kas see on kõva?", "saabas", S],
  ["Kas see on pehme?", "saabas", S],
  ["Kas see on kõva?", "hernes", Y],
  ["Kas see on pehme?", "hernes", N],
  ["Kas see on pehme?", "diivan", Y],
  ["Kas see on kõva?", "diivan", N],
  // 3.2
  ["Kas see jookseb?", "part kana kukk hani kalkun toonekurg", Y],
  ["Kas see jookseb?", "pääsuke öökull rähn tihane kotkas kajakas luik pingviin papagoi varblane konn", S],
  ["Kas see jookseb?", "mesilane", N],
  ["Kas see kasvab?", "koer lõvi põder kukk hai madu konn", Y],
  ["Kas see kasvab?", "liblikas mesilane herilane", S],
  ["Kas see on metsas?", "karu hunt rebane jänes siil", Y],
  ["Kas see on vees?", "part", Y],
  ["Kas see on vees?", "pingviin sääsk kiil", S],
  ["Kas see on meres?", "kajakas", S],
  ["Kas sellel on sarved?", "kits põder hirv", Y],
  ["Kas sellel on sarved?", "lammas", S],
  ["Kas see on karvane?", "jõehobu ninasarvik elevant mesilane", S],
  ["Kas see teeb häält?", "mesilane herilane konn", Y],
  ["Kas see on ohtlik?", "auto kirves", S],
  ["Kas sellel saab istuda?", "auto rong buss tramm lennuk", Y],
  ["Kas sellel on mootor?", "laev", Y],
  ["Kas see on kodus?", "küülik kärbes ämblik", S],
  ["Kas see on köögis?", "tolmuimeja triikraud", N],
  ["Kas see on köögis?", "pesumasin kapp", S],
  ["Kas see on õues?", "maja kirik haigla kauplus kohvik saun", S],
  ["Kas see on külm?", "jogurt limonaad udu", S],
  ["Kas see on magus?", "pirn õun", S],
  // 3.3
  ["Kas see on punane?", "kukk krabi rähn pitsa vein arbuus sõstar", S],
  ["Kas see on roheline?", "papagoi pirn viinamari madu sisalik kilpkonn", S],
  ["Kas see on valge?", "küülik kits pääsuke rähn puder", S],
  ["Kas see on kollane?", "tihane kaelkirjak", S],
  ["Kas see on must?", "vares toonekurg rähn sõstar klaver rahakott lepatriinu tiiger", S],
  ["Kas see on pruun?", "ananass seen võileib küpsis", S],
  // 3.4: worn or carried about, carried in a hand, or neither.
  ["Kas seda saab kanda?", "särk jope müts king kott rahakott sõrmus kaelakee käekell", Y],
  ["Kas seda saab kanda?", "raamat pliiats telefon võti pilet", S],
  ["Kas seda saab kanda?", "tool auto leib", N],
  // 3.5
  ["Kas sellega saab sõita?", "hobune suusk", S],
  ["Kas sellel on pikk kael?", "hobune toonekurg", S],
  ["Kas sellel on pikk kael?", "kaelkirjak", Y],
  ["Kas see helendab?", "telefon televiisor arvuti", S],
  ["Kas see ujub?", "koer", Y],
  ["Kas see on puuvili?", "maasikas", S],
  ["Kas see on mari?", "maasikas", Y],
  ["Kas see on külmkapis?", "salat", S],
  ["Kas see on kõva?", "küpsis", S],
  ["Kas sellel on käepide?", "nuga kahvel lusikas käärid", Y],
];

describe("the fifth review's corrections hold", () => {
  for (const [question, lemmas, want] of CELLS) {
    it(`${question} ${lemmas}`, () => {
      const s = SUGGESTIONS.find((x) => x.et === question);
      expect(s, `no suggestion "${question}"`).toBeDefined();
      const got = lemmas.split(" ").map((l) => {
        const t = THING_BY_LEMMA.get(l);
        expect(t, `no thing "${l}"`).toBeDefined();
        return `${l}=${s!.test(t!)}`;
      });
      expect(got).toEqual(lemmas.split(" ").map((l) => `${l}=${want}`));
    });
  }
  it("drops the two suggestions that split nothing", () => {
    expect(SUGGESTIONS.some((s) => s.et === "Kas see on poes?" || s.et === "Kas see on pikk?")).toBe(false);
  });
});
