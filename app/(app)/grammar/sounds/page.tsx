import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { Card, Page, SectionTitle, Stack } from "@/components/ui";
import { HearSet, NativeWord, SoundKey } from "@/components/sounds/Native";
import { SpellIt } from "@/components/sounds/SpellIt";
import { readSetting, SETTING_KEYS } from "@/lib/settings/store";
import {
  ALPHABET, CONSONANTS, LENGTH, MIX_UPS, SOFT_ALIKE, SOFT_BESIDE, SPECIAL, STRESS, VOWELS, VOWEL_PAIRS, VOWEL_WORDS,
  type SoundNote, type WordSet,
} from "@/lib/collections/sounds";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return titleFor("How Estonian sounds", {
    description: "Every sound of Estonian, said by a native speaker: the vowels, the soft consonants, the long and short sounds, stress and the alphabet.",
  });
}

/**
 * HOW ESTONIAN SOUNDS, SAID BY A PERSON.
 *
 * The one page in the app where the subject cannot be written down, so every
 * piece of Estonian on it is a control that plays the native speaker's
 * recording (`components/sounds/Native.tsx`). It reads top to bottom in the
 * order a learner meets the trouble (`lib/collections/sounds.ts`), and each
 * section is a title, one line, and things to press. No paragraph explains a
 * sound a press can play.
 */
