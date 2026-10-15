#!/usr/bin/env python3
"""
Open-weights speech recognizers, on the clips `scripts/measure-asr.ts --corpus` built.

    python3 scripts/asr-local.py --model TalTechNLP/whisper-large-v3-turbo-et-verbatim-2604
    python3 scripts/asr-local.py --list

The cloud half of the measurement lives in `scripts/measure-asr.ts` and so does
the scoring: this file only hears. It reads `.cache/asr/corpus.json`, writes
what each model heard to `.cache/asr/heard/local__<model>.json` in the shape
the TypeScript side reads, and `npm run measure:asr -- --report` ranks every
recognizer side by side. A clip already heard is never heard again, so a run
that is stopped picks up where it left off.

It runs on a CPU and needs a Python with torch, transformers, librosa,
onnx-asr and sherpa-onnx; none of that is a dependency of the app and none of
it ships. Decoding is greedy everywhere, with the language fixed to Estonian
where a model takes one, so a row is the model and not a decoding search.
"""
import argparse
import json
import os
import re
import sys
import time

ROOT = os.path.join(os.getcwd(), ".cache", "asr")
RATE = 16_000


def paths(set_name):
    """The same layout `scripts/measure-asr.ts` reads: TartuNLP's set is the plain one."""
    if set_name == "tartunlp":
        return os.path.join(ROOT, "corpus.json"), os.path.join(ROOT, "heard")
    return os.path.join(ROOT, f"corpus-{set_name}.json"), os.path.join(ROOT, f"heard-{set_name}")


def speak_mms(model_id, set_name):
    """
    The TartuNLP corpus said again by Meta's MMS Estonian voice, clip for clip,
    so its intelligibility can be read by a recognizer the way Gemini's speech
    models are. One speaker only, so both sentence voices are the same voice.
    """
    import soundfile as sf
    import torch
    from transformers import AutoTokenizer, VitsModel

    tok = AutoTokenizer.from_pretrained(model_id)
    model = VitsModel.from_pretrained(model_id).eval()
    base = json.load(open(paths("tartunlp")[0]))
    corpus, _ = paths(set_name)
    out_dir = os.path.join(ROOT, "clips-" + set_name)
    os.makedirs(out_dir, exist_ok=True)
    clips = []
    for c in base:
        file = os.path.join(out_dir, c["id"] + ".wav")
        if not os.path.exists(file):
            text = c["text"] if re.search(r"[.!?]$", c["text"]) else c["text"] + "."
            torch.manual_seed(0)  # VITS samples its durations; a fixed seed makes a rerun the same clip
            with torch.inference_mode():
                wav = model(**tok(text, return_tensors="pt")).waveform[0].numpy()
            sf.write(file, wav, model.config.sampling_rate)
        clips.append({**c, "file": file})
        sys.stderr.write(".")
    json.dump(clips, open(corpus, "w"), ensure_ascii=False, indent=1)
    print(f"\n{len(clips)} clips said by {model_id}", file=sys.stderr)


def load(path):
    import librosa
    audio, _ = librosa.load(path, sr=RATE, mono=True)
    return audio


def babble(snr_db):
    """
    The clean corpus with a room in it: each clip mixed with three other
    sentences from the corpus, in both voices, at a signal-to-noise ratio of
    `snr_db`. Babble rather than white noise because people talking is what a
    learner's kitchen, café or classroom sounds like, and it is the noise a
    recognizer finds hardest because it is speech. Deterministic, so a rerun is
    the same set.
    """
    import numpy as np
    import soundfile as sf

    base = json.load(open(paths("tartunlp")[0]))
    sentences = [c for c in base if c["kind"] == "sentence"]
    set_name = f"babble{int(snr_db)}"
    corpus, _ = paths(set_name)
    out_dir = os.path.join(ROOT, "clips-" + set_name)
    os.makedirs(out_dir, exist_ok=True)
    rng = np.random.default_rng(15)
    clips = []
    for c in base:
        speech = load(c["file"])
        noise = np.zeros_like(speech)
        others = [s for s in sentences if s["text"] != c["text"]]
        for pick in rng.choice(len(others), 3, replace=False):
            other = load(others[pick]["file"])
            other = np.tile(other, int(np.ceil(len(speech) / len(other))))[: len(speech)]
            noise += np.roll(other, int(rng.integers(0, len(other))))
        p_s = np.mean(speech ** 2)
        p_n = np.mean(noise ** 2) or 1.0
        mixed = speech + noise * np.sqrt(p_s / (p_n * 10 ** (snr_db / 10)))
        mixed = mixed / max(1.0, float(np.max(np.abs(mixed))) / 0.95)
        file = os.path.join(out_dir, c["id"] + ".wav")
        sf.write(file, mixed.astype(np.float32), RATE)
        clips.append({**c, "file": file})
    json.dump(clips, open(corpus, "w"), ensure_ascii=False, indent=1)
    print(f"{len(clips)} clips with babble at {snr_db} dB into set {set_name}", file=sys.stderr)


