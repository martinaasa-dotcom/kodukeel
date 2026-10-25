import { prisma } from "@/lib/db";
import { eraseAuthIdentity, remainingIdentityNote } from "@/lib/auth/erase";
import { isConfirmed } from "@/lib/copy/confirmWord";
import { tr } from "@/lib/copy/locale";
import { safeMessage } from "@/lib/observability/report";
import { localeFor } from "@/lib/progress/locale";
import { forgetSettings } from "@/lib/settings/store";
import { ERASED_OWNER, ERASED_PREFIX, erasedOwnerKey } from "@/lib/usage/erasedSpend";
import { utcDay } from "@/lib/usage/quota";
import { typedBy } from "@/lib/account/export";
import { checkSharedRateLimit } from "@/lib/usage/sharedLimit";

const ERASURES_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * DELETES EVERYTHING BELONGING TO ONE ACCOUNT (D8, ADR-029).
 *
 * The body `deleteMyAccount` in `app/actions.ts` used to hold, moved here
 * unchanged so that the web's Settings and `DELETE /api/v1/me` are two doors
 * over one erasure (D2). The owner is a parameter; each door resolves it its
 * own way, the web from the cookie and the native app from a bearer token.
 * The confirmation is asked here rather than at either door, so the word a
 * learner has to type is one rule wherever they type it.
 *
 * The privacy page promises this, so it has to exist: a promise about data the
 * software cannot keep is worse than no promise.
 *
 * The review log is deleted here and only here. Append-only means no updates and
 * no incidental deletes, not that a person cannot ask for their own history to
 * be erased, which is the one request that outranks the invariant. It all goes
 * in one transaction, so a half-deleted account is not a reachable state.
 *
 * The shared dictionary stays: removing a word other learners hold cards for
 * would delete *their* data to satisfy this request. The attribution on anything
 * this person edited is cleared instead.
 *
 * ERASURE HAS NO EXEMPTIONS. `lib/account/deletion.itest.ts` gives every
 * owner-scoped model in the schema a row and asserts this empties all of them,
 * and the invariant "erasure has no exemptions at all" reads this file for a
 * `deleteMany` per model.
 */
export type AccountDeletion =
  | { ok: true; remaining: string | null; identityErased: boolean }
  | { ok: false; reason: "unconfirmed" | "failed"; error: string };

