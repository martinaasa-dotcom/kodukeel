/**
 * AN ENGLISH SENTENCE WITH ITS ESTONIAN MARKED.
 *
 * A lesson writes the Estonian inside an English sentence in braces, `{mina}`
 * (`lib/course/lessons/types.ts`), so the ledger can hold it to the
 * not-taught-yet rule and the screen can set it as Estonian: bold, and
 * `lang="et"` so a screen reader says it with Estonian sounds. A sentence with
 * no braces comes back exactly as it was, which is every string anywhere else
 * in the app, so a component can pass its text through here whoever wrote it.
 *
 * No hooks, so a server page and a client round draw it the same way.
 */
export function Braced({ text }: { text: string }) {
  if (!text.includes("{")) return <>{text}</>;
  const parts = text.split(/(\{[^{}]+\})/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{") && part.endsWith("}")
          ? <span key={i} lang="et" className="font-semibold" style={{ color: "var(--ink)" }}>{part.slice(1, -1)}</span>
          : <span key={i}>{part}</span>,
      )}
    </>
  );
}
