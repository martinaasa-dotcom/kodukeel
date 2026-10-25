/**
 * Ekilex API client. Server-side only: the key never reaches the browser.
 *
 * Ekilex is the Institute of the Estonian Language's lexicographic database, and
 * the authority for Estonian morphology. Everything it returns is stored with
 * `provenance: EKILEX`; nothing here is generated.
 *
 * Dictionary data is CC BY 4.0, so the entry credits it on screen
 * (`app/(app)/dictionary/EkilexCredit.tsx`): attribution is a condition of the
 * license, not a courtesy.
 *
 * EVERY REQUEST GOES THROUGH ONE GATE, THE APP'S AND THE SCRIPTS' ALIKE.
 *
 * `docs/05-integrations.md` section 1.4 promised a concurrency cap of two and
 * exponential backoff on 429 and 5xx, and for most of this app's life nothing
 * did either: the harvest ran six workers, four scripts kept a fetch of their
 * own, and no request said who sent it. `ekilexRequest` is now the only place a
 * request to ekilex.ee is made. It holds at most `EKILEX_IN_FLIGHT` requests in
 * flight per process, retries a 429 or a 5xx with exponential backoff and
 * jitter up to `EKILEX_TRIES` tries, honors a deadline so a page never waits
 * on a backoff it cannot afford, and names itself in a `User-Agent` built by
 * `ekilexUserAgent` in `lib/legal/operator.ts`. A refusal (401, 403 and the
 * rest of 4xx) is never retried, and a request that gives up comes back
 * `failed`, which `lib/ekilex/harvestGuard.ts` already treats as "keep what we
 * had".
 *
 * Counted by the caller, never in here: `lib/dict/lookup.ts` hands in an
 * `EkilexTally`, the gate fills it, and the lookup writes it to `EkilexDay`.
 * The scripts run on somebody's own machine against whatever database they
 * point at, so a count written from them would land on the wrong installation.
 */
import packageJson from "../../package.json";
import { ekilexUserAgent } from "../legal/operator";
import { readAnswer, type Answer, type ResponseLike } from "./harvestGuard";

const BASE = "https://ekilex.ee/api";

/** Datasets worth reading: the unified EKI dictionary plus the morphology base. */
const DATASETS = "eki,mab";

export interface EkilexWordSummary {
  wordId: number;
  wordValue: string;
  homonymNr: number;
  lang: string;
}

export interface EkilexForm {
  value: string;
  morphCode: string;
  morphValue: string;
}

/**
 * One set of inflected forms for a word, as Ekilex groups them.
 *
 * A word can have more than one: a noun set and a verb set where the same
 * spelling is both. Ekilex's own JSON calls this group by a linguist's word,
 * which is the one place in this app that word survives, because renaming a
 * key we do not own would be renaming their data rather than ours.
 */
export interface EkilexFormSet {
  inflectionType: string | null;
  wordClass: string | null;
  forms: EkilexForm[];
}

export interface EkilexDetails {
  wordId: number;
  wordValue: string;
  formSets: EkilexFormSet[];
  /** Estonian explanatory definitions — Ekilex has no English glosses on this key. */
  definitions: string[];
  /** Question words encoding a verb's case government, e.g. "mida", "kellele". */
  governments: string[];
  /**
   * Real Estonian sentences using the word, as lexicographers recorded them —
   * "Jõin tassi kohvi." These are the only source of example sentences the app
   * has, and the reason it can offer cloze and sentence-building exercises at
   * all: every character is attested Estonian, not generated (ADR-005).
   */
  usages: string[];
  cefr: string | null;
  /**
   * The Institute's semantic type codes for the word's primary sense.
   *
   * `loom` for a horse, `in_elukutse` for a teacher, `koht_hoone` for a room.
   * Estonian chooses between two whole sets of local cases on this fact and
   * nothing in a word's spelling carries it, so without this the app drilled
   * `hobusesse` and `koeras`. See `lib/estonian/semantics.ts`, which is the
   * only place these are read, and `primarySemanticTypes` below for why the
   * primary sense alone.
   */
  semanticTypes: string[];
  /**
   * THE INSTITUTE'S OWN RUSSIAN AND UKRAINIAN, WHICH IS NOT A TRANSLATION THIS
   * APP MADE.
   *
   * Most people learning Estonian in Estonia already speak Russian or
   * Ukrainian, and telling them `kohv` is "coffee" asks them to go through a
   * third language to reach a word their own would have landed instantly.
   * Ekilex records the equivalents in `synonymLangGroups`, in the same
   * response the harvest already fetches and caches, written by the same
   * lexicographers who wrote the Estonian: 1,965 of the 1,975 entries in the
   * cache carry a Russian one and 1,755 a Ukrainian one.
   *
   * ADR-005 is untouched by this and is the reason it is worth having: no
   * model writes a character of it, exactly as with the forms and the
   * sentences. Nothing here is Estonian either, so the ban on writing Estonian
   * has nothing to say about it.
   */
  translations: { rus: string[]; ukr: string[] };
}

