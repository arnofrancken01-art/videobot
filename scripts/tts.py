"""Voice-over per segment met Kokoro + tijdlijn voor Remotion.
Gebruik: python3 scripts/tts.py episodes/ep001.json
Woordtiming wordt hier geschat; scripts/align.py maakt ze daarna exact met Whisper.
"""
import json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
GAP = 0.06    # korte adempauze tussen zinnen: snel tempo
SPEED = 1.15  # spreeksnelheid

ep = json.loads(Path(sys.argv[1]).read_text())
k = Kokoro(str(ROOT / "models/kokoro-v1.0.onnx"), str(ROOT / "models/voices-v1.0.bin"))

sr = 24000
t = 0.1
audio = [np.zeros(int(sr * t), dtype=np.float32)]
segs = []
for s in ep["segments"]:
    samples, sr = k.create(s["text"], voice=ep.get("voice", "af_heart"), speed=SPEED, lang="en-us")
    dur = len(samples) / sr
    words = s["text"].split()
    weights = [len(re.sub(r"[^\w]", "", w)) + 2 for w in words]
    total, acc, span = sum(weights), t + 0.03, dur - 0.08
    wt = []
    for w, wgt in zip(words, weights):
        d = span * wgt / total
        wt.append({"word": w, "start": round(acc, 3), "end": round(acc + d, 3)})
        acc += d
    segs.append({**s, "start": round(t, 3), "end": round(t + dur, 3), "words": wt})
    audio += [samples.astype(np.float32), np.zeros(int(sr * GAP), dtype=np.float32)]
    t += dur + GAP

audio.append(np.zeros(int(sr * 0.6), dtype=np.float32))
t += 0.6
(ROOT / "public").mkdir(exist_ok=True)
sf.write(ROOT / "public/voice.wav", np.concatenate(audio), sr)
timeline = {k2: v for k2, v in ep.items() if k2 != "segments"}
timeline.update({"segments": segs, "durationInFrames": int(t * FPS) + 1, "fps": FPS, "aligned": False})
(ROOT / "src/timeline.json").write_text(json.dumps(timeline, indent=1))
print(f"{len(segs)} segmenten, {t:.1f} s")
