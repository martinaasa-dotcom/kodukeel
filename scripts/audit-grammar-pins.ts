/**
 * WHAT IS KEEPING EVERY GRAMMAR EXAMPLE HONEST, READ RATHER THAN COUNTED.
 *
 * `lib/estonian/grammarExamples.test.ts` fails the build on the one thing that
 * is certainly wrong, which is a marked word that is not the slot the pin
 * claims. It cannot say anything useful about the rest, and the rest is where
 * the work is: a pin nothing can check, a spelling Estonian gives to three
 * cases at once, a sentence doing duty under four different points, and 230
 * lines nobody who speaks the language has read.
 *
 * So this prints the list rather than a rate, for the reason `npm run
 * eval:scene` prints one: a percentage says there is something to look at and
 * a list says what. Read it before pinning more.
 *
 * Reports and never writes. It exits non-zero only on a wrong slot, which is
 * the same claim the unit test makes, so running it is never a way to find out
 * something CI did not already refuse.
 *
 * Offline. No database, no network, no key.
 */
import {
  CASE_EXAMPLES, EXAMPLE_GAPS, TOPIC_EXAMPLES, type PinnedExample,
} from "../lib/estonian/grammarExamples";
import { buildSlotIndex, readSlot, type SlotVerdict } from "./lib/slotIndex";

interface Filed {
  readonly kind: "topic" | "case";
  readonly id: string;
  readonly point: string;
  readonly pin: PinnedExample;
  /** What the pin claims, explicitly or by the page it is on. */
  readonly claim: string | null;
}

function everyPin(): Filed[] {
  const out: Filed[] = [];
  for (const [id, pins] of Object.entries(TOPIC_EXAMPLES)) {
    for (const [point, list] of Object.entries(pins)) {
      for (const pin of list) out.push({ kind: "topic", id, point, pin, claim: pin.slot ?? null });
    }
  }
  for (const [id, pins] of Object.entries(CASE_EXAMPLES)) {
    for (const [point, list] of Object.entries(pins)) {
      // The page's own case is the claim, so a case pin needs no field.
      for (const pin of list) out.push({ kind: "case", id, point, pin, claim: pin.slot ?? `CASE:${id}` });
    }
  }
  return out;
}

function say(f: Filed, tail: string): string {
  return `  ${f.kind}:${f.id}  ${f.pin.form.padEnd(16)} ${tail}\n      ${f.pin.et}\n      under: ${f.point}`;
}

const index = buildSlotIndex();
const pins = everyPin();

const wrong: string[] = [];
const shared: string[] = [];
const unknown: string[] = [];
const unclaimed: string[] = [];
let verified = 0;

for (const f of pins) {
  if (!f.claim) { unclaimed.push(say(f, "(claims no slot)")); continue; }
  const v: SlotVerdict = readSlot(index, f.pin.form, f.claim);
  if (v.kind === "verified") { verified += 1; continue; }
  if (v.kind === "wrong") wrong.push(say(f, `claims ${f.claim}, dictionary says ${v.instead.join(", ")}`));
  else if (v.kind === "shared") shared.push(say(f, `${f.claim}, and also ${v.others.join(", ")}`));
  else unknown.push(say(f, `claims ${f.claim}, which no entry spells this way`));
}

/**
 * A sentence carrying more than one point.
 *
 * Across pages this is the dictionary being used well rather than thinly:
 * `Käisin meres ujumas.` is the imperfect on one page and the inessive on
 * another, and nobody reads both in one sitting. Twice on ONE page is the
 * fault, because there a reader meets the same line under two claims and
 * reads it as a dictionary with nothing else in it.
 */
const perSentence = new Map<string, Filed[]>();
for (const f of pins) {
  (perSentence.get(f.pin.et) ?? perSentence.set(f.pin.et, []).get(f.pin.et)!).push(f);
}
const reused = [...perSentence.entries()].filter(([, uses]) => uses.length > 1)
  .sort((a, b) => b[1].length - a[1].length);
const twice = reused.filter(([, uses]) => new Set(uses.map((u) => `${u.kind}:${u.id}`)).size < uses.length);

const section = (title: string, lines: readonly string[]) => {
  console.log(`\n${title} (${lines.length})`);
  if (lines.length === 0) console.log("  none");
  for (const line of lines) console.log(line);
};

console.log(`${pins.length} pins over ${perSentence.size} distinct sentences.`);
console.log(`${verified} verified against the dictionary's own forms.`);
console.log(`${Object.keys(EXAMPLE_GAPS).length} points answered with a written reason instead.`);

section("WRONG — the marked word is not the slot claimed", wrong);
section("SHARED — Estonian spells more than one slot this way, so nothing can be asserted", shared);
section("UNKNOWN — a slot the dictionary does not store, so nothing here can check it", unknown);
section("UNCLAIMED — no slot to check, because the point is not about one", unclaimed);

console.log(`\nTWICE ON ONE PAGE (${twice.length})`);
if (twice.length === 0) console.log("  none");
for (const [et, uses] of twice) {
  console.log(`  ${et}`);
  for (const u of uses) console.log(`      ${u.kind}:${u.id} — ${u.point}`);
}

console.log(`\nREUSED — one sentence under several points (${reused.length})`);
if (reused.length === 0) console.log("  none");
for (const [et, uses] of reused) {
  console.log(`  ${et}`);
  for (const u of uses) console.log(`      ${u.kind}:${u.id} — ${u.point}`);
}

if (wrong.length > 0) {
  console.error(`\n${wrong.length} pin(s) mark a word that is not what they say it is.`);
  process.exit(1);
}
