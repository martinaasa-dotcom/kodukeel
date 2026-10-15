#!/usr/bin/env python3
"""
How far can TalTech's Zipformer be pushed toward every kind of learner?

    python3 scripts/asr-experiments.py build      # make every clip set (TartuNLP and Piper, cached)
    python3 scripts/asr-experiments.py run         # hear every set, every variant (cached)
    python3 scripts/asr-experiments.py report      # print every table

Local only: TalTech's model on this machine, TartuNLP's free public voices,
and Piper's English voice. No paid model is reachable from this file.

`scripts/measure-asr.ts` asks which recognizer to use. This asks what the
chosen one does with the speakers and rooms a learner brings, and what can be
done around it, and it is the evidence behind `docs/39-speech.md` section 3:

  VOICES     the corpus sentences in all ten of TartuNLP's voices
  ERRORS     a sentence said with the mistake a learner makes (a long sound
             short, a stop voiced, an õ said as o, an h dropped), to see
             whether the model writes down what was said or what was meant
  ACCENT     the sentences read by an English voice, a crude stand-in for an
             English speaker who has not yet learned the sounds
  PACE       word by word with pauses, slow, fast
  ROOMS      a phone line, an echoing room, a quiet microphone, clipping,
             noise and babble at several levels
  DECODING   greedy or beam, tail padding, loudness, re-timing slow speech
  AFTER      numbers, dictionary reconciliation, a vote of three models,
             and whether the model's own confidence finds its mistakes

Every clip is synthetic. This narrows what SP-0's real voices have to settle;
it does not replace them.
"""
import gzip
import json
import os
import re
import sys
import time
import urllib.request

import numpy as np

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
EXP = os.path.join(ROOT, "experiments")
CORPUS = os.path.join(ROOT, "corpus.json")
RATE = 16_000
TTS = "https://api.tartunlp.ai/text-to-speech/v2"
VOICES = ["mari", "tambet", "liivika", "kalev", "kylli", "meelis", "vesta", "peeter", "albert", "indrek"]
LARGE = "TalTechNLP/streaming-zipformer-large.et-en"

os.makedirs(EXP, exist_ok=True)


# ------------------------------------------------------------------ text

def words(text):
    text = re.sub(r"[.,!?;:()\"'«»„“”‚‘’\-–—…]", " ", text.lower())
    return text.split()


