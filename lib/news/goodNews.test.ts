import { describe, expect, it } from "vitest";
import { badStem, plainlyGood, recentEnough, shownTitle } from "./goodNews";
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
  // A plan that fell through reads as a happy word ("avamine") and is not good news.
  item("Tallinna Kunstihoone avamine lükkub detsembrisse"),
  item("Festival jääb tänavu ära"),
  item("Kohvik sulgeb oktoobri lõpus uksed"),
  item("Eesti Kunstnike Liidu juhatus astus suurkoguks valmistudes tagasi"),
];

/*
  A YEAR OF ERR, READ BY A PERSON. The rule was run over 9,554 articles ERR
  published between October 2025 and October 2026, read off its own search,
  and every headline it offered was read. These are the ones it used to
  offer and must not: none of them is bad news in a word the old list held,
  and none of them is a reason to smile either.
*/
const SLIPPED = [
  item("Paavsti sõnul tehakse talle lähipäevil kopsuoperatsioon"),
  item("Tolliametnikud pidasid kinni Leedu veoki üheksa miljoni salasigaretiga"),
  item("Vilniuses kogunesid tuhanded inimesed meediavabaduse kaitseks meelt avaldama"),
  item("Euroopa Kohus: samasooliste abielu tuleb tunnustada riigipiiride üleselt"),
  item("Pirita rannast võetud sinivetikate proov osutus positiivseks"),
  item("Augustis kasvas kaupade eksport kolm ja import kümme protsenti"),
  item("Coop panga kasum kasvas aastaga, LHV panga tulemus jäi mullusele alla"),
  item("Küsitlus: Saksa parempopulistide toetus kerkis 29 protsendini"),
  item("Kell 20 \"Impulsis\": mida teha, et Eestis sünniks rohkem lapsi?"),
  item("Arukülas alustas tööd 100-megavatine akupark"),
  item("Kormorani pesapaigas tuleb toime vaid paar linnuliiki"),
  item("Patarei merekindluses lõpeb selle suvega öine kontserttegevus"),
  item("The Exploitedi edasilükatud Tallinna kontsert toimub juulis"),
  item("Harno lükkas põhikooli eesti keele e-eksami aasta võrra edasi"),
  item("Tallinna lauluväljaku juhiks valiti Laine Randjärv"),
  item("Arvustus. Liisa-Lota Jõelehe isikunäitus küsib, kas õige kuju on üldse olemas"),
  item("Evelyn Raudsepp: kollektiivne kujutlusvõime võiks olla vastupanuvahend"),
  item("Tiitlikaitsja jäi NHL-i hooaja avamängus nullile"),
  item("New Yorgi juubelimaratoni võitnud Korir sai pika dopingukeelu"),
  item("Manchester City loovutas tiitliheitluses väärtuslikke punkte"),
  item("Esiliigas mängiv Peetri jättis kuuekordse karikavõitja TalTechi geimivõiduta"),
  item("Chelsea toob uue peatreeneri Prantsusmaa liigast"),
  item("Festival ei toimu tänavu"),
];
/* And some it rightly offers, off the same year. */
const PICKED = [
  item("Hariduse elutööpreemia pälvis hariduspsühholoog Eve Kikas"),
  item("Galerii: Viljandis avati suur näitus tikkimisest"),
  item("Eesti noortefilm \"Morten\" võitis Itaalias kolm auhinda"),
  item("Vanemuise teatris esietendub Margo Kõlari ja Ivar Põllu ooper \"Libahunt\""),
  item("Tänavune aasta kodanik on Piia Kallas"),
  item("Aasta betoonehitis 2025 on Tallinna Linnateater"),
  item("Eesti noorpurjetajad võitsid MM-il hõbeda"),
  item("Sinimäe põhikoolis tähistati vastlapäeva"),
  item("Astronaudid tegid Kuu ümber edukalt tiiru"),
];

describe("a year of ERR headlines", () => {
  it("refuses everything the old rule used to offer and should not have", () => {
    for (const news of SLIPPED) expect(plainlyGood(news), news.title).toBe(false);
  });

  it("offers the plainly happy ones", () => {
    for (const news of PICKED) expect(plainlyGood(news), news.title).toBe(true);
  });

  it("reads a happy word only where a word starts, and a price only outside an award", () => {
    // `avati` sits inside `megavatine`; `auhind` holds `hind`, a price.
    expect(plainlyGood(item("Galavatine kontsert"))).toBe(true);
    expect(plainlyGood(item("Uus jaam on 100-megavatine"))).toBe(false);
    expect(badStem(item("Film võitis auhinna"))).toBeNull();
    expect(badStem(item("Piima hind tõusis"))).not.toBeNull();
  });
});

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

describe("good news", () => {
  it("needs a stem that means good news as well as clearing the bad-news list", () => {
    for (const news of GOOD) expect(plainlyGood(news), news.title).toBe(true);
    for (const news of BAD) expect(plainlyGood(news), news.title).toBe(false);
    expect(plainlyGood(item("Riigikogu arutab eelnõu"))).toBe(false);
    expect(plainlyGood(item("Ilm on homme pilvine"))).toBe(false);
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

describe("the good-news words", () => {
  it("do not take a word that only starts like a happy one", () => {
    // `sündmus` is an event, not a birth; `naeruväärne` is ridiculous, not a laugh.
    expect(plainlyGood(item("Linnas toimub suur sündmus"))).toBe(false);
    expect(plainlyGood(item("Naeruväärne otsus"))).toBe(false);
    expect(plainlyGood(item("Loomaaias sündis kaks karupoega"))).toBe(true);
  });
});