export async function deleteAccountFor(ownerId: string, confirmation: unknown): Promise<AccountDeletion> {
  /* The word in any of the three languages: the screen asks in the reader's own. */
  if (!isConfirmed(confirmation, "delete")) {
    return { ok: false, reason: "unconfirmed", error: 'Type "delete" to confirm.' };
  }
  /*
    A two-minute transaction over every table this person owns, behind a word
    anybody can type, from a public endpoint on each door. Counted where every
    instance sees it and keyed on the id, which outlives the account, so a
    script cannot make the database do this on a loop. Nobody deletes an
    account ten times in a day.
  */
  const allowed = await checkSharedRateLimit(`erase:o:${ownerId}`, ERASURES_PER_DAY, DAY_MS);
  if (!allowed.ok) {
    return { ok: false, reason: "failed", error: tr(await localeFor(ownerId), "Too many tries today, so nothing was deleted. Try again tomorrow.") };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.review.deleteMany({ where: { ownerId } });
      await tx.card.deleteMany({ where: { ownerId } });
      await tx.task.deleteMany({ where: { ownerId } });
      await tx.studyEvent.deleteMany({ where: { ownerId } });
      await tx.message.deleteMany({ where: { ownerId } });
      await tx.starredWord.deleteMany({ where: { ownerId } });
      // Their own shelves. `onDelete: Cascade` on DeckWord.deck would take the
      // membership rows with each deck; deleted explicitly anyway, since a
      // promise this absolute is not left to a foreign key to keep. The
      // words themselves, their cards and every review are untouched, since
      // a deck was only ever a label.
      await tx.deckWord.deleteMany({ where: { ownerId } });
      await tx.deck.deleteMany({ where: { ownerId } });
      await tx.achievement.deleteMany({ where: { ownerId } });
      /*
        Letters before settings, and the order is load-bearing. The unsubscribe
        link and the bounce webhook write a setting with no session behind them,
        and `writeSettingsWhileMailed` holds this person's `EmailSend` row while
        it does. Deleting that row first makes such a write either wait for this
        transaction and then find nobody, or finish first and be swept by the
        next line, so no setting outlives the account.
      */
      await tx.emailSend.deleteMany({ where: { ownerId } });
      // Every browser they asked to be reminded on, so nothing is pushed to
      // a person who is no longer here.
      await tx.pushSubscription.deleteMany({ where: { ownerId } });
      // And every phone (N-9), for the same reason.
      await tx.nativePushDevice.deleteMany({ where: { ownerId } });
      await tx.setting.deleteMany({ where: { ownerId } });
      forgetSettings(ownerId);
      /*
        Today's spending stays on the ledger under a key that names nobody,
        because the daily caps are sums over these rows and deleting them handed
        the day's allowance back: spend, delete, and the same token carries on.
        Everything older goes, and any earlier day's keys are swept down to the
        one anonymous owner. See lib/usage/erasedSpend.ts.
      */
      const today = utcDay(new Date());
      await tx.usageEvent.updateMany({ where: { ownerId, day: today }, data: { ownerId: erasedOwnerKey(ownerId, today) } });
      await tx.usageEvent.updateMany({
        where: { ownerId: { startsWith: ERASED_PREFIX }, day: { lt: today } },
        data: { ownerId: ERASED_OWNER },
      });
      await tx.usageEvent.deleteMany({ where: { ownerId } });
      await tx.scan.deleteMany({ where: { ownerId } });
      /*
        Append-only means never edited, not never erased on request. A level
        check is a measurement of this person and it goes with the rest of
        them, or the deletion promise on /privacy is not one.
      */
      await tx.assessment.deleteMany({ where: { ownerId } });
      /*
        And a mock sitting, for the same reason and more strongly. It is the
        only table holding something the learner composed at length: the
        marked paper carries the writing part back verbatim. That was left
        behind by every deletion this app performed until now, which made the
        one category of free-form writing in the schema the one category that
        survived "delete everything".
      */
      await tx.examAttempt.deleteMany({ where: { ownerId } });
      /*
        Their membership of somebody else's class, which carries the name they
        chose to be known by in it. A class they run goes too, and its roster
        rows cascade with it: the code, the name and the roster all hang off a
        teacher who no longer exists, and there is no owner to hand them to. It
        costs the pupils nothing they own — a membership row is a display name
        and a join date, and every card, review and level check any of them
        made is theirs and stays where it is.
      */
      await tx.classroomMember.deleteMany({ where: { ownerId } });
      await tx.classroom.deleteMany({ where: { ownerId } });
      /*
        What they reported as wrong. Their own words, and a reply written to
        them, so it goes with the rest of them. A report they sent that was
        already accepted has changed the shared dictionary and that change
        stays, exactly as an edit they made by hand does: undoing it would
        delete other learners' data to satisfy this request. What is removed
        is the row that ties the report to a person.
      */
      await tx.suggestion.deleteMany({ where: { ownerId } });
      /*
        Every conversation they had and every word one of them needed.
        `SceneRun` is append-only like `Review` and `Assessment`, and this is
        the single exception all three share: the promise on /privacy outranks
        the rule. The gaps go first because they point at a run.
      */
      await tx.sceneGap.deleteMany({ where: { ownerId } });
      await tx.sceneRun.deleteMany({ where: { ownerId } });
      // And every real conversation they reported having outside the app.
      await tx.encounter.deleteMany({ where: { ownerId } });
      // And every word they put aside. What the deployment counted from it
      // goes with the row, which is the right way round: the count is a
      // reading of how many people said a thing, and this person is leaving.
      await tx.deferral.deleteMany({ where: { ownerId } });
      await tx.courseStep.deleteMany({ where: { ownerId } });
      /*
        Every record that this deployment wrote to them went above, before the
        settings: it is the row that decides whether they are written to again,
        and the row the mail routes check before they write a setting.
      */
      /*
        THE SENTENCES THEY TYPED ONTO SHARED WORDS GO, AND SO DO WORDS ONLY THEY USED.

        A sentence a learner added from class lives inside the word's own
        `examples` JSON with `by` set to them, so no `deleteMany` above reached
        it: it is their writing on a row everybody shares. Each such word is
        found by the text the serializer leaves (`typedBy`) and rewritten
        without their sentences, everybody else's left exactly as they were.

        And a word they added by hand or confirmed off a photograph (provenance
        USER or AI, `editedBy` them) is their own entry, not the shared
        dictionary's. It is deleted where nothing of anybody else's points at
        it, which by now is the test for "anybody", since every row of theirs
        is already gone; its forms cascade with it. A word another learner
        holds a card for, starred, shelved, reviewed, put aside, met in a
        conversation or reported keeps existing, because deleting it would
        delete their data, and only the attribution is cleared below.
      */
      const typedOn = await tx.lexeme.findMany({
        where: { examples: { contains: typedBy(ownerId) } },
        select: { id: true, examples: true },
      });
      for (const row of typedOn) {
        let list: unknown;
        try {
          list = JSON.parse(row.examples);
        } catch {
          continue;
        }
        if (!Array.isArray(list)) continue;
        const kept = list.filter((e) => !(e && typeof e === "object" && (e as { by?: unknown }).by === ownerId));
        if (kept.length !== list.length) {
          await tx.lexeme.update({ where: { id: row.id }, data: { examples: JSON.stringify(kept) } });
        }
      }
      const created = await tx.lexeme.findMany({
        where: {
          editedBy: ownerId,
          provenance: { in: ["USER", "AI"] },
          cards: { none: {} }, stars: { none: {} }, deckWords: { none: {} },
        },
        select: { id: true },
      });
      if (created.length > 0) {
        const ids = created.map((l) => l.id);
        // The four tables that point at a word by a plain column, with no relation to ask through.
        const [reviewed, deferred, gaps, reported] = await Promise.all([
          tx.review.groupBy({ by: ["lexemeId"], where: { lexemeId: { in: ids } } }),
          tx.deferral.groupBy({ by: ["lexemeId"], where: { lexemeId: { in: ids } } }),
          tx.sceneGap.groupBy({ by: ["lexemeId"], where: { lexemeId: { in: ids } } }),
          tx.suggestion.groupBy({ by: ["lexemeId"], where: { lexemeId: { in: ids } } }),
        ]);
        const held = new Set([...reviewed, ...deferred, ...gaps, ...reported].map((r) => r.lexemeId));
        const unheld = ids.filter((id) => !held.has(id));
        if (unheld.length > 0) await tx.lexeme.deleteMany({ where: { id: { in: unheld } } });
      }
      await tx.lexeme.updateMany({ where: { editedBy: ownerId }, data: { editedBy: null } });
      /*
        And the attribution on anything they reviewed, for the same reason the
        line above clears `editedBy`: a decision stays on the record, the name
        against it does not.
      */
      await tx.suggestion.updateMany({ where: { reviewedBy: ownerId }, data: { reviewedBy: null } });
    }, { timeout: 120_000 });
  } catch (error) {
    return {
      ok: false as const,
      reason: "failed" as const,
      // Redacted: what the database says can name the deployment's own host and
      // user, and this sentence goes to a browser. See lib/observability/report.
      error: `${tr(await localeFor(ownerId), "Something went wrong partway, so nothing was deleted.")} ${safeMessage(error)}`.trim(),
    };
  }

  /*
    AND THEN THE IDENTITY, WHICH IS NOT IN ANY OF THOSE TABLES.

    Everything above is this app's schema. The email address, the Google
    subject id and the sign-in history live in Supabase Auth, and deleting the
    rows left all of it behind with no route to remove it and nothing on the
    page saying so. An email address is personal data wherever it is kept, so
    "delete everything" that keeps it is not the promise /privacy makes.

    Deliberately after the transaction and outside it: the rows are already
    gone and must stay gone whatever the auth store answers. A failure here is
    reported to the learner as what is left rather than as a failed deletion,
    because those are different facts and only one of them needs following up.
  */
  const identity = await eraseAuthIdentity(ownerId);

  return { ok: true as const, remaining: remainingIdentityNote(identity), identityErased: identity.erased };
}
