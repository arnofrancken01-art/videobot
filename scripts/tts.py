"""Voice-over per segment met Kokoro + tijdlijn voor Remotion.
Gebruik: python scripts/tts.py episodes/ep001.json

Twee motoren:
- "kokoro" (PyTorch, in GitHub Actions): geeft per woord de exacte tijd terug,
  rechtstreeks uit het stemmodel. Captions lopen dan precies gelijk met de stem.
- "kokoro-onnx" (lokaal testen zonder internet): schat de woordtiming.
"""
import difflib, json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
SR = 24000
GAP = 0.06    # korte adempauze tussen zinnen: snel tempo
SPEED = 1.15  # spreeksnelheid
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())


def speak(text):
    """Tekst voor de stem: dubbelpunten en puntkomma's worden punten (anders gaat de toon
    omhoog alsof het een vraag is), en elke zin eindigt op een leesteken.
    De captions gebruiken de originele tekst; de woorden blijven gelijk."""
    t = re.sub(r"\s*[:;]\s*", ". ", text.strip())
    t = re.sub(r"\s+[-\u2013\u2014]\s+", ". ", t)
    if t and t[-1] not in ".!?":
        t += "."
    return t


def map_words(words, toks):
    """Koppel scriptwoorden aan (tekst, start, eind)-tokens via letters, robuust voor
    koppeltekens en leestekens. Geeft per woord (start, eind) of None."""
    tchars = []
    for text, s, e in toks:
        letters = norm(text)
        for k in range(len(letters)):
            tchars.append((letters[k], s + (e - s) * k / len(letters), s + (e - s) * (k + 1) / len(letters)))
    wstr, owner = "", []
    for i, w in enumerate(words):
        for c in norm(w):
            wstr += c
            owner.append(i)
    tstr = "".join(c for c, *_ in tchars)
    hit = [None] * len(words)
    for b in difflib.SequenceMatcher(None, wstr, tstr, autojunk=False).get_matching_blocks():
        for k in range(b.size):
            wi = owner[b.a + k]
            _, s, e = tchars[b.b + k]
            hit[wi] = (s, e) if hit[wi] is None else (min(hit[wi][0], s), max(hit[wi][1], e))
    return hit


def fill_gaps(times, lo, hi):
    """Woorden zonder tijd krijgen een plek tussen hun buren."""
    out = list(times)
    i = 0
    while i < len(out):
        if out[i] is not None:
            i += 1
            continue
        j = i
        while j < len(out) and out[j] is None:
            j += 1
        a = out[i - 1][1] if i > 0 else lo
        b = out[j][0] if j < len(out) else hi
        for k in range(i, j):
            out[k] = (a + (b - a) * (k - i) / (j - i), a + (b - a) * (k - i + 1) / (j - i))
        i = j
    return out


def engine_torch(voice):
    from kokoro import KPipeline
    pipe = KPipeline(lang_code="a")

    def say(text):
        audio, toks, off = [], [], 0.0
        for r in pipe(text, voice=voice, speed=SPEED):
            a = r.audio.numpy().astype(np.float32)
            for t in r.tokens or []:
                if t.start_ts is not None and t.end_ts is not None and norm(t.text):
                    toks.append((t.text, off + t.start_ts, off + t.end_ts))
            audio.append(a)
            off += len(a) / SR
        return np.concatenate(audio), toks
    return say, "tts"


def engine_onnx(voice):
    from kokoro_onnx import Kokoro
    k = Kokoro(str(ROOT / "models/kokoro-v1.0.onnx"), str(ROOT / "models/voices-v1.0.bin"))

    def say(text):
        samples, _ = k.create(text, voice=voice, speed=SPEED, lang="en-us")
        words = text.split()
        weights = [len(norm(w)) + 2 for w in words]
        dur, acc, toks = len(samples) / SR - 0.08, 0.03, []
        for w, wg in zip(words, weights):
            d = dur * wg / sum(weights)
            toks.append((w, acc, acc + d))
            acc += d
        return samples.astype(np.float32), toks
    return say, False


def engine_chatterbox():
    """Expressieve stem (Chatterbox, MIT-licentie). Geen woordtiming uit het model: align.py zet die daarna met Whisper."""
    import torch, torchaudio
    from chatterbox.tts import ChatterboxTTS
    m = ChatterboxTTS.from_pretrained(device="cpu")
    ex = float(__import__("os").environ.get("VOICE_EXAGGERATION", "0.65"))

    def say(text):
        wav = m.generate(text, exaggeration=ex, cfg_weight=0.4)
        if m.sr != SR:
            wav = torchaudio.functional.resample(wav, m.sr, SR)
        a = wav.squeeze().numpy().astype(np.float32)
        on = np.where(np.abs(a) > 0.02)[0]
        if len(on):
            a = a[max(0, on[0] - int(0.03 * SR)): on[-1] + int(0.08 * SR)]
        words = text.split()
        weights = [len(norm(w)) + 2 for w in words]
        dur, acc, toks = len(a) / SR - 0.05, 0.02, []
        for w, wg in zip(words, weights):
            d = dur * wg / sum(weights)
            toks.append((w, acc, acc + d)); acc += d
        return a, toks
    return say, False


