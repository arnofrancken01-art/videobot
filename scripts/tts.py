"""Genereer voice-over per segment met Kokoro en schrijf een tijdlijn voor Remotion.
Gebruik: python3 scripts/tts.py episodes/ep001.json
"""
import json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
GAP = 0.25  # stilte tussen zinnen (seconden)

ep_path = Path(sys.argv[1])
ep = json.loads(ep_path.read_text())
k = Kokoro(str(ROOT / "models/kokoro-v1.0.onnx"), str(ROOT / "models/voices-v1.0.bin"))

audio, segs, t = [], [], 0.4  # korte stilte bij de start
sr = 24000
audio.append(np.zeros(int(sr * t), dtype=np.float32))
for s in ep["segments"]:
    samples, sr = k.create(s["text"], voice=ep.get("voice", "af_heart"), speed=1.08, lang="en-us")
    dur = len(samples) / sr
    # woordtiming: verdeel de duur over woorden volgens lengte (Whisper vervangt dit later)
    words = s["text"].split()
    weights = [len(re.sub(r"[^\w]", "", w)) + 2 for w in words]
    total = sum(weights)
    wt, acc = [], t + 0.05
    span = dur - 0.15
    for w, wgt in zip(words, weights):
        d = span * wgt / total
        wt.append({"word": w, "start": round(acc, 3), "end": round(acc + d, 3)})
        acc += d
    segs.append({**s, "start": round(t, 3), "end": round(t + dur, 3), "words": wt})
    audio.append(samples.astype(np.float32))
    audio.append(np.zeros(int(sr * GAP), dtype=np.float32))
    t += dur + GAP

audio.append(np.zeros(int(sr * 0.8), dtype=np.float32))
t += 0.8
sf.write(ROOT / "public/voice.wav", np.concatenate(audio), sr)
timeline = {k2: v for k2, v in ep.items() if k2 != "segments"}
timeline.update({"segments": segs, "durationInFrames": int(t * FPS) + 1, "fps": FPS})
(ROOT / "src/timeline.json").write_text(json.dumps(timeline, indent=1))
print(f"{len(segs)} segmenten, {t:.1f} s")
