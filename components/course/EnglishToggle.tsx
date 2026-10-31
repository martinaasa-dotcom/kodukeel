"use client";

import { Button } from "@/components/Button";
import { useT } from "@/components/Locale";

/**
 * Hides or shows the English under a lesson's lines. The label says what the
 * press will do, so it carries no `aria-pressed` as well: "Show the English,
 * pressed" is two answers to one question.
 */
export function EnglishToggle({ english, onToggle }: { english: boolean; onToggle: () => void }) {
  const t = useT();
  return (
    <Button variant="ghost" size="sm" onClick={onToggle}>
      {english ? t("Hide the English") : t("Show the English")}
    </Button>
  );
}
