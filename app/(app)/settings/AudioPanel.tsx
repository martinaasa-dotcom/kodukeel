"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, BookOpen, Coffee, Ear, EarOff, Gauge, Music, Sparkles, VolumeX } from "lucide-react";
import { setAutoplay, setFeedbackSounds, setHearing, setSpeechPace, setSupport, setVoice } from "@/app/actions";
import { CONDITIONS, removesWords, type Hearing, type Support } from "@/lib/audio/conditions";
import { ChoiceChip, ChoiceGroup, ChoiceSegment } from "@/components/Choice";
import { Speak } from "@/components/Speak";
import { playFeedback } from "@/lib/audio/feedback";
import { type Autoplay, type FeedbackSounds, VOICES } from "@/lib/audio/voice";
import { SPEECH_PACES, type Pace, type SpeechPaceId } from "@/lib/audio/pace";
import { useT } from "@/components/Locale";
import { fill } from "@/lib/copy/locale";

/**
 * The voice, and whether it speaks unasked.
 *
 * A speaker button beside each name rather than a description of the voice,
 * because "warm" and "clear" are the sort of words a brochure uses about a
 * voice and the only thing that tells two voices apart is hearing them. The
 * sample is the app's own name, which every voice can say and which is the
 * one word a learner already knows how it should sound.
 */
const SAMPLE = "Kodukeel. Tere tulemast!";

export function VoicePanel({ current }: { current: string }) {
  const t = useT();
  const [voice, setVoiceState] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: string) => {
    setVoiceState(next);
    start(async () => {
      const landed = await setVoice(next).then(() => true).catch(() => false);
      if (!landed) { setVoiceState(voice); return; }
      router.refresh();
    });
  };

  return (
    /*
      Each voice is one object with two presses in it, the name to keep and
      the ear to hear, sitting in a shared pill so the speaker reads as that
      voice's and not the next one's. In a grid, so ten names line up in
      columns rather than wrapping into a ragged paragraph.
    */
    <ChoiceGroup
      ariaLabel={t("Which voice reads Estonian")}
      className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.5rem),1fr))] gap-2"
    >
      {VOICES.map((v) => (
        <span
          key={v.id}
          className="flex items-center gap-1 rounded-full pr-1"
          style={{ background: "var(--raised)" }}
        >
          <ChoiceChip selected={voice === v.id} disabled={pending} onSelect={() => pick(v.id)}>
            {v.name}
          </ChoiceChip>
          <span className="ml-auto">
            <Speak text={SAMPLE} voice={v.id} label={fill(t("Hear {name}"), { name: v.name })} size={14} />
          </span>
        </span>
      ))}
    </ChoiceGroup>
  );
}



/**
 * HOW FAST ESTONIAN IS READ ALOUD, WHERE THE LEVEL ANSWERS UNLESS THE LEARNER
 * DOES.
 *
 * The ladder in lib/audio/pace.ts is the default and this is the override, and
 * `auto` leads because it is what everybody has: a settings screen that lists
 * the option nobody has second reads as though the app were set the other way.
 * The row says which pace the level is currently giving them, since "follow my
 * level" with no number beside it is a promise a learner cannot check.
 *
 * A speaker for the pace they are on, for the same reason the voices have one:
 * the only thing that tells two speeds apart is hearing them, and a paragraph
 * about a pace is a paragraph nobody can act on. The sample is the commonest
 * three words in the language rather than the app's own name, because a pace is
 * judged on how much of a short phrase a learner can pick apart, which is a
 * question a single word cannot ask.
 */
const PACE_SAMPLE = "Kuidas läheb?";

