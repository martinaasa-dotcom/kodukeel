import { Braced } from "@/components/Braced";
import { Speak } from "@/components/Speak";
import { chunkNote, isChip } from "@/lib/copy/chunks";

/**
 * AN EXPLANATION, ONE SMALL PIECE AT A TIME (`lib/copy/chunks.ts`).
 *
 * Each note is a card of its own, each sentence a line of its own, and the
 * Estonian a sentence points at is set apart on its own line: words as chips,
 * a whole line as an example with a speaker and its meaning under it. So a
 * reader finds the Estonian first and reads the English around it only if
 * they want it, where four paragraphs of prose asked them to read all of it to
 * find any of it. Nothing is cut; every word of the note is still here.
 *
 * Takes text that is already in the reader's language. `lang` marks a note
 * nobody has translated yet as English. No hooks, so a server page and a
 * client step draw it the same way.
 */
export function NoteChunks({ notes, lang }: {
  notes: readonly { readonly text: string; readonly lang?: string }[];
  lang?: string;
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2" data-note-chunks>
      {notes.map((note, n) => (
        <li
          key={n}
          lang={note.lang ?? lang}
          className="flex min-w-0 flex-col gap-3 rounded-[var(--r-lg)] border p-4 md:p-5"
          style={{ background: "var(--surface)", borderColor: "var(--edge)", boxShadow: "var(--depth-sm)" }}
          data-note-chunk
          data-untranslated={(note.lang ?? lang) === "en" ? "lesson" : undefined}
        >
          {chunkNote(note.text).map((s, i) => (
            <div key={i} className="flex flex-col gap-2">
              <p className="text-base leading-snug" style={{ color: "var(--ink)" }}><Braced text={s.text} /></p>
              {s.items.length > 0 && s.items.every(isChip) && (
                <p className="flex flex-wrap gap-1.5">
                  {s.items.map((item) => (
                    <span
                      key={item}
                      lang="et"
                      className="rounded-full px-3 py-1 text-base font-bold"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                    >
                      {item}
                    </span>
                  ))}
                </p>
              )}
              {s.items.length > 0 && !s.items.every(isChip) && s.items.map((item, k) => (
                <div
                  key={k}
                  className="flex flex-col gap-0.5 rounded-[var(--r-sm)] px-3 py-2"
                  style={{ background: "var(--accent-soft)" }}
                >
                  <span className="flex items-center gap-2">
                    <Speak text={item} size={14} />
                    <span lang="et" className="font-bold" style={{ color: "var(--accent-deep)" }}>{item}</span>
                  </span>
                  {s.gloss && k === s.items.length - 1 && (
                    <span className="text-base" style={{ color: "var(--ink-2)" }}>{s.gloss}</span>
                  )}
                </div>
              ))}
              {s.gloss && s.items.length > 0 && s.items.every(isChip) && (
                <p className="text-base" style={{ color: "var(--ink-2)" }}>{s.gloss}</p>
              )}
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
