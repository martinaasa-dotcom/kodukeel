import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { resolveOperator } from "@/lib/legal/operator";

export const metadata = { title: "Terms" };

/*
  Same reason as the privacy page: who provides this service is a fact about
  the deployment, so it is read when the page is requested rather than baked in
  by whichever machine ran the build.
*/
export const dynamic = "force-dynamic";

export default function TermsPage() {
  const operator = resolveOperator();

  return (
    <Legal title="Terms" updated="30 August 2026">
      <P>
        Kodukeel is an app for studying Estonian. These terms are short because the deal is
        simple: use it to learn Estonian, don&rsquo;t abuse the shared services behind it,
        and know what it can and can&rsquo;t promise you.
      </P>

      <S title="Who provides it">
        {operator.identified ? (
          <P>
            This installation of Kodukeel is provided by <strong>{operator.name}</strong>
            {operator.registryCode ? `, registry code ${operator.registryCode}` : ""}
            {operator.vatId ? `, VAT number ${operator.vatId}` : ""}, at{" "}
            {operator.address}. Reach them directly at{" "}
            <a href={`mailto:${operator.email}`} className="underline underline-offset-2">
              {operator.email}
            </a>
            . Estonian law asks a provider of an online service for exactly that: a name, a
            place, and a way to get hold of them quickly without going through a form.
          </P>
        ) : (
          <P>
            <strong>Whoever runs this installation has not filled their name in</strong>, and
            they&rsquo;re supposed to. Kodukeel is software anyone can install, so the provider of
            the service you&rsquo;re using is whoever runs this copy, a person or a school, not the
            people who wrote it. Ask whoever gave you the link. If that&rsquo;s you, setting{" "}
            <code>OPERATOR_NAME</code>, <code>OPERATOR_ADDRESS</code> and{" "}
            <code>OPERATOR_EMAIL</code> puts your details here and on the{" "}
            <Link href="/privacy" className="underline underline-offset-2">privacy page</Link>.
          </P>
        )}
        <P>
          It&rsquo;s free and there&rsquo;s nothing to buy, so the usual consumer purchase rules
          don&rsquo;t apply: there&rsquo;s no right of withdrawal and no payment terms. If an
          installation ever starts charging, that&rsquo;s a different arrangement, and these terms
          don&rsquo;t cover it.
          What it costs somebody to run, and who that is, is set out on the{" "}
          <Link href="/funding" className="underline underline-offset-2">funding page</Link>.
        </P>
      </S>

      <S title="What it promises">
        <P>
          Every Estonian word form here comes from Ekilex, the dictionary database run by the
          Institute of the Estonian Language. None of it is made up by AI. Where a form has been
          worked out by a fixed rule from one the dictionary stores, the screen says so.
        </P>
        <P>
          <strong>Anu is a machine, and says so on every screen she speaks from.</strong> You
          are talking to a language model, not a teacher, and the app has to make that
          impossible to miss, not just true somewhere in the small print. Which model answered is printed under
          each reply, because a screen naming the wrong one would be worse than naming none.
        </P>
        <P>
          She isn&rsquo;t the final word on anything. She can explain grammar and suggest an
          English translation, but she can still get things wrong. Don&rsquo;t rely on her for
          an exam answer without checking it yourself.
        </P>
        <P>
          The app comes as it is, with no warranty. It&rsquo;s a learning aid, not a
          certified language qualification.
        </P>
      </S>

      <S title="What we ask of you">
        <P>
          Use one account, and use it yourself. Please don&rsquo;t use the tutor for things
          that have nothing to do with learning Estonian. It runs on a key that costs money
          every time it&rsquo;s used, so each account has a daily limit, to stop one person
          using it all up for everyone else.
        </P>
        <P>
          Please don&rsquo;t write scripts that hammer the dictionary, the speech service or
          the tutor with requests. Ekilex and TartuNLP are free academic services, and this whole
          project depends on nobody abusing them.
        </P>
        <P>
          Be 13 or older, or have a parent agree first. Estonia sets the age at which
          somebody can agree to a service like this for themselves at 13, which is the
          youngest any country in the Union sets it. Nothing here checks, and saying so plainly
          is more use than a box anyone can tick. If you&rsquo;re a teacher signing up a class,
          that agreement is the one thing worth getting before you send the link.
        </P>
      </S>

      <S title="What you own">
        <P>
          Your deck, your review history, your tasks and your notes are yours. Export them
          whenever you like from Settings, in a format that restores into any installation.
          The dictionary joins two sources with different licenses, so it&rsquo;s worth being
          exact here. Every Estonian form and every example sentence
          comes from <a
            href="https://ekilex.ee"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >Ekilex</a> and is licensed <strong>CC BY 4.0</strong> by the Institute of
          the Estonian Language. Every English gloss that was not written for this project
          comes from <a
            href="https://en.wiktionary.org"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >English Wiktionary</a> and is licensed <strong>CC BY-SA 4.0</strong> by its
          contributors, which is the stricter of the two: a work built on it has to be
          shared on the same terms. Both are credited on the sign-in page and in the
          footer, and keeping them apart is how the dictionary was designed, not an accident.
        </P>
        <P>
          The order the commonest words are listed in comes from <a
            href="https://github.com/hermitdave/FrequencyWords"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >FrequencyWords</a>, a published count over the OpenSubtitles corpus, also
          licensed <strong>CC BY-SA 4.0</strong>. It decides nothing but an order: every
          word shown is the dictionary&rsquo;s own.
        </P>
        <P>
          Whether a spelling is an Estonian word at all, and which word it is a form of,
          is answered by a forms list built from Ekilex&rsquo;s own inflection tables, as
          published in <a
            href="https://github.com/KristjanPikhof/Estonian-Wordlist-Enriched-Ekilex"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >Estonian-Wordlist-Enriched-Ekilex</a> (<strong>CC BY-SA 4.0</strong>), and
          from <a
            href="https://github.com/Filosoft/vabamorf"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >Vabamorf</a>, Filosoft&rsquo;s open-source morphological tools for Estonian
          (<strong>LGPL</strong>). That list decides whether a word is accepted and never
          what a card teaches: no form from it is ever drilled or marked against.
        </P>
      </S>

      <S title="Ending it">
        <P>
          You can stop and delete your data whenever you like. An installation may cut off
          an account that&rsquo;s abusing the shared services described above.
        </P>
      </S>

      <S title="Which law applies">
        <P>
          Estonian law governs these terms and anything arising from them, and the Estonian
          courts are where a dispute ends up. Nothing here takes away a right you have as a
          consumer where you live: if the law of your own country gives you something these
          terms do not, that law wins.
        </P>
      </S>

      <S title="Changes">
        <P>
          If these terms change in a way that affects what happens to your data, the{" "}
          <Link href="/privacy" className="underline underline-offset-2">privacy page</Link>{" "}
          changes with them and both carry the date of the change.
        </P>
      </S>
    </Legal>
  );
}
