import { apiJson, readQuery } from "@/lib/api/respond";
import { DictionaryQuery, type DictionaryResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { searchDictionary } from "@/lib/progress/dictionarySearch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A DICTIONARY SEARCH (N-6, ADR-029).
 *
 * The body is `searchDictionary`, which the dictionary page calls too (D2):
 * the local search, the forms list where the spelling is a form of a headword,
 * and Ekilex asked live where a key is set, behind the per-owner cap
 * `lookupAndStore` holds for both doors. The dead end's other ways in (a
 * near spelling, the English asked of Wiktionary) are the page's and stay
 * there; a phone that finds nothing offers the web.
 */
export async function GET(request: Request) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const query = readQuery(request, DictionaryQuery);
  if (!query.ok) return query.response;
  const found = await searchDictionary(who.ownerId, query.data.q);
  const body: DictionaryResponse = { hits: found.hits, knownAs: found.knownAs, fetched: found.fetched };
  return apiJson(body);
}
