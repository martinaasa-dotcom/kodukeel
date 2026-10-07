import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Download, Keyboard, Smartphone } from "lucide-react";
import { prisma } from "@/lib/db";
import { currentLearner, requireUserId } from "@/lib/auth/session";
import { supabaseConfigured } from "@/lib/auth/mode";
import { resolveProviders } from "@/lib/tutor/provider";
import { ekilexConfigured } from "@/lib/ekilex/client";
import { dailyGoalFrom, readSettings, reviewModeFrom, SETTING_KEYS } from "@/lib/settings/store";
import { letterBarFrom } from "@/lib/ux/letterBar";
import { wordGlossFrom } from "@/lib/ux/wordGloss";
import { caseGlossFrom, caseGlossDefaultFor } from "@/lib/estonian/caseGloss";
import { participationFrom, researchExportConfigured } from "@/lib/research/participation";
import { emailPrefsFrom, kindStates } from "@/lib/email/prefs";
import { mailerConfig } from "@/lib/mailer/transport";
import { goalsFor, latestFor } from "@/lib/progress/assessment";
import { levelLabel } from "@/components/assessment/PlanPanel";
import { courseLevelFor } from "@/lib/progress/level";
import { uiText } from "@/lib/copy/uiLanguage";
import { Card, Chip, KeyCap, Page, SectionTitle, Stack } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { StartProgramme } from "@/components/course/StartProgramme";
import { filled } from "@/components/Filled";

import { courseReading, openingPartFor, programmeFor } from "@/lib/progress/course";
import { learnerDayClock } from "@/lib/progress/dayClock";
import { DailyGoalPanel } from "./DailyGoalPanel";
import { LevelPanel } from "./LevelPanel";
import { EkilexSetupGuide } from "./EkilexSetupGuide";
import { GoalsPanel } from "./GoalsPanel";
import { ImportPanel } from "./ImportPanel";
import { InstallPanel } from "./InstallPanel";
import { CaseGlossPanel, ClassNamePanel, LetterBarPanel, ResearchPanel, ReviewModePanel, WordGlossPanel } from "./PreferencesPanel";
import { EmailPanel } from "./EmailPanel";
import { AutoplayPanel, CurrentPaceSample, CurrentVoiceSample, FeedbackSoundsPanel, HearingPanel, SpeechPacePanel, SupportPanel, VoicePanel } from "./AudioPanel";
import { hearingFrom, supportFrom } from "@/lib/audio/conditions";
import { GlossAlsoPanel, GlossLanguagePanel } from "./GlossLanguagePanel";
import { InterfaceLanguagePanel } from "./InterfaceLanguagePanel";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { LOCALE_NAMES, REVIEWED, MACHINE_NOTICE, MACHINE_NOTICE_EN, countOf, fill, tr } from "@/lib/copy/locale";
import { RoundPacePanel } from "./RoundPacePanel";
import { ROUND_PACES, roundPaceFrom } from "@/lib/ux/roundClock";
import { TodayOrderPanel } from "./TodayOrderPanel";
import { isDefaultTodayOrder, todayOrderFrom } from "@/lib/ux/todayOrder";
import { TODAY_CARDS } from "@/lib/ux/disclosure";
import { GLOSS_LANGUAGES, alsoShowFrom, glossLanguageFrom } from "@/lib/collections/glossLanguage";
import { autoplayFrom, feedbackSoundsFrom, voiceFrom, VOICES } from "@/lib/audio/voice";
import { paceFor, paceFrom } from "@/lib/audio/pace";
import { adaptTiltFor } from "@/lib/progress/adapt";
import { RestorePanel } from "./RestorePanel";
import { UsagePanel } from "./UsagePanel";
import { DangerZone } from "./DangerZone";
import { SetupGuide } from "./SetupGuide";
import { providerResilience } from "@/lib/tutor/provider";

export async function generateMetadata() {
  return titleFor("Settings");
}

export const dynamic = "force-dynamic";

