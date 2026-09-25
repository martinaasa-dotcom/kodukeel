/*
  A COPY BUTTON SAYS WHAT HAPPENED, NOT WHAT IT HOPED WOULD.

  Three buttons wrote the text with `void navigator.clipboard.writeText(...)`
  and then said "Copied" in the same breath. `navigator.clipboard` exists only
  in a secure context, so on a self-hosted install reached over plain http at a
  LAN address, which is exactly who reads the two setup guides, it is
  undefined: the press threw a TypeError and did nothing. And where it does
  exist the browser can refuse the write, and the button still said "Copied"
  over a clipboard holding whatever it held before, so the reader pasted the
  wrong thing into `.env` and was told nothing.

  So the state is one of three, and "copied" arrives only after the write
  resolves. "failed" asks the reader to select the text themselves, which is
  always possible, since every caller draws what it copies on the screen.
*/
export type CopyState = "idle" | "copied" | "failed";

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** What a copy button reads, in each state. */
export const COPY_LABEL: Record<Exclude<CopyState, "idle">, string> = {
  copied: "Copied",
  failed: "Select it to copy",
};
