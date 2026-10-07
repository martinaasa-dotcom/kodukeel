import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { caseWalk } from "@/lib/progress/caseWalk";
import { Empty, Page, Stack } from "@/components/ui";
import { resolveProvider } from "@/lib/tutor/provider";
import { BuildWalk } from "./BuildWalk";
import { localeFor } from "@/lib/progress/locale";
import { tr } from "@/lib/copy/locale";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build a word from three forms and eleven endings",
  description:
    "See how Estonian cases work on one word: the three forms you learn by heart, the one the endings "
    + "go on, and each of the eleven endings in a real sentence.",
};

/**
 * THE SCREEN THAT COMES BEFORE THE REFERENCE.
 *
 * `/grammar` is fourteen cards, one per ending, and it is the right shape for
 * somebody who already knows which ending they are after. It is the wrong
 * shape for the first hour, when the number itself is the problem: fourteen
 * cases reads as fourteen things to learn, and the actual news is three.
 *
 * So this walks one word, of the reader's choosing, through the whole system
 * once: what is stored, which of the stored forms the endings are glued to,
 * and then the endings themselves with what each means and a sentence a
 * lexicographer wrote using it. `lib/progress/caseWalk.ts` is where the
 * Estonian comes from and every word of it is attested or derived by the same
 * function the dictionary entry uses; the English is
 * `lib/estonian/grammar.ts`, which holds no Estonian at all (ADR-005).
 *
 * THE SEGMENT IS `build-a-word` RATHER THAN `build`, which is the route name
 * the title asks for and the one `.gitignore` swallows: `build/` is in there
 * for the output directory every Node project has, it is unanchored, and a
 * route folder called that is a page nobody can commit. The first version of
 * this was written, typechecked, driven in a browser and reported clean by
 * `git status`, because git had never seen it.
 */
export default async function BuildPage() {
  const ownerId = await requireUserId();
  const [walk, locale] = await Promise.all([caseWalk(ownerId), localeFor(ownerId)]);
  const t = (english: string) => tr(locale, english);

  return (
    <Page route="/grammar/build-a-word"
      eyebrow={t("Start here")}
      title={t("Build a word")}
      lead={t("Learn three forms by heart. Every other case is one of them plus an ending.")}
      actions={
        <Link
          href="/grammar"
          className="press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink-2)" }}
        >
          <ArrowLeft size={14} aria-hidden /> {t("All endings")}
        </Link>
      }
    >
      {walk.words.length === 0 ? (
        <Stack>
          {/*
            The dictionary is unreachable and the seeded stems are gone too,
            which is a deployment that has not been set up rather than a
            learner who has not done anything yet. The way out is the reference,
            which is English prose and renders regardless.
          */}
          <Empty
            title={t("The dictionary isn't answering")}
            body={t("Every word here comes from the dictionary, so without it there's nothing to build.")}
            action={<Link href="/grammar" className="underline" style={{ color: "var(--accent-deep)" }}>{t("Read the endings instead")}</Link>}
          />
        </Stack>
      ) : (
        <BuildWalk canTranslate={resolveProvider() !== null} walk={walk} />
      )}
    </Page>
  );
}
