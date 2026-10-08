import { fill, tr, type Locale } from "@/lib/copy/locale";
import { COACH_TEMPLATES } from "./coach";
import { CURVEBALLS } from "./curveballs";
import type { SceneSpec } from "./types";

/**
 * A line of English the server built for a scene, put into the learner's
 * interface language on the way to the screen.
 *
 * DISPLAY ONLY, AND THAT IS THE POINT. The English a scene holds is read by
 * the composing model, by the gate and by tests, so none of it may change and
 * none of it may be built in another language on the server: a stage
 * direction, a break in time and the app's own hint are all made from the
 * same English the model is briefed with. What the learner reads is a
 * different question, answered here, after the fact, by matching the line
 * against the templates it was filled from and filling the translated
 * template with the same values.
 *
 * A line that matches nothing comes back as it arrived, in English, which is
 * the fallback `tr` takes everywhere: a half-translated line would be worse.
 * A value filled into a template is itself looked up, so a drawn word's English
 * gloss or a card's own line reads in the learner's language where the tables
 * hold it, and stays as it was where they do not.
 *
 * Pure: no React, no Next, no Prisma.
 */

/** Every template a filled line of this scene can have come from. */
export function sceneTemplates(scene: SceneSpec): string[] {
  const out = new Set<string>();
  for (const beat of scene.beats) {
    for (const one of [beat.they, beat.meanwhile, beat.answer, beat.counter?.they]) {
      if (one && one.includes("{")) out.add(one);
    }
  }
  for (const ball of CURVEBALLS) {
    for (const one of [ball.they, ball.answer]) if (one && one.includes("{")) out.add(one);
  }
  for (const one of Object.values(COACH_TEMPLATES)) if (one.includes("{")) out.add(one);
  return [...out];
}

const compiled = new Map<string, { re: RegExp; slots: string[] }>();

function compile(template: string): { re: RegExp; slots: string[] } {
  const hit = compiled.get(template);
  if (hit) return hit;
  const slots: string[] = [];
  const pattern = template
    .split(/(\{\w+\})/)
    .map((part) => {
      const slot = /^\{(\w+)\}$/.exec(part);
      if (slot) {
        slots.push(slot[1]!);
        return "(.+?)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  const made = { re: new RegExp(`^${pattern}$`), slots };
  compiled.set(template, made);
  return made;
}

/** A value inside a line: the table's own reading of it where there is one. */
function valueIn(locale: Locale, value: string): string {
  const direct = tr(locale, value);
  if (direct !== value) return direct;
  // A card's own line is quoted without its full stop.
  const stopped = tr(locale, `${value}.`);
  if (stopped !== `${value}.`) return stopped.replace(/\.$/, "");
  return value;
}

/** The line in this locale, or the line as it arrived where nothing matches. */
export function onScreen(locale: Locale, text: string, templates: readonly string[]): string {
  if (locale === "en") return text;
  const direct = tr(locale, text);
  if (direct !== text) return direct;
  for (const template of templates) {
    const translated = tr(locale, template);
    if (translated === template) continue;
    const { re, slots } = compile(template);
    const match = re.exec(text);
    if (!match) continue;
    const values: Record<string, string> = {};
    slots.forEach((slot, at) => {
      values[slot] = valueIn(locale, match[at + 1] ?? "");
    });
    return fill(translated, values);
  }
  return text;
}