# ------------------------------------------------------------------ adapters
# Each returns a function from a 16 kHz float array to text.


def whisper(model_id):
    """
    Whisper through CTranslate2 at int8, because the large encoder is most of
    the cost and on a CPU transformers takes twenty seconds a clip. A repository
    that publishes its own `ct2/` folder is used as published; anything else is
    converted once into `.cache/asr/ct2/`. Greedy, Estonian, no prompt and no
    previous-text conditioning, so a clip is heard on its own.
    """
    from faster_whisper import WhisperModel
    from huggingface_hub import list_repo_files, snapshot_download

    files = list_repo_files(model_id)
    if any(f.startswith("ct2/") for f in files):
        path = os.path.join(snapshot_download(model_id, allow_patterns=["ct2/*"]), "ct2")
    else:
        path = os.path.join(ROOT, "ct2", re.sub(r"[^\w.-]+", "_", model_id))
        if not os.path.exists(os.path.join(path, "model.bin")):
            import subprocess
            subprocess.run([
                os.path.join(os.path.dirname(sys.executable), "ct2-transformers-converter"),
                "--model", model_id, "--output_dir", path, "--quantization", "int8",
                "--copy_files", *[f for f in ("tokenizer.json", "preprocessor_config.json") if f in files],
            ], check=True)
    model = WhisperModel(path, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)

    def hear(audio):
        segments, _ = model.transcribe(
            audio, language="et", task="transcribe", beam_size=1, temperature=0.0,
            condition_on_previous_text=False, vad_filter=False,
        )
        return " ".join(s.text.strip() for s in segments)

    return hear


def ctc(model_id, lang=None):
    import torch
    from transformers import AutoModelForCTC, AutoProcessor

    proc = AutoProcessor.from_pretrained(model_id)
    kwargs = {"target_lang": lang, "ignore_mismatched_sizes": True} if lang else {}
    model = AutoModelForCTC.from_pretrained(model_id, **kwargs).eval()
    if lang:
        proc.tokenizer.set_target_lang(lang)
        model.load_adapter(lang)

    def hear(audio):
        inputs = proc(audio, sampling_rate=RATE, return_tensors="pt")
        with torch.inference_mode():
            logits = model(**inputs).logits
        return proc.batch_decode(logits.argmax(-1))[0]

    return hear


def onnx(name):
    import onnx_asr

    model = onnx_asr.load_model(name)

    def hear(audio):
        try:
            out = model.recognize(audio, sample_rate=RATE, language="et")
        except TypeError:
            out = model.recognize(audio, sample_rate=RATE)
        return out if isinstance(out, str) else getattr(out, "text", str(out))

    return hear


def zipformer(model_id):
    import numpy as np
    import sherpa_onnx
    from huggingface_hub import snapshot_download

    d = snapshot_download(model_id)
    names = os.listdir(d)
    pick = lambda stem: os.path.join(d, f"{stem}.int8.onnx" if f"{stem}.int8.onnx" in names else f"{stem}.onnx")
    rec = sherpa_onnx.OnlineRecognizer.from_transducer(
        tokens=os.path.join(d, "tokens.txt"),
        encoder=pick("encoder"), decoder=pick("decoder"), joiner=pick("joiner"),
        num_threads=4, sample_rate=RATE, feature_dim=80, decoding_method="greedy_search",
    )

    def hear(audio):
        s = rec.create_stream()
        s.accept_waveform(RATE, audio)
        s.accept_waveform(RATE, np.zeros(int(RATE * 0.8), dtype=np.float32))
        s.input_finished()
        while rec.is_ready(s):
            rec.decode_stream(s)
        return rec.get_result(s)

    return hear


