# Applying the reading of every written line, 2026-10-25

The reader was Martin Aasa, who returned four files: the checked list of 32,847 entries (its Estonian
sections are archived beside this file as `2026-10-25-written-lines-estonian.md`), the Russian and
Ukrainian sheets, and a list of the corrections the import refuses. This is what the session did with
them, and every line the session wrote itself, so a reader can check those and nothing else.

## Applied as written

- Russian and Ukrainian: 4,280 and 4,472 corrections from the sheets, and the 229 and 245 the import
  refuses (an Estonian word the English names, a template literal), applied by hand under the same rule
  `locale.test.ts` holds. Every other line confirmed. Recorded in `docs/translations/confirmed.json`.
- Estonian public pages: 413 corrections. Brief for EKI: 12, and its draft notice removed. Store
  listing: 29. Jokes: 9. Scene goodbyes: 7 of 11 as written (the other four are below). Workbook: 19
  refusals into `lib/dict/refused.ts` and 23 English lines corrected. Openers: 11, including the
  template change the reader asked for (Я хотел (хотела) телефон, Ukrainian телефону). Twins, picture
  examples and the A2 lesson lines: all ticked, nothing to change.
- Grammar examples: 16 pins replaced with the sentences the reader chose. G34 was an artifact of the
  export, not a fault in the pin.

## Changed by the session to fit a rule the reading met

Each is the nearest line the rule allows. Please read these.

| Where | The reader's line | What shipped | Why |
|---|---|---|---|
| Scene `ootamine` | Lõpuks ometi tuli buss! Head aega! | Lõpuks tuli buss! Head aega! | `ometi` is not a word the scene's units teach |
| Scene `lastevanemad` | Aitäh, et tulite! Head aega! | Aitäh teile! Lugege kodus iga päev natuke. Head aega! | `tulite` is not taught there, and a scene needs two goodbyes that say more than goodbye |
| Scene `koosolek` | Tänaseks on kõik, aitäh. Head aega! | See oli kõik, aitäh. Head aega! | `tänaseks` is not taught there |
| Scene `sobra-mure` | Aitäh, et sa olemas oled. Nägemist! | Hea, et sa mul oled. Nägemist! | `olemas` is not taught there |
| Public page, RU | ...читают по-английски, по-русски или по-украински, и всё приложение есть на всех трёх языках. | ...читают по-русски или по-английски, и всё приложение есть на обоих языках. | The Russian may not name Ukrainian, and the Ukrainian may not name Russian (`purity-*.test.ts`) |
| Public page, UK | ...читають англійською, російською чи українською, і весь застосунок є всіма трьома мовами. | ...читають українською чи англійською, і весь застосунок є обома мовами. | The same rule |
| Wordplay, RU and UK | восклицательный знак, сосед по парте, сложное слово; знак оклику, сусід по парті, складне слово, гостьовий дім, рідня | As written | These share a word with the literal reading, so the round's no-giveaway test now lists them as the same image the Estonian uses |

The workbook refusals took five sentences that grammar pages and sayings had pinned, so the session
chose other attested sentences, each one Ekilex recorded:

- Numerals, partitive after a number: `Nende peres on viis last.` for `Aias kasvab kolm pirni.`
- Ablative, off a surface: `Antennipaigaldaja kukkus katuselt alla.` for `Kopli tramm sõitis rööbastelt maha.`
- Saying `said aru`: now leads with `Jaa, sa said õigesti aru.`, then `Sain kohe aru, et midagi on valesti.`
- Saying `ellu jääda`: keeps only `Leegiheitjate, tankide ja helikopterite rünnaku all on raske ellu jääda.`
- A sentence written for beginners, `Täna puudub kaks õpilast.`, was among the refusals too. It is
  `Täna puudub üks õpilane.` now ("One student is absent today."), where only `puudub` fits.
- Saying `nägi pealt`: removed. Ekilex holds no other sentence with it. The last saying took its place,
  so no other sitting changed.

## Written by the session, never on a sheet

- The 66 onboarding and level lines per language that landed in #933 and #934 after the export,
  translated into ты / ти. They are left unconfirmed, so `export-translations.ts --unconfirmed` lists them.
- The legal notice on the policy pages no longer says no native speaker read them: "made with AI and not
  checked by a lawyer", with the English still prevailing (`LEGAL_NOTICE` in `lib/copy/publicLocale.ts`).
  Estonian: `Jurist ei ole seda üle vaadanud.`
- The store listing's long description said the app tells you its translations are a machine's, which
  stopped being true. In each language it now says a fluent speaker read and corrected them.
- The Estonian public pages used both `juurutus` and `paigaldus` for an installation, which the reader
  noted. Five uses are `paigaldus` now; `iga juurutusega` stays, since there it means each deploy.
- The model prompts for Anu, the grader and the coach's note addressed the learner as вы / ви. They say
  ты / ти now (`lib/tutor/prompt.ts`, `lib/tutor/grader.ts`, `lib/scenes/coachNote.ts`).
- `lib/estonian/plainAsk.ts`, which was on no sheet: `Скажите` and `Скажіть` are `Скажи`, and four
  clauses use ты / ти (`что ты этого не делаешь`, `что ты сделал бы`, and the Ukrainian pair).
- The refusal reasons name a case the way a class does (`osastav`, `kaasaütlev`) rather than in Latin,
  which the app holds every string to.
- The landing page's search description and its line about the app's language, in all three languages,
  were on no sheet. The session read them and changed nothing.

## Left as the reader decided

- ET-W312, 566, 567 and 660 drop the `{local}` slot. Kept as drafted.
- ET-W592 reads the ambiguous English as the learner losing nothing.
- Nine Ukrainian ids had no Ukrainian line in the file; the fix written for them was dropped.
- Lines that add a note for a Russian or Ukrainian reader the English lacks were left in.
