import { BookOpen, Headphones, Mic, PenLine } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { P, S } from "@/components/Legal";
import { GUIDE, MATERIALS, READ_ON, SOURCES, type Fact } from "@/lib/exam/official";

export const metadata = {
  title: "The state examination",
  description: "What the Estonian language examination is, who needs which level, how to register, and what happens after.",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Spelled out rather than formatted by a locale, so every reader sees the same day. */
function spelledDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}

/** The sources a section cites, once each, in the order its facts cite them. */
function sourcesOf(facts: readonly Fact[]) {
  return [...new Set(facts.map((f) => f.source))].map((key) => SOURCES[key]);
}

/**
 * The state examination, for somebody who has not decided anything yet.
 *
 * Public, because the person most likely to need this has no account here and
 * is deciding whether to make one: they have been told they need B1 for a
 * permit or a job and want to know what that means before anything else. The
 * facts are `lib/exam/official.ts`, every one with the page it came from, and
 * this file only lays them out. It says where the mock exam fits and where it
 * stops imitating, and it sends people to the state's own free preparation
 * first, since that is the best there is and it is written by the people who
 * set the paper.
 */
export default function StateExamPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <Link href="/" className="label-xs inline-block" style={{ color: "var(--ink-3)" }}>
        Kodukeel
      </Link>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight" style={{ color: "var(--ink)" }}>
        The state examination
      </h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
        Read off the state&rsquo;s own pages on {spelledDay(READ_ON)}
      </p>

      {/*
        The examination at a glance, drawn: the four levels it sets and the four
        parts every level has. Both are facts the first section below states
        with its source, so this repeats them as a picture rather than adding a
        claim of its own.
      */}
      <div
        className="mt-8 grid gap-5 rounded-[var(--r-lg)] border p-5"
        style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
      >
        <div>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>Four levels</p>
          <ul className="mt-2 flex gap-2">
            {["A2", "B1", "B2", "C1"].map((level) => (
              <li
                key={level}
                className="font-display flex h-12 w-12 items-center justify-center rounded-[var(--r)] text-lg font-bold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
              >
                {level}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>Four parts, every level</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
            {[
              { name: "Writing", Icon: PenLine },
              { name: "Listening", Icon: Headphones },
              { name: "Reading", Icon: BookOpen },
              { name: "Speaking", Icon: Mic },
            ].map(({ name, Icon }) => (
              <li key={name} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--raised)", color: "var(--ink-2)" }}>
                  <Icon size={19} aria-hidden />
                </span>
                <span className="text-xs" style={{ color: "var(--ink-2)" }}>{name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <P>
          Every fact names the page it was read from. Rules and dates change, so check that page
          before you register.
        </P>

        {GUIDE.map((section) => (
          <S key={section.id} title={section.title}>
            <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {section.facts.map((fact) => (
                <li key={fact.text}>{fact.text}</li>
              ))}
            </ul>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              From{" "}
              {sourcesOf(section.facts).map((source, i) => (
                <span key={source.href}>
                  {i > 0 ? " and " : ""}
                  <a href={source.href} className="underline underline-offset-2" rel="noreferrer">
                    {source.label}
                  </a>
                </span>
              ))}
            </p>
          </S>
        ))}

        <S title="The best free preparation there is">
          <P>
            The Board publishes its own, free. Start here before anything else, this app included.
          </P>
          <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {MATERIALS.map((material) => (
              <li key={material.href}>
                <a href={material.href} className="underline underline-offset-2" rel="noreferrer">
                  {material.label}
                  {material.level ? `, ${material.level}` : ""}
                </a>
              </li>
            ))}
          </ul>
        </S>

        <S title="Where Kodukeel fits">
          <P>
            Kodukeel sets a mock paper at A2, B1, B2 and C1, and one of its own at A1. Each keeps
            the published clock, the points, the pass mark and the rule that no part may score
            nothing, and every task says which official task it stands in for. The questions are
            built from sentences a lexicographer recorded, so they are not the Board&rsquo;s own.
            Nothing here scores pronunciation, and it is free.
          </P>
          <P>
            <Link href="/exam" className="underline underline-offset-2">Sit a mock paper</Link>
            {" · "}
            <Link href="/welcome" className="underline underline-offset-2">What Kodukeel is</Link>
          </P>
        </S>
      </div>

      <p className="mt-14 text-sm" style={{ color: "var(--ink-3)" }}>
        <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
        {" · "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link>
        {" · "}
        <Link href="/accessibility" className="underline underline-offset-2">Accessibility</Link>
        {" · "}
        <Link href="/sign-in" className="underline underline-offset-2">Sign in</Link>
      </p>
    </main>
  );
}
