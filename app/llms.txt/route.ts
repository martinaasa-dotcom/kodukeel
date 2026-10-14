import { canonicalOrigin } from "@/lib/auth/canonical";

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
export const dynamic = "force-static";

const PAGES: readonly (readonly [string, string, string])[] = [
  ["/welcome", "What Kodukeel is", "the course, the dictionary, the conversations and who it is for"],
  ["/state-exam", "The Estonian language examination", "which level you need for what, and how to register"],
  ["/privacy", "Privacy", "what is stored, who receives it, and how to take it all away"],
  ["/terms", "Terms", "the terms of use and where the dictionary data comes from"],
  ["/trust", "Trust", "security, data protection and the controls behind them"],
  ["/help", "Help", "what to try when you cannot sign in, and whether the app is working"],
  ["/accessibility", "Accessibility", "how far the app meets WCAG 2.2, and where it falls short"],
  ["/funding", "Funding", "what it costs to run, and where every figure comes from"],
  ["/welcome/ru", "Kodukeel in Russian", "the front page for somebody who reads Russian first"],
  ["/welcome/uk", "Kodukeel in Ukrainian", "the front page for somebody who reads Ukrainian first"],
];

export function GET(): Response {
  const origin = canonicalOrigin();
  const at = (path: string) => (origin ? new URL(path, origin).toString() : path);
  const body = [
    "# Kodukeel",
    "",
    "> A free app for learning Estonian: a dictionary that shows every form of a word, a course of short evenings with spaced repetition, practice games, rehearsed conversations, and a grammar tutor.",
    "",
    "No language model writes the Estonian it teaches: the forms and the dictionary sentences come from Ekilex, the dictionary of the Institute of the Estonian Language. It is for people living in Estonia, and it explains Estonian in English, Russian or Ukrainian.",
    "",
    "Everything past these pages needs an account, so an agent following a link into the app reaches a sign-in form. There is no public API.",
    "",
    "## Public pages",
    "",
    ...PAGES.map(([path, title, what]) => `- [${title}](${at(path)}): ${what}`),
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
