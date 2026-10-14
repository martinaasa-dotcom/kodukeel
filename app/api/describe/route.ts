import { after } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { pictureById, SENTENCES_PER_PICTURE } from "@/lib/collections/pictures";
import { lemmasOfForm } from "@/lib/dict/forms";
import { oneEntryPerLemma, VOUCHED_ROW } from "@/lib/dict/search";
import { acceptedUses } from "@/lib/exam/written";
import { correctionsFor, markPicture, sameWordIn, spellingsToCheck, type PictureWord } from "@/lib/games/picture";
import { MAX_SENTENCE_CHARS, looksLikeSentence } from "@/lib/estonian/writing";
import { reportError } from "@/lib/observability/report";
import { bucketForOwner, checkRateLimit, rateLimited } from "@/lib/security/rateLimit";
import { gradeDescription } from "@/lib/tutor/grader";
import { resolveProviders, TutorError } from "@/lib/tutor/provider";
import { verifyVerdict, type WithholdReason } from "@/lib/tutor/verify";
import { authoriseCall, recordUsage, releaseReservation } from "@/lib/usage/ledger";
import { courseLevelFor } from "@/lib/progress/level";
import { clip } from "@/lib/copy/clip";
import { NO_STORE } from "@/lib/security/headers";
import { localeFor } from "@/lib/progress/locale";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * How many of the learner's own words the model is handed the forms of. Five
 * sentences of a dozen words hold about twenty distinct headwords, so this
 * never bites on an honest answer and bounds a hostile one.
 */
const MAX_OWN_WORDS = 40;

/**
 * Marks the five sentences a learner wrote about one picture.
 *
 * `/api/write` with a scene in front of it, and deliberately the same order,
 * which is the design of both: the dictionary decides what it can decide
 * before any model is asked, so a learner whose sentences are spelled and
 * about the picture is told so with the AI off, a model that hallucinates
 * cannot mark a right sentence wrong, and an answer that is not a sentence
 * never costs a call.
 *
 * The browser posts a picture id and five strings, never a mark and never the
 * forms it was marked against. The picture and the words in it are read here
 * (ADR-022), and the learner's level is read off their own log rather than
 * taken from the request, which is the fix `/api/tutor` needed: a level typed
 * into a client is a level anybody can type.
 *
 * One call reads all five. Nothing is written to the review log: there is no
 * card behind a picture, and a row about a card that does not exist would be
 * worse than none.
 */
