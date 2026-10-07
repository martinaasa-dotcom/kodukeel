"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, Languages, Loader2 } from "lucide-react";
import { completeOnboarding } from "@/app/actions";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { PlanPanel, minutesFor } from "@/components/assessment/PlanPanel";
import { ResultPanel } from "@/components/assessment/ResultPanel";
import { Button } from "@/components/Button";
import { LetterBarScope, LetterSample } from "@/components/DiacriticBar";
import { Mascot } from "@/components/brand";
import { NamedIcon } from "@/components/icons";
import { ChoiceCard, ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { Chip, Meter, Note, SectionTitle } from "@/components/ui";
import { DEADLINES, REASONS, TARGETS, deadlineFrom, firstSceneFor, impliedTarget, reasonsToStored, type Goals } from "@/lib/assessment/goals";
import { sceneById } from "@/lib/scenes/catalogue";
import { weeksToLearn, type Standing } from "@/lib/assessment/plan";
import { PRE_A1, type Band, type Item, type Level, type Placement } from "@/lib/assessment/types";
import { DEFAULT_LETTER_BAR, LETTER_BAR_CHOICES, type LetterBar } from "@/lib/ux/letterBar";
import {
  LOCALES, LOCALE_NAMES, MACHINE_NOTICE, MACHINE_NOTICE_EN, countOf, fill, tr, type Locale,
} from "@/lib/copy/locale";
import { LocaleProvider } from "@/components/Locale";
import { fillNodes } from "@/components/TemplateNodes";
import { DAY_MINUTES as COURSE_DAY_MINUTES } from "@/lib/course/types";
import { heldLevel, startingLevel } from "@/lib/course/placement";
import {
  DEFAULT_GLOSS_LANGUAGE, GLOSS_LANGUAGES, type GlossLanguage,
} from "@/lib/collections/glossLanguage";
import { Explain } from "@/components/Explain";
import { FitText } from "@/components/FitText";

/**
 * The deck a learner at one level starts with, sized by the server.
 *
 * `cards` is built rather than estimated: `previewUnits` runs the same card
 * generator the deck builder runs and counts what comes out. The screen used to
 * print `words * 2`, which is right only for a unit that drills nothing and is
 * out by a factor of five at A1, where every unit drills cases.
 */
/**
 * One part of the planned ladder, as first run shows it.
 *
 * The wizard needs the shape of the whole climb and the detail of one part, and
 * it is a client component, so the server flattens `lib/course/` into this
 * rather than shipping the builder to the browser.
 */
export interface CoursePart {
  id: string;
  level: string;
  title: string;
  subtitle: string;
  blurb: string;
  days: number;
  firstDay: { title: string; subtitle: string; words: number } | null;
}

export interface StarterDeck {
  /** The CEFR band this deck is the starting point for. */
  level: string;
  unitIds: string[];
  units: { id: string; title: string; subtitle: string; icon: string }[];
  /** Words the dictionary can actually fill. */
  words: number;
  /** Cards those words build. */
  cards: number;
  /** Units left at this level, so the screen can say what it is not giving them. */
  remaining: number;
}

/** The self-rated ladder, for a learner who would rather not sit the check now. */
/*
  All five, because the course runs to C1 and stopping the list at B2 told
  anybody above it that the app was not for them. Each is described by what a
  person can already do rather than by its code, since somebody who needs to
  pick a level is exactly somebody who does not know what B2 means.
*/
/*
  ONE VOICE, AND IT IS WHAT YOU CAN DO.

  The first two were written as things ("Tere, aitäh, and not much else yet")
  and the last three as the learner speaking ("I am able to comprehend and add
  to most conversations"), so the list changed person halfway down on the
  screen that decides somebody's year, ninety seconds into the app. The last
  one also assumed a motive nobody had been asked about. Every row is now the
  same shape as the first two, which is the shape CEFR itself uses: what you
  can already do.
*/
/*
  The beginner's row quotes two Estonian words, and no translation table may
  hold an Estonian letter (ADR-005), so the words go into a slot and only the
  sentence around them is translated. In English it reads exactly as it did.
*/
const FIRST_WORDS = "Tere, aitäh";
const LEVELS = [
  { key: "A1", label: "Just starting", detail: "{words}, and not much else yet." },
  { key: "A2", label: "I get by", detail: "You can shop, order things and put a simple sentence together." },
  { key: "B1", label: "Conversational", detail: "You can hold up your end of a clear conversation." },
  { key: "B2", label: "Confident", detail: "You can follow a meeting and read an article without stopping." },
  { key: "C1", label: "Fluent", detail: "Pretty much anything. You're here for the finer shades of meaning." },
] as const;

/*
  A1 (AND BELOW IT) IS WHERE FOUR NEW LETTERS FIRST APPEAR, SO THAT IS WHERE THEY ARE NAMED.

  õ, ä, ö and ü are not on an English keyboard and are not in English at all,
  so a beginner meets them on their very first word. Naming them here, once, at
  the level where they start mattering, beats a learner wondering what they
  are three screens later. Reassurance rather than a lesson: saying how each
  sounds is the recordings' job, not this note's. Shown wherever this screen
  lands somebody at A1 or below it, whether they picked the chip themselves or
  the check just placed them there, since both are the same beginner meeting
  the same four letters for the first time.
*/
/** The four letters, kept out of the translated sentences that name them. */
const NEW_LETTERS = { a: "õ", b: "ä", c: "ö", d: "ü" } as const;

function NewLettersNote({ t }: { t: (english: string) => string }) {
  return (
    <Note tone="sky">
      {fill(t("Estonian has four letters English doesn’t: {a}, {b}, {c} and {d}. You’ll see them everywhere. Don’t worry about saying them right yet. That comes with time."), NEW_LETTERS)}
    </Note>
  );
}

/**
 * The four paces, as review counts.
 *
 * The minutes are not listed here. They were, as a hand-written string per row,
 * beside a `minutesFor` in `PlanPanel` that computes the same number from the
 * same goal, and two of them printed as "About about 8 minutes a day" because
 * the sentence around them supplied the "About" as well. One of those is a
 * typo and the other is the reason it survived: a figure written down twice is
 * a figure nobody is checking. `minutesFor` is the one answer.
 */
const GOALS = [
  { value: 10, label: "Casual" },
  { value: 15, label: "Regular" },
  { value: 25, label: "Serious" },
  { value: 40, label: "Intense" },
] as const;

const STEPS = ["You", "Level", "Goal", "Tonight"] as const;

/**
 * First run.
 *
 * It was eight screens and it is now four, because the feedback on this app was
 * that it overwhelms somebody just getting started and eight screens of
 * questions before a single Estonian word is the first thing that happens to
 * them. What went is not the substance, it is the spreading of it: name, why,
 * how far, by when, days a week, level, pace, plan, tour and deck were ten
 * questions across eight screens, and four of them had a screen to themselves.
 *
 * What each screen is still for:
 *
 *   - **You** asks the one thing needed to greet somebody, and states what this
 *     app is and is not before they have spent an evening on it.
 *   - **Level** measures or estimates where they are. It comes second because
 *     everything after it is built on the answer.
 *   - **Goal** is why, how far, by when and how often, on one screen, with the
 *     plan those answers produce underneath them rather than on a screen of its
 *     own. Seeing the hours change as you answer is the argument for asking.
 *     Skippable in one press, because a learner in a hurry should be.
 *   - **Start** picks the daily goal and the first units. Last, because the
 *     plan has to be seen before anybody invests an evening in a deck.
 *
 * The tour that was step seven became a page and was then removed with it,
 * since the landing page already makes that case to somebody deciding and a
 * learner finds the rest by using the app (CLAUDE.md, "There is no page
 * describing this app"). The honest limits it led with are on the first screen
 * here in one sentence,
 * because that is where they earn their place: before the investment, not
 * after seven screens of it.
 */
export function WelcomeWizard({ starters, parts, suggestedName, paper, initialLocale }: {
  /** The starter deck for each level, sized by the server. */
  starters: StarterDeck[];
  /** The whole planned ladder, A1.1 to C1.3. */
  parts: CoursePart[];
  suggestedName: string;
  /** The level check, built server side. Empty when the dictionary cannot fill one. */
  paper: { items: Item[]; missing: string[]; seed: number; builtAt: number };
  /**
   * The language the wizard opens in: the one a Russian or Ukrainian front
   * page carried through sign-in, or English. Changed on the first screen.
   */
  initialLocale: Locale;
}) {
  const router = useRouter();
  /*
    THE LANGUAGE OF THE APP, CHOSEN BEFORE ANYTHING ELSE IS ASKED.

    Held here rather than read from the shell, because there is no shell yet
    and nothing has been saved: pressing a language redraws the whole wizard in
    it at once, and `completeOnboarding` stores it with everything else. The
    provider is for the panels drawn inside the wizard, the level check, its
    result and the plan, which read the language the way every screen does.
  */
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = (english: string) => tr(locale, english);
  const [step, setStep] = useState(0);
  /*
    A new step opens at the top of the page. The Continue button sits at the
    bottom of a screen that is often taller than the window, so without this
    the next step arrived scrolled to its own footer and the reader met the
    last question before the first.
  */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector("main")?.scrollTo?.({ top: 0, left: 0 });
  }, [step]);
  /*
    AND THE CARET GOES WITH IT, TO THE NEW STEP'S HEADING.
    Continue changes the whole question under the button, so a keyboard was
    left on Continue and a screen reader was told nothing had happened; Back on
    the second step and the skip link under the goal each take themselves away
    when pressed, which drops the caret on the body. Only after a press, never
    on the first render: arriving at first run is not a navigation.
  */
  /*
    Counted by press rather than read off `step`, because the level check
    hands back to the step it was opened from: the step does not change, the
    whole card is drawn again, and the caret still needs somewhere to land.
  */
  const card = useRef<HTMLDivElement>(null);
  const [presses, setPresses] = useState(0);
  const go = (next: number | ((s: number) => number)) => {
    setPresses((n) => n + 1);
    setStep(next);
  };
  useEffect(() => {
    if (presses === 0) return;
    card.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [presses]);
  const [name, setName] = useState(suggestedName);
  const [letters, setLetters] = useState<LetterBar>(DEFAULT_LETTER_BAR);
  const [gloss, setGloss] = useState<GlossLanguage>(DEFAULT_GLOSS_LANGUAGE);

  // A set, because almost nobody has one reason: living here, an Estonian
  // partner and a job where the meetings are in Estonian are three answers to
  // one question and the app used to make somebody pick a favorite.
  const [reasons, setReasons] = useState<string[]>([]);
  const [target, setTarget] = useState<Band | null>(null);
  /** True once the learner has pressed a target themselves, which ends the offer. */
  const [targetChosen, setTargetChosen] = useState(false);
  const [deadlineId, setDeadlineId] = useState<string>("1y");
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  const [checking, setChecking] = useState(false);
  const [measured, setMeasured] = useState<Placement | null>(null);
  const [estimated, setEstimated] = useState<string | null>(null);

  const [goal, setGoal] = useState<number>(15);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);

  /** The level everything downstream uses: measured if it was, stated if not. */
  const level: Level | null = measured ? measured.overall : (estimated as Band | null);
  /** The band the starting deck is chosen from. Below A1 starts at A1. */
  const startBand = level === null || level === PRE_A1 ? "A1" : level;
  /*
    Where they stand, for the plan, with how the app knows kept beside it. A
    measured check carries its scored skills, so a learner who reads at B2 and
    listens at A1 is costed skill by skill; a ticked level is a guess and the
    plan widens for it. Nothing yet is a guess of the app's: below A1.
  */
  const standing: Standing = useMemo(() => {
    if (measured && measured.overall !== null) {
      return {
        level: measured.overall,
        source: "measured",
        skills: measured.skills
          .filter((s) => s.measured && s.skill !== "speaking" && s.level !== null)
          .map((s) => s.level as Level),
      };
    }
    return { level: (estimated as Band | null) ?? PRE_A1, source: "estimated" };
  }, [measured, estimated]);

  const goals: Goals = useMemo(() => ({
    reason: reasonsToStored(reasons),
    target,
    deadline: deadlineFrom(DEADLINES.find((d) => d.id === deadlineId) ?? DEADLINES[4]!, new Date()),
    daysPerWeek,
    note: "",
  }), [reasons, target, deadlineId, daysPerWeek]);
  const firstSceneId = firstSceneFor(reasons);
  const firstScene = firstSceneId ? sceneById(firstSceneId) : undefined;

  const chooseLevel = (key: string) => {
    setEstimated(key);
    setMeasured(null);
  };

  /*
    THE OFFERED GOAL FOLLOWS THE REASONS UNTIL SOMEBODY OVERRULES IT.

    `setTarget((current) => current ?? implied)` was right while this was one
    reason and is wrong for a set, because the *first* tick fills the target in
    and every tick after it then finds one already there. Somebody choosing
    citizenship and then work was offered B1 and kept it, which is the level
    below the one their own answers ask for.

    So the app's own suggestion is tracked separately from the learner's. Until
    they press a target chip, the offer is the highest level any chosen reason
    needs, and it moves with the set; the moment they press one, it is theirs
    and nothing here touches it again.
  */
  const toggleReason = (id: string) => {
    setReasons((all) => {
      const next = all.includes(id) ? all.filter((r) => r !== id) : [...all, id];
      if (!targetChosen) setTarget(impliedTarget(next));
      return next;
    });
  };

  const chooseTarget = (band: Band) => {
    setTargetChosen(true);
    setTarget(band);
  };

  /*
    THE LEVEL THEY HOLD, AND THE ONE THE COURSE OPENS ON.

    A level named here is a level held: the chips describe what somebody can
    already do and a check reports the highest band passed, so a B1 speaker
    opens on B2.1 rather than being walked back through B1. The exceptions are
    the beginner, who holds nothing yet, and somebody aiming at the level they
    already have, who opens on its first part to make it solid. The server
    works the same answer out for itself (`completeOnboarding`) from the same
    function, so this screen and the course cannot name two different parts.
  */
  const held = measured
    ? heldLevel(measured.overall === null ? null : { kind: "measured", level: measured.overall })
    : heldLevel(estimated ? { kind: "declared", level: estimated } : null);
  const openLevel = startingLevel(held, target);

  /*
    The deck follows the level the course opens on, which is the answer to the
    questions two and three screens back. Nothing here is chosen twice.
  */
  const deck = starters.find((d) => d.level === openLevel) ?? starters[0] ?? null;

  /* Which part of the ladder they open on: the first one of that level. */
  const openingPart = parts.find((p) => p.level === openLevel) ?? parts[0] ?? null;
  const totalEvenings = parts.reduce((n, p) => n + p.days, 0);

  const finish = () => {
    setFailed(null);
    start(async () => {
      /*
        Read rather than awaited and forgotten. It can refuse now, when a press
        is repeated past its allowance, and a press that never reached the
        server rejects: pushing on to /course after either sends the learner
        back into first run with nothing saved and nothing said.
      */
      const result = await completeOnboarding({
        displayName: name,
        cefr: startBand,
        dailyGoal: goal,
        unitIds: deck?.unitIds ?? [],
        letterBar: letters,
        glossLanguage: gloss,
        uiLocale: locale,
        goals: {
          reason: goals.reason,
          target: goals.target,
          deadline: goals.deadline,
          daysPerWeek: goals.daysPerWeek,
          note: goals.note,
        },
      }).catch(() => null);
      if (!result) { setFailed("That didn’t go through, so nothing’s been saved yet. Press it again."); return; }
      if (!result.ok) { setFailed(result.error); return; }
      /*
        Straight to tonight's module rather than to Today. Somebody who has
        just been told what the evening is wants the evening, and a dashboard
        in between is one more screen to read before anything happens.
      */
      router.push("/course");
      router.refresh();
    });
  };

  // The check owns the screen while it runs: a wizard frame around a test is a
  // Back button somebody presses by accident nine questions in.
  if (checking) {
    return (
      <LocaleProvider locale={locale}>
      <LetterBarScope value={letters}>
        <main lang={locale === "en" ? undefined : locale} className="min-h-screen" style={{ background: "var(--ground)" }}>
          <AssessmentRunner
          items={paper.items}
          missing={paper.missing}
          seed={paper.seed}
          builtAt={paper.builtAt}
          /*
            Back to the level step, not past it.

            It used to jump to the goal screen, so somebody who had just spent
            twenty minutes on eighty questions was asked why they were learning
            Estonian and had to press Back to find out what they had scored.
            The result panel lives on step 1 and this is what puts it in front
            of them: the answer to the question they just sat, on the screen
            that asked it, with Continue underneath.
          */
          onFinish={(result) => {
            setMeasured(result);
            setChecking(false);
            go(1);
          }}
        />
        </main>
      </LetterBarScope>
      </LocaleProvider>
    );
  }

  const canContinue =
    (step !== 0 || name.trim().length > 0) &&
    (step !== 1 || level !== null);

  /*
    A `main` rather than a `div`, which is the whole of this change and was
    worth making. First run is the only screen in the app with no landmark on
    it at all: `app/(app)/layout.tsx` gives every signed-in route one and the
    skip link that goes with it, and sign-in and the landing page have their
    own. So the first screen anybody meets was the one screen a reader could
    not jump into, and it is four steps of form.
  */
  return (
    <LocaleProvider locale={locale}>
    <LetterBarScope value={letters}>
      <main lang={locale === "en" ? undefined : locale} className="relative flex min-h-screen flex-col justify-center px-5 py-10 md:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(70% 55% at 0% 0%, var(--wash-1), transparent 72%)" }}
      />

      <div
        ref={card}
        className="pop-in relative mx-auto w-full max-w-2xl rounded-[var(--r-xl)] border p-7 md:p-10"
        style={{ background: "var(--surface)", borderColor: "var(--rule)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="mb-8 flex items-center gap-4">
          <Mascot size={44} className="float shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="label-xs mb-2" style={{ color: "var(--accent-deep)" }}>
              {fill(t("Step {n} of {total}, {name}"), { n: step + 1, total: STEPS.length, name: t(STEPS[step]!) })}
            </p>
            <Meter pct={((step + 1) / STEPS.length) * 100} label={fill(t("Setup progress, step {n} of {total}"), { n: step + 1, total: STEPS.length })} />
          </div>
        </div>

        {step === 0 && (
          <section>
            {/*
              THE LANGUAGE, FIRST AND SMALL.

              Before the welcome, because everything under it is read in
              whatever is chosen here, and a newcomer who reads Russian or
              Ukrainian better than English should not have to get through a
              screen of English to find the switch. Each name is written in its
              own language, so it can be found by somebody who reads only that
              one. Choosing one redraws the wizard at once.

              The notice under it is the machine-translation one Settings and
              the shell carry, in the language chosen and in English beside it,
              said where the language is chosen because that is when it is
              true and worth knowing.
            */}
            <div className="mb-7">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Languages size={18} aria-hidden style={{ color: "var(--ink-3)" }} />
                <ChoiceGroup ariaLabel={t("Language of the app")} className="flex flex-wrap gap-2">
                  {/* English, and the language on screen: a Ukrainian page does
                      not offer Russian by name, or the reverse. Either is one
                      press away from English. */}
                  {LOCALES.filter((l) => locale === "en" || l === "en" || l === locale).map((l) => (
                    <ChoiceChip key={l} selected={locale === l} onSelect={() => {
                      setLocale(l);
                      /* A meaning language the new interface language no longer
                         offers goes back to English rather than staying hidden. */
                      if (gloss !== "en" && l !== "en" && gloss !== l) setGloss("en");
                    }}>
                      <span lang={l}>{LOCALE_NAMES[l]}</span>
                    </ChoiceChip>
                  ))}
                </ChoiceGroup>
              </div>
              {locale !== "en" && (
                <p data-machine-notice className="mt-3 max-w-[62ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  <span lang={locale}>{MACHINE_NOTICE[locale]}</span>{" "}
                  <span lang="en">{MACHINE_NOTICE_EN}</span>
                </p>
              )}
            </div>

            {/*
              The heading, then straight into the first question.

              What used to sit between them was "Kodukeel means home language.
              This is how Estonian becomes yours.", which is the right sentence
              on the wrong screen: it is the pitch, and the pitch belongs on the
              page somebody read before pressing the button that brought them
              here. Repeating it is the app introducing itself to somebody who
              has already agreed.

              And the limits moved to the bottom. They still have to be said
              before an evening goes into a deck, and they do not have to be the
              thing standing between the welcome and the name field.
            */}
            <FitText as="h1" text="Tere tulemast!" max="var(--text-3xl)" tabIndex={-1} lang="et" className="font-bold leading-tight outline-none" style={{ color: "var(--ink)" }} />

            <label htmlFor="learner-name" className="label-xs mt-8 block" style={{ color: "var(--ink-3)" }}>
              {t("What should we call you?")}
            </label>
            <input
              id="learner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder={t("Your name or a nickname")}
              className="field-lg mt-2 w-full text-md"
              style={{ borderColor: "var(--rule)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <p className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
              {t("We only use it to say hello, and to show your teacher if you ever join a class.")}
            </p>

            {/*
              THE ONE QUESTION ABOUT THE MACHINE RATHER THAN THE LEARNER, ON THE
              SCREEN THAT IS ALREADY ABOUT NEITHER THE LEVEL NOR THE PLAN.

              It is here rather than on a fifth screen. Four screens is the
              shape of this wizard and a question with a screen to itself is
              exactly the fault the last pass over it fixed: this one is a pair
              of buttons and it belongs beside the other thing we need before
              anybody starts typing Estonian.

              `letters-choice` is the same media query the bar itself is drawn
              under, so a phone is not asked. It gets the default written for
              it, which is what it wants: when that learner next opens the app
              on a computer the row is there, and one press removes it.

              Answered live, and the next screen is the level check, which is
              full of Estonian fields. Whatever is chosen here is what they
              meet there.

              It sits in its own panel because it was the most crowded thing on
              this screen: two cards each holding a title, six letter samples
              and a line of explanation, pressed straight up against the field
              above and the note below with the same 8px everything else on the
              page used.
            */}
            <div
              className="letters-choice mt-10 rounded-[var(--r-lg)] border p-5"
              style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
            >
              <ChoiceGroup
                label={fill(t("How do you type {a}, {b}, {c} and {d}?"), NEW_LETTERS)}
                className="grid gap-3 sm:grid-cols-2"
              >
                {LETTER_BAR_CHOICES.map((o) => (
                  <ChoiceCard
                    key={o.value}
                    layout="stacked"
                    selected={letters === o.value}
                    onSelect={() => setLetters(o.value)}
                    title={t(o.label)}
                    detail={<><LetterSample lit={o.value === "on"} />{t(o.detail)}</>}
                  />
                ))}
              </ChoiceGroup>
              <p className="mt-4 text-xs" style={{ color: "var(--ink-3)" }}>
                {t("You can change this any time, in Settings or right from the row of letters.")}
              </p>
            </div>

            {/*
              WHICH LANGUAGE A MEANING IS GIVEN IN, ASKED ON THE FIRST SCREEN.

              Most people learning Estonian in Estonia already speak Russian or
              Ukrainian, and this is the answer that decides whether the app is
              readable to them at all. Buried in Settings it would be found by
              the people who least need it. It is one row of three buttons, on
              the screen that already asks the other thing we need before
              anybody meets an Estonian word, and unlike the letter bar it is
              asked on a phone too: it is not a fact about the keyboard.

              English stays the default, so somebody who wants it presses
              nothing. The equivalents come from Ekilex, so nothing here was
              written by this app or by a model.
            */}
            <div
              className="mt-4 rounded-[var(--r-lg)] border p-5"
              style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
            >
              {/*
                Somebody reading this in Russian or Ukrainian is offered English
                and their own language, never the other one, which a great many
                of them would rightly find out of place in their own setting.
                The same rule as the Settings panel (GlossLanguagePanel).
              */}
              <ChoiceGroup
                label={t("What language would you like meanings in?")}
                className={`grid gap-3 ${locale === "en" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
              >
                {/* Somebody reading the app in Russian or Ukrainian is offered
                    English and their own language, never the other one, which
                    is the rule the Settings panel keeps for the same choice. */}
                {GLOSS_LANGUAGES.filter((o) =>
                  locale === "en" || o.id === "en" || o.id === locale || o.id === gloss,
                ).map((o) => (
                  <ChoiceCard
                    key={o.id}
                    layout="stacked"
                    selected={gloss === o.id}
                    onSelect={() => setGloss(o.id)}
                    title={t(o.label)}
                    detail={o.id === "en" ? t("Plain English meanings") : o.native}
                  />
                ))}
              </ChoiceGroup>
              <Explain label={t("What stays in English")}>
                {t("You’ll always see the English as well. The Russian and Ukrainian meanings come straight from the Estonian dictionary, written by the same people as the Estonian.")}
              </Explain>
            </div>

            {/*
              The limits, last and in one sentence.

              It used to carry a link to /guide reading "What it does and does
              not do, in full", and that page is gone: the landing page makes
              the case, and a learner who skipped it finds out what the app does
              by using it rather than by reading a second description of it. A
              link out of a setup wizard is a way to lose somebody ninety
              seconds in, and the sentence in front of it was already the part
              that mattered.
            */}
            <div className="mt-10">
              <Note tone="hard">
                {t("One honest note before you start: Kodukeel will not score your pronunciation, let an AI grade you, or replace a teacher. It’s where you rehearse. The real conversations happen out there.")}
              </Note>
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 tabIndex={-1} className="text-2xl font-bold leading-tight outline-none" style={{ color: "var(--ink)" }}>
              {t("Where are you now?")}
            </h1>
            {/*
              NO NUMBER OF MINUTES, AND THAT IS THE HONEST VERSION.

              This said "the ten-minute level check", which was written when the
              paper was nineteen questions. It is eighty now and a skill stops
              one band past the first it was not passed at, so ten minutes is
              true for a beginner and nowhere near true for anybody else: a B1
              learner was still in the reading section after ten minutes with
              three sections to go, having been promised the whole thing in
              that time. A figure that is right at one end of the range and
              three times out at the other is worse than no figure, because the
              learner who is furthest through is the one who was told wrong.
            */}
            <p className="mt-3 max-w-[54ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {t("Take the level check to find out, or just pick the one that sounds like you. The check stops as soon as it has found your level. Either way, you can change it later in Settings.")}
            </p>

            {measured ? (
              <div className="mt-6">
                <ResultPanel result={measured} heading={t("Measured just now")} />
                {(measured.overall === "A1" || measured.overall === PRE_A1) && (
                  <div className="mt-4">
                    <NewLettersNote t={t} />
                  </div>
                )}
                <Button variant="ghost" className="mt-4" onClick={() => { setMeasured(null); setChecking(true); }}>
                  {t("Take it again")}
                </Button>
              </div>
            ) : (
              <>
                {paper.items.length > 0 ? (
                  <Button variant="primary" size="lg" className="mt-7 w-full" onClick={() => setChecking(true)}>
                    <Compass size={16} aria-hidden /> {t("Take the level check")}
                  </Button>
                ) : (
                  <div className="mt-6">
                    <Note tone="sky">
                      {t("The level check isn’t ready on this copy of Kodukeel yet, because its dictionary hasn’t been loaded. For now, pick the level that sounds most like you.")}
                    </Note>
                  </div>
                )}

                <div className="mt-8">
                  <SectionTitle>{t("Or make a guess")}</SectionTitle>
                </div>
                <ChoiceGroup ariaLabel={t("Guess your level")} className="flex flex-col gap-3">
                  {LEVELS.map((l) => (
                    <ChoiceCard
                      key={l.key}
                      selected={estimated === l.key}
                      onSelect={() => chooseLevel(l.key)}
                      lead={l.key}
                      title={t(l.label)}
                      detail={fill(t(l.detail), { words: FIRST_WORDS })}
                    />
                  ))}
                </ChoiceGroup>

                {estimated === "A1" && (
                  <div className="mt-4">
                    <NewLettersNote t={t} />
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 tabIndex={-1} className="text-2xl font-bold leading-tight outline-none" style={{ color: "var(--ink)" }}>
              {t("Why Estonian?")}
            </h1>
            <p className="mt-3 max-w-[54ch] text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {t("Pick every one that’s true. We’ll suggest a level to aim for, and the plan at the bottom changes as you answer.")}
            </p>

            {/*
              A grid rather than a scrolling box. The reasons were in a
              `scroll-host` capped at a third of the viewport, which cut the
              seventh card in half with nothing to say it scrolled: a nested
              scroll region inside a page that already scrolls is the shape
              this pass exists to remove. Eight short rows in two columns fit
              without one.
            */}
            <ChoiceGroup
              ariaLabel={t("Why you are learning Estonian")}
              select="many"
              className="mt-6 grid gap-3 sm:grid-cols-2"
            >
              {REASONS.map((r) => {
                return (
                  <ChoiceCard
                    key={r.id}
                    selected={reasons.includes(r.id)}
                    onSelect={() => toggleReason(r.id)}
                    icon={<NamedIcon name={r.icon} size={18} aria-hidden />}
                    title={t(r.label)}
                    detail={t(r.detail)}
                  />
                );
              })}
            </ChoiceGroup>

            {/*
              Three rows of chips rather than three screens of cards, and the
              chip is the whole answer.

              Under the chosen one sat a paragraph pairing what the level lets
              you do with what it does not ("Manage most situations that come
              up... Still out of reach: keep up with fast speech between
              natives"). It is honest and it is the wrong screen for it: this is
              somebody choosing where they are headed, and a caveat that appears
              the moment they choose reads as the app arguing with them. The
              plan directly below already tells them how many hours that target
              costs, which is the version of the same warning they can act on.
              `TARGETS` keeps both strings; Settings still shows `can` on hover.
            */}
            <div className="mt-8 flex flex-col gap-7">
              <div>
                <SectionTitle>{t("What level are you aiming for?")}</SectionTitle>
                <ChoiceGroup ariaLabel={t("What level are you aiming for")}>
                  {TARGETS.map((tg) => (
                    <ChoiceChip key={tg.band} selected={target === tg.band} onSelect={() => chooseTarget(tg.band)}>
                      {tg.band}, {t(tg.label)}
                    </ChoiceChip>
                  ))}
                </ChoiceGroup>
              </div>

              <div>
                <SectionTitle>{t("By when?")}</SectionTitle>
                <ChoiceGroup ariaLabel={t("By when")}>
                  {DEADLINES.map((d) => (
                    <ChoiceChip key={d.id} selected={deadlineId === d.id} onSelect={() => setDeadlineId(d.id)}>
                      {t(d.label)}
                    </ChoiceChip>
                  ))}
                </ChoiceGroup>
              </div>

              <div>
                <SectionTitle hint={t("be honest, the plan is built on it")}>{t("Days a week you will really practice")}</SectionTitle>
                {/* Six to a row, always: wrapped as free chips, the 7 fell onto a
                    line of its own at 390, which reads as a seventh option the
                    app forgot about rather than the end of the week. */}
                <ChoiceGroup ariaLabel={t("Days a week you will really practice")} className="grid max-w-sm grid-cols-6 gap-2">
                  {[2, 3, 4, 5, 6, 7].map((days) => (
                    <ChoiceChip key={days} even selected={daysPerWeek === days} onSelect={() => setDaysPerWeek(days)}>
                      {days}
                    </ChoiceChip>
                  ))}
                </ChoiceGroup>
              </div>
            </div>

            {/*
              The plan, under the answers that build it rather than on a screen
              of its own. It is the single most useful thing this app can tell a
              beginner and it has to be seen before an evening goes into a deck,
              which it still is: the deck is the step after this one.
            */}
            <div className="mt-7">
              <SectionTitle hint={t("from your answers and published estimates")}>{t("What this is going to take")}</SectionTitle>
              {!measured && (
                <div className="mb-4">
                  <Note tone="sky">
                    {t("This plan starts from your own guess at your level. Take the level check whenever you like, and it’ll redo the sums with your real one.")}
                  </Note>
                </div>
              )}
              {/* On the course, which first run always opens: the plan counts
                  the evening it is about to promise on the next screen. */}
              <PlanPanel standing={standing} goals={goals} dailyGoal={goal} onCourse compact />
            </div>
          </section>
        )}

        {/*
          The empty state, which is a deployment rather than a learner: with no
          dictionary seeded there is nothing to build a deck out of, and the
          screen has to say so rather than offer "0 words, 0 cards" as though
          that were a choice somebody made. First run still finishes, because
          the alternative is a stranger stuck on step four of four.
        */}
        {step === 3 && (!deck || deck.cards === 0) && (
          <section>
            <h1 tabIndex={-1} className="text-2xl font-bold leading-tight outline-none" style={{ color: "var(--ink)" }}>
              {t("Your first words")}
            </h1>
            <Note tone="hard">
              {fillNodes(t("This copy of Kodukeel has no dictionary loaded yet, so there are no first words to give you. Whoever runs it can load one with {command}. You can still pick your pace below, and add words yourself as you come across them."), {
                command: <code>npm run db:seed</code>,
              })}
            </Note>

            <div className="mt-7">
              <SectionTitle hint={t("changeable any time in Settings")}>{t("How much a day")}</SectionTitle>
            </div>
            <ChoiceGroup ariaLabel={t("How much a day")}>
              {GOALS.map((g) => (
                <ChoiceChip key={g.value} selected={goal === g.value} onSelect={() => setGoal(g.value)}>
                  {fill(t("{label}, {cards}"), { label: t(g.label), cards: countOf(locale, g.value, "card") })}
                </ChoiceChip>
              ))}
            </ChoiceGroup>
            <p className="mt-2.5 max-w-[62ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {fill(t("{minutes} a day, {days} a week. That’s {cards} to answer, not {goal} new ones. About nine in ten will be words you’ve already met, coming back just as you start to forget them."), {
                minutes: countOf(locale, minutesFor(goal), "minute"),
                days: countOf(locale, daysPerWeek, "day"),
                /* "answer on" takes the accusative in both languages. */
                cards: countOf(locale, goal, "card", "acc"),
                goal,
              })}
            </p>
          </section>
        )}

        {step === 3 && deck && deck.cards > 0 && (
          <section>
            <h1 tabIndex={-1} className="text-2xl font-bold leading-tight outline-none" style={{ color: "var(--ink)" }}>
              {t("Tonight, and every night after")}
            </h1>
            <p className="mt-2 max-w-[56ch] text-base" style={{ color: "var(--ink-2)" }}>
              {t("You never have to work out what to study. Kodukeel plans each evening for you: which words, in what order, and which games. About fifteen minutes, and then it tells you you’re done.")}
            </p>

            {/*
              THE LADDER, AS THE LAST THING FIRST RUN SAYS.

              A stranger who has answered four questions wants to be told what
              to do tonight, and the honest answer is a named part with a named
              first evening. The whole climb is under it because seventeen
              parts is a course and one part with nothing behind it is a trial:
              somebody deciding whether this is worth starting is deciding
              about the shape, not about tonight.
            */}
            {openingPart && (
              <div
                className="mt-6 rounded-[var(--r-lg)] border px-5 py-4"
                style={{ borderColor: "var(--accent-soft)", background: "var(--accent-soft)" }}
              >
                <p className="label-xs" style={{ color: "var(--accent-deep)" }}>
                  {fill(t("You start at {part}"), { part: openingPart.id.toUpperCase() })}
                </p>
                <p lang="et" className="mt-1 text-xl font-bold" style={{ color: "var(--ink)" }}>
                  {openingPart.title}
                </p>
                <p className="mt-1 text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {t(openingPart.blurb)}
                </p>
                {/*
                  WHY THIS PART, SAID WHERE THE PART IS NAMED. A B1 speaker who
                  is shown B2.1 without a word about it reads a jump, and one
                  aiming at B1 who is shown B1.1 reads the app ignoring what
                  they said. One sentence each, and the last half of it is the
                  promise the course keeps: if the guess was wrong either way,
                  it notices and offers to move them (`lib/course/adapt.ts`).
                */}
                <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--ink-2)" }} data-opening-why>
                  {openingWhy(held, openLevel, measured !== null, t)}
                </p>
                <p className="mt-3 text-sm" style={{ color: "var(--accent-deep)" }}>
                  {fill(t("{evenings}, about {minutes} each."), {
                    evenings: countOf(locale, openingPart.days, "evening"),
                    /* After "около" and "близько", which take the genitive. */
                    minutes: countOf(locale, COURSE_DAY_MINUTES, "minute", "gen"),
                  })}
                  {openingPart.firstDay && (
                    <> {fillNodes(t("Tonight is {title}, {words} and one short round."), {
                      title: <span lang="et">{openingPart.firstDay.title}</span>,
                      words: countOf(locale, openingPart.firstDay.words, "new word"),
                    })}</>
                  )}
                </p>
              </div>
            )}

            <div className="mt-5">
              <SectionTitle hint={countOf(locale, parts.length, "part")}>{t("The whole way to C1")}</SectionTitle>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {parts.map((part) => (
                <li key={part.id}>
                  <Chip tone={part.id === openingPart?.id ? "accent" : "neutral"}>
                    {part.id.toUpperCase()}
                  </Chip>
                </li>
              ))}
            </ul>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {fill(t("{evenings} in all, and every word in the course turns up in one of them. You can step off the plan whenever you like and use the app your own way. Nothing disappears, and everything you do still counts."), {
                evenings: countOf(locale, totalEvenings, "evening"),
              })}
            </p>

            <div className="mt-7">
              <SectionTitle hint={t("picked for your level")}>{t("Your first words")}</SectionTitle>
            </div>
            <p className="mt-1 max-w-[54ch] text-sm" style={{ color: "var(--ink-2)" }}>
              {fill(t("Tonight’s words come from your first {units} at {level}. Each word becomes a flashcard you can hear read aloud, with all its forms."), {
                units: countOf(locale, deck.units.length, "unit"),
                level: openLevel,
              })}
            </p>

            {/*
              WHAT THIS SCREEN USED TO BE, AND WHY IT IS NOT THAT ANY MORE.

              Fourteen units with checkboxes, three ticked, and `words * 2`
              underneath as the card count. Somebody ninety seconds into an app
              cannot tell whether they need `Riided` before `Ilm`, so the honest
              reading of that list is "tick everything", and ticking everything
              built two thousand cards: at the pace this app itself calls
              sustainable, a backlog into 2028 assembled by accident on a
              Tuesday evening. The count under it said four hundred, because two
              cards a word is only true of a unit that drills nothing.

              So the course picks, the server counts, and the screen says what
              it is handing over. The units are named rather than hidden, and
              the sentence under them says where to change it, because a default
              somebody cannot see is indistinguishable from no choice at all.
            */}
            <ul className="mt-5 flex flex-col gap-2">
              {deck.units.map((u) => {
                return (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-[var(--r-lg)] border px-4 py-3"
                    style={{ borderColor: "var(--rule)", background: "var(--raised)" }}
                  >
                    <NamedIcon name={u.icon} size={18} aria-hidden style={{ color: "var(--accent-deep)" }} />
                    <div className="min-w-0">
                      <p lang="et" className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                        {u.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--ink-3)" }}>{t(u.subtitle)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
              {fill(t("{words}, {cards}."), {
                words: countOf(locale, deck.words, "word"),
                cards: countOf(locale, deck.cards, "card"),
              })}{" "}
              {deck.remaining > 0 && (
                <>{fill(t("The other {units} at {level}, and every other level, are on the path whenever you want them."), {
                  units: countOf(locale, deck.remaining, "unit"),
                  level: openLevel,
                })} </>
              )}
              {t("Nothing here is locked in.")}
            </p>

            {/*
              THE FIRST CONVERSATION, OFF THE REASON. The wizard used to turn
              "I live in Estonia" into a level and a number of hours, so the
              one thing somebody ticked about their own life reached no
              screen. The reason names the scene that living here starts with,
              and this is the one place in first run that points out of the
              deck: the words are the means, and this is what they are for.
            */}
            {firstScene && (
              <div
                className="mt-5 rounded-[var(--r-lg)] border px-4 py-3"
                style={{ borderColor: "var(--rule)", background: "var(--sky-soft)" }}
              >
                <p className="label-xs" style={{ color: "var(--sky-ink)" }}>{t("Your first conversation")}</p>
                <p className="mt-1 text-base font-semibold" style={{ color: "var(--sky-ink)" }}>{t(firstScene.title)}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--sky-ink)" }}>
                  {fill(t("{place}. Once you know these words, you can practice this exact conversation here, typing your side to a stranger who wants something from you. Then go and have the real one."), {
                    place: t(firstScene.place),
                  })}
                </p>
              </div>
            )}

            {/*
              The daily goal, as one row rather than a screen. It has a sane
              default, it never caps a session, and Settings changes it in two
              clicks, so a whole step for it was a step spent on the least
              consequential answer in the walkthrough.
            */}
            <div className="mt-7">
              <SectionTitle hint={t("changeable any time in Settings")}>{t("How much a day")}</SectionTitle>
            </div>
            <ChoiceGroup ariaLabel={t("How much a day")}>
              {GOALS.map((g) => (
                <ChoiceChip key={g.value} selected={goal === g.value} onSelect={() => setGoal(g.value)}>
                  {fill(t("{label}, {cards}"), { label: t(g.label), cards: countOf(locale, g.value, "card") })}
                </ChoiceChip>
              ))}
            </ChoiceGroup>
            {/*
              THE SENTENCE THIS SCREEN EXISTS TO GET RIGHT, AND IT WAS BACKWARDS.

              It read "setting this higher does not make words arrive faster",
              which is the opposite of what the app's own arithmetic does:
              `sustainableNewCardsPerDay` is the goal divided by ten, so Intense
              introduces four new cards a day where Casual introduces one. Four
              times faster is not "no faster". The true half of it is the half
              that got lost: a goal of fifteen is fifteen *reviews*, not fifteen
              new words, because nine of every ten cards you answer are ones you
              have already met. That is the thing nobody is told, and it is why
              a beginner sets Intense in week one and meets two hundred due
              cards in week six.

              So it says both: what the pace buys, and what it costs, with the
              number for this learner's own deck rather than a general warning.
            */}
            {/*
              AND NO SECOND FIGURE FOR HOW LONG A NIGHT IS. This opened "5
              minutes a day" under a card that had just said every evening is
              about fifteen, which is two answers to one question on one screen.
              The review goal is part of the evening, so it is said as cards and
              the evening keeps its minutes.
            */}
            <p className="mt-2.5 max-w-[62ch] text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {fill(t("That’s {cards} to answer a day, not {goal} new ones, and on a course evening they’re part of the fifteen minutes. About nine in ten will be words you’ve already met, coming back just as you start to forget them. These {deck} take roughly {weeks} to work through this way. A faster setting really does get you through them sooner, but it makes every evening longer for the next year too. Pick the one you’d still open on a bad Wednesday."), {
                cards: countOf(locale, goal, "card", "acc"),
                goal,
                deck: countOf(locale, deck.cards, "card"),
                weeks: countOf(locale, weeksToLearn(deck.cards, goal, daysPerWeek), "week"),
              })}
            </p>
          </section>
        )}

        <div className="mt-10 flex items-center gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={() => go((s) => s - 1)} disabled={pending}>
              <ArrowLeft size={15} aria-hidden /> {t("Back")}
            </Button>
          )}
          {step === 1 && level !== null && (
            <Chip tone="accent">
              {fill(t(measured ? "Measured {level}" : "Estimated {level}"), { level: level === PRE_A1 ? t("below A1") : level })}
            </Chip>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="lg"
              className="ml-auto"
              onClick={() => go((s) => s + 1)}
              disabled={pending || !canContinue}
            >
              {t("Continue")} <ArrowRight size={15} aria-hidden />
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="ml-auto" onClick={finish} disabled={pending}>
              {pending
                ? <><Loader2 size={15} className="animate-spin" aria-hidden /> {t("Building your deck...")}</>
                : <>{t("Start learning")} <ArrowRight size={15} aria-hidden /></>}
            </Button>
          )}
        </div>
        <p role="status" className="mt-3 text-right text-sm" style={{ color: "var(--ink-2)" }}>
          {failed && t(failed)}
        </p>

        {/*
          NO WAY OUT OF SETUP, AND ONE WAY PAST ONE QUESTION.

          "Skip setup and go straight to the dictionary" sat under every screen
          of this wizard and was the wrong offer twice over. It landed somebody
          on `/dictionary` with no name, no level, no goal and an empty deck,
          which is the app at its least useful and the state every other screen
          then has to apologise for; and it was the most prominent thing on the
          first screen after the Continue button, so the app's own suggestion to
          a stranger was to not use it. Four questions is ninety seconds and
          every one of them changes what the learner is shown afterwards.

          What stays is skipping the *goal*, which is the one screen whose
          answers only feed the plan. Somebody in a hurry can press past it and
          Settings asks the same four questions whenever they want them.
        */}
        {step === 2 && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => go(3)}
              disabled={pending}
              className="text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-3)" }}
            >
              {t("Skip this and go straight to your words")}
            </button>
          </div>
        )}
      </div>
      </main>
    </LetterBarScope>
    </LocaleProvider>
  );
}

/**
 * The one sentence under the part first run opens on, saying why that part.
 *
 * Out of the component so each branch is plainly one of the four things a
 * learner can have told the wizard. It never names a level the learner did not
 * name or a check did not find, and it ends on the same promise each time: the
 * course watches how the first evenings go and offers to move them either way.
 */
function openingWhy(held: Level | null, open: string, measured: boolean, t: (english: string) => string): string {
  const later = t("If it turns out too hard or too easy, the course will notice and offer to move you.");
  if (held === null || held === PRE_A1) {
    return `${t("You start at the very beginning, with the first words anybody needs.")} ${later}`;
  }
  /*
    Each branch is one whole sentence to translate, never a clause dropped into
    another: "your check put you at" and "you said you're at" take different
    word order once they are not English.
  */
  const sentence = open === held
    ? held === "C1"
      ? measured
        ? "Your level check put you at {level}, which is the top of this course, so you start on its first part."
        : "You said you’re at {level}, which is the top of this course, so you start on its first part."
      : measured
        ? "Your level check put you at {level} and you’re aiming for {level}, so you start at its first part to make it solid."
        : "You said you’re at {level} and you’re aiming for {level}, so you start at its first part to make it solid."
    : measured
      ? "Your level check put you at {level}, so we’ll treat {level} as done and start you on the next level up."
      : "You said you’re at {level}, so we’ll treat {level} as done and start you on the next level up.";
  return `${fill(t(sentence), { level: held })} ${later}`;
}
