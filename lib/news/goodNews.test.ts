import { describe, expect, it } from "vitest";
import { badEnglish, badStem, judgeInstruction, PICKS, plainlyGood, readJudgement, recentEnough, shownTitle } from "./goodNews";
import { parseNewsItems, type NewsItem } from "./headlines";

const item = (title: string, description = ""): NewsItem => ({ title, description, link: null, at: null });

/* Headlines off ERR's own feeds on 2026-10-14, which is what this was measured on. */
const GOOD = [
  item("Sillamäel avati kaasaegse kunsti galerii"),
  item("Taani teadlane leidis nädalaga Eestis 45 uut pahksääsklaste liiki"),
  item("Kolmanda Jaak Sooääre nimelise noore džässmuusiku stipendiumi pälvis Kairiin Kukk"),
  item("Banffi mäefilmide festival tähistab tänavu Eestis viiendat sünnipäeva"),
];
const BAD = [
  item("Venemaa rünnakute tõttu jäi Ukrainas elektrita 600 000 inimest"),
  item("Tupaci mõrvas süüdimõistetud Duane Davisele määrati eluaegne vanglakaristus"),
  item("Metsloomade arvukus on kahanenud poole sajandiga 73 protsenti"),
  item("Tallinna prantsuse lütseum on hädas spordihoone lekkiva katusega", "Katus on vana ja remont on raske."),
  item("Läänemets umbusaldusest: enne on vaja plaani uue valitsuse moodustamiseks"),
  item("Tehnoloogiahiiud valmistuvad vargsi tehisaru põhjustatud katastroofiks"),
  item("In memoriam: Jaan Tamm"),
  item("Tallinnas rööviti juuksurisalong"),
  item("Neel võitis Wuhanis, Malõgina pudenes Birminghamis välja"),
];

describe("the bad-news list", () => {
  it("refuses war, crime, decline, worry and politics, by a part of a compound if need be", () => {
    for (const news of BAD) expect(badStem(news), news.title).not.toBeNull();
  });

  it("reads the summary as well as the headline", () => {
    expect(badStem(item("Uus galerii avati", "Avamisel juhtus õnnetus."))).not.toBeNull();
  });

  it("lets the plainly happy through", () => {
    for (const news of GOOD) expect(badStem(news), news.title).toBeNull();
  });
});

describe("good news with no model to ask", () => {
  it("needs a stem that means good news as well as clearing the bad-news list", () => {
    for (const news of GOOD) expect(plainlyGood(news), news.title).toBe(true);
    for (const news of BAD) expect(plainlyGood(news), news.title).toBe(false);
    expect(plainlyGood(item("Riigikogu arutab eelnõu"))).toBe(false);
    expect(plainlyGood(item("Ilm on homme pilvine"))).toBe(false);
  });
});

describe("the question put to a model", () => {
  it("numbers every headline, shortens a long summary and asks for English only", () => {
    const text = judgeInstruction([item("Üks", "x".repeat(400)), item("Kaks")]);
    expect(text).toMatch(/^0\. Üks$/m);
    expect(text).toMatch(/^1\. Kaks$/m);
    expect(text).not.toContain("x".repeat(200));
    expect(text).toMatch(/When unsure, reject/);
    expect(text).toMatch(/"en"/);
  });
});

describe("reading the judgement", () => {
  const items = [GOOD[0]!, BAD[0]!, GOOD[1]!];

  it("keeps the picks in the order given, with their English", () => {
    const picks = readJudgement('Here: {"good":[{"i":2,"en":"A Danish scientist found 45 new species"},{"i":0,"en":"A gallery opened"}]}', items);
    expect(picks).toEqual([
      { index: 2, en: "A Danish scientist found 45 new species" },
      { index: 0, en: "A gallery opened" },
    ]);
  });

  it("drops a pick the bad-news list refuses, whatever the model said about it", () => {
    expect(readJudgement('{"good":[{"i":1,"en":"Good news!"}]}', items)).toEqual([]);
  });

  it("picks nothing from a reply it cannot read, and drops indices that are not there", () => {
    expect(readJudgement("no", items)).toEqual([]);
    expect(readJudgement('{"good":"all"}', items)).toEqual([]);
    expect(readJudgement('{"good":[{"i":9},{"i":"0"},{"i":0},{"i":0}]}', items)).toEqual([{ index: 0, en: null }]);
  });

  it("keeps a name's letters in the English and nothing else Estonian, and turns a dash into a comma", () => {
    expect(readJudgement('{"good":[{"i":0,"en":"A gallery opened in Sillamäe — the first one"}]}', items))
      .toEqual([{ index: 0, en: "A gallery opened in Sillamäe, the first one" }]);
    expect(readJudgement('{"good":[{"i":0,"en":"a gallery opened, sõna"}]}', items)).toEqual([{ index: 0, en: null }]);
  });

  it("stops at the number it asked for", () => {
    const many = Array.from({ length: 10 }, (_, i) => item(`Uus galerii avati ${i}`));
    const reply = JSON.stringify({ good: many.map((_, i) => ({ i, en: `Gallery ${i}` })) });
    expect(readJudgement(reply, many)).toHaveLength(PICKS);
  });
});

