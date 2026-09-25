/**
 * WHAT OF THE CONVERSATION GOES BACK TO THE MODEL.
 *
 * The browser sends Anu the whole exchange it is holding and the route decides
 * what of it is worth paying to re-read. Three rules, each a way the request
 * used to be bigger than the question:
 *
 * The newest `MAX_HISTORY` turns, because Anu has no per-topic scoping and a
 * question refers to the last exchange or two. And at most `MAX_HISTORY_CHARS`
 * of them, whatever the count: twenty turns of up to eight thousand
 * characters each is a 160,000-character request, forty thousand tokens read
 * on every question after the twentieth, for a learner pasting a text into
 * Anu three times over an evening and paying for all three on every "why".
 * The newest turns are kept whole and the oldest go first, so what a question
 * refers to is always what survives.
 *
 * And nothing the app itself wrote into the transcript. A turn that failed is
 * drawn in Anu's bubble with a warning mark so the learner sees it where they
 * are looking, and the browser then sent it back as something she had said:
 * "Anu could not be reached" as an assistant turn, teaching the model that
 * this is how she talks and costing tokens to do it. The UNVERIFIED line under
 * a reply is the dictionary's note to the reader, not hers, and goes the same
 * way (`components/anu/AnuParts.tsx` draws it apart for the same reason).
 *
 * Pure: no React, no Next, no Prisma.
 */
import { clip } from "@/lib/copy/clip";
export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export const MAX_HISTORY = 20;
export const MAX_HISTORY_CHARS = 24_000;
/** One message may be a pasted text; past this it is cut, since a model's window is not a wastebasket. */
export const MAX_MESSAGE_CHARS = 8_000;

/** The warning mark the chat hook puts in front of a failure it writes into the transcript. */
export const FAILURE_MARK = "⚠";

/**
 * A reply with the dictionary's trailing note taken off, and a failure taken out whole.
 *
 * A warning can also arrive UNDER text she did write: the route appends one
 * when a reply hits its ceiling or the stream breaks, and the chat hook
 * appends one when the connection drops mid-answer. Those are trailing lines
 * opening on the mark, so they go with the dictionary's note, in whichever
 * order the two landed. A mark inside a line of her own prose is hers.
 */
export function saidByAnu(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed || trimmed.startsWith(FAILURE_MARK)) return null;
  const lines = trimmed.split("\n");
  const appWrote = (line: string) => {
    const at = line.trim();
    return at === "" || /^UNVERIFIED:/.test(at) || at.startsWith(FAILURE_MARK);
  };
  while (lines.length > 0 && appWrote(lines[lines.length - 1]!)) lines.pop();
  const kept = lines.join("\n").trim();
  return kept || null;
}

/** The transcript as the model should read it: the newest turns that fit, oldest first, and nothing the app wrote. */
export function forTheModel(messages: readonly Turn[]): Turn[] {
  const clean: Turn[] = [];
  for (const m of messages) {
    if (m.role === "assistant") {
      const said = saidByAnu(m.content);
      if (said) clean.push({ role: "assistant", content: clip(said, MAX_MESSAGE_CHARS) });
    } else if (m.content.trim()) {
      clean.push({ role: "user", content: clip(m.content, MAX_MESSAGE_CHARS) });
    }
  }
  const recent = clean.slice(-MAX_HISTORY);
  const kept: Turn[] = [];
  let spent = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const message = recent[i]!;
    if (kept.length > 0 && spent + message.content.length > MAX_HISTORY_CHARS) break;
    kept.unshift(message);
    spent += message.content.length;
  }
  return kept;
}
