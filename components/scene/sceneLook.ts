"use client";

import { useEffect, useState } from "react";

/**
 * WHICH OF THE THREE PROPOSED CONVERSATION LOOKS IS ON THE SCREEN.
 *
 * A mockup switch, on a branch, so the operator can choose between three
 * designs of the conversation screen photographed in the running app rather
 * than drawn beside it. `?look=kone`, `?look=oo` or `?look=paber` on the
 * scene's address; nothing is kept on the device, and the one that is chosen
 * replaces this file rather than shipping beside the other two.
 */
export const SCENE_LOOKS = ["kone", "oo", "paber"] as const;
export type SceneLook = (typeof SCENE_LOOKS)[number] | "base";

function read(): SceneLook {
  const asked = new URLSearchParams(window.location.search).get("look");
  return asked && (SCENE_LOOKS as readonly string[]).includes(asked) ? (asked as SceneLook) : "base";
}

export function useSceneLook(): SceneLook {
  const [look, setLook] = useState<SceneLook>("base");
  useEffect(() => { setLook(read()); }, []);
  return look;
}
