"use client";

import { useEffect } from "react";

/**
 * Takes a mailed link's token out of the address bar once the form holding it
 * has drawn.
 *
 * The token is the whole of what signs somebody in, and in the address it is
 * in the history, in a bookmark, in a screenshot and in anything that reads
 * `location`. The hidden field in the form is all the press needs, so the
 * address keeps everything else (`next`, `lang`) and loses the two parts that
 * belong to the link. Reloading afterwards shows the ordinary sign-in screen,
 * and the link in the email still works for as long as it would have.
 */
export function ForgetLinkInAddress() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("token_hash")) return;
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // A browser that refuses to rewrite its own address leaves it as it was.
    }
  }, []);
  return null;
}
