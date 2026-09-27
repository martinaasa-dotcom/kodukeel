import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";

/**
 * A LEVEL SOMEBODY NAMES IS A LEVEL THEY HOLD, AND THE COURSE WATCHES WHETHER
 * THAT WAS RIGHT.
 *
 * `lib/course/placement.ts` is where the course opens and `lib/course/adapt.ts`
 * is what it does when the answers say the part is wrong. Both are pure and
 * both are only worth anything if every door onto the decision goes through
 * them, which is what these ask. Each was written against the shape that
 * breaks it: a caller opening the course on the level a browser sent, a move
 * that goes wherever the caller says, a lean that one screen applies and the
 * next does not, and a client file dragging the whole course harvest into the
 * page to work out one level.
 */
export default function aNamedLevelIsHeld({ check, code, read, APP, COMPONENTS }: InvariantKit) {
  check("first run opens the course past the level the learner holds, worked out on the server", () => {
    const actions = code("app/actions.ts");
    const onboarding = actions.slice(
      actions.indexOf("export async function completeOnboarding"),
      actions.indexOf("export async function", actions.indexOf("export async function completeOnboarding") + 10),
    );
    assert.match(
      onboarding,
      /SETTING_KEYS\.programme,\s*openingPart\(heldLevel\(answer\)/,
      "first run no longer writes the part `openingPart` names off the level the learner holds",
    );
    assert.match(onboarding, /currentLevelAnswer\(ownerId\)/, "first run stopped reading the level off the server's own answer");
    // The level a browser sends names nothing but the declaration it stores.
    assert.doesNotMatch(onboarding, /SETTING_KEYS\.programme,[^)]*input\.cefr/, "first run opens the course on a level the browser sent");
  });

  check("every screen that names an opening part asks the same rule", () => {
    const course = code("lib/progress/course.ts");
    assert.match(course, /startingLevel\(held, target\)/, "openingPart stopped reading startingLevel");
    for (const file of ["app/(app)/course/page.tsx", "app/(app)/settings/page.tsx"]) {
      assert.match(code(file), /openingPartFor\(ownerId\)/, `${file} works out an opening part without the learner's target`);
    }
    // The wizard shows the part before the server writes it, off the same function.
    const wizard = code("app/(chromeless)/start/WelcomeWizard.tsx");
    assert.match(wizard, /startingLevel\(held, target\)/, "the wizard shows an opening part the server will not write");
  });

  check("the rules a client reads import nothing that builds the course", () => {
    for (const file of ["lib/course/placement.ts", "lib/course/adapt.ts"]) {
      const src = read(file);
      assert.doesNotMatch(src, /from\s+["'](?:\.\/build|\.\/index|@\/lib\/course)["']/, `${file} reaches the course harvest`);
      assert.doesNotMatch(src, /prisma|from "react"|next\//, `${file} stopped being pure`);
    }
    // And no client file reaches placement through the barrel.
    for (const file of [...APP, ...COMPONENTS]) {
      const src = read(file);
      if (!/^["']use client["']/m.test(src)) continue;
      assert.doesNotMatch(
        src, /import\s*\{[^}]*\b(?:startingLevel|heldLevel|tiltedLevel)\b[^}]*\}\s*from\s*["']@\/lib\/course["']/,
        `${file} imports a placement rule through the barrel, which ships the whole course to the browser`,
      );
    }
  });

  check("a move is the one the learner's answers offer, never one the caller names", () => {
    const actions = code("app/actions.ts");
    const start = actions.indexOf("export async function acceptCourseMove");
    assert.ok(start > 0, "acceptCourseMove is gone");
    const move = actions.slice(start, actions.indexOf("export async function", start + 10));
    assert.match(move, /adaptOfferFor\(ownerId, programme\)/, "a move is no longer worked out off the learner's own answers");
    assert.match(move, /move\.kind !== wanted/, "a move the reading no longer offers is not refused");
    assert.match(move, /SETTING_KEYS\.programme, move\.to\.id/, "the part written is not the offered move's");
    assert.match(move, /recordCourseLevel\(/, "a move across a level no longer goes through recordCourseLevel");
    assert.match(move, /SETTING_KEYS\.adaptMovedAt/, "a move no longer restarts the reading, so it would be offered again on the same evidence");
  });

  check("the lean reaches every delivery it claims to, off the one reading", () => {
    const scene = code("app/(app)/situations/[id]/page.tsx");
    assert.match(scene, /openAt=\{tiltedLevel\(learnerLevel, tilt\)\}/, "a conversation no longer opens at the leaned band");
    assert.match(scene, /adaptTiltFor\(ownerId\)/, "a conversation leans off something other than the course's reading");
    const session = code("components/scene/SceneSession.tsx");
    assert.match(session, /defaultDifficultyFor\(openAt\)/, "the difficulty default ignores the lean");
    assert.match(session, /useState<Level>\(openAt\)/, "the band default ignores the lean");
    const settings = code("app/(app)/settings/page.tsx");
    assert.match(settings, /paceFrom\(settings\[SETTING_KEYS\.speechPace\], courseLevel, tilt\)/, "Settings names a pace the shell is not playing");
    // The card says only what the lean really moved.
    assert.match(code("lib/progress/adapt.ts"), /effects: LeanEffects = \{/, "the module screen claims a lean without asking what it moved");
  });
}
