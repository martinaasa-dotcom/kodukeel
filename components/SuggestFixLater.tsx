"use client";

import dynamic from "next/dynamic";

/**
 * THE REPORT BUTTON, FETCHED ONLY WHERE IT IS DRAWN.
 *
 * The error screen and the not-found screen are part of every page's tree,
 * because Next needs them ready in case something goes wrong, so whatever they
 * import is downloaded with every page whether anything goes wrong or not.
 * `SuggestFix` brings the whole table of report categories with it, and the
 * two screens each pulled their own copy into a separate chunk: measured on
 * the landing page as two of three duplicated chunks a phone fetched before it
 * could paint. This is the same button, loaded the first time one of those
 * screens is actually shown, and rendered on the server as before when it is.
 */
export const SuggestFix = dynamic(() => import("./SuggestFix").then((m) => m.SuggestFix));
