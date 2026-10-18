import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { posterClassFor } from "@/lib/classroom/poster";
import { requireUserId } from "@/lib/auth/session";
import { canonicalOrigin } from "@/lib/auth/canonical";
import { joinLink, withoutScheme } from "@/lib/classroom/qr";
import { JoinQr } from "@/components/JoinQr";
import { PrintButton } from "@/components/PrintButton";
import { Wordmark } from "@/components/brand";
import { localeFor } from "@/lib/progress/locale";
import { fill, LOCALES, tr, type Locale } from "@/lib/copy/locale";

export const dynamic = "force-dynamic";

/**
 * THE JOIN CODE ON ONE SHEET OF PAPER, IN ALL THREE LANGUAGES AT ONCE.
 *
 * The first thing a teacher does with a class is put the code on the board,
 * and the class page offered a Copy button and nothing to print. This is one A4
 * sheet: the class's name, the code very large, the address, and three steps,
 * written in English, Russian and Ukrainian on the same sheet, because the room
 * is mixed and the sheet is printed once. Each block goes through `tr` with its
 * own language rather than the teacher's, so the translations live with the
 * app's others (`lib/copy/i18n/areas/app.ts`) and each block carries its `lang`.
 *
 * Owner only, like the code on the class page, and not for an archived class,
 * whose code no longer works: anybody else meets the not-found a stranger
 * meets, which confirms nothing about whether the class is real.
 *
 * Under the code sits the link that carries it, and a QR code of the same
 * link: a pupil who scans it or opens it signs in and lands on Classes with
 * the code already in the box (`joinCodeFrom`). The code still appears in the
 * address, in a browser's history and in a server's log, which is acceptable
 * for a code meant to be written on a board and killed by archiving the class.
 *
 * It says "13 and older" in every language, which is the operator's standing
 * decision about who may use the app (docs/35-launch-quick-wins.md, section 1),
 * and it promises no pupil accounts and no sign-in by code.
 */

async function ownClass(classroomId: string) {
  const ownerId = await requireUserId();
  const classroom = await posterClassFor(ownerId, classroomId);
  return classroom ? { classroom, ownerId } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const own = await ownClass(classroomId);
  if (!own) return { title: "Class" };
  const locale = await localeFor(own.ownerId);
  return { title: fill(tr(locale, "{class}, join poster"), { class: own.classroom.name }) };
}

/**
 * The address a student types, as short as it can be written: the deployment's
 * own canonical host where it names one, and otherwise the host the teacher
 * reached this page on, which is the one their class can reach too. Never a
 * path on its own, since a path on paper leads nowhere.
 */
async function addresses(code: string): Promise<{ address: string; link: string | null }> {
  const canonical = canonicalOrigin();
  const head = await headers();
  const host = head.get("host");
  const link = joinLink(code, { canonical, host, proto: head.get("x-forwarded-proto") });
  return { address: canonical ? canonical.host : host ?? "", link };
}

export default async function JoinPosterPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const own = await ownClass(classroomId);
  if (!own) notFound();
  const { classroom, ownerId } = own;
  const [locale, { address, link }] = await Promise.all([localeFor(ownerId), addresses(classroom.code)]);
  const t = (english: string) => tr(locale, english);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12 print:max-w-none print:p-0">
      <h1 className="sr-only">{fill(t("{class}, join poster"), { class: classroom.name })}</h1>
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/class/${classroom.id}`}
          className="flex items-center gap-1.5 text-sm"
          style={{ color: "var(--accent-deep)" }}
        >
          <ArrowLeft size={14} aria-hidden /> {t("Back to the class")}
        </Link>
        <PrintButton label={t("Print the join poster")} />
      </div>

      <section
        aria-label={t("Join poster")}
        className="join-poster rounded-[var(--r-xl)] border p-6 lg:p-10 print:rounded-none print:border-0 print:p-0"
        style={{ background: "var(--surface)", borderColor: "var(--rule)" }}
      >
        <div className="flex flex-col items-center text-center">
          <Wordmark size={34} />
          <p className="mt-6 text-2xl font-bold md:text-3xl print:text-4xl" style={{ color: "var(--ink)" }}>{classroom.name}</p>
          {/*
            The tracking is canceled after the last letter, or the code sits
            off center by the width of the space it leaves behind it. The screen
            steps up with the width, and stays small at 768, where the rail
            takes a third of it: six of the widest letters at 72 px ran 80 px
            past the card there. The paper gets the largest step. The three
            languages sit side by side from xl and on paper for the same reason.
          */}
          <p
            className="font-display tnum mt-6 whitespace-nowrap text-4xl font-bold tracking-[0.18em] sm:text-5xl lg:text-7xl print:text-8xl"
            style={{ color: "var(--ink)", marginRight: "-0.18em" }}
            data-join-code
          >
            {classroom.code}
          </p>
          {link ? (
            <>
              <p className="mt-4 text-xl font-semibold md:text-2xl print:text-3xl" style={{ color: "var(--accent-deep)" }} data-join-link>
                {withoutScheme(link)}
              </p>
              <JoinQr link={link} className="mt-6 h-40 w-40 md:h-48 md:w-48 print:h-56 print:w-56" />
            </>
          ) : address ? (
            <p className="mt-4 text-xl font-semibold md:text-2xl print:text-3xl" style={{ color: "var(--accent-deep)" }}>{address}</p>
          ) : null}
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-3 print:mt-16 print:grid-cols-3 print:gap-8">
          {LOCALES.map((l) => (
            <JoinSteps key={l} locale={l} address={address} />
          ))}
        </div>
      </section>
    </div>
  );
}

function JoinSteps({ locale, address }: { locale: Locale; address: string }) {
  const say = (english: string) => tr(locale, english);
  return (
    <div lang={locale} className="text-left">
      <p className="text-lg font-semibold print:text-xl" style={{ color: "var(--ink)" }}>{say("Learn Estonian with us")}</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-base leading-relaxed print:text-md" style={{ color: "var(--ink-2)" }}>
        <li>{address ? fill(say("Open {address}."), { address }) : say("Open the address above.")}</li>
        <li>{say("Sign in.")}</li>
        <li>{say("Choose Classes and enter the code. If you scanned the square or opened the link, it is already in the box.")}</li>
      </ol>
      <p className="mt-3 text-sm print:text-base" style={{ color: "var(--ink-3)" }}>{say("For learners aged 13 and older.")}</p>
    </div>
  );
}