/*
  The word importer runs here, and it is the one action on this page whose cost
  is set by what somebody pasted rather than by the page. `MAX_IMPORT_ROWS` is
  500, and a cap on rows is not a cap on time: measured against a local
  database, where a round trip is nearly free, five hundred rows take about
  two and a half seconds, and a deployment reaches its database over a pooler
  where every one of those round trips costs a great deal more. Without a
  budget the action inherits the platform's default, which on several of them
  is ten seconds, and a paste that runs past it leaves a half-finished import
  and an error that says nothing about how much landed.

  A hundred and fifty seconds, because deleting an account is an action on
  this page and its transaction is allowed a hundred and twenty. It was sixty,
  so the platform would have ended the function halfway through a transaction
  still inside its own limit, and the learner who asked to be forgotten would
  get a dropped request instead of the sentence saying whether anything
  changed. It is a ceiling rather than a reservation: a page render that takes
  a millisecond still takes a millisecond.
*/
export const maxDuration = 150;

const SHORTCUTS: [string, string][] = [
  ["⌘K / Ctrl-K", "Jump to any screen, or look a word up"],
  /* Enter is the key every button in the app names, and Space does the same
     thing wherever you are not typing into a box. Both are written down here
     because this is a reference; a button says one of them (`ADVANCE_KEY_LABEL`). */
  ["Enter", "Show the answer, check what you typed, then keep going"],
  ["Space", "Does the same, whenever you're not typing in a box"],
  ["1-4", "Say how it went: Again, Hard, Good or Easy"],
  ["U", "Take back the last answer you graded"],
  ["1-4 (listening, choice)", "Pick one of the numbered answers"],
];

/**
 * FOUR ROOMS, ONE OPEN AT A TIME.

 * This was one page of some twenty-five sections under four headings, with a
 * row of jump links at the top: 11,000 pixels of controls, every one of them
 * reasonable and the whole of them a wall. A jump link does not make a page
 * shorter, it only makes it quicker to scroll past what you did not come for.
 *
 * So the four groups are four tabs, each an address of its own
 * (`/settings?tab=sound`), and only one is drawn. They are grouped by what
 * somebody is looking for rather than by where the code happened to put them:
 * how the studying works, how Estonian sounds and reads, the words and the
 * tutor, and the account. A section that other screens link to keeps its
 * anchor, and the link names the tab it lives in.
 */
