"use client";

import { useState } from "react";
import { CloudOff, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { EstonianInput } from "@/components/EstonianInput";
import { Card, Empty } from "@/components/ui";
import { Mascot } from "@/components/brand";
import { useOffline } from "@/components/OfflineProvider";
import { useAnuChat, type Msg } from "@/components/anu/useAnuChat";
import { useStickToBottom } from "@/components/anu/useStickToBottom";
import { AnuFailure, Bubble, Provenance, SentenceCheck, Starters, sentenceCheckPrompt } from "@/components/anu/AnuParts";

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
  const { messages, streaming, answeredBy, failure, send } = useAnuChat(history);
  const { online } = useOffline();
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
    return (
      <Empty
        title={readerCanConfigure ? "Anu needs an AI key" : "Anu is not available"}
        body={readerCanConfigure
          ? "Everything else works without one. Settings has a walkthrough for getting a free key."
          : "Everything else here works without her."}
        action={
          <div className="flex flex-col items-center gap-4">
            {/* A question handed over by the card the learner just got wrong.
                Dropping it because this deployment has no key throws away the
                one thing they came here with, and the wording is gone by the
                time they get back. Shown, so it can be read and copied. */}
            {initialQuestion && (
              <p className="max-w-[48ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                You arrived with a question: <span style={{ color: "var(--ink)" }}>{initialQuestion}</span>
              </p>
            )}
            {readerCanConfigure && (
              <Button onClick={() => { window.location.href = "/settings"; }}>Open Settings</Button>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 ? (
        <Card tone="blush" className="flex items-start gap-4">
          <Mascot size={46} className="float shrink-0" />
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>Tere! Ma olen Anu.</p>
            <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Ask me anything about Estonian grammar. I&rsquo;ll always tell you the rule, not just the
              answer, and I&rsquo;ll say so if I&rsquo;m not sure of a form rather than guessing.
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--blush-ink)" }}>
              <Sparkles size={13} aria-hidden /> Pick a starter below, or just type.
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
        onOpen={() => setCheckOpen(true)}
        onClose={() => setCheckOpen(false)}
        onEstonian={setCheckEt}
        onMeaning={setCheckEn}
        onSubmit={() => {
          void send(sentenceCheckPrompt(checkEt, checkEn));
          setCheckEt("");
          setCheckEn("");
          setCheckOpen(false);
        }}
      />

      <Starters onPick={setInput} />

      {/*
        ANU NEEDS A CONNECTION, SAID BEFORE THE QUESTION IS TYPED RATHER THAN
        AFTER IT FAILS.

        Without this, asking offline typed the question, waited, and only
        then read "Lost the connection to Anu mid-answer", which is the
        review session's own fault pointed the other way: a control that
        looks live and is not. Everything already in the conversation stays
        readable, since that is stored on the page and needs nothing from the
        network; what is blocked is sending another one.
      */}
      {!online && (
        <Card tone="sky">
          <div className="flex items-start gap-3">
            <CloudOff size={18} aria-hidden style={{ color: "var(--sky-ink)" }} />
            <div>
              <p className="font-semibold" style={{ color: "var(--ink)" }}>Anu needs a connection.</p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
                Everything above still works. Ask her again once you are back online.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex-1">
          <EstonianInput
            value={input}
            onChange={setInput}
            onEnter={() => { if (online) { void send(input); setInput(""); } }}
            placeholder="Why is it raamatut and not raamatu?"
            ariaLabel="Ask Anu a question"
            autoFocus={Boolean(initialQuestion)}
          />
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => { void send(input); setInput(""); }}
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
