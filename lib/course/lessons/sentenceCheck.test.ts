import { describe, expect, it } from "vitest";
import { HARVESTED } from "@/prisma/data/harvested";
import { ESTONIAN_WORD } from "@/lib/estonian/cloze";
import { fold } from "@/lib/estonian/fold";
import { formsOf } from "@/lib/scenes/lexicon";
import { ALWAYS_READ, checkSentence, type CheckEntry, type Finding } from "./sentenceCheck";

/*
  The course's own dictionary stands in for the database, and every form it
  holds stands in for the forms list, which is what the server hands the check.
*/
const ENTRIES: CheckEntry[] = HARVESTED.map((w) => ({
  lemma: w.lemma, pos: w.pos, cefr: w.cefr, parts: w.parts, extraForms: w.extraForms, usages: [],
  government: w.government, semanticTypes: w.semanticTypes.join(" "),
}));
const SPELLINGS = new Set(ENTRIES.flatMap((e) => formsOf(e)));
const exact = (word: string) => SPELLINGS.has(word);

/**
 * The entries a sentence needs, which is what the server reads: the headwords
 * of its words, a dropped diacritic folded the way the forms list folds it,
 * and the fixed few.
 */
function entriesFor(...texts: string[]): CheckEntry[] {
  const said = new Set(texts.flatMap((t) => (t.match(ESTONIAN_WORD) ?? []).map((w) => fold(w.toLowerCase()))));
  return ENTRIES.filter((e) => ALWAYS_READ.includes(e.lemma) || formsOf(e).some((f) => said.has(fold(f))));
}

function check(text: string, model = ""): readonly Finding[] {
  return checkSentence(text, entriesFor(text, model), exact, model).findings;
}

