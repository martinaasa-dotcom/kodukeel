import { StatTile } from "@/components/ui";
import { tr, type Locale } from "@/lib/copy/locale";

/**
 * A class's three figures, drawn once for the class page and for the sample
 * on `/teachers`.
 *
 * THREE ACROSS WHERE THE LABELS FIT, AND NOT ON A WORD'S WORTH LESS. A phone
 * gives each tile about 75px of label, which holds every English word here
 * ("Reviews" is the longest) and holds neither "Повторений" (94px) nor
 * "Повторень" (83px), so in Russian and Ukrainian a three-across row broke a
 * word in half at 360. Those two stack the tiles until the window is wide
 * enough for the longest word to sit whole in a third of it, which is about
 * 440px; English keeps the one row it was given on a phone. The rule is the
 * label's length, so the class is chosen on the locale rather than on a
 * guess about the device.
 */
export function ClassFigures({ joined, active, reviews, locale }: {
  joined: number;
  active: number;
  reviews: number;
  locale: Locale;
}) {
  const t = (english: string) => tr(locale, english);
  const columns = locale === "en" ? "grid-cols-3" : "grid-cols-1 min-[440px]:grid-cols-3";
  return (
    <div className={`grid ${columns} gap-2 sm:gap-3`} data-class-figures="">
      <StatTile value={joined} label={t("Members")} tone="sky" />
      <StatTile value={active} label={t("Active this week")} tone="sky" />
      <StatTile value={reviews} label={t("Reviews this week")} tone="accent" />
    </div>
  );
}
