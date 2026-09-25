"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlignLeft, BarChart3, Eye, EyeOff, Keyboard, PenLine, Underline, Wand2 } from "lucide-react";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import {
  setCaseQuestionGloss, setClassDisplayName, setLetterBar, setResearchParticipation,
  setReviewMode, setWordGloss,
} from "@/app/actions";
import { Button } from "@/components/Button";
import { ChoiceCard, ChoiceGroup } from "@/components/Choice";
import { LetterSample } from "@/components/DiacriticBar";
import type { ReviewMode } from "@/lib/settings/store";
import { LETTER_BAR_CHOICES, type LetterBar } from "@/lib/ux/letterBar";
import { WORD_GLOSS_CHOICES, type WordGloss } from "@/lib/ux/wordGloss";
import { caseGlossDefaultFor, type CaseGlossPref } from "@/lib/estonian/caseGloss";
import type { Level } from "@/lib/collections/syllabus";
import type { Participation } from "@/lib/research/participation";
import { NOT_REACHED } from "@/lib/copy/values";

const MODES: { value: ReviewMode; label: string; detail: string; icon: typeof PenLine }[] = [
  {
    value: "type",
    label: "Type the answer",
    detail: "Stronger recall. Near misses get explained too, so a dropped õ isn't marked the same as a wrong word.",
    icon: PenLine,
  },
  {
    value: "flip",
    label: "Pick the answer",
    /*
      IT NO LONGER SAYS "JUDGE YOURSELF", BECAUSE IT NO LONGER DOES.

      This read "Classic flashcards: see the front, judge yourself, grade it.
      Faster, easier to fool yourself with", and the last four words were the
      problem rather than the honesty. A card whose answer the dictionary
      vouches for is marked by the app now, whichever option is chosen here,
      and this one asks for a tap instead of typing rather than asking for a
      verdict. See `askFor`.
    */
    detail: "Four forms of the same word, one tap. Lighter than typing on a phone, and still marked for you.",
    icon: Keyboard,
  },
];

export function ReviewModePanel({ current }: { current: ReviewMode }) {
  const [mode, setMode] = useState(current);
  const [, start] = useTransition();

  const pick = (next: ReviewMode) => {
    const was = mode;
    setMode(next);
    start(() => {
      void setReviewMode(next).catch(() => setMode(was));
    });
  };

  return (
    <ChoiceGroup ariaLabel="How review asks" className="grid gap-2 sm:grid-cols-2">
      {MODES.map((m) => (
        <ChoiceCard
          key={m.value}
          layout="stacked"
          selected={mode === m.value}
          onSelect={() => pick(m.value)}
          icon={<m.icon size={16} aria-hidden />}
          title={m.label}
          detail={m.detail}
        />
      ))}
    </ChoiceGroup>
  );
}

/**
 * The Estonian letter bar, on or off.
 *
 * The one screen that can turn it back on, so it is worth it being findable:
 * the bar itself carries the way out, and somebody who took it needs somewhere
 * obvious to change their mind. It draws the six letters it is talking about
 * rather than naming them, because "the diacritic bar" means nothing to
 * somebody who has met it once under a text box.
 *
 * The whole section is `letters-choice`, which is the same media query the bar
 * is drawn under. On a phone there is no bar and so no question, and a heading
 * over an answered-for-you choice is worse than no heading.
 */
