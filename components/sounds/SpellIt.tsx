"use client";

import { useMemo, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/Button";
import { EstonianInput } from "@/components/EstonianInput";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";
import { spellOut, type SpellPart } from "@/lib/collections/spelling";
import { useSpeller } from "./useSpeller";

/**
 * SPELL YOUR NAME, IN A NATIVE SPEAKER'S VOICE.
 *
 * The one place a learner needs the letters' Estonian names is spelling
 * something out loud, and the first thing anybody spells is their own name.
 * So this takes a text and says it letter by letter in the recordings, with
 * each letter lighting as it is said: the tiles appear as somebody types, so
 * they see which letters their name is made of in this alphabet before they
 * hear any of it, and any one tile says its own name on a press.
 *
 * A letter Estonian has no name for (a digit, ł) is drawn struck through and
 * passed over, never guessed at (`lib/collections/spelling.ts`).
 */
export function SpellIt({ initial = "", label }: { initial?: string; label?: string }) {
  const t = useT();
  const [text, setText] = useState(initial);
  const parts = useMemo(() => spellOut(text), [text]);
  const { active, spell, stop, speaking } = useSpeller();
  const letters = parts.filter((p) => p.kind === "letter").length;

  const onChange = (next: string) => {
    if (speaking) stop();
    setText(next);
  };
  const press = () => {
    if (speaking) stop();
    else if (letters > 0) void spell(parts);
  };

  return (
    <div className="spell flex flex-col gap-3" data-spell>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-[1_1_14rem]">
          <EstonianInput
            value={text}
            onChange={onChange}
            onEnter={press}
            ariaLabel={label ?? t("A name to spell")}
            placeholder={t("Type your name")}
            compact
          />
        </div>
        <Button variant="secondary" onClick={press} disabled={letters === 0 && !speaking} className="shrink-0 whitespace-nowrap">
          {speaking ? <Square size={14} aria-hidden /> : <Volume2 size={15} aria-hidden />}
          {speaking ? t("Stop") : t("Spell it")}
        </Button>
      </div>
      {parts.length > 0 && (
        <ol className="spell-tiles" aria-label={t("Letter by letter")} data-spell-tiles>
          {words(parts).map((word) => (
            <li key={word[0]!.at} className="spell-word">
              <ol className="spell-word-tiles">
                {word.map(({ part, at }) => {
                  if (part.kind === "other") {
                    return (
                      <li key={at} className="spell-other" lang="et">
                        <span aria-hidden>{part.char}</span>
                        <span className="sr-only">{fill(t("{char}, which has no Estonian name"), { char: part.char })}</span>
                      </li>
                    );
                  }
                  if (part.kind !== "letter") return null;
                  return (
                    <li key={at}>
                      <button
                        type="button"
                        onClick={() => void spell([part])}
                        aria-label={fill(t("Hear the letter {letter}"), { letter: part.letter })}
                        data-live={active === at || undefined}
                        data-native={part.clip}
                        className="snd-key snd-key-sm press"
                      >
                        <span lang="et" className="snd-glyph">{part.letter}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The parts, as words: a pause ends one, so a name's letters wrap a word at a time and never mid-word. */
function words(parts: readonly SpellPart[]): { part: SpellPart; at: number }[][] {
  const out: { part: SpellPart; at: number }[][] = [[]];
  parts.forEach((part, at) => {
    if (part.kind === "pause") out.push([]);
    else out.at(-1)!.push({ part, at });
  });
  return out.filter((w) => w.length > 0);
}
