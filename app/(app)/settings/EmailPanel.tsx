"use client";

import { useState, useTransition } from "react";
import { Mail, Clock } from "lucide-react";

import { setEmailKind, setReminderHour } from "@/app/actions";
import { Explain } from "@/components/Explain";
import { ChoiceChip, ChoiceGroup } from "@/components/Choice";
import type { EmailKind } from "@/lib/email/letter";

/**
 * WHAT EACH LETTER IS, IN THE WORDS OF WHAT ARRIVES RATHER THAN OF WHAT IT IS
 * CALLED.
 *
 * "Tonight" is a key. What somebody deciding needs is the sentence that says
 * when it turns up and what is in it, because the question they are actually
 * answering is whether they want their evening interrupted, and no label
 * answers that.
 *
 * `welcome` is deliberately absent. It arrives once, in the first two days,
 * and by the time anybody is on this screen it has either come or never will,
 * so a switch for it is a control that does nothing. Nothing is hidden by
 * that: the one-click link in its own footer switches everything off, and
 * `OPTIONAL_KINDS` is what the unsubscribe route works from rather than this
 * list.
 */
const LETTERS: { kind: EmailKind; title: string; detail: string }[] = [
  {
    kind: "tonight",
    title: "A note on an evening you have not studied",
    detail:
      "At the hour below, when an evening is unfinished. Nothing on a day you have already done it.",
  },
  {
    kind: "milestone",
    title: "When a level's words have stuck",
    detail:
      "Rare, and always late: a word only counts once it has come back days later and been right.",
  },
  {
    kind: "shield",
    title: "When a shield covers a day you missed",
    detail:
      "Earned at seven, thirty and a hundred days, and spent silently. This is the only way to find out.",
  },
  {
    kind: "comeback",
    title: "One note if you have been away a while",
    detail: "At most one a fortnight, and never a count of the days you missed.",
  },
  {
    kind: "errand",
    title: "One thing to say to a real person, once a week",
    detail:
      "A weekday morning, while the app can see you are not already speaking Estonian to people.",
  },
  {
    kind: "weekly",
    title: "A summary on Sunday morning",
    detail: "What the week held, and how far along the course you are.",
  },
];

/** The hours offered, which are the ones the calendar file already offered. */
const HOURS = ["08:00", "12:30", "18:00", "20:30"];

export function EmailPanel({
  off,
  reminderAt,
  sending,
}: {
  /** Kinds currently switched off. */
  off: ReadonlySet<string>;
  reminderAt: string | null;
  /** Whether this installation can send at all. */
  sending: boolean;
}) {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(LETTERS.map((l) => [l.kind, !off.has(l.kind)])),
  );
  const [hour, setHour] = useState(reminderAt ?? "18:00");
  const [, start] = useTransition();

  const toggle = (kind: EmailKind, on: boolean) => {
    setState((s) => ({ ...s, [kind]: on }));
    /*
      The write is not awaited and a failure puts the box back, which is
      `StarWord`'s rule: the honest thing to do with a press that did not land
      is to say so and leave everything as it was, rather than to promise it
      later. A preference is not a graded answer, so there is no outbox here.
    */
    start(() => {
      void setEmailKind({ kind, on }).then((result) => {
        if (!result?.ok) setState((s) => ({ ...s, [kind]: !on }));
      });
    });
  };

  const pickHour = (at: string) => {
    setHour(at);
    start(() => { void setReminderHour({ at }); });
  };

  return (
    <div className="flex flex-col gap-4">
      {!sending && (
        /*
          A screen full of switches that do nothing is worse than no screen.
          This installation has not configured a sending address, which is the
          state this repository ships in, and saying so is the same discipline
          `/privacy` takes about an operator nobody has named.
        */
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          This installation is not set up to send email, so none of these will arrive.
          Your answers are kept in case that changes.
        </p>
      )}

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="sr-only">Which emails to send</legend>
        {LETTERS.map((letter) => (
          <label
            key={letter.kind}
            className="choice-btn flex cursor-pointer items-start gap-3 rounded-xl p-3 text-left"
          >
            <input
              type="checkbox"
              checked={state[letter.kind] ?? true}
              onChange={(e) => toggle(letter.kind, e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm" style={{ color: "var(--ink)" }}>{letter.title}</span>
              <span className="block text-xs" style={{ color: "var(--ink-3)" }}>{letter.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div>
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
          <Clock size={16} aria-hidden style={{ color: "var(--accent-deep)" }} />
          The evening note, and the calendar reminder, are both read at this hour on your own clock.
        </p>
        {/*
          A RADIO GROUP, NOT FOUR SWITCHES.

          Four hours of which exactly one holds is the shape `ChoiceGroup`
          exists for, and the first version of this wore `aria-pressed` on four
          bare buttons instead. That announces as four unrelated toggles and
          costs four tab stops, where the group says "2 of 4" and takes one,
          which is the exact fault CLAUDE.md records the goal chips having had.
        */}
        <ChoiceGroup ariaLabel="Reminder hour" className="mt-2 flex flex-wrap items-center gap-2">
          {HOURS.map((at) => (
            <ChoiceChip key={at} selected={hour === at} onSelect={() => pickHour(at)} even>
              {at}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
        <p className="mt-2">
          {/*
            `pill` carries no styling. It is the marker that puts an anchor
            inside the coarse-pointer floor in `app/globals.css` and inside the
            sweep in `scripts/test-mobile.mjs`, and this link needs it for the
            reason that rule states: a link drawn as a control in a row of
            controls is a control, whatever element it is spelled with. Without
            it neither the floor nor the sweep can see it, which is a target a
            thumb has to hit that nothing measures.
          */}
          <a
            href={`/api/reminder?at=${encodeURIComponent(hour)}`}
            className="pill tap-tint inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm underline underline-offset-2"
            style={{ color: "var(--accent-deep)" }}
          >
            <Mail size={14} aria-hidden />
            Add it to your calendar
          </a>
        </p>
        <Explain label="What the calendar reminder is">
          An ordinary repeating event, not a notification. It fires on your phone whether or not
          this app is open, needs no permission from us, and you delete it like any other event.
          The hour is read on your own clock wherever you are, so it stays put when the clocks
          change, and it works whether or not the emails above are on.
        </Explain>
      </div>
    </div>
  );
}