export function LetterBarPanel({ current }: { current: LetterBar }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const pick = (next: LetterBar) => {
    setValue(next);
    // The bars on this very page, immediately. The refresh re-renders the same
    // attribute from the setting a moment later, so the two cannot disagree.
    root.current?.closest("[data-letters]")?.setAttribute("data-letters", next);
    start(async () => {
      /* A press that never reached the server puts the row back as it was,
         the attribute included, rather than letting the rejection take the
         screen: an uncaught one out of a transition renders the error page. */
      const landed = await setLetterBar(next).then(() => true).catch(() => false);
      if (!landed) {
        setValue(value);
        root.current?.closest("[data-letters]")?.setAttribute("data-letters", value);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div ref={root}>
      <ChoiceGroup ariaLabel="Typing Estonian" className="grid gap-2 sm:grid-cols-2">
        {LETTER_BAR_CHOICES.map((o) => (
          <ChoiceCard
            key={o.value}
            layout="stacked"
            disabled={pending}
            selected={value === o.value}
            onSelect={() => pick(o.value)}
            title={o.label}
            detail={<><LetterSample lit={o.value === "on"} />{o.detail}</>}
          />
        ))}
      </ChoiceGroup>
    </div>
  );
}

/**
 * Whether every word of an attested sentence is underlined and openable.
 *
 * Two cards rather than a switch, for the reason the research panel gives
 * about itself: "on" and "off" do not say what is being turned off, and
 * somebody who has met this once under a review card knows it as underlines
 * rather than as a feature with a name. Each side says what happens to the
 * sentence, and neither says which is the better learner to be.
 *
 * It sits under Meanings because that is what it is: the same question as
 * which language a gloss is given in, asked about the words around the one
 * being taught rather than about the word itself.
 */
export function WordGlossPanel({ current }: { current: WordGloss }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: WordGloss) => {
    setValue(next);
    start(async () => {
      const landed = await setWordGloss(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      // The answer is read on the server when a sentence is looked up, so the
      // screens holding one have to be built again rather than repainted.
      router.refresh();
    });
  };

  return (
    <ChoiceGroup ariaLabel="Words in a sentence" className="grid gap-2 sm:grid-cols-2">
      {WORD_GLOSS_CHOICES.map((o) => (
        <ChoiceCard
          key={o.value}
          layout="stacked"
          disabled={pending}
          selected={value === o.value}
          onSelect={() => pick(o.value)}
          icon={o.value === "on" ? <Underline size={16} aria-hidden /> : <AlignLeft size={16} aria-hidden />}
          title={o.label}
          detail={o.detail}
        />
      ))}
    </ChoiceGroup>
  );
}

/**
 * The English reading under a case question (`milles?` · `in what?`), forced
 * on, forced off, or left to follow the level.
 *
 * `current` is `null` for "follow my level", never for "unset": Settings
 * always has an opinion, it is just sometimes the level's own. The auto
 * option's own detail names what that means right now, off `level`, so
 * picking it says out loud what it is about to do rather than leaving
 * somebody to guess whether they are turning the reading on or off.
 */
export function CaseGlossPanel({ current, level }: { current: CaseGlossPref | null; level: Level }) {
  const [value, setValue] = useState<CaseGlossPref | "auto">(current ?? "auto");
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: CaseGlossPref | "auto") => {
    setValue(next);
    start(async () => {
      const landed = await setCaseQuestionGloss(next === "auto" ? "" : next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  const autoShows = caseGlossDefaultFor(level);

  return (
    <ChoiceGroup ariaLabel="English under a case question" className="grid gap-2 sm:grid-cols-3">
      <ChoiceCard
        layout="stacked"
        disabled={pending}
        selected={value === "auto"}
        onSelect={() => pick("auto")}
        icon={<Wand2 size={16} aria-hidden />}
        title="Follow my level"
        detail={autoShows ? `Shown, because ${level} still gets it.` : `Hidden, because ${level} has moved past it.`}
      />
      <ChoiceCard
        layout="stacked"
        disabled={pending}
        selected={value === "on"}
        onSelect={() => pick("on")}
        icon={<Eye size={16} aria-hidden />}
        title="Always show it"
        detail="Every case question keeps its English reading, at every level."
      />
      <ChoiceCard
        layout="stacked"
        disabled={pending}
        selected={value === "off"}
        onSelect={() => pick("off")}
        icon={<EyeOff size={16} aria-hidden />}
        title="Never show it"
        detail={<>Just <span lang="et">milles? kus?</span>, with nothing under it.</>}
      />
    </ChoiceGroup>
  );
}

/**
 * The name a class sees.
 *
 * This was an opt-in to a board of everybody on the deployment who had ticked
 * the same box, and that board is gone: sign-up here is open, so it drew a
 * table of strangers ranked by owner id, and it was the one surface where a
 * stranger chose what every other stranger read. See the note in
 * `app/(app)/progress/page.tsx`.
 *
 * What is left is the half that was always real. A class board shows the name
 * typed here rather than a Google account name, so being on one never means
 * publishing an email address or a legal name nobody chose to share, and
 * joining the class is the consent (ADR-019). There is nothing to opt into
 * from this screen any more, which is why the button went with the board.
 */
export function ClassNamePanel({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    start(async () => {
      const result = await setClassDisplayName({ displayName: name }).catch(() => null);
      setMessage(!result ? NOT_REACHED : result.ok ? "Saved." : result.error);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="display-name" className="label-xs" style={{ color: "var(--ink-3)" }}>
        Name your class sees
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="display-name"
          value={name}
          maxLength={32}
          onChange={(e) => setName(e.target.value)}
          placeholder="Whatever your class calls you"
          className="field min-w-0 flex-1 text-base"
          style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
        />
        <Button
          variant="primary"
          disabled={pending || name.trim() === currentName.trim()}
          onClick={save}
        >
          Save
        </Button>
      </div>
      {message && (
        <p role="status" className="text-xs" style={{ color: "var(--ink-3)" }}>{message}</p>
      )}
      {/*
        Beside the box rather than behind a press: this says what the field is
        for and who ends up reading it, which is both a form instruction and an
        assurance about a name a class is going to see. Either one keeps it on
        the screen.

        Two facts rather than the four the disclosure held. "Not your email,
        not your words, not your history" is one fact said three ways, and
        that leaving takes the name back off is a fact about the join rather
        than about this box, said on the screen where somebody decides to
        join. What is left is what a reader at this box needs, in one line.
      */}
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Used to greet you, and shown beside your week if you join a class. Nothing else goes with it.
      </p>
    </div>
  );
}

const PARTICIPATION: { value: Participation; label: string; detail: string; icon: typeof BarChart3 }[] = [
  {
    value: "in",
    label: "Count my answers",
    detail:
      "Adds them to the totals. Nothing is published that fewer than ten people are behind, and nothing in it can be traced back to one person.",
    icon: BarChart3,
  },
  {
    value: "out",
    label: "Leave mine out",
    detail:
      "Your answers are skipped when the totals are worked out. Everything else in the app carries on exactly as it did.",
    icon: EyeOff,
  },
];

/**
 * Whether this learner's answers are counted in the anonymous statistics.
 *
 * Two cards rather than a switch, because "on" and "off" do not say what is
 * being turned off, and this is the one setting on the page where somebody may
 * want to read a sentence before deciding. Both sides are stated in what they
 * do rather than in what they protect: a card that says "protect my privacy"
 * against one that says "help research" is not a choice, it is a nudge with two
 * labels on it.
 */
export function ResearchPanel({ current, exported }: { current: Participation; exported: boolean }) {
  const [value, setValue] = useState(current);
  const [, start] = useTransition();

  const pick = (next: Participation) => {
    const was = value;
    setValue(next);
    start(() => {
      void setResearchParticipation(next).catch(() => setValue(was));
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ChoiceGroup ariaLabel="Anonymous statistics" className="grid gap-2 sm:grid-cols-2">
        {PARTICIPATION.map((p) => (
          <ChoiceCard
            key={p.value}
            layout="stacked"
            selected={value === p.value}
            onSelect={() => pick(p.value)}
            icon={<p.icon size={16} aria-hidden />}
            title={p.label}
            detail={p.detail}
          />
        ))}
      </ChoiceGroup>
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        {exported
          ? "Which grammar learners here get wrong, counted across everybody, so that whoever teaches Estonian can see it. Which case, which stem change, which word. Never your deck, your searches or a single answer."
          : "This installation is not set up to produce those totals, so nothing is being counted anywhere. Your answer is kept in case that changes."}{" "}
        <Link href="/privacy" className="underline underline-offset-2">How this works</Link>.
      </p>
    </div>
  );
}