describe("reading the items in a feed", () => {
  it("reads the title, the summary and an https link, and skips the channel's own title", () => {
    const xml = `<rss><channel><title>kultuur | ERR</title>
      <item><title><![CDATA[Sillamäel avati galerii]]></title><link>https://kultuur.err.ee/1/galerii</link>
      <description><![CDATA[<p>Galerii on avatud &amp; tasuta.</p>]]></description></item>
      <item><title>Teine</title><link>javascript:alert(1)</link></item>
    </channel></rss>`;
    expect(parseNewsItems(xml)).toEqual([
      { title: "Sillamäel avati galerii", description: "Galerii on avatud & tasuta.", link: "https://kultuur.err.ee/1/galerii", at: null },
      { title: "Teine", description: "", link: null, at: null },
    ]);
  });

  it("reads when an item was published, the way ERR writes it, and nothing from a date it cannot read", () => {
    const xml = `<rss><channel>
      <item><title>Üks</title><pubDate>Wed, 14 Oct 2026 16:38:48 +0300</pubDate></item>
      <item><title>Kaks</title><pubDate>eile</pubDate></item>
    </channel></rss>`;
    const [one, two] = parseNewsItems(xml);
    expect(one!.at).toBe(Date.UTC(2026, 9, 14, 13, 38, 48));
    expect(two!.at).toBeNull();
  });
});

describe("the headline as the card prints it", () => {
  it("drops a media label and keeps an attribution", () => {
    expect(shownTitle("Galerii: Open House Tallinn avas uksed")).toBe("Open House Tallinn avas uksed");
    expect(shownTitle("Vaata täispikkuses: ERSO kontsert")).toBe("ERSO kontsert");
    expect(shownTitle("Teadlane: muld on ülehoolitsetud")).toBe("Teadlane: muld on ülehoolitsetud");
    expect(shownTitle("Video:")).toBe("Video:");
  });
});

describe("today's news, not last week's", () => {
  const now = Date.UTC(2026, 9, 14, 9, 0, 0);
  const dated = (hoursAgo: number): NewsItem => ({ ...item("Uus galerii avati"), at: now - hoursAgo * 3_600_000 });

  it("keeps the last three days, a weekend included", () => {
    expect(recentEnough(dated(1), now)).toBe(true);
    expect(recentEnough(dated(70), now)).toBe(true);
  });

  it("drops what is older, and a date in the future beyond a clock's slip", () => {
    expect(recentEnough(dated(24 * 9), now)).toBe(false);
    expect(recentEnough(dated(-2), now)).toBe(true);
    expect(recentEnough(dated(-48), now)).toBe(false);
  });

  it("lets an undated item through, since the feed said nothing either way", () => {
    expect(recentEnough(item("Uus galerii avati"), now)).toBe(true);
  });
});

describe("the English, read for the same thing", () => {
  it("refuses a pick whose English says it is bad news, whatever the Estonian slipped past", () => {
    for (const en of [
      "Two people died in a fire in Tartu",
      "Police arrest a suspect after the robbery",
      "Concert cancelled over fears of a storm",
      "War in Ukraine enters a new phase",
    ]) expect(badEnglish(en), en).toBe(true);
  });

  it("lets the plainly happy through, without catching a word inside another", () => {
    for (const en of [
      "A new gallery opened in Sillamäe",
      "Fireworks light up Tallinn for the song festival",
      "Estonian choir wins gold in Spain",
      "Scientists find 45 new species of gall midges",
    ]) expect(badEnglish(en), en).toBe(false);
  });

  it("refuses English that is not a headline at all", () => {
    expect(badEnglish("Visit www.example.com for free gifts")).toBe(true);
    expect(badEnglish("<script>")).toBe(true);
  });

  it("drops such a pick from the judgement whole", () => {
    const items = [item("Uus galerii avati"), item("Kontsert toimus")];
    const reply = JSON.stringify({ good: [{ i: 0, en: "Two people died at the gallery" }, { i: 1, en: "A concert took place" }] });
    expect(readJudgement(reply, items)).toEqual([{ index: 1, en: "A concert took place" }]);
  });
});
