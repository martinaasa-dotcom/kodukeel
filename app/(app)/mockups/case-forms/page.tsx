import { prisma } from "@/lib/db";
import { buildCaseTable, stemsFrom } from "@/lib/estonian/derive";
import { CaseFormsMock, type MockRow } from "./CaseFormsMock";

/**
 * A MOCKUP, NOT A FEATURE: three ways to show where a form comes from on a
 * lesson's "How it works" step, drawn inside the app so the operator can choose
 * (B1 lesson 3, `b1-03-some-or-all`). Every form is the dictionary's own,
 * through `buildCaseTable`; nothing here is typed Estonian.
 */
export const metadata = { title: "Case forms mockup" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const lex = await prisma.lexeme.findFirst({
    where: { lemma: "õun", pos: "NOUN" },
    orderBy: { id: "asc" },
    select: { lemma: true, translation: true, forms: { select: { formType: true, value: true, morphCode: true } } },
  });
  const rows: MockRow[] = lex
    ? buildCaseTable(stemsFrom(lex.forms)).map((d) => ({
      key: d.spec.key,
      et: d.spec.et,
      ask: d.spec.asksThing,
      askEn: d.spec.asksThingEn,
      suffix: d.spec.suffix,
      principal: d.spec.principal,
      sg: d.singular ?? null,
      pl: d.plural ?? null,
    }))
    : [];
  const variant = v === "b" || v === "c" ? v : "a";
  return <CaseFormsMock rows={rows} variant={variant} />;
}