def loud(x, target=0.2, ceiling=0.72):
    """Maak de stem zo luid als andere Shorts (ca. -16 LUFS; ze stond op -22, half zo luid).
    Eerst versterken tot een vaste gemiddelde sterkte, daarna een begrenzer die pieken zacht terugneemt in plaats van ze af te kappen."""
    from numpy.lib.stride_tricks import sliding_window_view
    active = x[np.abs(x) > 0.01]
    if not len(active):
        return x
    # Klankkleur van een radiostem: gerommel onder 75 Hz weg, wat warmte rond 180 Hz, helderheid boven 4 kHz.
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    db = -24 / (1 + (fr / 75) ** 4) + 2.0 * np.exp(-((np.log2(np.maximum(fr, 1) / 180)) ** 2) / 0.5) + 4.0 / (1 + (4200 / np.maximum(fr, 1)) ** 3) - 2.5 * np.exp(-((np.log2(np.maximum(fr, 1) / 500)) ** 2) / 0.4)
    x = np.fft.irfft(X * 10 ** (db / 20), len(x))
    # Zachte compressie: stille lettergrepen komen omhoog, zodat elk woord verstaanbaar is op een telefoon.
    w = int(SR * 0.02)
    level = np.sqrt(np.convolve(x ** 2, np.ones(w) / w, mode="same")) + 1e-6
    ref = np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2))
    x = x * np.clip((level / ref) ** -0.35, 0.5, 2.2)
    active = x[np.abs(x) > 0.01]
    y = x * (target / np.sqrt(np.mean(active ** 2)))
    win = int(SR * 0.006)
    pad = np.pad(np.abs(y), (win, win), mode="edge")
    env = sliding_window_view(pad, 2 * win + 1).max(axis=1)          # hoogste piek in de buurt (kijkt ook vooruit)
    gain = np.minimum(1.0, ceiling / np.maximum(env, 1e-9))
    gain = np.convolve(np.pad(gain, (win, win), mode="edge"), np.ones(2 * win + 1) / (2 * win + 1), mode="valid")  # vloeiend
    return np.clip(y * gain, -ceiling, ceiling).astype(np.float32)


def main():
    ep = json.loads(Path(sys.argv[1]).read_text())
    voice = ep.get("voice", "af_heart")
    import os
    engine = os.environ.get("VOICE_ENGINE") or ep.get("voice_engine", "kokoro")
    if engine == "chatterbox":
      try:
        say, aligned = engine_chatterbox()
        print("motor: chatterbox (expressief; timing via Whisper)")
      except Exception:  # noqa: BLE001  liever een video met de oude stem dan geen video
        import traceback
        traceback.print_exc()
        say, aligned = engine_onnx(voice)
        print("motor: kokoro-onnx (terugval; chatterbox lukte niet)")
    else:
      try:
        say, aligned = engine_torch(voice)
        print("motor: kokoro (exacte woordtiming)")
      except Exception as e:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        if os.environ.get("REQUIRE_EXACT_TIMING"):
            raise SystemExit(f"Exacte woordtiming niet beschikbaar: {e}")
        say, aligned = engine_onnx(voice)
        print("motor: kokoro-onnx (geschatte woordtiming)")

    t = 0.05
    audio = [np.zeros(int(SR * t), dtype=np.float32)]
    segs = []
    for s in ep["segments"]:
        samples, toks = say(speak(s["text"]))
        dur = len(samples) / SR
        words = s["text"].split()
        times = fill_gaps(map_words(words, toks), 0.0, dur)
        wt = [{"word": w, "start": round(t + a, 3), "end": round(t + b, 3)} for w, (a, b) in zip(words, times)]
        segs.append({**s, "start": round(t, 3), "end": round(t + dur, 3), "words": wt})
        gap = GAP + float(s.get("props", {}).get("pause", 0))  # pause = denktijd (stilte) na dit segment
        audio += [samples, np.zeros(int(SR * gap), dtype=np.float32)]
        t += dur + gap

    audio.append(np.zeros(int(SR * 0.6), dtype=np.float32))
    t += 0.6
    (ROOT / "public").mkdir(exist_ok=True)
    sf.write(ROOT / "public/voice.wav", loud(np.concatenate(audio)), SR)
    timeline = {k2: v for k2, v in ep.items() if k2 != "segments"}
    timeline.update({"segments": segs, "durationInFrames": int(t * FPS) + 1, "fps": FPS, "aligned": aligned})
    (ROOT / "src/timeline.json").write_text(json.dumps(timeline, indent=1))
    print(f"{len(segs)} segmenten, {t:.1f} s")


if __name__ == "__main__":
    main()
