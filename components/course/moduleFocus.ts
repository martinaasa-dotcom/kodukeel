"use client";

import { createContext, useContext } from "react";
import type { ModuleFocus } from "@/lib/course";

/**
 * WHICH STEP OF TONIGHT'S MODULE A SCREEN IS BEING READ INSIDE, OR NOTHING.
 *
 * A leaf, deliberately: the context and the hook and not one thing more.
 * `components/course/ModuleScope.tsx` fills it and draws the way on, and this
 * is what everything else reads.
 *
 * IT IS ITS OWN FILE BECAUSE OF WHERE ITS READERS SIT. `WayOut` is in
 * `components/ui.tsx`'s `Empty`, and `Empty` is drawn on the landing page and
 * on the sign-in screen, which have no signed-in shell and no module and never
 * will. With the hook living beside the bar, importing it dragged the bar, its
 * icons and a reference to `advanceCourseStep` into the bundle of the one
 * screen a stranger decides on: measured on a production build, `/welcome` and
 * `/privacy` both pulled in the 55KB chunk that holds the module's way on.
 * A module that exports a context and nothing else cannot do that to anybody.
 *
 * `null` where nothing provides it, which is every page outside the signed-in
 * shell, so a reader outside a module and a reader on a page that has no
 * module answer the same way without either having to know about the other.
 */
export const ModuleContext = createContext<ModuleFocus | null>(null);

/**
 * The module a screen is being read inside, or nothing.
 *
 * What a round reads to know that its own way out is not wanted: inside a
 * module the only ways off a screen are the one at the foot of it and the way
 * back to the list, so a finish screen offering Today, Practice and another
 * round is offering three doors out of a room whose door is already drawn.
 */
export function useModuleFocus(): ModuleFocus | null {
  return useContext(ModuleContext);
}
