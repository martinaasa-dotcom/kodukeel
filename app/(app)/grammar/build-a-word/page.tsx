import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { ArrowLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth/session";
import { caseWalk } from "@/lib/progress/caseWalk";
import { Empty, Page, Stack } from "@/components/ui";
import { BuildWalk } from "./BuildWalk";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build a word · three forms, eleven endings",
  description:
    "The Estonian case system on one screen: the three forms that are memorized, the one the endings "
    + "go on, and each of the eleven endings in a sentence somebody wrote.",
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
  const walk = await caseWalk(ownerId);

  return (
    <Page
      eyebrow="Start here"
      title="Build a word"
      lead="Three forms are memorized. The other eleven are one of them plus an ending."
      actions={
        <Link
          href="/grammar"
          className="press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-ui hover:-translate-y-px"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink-2)" }}
        >
          <ArrowLeft size={14} aria-hidden /> All endings
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
            title="The dictionary is not answering"
            body="Nothing here is written by hand, so with no words there is nothing to build."
            action={<Link href="/grammar" className="underline" style={{ color: "var(--accent-deep)" }}>Read the endings instead</Link>}
          />
        </Stack>
      ) : (
        <BuildWalk walk={walk} />
      )}
    </Page>
  );
}