def voxtral(model_id):
    import torch
    from transformers import AutoProcessor, VoxtralForConditionalGeneration

    proc = AutoProcessor.from_pretrained(model_id)
    model = VoxtralForConditionalGeneration.from_pretrained(model_id, torch_dtype=torch.bfloat16).eval()

    def hear(audio):
        inputs = proc.apply_transcription_request(language="et", audio=audio, sampling_rate=RATE, model_id=model_id)
        inputs = inputs.to(dtype=torch.bfloat16)
        with torch.inference_mode():
            out = model.generate(**inputs, max_new_tokens=120, do_sample=False)
        return proc.batch_decode(out[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]

    return hear


def voxtral_realtime(model_id):
    import torch
    from transformers import AutoProcessor, VoxtralRealtimeForConditionalGeneration

    proc = AutoProcessor.from_pretrained(model_id)
    model = VoxtralRealtimeForConditionalGeneration.from_pretrained(model_id, torch_dtype=torch.bfloat16).eval()

    def hear(audio):
        inputs = proc(audio, sampling_rate=RATE, return_tensors="pt")
        inputs = {k: (v.to(torch.bfloat16) if v.is_floating_point() else v) for k, v in inputs.items()}
        with torch.inference_mode():
            out = model.generate(**inputs, max_new_tokens=160, do_sample=False)
        return proc.batch_decode(out, skip_special_tokens=True)[0]

    return hear


def seamless(model_id):
    import torch
    from transformers import AutoProcessor, SeamlessM4Tv2ForSpeechToText

    proc = AutoProcessor.from_pretrained(model_id)
    model = SeamlessM4Tv2ForSpeechToText.from_pretrained(model_id).eval()

    def hear(audio):
        inputs = proc(audios=audio, sampling_rate=RATE, return_tensors="pt")
        with torch.inference_mode():
            out = model.generate(**inputs, tgt_lang="est", num_beams=1, max_new_tokens=120)
        return proc.batch_decode(out, skip_special_tokens=True)[0]

    return hear


MODELS = {
    # TalTech's Estonian fine-tunes, newest first. Verbatim is the one trained to write what was said.
    "TalTechNLP/whisper-large-v3-turbo-et-verbatim-2604": whisper,
    "TalTechNLP/whisper-large-v3-turbo-et-verbatim": whisper,
    "TalTechNLP/whisper-large-v3-turbo-et-subs": whisper,
    "TalTechNLP/whisper-large-v3-et-subs": whisper,
    "TalTechNLP/whisper-large-et": whisper,
    "TalTechNLP/whisper-medium-et": whisper,
    "TalTechNLP/xls-r-300m-et": ctc,
    "TalTechNLP/streaming-zipformer-large.et-en": zipformer,
    "TalTechNLP/streaming-zipformer.et-en": zipformer,
    # Small enough to consider running in a phone's browser: Whisper small is a
    # third of the size of turbo. Community fine-tunes, so measured, not trusted.
    "rristo/whisper-small-et-cv-fleurs": whisper,
    "rristo/whisper-small-et": whisper,
    "aajaani/whisper-small-et": whisper,
    "Siim303/whisper-small-et": whisper,
    "splendid678/whisper-small-et": whisper,
    "SaulGoodmens/whisper-small-et": whisper,
    "agnesluhtaru/whisper-small-et": whisper,
    "agnesluhtaru/whisper-small-et-ERR2020": whisper,
    "rristo/whisper-medium-et": whisper,
    "TalTechNLP/Voxtral-Mini-3B-2507-estonian": voxtral,
    "TalTechNLP/Voxtral-Mini-4B-Realtime-estonian-2609": voxtral_realtime,
    # Multilingual models that name Estonian among their languages.
    "nemo-parakeet-tdt-0.6b-v3": onnx,
    "nemo-canary-1b-v2": onnx,
    "facebook/mms-1b-all": lambda m: ctc(m, "est"),
    "facebook/seamless-m4t-v2-large": seamless,
    "openai/whisper-large-v3": whisper,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--kind", choices=["sentence", "word"], help="hear only one half of the corpus")
    ap.add_argument("--set", default="tartunlp", help="which voice's clips to hear")
    ap.add_argument("--speak", help="say the corpus with an open-weights voice (facebook/mms-tts-est) into --set")
    ap.add_argument("--babble", type=float, help="build set babble<SNR>: every clip with three other voices talking under it")
    args = ap.parse_args()
    if args.speak:
        return speak_mms(args.speak, args.set)
    if args.babble is not None:
        return babble(args.babble)
    if args.list or not args.model:
        print("\n".join(MODELS))
        return
    if args.model not in MODELS:
        sys.exit(f"Unknown model {args.model}. --list names the ones this knows how to run.")
    import torch
    torch.set_num_threads(os.cpu_count() or 4)

    CORPUS, HEARD = paths(args.set)
    clips = json.load(open(CORPUS))
    if args.kind:
        clips = [c for c in clips if c["kind"] == args.kind]
    os.makedirs(HEARD, exist_ok=True)
    out = os.path.join(HEARD, "local__" + re.sub(r"[^\w.-]+", "_", args.model) + ".json")
    done = json.load(open(out)) if os.path.exists(out) else {}
    todo = [c for c in clips if c["id"] not in done or "error" in done[c["id"]]]
    if not todo:
        print("all heard")
        return

    started = time.time()
    hear = MODELS[args.model](args.model)
    print(f"loaded {args.model} in {time.time() - started:.0f}s; {len(todo)} clips to hear", file=sys.stderr)
    for clip in todo:
        t = time.time()
        try:
            text = hear(load(clip["file"])).strip()
            done[clip["id"]] = {"text": text, "ms": int((time.time() - t) * 1000)}
            sys.stderr.write(".")
        except Exception as error:  # a refusal is recorded, never mistaken for an answer
            done[clip["id"]] = {"error": f"{type(error).__name__}: {error}"[:300]}
            sys.stderr.write("?")
        sys.stderr.flush()
        with open(out, "w") as f:
            json.dump(done, f, ensure_ascii=False, indent=1)
    print(f"\n{args.model}: {len(todo)} clips in {time.time() - started:.0f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
