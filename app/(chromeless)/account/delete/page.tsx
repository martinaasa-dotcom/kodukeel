import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ButtonLink } from "@/components/Button";
import { Legal, P, S } from "@/components/Legal";
import { rich } from "@/components/Rich";
import { viewerId } from "@/lib/auth/session";
import { tr } from "@/lib/copy/locale";
import { localeHref } from "@/lib/copy/publicLocale";
import { publicCard } from "@/lib/copy/publicCards";
import { publicTitle, resolvePublicLocale, type PublicSearch } from "@/lib/progress/publicLocale";

export async function generateMetadata({ searchParams }: { searchParams: PublicSearch }) {
  return publicTitle(searchParams, "Deleting your account", undefined, publicCard("/account/delete"));
}

/* Whether somebody is signed in decides where the button goes, which is a fact about the request. */
export const dynamic = "force-dynamic";

/**
 * HOW TO DELETE AN ACCOUNT, FOR SOMEBODY WHO MAY NOT HAVE THE APP (N-8, D8).
 *
 * Google Play asks an app that makes accounts for a web link that explains how
 * to delete one and works without the app installed, and that link goes into
 * the Play Console's Data safety form (`docs/46-store-listing.md`). This is
 * it. It says what is deleted and what is not in the words `/privacy` already
 * uses, and sends the reader to the one place the deletion happens: Settings,
 * after signing in if they are not. It deletes nothing itself, and the only
 * thing it reads about the request is whether somebody is signed in, so the
 * button goes to Settings or to the sign-in first.
 *
 * Public, so it is in `isPublicPath`, the sitemap and `llms.txt`, and it says
 * nothing about anybody.
 */
export default async function DeleteAccountPage({ searchParams }: { searchParams: PublicSearch }) {
  const [{ locale, explicit }, viewer] = await Promise.all([resolvePublicLocale(searchParams), viewerId()]);
  const t = (english: string) => tr(locale, english);
  const href = (to: string) => localeHref(to, locale, explicit);
  const settings = "/settings?tab=account";
  const signIn = `/sign-in?next=${encodeURIComponent(settings)}${locale === "en" ? "" : `&lang=${locale}`}`;
  const path = (row: string) => <strong>{t("Settings")} → {t("Account and data")} → {t(row)}</strong>;

  return (
    <Legal title={t("Deleting your account")} updated="24 October 2026" locale={locale} explicit={explicit} path="/account/delete">
      <P>
        {t("You can delete your Kodukeel account, and everything it holds, whenever you like. It takes one press, and nobody has to agree to it. This page deletes nothing itself: it tells you where the button is.")}
      </P>

      <S id="how" title={t("How to delete it")}>
        <P>
          {rich(viewer
            ? t("You’re signed in. Open {path} and press **Delete everything**. You’ll be asked to type a word to confirm.")
            : t("Sign in first, the same way and with the same address you used before. Then open {path} and press **Delete everything**. You’ll be asked to type a word to confirm."), {
            path: path("Deleting your data"),
          })}
        </P>
        <P>{t("In the Kodukeel app on a phone, the same choice is in its settings.")}</P>
        <div className="pt-1">
          <ButtonLink href={viewer ? settings : signIn}>
            {viewer ? t("Open Settings") : t("Sign in to delete it")}
          </ButtonLink>
        </div>
      </S>

      <S id="deleted" title={t("What is deleted")}>
        <P>
          {t("Every card, review, task, setting, scanned page, level check, mock exam paper with your composition in it, tutor message, suggested fix, starred word, word put aside, badge and class membership, along with your sign-in record. All of it goes immediately, in one go.")}
        </P>
      </S>

      <S id="kept" title={t("What is not")}>
        <P>
          {t("The shared dictionary stays, because other learners have cards built on it, but any entry you edited stops being attributed to you.")}
        </P>
        <P>
          {rich(t("If this installation is not set up to delete the sign-in record itself, the button says so, and the address on the {privacy} page is who to ask."), {
            privacy: <Link href={href("/privacy")} className="underline underline-offset-2">{t("Privacy")}</Link>,
          })}
        </P>
        <P>
          {t("There is no separate archive, and no backup that outlives a deletion by more than the hosting provider’s own retention window.")}
        </P>
      </S>

      <S id="before" title={t("Before you delete")}>
        <P>
          {rich(t("Take an export first: this keeps no copy. {path} gives you everything as one file, and the same file restores into a fresh installation."), {
            path: path("Your data"),
          })}
        </P>
      </S>
    </Legal>
  );
}