export async function POST(request: Request) {
  const ownerId = await requireUserId();

  // A grader that costs a call is exactly the shape that gets looped. Six a
  // minute is one every ten seconds, which nobody writing five sentences and
  // reading the marking meets.
  const limit = checkRateLimit(`describe:${bucketForOwner(ownerId)}`, 6, 60_000);
  if (!limit.ok) return rateLimited(limit, "Anu's still reading the last one. Give her a moment.");

  const bad = () => Response.json(
    { error: "Something went wrong sending that. Reload the page and try again." },
    { headers: NO_STORE, status: 400 },
  );

  let pictureId: string;
  let sentences: string[];
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.pictureId !== "string" || !Array.isArray(body.sentences)
        || body.sentences.length !== SENTENCES_PER_PICTURE
        || body.sentences.some((s) => typeof s !== "string")) return bad();
    pictureId = body.pictureId;
    sentences = (body.sentences as string[]).map((s) => clip(s.trim(), MAX_SENTENCE_CHARS));
  } catch {
    return bad();
  }

  const picture = pictureById(pictureId);
  if (!picture) return Response.json({ error: "That picture isn't available any more." }, { headers: NO_STORE, status: 404 });

  const short = sentences.findIndex((s) => !looksLikeSentence(s));
  if (short >= 0) {
    return Response.json(
      { error: `Sentence ${short + 1} needs at least three words.`, index: short },
      { headers: NO_STORE, status: 400 },
    );
  }

  /*
    The words in the picture, read off the dictionary. A lemma can hold two
    entries (`hall` is a noun and an adjective, and a word somebody confirmed
    off a photograph sits beside the seeded one), so `oneEntryPerLemma`
    decides rather than the query plan.
  */
  const lemmas = picture.things.map((t) => t.lemma);
  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: lemmas } },
    select: {
      id: true, lemma: true, pos: true, translation: true, provenance: true,
      forms: { select: { formType: true, value: true } },
    },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
  });
  const entry = new Map(oneEntryPerLemma(rows, lemmas).map((row) => [row.lemma, row]));
  const words: PictureWord[] = picture.things.flatMap((thing) => {
    const row = entry.get(thing.lemma);
    return row
      ? [{ lemma: row.lemma, pos: row.pos, translation: row.translation, emoji: thing.emoji, forms: row.forms }]
      : [];
  });

  // The part that is never in doubt, computed before anything can fail.
  const spellings = spellingsToCheck(sentences).slice(0, 120);
  // Which headwords each spelling is a form of. `known` is the spellings that have any.
  const headwordsOf = new Map<string, string[]>();
  await Promise.all(spellings.map(async (w) => {
    const found = await lemmasOfForm(w);
    if (found.length > 0) headwordsOf.set(w, found.slice(0, 3));
  }));
  const known = new Set(headwordsOf.keys());
  const mark = markPicture(words, sentences, known);

  /*
    Every form the dictionary supplies for the things in the picture: what the
    model may spell, and the only forms a correction may put into a sentence.
  */
  const knownForms = words.flatMap((w) => [
    { label: w.lemma, value: w.lemma },
    ...w.forms.map((f) => ({ label: `${w.lemma} (${f.formType.replace(/^EKILEX:/, "")})`, value: f.value })),
    ...[...acceptedUses(w)].map((value) => ({ label: `${w.lemma} (a form)`, value })),
  ]);

  /*
    AND THE FORMS OF EVERY OTHER WORD THEY WROTE THAT THE DICTIONARY HOLDS.

    A swap used to reach only the things in the picture, so the commonest
    mistakes in a sentence, the verb that does not agree and the ending on
    a word that is not in the scene, were named in words and never put right.
    The forms are the entry's own and the ones a rule derives off its stored
    stem (`acceptedUses`), the same set the mock exam credits a word with, and
    only for an entry the dictionary vouches for (`VOUCHED_ROW`). A word the
    dictionary does not hold gets nothing, which is the honest answer.
  */
  const inPicture = new Set(lemmas);
  const ownLemmas = [...new Set([...headwordsOf.values()].flat())]
    .filter((lemma) => !inPicture.has(lemma))
    .slice(0, MAX_OWN_WORDS);
  const ownRows = ownLemmas.length === 0 ? [] : await prisma.lexeme.findMany({
    where: { lemma: { in: ownLemmas }, ...VOUCHED_ROW },
    select: { lemma: true, pos: true, forms: { select: { formType: true, value: true } } },
    orderBy: [{ lemma: "asc" }, { id: "asc" }],
    take: MAX_OWN_WORDS * 3,
  });
  const family = new Map<string, Set<string>>();
  const claim = (spelling: string, lemma: string) => {
    const key = spelling.toLowerCase();
    (family.get(key) ?? family.set(key, new Set()).get(key)!).add(lemma);
  };
  const ownForms = new Map<string, Set<string>>();
  for (const row of ownRows) {
    const uses = acceptedUses(row);
    const bucket = ownForms.get(row.lemma) ?? new Set<string>();
    for (const use of uses) { bucket.add(use); claim(use, row.lemma); }
    ownForms.set(row.lemma, bucket);
  }
  for (const w of words) for (const use of acceptedUses(w)) claim(use, w.lemma);
  // The spelling they wrote belongs to the headwords the forms list gives it, even where no entry holds the form.
  for (const [spelling, found] of headwordsOf) for (const lemma of found) claim(spelling, lemma);
  const wordForms = [...ownForms].map(([lemma, forms]) => ({ lemma, forms: [...forms].sort() }));

  const vouched = [...knownForms.map((f) => f.value), ...wordForms.flatMap((w) => w.forms)];
  const sameWord = sameWordIn(family);
  // What the dictionary alone can put right, which stands with the AI off.
  const mechanical = correctionsFor(sentences, mark.sentences, vouched);

  /*
    What the screen may print now that the five are marked: what each thing in
    the picture is called, and which of them were talked about. None of it is
    sent before, because naming the things is most of the exercise.
  */
  const reveal = {
    things: words.map((w) => ({
      emoji: w.emoji, lemma: w.lemma, translation: w.translation,
      used: mark.mentioned.includes(w.lemma),
    })),
    example: picture.example,
  };

  // The grader's own chain, not the general head (see `PURPOSE_CHAINS`).
  const config = resolveProviders({ purpose: "grader" })[0];
  if (!config) return Response.json({ mark, reveal, graded: null, corrections: mechanical, aiAvailable: false }, { headers: NO_STORE });

  const decision = await authoriseCall(ownerId, "GRADER");
  if (!decision.allowed) {
    // The mechanical marking stands, so this is a partial answer rather than a failure.
    return Response.json(
      { mark, reveal, graded: null, corrections: mechanical, aiAvailable: false, quotaMessage: decision.message },
      { headers: NO_STORE, status: 200 },
    );
  }

  // Set the moment the reservation is settled, so the catch below can tell a
  // grader that never ran from one that ran and then tripped over its own
  // verification. Only the first is owed its authorization back.
  let settled = false;
  try {
    const level = await courseLevelFor(ownerId);
    const chain = resolveProviders({ purpose: "grader", allowFallback: decision.fallbackAllowed });
    // The notes are written in the language the learner reads the app in.
    const language = await localeFor(ownerId).catch(() => "en" as const);

    const { graded, usage, config: answered } = await gradeDescription(chain, {
      situation: picture.title,
      things: words.map((w) => ({ emoji: w.emoji, lemma: w.lemma, translation: w.translation })),
      knownForms,
      wordForms,
      sentences: sentences.map((text, i) => ({
        text, unknown: mark.sentences[i]!.unknown,
      })),
      level,
      language,
    });

    after(() => recordUsage({
      ownerId, kind: "GRADER", provider: answered.name, model: answered.model,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      // Priced at the cache rates where the provider reported a split.
      cachedInputTokens: usage.cachedInputTokens, cacheWriteTokens: usage.cacheWriteTokens,
      reservation: decision.reservation,
    }));
    settled = true;

    /*
      ADR-005, enforced rather than requested. The marking above came from the
      dictionary and stands whatever happens here; what is withheld is only a
      note that introduced an Estonian form nobody supplied, and only that
      note: the other four are independent remarks.
    */
    const glosses = words.map((w) => w.translation);
    const everything = sentences.join(" ");
    let withheld: string[] = [];
    let withheldReason: WithholdReason | null = null;
    let reply = graded;
    if (reply) {
      const note = (verified: { unverified: string[]; reason: WithholdReason | null }) => {
        if (!verified.reason) return;
        withheld = [...withheld, ...verified.unverified];
        withheldReason = withheldReason === "estonian-form" ? withheldReason : verified.reason;
      };
      const one = reply.sentences.map((g, i) => {
        const verified = verifyVerdict(g, vouched, sentences[i]!, glosses);
        note(verified);
        return verified.graded;
      });
      const summary = verifyVerdict({ comment: reply.wentWell, rule: reply.workOn }, vouched, everything, glosses);
      note(summary);
      reply = {
        sentences: one,
        fixes: reply.fixes,
        wentWell: summary.graded.comment,
        workOn: summary.graded.rule,
      };
      if (withheldReason) {
        reportError(new Error("grader introduced an unverified Estonian form"), {
          at: "api/describe/verify", ownerId,
          extra: { model: answered.model, unverified: withheld, picture: picture.id },
        });
      }
    }

    // A swap is kept only for a sentence the model did not call correct, and only where the
    // form it offers is one the dictionary supplied (see `correctionsFor`).
    const proposed = (reply?.fixes ?? []).map((fixes, i) => (reply?.sentences[i]?.verdict === "correct" ? [] : fixes));
    const corrections = correctionsFor(sentences, mark.sentences, vouched, proposed, sameWord);
    const shown = reply ? { sentences: reply.sentences, wentWell: reply.wentWell, workOn: reply.workOn } : null;
    return Response.json({ mark, reveal, graded: shown, corrections, aiAvailable: true, withheld, withheldReason }, { headers: NO_STORE });
  } catch (error) {
    const booking = decision.reservation;
    if (!settled && booking) after(() => releaseReservation(booking));
    if (!(error instanceof TutorError)) {
      reportError(error, { at: "api/describe", ownerId, extra: { model: config.model } });
    }
    // Degrades to the mechanical result, which is the important half anyway.
    return Response.json({ mark, reveal, graded: null, corrections: mechanical, aiAvailable: false }, { headers: NO_STORE });
  }
}