export default async function SoundsPage() {
  const ownerId = await requireUserId();
  const [locale, storedName] = await Promise.all([localeFor(ownerId), readSetting(ownerId, SETTING_KEYS.displayName)]);
  const t = (english: string) => tr(locale, english);
  // First run writes a placeholder for somebody who gave no name; that one is not theirs to hear.
  const name = storedName && storedName.trim() !== "A learner" ? storedName.trim() : "";

  return (
    <Page route="/grammar/sounds"
      eyebrow={t("Reference")}
      title={t("How Estonian sounds")}
      lead={t("Every sound here is said by a native speaker. Press anything to hear it.")}
    >
      <Stack>
        <Card tone="night" className="md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0 flex-[1_1_20rem]">
              <h2 className="font-display text-2xl font-bold leading-tight md:text-3xl" style={{ color: "var(--ink)", textWrap: "balance" }}>
                {t("Said the way it's written.")}
              </h2>
              <p className="mt-2 max-w-[48ch] text-md" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>
                {t("One letter is one sound, and every letter is said. Four letters make most of the difference.")}
              </p>
            </div>
            <div className="snd-grid" data-sounds-hero>
              {SPECIAL.map((s) => <SoundKey key={s.clip} clip={s.clip} glyph={s.glyph} size="lg" />)}
            </div>
          </div>
        </Card>

        <nav aria-label={t("On this page")} className="snd-jump" data-sounds-jump>
          {JUMPS.map((j) => <a key={j.id} href={`#${j.id}`}>{t(j.label)}</a>)}
        </nav>

        <section id="vowels" className="flex flex-col gap-4" data-sounds-section="vowels">
          <SectionTitle hint={t("each one held on its own")}>{t("Nine vowels")}</SectionTitle>
          <div className="snd-grid">
            {VOWELS.map((v) => <SoundKey key={v.clip} clip={v.clip} glyph={v.glyph} />)}
          </div>
          <Notes notes={VOWELS} t={t} />
        </section>

        <section className="flex flex-col gap-4" data-sounds-section="vowel-words">
          <SectionTitle hint={t("a double letter is held longer")}>{t("Short, long and gliding")}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {VOWEL_WORDS.map((group) => (
              <div key={group.title} className="snd-set flex flex-col gap-3">
                <p className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>{t(group.title)}</p>
                <div className="snd-set-row">
                  {group.words.map((w) => <NativeWord key={w.clip} clip={w.clip} mark={w.mark} en={w.en} />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="vowel-pairs" className="flex flex-col gap-4" data-sounds-section="vowel-pairs">
          <SectionTitle hint={t("one vowel apart, another word")}>{t("Vowels that change the word")}</SectionTitle>
          <Sets sets={VOWEL_PAIRS} t={t} />
        </section>

        <section id="consonants" className="flex flex-col gap-4" data-sounds-section="consonants">
          <SectionTitle hint={t("the ones English says differently")}>{t("Consonants to listen for")}</SectionTitle>
          <ul className="snd-cols gap-3">
            {CONSONANTS.map((c) => (
              <li key={c.clip} className="flex items-center gap-4 rounded-[var(--r-lg)] border p-3" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
                <SoundKey clip={c.clip} glyph={c.glyph} />
                <span className="text-md" style={{ color: "var(--ink)" }}>{c.note ? t(c.note) : null}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="soft" className="flex flex-col gap-4" data-sounds-section="soft">
          <SectionTitle hint={t("not written, but it changes the word")}>{t("Soft consonants")}</SectionTitle>
          <p className="max-w-[62ch] text-md" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>
            {t("A soft l, n, t or s is said with the middle of the tongue raised, as if a little y came with it.")}
          </p>
          <h3 className="snd-subhead">{t("Spelled alike, said apart")}</h3>
          <Sets sets={SOFT_ALIKE} t={t} />
          <h3 className="snd-subhead">{t("Plain beside soft")}</h3>
          <Sets sets={SOFT_BESIDE} t={t} />
        </section>

        <section id="length" className="flex flex-col gap-4" data-sounds-section="length">
          <SectionTitle hint={t("hold a double letter, or it's another word")}>{t("Length changes the word")}</SectionTitle>
          <Sets sets={LENGTH.filter((set) => set.words.length === 2)} t={t} />
          <h3 className="snd-subhead">{t("Three lengths: short, long and longer still")}</h3>
          <Sets sets={LENGTH.filter((set) => set.words.length > 2)} t={t} wide />
        </section>

        <section id="mix-ups" className="flex flex-col gap-4" data-sounds-section="mix-ups">
          <SectionTitle hint={t("listen for the first sound, or the middle")}>{t("Easy to mix up")}</SectionTitle>
          <Sets sets={MIX_UPS} t={t} />
        </section>

        <section id="stress" className="flex flex-col gap-4" data-sounds-section="stress">
          <SectionTitle hint={t("always the first syllable")}>{t("Where the stress goes")}</SectionTitle>
          <div className="snd-set snd-set-row">
            {STRESS.map((s) => <NativeWord key={s.clip} clip={s.clip} stress={s.syllables} en={s.en} />)}
          </div>
        </section>

        <section id="alphabet" className="flex flex-col gap-4" data-sounds-section="alphabet">
          <SectionTitle hint={t("for spelling your name out loud")}>{t("The alphabet")}</SectionTitle>
          <div className="snd-grid" data-alphabet>
            {ALPHABET.map((a) => (
              <SoundKey key={a.clip} clip={a.clip} glyph={a.letter} size="sm" loanword={a.loanword}
                label={fill(t("Hear the letter {letter}"), { letter: a.letter })} />
            ))}
          </div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {t("The dashed letters are only in borrowed words and names.")}
          </p>
          <div id="spell" className="snd-set flex flex-col gap-3" data-sounds-spell>
            <div>
              <p className="font-display text-lg font-bold" style={{ color: "var(--ink)" }}>{t("Spell your name")}</p>
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                {t("At a desk or on the phone you'll be asked to spell it. Hear it the way you'll say it.")}
              </p>
            </div>
            <SpellIt initial={name} />
          </div>
        </section>
      </Stack>
    </Page>
  );
}

/** Where the page goes, in the order it goes there. */
const JUMPS: readonly { readonly id: string; readonly label: string }[] = [
  { id: "vowels", label: "Vowels" },
  { id: "vowel-pairs", label: "Vowel pairs" },
  { id: "consonants", label: "Consonants" },
  { id: "soft", label: "Soft consonants" },
  { id: "length", label: "Length" },
  { id: "mix-ups", label: "Mix-ups" },
  { id: "stress", label: "Stress" },
  { id: "alphabet", label: "Alphabet" },
];

/**
 * Sets of words side by side, two sets to a row where the row has room. A set
 * of three takes a row of its own, because its words are heard as one line,
 * short then long then longer, and a third word wrapped under the first two
 * breaks the line it is the end of.
 */
function Sets({ sets, t, wide = false }: { sets: readonly WordSet[]; t: (english: string) => string; wide?: boolean }) {
  return (
    <div className={wide ? "flex flex-col gap-3" : "snd-cols gap-3"}>
      {sets.map((set) => (
        <HearSet key={set.words.map((w) => w.clip).join("|")} words={set.words} caption={set.caption ? t(set.caption) : undefined} />
      ))}
    </div>
  );
}

function Notes({ notes, t }: { notes: readonly SoundNote[]; t: (english: string) => string }) {
  const noted = notes.filter((n) => n.note);
  return (
    <dl className="snd-cols gap-x-6 gap-y-2">
      {noted.map((n) => (
        <div key={n.clip} className="flex items-baseline gap-3">
          <dt lang="et" className="font-display w-6 shrink-0 text-xl font-bold" style={{ color: "var(--accent-deep)" }}>{n.glyph}</dt>
          <dd className="text-md" style={{ color: "var(--ink-2)" }}>{t(n.note!)}</dd>
        </div>
      ))}
    </dl>
  );
}
