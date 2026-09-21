"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addExample } from "@/app/actions";
import { Button } from "@/components/Button";
import { EstonianInput } from "@/components/EstonianInput";
import { EstonianSentence } from "@/components/EstonianSentence";
import type { Example } from "@/lib/dict/examples";
import { isPhrase } from "@/lib/dict/pos";

/**
 * Example sentences on a dictionary entry.
 *
 * These are the most valuable thing on the page after the forms: a case
 * table tells you `toas` exists, a sentence tells you when an Estonian would
 * actually say it. Every one of them is attested — recorded by lexicographers
 * and served by Ekilex — which is why the app can build cloze exercises from
 * them without ever writing Estonian of its own.
 *
 * English is fetched one sentence at a time, on request. Ekilex has none on a
 * reader key, and translating eight sentences on every page view would be slow,
 * expensive and mostly unread.
 */
export function Examples({ lexemeId, examples, tutorReady, pos }: {
  lexemeId: string;
  examples: Example[];
  tutorReady: boolean;
  /** The entry's part of speech, because a phrase has no usages to be waiting for. */
  pos: string | null;
}) {
  const [list, setList] = useState(examples);
  const [adding, setAdding] = useState(false);

  if (list.length === 0 && !adding) {
    return (
      <div>
        <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>Näited · in a sentence</h3>
        {/*
          AN ABSENCE SOMEBODY CAN WAIT OUT, OR ONE THAT IS SIMPLY WHAT THE ENTRY
          IS. Ekilex records a usage against a *word*, so `Tere!` and `Kuidas
          läheb?` have none and never will: they are already the sentence. This
          told all twenty of the A1 phrases that one "shows up the first time you
          look this word up", which is a promise nothing was ever going to keep.
          The offer to add one stays either way, because a sentence somebody met
          in class using a phrase is worth having.
        */}
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {isPhrase(pos)
            ? "A phrase is already a sentence, so the dictionary keeps no example under it. "
            : "No example sentences for this word yet. Most common words have one, and it "
              + "shows up the first time you look this word up. "}
          You can{" "}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="underline"
            style={{ color: "var(--accent-deep)" }}
          >
            add one from class
          </button>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="label-xs mb-2 flex items-center gap-2" style={{ color: "var(--ink-3)" }}>
        Näited · in a sentence
        <span className="font-normal normal-case tracking-normal" style={{ letterSpacing: 0 }}>
          {list.length}
        </span>
      </h3>
      <ul className="flex flex-col gap-2">
        {list.map((example) => (
          <ExampleRow
            key={example.et}
            lexemeId={lexemeId}
            example={example}
            tutorReady={tutorReady}
            onTranslated={(en) =>
              setList((l) => l.map((e) => (e.et === example.et ? { ...e, en } : e)))
            }
          />
        ))}
      </ul>

      {adding ? (
        <AddExample
          lexemeId={lexemeId}
          onAdded={(example) => { setList((l) => [...l, example]); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="press mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-ui hover:-translate-y-px"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          <Plus size={13} aria-hidden /> Add a sentence of your own
        </button>
      )}
    </div>
  );
}

function ExampleRow({ lexemeId, example, tutorReady, onTranslated }: {
  lexemeId: string;
  example: Example;
  tutorReady: boolean;
  onTranslated: (en: string) => void;
}) {
  return (
    <li
      className="rounded-[var(--r)] px-4 py-3"
      style={{ background: "var(--raised)" }}
    >
      {/*
        The same drawing every other screen gives an attested sentence, rather
        than this file's own: it had a full second copy of `SentenceTranslation`
        inside it, which is two answers to what "say this in English" looks
        like and two places for one of them to stop working. No call is spent
        here, because an entry is a shelf of sentences and asking on arrival
        would spend one on each of the seven nobody stopped at; what the
        dictionary already holds is printed, which is nearly all of them.
      */}
      <EstonianSentence
        et={example.et}
        en={example.en ?? null}
        lexemeId={lexemeId}
        canTranslate={tutorReady}
        ask="never"
        speakLabel={`Hear "${example.et}"`}
        className="flex-1 text-base leading-snug"
        onTranslated={onTranslated}
      />

      {example.source === "USER" && (
        <span className="mt-1 block text-2xs" style={{ color: "var(--ink-3)" }}>your own sentence</span>
      )}
    </li>
  );
}

function AddExample({ lexemeId, onAdded, onCancel }: {
  lexemeId: string;
  onAdded: (example: Example) => void;
  onCancel: () => void;
}) {
  const [et, setEt] = useState("");
  const [en, setEn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    setError(null);
    start(async () => {
      const result = await addExample(lexemeId, et, en);
      if (result.ok) onAdded({ et: et.trim(), en: en.trim() || null, source: "USER" });
      else setError(result.error);
    });
  };

  return (
    <div
      className="pop-in mt-3 rounded-[var(--r-lg)] border p-4"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}
    >
      <p className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>Your sentence</p>
      <EstonianInput
        value={et}
        onChange={setEt}
        placeholder="A sentence from class, using this word"
        ariaLabel="Estonian sentence"
        autoFocus
      />
      <input
        value={en}
        onChange={(e) => setEn(e.target.value)}
        placeholder="English (optional)"
        aria-label="English translation"
        className="field mt-2 w-full text-sm"
        style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
      />
      {error && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--again-ink)" }}>{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={pending || et.trim().length < 4}>
          {pending ? "Saving…" : "Save sentence"}
        </Button>
      </div>
    </div>
  );
}
