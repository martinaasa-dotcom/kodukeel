import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Page } from "@/components/ui";
import { LESSONS } from "./index";

/*
  A LESSON'S GOAL IS ITS PAGE'S LEAD, AND ITS MARKS ARE DRAWN, NOT PRINTED.

  The runner hands the goal to `Page` as a string (`lead={t(lesson.goal)}`),
  and two audits read that line and reported a1-32's lead as showing
  "[seesütlev]" with its brackets. `Page` draws the lead through `Braced`,
  so the name is set as an Estonian term and the brackets go; this renders
  every goal that carries a mark and holds it there, so the lead cannot go
  back to printing the string without this failing.
*/
describe("a lesson's lead", () => {
  const marked = LESSONS.filter((l) => /[{[]/.test(l.goal));

  it("is found carrying a mark somewhere in the course", () => {
    expect(marked.map((l) => l.id)).toContain("a1-32-in");
  });

  it("draws a grammar name in brackets and Estonian in braces, never the marks themselves", () => {
    expect(marked.length).toBeGreaterThan(0);
    for (const l of marked) {
      const html = renderToStaticMarkup(createElement(Page, { title: l.title, lead: l.goal } as Parameters<typeof Page>[0], null));
      const lead = /<p[^>]*>(.*?)<\/p>/s.exec(html.slice(html.indexOf("</h1>")))?.[1] ?? "";
      expect(lead, l.id).not.toMatch(/[[\]{}]/);
      if (l.goal.includes("[")) expect(lead, l.id).toContain("data-term");
      if (l.goal.includes("{")) expect(lead, l.id).toContain("data-estonian");
    }
  });
});
