"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, BookOpen, Coffee, Ear, EarOff, Music, Sparkles, VolumeX } from "lucide-react";
import { setAutoplay, setFeedbackSounds, setHearing, setSupport, setVoice } from "@/app/actions";
import { CONDITIONS, removesWords, type Hearing, type Support } from "@/lib/audio/conditions";
import { ChoiceCard, ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { Speak } from "@/components/Speak";
import { playFeedback } from "@/lib/audio/feedback";
import { type Autoplay, type FeedbackSounds, VOICES } from "@/lib/audio/voice";

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
  const [voice, setVoiceState] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: string) => {
    setVoiceState(next);
    start(async () => {
      await setVoice(next);
      router.refresh();
    });
  };

  return (
    <ChoiceGroup ariaLabel="Which voice reads Estonian" className="flex flex-wrap gap-2">
      {VOICES.map((v) => (
        <span key={v.id} className="inline-flex items-center gap-1">
          <ChoiceChip selected={voice === v.id} disabled={pending} onSelect={() => pick(v.id)}>
            {v.name}
          </ChoiceChip>
          <Speak text={SAMPLE} voice={v.id} label={`Hear ${v.name}`} size={14} />
        </span>
      ))}
    </ChoiceGroup>
  );
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
    detail: "Nothing speaks until you ask. The speaker sits on every card.",
    icon: EarOff,
  },
  {
    value: "on",
    label: "Read each card aloud",
    detail: "A word is spoken when you meet it and again when its answer appears.",
    icon: Ear,
  },
];

export function AutoplayPanel({ current }: { current: Autoplay }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Autoplay) => {
    setValue(next);
    start(async () => {
      await setAutoplay(next);
      router.refresh();
    });
  };

  return (
    <ChoiceGroup ariaLabel="When Estonian is read aloud" className="grid gap-2 sm:grid-cols-2">
      {AUTOPLAY.map((o) => (
        <ChoiceCard
          key={o.value}
          layout="stacked"
          disabled={pending}
          selected={value === o.value}
          onSelect={() => pick(o.value)}
          icon={<o.icon size={16} aria-hidden />}
          title={o.label}
          detail={o.detail}
        />
      ))}
    </ChoiceGroup>
  );
}

const SOUNDS: { value: FeedbackSounds; label: string; detail: string; icon: typeof Music }[] = [
  {
    value: "on",
    label: "A sound for right and wrong",
    detail: "Two quiet notes for a hit, one low one for a miss, before the correction is read.",
    icon: Music,
  },
  {
    value: "off",
    label: "Silent",
    detail: "The color and the words carry the verdict on their own.",
    icon: VolumeX,
  },
];

export function FeedbackSoundsPanel({ current }: { current: FeedbackSounds }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: FeedbackSounds) => {
    setValue(next);
    // Play the sound being chosen, so the choice can be heard rather than read about.
    if (next === "on") playFeedback("right");
    start(async () => {
      await setFeedbackSounds(next);
      router.refresh();
    });
  };

  return (
    <ChoiceGroup ariaLabel="Whether answers make a sound" className="grid gap-2 sm:grid-cols-2">
      {SOUNDS.map((o) => (
        <ChoiceCard
          key={o.value}
          layout="stacked"
          disabled={pending}
          selected={value === o.value}
          onSelect={() => pick(o.value)}
          icon={<o.icon size={16} aria-hidden />}
          title={o.label}
          detail={o.detail}
        />
      ))}
    </ChoiceGroup>
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
    detail: `A word you know well comes back ${
      CONDITIONS.slice(1).filter((c) => !removesWords(c)).map((c) => c.said).join(", ")
    }. A new one is always clear.`,
    icon: Coffee,
  },
  {
    value: "off",
    label: "Always clear",
    detail: "Every clip in a quiet room at an ordinary pace, in the voice you chose.",
    icon: AudioLines,
  },
];

export function HearingPanel({ current }: { current: Hearing }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Hearing) => {
    setValue(next);
    start(async () => {
      await setHearing(next);
      router.refresh();
    });
  };

  return (
    <ChoiceGroup ariaLabel="How the listening rounds sound" className="grid gap-2 sm:grid-cols-2">
      {HEARING.map((o) => (
        <ChoiceCard
          key={o.value}
          layout="stacked"
          disabled={pending}
          selected={value === o.value}
          onSelect={() => pick(o.value)}
          icon={<o.icon size={16} aria-hidden />}
          title={o.label}
          detail={o.detail}
        />
      ))}
    </ChoiceGroup>
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
    detail: "Every line is written down as it is said, and the objective is under it. This is how a conversation has always read here.",
    icon: BookOpen,
  },
  {
    value: "listen",
    label: "Hear it first",
    detail: "A line is spoken and its words wait behind a press, the way they do in a shop. You can always look.",
    icon: Ear,
  },
  {
    value: "cold",
    label: "Hear it, and work out what to say",
    detail: "The objective waits behind a press as well, which is the closest this gets to the real thing. Best on a scene you have done before.",
    icon: Sparkles,
  },
];

export function SupportPanel({ current }: { current: Support }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: Support) => {
    setValue(next);
    start(async () => {
      await setSupport(next);
      router.refresh();
    });
  };

  return (
    <ChoiceGroup ariaLabel="How much the app helps in a conversation" className="grid gap-2 sm:grid-cols-3">
      {SUPPORT_LEVELS.map((o) => (
        <ChoiceCard
          key={o.value}
          layout="stacked"
          disabled={pending}
          selected={value === o.value}
          onSelect={() => pick(o.value)}
          icon={<o.icon size={16} aria-hidden />}
          title={o.label}
          detail={o.detail}
        />
      ))}
    </ChoiceGroup>
  );
}

/** A speaker for the sample line in the learner's own current voice. */
export function CurrentVoiceSample() {
  return <Speak text={SAMPLE} label="Hear the voice you have chosen" />;
}
