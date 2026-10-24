"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSingleKeys } from "@/app/actions";
import { ChoiceCard, ChoiceGroup } from "@/components/Choice";
import { useT } from "@/components/Locale";
import { SINGLE_KEY_CHOICES, type SingleKeys } from "@/lib/ux/shortcuts";

/**
 * Single-key shortcuts on or off (WCAG 2.1.4, lib/ux/shortcuts.ts), drawn in
 * Settings and on the shortcut sheet, the two places somebody looks for it.
 * The shell publishes the answer to every round, so a change refreshes the
 * layout.
 */
export function SingleKeysPanel({ current }: { current: SingleKeys }) {
  const t = useT();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  const pick = (next: SingleKeys) => {
    setValue(next);
    start(async () => {
      const landed = await setSingleKeys(next).then(() => true).catch(() => false);
      if (!landed) { setValue(value); return; }
      router.refresh();
    });
  };

  return (
    <div className="@container">
      <ChoiceGroup ariaLabel={t("Single-key shortcuts")} className="grid gap-2 @md:grid-cols-2">
        {SINGLE_KEY_CHOICES.map((o) => (
          <ChoiceCard
            key={o.value}
            layout="stacked"
            disabled={pending}
            selected={value === o.value}
            onSelect={() => pick(o.value)}
            title={t(o.label)}
            detail={t(o.detail)}
          />
        ))}
      </ChoiceGroup>
    </div>
  );
}
