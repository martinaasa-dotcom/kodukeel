import { LIMIT_REACHED } from "@/lib/copy/values";
import { after } from "next/server";
import {
  completeWithImage, TutorError, visionProviders,
} from "@/lib/tutor/provider";
import { MAX_ITEMS, SCAN_PROMPT, parseScanReply } from "@/lib/scan/extract";
import { NAME_THESE_THINGS, THINGS_PROMPT, parseThingsReply } from "@/lib/scan/things";
import { resolveThings } from "@/lib/progress/things";
import {
  ALLOWED_IMAGE_TYPES, decodeImageDataUrl, estimateImageTokens, MAX_IMAGE_BYTES,
} from "@/lib/scan/image";
import { resolveScannedItems } from "@/lib/dict/resolveScan";
import { summarise } from "@/lib/scan/items";
import { authoriseCall, recordUsage, releaseReservation } from "@/lib/usage/ledger";
import { reportError } from "@/lib/observability/report";

/**
 * A PHOTOGRAPH READ, FOR EITHER DOOR.
 *
 * The body of `/api/scan`, which `POST /api/v1/scan` calls too (D2 and D5 in
 * docs/44-sixth-batch.md): the vision chain, the ledger booked before the call
 * and settled by whoever read it, and then the dictionary deciding which of the
 * words the model claims to have seen the app will vouch for. Each door keeps
 * its own limiter in front of this, on the same key, so a learner scanning from
 * a browser and a phone spends one allowance.
 *
 * THE ORDER HERE IS THE DESIGN, and it is the same argument as `/api/write`.
 * A model reads the picture, and then the *dictionary* decides which of the
 * words it claims to have seen the app is prepared to vouch for. Nothing the
 * model wrote reaches a flashcard: a word the dictionary recognizes brings its
 * own principal parts and retrieved forms with it, and a word it does not is handed
 * back marked as exactly that, for the person holding the paper to confirm or
 * correct. ADR-005 says a model may never supply an Estonian form; reading one
 * off a page is transcription rather than authorship, but a misread and an
 * invention are indistinguishable from here, so both are treated as a guess.
 *
 * The picture is never stored. It is decoded, sent once, and dropped, and
 * nothing this module reaches writes anything but the ledger's own row.
 */

/*
  How many pages one learner may read in a minute.

  A scan is the dearest single call the app makes, and it is also the one a
  double-tapped button repeats most expensively. Four is more than anybody
  photographs by hand in sixty seconds and far fewer than a stuck retry loop
  sends. Charged to the learner rather than to their address, because a class
  photographing the same handout is twenty-five people on one school network.
*/
export const SCANS_PER_MINUTE = 4;

/** The limiter's key for a photograph, the same on both doors. */
export function scanLimitKey(bucket: string): string {
  return `scan:${bucket}`;
}

/** A page read into words, or the things in a picture named. */
export type ScanReading =
  | { items: Awaited<ReturnType<typeof resolveScannedItems>>; summary: ReturnType<typeof summarise> }
  | { things: Awaited<ReturnType<typeof resolveThings>> };

export type ScanRefusal = "invalid" | "switched_off" | "rate_limited" | "upstream";

export type ScanOutcome =
  | { ok: true; reading: ScanReading; provider: string; model: string }
  | { ok: false; refusal: ScanRefusal; status: number; message: string; reason?: string; retryAfterSec?: number };

function refuse(refusal: ScanRefusal, status: number, message: string): ScanOutcome {
  return { ok: false, refusal, status, message };
}