export function SpeechPacePanel({ current, fromLevel, level, tilt }: {
  current: Pace;
  fromLevel: Pace;
  level: string;
  /** Which way the course is leaning the delivery just now (`lib/course/adapt.ts`). */
  tilt: -1 | 0 | 1;
}) {
  const t = useT();
  const [value, setValue] = useState<SpeechPaceId | "auto">(current.chosen ? current.id : "auto");
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: SpeechPaceId | "auto") => {
    setValue(next);
    start(async () => {
      const landed = await setSpeechPace(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  const levelPace = SPEECH_PACES.find((p) => p.id === fromLevel.id);

  // Two across by the card's width rather than the window's. A settings card is
  // 318px at 768, where the rail takes a column, and every choice here that
  // asked the window broke its title mid-letter there.
  return (
    <ChoiceSegment
      ariaLabel={t("How fast Estonian is read aloud")}
      value={value}
      disabled={pending}
      onSelect={pick}
      options={[
        {
          id: "auto" as const,
          title: t("Follow my level"),
          icon: <Gauge size={15} aria-hidden />,
          /* The lean is said here because this is the row it changes, and a
             pace that played a notch slower than the level promises with no
             word about why would read as the setting not working. */
          detail: tilt === 0
            ? fill(t("At {level} that's {pace}, and it speeds up as your level goes up."), { level, pace: t(levelPace?.label ?? "Full speed").toLowerCase() })
            : tilt < 0
              ? fill(t("{pace} for now. That's a notch slower than usual at {level}, because things have felt tricky lately. It goes back by itself."), { level, pace: t(levelPace?.label ?? "Slower") })
              : fill(t("{pace} for now. That's a notch quicker than usual at {level}, because you're getting nearly everything right."), { level, pace: t(levelPace?.label ?? "Natural") }),
        },
        ...SPEECH_PACES.map((p) => ({ id: p.id, title: t(p.label), detail: t(p.detail) })),
      ]}
    />
  );
}

/** A speaker for the pace sample, at whatever the learner currently hears. */
export function CurrentPaceSample() {
  const t = useT();
  return <Speak text={PACE_SAMPLE} label={t("Hear your current speed")} />;
}

/**
 * The silent option leads, because it is the default. A settings screen that
 * lists the option nobody has second reads as though the app were set the
 * other way.
 */
const AUTOPLAY: { value: Autoplay; label: string; detail: string; icon: typeof Ear }[] = [
  {
    value: "off",
    label: "Only when I press play",
    detail: "Nothing plays until you ask. Every card has a speaker button.",
    icon: EarOff,
  },
  {
    value: "on",
    label: "Read each card aloud",
    detail: "You hear a word when you first see it, and again when its answer appears.",
    icon: Ear,
  },
];

export function AutoplayPanel({ current }: { current: Autoplay }) {
  const t = useT();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Autoplay) => {
    setValue(next);
    start(async () => {
      const landed = await setAutoplay(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  return (
    <ChoiceSegment
      ariaLabel={t("When Estonian is read aloud")}
      value={value}
      disabled={pending}
      onSelect={pick}
      options={AUTOPLAY.map((o) => ({ id: o.value, title: t(o.label), detail: t(o.detail), icon: <o.icon size={15} aria-hidden /> }))}
    />
  );
}

const SOUNDS: { value: FeedbackSounds; label: string; detail: string; icon: typeof Music }[] = [
  {
    value: "on",
    label: "A sound for right and wrong",
    detail: "Two soft notes when you're right, one low note when you're not.",
    icon: Music,
  },
  {
    value: "off",
    label: "Silent",
    detail: "No sounds. The colors and words on screen tell you how it went.",
    icon: VolumeX,
  },
];

export function FeedbackSoundsPanel({ current }: { current: FeedbackSounds }) {
  const t = useT();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: FeedbackSounds) => {
    setValue(next);
    // Play the sound being chosen, so the choice can be heard rather than read about.
    if (next === "on") playFeedback("right");
    start(async () => {
      const landed = await setFeedbackSounds(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  return (
    <ChoiceSegment
      ariaLabel={t("Whether answers make a sound")}
      value={value}
      disabled={pending}
      onSelect={pick}
      options={SOUNDS.map((o) => ({ id: o.value, title: t(o.label), detail: t(o.detail), icon: <o.icon size={15} aria-hidden /> }))}
    />
  );
}

/**
 * Whether the listening rounds sound like the street or like the studio.
 *
 * The varied option leads because it is the default, and the default is the
 * point: nobody a learner will meet talks like a clean synthetic voice in a
 * silent room. The studio stays one press away for somebody with a bad
 * connection, a hearing aid, or a headache.
 */
const STREET = CONDITIONS.slice(1).filter((c) => !removesWords(c)).map((c) => c.said);

/** "a, b or c", with the last joiner in the reader's own language. */
function listOf(items: readonly string[], last: string): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")}${last}${items[items.length - 1]}`;
}

const HEARING: { value: Hearing; label: string; detail: string; icon: typeof Coffee }[] = [
  {
    value: "on",
    label: "The way people talk",
    /*
      The conditions the rounds this describes can actually produce. It read
      `CONDITIONS.slice(1)`, which includes "from halfway through", and that one
      removes words: `openConditions` refuses it unless the caller says it may
      skip, and listening and dictation both pass `false`, because a word you
      cannot hear the start of is a different exercise. Only the scene
      conversation opens it. So the sentence promised the learner a delivery
      the two rounds it is about will never use.
    */
    detail: `Once you know a word well, you'll sometimes hear it ${listOf(STREET, " or ")}, just like real life. New words always come nice and clear.`,
    icon: Coffee,
  },
  {
    value: "off",
    label: "Always clear",
    detail: "You always hear words in a quiet room, at an easy pace, in the voice you chose.",
    icon: AudioLines,
  },
];

export function HearingPanel({ current }: { current: Hearing }) {
  const t = useT();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Hearing) => {
    setValue(next);
    start(async () => {
      const landed = await setHearing(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  return (
    <ChoiceSegment
      ariaLabel={t("How the listening rounds sound")}
      value={value}
      disabled={pending}
      onSelect={pick}
      options={HEARING.map((o) => ({
        id: o.value,
        title: t(o.label),
        detail: o.value === "on"
          ? fill(t("Once you know a word well, you'll sometimes hear it {ways}, just like real life. New words always come nice and clear."), { ways: listOf(STREET.map((said) => t(said)), t(" or ")) })
          : t(o.detail), icon: <o.icon size={15} aria-hidden /> }))}
    />
  );
}

/**
 * HOW MUCH THE APP HELPS, WHICH IS NOT THE SAME QUESTION AS HOW HARD THEY ARE.
 *
 * The dial a scene already had is about the other side: how many things go
 * wrong and how much patience they have. This one is about the app, which
 * holds both hands: every line is written out as it is said, and the objective
 * is in English underneath. In a shop you get neither, so the thing that
 * actually breaks down at a counter was the one thing a rehearsal never
 * rehearsed. It is also what makes a second run of a scene worth having, which
 * the debrief has been promising all along.
 *
 * Nothing is locked and nothing is recorded: both presses are always there,
 * and a scene that punished looking would teach people to guess rather than to
 * ask.
 */
const SUPPORT_LEVELS: { value: Support; label: string; detail: string; icon: typeof Coffee }[] = [
  {
    value: "guided",
    label: "Words and voice together",
    detail: "You see every line written out as it's spoken, with what you're aiming for right underneath.",
    icon: BookOpen,
  },
  {
    value: "listen",
    label: "Hear it first",
    detail: "You hear each line first, like you would in a shop. The words are one press away whenever you want them.",
    icon: Ear,
  },
  {
    value: "cold",
    label: "Hear it, and work out what to say",
    detail: "Even what you're meant to say is hidden until you ask. It's as close to the real thing as it gets, so it's best for a conversation you've had before.",
    icon: Sparkles,
  },
];

export function SupportPanel({ current }: { current: Support }) {
  const t = useT();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Support) => {
    setValue(next);
    start(async () => {
      const landed = await setSupport(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  return (
    <ChoiceSegment
      ariaLabel={t("How much the app helps in a conversation")}
      value={value}
      disabled={pending}
      onSelect={pick}
      options={SUPPORT_LEVELS.map((o) => ({ id: o.value, title: t(o.label), detail: t(o.detail), icon: <o.icon size={15} aria-hidden /> }))}
    />
  );
}

/** A speaker for the sample line in the learner's own current voice. */
export function CurrentVoiceSample() {
  const t = useT();
  return <Speak text={SAMPLE} label={t("Hear the voice you've chosen")} />;
}
