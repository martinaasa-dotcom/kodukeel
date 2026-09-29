"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { EstonianInput } from "@/components/EstonianInput";
import { Card } from "@/components/ui";
import { AnuFace } from "@/components/anu/AnuFace";
import { useAnuChat, type Msg } from "@/components/anu/useAnuChat";
import { useStickToBottom } from "@/components/anu/useStickToBottom";
import { AnuFailure, AnuOffline, Bubble, Provenance, SentenceCheck, Starters, sentenceCheckPrompt } from "@/components/anu/AnuParts";

export function TutorChat({
  configured, readerCanConfigure, plannedLabel, history, initialQuestion,
}: {
  configured: boolean;
  /** Whether this reader could set the key, or is a visitor to a site that has none. */
  readerCanConfigure: boolean;
  /**
   * The provider this deployment is set up to ask first. Replaced by the one
   * that actually answered as soon as a reply arrives, which is the whole
   * point: with a fallback chain configured, the model named at the top of
   * the route may not have written a word of what is on screen.
   */
  plannedLabel: string | null;
  history: Msg[];
  /** A question handed over from elsewhere: written into the box, not sent. */
  initialQuestion?: string;
}) {
  const { messages, streaming, answeredBy, failure, send, online } = useAnuChat(history);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkEt, setCheckEt] = useState("");
  const [checkEn, setCheckEn] = useState("");
  /*
    The page scrolls the document and the panel scrolls a box, which is why
    this used to be two pieces of code and is now one: the hook is handed the
    conversation and finds whichever ancestor owns the overflow. It also stops
    following once the reader scrolls up, which the version here did not, so
    re-reading the middle of a long answer while the next one streams no longer
    pulls the page out from under them.
  */
  const conversation = useStickToBottom(messages);

  if (!configured) {
    /*
      A night panel rather than an empty state: this is the one screen whose
      whole content is her, so saying she is off is the page. It says what she
      is for in the reader's own terms, what still works, and the one way on.
    */
    return (
      <Card tone="night" className="flex flex-col items-center gap-5 px-6 py-10 text-center md:py-12">
        <AnuFace size={76} mood="thinking" className="float" />
        <div className="max-w-[46ch]">
          <h2 className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>
            {readerCanConfigure ? "Anu needs an AI key" : "Anu isn't here right now"}
          </h2>
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {readerCanConfigure
              ? "She explains why a word takes the form it does, and checks sentences you write. Everything else works without her, and Settings walks you through getting a free key."
              : "Everything else here works just fine without her."}
          </p>
        </div>
        {/* A question handed over by the card the learner just got wrong.
            Dropping it because this deployment has no key throws away the
            one thing they came here with, and the wording is gone by the
            time they get back. Shown, so it can be read and copied. */}
        {initialQuestion && (
          <p
            className="max-w-[52ch] rounded-[var(--r-lg)] px-4 py-3 text-sm leading-relaxed"
            style={{ background: "rgb(255 255 255 / 0.08)", border: "1px solid rgb(255 255 255 / 0.14)", color: "var(--ink-2)" }}
          >
            Here&rsquo;s the question you came with: <span style={{ color: "var(--ink)" }}>{initialQuestion}</span>
          </p>
        )}
        {readerCanConfigure && (
          <ButtonLink href="/settings" variant="primary">Get a free key in Settings</ButtonLink>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 ? (
        <Card tone="blush" className="flex items-start gap-4">
          <AnuFace size={60} className="float shrink-0" />
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>Tere! Ma olen Anu.</p>
            <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Ask me anything about Estonian grammar. I&rsquo;ll tell you why, as well as what, and if
              I&rsquo;m not sure of a form I&rsquo;ll say so instead of guessing.
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--blush-ink)" }}>
              <Sparkles size={13} aria-hidden /> Pick a question below to start, or just ask your own.
            </p>
          </div>
        </Card>
      ) : (
        <div
          ref={conversation}
          className="flex flex-col gap-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation with Anu"
        >
          {messages.map((m, i) => <Bubble key={i} message={m} streaming={streaming && i === messages.length - 1} />)}
        </div>
      )}

      <SentenceCheck
        open={checkOpen}
        estonian={checkEt}
        meaning={checkEn}
        streaming={streaming}
        online={online}
        onOpen={() => setCheckOpen(true)}
        onClose={() => setCheckOpen(false)}
        onEstonian={setCheckEt}
        onMeaning={setCheckEn}
        onSubmit={() => {
          // Cleared only once it was sent: offline or mid-answer, send refuses.
          if (!send(sentenceCheckPrompt(checkEt, checkEn))) return;
          setCheckEt("");
          setCheckEn("");
          setCheckOpen(false);
        }}
      />

      <Starters onPick={setInput} />

      {/*
        Said before the question is typed rather than after it fails; the
        refusal itself is in useAnuChat's send, which every door here calls.
      */}
      <AnuOffline online={online} />

      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex-1">
          <EstonianInput
            value={input}
            onChange={setInput}
            onEnter={() => { if (send(input)) setInput(""); }}
            placeholder="Why is it raamatut and not raamatu?"
            ariaLabel="Ask Anu a question"
            autoFocus={Boolean(initialQuestion)}
          />
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => { if (send(input)) setInput(""); }}
          disabled={streaming || !input.trim() || !online}
        >
          <Send size={15} aria-hidden /> {streaming ? "Thinking…" : "Ask"}
        </Button>
      </div>

      <AnuFailure failure={failure} />

      <Provenance label={answeredBy ?? plannedLabel} answered={answeredBy !== null} />
    </div>
  );
}