/** One photograph, from the learner the door named. `input` is the parsed request, `{ image, mode }`. */
export async function readScan(ownerId: string, input: unknown): Promise<ScanOutcome> {
  const chain = visionProviders();
  if (chain.length === 0) {
    return refuse(
      "switched_off", 503,
      "Reading a photo needs an AI key, and this copy of Kodukeel doesn't have one yet. " +
      "Everything else still works: review, the dictionary, and typing a word list in by hand.",
    );
  }

  // A body that parses to `null` is not a picture, and reading its key after
  // the parse had closed threw, which the framework answered with a 500.
  if (typeof input !== "object" || input === null) {
    return refuse("invalid", 400, "Something went wrong sending that. Reload the page and try again.");
  }
  const payload = input as { image?: unknown; mode?: unknown };

  /*
    A page, or the things around the learner (docs/41-fifth-batch.md, VB-13).
    The same picture rules, the same chain, the same ledger and the same switch;
    only what the model is asked differs, and for things it is asked for English
    names alone, which the dictionary then turns into its own Estonian.
  */
  const things = payload.mode === "things";
  const decoded = decodeImageDataUrl(payload.image);
  if (!decoded.image) {
    return refuse("invalid", 400, imageProblemMessage(decoded.problem));
  }

  // Checked before the call, and it fails closed. A photograph is the most
  // expensive thing this app can ask a provider for.
  const decision = await authoriseCall(ownerId, "SCAN");
  if (!decision.allowed) {
    return { ok: false, refusal: "rate_limited", status: 429, message: decision.message ?? LIMIT_REACHED, reason: decision.reason, retryAfterSec: decision.retryAfterSeconds };
  }

  /*
    Rebuilt now that the ledger has said whether the day's fallback budget still
    has room. The check above used the full chain, because "can anything read a
    photograph at all" is the question a 503 answers; this is the narrower one
    of what may actually be spent.
  */
  const affordable = visionProviders({ allowFallback: decision.fallbackAllowed });
  if (affordable.length === 0) {
    /*
      Groq is configured and Anthropic is out of fallback budget for today, so
      there is nothing left that can see. A booking was taken a moment ago and
      is handed straight back, for the reason `releaseReservation` states: a
      call that reached nobody is not a call anybody made.
    */
    after(() => releaseReservation(decision.reservation!));
    return {
      ok: false, refusal: "rate_limited", status: 429,
      message:
        "Reading photos has used up today's shared allowance. You can still type a " +
        "word list in by hand, and photos work again after midnight UTC.",
      reason: "KIND_SPEND",
    };
  }

  let reply;
  try {
    reply = await completeWithImage(affordable, things ? THINGS_PROMPT : SCAN_PROMPT, things ? NAME_THESE_THINGS : READ_THIS_PAGE, decoded.image, (usage, config) => {
      after(() => recordUsage({
        ownerId,
        kind: "SCAN",
        provider: config.name,
        model: config.model,
        // A picture is not text. When the provider reported nothing, an
        // estimate over the prompt alone would price the photograph at zero
        // and let a loop of scans run straight past the cap.
        inputTokens: usage.measured ? usage.inputTokens : usage.inputTokens + estimateImageTokens(),
        outputTokens: usage.outputTokens,
        reservation: decision.reservation,
      }));
    });
  } catch (error) {
    // No page was read, so the authorization goes back. A vision model that
    // refuses every image would otherwise spend a learner's scan allowance on
    // photographs they never got a word out of.
    const booking = decision.reservation;
    if (booking) after(() => releaseReservation(booking));
    if (!(error instanceof TutorError)) {
      reportError(error, { at: "api/scan", ownerId });
    }
    const status = error instanceof TutorError ? error.status : 502;
    const message = error instanceof TutorError
      ? `${error.message} If the model configured here cannot read images, set a vision model ` +
        "in .env (GEMINI_VISION_MODEL, GROQ_VISION_MODEL, ANTHROPIC_VISION_MODEL or OPENAI_VISION_MODEL)."
      : "We couldn't read that photo just now. Try again in a moment.";
    return refuse("upstream", status, message);
  }

  if (things) {
    // English names only; whatever else the reply held adds nothing.
    let found;
    try {
      found = await resolveThings(parseThingsReply(reply.text));
    } catch (error) {
      reportError(error, { at: "api/scan things", ownerId });
      return refuse("upstream", 503, "We saw the photo, but couldn't look its words up just now. Try it again in a moment.");
    }
    return { ok: true, reading: { things: found }, provider: reply.config.label, model: reply.config.model };
  }

  const scanned = parseScanReply(reply.text);
  /*
    The model has answered and been paid for by now, so what can still fail is
    the dictionary, which decides what is believed. Left to throw, that was an
    empty 500, which the screen cannot read as JSON, so its own catch told the
    learner to check their connection. It says what happened instead, and what
    the database said goes to the log and never to the screen.
  */
  let items;
  try {
    items = await resolveScannedItems(scanned.slice(0, MAX_ITEMS));
  } catch (error) {
    reportError(error, { at: "api/scan resolve", ownerId });
    return refuse(
      "upstream", 503,
      "We read the page, but couldn't check its words against the dictionary " +
      "just now. Try the photo again in a moment.",
    );
  }

  // Which model read the page is a fact about the reading, and the same rule
  // the chat follows: never the head of the chain, always the one that answered.
  return { ok: true, reading: { items, summary: summarise(items) }, provider: reply.config.label, model: reply.config.model };
}

/** The user turn. The instruction itself is the system prompt, so it can be cached. */
const READ_THIS_PAGE = "Read this page and list the Estonian vocabulary on it.";

function imageProblemMessage(problem: string | undefined): string {
  if (problem === "TYPE") {
    return `We can't read that kind of file. It needs to be one of ${ALLOWED_IMAGE_TYPES.join(", ")}.`;
  }
  if (problem === "TOO_LARGE") {
    return `That photo is still over ${Math.round(MAX_IMAGE_BYTES / 1_000_000)} MB, even after shrinking it.`;
  }
  return "The photo didn't come through. Try taking it again.";
}