def edit(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            prev, d[j] = d[j], prev if a[i - 1] == b[j - 1] else 1 + min(prev, d[j], d[j - 1])
    return d[-1]


def wer(pairs):
    e = n = 0
    for said, heard in pairs:
        e += edit(words(said), words(heard))
        n += len(words(said))
    return 100 * e / max(n, 1)


def base_sentences():
    clips = json.load(open(CORPUS))
    seen, out = set(), []
    for c in clips:
        if c["kind"] == "sentence" and not re.search(r"\d", c["text"]) and c["text"] not in seen:
            seen.add(c["text"])
            out.append(c["text"])
    return out


# ------------------------------------------------------------------ audio

def load(path):
    import librosa
    return librosa.load(path, sr=RATE, mono=True)[0].astype(np.float32)


def save(path, audio, rate=RATE):
    import soundfile as sf
    sf.write(path, np.clip(audio, -1, 1).astype(np.float32), rate)


def tartu(text, voice):
    """TartuNLP's own voice, cached on disk by text and voice."""
    d = os.path.join(EXP, "tts")
    os.makedirs(d, exist_ok=True)
    name = re.sub(r"[^\w]+", "_", f"{voice}_{text}")[:120]
    path = os.path.join(d, name + ".wav")
    if not os.path.exists(path):
        body = json.dumps({"text": text if re.search(r"[.!?]$", text) else text + ".", "speaker": voice}).encode()
        for attempt in range(4):
            try:
                req = urllib.request.Request(TTS, data=body, headers={"content-type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    open(path, "wb").write(r.read())
                break
            except Exception:
                time.sleep(3 * (attempt + 1))
        else:
            raise RuntimeError(f"TartuNLP would not say {text!r} in {voice}")
        time.sleep(0.15)
    return path


def piper(text, model):
    """Piper's English voice reading Estonian spelling, as an English reader would."""
    d = os.path.join(EXP, "piper")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, re.sub(r"[^\w]+", "_", text)[:120] + ".wav")
    if not os.path.exists(path):
        import wave
        with wave.open(path, "wb") as w:
            model.synthesize_wav(text, w)
    return path


# ------------------------------------------------------------------ learner mistakes, spelled

DEVOICE = {"b": "p", "d": "t", "g": "k"}
VOICE = {"p": "b", "t": "d", "k": "g"}
VOWELS = {"õ": "o", "ä": "a", "ö": "o", "ü": "u"}


def mistakes(sentence):
    """Each kind of mistake once, on the first word it can be made on. Returns (kind, wrong sentence, intended word, wrong word)."""
    toks = sentence.split()
    out = []

    def first(kind, change):
        for i, tok in enumerate(toks):
            core = re.sub(r"[^\wõäöüšž]", "", tok.lower())
            wrong = change(core)
            if wrong and wrong != core and len(core) >= 3:
                new = toks[:]
                new[i] = tok.lower().replace(core, wrong) if i else tok.replace(core.capitalize(), wrong.capitalize()).replace(core, wrong)
                out.append((kind, " ".join(new), core, wrong))
                return

    first("length", lambda w: re.sub(r"(.)\1", r"\1", w, count=1) if re.search(r"([a-zõäöü])\1", w) else None)
    first("voicing", lambda w: next((w[:k] + VOICE.get(ch, DEVOICE.get(ch, ch)) + w[k + 1:]
                                       for k, ch in enumerate(w) if k > 0 and ch in "bdgptk"), None))
    first("vowel", lambda w: next((w.replace(ch, VOWELS[ch]) for ch in w if ch in VOWELS), None))
    first("h-drop", lambda w: w[1:] if w.startswith("h") else None)
    return out


# ------------------------------------------------------------------ rooms

def rir(seconds=0.5, rt60=0.6, seed=7):
    rng = np.random.default_rng(seed)
    t = np.arange(int(RATE * seconds)) / RATE
    h = rng.standard_normal(len(t)) * np.exp(-6.9 * t / rt60)
    h[0] = 1.0
    return (h / np.sqrt(np.sum(h ** 2))).astype(np.float32)


def condition(name, audio, others):
    import librosa
    from scipy.signal import butter, sosfilt, fftconvolve
    rng = np.random.default_rng(abs(hash(name)) % 2**32)
    level = lambda x: np.sqrt(np.mean(x ** 2)) + 1e-9
    if name.startswith("speed"):
        rate = float(name[5:])
        return librosa.effects.time_stretch(audio, rate=rate)
    if name == "phone":
        x = librosa.resample(audio, orig_sr=RATE, target_sr=8000)
        x = sosfilt(butter(4, [300, 3400], btype="band", fs=8000, output="sos"), x)
        x = np.sign(x) * np.log1p(255 * np.abs(x)) / np.log1p(255)  # mu-law companding
        x = np.sign(x) * (np.power(256, np.abs(x)) - 1) / 255
        return librosa.resample(x.astype(np.float32), orig_sr=8000, target_sr=RATE)
    if name == "echo":
        return fftconvolve(audio, rir())[: len(audio) + RATE // 4]
    if name == "quiet":
        return audio * 10 ** (-30 / 20)
    if name == "clipped":
        return np.clip(audio / level(audio) * 0.5, -0.3, 0.3)
    if name.startswith("white"):
        snr = float(name[5:])
        n = rng.standard_normal(len(audio)).astype(np.float32)
        return audio + n * level(audio) / level(n) * 10 ** (-snr / 20)
    if name.startswith("babble"):
        snr = float(name[6:])
        n = np.zeros_like(audio)
        for k in rng.choice(len(others), 3, replace=False):
            o = others[k]
            o = np.tile(o, int(np.ceil(len(audio) / len(o))))[: len(audio)]
            n += np.roll(o, int(rng.integers(0, len(o))))
        return audio + n * level(audio) / level(n) * 10 ** (-snr / 20)
    raise ValueError(name)


ROOMS = ["phone", "echo", "quiet", "clipped", "white20", "white10", "white5", "babble20", "babble5", "babble0",
         "speed0.75", "speed0.85", "speed1.2"]


# ------------------------------------------------------------------ the recognizer

class Zipformer:
    def __init__(self, model_id=LARGE, method="greedy_search"):
        import sherpa_onnx
        from huggingface_hub import snapshot_download
        d = snapshot_download(model_id, allow_patterns=["*.int8.onnx", "tokens.txt"])
        self.r = sherpa_onnx.OnlineRecognizer.from_transducer(
            tokens=f"{d}/tokens.txt", encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.int8.onnx",
            joiner=f"{d}/joiner.int8.onnx", num_threads=os.cpu_count() or 4, sample_rate=RATE,
            feature_dim=80, decoding_method=method, max_active_paths=8)

    def hear(self, audio, tail=0.8, lead=0.0):
        s = self.r.create_stream()
        if lead:
            s.accept_waveform(RATE, np.zeros(int(RATE * lead), dtype=np.float32))
        s.accept_waveform(RATE, audio)
        s.accept_waveform(RATE, np.zeros(int(RATE * tail), dtype=np.float32))
        s.input_finished()
        while self.r.is_ready(s):
            self.r.decode_stream(s)
        return json.loads(self.r.get_result_as_json_string(s))


# ------------------------------------------------------------------ build

def build():
    sentences = base_sentences()
    sets = {}
    twenty = sentences[:20]

    # Voices: twenty sentences in every voice.
    sets["voices"] = [{"text": t, "voice": v, "file": tartu(t, v)} for v in VOICES for t in twenty]
    print("voices", len(sets["voices"]), file=sys.stderr)

    # Errors: each mistake once per sentence where it can be made, said by two voices.
    err = []
    for t in sentences:
        for kind, wrong, ok, bad in mistakes(t):
            for v in ("mari", "tambet"):
                err.append({"text": t, "said": wrong, "kind": kind, "ok": ok, "bad": bad, "voice": v, "file": tartu(wrong, v)})
    sets["errors"] = err
    print("errors", len(err), file=sys.stderr)

    # Word by word: each word said alone, joined with a learner's pause.
    wbw = []
    d = os.path.join(EXP, "wordbyword")
    os.makedirs(d, exist_ok=True)
    for i, t in enumerate(twenty):
        path = os.path.join(d, f"{i}.wav")
        if not os.path.exists(path):
            parts = []
            for w in t.split():
                a = load(tartu(re.sub(r"[.,!?]", "", w), "mari"))
                idx = np.where(np.abs(a) > 0.02)[0]
                parts += [a[idx[0]:idx[-1]] if len(idx) else a, np.zeros(int(RATE * 0.45), dtype=np.float32)]
            save(path, np.concatenate(parts))
        wbw.append({"text": t, "voice": "mari", "file": path})
    sets["wordbyword"] = wbw

    # Accent: an English voice reading Estonian spelling.
    try:
        from piper import PiperVoice
        from huggingface_hub import hf_hub_download
        onnx = hf_hub_download("rhasspy/piper-voices", "en/en_US/lessac/medium/en_US-lessac-medium.onnx")
        hf_hub_download("rhasspy/piper-voices", "en/en_US/lessac/medium/en_US-lessac-medium.onnx.json")
        voice = PiperVoice.load(onnx)
        sets["accent"] = [{"text": t, "voice": "piper-en", "file": piper(t, voice)} for t in sentences]
    except Exception as error:  # an accent set that cannot be built is reported, not faked
        print("accent set not built:", error, file=sys.stderr)

    # Rooms: the clean corpus sentences in mari and tambet, through every condition.
    clean = [c for c in json.load(open(CORPUS)) if c["kind"] == "sentence" and not re.search(r"\d", c["text"])]
    others = [load(c["file"]) for c in clean]
    for room in ROOMS:
        d = os.path.join(EXP, "rooms", room)
        os.makedirs(d, exist_ok=True)
        rows = []
        for c, a in zip(clean, others):
            path = os.path.join(d, c["id"] + ".wav")
            if not os.path.exists(path):
                save(path, condition(room, a, others))
            rows.append({"text": c["text"], "voice": c["voice"], "file": path})
        sets["room:" + room] = rows
    sets["clean"] = [{"text": c["text"], "voice": c["voice"], "file": c["file"]} for c in clean]
    json.dump(sets, open(os.path.join(EXP, "sets.json"), "w"), ensure_ascii=False)
    print({k: len(v) for k, v in sets.items()}, file=sys.stderr)


# ------------------------------------------------------------------ run

def cached(name, fn):
    path = os.path.join(EXP, "heard", name + ".json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        return json.load(open(path))
    out = fn()
    json.dump(out, open(path, "w"), ensure_ascii=False)
    return out


def run():
    sets = json.load(open(os.path.join(EXP, "sets.json")))
    z = Zipformer()
    hear_set = lambda rows, **kw: [z.hear(load(r["file"]), **kw) for r in rows]
    for name, rows in sets.items():
        cached(f"greedy__{name}", lambda: hear_set(rows))
        print("heard", name, file=sys.stderr)
    # Decoding variants on the clean set and the two hardest rooms.
    for tail in (0.3, 1.5):
        cached(f"tail{tail}__clean", lambda: hear_set(sets["clean"], tail=tail))
    cached("lead0.5__clean", lambda: hear_set(sets["clean"], lead=0.5))
    zb = Zipformer(method="modified_beam_search")
    for name in ("clean", "room:babble5", "room:phone", "errors", "accent", "wordbyword"):
        if name in sets:
            cached(f"beam__{name}", lambda: [zb.hear(load(r["file"])) for r in sets[name]])
    # Loudness: normalise to the same level before hearing.
    norm = lambda a: a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.1
    for name in ("room:quiet", "room:clipped"):
        cached(f"norm__{name}", lambda: [z.hear(norm(load(r["file"]))) for r in sets[name]])
    # Re-timing: slow speech compressed back toward an ordinary pace before hearing.
    import librosa
    for name, fix in (("room:speed0.75", 0.75), ("wordbyword", None)):
        if fix:
            cached(f"retime__{name}", lambda: [z.hear(librosa.effects.time_stretch(load(r["file"]), rate=1 / fix)) for r in sets[name]])
    # The small Zipformer on the same sets, for the vote.
    zs = Zipformer("TalTechNLP/streaming-zipformer.et-en")
    for name in ("clean", "room:babble5", "errors", "accent"):
        if name in sets:
            cached(f"small__{name}", lambda: [zs.hear(load(r["file"])) for r in sets[name]])


# ------------------------------------------------------------------ after the model

FOLD = str.maketrans({"õ": "o", "ä": "a", "ö": "o", "ü": "u", "š": "s", "ž": "z"})


def sound_key(w):
    """lib/estonian/sounds.ts in Python: length, voicing and the four vowels folded."""
    w = w.lower().translate(FOLD)
    w = "".join(DEVOICE.get(ch, ch) for ch in w)
    return re.sub(r"(.)\1+", r"\1", w)


_FORMS = None


def forms():
    """Every spelling the forms list holds (prisma/data/forms), the accept side of ADR-005."""
    global _FORMS
    if _FORMS is None:
        s = set()
        d = os.path.join("prisma", "data", "forms", "shards")
        for f in os.listdir(d):
            with gzip.open(os.path.join(d, f), "rt") as fh:
                for line in fh:
                    s.add(line.split("\t", 1)[0].lower())
        _FORMS = s
    return _FORMS


NUMBERS = {"üks": "1", "kaks": "2", "kolm": "3", "neli": "4", "viis": "5", "kuus": "6", "seitse": "7",
           "kaheksa": "8", "üheksa": "9", "kümme": "10"}


def reconcile(text, lexicon):
    """
    docs/39-speech.md section 3.3: a word the forms list holds is kept; a word it
    does not hold is replaced by the one lexicon word with the same sound key or
    one edit away, or split into two lexicon words, or joined with its
    neighbour into one, and only where exactly one candidate qualifies.
    """
    ws = words(text)
    f = forms()
    keys = {}
    for w in lexicon:
        keys.setdefault(sound_key(w), set()).add(w)
    out, i, repairs = [], 0, 0
    while i < len(ws):
        w = ws[i]
        if w in f or w in lexicon:
            out.append(w); i += 1; continue
        # joined with the next heard word
        if i + 1 < len(ws) and (w + ws[i + 1]) in lexicon:
            out.append(w + ws[i + 1]); i += 2; repairs += 1; continue
        # split into two lexicon words
        splits = [(w[:k], w[k:]) for k in range(2, len(w) - 1) if w[:k] in lexicon and w[k:] in lexicon]
        if len(splits) == 1:
            out += list(splits[0]); i += 1; repairs += 1; continue
        cands = set(keys.get(sound_key(w), set()))
        if not cands:
            cands = {x for x in lexicon if abs(len(x) - len(w)) <= 1 and edit(list(x), list(w)) == 1}
        if len(cands) == 1:
            out.append(cands.pop()); repairs += 1
        else:
            out.append(w)
        i += 1
    return " ".join(out), repairs


def vote(*hyps):
    """A word-level vote, aligned on the first hypothesis: a word changes only where both others agree on another."""
    base = words(hyps[0])
    others = [words(h) for h in hyps[1:]]
    out = []
    for i, w in enumerate(base):
        alts = [o[i] if i < len(o) else None for o in others]
        if len(alts) >= 2 and alts[0] and alts[0] == alts[1] and alts[0] != w:
            out.append(alts[0])
        else:
            out.append(w)
    return " ".join(out)


# ------------------------------------------------------------------ report

def report():
    sets = json.load(open(os.path.join(EXP, "sets.json")))
    H = lambda name: json.load(open(os.path.join(EXP, "heard", name + ".json")))
    have = lambda name: os.path.exists(os.path.join(EXP, "heard", name + ".json"))
    pairs = lambda name, rows: [(r["text"], h["text"]) for r, h in zip(rows, H(name))]
    line = lambda label, value: print(f"  {label:<44} {value}")

    print("\nCONDITIONS (greedy, Zipformer large), sentence word errors")
    for name in ["clean", "voices", "wordbyword", "accent"] + [k for k in sets if k.startswith("room:")]:
        if name in sets and have(f"greedy__{name}"):
            line(name, f"{wer(pairs(f'greedy__{name}', sets[name])):5.1f}%   ({len(sets[name])} clips)")

    print("\nVOICES, one row each")
    rows = sets["voices"]
    got = H("greedy__voices")
    for v in VOICES:
        sel = [(r["text"], h["text"]) for r, h in zip(rows, got) if r["voice"] == v]
        line(v, f"{wer(sel):5.1f}%")

    print("\nDECODING")
    for name, label in (("greedy__clean", "greedy, 0.8 s tail"), ("tail0.3__clean", "greedy, 0.3 s tail"),
                        ("tail1.5__clean", "greedy, 1.5 s tail"), ("lead0.5__clean", "greedy, 0.5 s lead"),
                        ("beam__clean", "beam")):
        if have(name):
            line(label + " (clean)", f"{wer(pairs(name, sets['clean'])):5.1f}%")
    for room in ("room:babble5", "room:phone", "accent", "wordbyword"):
        if have(f"beam__{room}") and room in sets:
            line(f"greedy / beam on {room}", f"{wer(pairs(f'greedy__{room}', sets[room])):5.1f}% / {wer(pairs(f'beam__{room}', sets[room])):5.1f}%")
    for room in ("room:quiet", "room:clipped"):
        if have(f"norm__{room}"):
            line(f"as heard / loudness-normalised, {room}", f"{wer(pairs(f'greedy__{room}', sets[room])):5.1f}% / {wer(pairs(f'norm__{room}', sets[room])):5.1f}%")
    if have("retime__room:speed0.75"):
        line("slow 0.75 as heard / re-timed", f"{wer(pairs('greedy__room:speed0.75', sets['room:speed0.75'])):5.1f}% / {wer(pairs('retime__room:speed0.75', sets['room:speed0.75'])):5.1f}%")

    print("\nLEARNER MISTAKES: what the model wrote at the word said wrong")
    if have("greedy__errors"):
        for dec in ("greedy", "beam"):
            if not have(f"{dec}__errors"):
                continue
            tally = {}
            for r, h in zip(sets["errors"], H(f"{dec}__errors")):
                hw = words(h["text"])
                t = tally.setdefault(r["kind"], [0, 0, 0, 0])
                t[3] += 1
                if r["bad"] in hw:
                    t[0] += 1
                elif r["ok"] in hw:
                    t[1] += 1
                else:
                    t[2] += 1
            for kind, (faithful, corrected, other, n) in tally.items():
                line(f"{dec} {kind}", f"wrote the mistake {faithful}/{n}, corrected it {corrected}/{n}, neither {other}/{n}")

    print("\nAFTER THE MODEL: dictionary reconciliation against the corpus vocabulary")
    lexicon = {w for t in base_sentences() for w in words(t)}
    for name in ("clean", "room:babble5", "room:phone", "accent", "wordbyword", "voices"):
        if name in sets and have(f"greedy__{name}"):
            p = pairs(f"greedy__{name}", sets[name])
            fixed, n = [], 0
            for said, heard in p:
                text, k = reconcile(heard, lexicon)
                fixed.append((said, text)); n += k
            line(f"{name}: as heard / reconciled ({n} repairs)", f"{wer(p):5.1f}% / {wer(fixed):5.1f}%")
    # The safety question: does reconciliation undo a learner's mistake?
    if have("greedy__errors"):
        undone = kept = 0
        for r, h in zip(sets["errors"], H("greedy__errors")):
            text, _ = reconcile(h["text"], lexicon)
            if r["bad"] in words(h["text"]):
                if r["ok"] in words(text) and r["bad"] not in words(text):
                    undone += 1
                else:
                    kept += 1
        line("mistakes the model wrote and reconciliation undid", f"{undone} of {undone + kept}")

    print("\nA VOTE OF THREE (large greedy, large beam, small greedy)")
    for name in ("clean", "room:babble5", "errors", "accent"):
        if name in sets and all(have(f"{d}__{name}") for d in ("greedy", "beam", "small")):
            a, b, c = H(f"greedy__{name}"), H(f"beam__{name}"), H(f"small__{name}")
            voted = [(r["text"], vote(x["text"], y["text"], z_["text"])) for r, x, y, z_ in zip(sets[name], a, b, c)]
            line(f"{name}: large alone / vote", f"{wer(pairs(f'greedy__{name}', sets[name])):5.1f}% / {wer(voted):5.1f}%")

    print("\nCONFIDENCE: does the model's own probability find its mistakes?")
    toks = []
    for name in ("clean", "room:babble5", "room:phone", "accent", "voices"):
        if name not in sets or not have(f"greedy__{name}"):
            continue
        for r, h in zip(sets[name], H(f"greedy__{name}")):
            ref = set(words(r["text"]))
            # rebuild words from tokens with their minimum log probability
            cur, lo = "", 0.0
            for tok, p in zip(h["tokens"], h["ys_probs"]):
                if tok.startswith(" ") and cur:
                    toks.append((lo, cur.lower() in ref)); cur, lo = "", 0.0
                cur += tok.strip(); lo = min(lo, p)
            if cur:
                toks.append((lo, re.sub(r"[^\wõäöüšž]", "", cur.lower()) in ref))
    if toks:
        wrong = sum(1 for _, ok in toks if not ok)
        for cut in (-0.5, -1.0, -1.5, -2.0, -3.0):
            flagged = [ok for p, ok in toks if p < cut]
            caught = sum(1 for ok in flagged if not ok)
            line(f"flag words under {cut}", f"flags {len(flagged)} of {len(toks)} words, catches {caught} of {wrong} wrong ones")


# ------------------------------------------------------------------ round two

"""
What round one could not settle, or settled wrongly.

- PACE. Stretching a clip with a phase vocoder adds the vocoder's own smear,
  and round one measured that smear (64 percent at 1.2) rather than fast
  speech. TartuNLP renders a sentence at another pace in its acoustic model,
  which is a voice speaking slowly rather than a recording slowed down.
- PAUSES. Word by word, whole words vanished: a streaming model carried
  across long silences. What the app would do instead is cut at the pause
  and hear each piece, so that is measured.
- FAITHFULNESS. The Zipformer corrected nearly every mistake a sentence was
  said with. A model that writes letters as it hears them, with no sense of
  which words are likely, is the candidate for writing down what was said:
  TalTech's xls-r-300m-et, the best of all models at single contrast words.
- PADDING. A lead of silence helped and a long tail hurt; both together are
  measured.
"""


def tartu_paced(text, voice, speed):
    d = os.path.join(EXP, "tts-paced")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, re.sub(r"[^\w]+", "_", f"{voice}_{speed}_{text}")[:120] + ".wav")
    if not os.path.exists(path):
        body = json.dumps({"text": text if re.search(r"[.!?]$", text) else text + ".", "speaker": voice, "speed": speed}).encode()
        req = urllib.request.Request(TTS, data=body, headers={"content-type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            open(path, "wb").write(r.read())
        time.sleep(0.15)
    return path


def build2():
    sets = json.load(open(os.path.join(EXP, "sets.json")))
    twenty = base_sentences()[:20]
    for speed in (0.7, 0.85, 1.25):
        sets[f"pace{speed}"] = [{"text": t, "voice": "mari", "file": tartu_paced(t, "mari", speed)} for t in twenty]
    json.dump(sets, open(os.path.join(EXP, "sets.json"), "w"), ensure_ascii=False)
    print({k: len(v) for k, v in sets.items() if k.startswith("pace")}, file=sys.stderr)


def segments(audio, gap=0.3, floor=0.01):
    """Cut at every silence of `gap` seconds, as the app's endpointing would."""
    frame = int(RATE * 0.02)
    loud = [np.sqrt(np.mean(audio[i:i + frame] ** 2)) > floor for i in range(0, len(audio), frame)]
    out, start, quiet = [], None, 0
    for k, on in enumerate(loud):
        if on:
            if start is None:
                start = k
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet * 0.02 >= gap:
                out.append(audio[max(0, start * frame - frame * 5): (k - quiet + 5) * frame])
                start, quiet = None, 0
    if start is not None:
        out.append(audio[max(0, start * frame - frame * 5):])
    return out or [audio]


class XLSR:
    """TalTech's wav2vec2 model: letters as heard, greedy CTC, no language model."""

    def __init__(self, model_id="TalTechNLP/xls-r-300m-et"):
        import torch
        from transformers import AutoModelForCTC, AutoProcessor
        torch.set_num_threads(os.cpu_count() or 4)
        self.torch = torch
        self.proc = AutoProcessor.from_pretrained(model_id)
        self.model = AutoModelForCTC.from_pretrained(model_id).eval()

    def hear(self, audio):
        inputs = self.proc(audio, sampling_rate=RATE, return_tensors="pt")
        with self.torch.inference_mode():
            logits = self.model(**inputs).logits
        return {"text": self.proc.batch_decode(logits.argmax(-1))[0]}


def run2():
    sets = json.load(open(os.path.join(EXP, "sets.json")))
    z = Zipformer()
    for name in [k for k in sets if k.startswith("pace")]:
        cached(f"greedy__{name}", lambda: [z.hear(load(r["file"])) for r in sets[name]])
    cached("lead0.5tail0.8__clean", lambda: [z.hear(load(r["file"]), lead=0.5, tail=0.8) for r in sets["clean"]])
    cached("lead0.5tail1.2__clean", lambda: [z.hear(load(r["file"]), lead=0.5, tail=1.2) for r in sets["clean"]])
    cached("segmented__wordbyword", lambda: [
        {"text": " ".join(z.hear(seg, lead=0.3)["text"] for seg in segments(load(r["file"])))} for r in sets["wordbyword"]])
    x = XLSR()
    for name in ("errors", "clean", "room:babble5", "room:phone", "voices"):
        cached(f"xlsr__{name}", lambda: [x.hear(load(r["file"])) for r in sets[name]])
        print("xlsr", name, file=sys.stderr)


def report2():
    sets = json.load(open(os.path.join(EXP, "sets.json")))
    H = lambda name: json.load(open(os.path.join(EXP, "heard", name + ".json")))
    have = lambda name: os.path.exists(os.path.join(EXP, "heard", name + ".json"))
    pairs = lambda name, rows: [(r["text"], h["text"]) for r, h in zip(rows, H(name))]
    line = lambda label, value: print(f"  {label:<48} {value}")
    print("\nPACE, said at another speed by the voice itself (20 sentences, mari)")
    for name in [k for k in sets if k.startswith("pace")]:
        if have(f"greedy__{name}"):
            line(name, f"{wer(pairs(f'greedy__{name}', sets[name])):5.1f}%")
    print("\nPADDING (clean)")
    for name in ("greedy__clean", "lead0.5__clean", "lead0.5tail0.8__clean", "lead0.5tail1.2__clean"):
        if have(name):
            line(name.split("__")[0], f"{wer(pairs(name, sets['clean'])):5.1f}%")
    print("\nPAUSES, word by word")
    for name in ("greedy__wordbyword", "segmented__wordbyword"):
        if have(name):
            line(name.split("__")[0], f"{wer(pairs(name, sets['wordbyword'])):5.1f}%")
    print("\nFAITHFULNESS: xls-r-300m-et beside the Zipformer")
    for name in ("clean", "room:babble5", "room:phone", "voices"):
        if have(f"xlsr__{name}"):
            line(f"{name}: Zipformer / xls-r", f"{wer(pairs(f'greedy__{name}', sets[name])):5.1f}% / {wer(pairs(f'xlsr__{name}', sets[name])):5.1f}%")
    for model in ("greedy", "xlsr"):
        if not have(f"{model}__errors"):
            continue
        tally = {}
        for r, h in zip(sets["errors"], H(f"{model}__errors")):
            hw = words(h["text"])
            t = tally.setdefault(r["kind"], [0, 0, 0, 0])
            t[3] += 1
            t[0 if r["bad"] in hw else 1 if r["ok"] in hw else 2] += 1
        for kind, (faithful, corrected, other, n) in tally.items():
            line(f"{'Zipformer' if model == 'greedy' else 'xls-r'} {kind}", f"wrote the mistake {faithful}/{n}, corrected {corrected}/{n}, neither {other}/{n}")


if __name__ == "__main__":
    {"build": build, "run": run, "report": report, "build2": build2, "run2": run2, "report2": report2}[
        sys.argv[1] if len(sys.argv) > 1 else "report"]()
