/*
  THE ENTRY A PHONE IS HANDED IS THE ENTRY THE WEB DRAWS, AND THE SAME HOLDS
  FOR A SEARCH, A PAGE READ AND A THING NAMED.

  `GET /api/v1/words/{id}` publishes `WordResponse` and the web's dictionary
  draws `EntryView`, and both are what `openEntry` builds; the search, the scan
  and the speech forms are the same shape on both doors too. This holds each
  schema and the type the body returns to each other in both directions, at
  compile time, as the review card's test does: `tsc --noEmit` fails on a field
  either side grows alone. The test body is there so the file is a test vitest
  runs.
*/
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import type {
  DeckResponse, DictionaryResponse, RecordingsResponse, ScanResponse, SearchHitSchema, WordResponse,
} from "@/lib/api/contract";
import type { NativeKind } from "@/lib/audio/native";
import type { SearchHit } from "@/lib/dict/search";
import type { EntryView } from "@/lib/progress/dictionaryEntry";
import type { DictionarySearch } from "@/lib/progress/dictionarySearch";
import type { ScanReading } from "@/lib/progress/scanRead";
import type { DeferReason } from "@/lib/srs/defer";

/** True only where each type is assignable to the other. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const entryAgrees: Same<z.infer<typeof WordResponse>, EntryView> = true;
const hitAgrees: Same<z.infer<typeof SearchHitSchema>, SearchHit> = true;
const searchAgrees: Same<z.infer<typeof DictionaryResponse>, DictionarySearch> = true;
const readingAgrees: Same<z.infer<typeof ScanResponse>, ScanReading> = true;
const kindsAgree: Same<z.infer<typeof RecordingsResponse>["clips"][number]["kind"], NativeKind> = true;
const reasonsAgree: Same<NonNullable<z.infer<typeof DeckResponse>["aside"]>["reason"], DeferReason> = true;

describe("the v1 words contract", () => {
  it("names the web's entry, search, scan and recordings exactly", () => {
    expect([entryAgrees, hitAgrees, searchAgrees, readingAgrees, kindsAgree, reasonsAgree]).toEqual([true, true, true, true, true, true]);
  });
});