export function ekilexConfigured(): boolean {
  return Boolean(process.env.EKILEX_API_KEY);
}

/** At most this many requests in flight to Ekilex per process, as section 1.4 promised. */
export const EKILEX_IN_FLIGHT = 2;

/** Tries per request, the first one included, before it is recorded as failed. */
export const EKILEX_TRIES = 3;

/**
 * The longest a page waits for an upgrade it does not need. The dictionary
 * gives a live lookup this much, so a backoff happens inside it or not at all.
 */
export const PAGE_DEADLINE_MS = 2_500;

/** The first backoff, doubled on each try after it and jittered by up to half again. */
const BACKOFF_BASE_MS = 500;

/** A `Retry-After` longer than this is a service asking to be left alone, and is not waited out. */
const RETRY_AFTER_CAP_MS = 30_000;

/** How long one request may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 15_000;

export type EkilexKind = "search" | "details";

/**
 * What a run of requests asked of Ekilex, filled in by the gate.
 *
 * `search` and `details` count requests that reached the network, once each
 * however many tries they took. `refused` and `failed` count the ones of those
 * that ended that way. A request that never got a slot before its deadline is
 * in none of them, because Ekilex never saw it.
 */
export interface EkilexTally {
  search: number;
  details: number;
  refused: number;
  failed: number;
}

export function emptyTally(): EkilexTally {
  return { search: 0, details: 0, refused: 0, failed: 0 };
}

export interface GateOptions {
  /** Epoch milliseconds past which nothing waits: no slot, no backoff, no retry. */
  deadline?: number;
  /** Which kind of request this is, for the tally. */
  kind?: EkilexKind;
  /** Filled in as the request goes, for a caller that counts. */
  tally?: EkilexTally;
}

/** What the gate needs from the world, handed in so a test can stub every piece. */
export interface GateDeps {
  fetch: (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<ResponseLike & { headers?: { get(name: string): string | null } }>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  random: () => number;
  key: () => string | undefined;
  userAgent: () => string;
  /** How many may be in flight at once. */
  limit: number;
  timeoutMs?: number;
}

export interface EkilexGate {
  request<T>(path: string, options?: GateOptions): Promise<Answer<T>>;
  /** Raise or lower the cap, for a script run with `--past-the-limit`. */
  setLimit(limit: number): void;
  /** How many requests are in flight right now. For tests. */
  inFlight(): number;
}

/**
 * The backoff before try `n` (1 for the second try): `BACKOFF_BASE_MS` doubled
 * per try, plus up to half of that again at random so two instances that
 * failed together do not come back together. A `Retry-After` the service sent
 * is honored where it is longer, up to `RETRY_AFTER_CAP_MS`.
 */
export function backoffMs(n: number, random: number, retryAfterMs: number | null = null): number {
  const base = BACKOFF_BASE_MS * 2 ** (n - 1);
  const jittered = Math.round(base + base * 0.5 * random);
  if (retryAfterMs !== null && retryAfterMs > jittered) return Math.min(retryAfterMs, RETRY_AFTER_CAP_MS);
  return jittered;
}

/** A `Retry-After` in seconds or as an HTTP date, read into milliseconds. */
function retryAfter(value: string | null | undefined, now: number): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - now) : null;
}

