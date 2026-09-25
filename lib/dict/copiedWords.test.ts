import { describe, expect, it } from "vitest";
import { estonianNotCopied } from "@/lib/dict/copiedWords";

/**
 * The refusal the shipped translations are held to. Estonian letters in an
 * English line used to be refused outright, which left every sentence with a
 * place or a person in it without an English line.
 */
describe("estonianNotCopied", () => {
  it("lets a name the sentence holds through", () => {
    expect(estonianNotCopied("Tõnis bought a new car.", "Tõnis ostis uue auto.")).toBe(false);
  });

  it("lets a name through in another case than the sentence holds it", () => {
    expect(estonianNotCopied("It is hard to get young people to come to Pärnu.",
      "Väga raske on motiveerida noori Pärnusse tulema.")).toBe(false);
    expect(estonianNotCopied("Beavers are digging the bank of the Emajõgi in Tartu.",
      "Tartus kaevavad koprad Emajõe kallast.")).toBe(false);
  });

  it("lets a quoted word through where the sentence quotes it", () => {
    expect(estonianNotCopied("The singular of sõbrad is sõber.", "Sõna sõbrad ainsuse vorm on sõber.")).toBe(false);
    expect(estonianNotCopied("Ä is a letter with dots.", "Ä on täppidega täht.")).toBe(false);
  });

  it("refuses Estonian the sentence did not hold", () => {
    // An exact echo is `looksLikeEcho`'s to refuse; this is Estonian that was not in the sentence.
    expect(estonianNotCopied("He drove to Tartu, kõik on hästi.", "Ta sõitis Tartusse.")).toBe(true);
    expect(estonianNotCopied("He bought a new auto, väga hea.", "Ta ostis uue auto.")).toBe(true);
  });

  it("refuses a lowercase word that only looks like one the sentence holds", () => {
    // A quoted word has to be there exactly; only a name may inflect.
    expect(estonianNotCopied("The sõbra is here.", "Sõna sõbrad ainsuse vorm on sõber.")).toBe(true);
  });

  it("has nothing to say about a line with no Estonian letter in it", () => {
    expect(estonianNotCopied("The coffee is hot.", "Kohv on kuum.")).toBe(false);
  });
});
