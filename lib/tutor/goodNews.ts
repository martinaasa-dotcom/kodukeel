import { after } from "next/server";
import { openWithFallback, resolveProviders } from "./provider";
import { authoriseCall, recordUsage, releaseReservation } from "@/lib/usage/ledger";
import { findTells, VOICE_RULES } from "@/lib/copy/voice";
import { humanizeLine } from "./humanize";
import { judgeInstruction, readJudgement, type Picked } from "@/lib/news/goodNews";
import type { NewsItem } from "@/lib/news/headlines";

/**
 * ASKING A MODEL WHICH OF TODAY'S HEADLINES ARE GOOD NEWS, AND WHAT THEY SAY.
 *
 * One question an hour for the whole instance, not one per learner: the
 * answer is a fact about ERR's feeds this hour and the caller caches it
 * (`lib/dict/goodNews.ts`). It is still a paid call, so it is metered like
 * every other (`authoriseCall` before, `recordUsage` after, the reservation
 * handed back if nobody answered), on the grader's chain and as a `GRADER`
 * call, charged to whichever learner's morning happened to ask first, which
 * is a few hundred tokens once an hour.
 *
 * The model chooses and translates into English, which is the one direction
 * ADR-005 lets it write in. It never writes Estonian: the headline on the card
 * is the feed's, character for character, and `readJudgement` drops anything
 * the bad-news list refuses whatever the model said about it.
 *
 * Null means "no judgement this time": no model configured, the allowance
 * spent, or a provider that would not answer. The caller falls back to the
 * stricter keyless rule rather than to nothing.
 */
export async function judgeGoodNews(ownerId: string, items: readonly NewsItem[]): Promise<Picked[] | null> {
  if (items.length === 0) return [];
  if (resolveProviders({ purpose: "grader" }).length === 0) return null;

  const decision = await authoriseCall(ownerId, "GRADER");
  if (!decision.allowed) return null;

  // The last resort is asked for, never assumed: the chain is rebuilt with what
  // the ledger said about the day's fallback budget.
  const chain = resolveProviders({ purpose: "grader", allowFallback: decision.fallbackAllowed });

  let open;
  try {
    open = await openWithFallback(
      chain,
      SYSTEM,
      [{ role: "user", content: judgeInstruction(items) }],
      (usage, config) => {
        after(() => recordUsage({
          ownerId, kind: "GRADER", provider: config.name, model: config.model,
          inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
          cachedInputTokens: usage.cachedInputTokens, cacheWriteTokens: usage.cacheWriteTokens,
          reservation: decision.reservation,
        }));
      },
      "",
      JUDGE_TOKENS,
    );
  } catch {
    // Nobody took the question, so nothing was spent and the booking goes back.
    const booking = decision.reservation;
    if (booking) after(() => releaseReservation(booking));
    return null;
  }

  let text = "";
  try {
    for await (const chunk of open.chunks) {
      text += chunk;
      if (text.length > REPLY_CAP) break;
    }
  } catch {
    return null;
  }

  /*
    The English is copy a learner reads, so it goes through the pass Anu's
    stream does, and a line still carrying a tell is dropped rather than shown.
    The headline stays; only its English goes.
  */
  return readJudgement(text, items).map((pick) => {
    if (!pick.en) return pick;
    const en = humanizeLine(pick.en).trim();
    return { ...pick, en: en && findTells(en).length === 0 ? en : null };
  });
}

/** Room for six picks and their English, and no essay. */
const JUDGE_TOKENS = 700;
const REPLY_CAP = 3000;

const SYSTEM = [
  "You choose good news for a language learning app and say each headline in plain English.",
  "You are strict: only news that would make anybody smile, and nothing you are unsure of.",
  "You never write Estonian. Reply with JSON only.",
  "",
  "How the English should sound:",
  ...VOICE_RULES.map((rule) => `- ${rule}`),
].join("\n");