export function createEkilexGate(deps: GateDeps): EkilexGate {
  let limit = Math.max(1, Math.floor(deps.limit));
  let active = 0;
  const waiting: { grant: () => void; cancel: () => void }[] = [];

  const release = () => {
    active -= 1;
    while (active < limit && waiting.length > 0) {
      const next = waiting.shift()!;
      active += 1;
      next.grant();
    }
  };

  /** A slot, or false when the deadline passed first. */
  const acquire = (deadline: number | undefined): Promise<boolean> => {
    if (active < limit) {
      active += 1;
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const entry = {
        grant: () => { clearTimeout(timer); resolve(true); },
        cancel: () => resolve(false),
      };
      waiting.push(entry);
      if (deadline !== undefined) {
        const left = deadline - deps.now();
        timer = setTimeout(() => {
          const i = waiting.indexOf(entry);
          if (i >= 0) {
            waiting.splice(i, 1);
            entry.cancel();
          }
        }, Math.max(0, left));
      }
    });
  };

  return {
    setLimit(next: number) {
      limit = Math.max(1, Math.floor(next));
      while (active < limit && waiting.length > 0) {
        active += 1;
        waiting.shift()!.grant();
      }
    },
    inFlight: () => active,
    async request<T>(path: string, options: GateOptions = {}): Promise<Answer<T>> {
      const key = deps.key();
      if (!key) return { kind: "refused", status: 0 };
      const { deadline, kind, tally } = options;
      let sent = false;
      let last: Answer<T> = { kind: "failed", reason: "no slot before the deadline" };

      for (let attempt = 1; attempt <= EKILEX_TRIES; attempt++) {
        if (!(await acquire(deadline))) break;
        let retryAfterMs: number | null = null;
        try {
          if (!sent && kind && tally) tally[kind] += 1;
          sent = true;
          last = await readAnswer<T>(async () => {
            const res = await deps.fetch(`${BASE}${path}`, {
              headers: { "ekilex-api-key": key, "user-agent": deps.userAgent() },
              signal: AbortSignal.timeout(deps.timeoutMs ?? REQUEST_TIMEOUT_MS),
            });
            retryAfterMs = retryAfter(res.headers?.get("retry-after"), deps.now());
            return res;
          });
        } finally {
          release();
        }
        if (last.kind !== "failed" || attempt === EKILEX_TRIES) break;
        // A service asking to be left alone for longer than the cap is left
        // alone: the request fails now rather than sleeping and asking again.
        if (retryAfterMs !== null && retryAfterMs > RETRY_AFTER_CAP_MS) break;
        const wait = backoffMs(attempt, deps.random(), retryAfterMs);
        // A page waits for nothing it cannot afford: past the deadline the
        // request is given up rather than slept on.
        if (deadline !== undefined && deps.now() + wait >= deadline) break;
        await deps.sleep(wait);
      }

      if (sent && tally) {
        if (last.kind === "refused") tally.refused += 1;
        if (last.kind === "failed") tally.failed += 1;
      }
      return last;
    },
  };
}

/** The app's one gate, built on first use from the environment. */
let shared: EkilexGate | null = null;

export function ekilexGate(): EkilexGate {
  shared ??= createEkilexGate({
    fetch: (url, init) => fetch(url, init),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    random: () => Math.random(),
    key: () => process.env.EKILEX_API_KEY,
    userAgent: () => ekilexUserAgent(packageJson.version),
    limit: EKILEX_IN_FLIGHT,
  });
  return shared;
}

/** One request to Ekilex, through the gate. Every request in this repository comes through here. */
export function ekilexRequest<T>(path: string, options?: GateOptions): Promise<Answer<T>> {
  return ekilexGate().request<T>(path, options);
}

async function call<T>(path: string, options?: GateOptions): Promise<T | null> {
  // A dictionary lookup failing must never take the page down; the caller
  // falls back to the local dictionary.
  const answer = await ekilexRequest<T>(path, options).catch(() => null);
  return answer?.kind === "answered" ? answer.value : null;
}

export async function searchEkilex(query: string, options?: GateOptions): Promise<EkilexWordSummary[]> {
  return (await searchEkilexAnswered(query, options)) ?? [];
}

/**
 * The same search, with "Ekilex did not answer" kept apart from "Ekilex holds
 * nothing". `searchEkilex` folds both into an empty list, which is right for a
 * search box falling back to the local dictionary and wrong for anything that
 * reports what Ekilex holds: `npm run audit:homonyms`, run with no key or
 * against a refusal, printed "no Ekilex homonym has those parts, so the page
 * is the one that is wrong" about `laid`, whose homonym 192289 has exactly
 * the page's parts. A refusal is not a miss.
 */
/**
 * Whether a string may be put in Ekilex's search path as a word.
 *
 * `encodeURIComponent` leaves `.` and `*` alone. A query of `.` or `..` is a
 * path segment the URL parser resolves, so the request went to a different
 * Ekilex endpoint carrying the deployment's key, and `*` and `?` are Ekilex's
 * wildcards, so `a*` asked for every word beginning with a and stored the first
 * one as an entry. A headword is letters with the odd hyphen, apostrophe or
 * space; nothing a learner can usefully look up is refused by this.
 */
