/**
 * EVERY NUMBER THE HEARING RUNS ON, EACH WITH THE FIGURE IT WAS MEASURED AT.
 *
 * `docs/39-speech.md` sections 3.5, 3.6 and 3.8 measured how a recording should
 * be prepared before the model hears it, and what to make of what comes back.
 * These are those settings, in one table, so a later tweak has to argue with
 * the number beside it rather than with a constant somebody typed in a
 * component (docs/41-fifth-batch.md, VB-1). `settings.test.ts` holds every value
 * to the measurement, which is the point: change one and a test asks why.
 *
 * Every figure is "words wrong" on TalTech's or TartuNLP's voices unless the
 * row says otherwise. No learner has been heard yet (D3 of the fifth batch), so
 * these are the best evidence there is, not a promise about a learner's voice.
 */
export const SPEECH_SETTINGS = {
  /** The rate the model decodes at. Capture is at the device's own rate and resampled to this. */
  sampleRate: 16_000,

  /** Silence put in front of the speech: 2.7% wrong without it, 1.9% with it. */
  leadSeconds: 0.5,

  /** Silence after the speech: 0.3 s drops the last word (10.7%); 1.2 s gives 3.6% and 1.5 s 4.4%. */
  tailSeconds: 0.8,

  /**
   * A quiet recording is brought up before decoding: a quiet microphone gave
   * 3.8% as recorded and 2.2% normalized. Only ever up, to a peak this far
   * below full scale, so a loud one is left exactly as it was.
   */
  normalizePeak: 0.9,
  /** Below this peak a recording counts as quiet and is raised. */
  quietPeak: 0.5,

  /**
   * Clipping cannot be undone (18.4% wrong clipped, 19.0% normalized after), so
   * the meter warns before it happens, from this level of the frame's peak.
   */
  clipWarnPeak: 0.97,

  /**
   * Pauses inside a turn are squeezed: word-by-word speech went from 14.7% to
   * 7.7% wrong with every pause over 0.25 s cut to 0.15 s. A pause is measured
   * against the clip's own loudest frame, never an absolute level, so a quiet
   * microphone and a loud one squeeze the same pauses.
   */
  pauseOverSeconds: 0.25,
  pauseToSeconds: 0.15,
  pauseFloorDb: -40,
  /** Never cut closer than this to the last loud frame of a word: at 50 ms 4 in 12 words lost a syllable, at 150 ms none. */
  keepAfterWordSeconds: 0.15,
  /** The frame the pause analysis reads, in seconds. */
  frameSeconds: 0.01,

  /**
   * Greedy decoding for what is understood: five more single words right than
   * beam search, and beam no better in babble (26.9% against 26.4%).
   */
  decoding: "greedy_search" as const,
  /** The second reading, used only to find the words the model was unsure of. */
  secondDecoding: "modified_beam_search" as const,
  beamPaths: 8,

  /**
   * Hotwords are off everywhere. A hint toward the expected word made the
   * right word harder to hear (75.9% accepted against 87.8% with none), and a
   * strong list invented words.
   */
  hotwords: false,

  /**
   * A word is unsure where the forms list does not hold it or where the two
   * decodings disagree on it: 83.2% of such words are really wrong, and it finds
   * 65.0% of the wrong ones, where a log-probability line at -1.0 was right
   * about 34.8% of the words it marked.
   */
  unsurePrecision: 0.832,
  unsureRecall: 0.65,

  /**
   * How long a turn waits for speech to begin before it closes and shows the
   * button again, so a learner who is thinking is never cut off (VB-4).
   */
  waitForSpeechSeconds: 8,

  /**
   * How much silence ends a turn once somebody has started speaking.
   *
   * 1.2 s rather than the 0.8 s the fifth batch's VB-4 names, which is the
   * tail measured above rather than an endpoint: section 3.5 found
   * word-by-word speech is not helped by cutting it at its pauses (29.8%
   * against 21.3%), and a beginner pauses between words for longer than 0.8 s.
   * A press ends a turn at once whatever this says.
   */
  endpointSilenceSeconds: 1.2,

  /** The longest single turn, so a forgotten microphone cannot hold a stream open for ever. */
  maxTurnSeconds: 30,

  /** A recording opened on the reading page is capped here (VB-12), and the prompt says so. */
  maxFileSeconds: 180,

  /**
   * A recording is heard in pieces cut at its pauses (`piecesOf` in
   * prepare.ts), so no piece is long and no word is split. Chosen rather than
   * measured, and written here because the native apps have to cut where the
   * web cuts to give the golden file's turns: a pause this long ends a piece,
   * and no piece runs longer than the cap, which keeps one decoding inside
   * the ordinary length of a turn.
   */
  piecePauseSeconds: 0.3,
  pieceMaxSeconds: 20,

  /**
   * How long the model stays in memory after the last screen that listens has
   * gone, so it is not held while somebody reads the grammar reference.
   */
  releaseAfterMs: 120_000,

  /**
   * Faster than this share of real time on the device check, or the device is
   * too slow to hear a turn as it is said and keeps the typed app it has.
   * The model measured 0.057 seconds a second on one server core.
   */
  maxRealTimeFactor: 1,
} as const;

/** The settings' own name for one, for a test or a doc to cite. */
export type SpeechSetting = keyof typeof SPEECH_SETTINGS;
