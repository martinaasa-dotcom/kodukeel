"use client";

import { Ear, Type, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { ChoiceCard, ChoiceChip, ChoiceGroup } from "@/components/Choice";
import { useT } from "@/components/Locale";
import { SCENE_VOICES, type SceneVoice } from "@/lib/audio/sceneVoice";

/**
 * How the other side is heard, as a choice: three cards on the briefing, three
 * chips in the conversation.
 *
 * ONE DRAWING FOR BOTH PLACES, because the briefing is where it is decided and
 * the conversation is where somebody finds out they decided wrong: in a quiet
 * room they want the voice, on a bus they want the words, and leaving the
 * scene to change it is leaving the scene. Two copies would be two answers to
 * what each mode is called, and the label in the conversation is the whole
 * point of having one (lib/audio/sceneVoice.ts).
 *
 * The icon is a second signal beside the word, never the only one, which is
 * the rule about a colour or a shape carrying a distinction on its own.
 */
const ICONS: Record<SceneVoice, ReactNode> = {
  text: <Type size={15} aria-hidden />,
  voice: <Volume2 size={15} aria-hidden />,
  listen: <Ear size={15} aria-hidden />,
};

export function SceneVoiceChoice({ value, onSelect, compact }: {
  value: SceneVoice;
  onSelect: (next: SceneVoice) => void;
  /** Chips in a row, for the conversation, where the cards would be a wall. */
  compact?: boolean;
}) {
  const t = useT();
  if (compact) {
    return (
      <ChoiceGroup ariaLabel={t("How you hear them")} className="scene-voice flex flex-wrap gap-1">
        {SCENE_VOICES.map((one) => (
          <ChoiceChip
            key={one.id}
            selected={value === one.id}
            onSelect={() => onSelect(one.id)}
            /* The word carries it on a phone, where three icons cost the
               row it takes to keep the three chips on one line. */
            icon={<span className="hidden sm:inline-flex">{ICONS[one.id]}</span>}
            title={t(one.label)}
            small
          >
            {t(one.short, "voice")}
          </ChoiceChip>
        ))}
      </ChoiceGroup>
    );
  }
  return (
    <ChoiceGroup
      label={t("How you hear them")}
      hint={t("You can change this during the conversation too.")}
      className="grid gap-2 sm:grid-cols-3"
    >
      {SCENE_VOICES.map((one) => (
        <ChoiceCard
          key={one.id}
          selected={value === one.id}
          onSelect={() => onSelect(one.id)}
          icon={ICONS[one.id]}
          title={t(one.label)}
          detail={t(one.detail)}
          layout="stacked"
        />
      ))}
    </ChoiceGroup>
  );
}
