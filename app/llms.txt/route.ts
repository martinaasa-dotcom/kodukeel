import { canonicalOrigin } from "@/lib/auth/canonical";
import { impactIsListed } from "@/lib/progress/impactListed";

/**
 * WHAT KODUKEEL IS, FOR A LANGUAGE MODEL READING THE SITE.
 *
 * `llms.txt` is a Markdown file at the root that says what a site is and links
 * the pages worth reading (llmstxt.org). PageSpeed's agentic browsing checks
 * it, and without one the gate answered `/llms.txt` with the sign-in page,
 * which failed the check as a file with no heading and no links.
 *
 * It names only the public pages the sitemap names, because everything else
 * is behind a sign-in and an agent following a link to it reaches a form. The
 * links are absolute where `NEXT_PUBLIC_SITE_URL` says where the app lives,
 * and relative where nobody has said, for the reason `app/sitemap.ts` gives.
 */
/*
  Dynamic for one line: /impact is listed only once its head count clears the
  research floors (docs/38-third-batch.md, D3), which is a fact about this
  deployment's database rather than about the build. The answer is held an
  hour per instance and the response says it may be cached for that hour.
*/
export const dynamic = "force-dynamic";

const PAGES: readonly (readonly [string, string, string])[] = [
  ["/welcome", "What Kodukeel is", "the course, the dictionary, the conversations and who it is for"],
  ["/state-exam", "The Estonian language examination", "which level you need for what, and how to register"],
  ["/privacy", "Privacy", "what is stored, who receives it, and how to take it all away"],
  ["/terms", "Terms", "the terms of use and where the dictionary data comes from"],
  ["/trust", "Trust", "security, data protection and the controls behind them"],
  ["/help", "Help", "what to try when you cannot sign in, and whether the app is working"],
  ["/teachers", "For teachers", "what a teacher sees of a class, shown over an invented one"],
  ["/pilots", "Running a pilot", "what a pilot costs, what is asked, and what is not ready yet"],
  ["/partners", "For partners and funders", "where a reviewer starts: what it is, what this installation has done, the course, how it uses Ekilex, what it costs, how it is checked and who runs it"],
  ["/curriculum", "What the course covers", "the A1 lessons part by part, then every unit above A1 by CEFR level, what each claims a learner can do, and which part of the state examination it prepares for"],
  ["/how-we-know", "How we know", "each claim the project makes about itself, with its figure, its date and the command that measures it"],
  ["/accessibility", "Accessibility", "how far the app meets WCAG 2.2, and where it falls short"],
  ["/funding", "Funding", "what it costs to run, and where every figure comes from"],
  ["/welcome/ru", "Kodukeel in Russian", "the front page for somebody who reads Russian first"],
  ["/welcome/uk", "Kodukeel in Ukrainian", "the front page for somebody who reads Ukrainian first"],
  ["/welcome/et", "Kodukeel in Estonian", "the front page for a reviewer who reads Estonian, beside the public pages, which take ?lang=et"],
  ["/grammar", "Estonian grammar", "how the grammar works in four stops, readable with no account"],
  ["/grammar/cases", "The fourteen cases", "every ending, what it means and the question it answers, with a page per case and per verb topic"],
  ["/grammar/build-a-word", "Build a word", "one word walked through the three stored forms and the eleven endings, with real sentences"],
];

/** Listed only while `impactIsListed` says so, which is why it is not in PAGES. */
const IMPACT: readonly [string, string, string] = ["/impact", "What this installation has done", "how many people use it and how they are getting on, in figures that cannot identify anybody"];

export async function GET(): Promise<Response> {
  const origin = canonicalOrigin();
  const at = (path: string) => (origin ? new URL(path, origin).toString() : path);
  const body = [
    "# Kodukeel",
    "",
    "> A free app for learning Estonian: a dictionary that shows every form of a word, a course of short evenings with spaced repetition, practice games, rehearsed conversations, and a grammar tutor.",
    "",
    "No language model writes the Estonian it teaches: the forms and the dictionary sentences come from Ekilex, the dictionary of the Institute of the Estonian Language. It is for people living in Estonia, and it explains Estonian in English, Russian or Ukrainian.",
    "",
    "The grammar reference under /grammar is readable with no account, apart from three pages that read a learner's own words. Everything else past these pages needs an account, so an agent following a link into the app reaches a sign-in form. There is no public API.",
    "",
    "## Public pages",
    "",
    ...(await impactIsListed() ? [...PAGES, IMPACT] : PAGES).map(([path, title, what]) => `- [${title}](${at(path)}): ${what}`),
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
