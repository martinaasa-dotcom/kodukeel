import { Suspense } from "react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Legal, P, S } from "@/components/Legal";
import { rich } from "@/components/Rich";
import { tr, type Locale } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { databaseAnswersRecently } from "@/lib/health";
import { resolveOperator } from "@/lib/legal/operator";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";
import { publicCard } from "@/lib/copy/publicCards";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "Help", undefined, publicCard("/help"));
}

/*
  Whether the app is working is asked when the page is read, and who runs it
  is a fact about the deployment, so nothing here can be baked at build time.
*/
export const dynamic = "force-dynamic";

/**
 * THE PAGE SOMEBODY OPENS WHEN THEY CANNOT GET IN.
 *
 * A person who cannot sign in, and a school's IT contact asked whether the app
 * is down, had nowhere to go: every other page that might help is behind the
 * sign-in they are stuck at. This page is public, linked from under the
 * sign-in form and from the foot of every public page, and says the next thing
 * to try.
 *
 * Every answer is one the code makes. The sign-in advice is what the sign-in
 * screen itself says (`app/(chromeless)/sign-in/`): open the link in the
 * browser that asked for it, a link works once and lasts an hour, and the way
 * you signed in the first time is the account your words are in. The Settings
 * labels are the labels Settings draws. Nothing is said about the mail's
 * sender or how fast it arrives, which depend on hosted settings no code here
 * decides.
 *
 * The status line asks the database the way `/api/health` does
 * (`lib/health.ts`) and says one of two sentences and nothing else: no host,
 * no version, no error text, no figures. It streams in behind the rest of the
 * page, so a database taking its two seconds to fail never holds the advice
 * under it back.
 */
export default async function HelpPage({ searchParams }: { searchParams: PublicSearch }) {
  const { locale, explicit } = await resolvePublicLocale(searchParams);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  const contact = resolveOperator().email;

  return (
    <Legal title={t("Help")} updated="14 October 2026" locale={locale} explicit={explicit} path="/help">
      <S id="status" title={t("Is it working?")}>
        <Suspense fallback={<P>{t("Checking…")}</P>}>
          <Status locale={locale} />
        </Suspense>
      </S>

      <S id="sign-in" title={t("I can’t sign in.")}>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>{t("Sign in the same way you did the first time, with Google or with the emailed link, and with the same address. A different address is a different account, with none of your words in it.")}</li>
          <li>{t("If you asked for a link, look in your spam folder too.")}</li>
          <li>{t("Open the link in the same browser you asked for it in. A link works once and stops working after an hour, so if yours is older, ask for a new one.")}</li>
          <li>{t("Check the address the link went to is the one you typed. If it was mistyped, use a different address and ask again.")}</li>
        </ul>
        <P>
          <Link href={locale === "en" ? "/sign-in" : `/sign-in?lang=${locale}`} className="underline underline-offset-2">
            {t("Back to sign in")}
          </Link>
        </P>
      </S>

      <S id="data" title={t("Taking my data out, or deleting my account.")}>
        <P>
          {rich(t("Both are in Settings, once you’re signed in. **Download a backup** under “Your data” gives you everything as one file, and **Delete everything** under “Deleting your data” removes your account and all of it."))}
        </P>
      </S>

      <S id="report" title={t("A word or a translation looks wrong.")}>
        <P>{rich(t("Press **Suggest a fix** on the screen where you saw it. It sends what was on that screen with your note, so the person who checks it can see exactly what you saw."))}</P>
      </S>

      <S id="teacher" title={t("What my teacher can see.")}>
        <P>
          {rich(t("Your name and your effort, such as reviews this week, your streak and words known, and the one case you find hardest. Never your deck, your searches or your answers. {more}"), {
            more: <Link href={href("/trust")} className="underline underline-offset-2">{t("How the data is handled")}</Link>,
          })}
        </P>
      </S>

      {contact && (
        <S id="contact" title={t("Writing to us.")}>
          <P>
            {rich(t("If none of this helps, write to {email}."), {
              email: <a href={`mailto:${contact}`} className="underline underline-offset-2">{contact}</a>,
            })}
          </P>
        </S>
      )}
    </Legal>
  );
}

async function Status({ locale }: { locale: Locale }) {
  const working = await databaseAnswersRecently();
  return (
    <P>
      <span data-status={working ? "working" : "not-working"}>
        {tr(locale, working
          ? "Everything is working."
          : "Something is not working right now. Reviews you already have open keep working without a connection.")}
      </span>
    </P>
  );
}
