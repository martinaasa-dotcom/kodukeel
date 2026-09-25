"use client";

import { useEffect, useRef, useState } from "react";
import { translateExample } from "@/app/actions";

/**
 * SENTENCES THIS SESSION HAS ALREADY ASKED ABOUT AND GOT NOTHING FOR.
 *
 * Nothing is drawn when a call comes back empty, which is the rule above and
 * is what makes the silence safe to read: it is also what makes it expensive
 * to leave unguarded. A reveal is a fresh mount, so a card met three times in
 * a session asked three times, and on a deployment with no key, a spent daily
 * allowance or a sentence this entry does not hold, every one of those is a
 * server action, a ledger reservation and a release, for ever, with nothing on
 * screen to say so. The failure a learner cannot see is the one nobody turns
 * off.
 *
 * Per tab rather than stored: a sentence with no line today may have one after
 * the next `npm run translate:examples` or once the operator adds a key, and a
 * reload is a low enough price to ask for that. Keyed on the sentence, because
 * the answer is a fact about the sentence rather than about the card that drew
 * it (`prisma/data/example-english.json` is keyed the same way), so a word that
 * borrows a line from another entry asks once across every screen that shows
 * it.
 */
const UNANSWERED = new Set<string>();

/**
 * THE WHOLE SENTENCE IN ENGLISH, WHEREVER AN ATTESTED SENTENCE IS SHOWN AS THE
 * REASON FOR A WORD.
 *
 * `WordIntro`'s own `SentenceEnglish` used to be the only place this ran, so
 * the first meeting of a word got a translation and every drill afterwards on
 * the very same sentence did not: a gap-fill, a dictation line, a government
 * example, all illustrating a word with a sentence nobody could read past the
 * one word being asked about. One component rather than a second copy per
 * screen, for the reason `WordIntro` already gives about itself.
 *
 * IT IS A LINE AND NEVER A CONTROL. This used to draw a button reading "Say
 * the whole thing in English", with a spinner and an error line under it, and
 * all three were reported off one gap reveal: the button asks a learner to
 * press for the one thing that makes the sentence above it readable, and the
 * error under it ("That sentence is not on this word.") is a sentence about
 * this app's own storage, drawn under somebody's card, mid-round, about
 * something they had no part in and can do nothing about. A failure may not
 * misname its cause and this one could not name a cause a learner has. So
 * there is one outcome on screen: the English, once there is one. A call that
 * comes back with nothing leaves the screen exactly as it was before this
 * existed, which is what it already did for a deployment with no model and for
 * a line a reviewer took off as wrong.
 *
 * `ask` IS THE ONE THING A CALLER DECIDES, and there are two honest answers
 * rather than one. A screen showing a learner one sentence, which is every
 * round and every first meeting, asks on arrival: the English is the point of
 * showing it. A screen showing a word's whole shelf of sentences, which is the
 * dictionary entry, and one dealing forty cards a minute, which is the sprint,
 * ask for none: eight sentences is eight calls against the deployment's own
 * daily cap, spent on seven a reader did not stop at. Both print the line the
 * dictionary already holds, which is nearly every sentence in the app, since
 * `npm run translate:examples` ships 16,175 of them; what "never" costs is a
 * call, never a line somebody would otherwise have read.
 */
export function SentenceTranslation({ lexemeId, et, en, canTranslate, ask = "onArrival", onTranslated }: {
  lexemeId: string | null;
  et: string;
  en: string | null;
  canTranslate: boolean;
  /** Whether a call may be spent on this sentence. See the note above. */
  ask?: "onArrival" | "never";
  /** Told what came back, for a caller keeping its own copy of the sentence. */
  onTranslated?: (en: string) => void;
}) {
  const [got, setGot] = useState<string | null>(en);
  const asked = useRef(false);

  /*
    Every caller mounts this keyed on the sentence itself, the way `WordIntro`
    always did: without it a session that draws one card after another
    through this same position would open the next sentence carrying the
    last one's English.
  */
  useEffect(() => {
    if (ask === "never" || got || !canTranslate || !lexemeId || asked.current) return;
    if (UNANSWERED.has(et)) return;
    asked.current = true;
    let live = true;
    void (async () => {
      const result = await translateExample(lexemeId, et).catch(() => null);
      // A refusal, a sentence this entry does not hold, a spent allowance: none
      // of those is news a learner can act on, so none of them is drawn, and
      // none of them is asked about twice in one sitting.
      if (!result) return; // no answer at all is not an answer, so it may be asked again
      if (!result.ok) {
        UNANSWERED.add(et);
        return;
      }
      if (live) setGot(result.en);
      onTranslated?.(result.en);
    })();
    return () => { live = false; };
    // Once per sentence: the ref is the guard, and the sentence is the key
    // the parent mounts this on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!got) return null;

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
      {got}
    </p>
  );
}
