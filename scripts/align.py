"""Maak woordtiming exact: Whisper luistert naar public/voice.wav en we koppelen
de herkende woorden aan de scriptwoorden. Niet-herkende woorden (bv. getallen die
Whisper als "$2.38" schrijft) worden tussen de zekere ankerpunten verdeeld.
Gebruik: python3 scripts/align.py
"""
import difflib, json, re
from pathlib import Path
import numpy as np, soundfile as sf
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
tl_path = ROOT / "src/timeline.json"
tl = json.loads(tl_path.read_text())

model = WhisperModel("base.en", device="cpu", compute_type="int8")
wav, sr = sf.read(ROOT / "public/voice.wav", dtype="float32")
# naar 16 kHz mono, wat Whisper verwacht
n16 = int(len(wav) * 16000 / sr)
audio16 = np.interp(np.linspace(0, len(wav) - 1, n16), np.arange(len(wav)), wav).astype(np.float32)
segments, _ = model.transcribe(audio16, word_timestamps=True, language="en", beam_size=5)
heard = [w for s in segments for w in s.words]

norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
script = [(si, wi, w["word"]) for si, s in enumerate(tl["segments"]) for wi, w in enumerate(s["words"])]
a = [norm(w) for *_, w in script]
b = [norm(w.word) for w in heard]

times = [None] * len(script)
for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
    for k in range(blk.size):
        h = heard[blk.b + k]
        times[blk.a + k] = (h.start, h.end)

# vul gaten: lineair tussen ankers, binnen de grenzen van het eigen segment
segs = tl["segments"]
i = 0
while i < len(script):
    if times[i] is not None:
        i += 1
        continue
    j = i
    while j < len(script) and times[j] is None:
        j += 1
    si = script[i][0]
    lo = times[i - 1][1] if i > 0 and times[i - 1] else segs[si]["start"]
    hi = times[j][0] if j < len(script) else segs[script[j - 1][0]]["end"]
    lo = max(lo, segs[si]["start"]) if i == 0 or script[i - 1][0] != si else lo
    n = j - i
    for k in range(n):
        times[i + k] = (lo + (hi - lo) * k / n, lo + (hi - lo) * (k + 1) / n)
    i = j

matched = 0
for (si, wi, _), (st, en) in zip(script, times):
    segs[si]["words"][wi]["start"] = round(st, 3)
    segs[si]["words"][wi]["end"] = round(en, 3)
tl["aligned"] = True
tl_path.write_text(json.dumps(tl, indent=1))
print(f"{len(script)} woorden uitgelijnd")
