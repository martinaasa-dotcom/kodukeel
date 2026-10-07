import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { rich } from "@/components/Rich";
import { fill, tr } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { resolveOperator } from "@/lib/legal/operator";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "Terms");
}

/*
  Same reason as the privacy page: who provides this service is a fact about
  the deployment, so it is read when the page is requested rather than baked in
  by whichever machine ran the build. And the language is the request's.
*/
export const dynamic = "force-dynamic";

/** A credited source, linked where its name falls in the sentence. */
function Source({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  );
}

export default async function TermsPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicLocale(searchParams);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  const operator = resolveOperator();
  const privacyLink = <Link href={href("/privacy")} className="underline underline-offset-2">{t("privacy page")}</Link>;

  return (
    <Legal title={t("Terms")} updated="30 August 2026" locale={locale} explicit={explicit} path="/terms" legal>
      <P>
        {t("Kodukeel is an app for studying Estonian. These terms are short because the deal is simple: use it to learn Estonian, don’t abuse the shared services behind it, and know what it can and can’t promise you.")}
      </P>

      <S title={t("Who provides it")}>
        {operator.identified ? (
          <P>
            {rich(t("This installation of Kodukeel is provided by **{name}**{registry}{vat}, at {address}. Reach them directly at {email}. Estonian law asks a provider of an online service for exactly that: a name, a place, and a way to get hold of them quickly without going through a form."), {
              name: operator.name,
              registry: operator.registryCode ? `, ${fill(t("registry code {code}"), { code: operator.registryCode })}` : "",
              vat: operator.vatId ? `, ${fill(t("VAT number {vat}"), { vat: operator.vatId })}` : "",
              address: operator.address,
              email: (
                <a href={`mailto:${operator.email}`} className="underline underline-offset-2">
                  {operator.email}
                </a>
              ),
            })}
          </P>
        ) : (
          <P>
            {rich(t("**Whoever runs this installation has not filled their name in**, and they’re supposed to. Kodukeel is software anyone can install, so the provider of the service you’re using is whoever runs this copy, a person or a school, not the people who wrote it. Ask whoever gave you the link. If that’s you, setting `OPERATOR_NAME`, `OPERATOR_ADDRESS` and `OPERATOR_EMAIL` puts your details here and on the {privacy}."), {
              privacy: privacyLink,
            })}
          </P>
        )}
        <P>
          {rich(t("It’s free and there’s nothing to buy, so the usual consumer purchase rules don’t apply: there’s no right of withdrawal and no payment terms. If an installation ever starts charging, that’s a different arrangement, and these terms don’t cover it. What it costs somebody to run, and who that is, is set out on the {funding}."), {
            funding: <Link href={href("/funding")} className="underline underline-offset-2">{t("funding page")}</Link>,
          })}
        </P>
      </S>

      <S title={t("What it promises")}>
        <P>
          {t("Every Estonian word form here comes from Ekilex, the dictionary database run by the Institute of the Estonian Language. None of it is made up by AI. Where a form has been worked out by a fixed rule from one the dictionary stores, the screen says so.")}
        </P>
        <P>
          {rich(t("**Anu is a machine, and says so on every screen she speaks from.** You are talking to a language model, not a teacher, and the app has to make that impossible to miss, not just true somewhere in the small print. Which model answered is printed under each reply, because a screen naming the wrong one would be worse than naming none."))}
        </P>
        <P>
          {t("She isn’t the final word on anything. She can explain grammar and suggest an English translation, but she can still get things wrong. Don’t rely on her for an exam answer without checking it yourself.")}
        </P>
        <P>
          {t("The app comes as it is, with no warranty. It’s a learning aid, not a certified language qualification.")}
        </P>
      </S>

      <S title={t("What we ask of you")}>
        <P>
          {t("Use one account, and use it yourself. Please don’t use the tutor for things that have nothing to do with learning Estonian. It runs on a key that costs money every time it’s used, so each account has a daily limit, to stop one person using it all up for everyone else.")}
        </P>
        <P>
          {t("Please don’t write scripts that hammer the dictionary, the speech service or the tutor with requests. Ekilex and TartuNLP are free academic services, and this whole project depends on nobody abusing them.")}
        </P>
        <P>
          {t("Be 13 or older, or have a parent agree first. Estonia sets the age at which somebody can agree to a service like this for themselves at 13, which is the youngest any country in the Union sets it. Nothing here checks, and saying so plainly is more use than a box anyone can tick. If you’re a teacher signing up a class, that agreement is the one thing worth getting before you send the link.")}
        </P>
      </S>

      <S title={t("What you own")}>
        <P>
          {rich(t("Your deck, your review history, your tasks and your notes are yours. Export them whenever you like from Settings, in a format that restores into any installation. The dictionary joins two sources with different licenses, so it’s worth being exact here. Every Estonian form and every example sentence comes from {ekilex} and is licensed **CC BY 4.0** by the Institute of the Estonian Language. Every English gloss that was not written for this project comes from {wiktionary} and is licensed **CC BY-SA 4.0** by its contributors, which is the stricter of the two: a work built on it has to be shared on the same terms. Both are credited on the sign-in page and in the footer, and keeping them apart is how the dictionary was designed, not an accident."), {
            ekilex: <Source href="https://ekilex.ee">Ekilex</Source>,
            wiktionary: <Source href="https://en.wiktionary.org">{t("English Wiktionary")}</Source>,
          })}
        </P>
        <P>
          {rich(t("The order the commonest words are listed in comes from {frequency}, a published count over the OpenSubtitles corpus, also licensed **CC BY-SA 4.0**. It decides nothing but an order: every word shown is the dictionary’s own."), {
            frequency: <Source href="https://github.com/hermitdave/FrequencyWords">FrequencyWords</Source>,
          })}
        </P>
        <P>
          {rich(t("Whether a spelling is an Estonian word at all, and which word it is a form of, is answered by a forms list built from Ekilex’s own inflection tables, as published in {wordlist} (**CC BY-SA 4.0**), and from {vabamorf}, Filosoft’s open-source morphological tools for Estonian (**LGPL**). That list decides whether a word is accepted and never what a card teaches: no form from it is ever drilled or marked against."), {
            wordlist: <Source href="https://github.com/KristjanPikhof/Estonian-Wordlist-Enriched-Ekilex">Estonian-Wordlist-Enriched-Ekilex</Source>,
            vabamorf: <Source href="https://github.com/Filosoft/vabamorf">Vabamorf</Source>,
          })}
        </P>
      </S>

      <S title={t("Ending it")}>
        <P>
          {t("You can stop and delete your data whenever you like. An installation may cut off an account that’s abusing the shared services described above.")}
        </P>
      </S>

      <S title={t("Which law applies")}>
        <P>
          {t("Estonian law governs these terms and anything arising from them, and the Estonian courts are where a dispute ends up. Nothing here takes away a right you have as a consumer where you live: if the law of your own country gives you something these terms do not, that law wins.")}
        </P>
      </S>

      <S title={t("Changes")}>
        <P>
          {rich(t("If these terms change in a way that affects what happens to your data, the {privacy} changes with them and both carry the date of the change."), {
            privacy: privacyLink,
          })}
        </P>
      </S>
    </Legal>
  );
}
