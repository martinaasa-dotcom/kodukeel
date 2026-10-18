import { requireUserId } from "@/lib/auth/session";
import { localeFor, titleFor } from "@/lib/progress/locale";
import { fill, tr } from "@/lib/copy/locale";
import { Card, Page, SectionTitle, Stack } from "@/components/ui";
import { HearSet, NativeWord, SoundKey } from "@/components/sounds/Native";
import {
  ALPHABET, CONSONANTS, LENGTH, MIX_UPS, SPECIAL, STRESS, VOWELS, VOWEL_WORDS, type SoundNote,
} from "@/lib/collections/sounds";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return titleFor("How Estonian sounds", {
    description: "Every sound of Estonian, said by a native speaker: the vowels, the long and short sounds, stress and the alphabet.",
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
  const locale = await localeFor(ownerId);
  const t = (english: string) => tr(locale, english);

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

        <section className="flex flex-col gap-4" data-sounds-section="vowels">
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

        <section className="flex flex-col gap-4" data-sounds-section="consonants">
          <SectionTitle hint={t("the ones English says differently")}>{t("Consonants to listen for")}</SectionTitle>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONSONANTS.map((c) => (
              <li key={c.clip} className="flex items-center gap-4 rounded-[var(--r-lg)] border p-3" style={{ borderColor: "var(--edge)", background: "var(--surface)" }}>
                <SoundKey clip={c.clip} glyph={c.glyph} />
                <span className="text-md" style={{ color: "var(--ink)" }}>{c.note ? t(c.note) : null}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4" data-sounds-section="length">
          <SectionTitle hint={t("hold a double letter, or it's another word")}>{t("Length changes the word")}</SectionTitle>
          <div className="flex flex-col gap-3">
            {LENGTH.map((set) => (
              <HearSet key={set.words.map((w) => w.clip).join("|")} words={set.words} caption={set.caption ? t(set.caption) : undefined} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4" data-sounds-section="mix-ups">
          <SectionTitle hint={t("listen for the first sound, or the middle")}>{t("Easy to mix up")}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {MIX_UPS.map((set) => <HearSet key={set.words.map((w) => w.clip).join("|")} words={set.words} />)}
          </div>
        </section>

        <section className="flex flex-col gap-4" data-sounds-section="stress">
          <SectionTitle hint={t("always the first syllable")}>{t("Where the stress goes")}</SectionTitle>
          <div className="snd-set snd-set-row">
            {STRESS.map((s) => <NativeWord key={s.clip} clip={s.clip} stress={s.syllables} en={s.en} />)}
          </div>
        </section>

        <section className="flex flex-col gap-4" data-sounds-section="alphabet">
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
        </section>
      </Stack>
    </Page>
  );
}

function Notes({ notes, t }: { notes: readonly SoundNote[]; t: (english: string) => string }) {
  const noted = notes.filter((n) => n.note);
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {noted.map((n) => (
        <div key={n.clip} className="flex items-baseline gap-3">
          <dt lang="et" className="font-display w-6 shrink-0 text-xl font-bold" style={{ color: "var(--accent-deep)" }}>{n.glyph}</dt>
          <dd className="text-md" style={{ color: "var(--ink-2)" }}>{t(n.note!)}</dd>
        </div>
      ))}
    </dl>
  );
}
