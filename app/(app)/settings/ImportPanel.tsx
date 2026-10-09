"use client";

import { useMemo, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { importWords } from "@/app/actions";
import { Button } from "@/components/Button";
import { DiacriticBar } from "@/components/DiacriticBar";
import { Card } from "@/components/ui";
import { SuggestFix } from "@/components/SuggestFix";
import { useLocale, useT } from "@/components/Locale";
import { countOf, fill } from "@/lib/copy/locale";

interface Row { lemma: string; translation: string; pos: string }

const EXAMPLE = `tuba - room
raamat - book
lugema - to read`;

/**
 * Format-agnostic importer. Speakly, Quizlet, a spreadsheet column, or a list typed
 * out from a class handout all arrive as the same thing: lines with two halves.
 */
function parse(text: string): Row[] {
  const rows: Row[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    // Tab, then a dash with spaces, then comma, then semicolon.
    const parts =
      line.includes("\t") ? line.split("\t")
      : DASH_SEPARATED.test(line) ? line.split(DASH_SEPARATED)
      : line.includes(";") ? line.split(";")
      : line.includes(",") ? line.split(",")
      : [line];

    const lemma = parts[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
    const translation = parts.slice(1).join(", ").trim().replace(/^["']|["']$/g, "");
    if (!lemma || !translation) continue;

    rows.push({ lemma, translation, pos: lemma.endsWith("ma") ? "VERB" : "OTHER" });
  }
  return rows;
}

/*
  A dash used as a separator in somebody else's word list.

  This reads dashes rather than writing one, which is why it is spelled with
  escapes: the reader-copy guard walks this file, and a literal em dash in it
  would be indistinguishable from copy. A pasted list from Speakly or a class
  handout uses whichever of the three its author typed.
*/
const DASH_SEPARATED = /\s[\u2013\u2014-]\s/;

export function ImportPanel() {
  const t = useT();
  const locale = useLocale();
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  /* Set when the import itself was refused, which is the only outcome here a
     person cannot fix by editing their own paste. */
  const [refused, setRefused] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rows = useMemo(() => parse(text), [text]);

  const submit = () => {
    start(async () => {
      const r = await importWords(rows);
      // Refused for being too fast. Nothing was written, and the text stays in
      // the box: a paste somebody spent a minute assembling must not be
      // cleared by a message telling them to try again.
      if (!r.ok) {
        setResult(t(r.error));
        setRefused(r.error);
        return;
      }
      setRefused(null);
      // A paste larger than the limit is handled, not rejected. Silently
      // dropping the tail would leave someone thinking it all went in. Each
      // is a sentence of its own, so they can follow one another in any language.
      const said = [
        r.created === 0
          ? t("Nothing new to add. You already have every one of these words.")
          : fill(t("Added {words} and {cards}."), { words: countOf(locale, r.created, "word"), cards: countOf(locale, r.cards, "card") }),
        r.created !== 0 && r.skipped.length ? fill(t("Skipped {n} you already had."), { n: r.skipped.length }) : "",
        r.truncated ? fill(t("Only the first {n} lines were read, so paste the rest in another go."), { n: r.limit }) : "",
      ];
      setResult(said.filter(Boolean).join(" "));
      setText("");
    });
  };

  return (
    <Card>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {t("Paste a word list from Speakly, a spreadsheet or a class handout. Put one word on each line, Estonian first and then its meaning. A tab, dash, comma or semicolon between them works.")}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={EXAMPLE}
        aria-label={t("Paste word list")}
        className="field-lg mt-3 w-full text-base"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
      />
      {/* This box is usually pasted into, but its own copy says "typed off a
          class handout", and a handout is exactly where the õ comes from. */}
      <div className="under-field"><DiacriticBar /></div>

      {rows.length > 0 && (
        <div className="mt-3">
          <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>
            {fill(t("{words} found. Check them before you add them"), { words: countOf(locale, rows.length, "word") })}
          </p>
          <ul className="scroll-host max-h-40 rounded-[var(--r)] border" style={{ borderColor: "var(--rule)" }}>
            {rows.slice(0, 40).map((r, i) => (
              <li
                key={i}
                className="flex justify-between gap-4 px-3 py-1.5 text-sm"
                style={{ borderTop: i ? "1px solid var(--rule-soft)" : undefined }}
              >
                <span lang="et" style={{ color: "var(--ink)" }}>{r.lemma}</span>
                <span style={{ color: "var(--ink-3)" }}>{r.translation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={submit} disabled={pending || rows.length === 0}>
          <Upload size={15} aria-hidden />
          {pending ? t("Adding…") : rows.length ? fill(t("Add {words}"), { words: countOf(locale, rows.length, "word") }) : t("Add words")}
        </Button>
        {result && (
          <p className="text-sm" style={{ color: refused ? "var(--again-ink)" : "var(--good-ink)" }}>{result}</p>
        )}
      </div>

      {refused && (
        <div className="mt-3">
          <SuggestFix
            category="BROKEN"
            trigger={`Importing a word list was refused: ${refused}`}
            label={t("Tell the Kodukeel team")}
          />
        </div>
      )}
    </Card>
  );
}