const TABS = [
  { id: "study", label: "Study" },
  { id: "sound", label: "Sound and meaning" },
  { id: "words", label: "Words and Anu" },
  { id: "account", label: "Account and data" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const tabFrom = (raw: unknown): TabId =>
  TABS.find((t) => t.id === raw)?.id ?? "study";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const ownerId = await requireUserId();
  const tab = tabFrom((await searchParams).tab);
  /*
    Anu's own chain, not the general one. The general chain leads with Groq
    and includes the paid keys, and Anu's is Gemini then Groq and nothing
    else, so reading the general one here named a model she never answers on
    and, with only a paid key set, said "Connected" over a tutor the route
    refuses. The shell and /tutor already read it this way.
  */
  const tutorChain = resolveProviders({ purpose: "tutor" });
  const provider = tutorChain[0] ?? null;
  const resilience = providerResilience(tutorChain);
  const hosted = supabaseConfigured();
  const ekilexOn = ekilexConfigured();

  const [words, cards, reviews, settings, learner, goals, latestCheck, courseLevel, [programme, programmeDay, opening], tilt] = await Promise.all([
    prisma.lexeme.count(),
    prisma.card.count({ where: { ownerId } }),
    prisma.review.count({ where: { ownerId } }),
    readSettings(ownerId, [
      SETTING_KEYS.dailyGoal, SETTING_KEYS.reviewMode,
      SETTING_KEYS.letterBar, SETTING_KEYS.researchOptOut,
      SETTING_KEYS.displayName,
      SETTING_KEYS.ttsVoice, SETTING_KEYS.autoplayAudio, SETTING_KEYS.feedbackSounds,
      SETTING_KEYS.hearing, SETTING_KEYS.support, SETTING_KEYS.speechPace,
      SETTING_KEYS.glossLanguage, SETTING_KEYS.glossAlso, SETTING_KEYS.wordGloss,
      SETTING_KEYS.todayOrder,
      SETTING_KEYS.roundPace,
      SETTING_KEYS.caseQuestionGloss,
      SETTING_KEYS.emailsOff, SETTING_KEYS.emailsOn, SETTING_KEYS.reminderAt,
    ]),
    currentLearner(),
    goalsFor(ownerId),
    latestFor(ownerId),
    /*
      The level the app is actually going on, which is not always the last
      check: `courseLevelFor` takes whichever of the measurement and the
      learner's own answer was stated later. Reading the check alone here
      would print one level in the hint and hand the picker another.
    */
    courseLevelFor(ownerId),
    /*
      Whether the learner is being led, and how far in. Read here rather than
      threaded down, because the panel is the one place the answer is changed
      and a second reader is a second answer. In the batch, chained on the
      programme, because it needs nothing else here and it was two more round
      trips after all of this had come back.
    */
    Promise.all([programmeFor(ownerId), learnerDayClock(ownerId)]).then(async ([led, clock]) => [
      led,
      led ? (await courseReading(ownerId, led, clock)).current?.day.index ?? led.days.length : 0,
      // Where it would open for somebody who turned it off, off the same rule
      // first run used, so turning it back on lands where they would have.
      led ? null : await openingPartFor(ownerId),
    ] as const),
    // Which way the course is leaning the delivery, so the row that follows
    // the level names the pace actually being played. See lib/course/adapt.ts.
    adaptTiltFor(ownerId),
  ]);

  const dailyGoal = dailyGoalFrom(settings[SETTING_KEYS.dailyGoal]);
  const mode = reviewModeFrom(settings[SETTING_KEYS.reviewMode]);
  const letters = letterBarFrom(settings[SETTING_KEYS.letterBar]);
  const participation = participationFrom(settings[SETTING_KEYS.researchOptOut]);
  const emailPrefs = emailPrefsFrom(settings[SETTING_KEYS.emailsOff], settings[SETTING_KEYS.emailsOn]);
  /*
    Whether this installation can send at all, read here and handed down as a
    boolean. `lib/funding/` takes the same shape about the environment for the
    same reason: a page that reads a variable is a page that can print one, and
    several of these are keys.
  */
  const canSend = mailerConfig() !== null;

  const researchExported = researchExportConfigured();
  const voice = voiceFrom(settings[SETTING_KEYS.ttsVoice]);
  const voiceName = VOICES.find((v) => v.id === voice)?.name ?? voice;
  const autoplay = autoplayFrom(settings[SETTING_KEYS.autoplayAudio]);
  const sounds = feedbackSoundsFrom(settings[SETTING_KEYS.feedbackSounds]);
  const hearing = hearingFrom(settings[SETTING_KEYS.hearing]);
  const support = supportFrom(settings[SETTING_KEYS.support]);
  /*
    The pace Estonian is read aloud at, and the pace the level alone would give,
    since the row that follows the level has to be able to say which that is.
    `courseLevel` is `courseLevelFor`'s answer, which the shell publishes the
    pace off: reading a level of our own here would print one pace in Settings
    and play another on every card.
  */
  const speechPace = paceFrom(settings[SETTING_KEYS.speechPace], courseLevel, tilt);
  const levelPace = paceFor(courseLevel, tilt);
  const glossLanguage = glossLanguageFrom(settings[SETTING_KEYS.glossLanguage]);
  const glossAlso = alsoShowFrom(settings[SETTING_KEYS.glossAlso], glossLanguage);
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);
  const wordGloss = wordGlossFrom(settings[SETTING_KEYS.wordGloss]);
  const caseGlossPref = caseGlossFrom(settings[SETTING_KEYS.caseQuestionGloss]);
  const todayOrder = todayOrderFrom(settings[SETTING_KEYS.todayOrder]);
  const roundPace = roundPaceFrom(settings[SETTING_KEYS.roundPace]);
  const roundPaceName =
    t(ROUND_PACES.find((p) => p.id === roundPace)?.label ?? "Standard");
  const glossLanguageName =
    t(GLOSS_LANGUAGES.find((l) => l.id === glossLanguage)?.label ?? "English");
  const displayName = settings[SETTING_KEYS.displayName] ?? (learner.name === "you" ? "" : learner.name);
  /*
    Whether the level on screen is one a check produced, which is the only
    thing the panel's copy changes on. Compared by value rather than by asking
    which source won, because a check that put somebody at B1 and a learner who
    then picked B1 are the same claim and saying "you set this" over it would
    be the app arguing with itself about a number both agree on.
  */
  const measuredIsCurrent = (latestCheck?.overall ?? null) === courseLevel;

  return (
    <Page route="/settings"
      title={t("Settings")}
      lead={
        hosted
          ? t("Your cards, reviews and tasks are yours alone. Nobody else can see them.")
          : t("This copy runs on your own computer, so nothing gets uploaded anywhere.")
      }
    >
      <Stack>
        <nav aria-label={t("Settings sections")} className="flex flex-wrap gap-2" lang={locale}>
          {TABS.map((entry) => (
            <Link
              key={entry.id}
              href={entry.id === "study" ? "/settings" : `/settings?tab=${entry.id}`}
              aria-current={entry.id === tab ? "page" : undefined}
              data-on={entry.id === tab ? "" : undefined}
              className="choice-btn choice-chip press inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold"
            >
              {t(entry.label)}
            </Link>
          ))}
        </nav>
        {tab === "study" && (
          <div className="flex flex-col gap-8">
          <section>
            <SectionTitle hint={t(mode === "type" ? "typing" : "flipping")}>{t("How cards ask you")}</SectionTitle>
            <Card>
              <ReviewModePanel current={mode} />
              <Explain label={t("Why new cards show the answer")}>
                {t("Either way, a brand-new card shows you its answer first. Being asked for a word you’ve never seen wouldn’t teach you anything.")}
              </Explain>
            </Card>
          </section>

          <section id="level">
            <SectionTitle hint={courseLevel}>{t("Your level")}</SectionTitle>
            <Card>
              <LevelPanel current={courseLevel} measured={measuredIsCurrent} />
            </Card>
          </section>

          <section id="goals">
            <SectionTitle
              hint={latestCheck ? fill(t("measured {level}"), { level: levelLabel((latestCheck.overall ?? null) as never, locale) }) : t("not measured yet")}
            >
              {t("Why you’re learning")}
            </SectionTitle>
            <Card>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {t("Your plan is built from these. Change them whenever your life does.")}
              </p>
              <GoalsPanel current={goals} />
              <p className="mt-5 text-sm" style={{ color: "var(--ink-3)" }}>
                {filled(t("{link} to find out where you are now."), {
                  link: (
                    <Link href="/assess" className="underline underline-offset-2" style={{ color: "var(--accent-deep)" }}>
                      {t("Take the level check")}
                    </Link>
                  ),
                })}
              </p>
            </Card>
          </section>

          <section>
            <SectionTitle hint={fill(t("{n} reviews/day"), { n: dailyGoal })}>{t("Daily goal")}</SectionTitle>
            <Card>
              <p className="mb-4 text-sm" style={{ color: "var(--ink-2)" }}>
                {t("How many cards you’d like to get through each day. It’s there to keep you going, and it never stops you doing more.")}
              </p>
              <DailyGoalPanel currentGoal={dailyGoal} />
            </Card>
          </section>

          {/*
            THE PLANNED COURSE, ON OR OFF, AND NOTHING IN BETWEEN.

            Turning it off changes nothing else: Learn, Practice, Review and
            every round stay where they are and work as they do, and the work
            done that way still counts toward a module the day it is turned
            back on, because the two steps a review log can prove are read off
            the log whichever screen the answers came from.
          */}
          <section id="course">
            <SectionTitle hint={programme ? fill(t("day {day} of {total}"), { day: programmeDay, total: programme.days.length }) : tr(locale, "off", "setting")}>
              {t("The planned course")}
            </SectionTitle>
            <Card>
              <p className="text-base leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {programme
                  ? fill(t("You’re following {course}. Each evening it picks your words and games for you, and today’s plan sits at the top of Today."), { course: uiText(courseLevel, programme.title, t(programme.subtitle)) })
                  : <>{opening ? t(opening.blurb) : null}</>}
              </p>
              <div className="mt-4">
                {(programme ?? opening) && (
                  <StartProgramme
                    programmeId={(programme ?? opening)!.id}
                    on={Boolean(programme)}
                  />
                )}
              </div>
            </Card>
          </section>

          <section id="today">
            <SectionTitle hint={t(isDefaultTodayOrder(todayOrder) ? "the usual order" : "your order")}>
              {t("Your Today page")}
            </SectionTitle>
            <Card>
              <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
                {fill(t("Put the cards on Today in the order you like. The big button at the top always stays put, and Today shows the first {n} of these that have something for you."), { n: TODAY_CARDS })}
              </p>
              <TodayOrderPanel current={todayOrder} />
            </Card>
          </section>

          {/*
            HOW LONG A TIMED ROUND RUNS, WHICH IS WCAG 2.2.1 RATHER THAN A
            DIFFICULTY DIAL.

            The daily quest ran to a clock nobody could change, and a learner
            who reads slowly or types with one hand was not playing a harder
            round, they were shut out of it. The
            criterion is met by letting the limit be adjusted before it is
            met, which is what this is; see lib/ux/roundClock.ts for why
            adjusting rather than removing. The mock examination keeps its own
            clock, because a paper is imitating a timed examination.
          */}
          <section id="round-pace">
            <SectionTitle hint={roundPaceName}>{t("Time on the clock")}</SectionTitle>
            <Card>
              <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
                {t("The daily quest races the clock. Choose how much time you’d like. Everything else about it stays the same.")}
              </p>
              <RoundPacePanel current={roundPace} />
              <Explain label={t("Why the mock exam keeps its own timing")}>
                {t("The mock exam is practice for the real state exam, so every part keeps the real exam’s timings.")}
              </Explain>
            </Card>
          </section>

          <section id="case-questions">
            <SectionTitle
              hint={
                t(caseGlossPref
                  ? caseGlossPref === "on" ? "always shown" : "always hidden"
                  : caseGlossDefaultFor(courseLevel) ? "shown at your level" : "hidden at your level")
              }
            >
              {t("English under a case question")}
            </SectionTitle>
            <Card>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {filled(t("Questions like {question} are always asked in Estonian. This decides whether a short English translation appears underneath. Up to B1 it’s shown, while the fourteen cases are still new. From B2 it’s hidden, because by then a class expects you to know them by heart."), {
                  question: <span lang="et">milles? kus?</span>,
                })}
              </p>
              <CaseGlossPanel current={caseGlossPref} level={courseLevel} />
            </Card>
          </section>

          </div>
        )}
        {tab === "sound" && (
          <div className="flex flex-col gap-8">
          {/*
            How Estonian sounds. Four questions in one section because they
            are one decision about the same thing: who says it, how fast,
            whether they say it unasked, and whether the app answers back. The
            voices come from the same Tartu service every clip in the app does.
          */}
          <section>
            <SectionTitle hint={voiceName}>{t("Voice")}</SectionTitle>
            <Card className="flex flex-col gap-5">
              <div>
                <p className="mb-3 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  {t("Choose who reads Estonian to you. Press the ear to hear a voice, and a name to choose it.")}
                  <CurrentVoiceSample />
                </p>
                <VoicePanel current={voice} />
                <Explain label={t("Why change the voice")}>
                  {t("There are ten voices. The state examination has more than one speaker, so it’s worth switching now and then to get used to different people.")}
                </Explain>
              </div>
              <div>
                <h3 className="label-xs mb-2 flex flex-wrap items-center gap-2" style={{ color: "var(--ink-3)" }}>
                  {t("How fast")}
                  <CurrentPaceSample />
                </h3>
                <SpeechPacePanel
                  current={speechPace}
                  fromLevel={levelPace}
                  level={courseLevel}
                  // Only where the lean really moved the pace, since at A1 or C1 it cannot.
                  tilt={levelPace.id === paceFor(courseLevel).id ? 0 : tilt}
                />
                <Explain label={t("How the slow speed is made")}>
                  {t("Every speed plays the same recording, slowed down in your browser, so the voice and pitch don’t change and the consonants stay crisp. The slow button next to a word always plays it slower still than whatever you pick here.")}
                </Explain>
              </div>
              <div>
                <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("When it speaks")}</h3>
                <AutoplayPanel current={autoplay} />
              </div>
              <div>
                <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Sounds for right and wrong")}</h3>
                <FeedbackSoundsPanel current={sounds} />
              </div>
              <div>
                <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("Listening and dictation")}</h3>
                <HearingPanel current={hearing} />
                <Explain label={t("What a hearing condition changes")}>
                  {t("The words stay the same. What changes is the speed, the voice and the background noise, because the receptionist won’t slow down for you and the counter is never quiet.")}
                </Explain>
              </div>
              <div>
                <h3 className="label-xs mb-2" style={{ color: "var(--ink-3)" }}>{t("In a conversation")}</h3>
                <SupportPanel current={support} />
              </div>
            </Card>
          </section>

          {/*
            WHICH LANGUAGE A MEANING IS GIVEN IN, WHICH IS NOT A COSMETIC
            SETTING HERE.

            Most people learning Estonian in Estonia already speak Russian or
            Ukrainian, and an app that can only say `kohv` is "coffee" asks
            them to reach a word through the language they are least sure of.
            The equivalents are the Institute's own, out of the same Ekilex
            response as the forms and the sentences: no model is anywhere near
            them.
          */}
          {/*
            THE LANGUAGE THE APP ITSELF IS IN, ABOVE THE LANGUAGE A MEANING IS
            GIVEN IN, because the first decides how the rest of this page reads.
            The two Russian and Ukrainian options say on the choice that they
            were machine translated, and the full notice is here for good once
            one of them is chosen. See lib/copy/locale.ts.
          */}
          <section id="language">
            <SectionTitle hint={LOCALE_NAMES[locale]}>
              <span lang={locale}>{tr(locale, "Language of the app")}</span>
            </SectionTitle>
            <Card>
              <p lang={locale} className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
                {tr(locale, "The words around the Estonian. The Estonian itself never changes.")}
              </p>
              <InterfaceLanguagePanel current={locale} />
              {locale !== "en" && !REVIEWED[locale] && (
                <div className="mt-4 rounded-[var(--r-lg)] p-3" style={{ background: "var(--raised)" }}>
                  <p lang={locale} className="text-sm leading-snug" style={{ color: "var(--ink)" }}>{MACHINE_NOTICE[locale]}</p>
                  <p lang="en" className="mt-1.5 text-sm leading-snug" style={{ color: "var(--ink-2)" }}>{MACHINE_NOTICE_EN}</p>
                </div>
              )}
            </Card>
          </section>

          <section id="meanings">
            <SectionTitle hint={wordGloss === "off" ? fill(t("{language}, no underlines"), { language: glossLanguageName }) : glossLanguageName}>
              {t("Meanings")}
            </SectionTitle>
            <Card>
              <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
                {t("Meanings can appear in Russian or Ukrainian too. The English always stays, and the language you choose shows up next to it.")}
              </p>
              <GlossLanguagePanel current={glossLanguage} />
              <GlossAlsoPanel key={glossLanguage} lead={glossLanguage} current={glossAlso} />
              <Explain label={t("Where these come from")}>
                {t("The Russian and Ukrainian come from the same dictionary as the Estonian. If none was recorded for a word, you’ll just see the English.")}
              </Explain>

              <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--rule)" }}>
                <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
                  {t("In an example sentence, the other words can be underlined so you can tap any of them to see what it means. With this off, the sentence stays plain and only the new word is marked.")}
                </p>
                <WordGlossPanel current={wordGloss} />
              </div>
            </Card>
          </section>

          {/*
            Desktop only, and the whole section goes with the choice rather than
            being left as a heading over nothing. See app/globals.css: a phone
            draws no letter bar, so there is nothing here to decide.
          */}
          <section className="letters-choice">
            <SectionTitle hint={t(letters === "on" ? "shown" : "hidden")}>{t("Typing Estonian")}</SectionTitle>
            <Card>
              <LetterBarPanel current={letters} />
              <Explain label={t("Why only on a computer")}>
                {t("The letter buttons only appear on a computer. On a phone you already have these letters: hold down a key, or switch to an Estonian keyboard.")}
              </Explain>
            </Card>
          </section>

          <section>
            <SectionTitle>{t("Keyboard")}</SectionTitle>
            <Card>
              <div className="flex items-start gap-3">
                <Keyboard size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {t("You can do a whole session without touching the mouse.")}
                  </p>
                  {/* Keyed on the room the list has rather than the window, and
                      the key column held to one width: at 768 Settings is two
                      columns of panels, and `sm:grid-cols-2` there squeezed
                      each key cap to 8px, so "Enter" was drawn a letter a line. */}
                  <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-x-6 gap-y-1.5">
                    {SHORTCUTS.map(([keys, what]) => (
                      <div key={keys} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <dt>
                          <KeyCap>{t(keys)}</KeyCap>
                        </dt>
                        {/* A basis rather than `flex-1` alone, so a long key takes its
                            own line and the words under it wrap onto the next one:
                            "1-4 (listening, choice)" left its description 28px at 360,
                            and `min-w-0` let it shrink into that instead of moving down. */}
                        <dd className="min-w-0 flex-[1_1_10rem] text-xs" style={{ color: "var(--ink-3)" }}>{t(what)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </Card>
          </section>

          </div>
        )}
        {tab === "words" && (
          <div className="flex flex-col gap-8">
          <section id="import">
            <SectionTitle>{t("Import words")}</SectionTitle>
            <ImportPanel />
          </section>

          <section>
            <SectionTitle hint={t(ekilexOn ? "connected" : "built-in words only")}>{t("Dictionary")}</SectionTitle>
            <Card>
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                {filled(t("The built-in dictionary has {words}, from A1 up into C1, each with its main forms checked. Type any form you’ve met in class, like {first} or {second}, and it finds the word for you and tells you which form it is. The audio works out of the box too, no key needed."), {
                  words: countOf(locale, words, "word"),
                  first: <span lang="et">toas</span>,
                  second: <span lang="et">lugesin</span>,
                })}
              </p>
              {ekilexOn ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Chip tone="good">{t("Connected")}</Chip>
                  <Explain label={t("What gets saved here")}>
                    {t("Any word that isn’t built in is looked up live and saved here, so next time it works offline too. Example sentences, dictation and the fuller mock exam all draw on these words.")}
                  </Explain>
                </div>
              ) : (
                <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--rule-soft)" }}>
                  <p className="mb-3 text-sm" style={{ color: "var(--ink-2)" }}>
                    {fill(t("Live dictionary lookup isn’t set up here yet, so search only knows the {n} built-in words. Those come with hardly any real example sentences, so dictation, the sentence builder and the mock exam’s reading and listening parts are thin or empty."), { n: words })}
                  </p>
                  <EkilexSetupGuide />
                </div>
              )}
            </Card>
          </section>
          <section>
            {/* Named the way every other screen names her. "AI tutor" here
                against "Anu" everywhere else made two things out of one. */}
            <SectionTitle hint={provider ? undefined : t("off until you add a key")}>{t("Anu")}</SectionTitle>
            <Card>
              {provider ? (
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Chip tone="good">{t("Connected")}</Chip>
                    <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                      {provider.label}, <code className="text-xs">{provider.model}</code>
                    </span>
                  </div>
                  <Explain label={t("What happens when a model is busy")}>
                    {resilience.models === 1
                      ? t("Only one model is set up right now, so if it's busy, Anu has to wait.")
                      : fill(t("If one model is busy, Anu tries the next. There are {n} of them, across {providers}."), { n: resilience.models, providers: new Intl.ListFormat(locale, { type: "conjunction" }).format(resilience.providers) })}
                  </Explain>
                  {/*
                    Said plainly because it is invisible otherwise. A chain of
                    several Groq models reads as redundancy and is not: they
                    share one account and one balance, so when it ran out here
                    every link answered 402 at the same moment and the tutor went
                    down. A second provider is the only thing that changes that.
                  */}
                  {resilience.singlePointOfFailure && (
                    <Explain label={t("What happens if the key stops answering")}>
                      {filled(t("Everything above goes through {provider}, on one account. If that key stops answering, because it’s out of credit or just having a bad minute, Anu goes quiet too. Adding {key} to {env} gives Anu a backup. It’s free and doesn’t ask for a card. Read the note beside them in {file} first, because free usually means the provider may read what goes through it."), {
                        provider: resilience.providers[0],
                        key: <code className="text-xs">{resilience.providers[0] === "Groq" ? "GEMINI_API_KEY" : "GROQ_API_KEY"}</code>,
                        env: <code className="text-xs">.env</code>,
                        file: <code className="text-xs">.env.example</code>,
                      })}
                    </Explain>
                  )}
                </div>
              ) : (
                <SetupGuide />
              )}
            </Card>
          </section>

          {/*
            What today has cost, under the tutor it is about. Only where a
            provider is configured: "0 of 40 questions" over a tutor that is
            switched off reports a limit nobody can reach as though it were
            one they were approaching.
          */}
          {provider && <UsagePanel ownerId={ownerId} />}
          </div>
        )}
        {tab === "account" && (
          <div className="flex flex-col gap-8">
          <section>
            <SectionTitle>{t("Your name in a class")}</SectionTitle>
            <Card>
              <ClassNamePanel currentName={displayName} />
            </Card>
          </section>
          <section id="email">
            <SectionTitle hint={t("you choose which ones, and when")}>{t("Emails and reminders")}</SectionTitle>
            <Card>
              <EmailPanel
                on={
                  /*
                    WHAT IS ON, RATHER THAN WHAT IS OFF, WHICH IS NOT THE SAME
                    QUESTION ANY MORE.

                    It used to hand over the off-set and let the panel invert
                    it, which was true while every kind was on by default. The
                    daily word is not: it is absent from both rows until
                    somebody asks for it, so "not switched off" and "switched
                    on" are different answers about it and only `wants` knows
                    which. `kindStates` is that function asked of every kind at
                    once, which also retires the `all-off` special case this
                    prop used to carry.
                  */
                  new Set(kindStates(emailPrefs).filter((s) => s.on).map((s) => s.kind))
                }
                reminderAt={settings[SETTING_KEYS.reminderAt] ?? null}
                sending={canSend}
              />
            </Card>
          </section>

          <section>
            <SectionTitle>{t("Your data")}</SectionTitle>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="tnum text-sm" style={{ color: "var(--ink-2)" }}>
                  {countOf(locale, words, "word")}, {countOf(locale, cards, "card")}, {countOf(locale, reviews, "review")}
                </p>
                <a
                  href="/api/export"
                  className="press inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-ui hover:-translate-y-px"
                  style={{ borderColor: "var(--edge)", color: "var(--ink)", background: "var(--surface)", boxShadow: "var(--depth-sm)" }}
                >
                  <Download size={15} aria-hidden /> {t("Download a backup")}
                </a>
              </div>
              <Explain label={t("Why a backup is worth the ten seconds")}>
                {t("Your answer history is the one thing here that can’t be rebuilt if it’s lost. Saving a copy now and then takes ten seconds.")}
              </Explain>
              <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--rule-soft)" }}>
                <RestorePanel currentReviews={reviews} />
              </div>
            </Card>
          </section>

          <section>
            <SectionTitle hint={t(participation === "in" ? "counted" : "left out")}>
              {t("Anonymous statistics")}
            </SectionTitle>
            <Card>
              <ResearchPanel current={participation} exported={researchExported} />
            </Card>
          </section>

          <section>
            <SectionTitle>{t("Install it")}</SectionTitle>
            <Card>
              <div className="flex items-start gap-3">
                <Smartphone size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--accent-deep)" }} />
                <div>
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {t("You can install Kodukeel like an app. On an iPhone, tap \u201cAdd to Home Screen\u201d. In Chrome on a computer, press \u201cInstall\u201d in the address bar. Once it's installed, it opens straight into review and keeps working without a connection.")}
                  </p>
                  <Explain label={t("What happens to an answer with no connection")}>
                    {t("Anything you answer offline is kept on your device and sent as soon as you’re back online, stamped with the time you actually answered. So an offline session still counts for the right day.")}
                  </Explain>
                  <InstallPanel />
                </div>
              </div>
            </Card>
          </section>

          {/*
            Last, and in this group rather than one of its own, because the
            first thing its copy does is point at the backup four sections up.
            `/privacy` promises somebody can take everything away, and until
            this was rendered the only way to keep that promise was to ask
            whoever runs the deployment.
          */}
          <DangerZone counts={{ cards, reviews }} />
          </div>
        )}
      </Stack>
    </Page>
  );
}