export function searchableWord(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  if (/^\.+$/.test(trimmed)) return false;
  return !/[*?/\\%#]/.test(trimmed);
}

export async function searchEkilexAnswered(
  query: string,
  options?: GateOptions,
): Promise<EkilexWordSummary[] | null> {
  // Not asked is an answer of nothing, which is what such a word gets anyway.
  if (!searchableWord(query)) return [];
  const data = await call<{ words?: EkilexWordSummary[] }>(
    `/word/search/${encodeURIComponent(query)}/${DATASETS}`,
    { ...options, kind: "search" },
  );
  return data ? (data.words ?? []).filter((w) => w.lang === "est") : null;
}

/**
 * The semantic type codes on the word's primary sense.
 *
 * THE PRIMARY SENSE, NOT THE UNION. Ekilex answers for the whole word, senses
 * and all, and a word's later senses wander far enough to be wrong about it:
 * `jõgi` carries `inimene` on a metaphor about a river of people and `pilv`
 * carries `loom_putukas`, so a union would have the app drilling a river as
 * though it were a person. Taking the source's own sense order is the same
 * rule the gloss pipeline follows over a Wiktionary page.
 *
 * ALL OF THAT SENSE'S CODES, THOUGH, because one meaning carries several and
 * the one that matters is not always first: `arst` is `esitus_tiitel` and
 * `in_elukutse`, and only the second says it is a person.
 *
 * `eki` alone, because the other datasets on a word id are etymology and term
 * bases which carry no semantic type at all, and letting one of those be the
 * first lexeme would decide the answer by which dataset happened to sort first.
 *
 * Exported because two scripts read the same field off their own cached copies
 * of this response, and a second reading of somebody else's JSON is where the
 * two stop agreeing.
 */
export function primarySemanticTypes(
  lexemes: readonly { datasetCode?: string; meaning?: { semanticTypes?: { code?: string }[] } }[]
    | undefined,
): string[] {
  for (const lexeme of lexemes ?? []) {
    if (lexeme.datasetCode !== "eki") continue;
    const codes = (lexeme.meaning?.semanticTypes ?? [])
      .map((s) => s.code)
      .filter((code): code is string => Boolean(code));
    // A sense the Institute has typed nothing on is not an answer, so the next
    // one is asked rather than the word being written down as unclassified.
    if (codes.length > 0) return [...new Set(codes)];
  }
  return [];
}

/**
 * THE INSTITUTE'S RUSSIAN AND UKRAINIAN FOR A WORD, OFF ITS OWN RESPONSE.
 *
 * `MEANING_WORD` is the synonym that *is* this meaning in that language; the
 * other synonym kinds are relations between meanings rather than the word a
 * learner wants on a card. `wordValue` is the plain spelling, where
 * `wordValuePrese` carries Ekilex's own `<eki-stress>` markup for a rendering
 * this app does not do.
 *
 * EVERY SENSE RATHER THAN THE PRIMARY ONE, which is the opposite of
 * `primarySemanticTypes` above and is deliberate. That one answers a question
 * with one right answer, which case set a word takes, so a later sense's code
 * is a wrong claim about the word and the union drills a river as a person.
 * This answers "what do they call this in Russian", where a second equivalent
 * off a later sense is more of the same fact rather than a contradiction of
 * it, and the two writers that already fill these columns both read every
 * lexeme. A reading that narrowed here would disagree with the harvest about
 * words the harvest has already written.
 *
 * Exported for `primarySemanticTypes`'s reason: two scripts and this mapper
 * read the same field off their own cached copies of this response, and a
 * second reading of somebody else's JSON is where the readings stop agreeing.
 */
export function equivalentsFrom(
  lexemes: readonly {
    synonymLangGroups?: {
      lang?: string;
      synonyms?: { type?: string; words?: { wordValue?: string }[] }[];
    }[];
  }[] | undefined,
): { rus: string[]; ukr: string[] } {
  const out: { rus: string[]; ukr: string[] } = { rus: [], ukr: [] };
  for (const lexeme of lexemes ?? []) {
    for (const group of lexeme.synonymLangGroups ?? []) {
      const into = group.lang === "rus" ? out.rus : group.lang === "ukr" ? out.ukr : null;
      if (!into) continue;
      for (const synonym of group.synonyms ?? []) {
        if (synonym.type !== "MEANING_WORD") continue;
        for (const word of synonym.words ?? []) {
          const value = word.wordValue?.trim();
          if (value && !into.includes(value)) into.push(value);
        }
      }
    }
  }
  return out;
}

/**
 * The equivalents as the dictionary stores them: one comma-separated line, or
 * null where Ekilex records none. One spelling for every writer of the two
 * columns, so an entry repointed by a homonym pin reads exactly like one
 * filled by the translation harvest.
 */
export function equivalentsText(words: readonly string[]): string | null {
  return words.length > 0 ? words.join(", ") : null;
}

export async function fetchEkilexDetails(wordId: number, options?: GateOptions): Promise<EkilexDetails | null> {
  const asked = await fetchEkilexDetailsAnswered(wordId, options);
  return asked.answered ? asked.details : null;
}

/**
 * The same details, with "Ekilex did not answer" kept apart from "Ekilex holds
 * no such word", for the reason `searchEkilexAnswered` gives. A page passes its
 * deadline into the gate, so a request still queued for a slot when the page
 * gives up comes back unanswered, and reading that as a miss wrote the word
 * down as one Ekilex lacks for a day, when Ekilex was never asked.
 */
export async function fetchEkilexDetailsAnswered(
  wordId: number,
  options?: GateOptions,
): Promise<{ answered: false } | { answered: true; details: EkilexDetails | null }> {
  const answer = await ekilexRequest<RawDetails>(`/word/details/${wordId}`, { ...options, kind: "details" }).catch(() => null);
  if (answer?.kind !== "answered") return { answered: false };
  return { answered: true, details: detailsFrom(answer.value) };
}

function detailsFrom(data: RawDetails | null): EkilexDetails | null {
  if (!data?.word) return null;

  const definitions: string[] = [];
  const governments: string[] = [];
  const usages: string[] = [];
  const translations = equivalentsFrom(data.lexemes);
  let cefr: string | null = null;

  for (const lexeme of data.lexemes ?? []) {
    if (!cefr && lexeme.lexemeProficiencyLevelCode) cefr = lexeme.lexemeProficiencyLevelCode;
    for (const g of lexeme.governments ?? []) {
      if (g.value && !governments.includes(g.value)) governments.push(g.value);
    }
    for (const def of lexeme.meaning?.definitions ?? []) {
      if (def.lang === "est" && def.value && !definitions.includes(def.value)) {
        definitions.push(def.value);
      }
    }
    for (const u of lexeme.usages ?? []) {
      // `public` is Ekilex's own flag for what may be shown; a non-public usage
      // is editorial working material and is not ours to display.
      if (u.lang !== "est" || u.public === false) continue;
      const value = u.value?.trim();
      if (value && !usages.includes(value)) usages.push(value);
    }
  }

  return {
    wordId: data.word.wordId,
    wordValue: data.word.wordValue,
    formSets: (data.word.paradigms ?? []).map((p) => ({
      inflectionType: p.inflectionType ?? null,
      wordClass: p.wordClass ?? null,
      // Ekilex writes "-" for a form that does not exist for this word — the short
      // illative most often. That is a real absence, not a value.
      forms: (p.forms ?? [])
        .filter((f): f is { value: string; morphCode: string; morphValue: string } =>
          Boolean(f.value) && f.value !== "-")
        .map((f) => ({ value: f.value, morphCode: f.morphCode, morphValue: f.morphValue })),
    })),
    definitions,
    governments,
    usages,
    cefr,
    semanticTypes: primarySemanticTypes(data.lexemes),
    translations,
  };
}

interface RawDetails {
  word?: {
    wordId: number;
    wordValue: string;
    paradigms?: {
      inflectionType?: string | null;
      wordClass?: string | null;
      forms?: { value?: string; morphCode: string; morphValue: string }[];
    }[];
  };
  lexemes?: {
    datasetCode?: string;
    lexemeProficiencyLevelCode?: string | null;
    governments?: { value?: string }[];
    usages?: { value?: string; lang?: string; public?: boolean }[];
    meaning?: {
      definitions?: { value?: string; lang?: string }[];
      semanticTypes?: { code?: string }[];
    };
    synonymLangGroups?: {
      lang?: string;
      synonyms?: { type?: string; words?: { wordValue?: string }[] }[];
    }[];
  }[];
}