describe("checkSentence", () => {
  it("finds the object in the plain form, the reported sentence", () => {
    const findings = check("Tere! Ma soovin raamatukogukaart osta.", "Ma soovin raamatukogukaarti.");
    expect(findings).toEqual([
      { kind: "object", word: "raamatukogukaart", verb: "osta", partitive: "raamatukogukaarti", genitive: "raamatukogukaardi" },
    ]);
  });

  it("offers only the partitive after a verb of wanting, or where the clause is negative", () => {
    const wants = check("Ma soovin raamatukogukaart.");
    expect(wants).toHaveLength(1);
    expect(wants[0]).toMatchObject({ kind: "object", genitive: null, partitive: "raamatukogukaarti" });
    const no = check("Ma ei osta raamatukogukaart.");
    expect(no[0]).toMatchObject({ kind: "object", genitive: null });
  });

  it("says nothing about correct sentences", () => {
    for (const text of [
      "Tere! Ma soovin raamatukogukaarti.",
      "Ma soovin raamatukogukaardi osta.",
      "Ma soovin raamatukogukaarti osta.",
      "Ma olen õpetaja.",
      "Mulle meeldib kohv.",
      "Ma ei tea.",
      "Ma tahan osta.",
      "Ma elan Tallinnas.",
      "Ma ootasin tund aega.",
      "Kas sa tuled homme?",
      "Tom elab Tartus.",
    ]) {
      expect(check(text), text).toEqual([]);
    }
  });

  it("finds a verb in the wrong person", () => {
    expect(check("Ma soovib kohvi.")).toEqual([{ kind: "person", word: "soovib", subject: "ma", right: "soovin" }]);
    // The bare conditional stands with any person, as b1-raha teaches it; `oleksin` is right too.
    expect(check("Ma oleks varem alustanud.").filter((f) => f.kind === "person")).toEqual([]);
    expect(check("Ma oleksin varem alustanud.").filter((f) => f.kind === "person")).toEqual([]);
  });

  it("finds a person ending after ei", () => {
    expect(check("Ma ei soovin kohvi.")).toEqual([{ kind: "negative", word: "soovin", right: "soovi" }]);
  });

  it("finds the dictionary form where a person belongs", () => {
    expect(check("Ma tulema homme.")).toEqual([{ kind: "dictionaryForm", word: "tulema", subject: "ma", right: "tulen" }]);
  });

  it("finds the ma-infinitive after a verb that takes the da-infinitive", () => {
    expect(check("Ma tahan ostma kohvi.")).toEqual([{ kind: "infinitive", word: "ostma", after: "tahan", right: "osta", form: "da" }]);
  });

  it("finds a misspelling and offers the word meant", () => {
    expect(check("Ma soovin raamatukogukaarri.", "Ma soovin raamatukogukaarti.")).toEqual([
      { kind: "spelling", word: "raamatukogukaarri", suggestion: "raamatukogukaarti", diacritics: false },
    ]);
    expect(check("Ma joon kohvi ja tee, aitah.")).toEqual([
      { kind: "spelling", word: "aitah", suggestion: "aitäh", diacritics: true },
    ]);
  });

  it("finds a noun in its plain form after a number or before a postposition", () => {
    expect(check("Ma soovin kaks kook.")).toEqual([{ kind: "count", word: "kook", after: "kaks", right: "kooki" }]);
    expect(check("Raamat on laud peal.")).toEqual([{ kind: "postposition", word: "laud", before: "peal", right: "laua" }]);
  });

  it("says the word needs an ending, and not which, where the verb records no object", () => {
    expect(check("Ma lähen pood.")).toEqual([{ kind: "object", word: "pood", verb: "lähen", partitive: null, genitive: null }]);
  });

  it("leaves alone what it cannot settle", () => {
    for (const text of [
      // A command takes its object in the plain form.
      "Osta raamat!",
      "Palun pane aken kinni.",
      // A second clause with a subject of its own.
      "Ma joon kohvi ja poiss joob teed.",
      // A time said in the plain form, and a number counted.
      "Ma ootan sind iga päev.",
      "Kokku kaks eurot.",
      "Kell on viis.",
      // A word in quotation marks is mentioned, not used.
      "Ma ei ütle „pool”.",
      // A pronoun compared rather than a subject.
      "Ta on sama pikk kui mina.",
    ]) {
      expect(check(text), text).toEqual([]);
    }
  });

  it("reads a verb's person in the past as well as the present", () => {
    expect(check("Ta lugesin raamatut.")).toEqual([{ kind: "person", word: "lugesin", subject: "ta", right: "luges" }]);
    expect(check("Sa lähen homme.")).toEqual([{ kind: "person", word: "lähen", subject: "sa", right: "lähed" }]);
  });

  it("finds a person ending after ei in any tense, and on olema", () => {
    expect(check("Ma ei lugesin raamatut.")).toEqual([{ kind: "negative", word: "lugesin", right: "lugenud" }]);
    expect(check("Ma ei on kodus.")).toEqual([{ kind: "negative", word: "on", right: "ole" }]);
  });

  it("finds who has something read as who is something", () => {
    expect(check("Mul olen auto.")).toEqual([{ kind: "have", word: "olen", owner: "mul", right: "on" }]);
  });

  it("finds the da-infinitive after a verb that takes the ma-infinitive", () => {
    expect(check("Ma pean minna koju.")).toEqual([{ kind: "infinitive", word: "minna", after: "pean", right: "minema", form: "ma" }]);
    expect(check("Ta tahab sõitma Tartusse.")).toEqual([{ kind: "infinitive", word: "sõitma", after: "tahab", right: "sõita", form: "da" }]);
  });

  it("finds an adjective left plain before a noun with an ending, and a counted plural", () => {
    expect(check("Ma elan suur majas.")).toEqual([{ kind: "agreement", word: "suur", noun: "majas", right: "suures" }]);
    expect(check("Ma ostsin kaks raamatud.")).toEqual([{ kind: "count", word: "raamatud", after: "kaks", right: "raamatut" }]);
  });

  it("finds a noun joined by ja left without the ending of the one before", () => {
    expect(check("Mina koristan elutoa ja köök.")).toEqual([{ kind: "pair", word: "köök", with: "elutoa", right: "köögi" }]);
  });

  it("reads a plain form spelled like the genitive where only the partitive can be the object or counted", () => {
    expect(check("Ma ei näe proosa.")).toEqual([{ kind: "object", word: "proosa", verb: "näe", partitive: "proosat", genitive: null }]);
    expect(check("Kokku kolm euro.")).toEqual([{ kind: "count", word: "euro", after: "kolm", right: "eurot" }]);
  });

  it("finds a weekday written with a capital", () => {
    expect(check("Me kohtume Esmaspäeval.")).toEqual([{ kind: "lowercase", word: "Esmaspäeval", right: "esmaspäeval" }]);
  });

  it("says nothing where the rule's own guards hold", () => {
    for (const text of [
      // Two people coming, one of them me.
      "Mari ja mina tuleme homme.",
      // The negative past, and an adjective that agrees.
      "Ma ei olnud kodus.",
      "Me elame ilusas linnas.",
      // `olid` is "they were" too, and a plural is what this person has.
      "Tal olid head kavatsused.",
      // `viis` is five and "took".
      "Talumees viis lehmad tapale.",
      // Two pronouns, and the check cannot tell whose verb it is.
      "Kust te ta leidsite?",
      // A clitic on a word is the word.
      "Ta ei töötagi kusagil.",
      // An address is not Estonian.
      "Vaata seljakotirandur.com lehte.",
      // Both places in one case, and a genitive saying whose.
      "Ma käisin poes ja raamatukogus.",
      "Ma ei oota proosa lugemist.",
      // A genitive object of a verb Ekilex records with `mida` alone, and a number before a number.
      "Lükkasin kaardi automaadi pilusse.",
      "Kakskümmend üheksa!",
      // `ära` here is the particle of the verb, not "don't".
      "Tahan võla ära õiendada.",
    ]) {
      expect(check(text), text).toEqual([]);
    }
  });

  it("only speaks about spelling where it can name the word meant", () => {
    expect(check("Ma joon qwrtzk.")).toEqual([]);
  });

  it("keeps the learner's capital on a suggestion", () => {
    expect(check("Aitah!")).toEqual([{ kind: "spelling", word: "Aitah", suggestion: "Aitäh", diacritics: true }]);
  });

  it("finds who a feeling happens to, and whose a thing is, written as the subject", () => {
    expect(check("Ma meeldib kohv.")).toEqual([{ kind: "experiencer", word: "Ma", verb: "meeldib", right: "Mulle", case: "ALLATIVE" }]);
    expect(check("Ma valutab pea.")).toEqual([{ kind: "experiencer", word: "Ma", verb: "valutab", right: "Mul", case: "ADESSIVE" }]);
    expect(check("Mina kass on suur.")).toEqual([{ kind: "possessive", word: "Mina", noun: "kass", right: "Minu" }]);
    expect(check("Mul valutab pea.")).toEqual([]);
  });

  it("finds the case koos asks for, and the command after ära", () => {
    expect(check("Ma lähen koos sõber.")).toEqual([{ kind: "governed", word: "sõber", after: "koos", right: "sõbraga", case: "COMITATIVE" }]);
    expect(check("Ära tuled homme!")).toEqual([{ kind: "command", word: "tuled", after: "Ära", right: "tule", polite: false }]);
    // The plural one is the polite command, and the finding says so, so the screen names it that (round 3, ui-b L7).
    expect(check("Ärge tulete homme!")).toEqual([{ kind: "command", word: "tulete", after: "Ärge", right: "tulge", polite: true }]);
  });

  it("finds a thing as the subject with the verb saying I or you", () => {
    expect(check("See olen hea mõte.")).toEqual([{ kind: "person", word: "olen", subject: "see", right: "on" }]);
    expect(check("Meie naaber olen väga sõbralik.")).toEqual([{ kind: "person", word: "olen", subject: "naaber", right: "on" }]);
    expect(check("Siin olen teie pilet.")).toEqual([{ kind: "person", word: "olen", subject: "pilet", right: "on" }]);
    // A fronted predicate with the pronoun dropped, and a person after olema, are the speaker.
    for (const text of ["See olen mina.", "Õpetaja olen juba kümme aastat.", "Siin olen õpetaja."]) expect(check(text), text).toEqual([]);
  });

  it("finds the endings a noun phrase, a count and a word of time ask for", () => {
    expect(check("Me ostame uus raamatut.")).toEqual([{ kind: "agreement", word: "uus", noun: "raamatut", right: "uut" }]);
    expect(check("Ma tulen järgmine nädalal.")).toEqual([{ kind: "agreement", word: "järgmine", noun: "nädalal", right: "järgmisel" }]);
    expect(check("Kolm aasta juba.")).toEqual([{ kind: "count", word: "aasta", after: "Kolm", right: "aastat" }]);
    expect(check("Ma tulen tund pärast.")).toEqual([{ kind: "postposition", word: "tund", before: "pärast", right: "tunni" }]);
    // An adjective saying something about a clause: the partitive belongs to the infinitive.
    expect(check("Oli kerge tööd leida.")).toEqual([]);
  });

  it("reads a second object joined by ja to one spelled alike in every case", () => {
    expect(check("Ostsin kala ja kartul.")).toEqual([{ kind: "object", word: "kartul", verb: "Ostsin", partitive: "kartulit", genitive: "kartuli" }]);
    expect(check("Ma kuulan muusika.")).toEqual([{ kind: "object", word: "muusika", verb: "kuulan", partitive: "muusikat", genitive: null }]);
  });

  it("breaks a tie between two slips toward the word a learner meets years earlier", () => {
    const text = "Mulle meedib suvi.";
    const near = (lemmas: Record<string, string[]>) => () => Object.entries(lemmas).map(([spelling, l]) => ({ spelling, distance: 1, lemmas: l }));
    const run = (lemmas: Record<string, string[]>, bands: Record<string, string | null>) =>
      checkSentence(text, entriesFor(text, "meeldib"), exact, "", { near: near(lemmas), band: (l) => (l in bands ? bands[l] : undefined) }).findings;
    const one = { meedia: ["meedia"], meeldib: ["meeldima"] };
    expect(run(one, { meedia: null, meeldima: "A1" })).toEqual([{ kind: "spelling", word: "meedib", suggestion: "meeldib", diacritics: false }]);
    // Two words a band apart is no tie anybody can break, and a word not asked its band might be the common one.
    expect(run(one, { meedia: "A2", meeldima: "A1" })).toEqual([]);
    expect(run(one, { meeldima: "A1" })).toEqual([]);
  });

  it("counts the words it read", () => {
    expect(checkSentence("Tere! Ma soovin kohvi.", entriesFor("Tere! Ma soovin kohvi."), exact).words).toBe(4);
  });
});
