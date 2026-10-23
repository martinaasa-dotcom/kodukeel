/**
 * Which side of a card is Estonian, and therefore worth hearing and worth a
 * `lang="et"`. A recognition card asks the Estonian and answers in English; a
 * production card the other way round; every form card is Estonian on the
 * back. Shared by the review session and the daily quest, so the two cannot
 * read one card's languages two ways.
 */
export function estonianSide(type: string, side: "front" | "back"): boolean {
  return side === "front"
    ? type !== "PRODUCTION"
    : type === "PRODUCTION" || type === "CASE_FORM" || type === "GRADATION" || type === "CLOZE"
      || type === "CONJUGATION";
}
