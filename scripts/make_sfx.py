"""Maak eigen geluidseffecten (geen licentiegedoe): whoosh, pop, ding, boom.
Gebruik: python scripts/make_sfx.py  -> public/sfx/*.wav"""
from pathlib import Path
import numpy as np, soundfile as sf

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public/sfx"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)
t = lambda d: np.arange(int(SR * d)) / SR


def lowpass(x, a):  # eenvoudige 1-pool filter, a mag per sample varieren
    y = np.zeros_like(x)
    a = np.broadcast_to(a, x.shape)
    for i in range(1, len(x)):
        y[i] = y[i - 1] + a[i] * (x[i] - y[i - 1])
    return y


def norm(x, peak):
    return (x / np.max(np.abs(x)) * peak).astype(np.float32)


# whoosh: ruis waarvan de filter opent en weer sluit
d = 0.45; tt = t(d)
env = np.sin(np.pi * tt / d) ** 2
cut = 0.02 + 0.25 * np.sin(np.pi * tt / d) ** 3
sf.write(OUT / "whoosh.wav", norm(lowpass(rng.standard_normal(len(tt)), cut) * env, 0.5), SR)

# pop: korte toonsweep omlaag
d = 0.12; tt = t(d)
f = 900 * np.exp(-tt * 18) + 250
sf.write(OUT / "pop.wav", norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 35), 0.5), SR)

# ding: heldere toon met boventonen
d = 0.9; tt = t(d)
x = sum(a * np.sin(2 * np.pi * fr * tt) for fr, a in [(1318, 1), (2637, 0.35), (3951, 0.12)])
sf.write(OUT / "ding.wav", norm(x * np.exp(-tt * 5) * (1 - np.exp(-tt * 400)), 0.4), SR)

# boom: diepe klap voor nummer 1
d = 1.0; tt = t(d)
f = 110 * np.exp(-tt * 6) + 42
x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.5) + 0.3 * lowpass(rng.standard_normal(len(tt)), 0.05) * np.exp(-tt * 12)
sf.write(OUT / "boom.wav", norm(x, 0.7), SR)
# tick: droge klik voor de timer
d = 0.07; tt = t(d)
sf.write(OUT / "tick.wav", norm(np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt * 90) + 0.4 * np.sin(2 * np.pi * 950 * tt) * np.exp(-tt * 60), 0.45), SR)
print("sfx klaar:", sorted(p.name for p in OUT.glob("*.wav")))
