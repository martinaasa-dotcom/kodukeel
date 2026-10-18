import assert from "node:assert/strict";

import type { InvariantKit } from "../lib/invariantKit";
import { GAMES } from "@/lib/ux/games";

/**
 * EVERY GAME ON THE BOARD HAS ITS PICTURE.
 *
 * `GameArt` draws nothing for a href its table does not know, which is the
 * right fallback and is also silent: Tähthaaval reached the Games board as a
 * tile with an empty space where every neighbor shows its round, and nothing
 * said so. Read off the board's own list, so a twelfth game fails here until
 * somebody draws it.
 */
export default function everyGameIsDrawn({ check, code }: InvariantKit) {
  check("every game on the Games board has an entry in GameArt's table", () => {
    const art = code("components/games/GameArt.tsx");
    const table = art.slice(art.indexOf("const ART"));
    assert.ok(table.length > 0 && table.includes("\"/sonad\""), "could not find GameArt's table");
    const missing = GAMES.filter((g) => !table.includes(`"${g.href}":`)).map((g) => g.href);
    assert.deepEqual(missing, [], `games with no drawing: ${missing.join(", ")}`);
  });
}
