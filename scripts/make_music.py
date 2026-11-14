"""Maak een eigen muziekbed (geen licentiegedoe): 110 bpm, kick, hi-hat, bas en een getokkeld akkoord.
Gebruik: python scripts/make_music.py  -> public/sfx/bed.mp3 (loopt naadloos rond, 8 maten)"""
import subprocess
from pathlib import Path
import numpy as np, soundfile as sf

SR = 44100
BPM = 110
BEAT = 60 / BPM
BARS = 16
N = int(SR * BEAT * 4 * BARS)
OUT = Path(__file__).resolve().parent.parent / "public/sfx"
rng = np.random.default_rng(3)
mix = np.zeros(N + SR * 2)


def add(x, at, gain=1.0):
    i = int(at * SR)
    mix[i:i + len(x)] += x[: len(mix) - i] * gain


def lp(x, cutoff):  # laagdoorlaat via FFT
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (fr / cutoff) ** 4), len(x))


def hp(x, cutoff):
    return x - lp(x, cutoff)


tt = lambda d: np.arange(int(SR * d)) / SR
note = lambda n: 440 * 2 ** ((n - 69) / 12)

# kick: toon die snel zakt
t = tt(0.32)
kick = np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 28)) / SR) * np.exp(-t * 9)
# hat: kort stukje hoge ruis
t = tt(0.06)
hat = hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 70)
# clap op tel 2 en 4
t = tt(0.18)
clap = hp(lp(rng.standard_normal(len(t)), 5000), 900) * np.exp(-t * 26)


def pluck(n, d=0.42):
    t = tt(d)
    f = note(n)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in (1, 2, 3, 4, 5))
    return lp(x * np.exp(-t * 7) * (1 - np.exp(-t * 300)), 2600)


def bass(n, d=0.24):
    t = tt(d)
    f = note(n)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 6) * (1 - np.exp(-t * 200))


# Am  F  C  G, twee keer
chords = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])] * 4
arp = [0, 2, 1, 3, 2, 1, 3, 2]
for bar, (root, tones) in enumerate(chords):
    t0 = bar * 4 * BEAT
    for b in range(4):
        add(kick, t0 + b * BEAT, 0.9)
        add(hat, t0 + (b + 0.5) * BEAT, 0.16)
        if b in (1, 3):
            add(clap, t0 + b * BEAT, 0.22)
    for e in range(8):
        if e not in (0, 4):  # bas wijkt voor de kick
            add(bass(root), t0 + e * BEAT / 2, 0.5)
        add(pluck(tones[arp[e]] + 12), t0 + e * BEAT / 2, 0.16)
        add(pluck(tones[arp[e]] + 12), t0 + e * BEAT / 2 + BEAT * 0.75, 0.05)  # echo

# staart terugvouwen naar het begin zodat de lus naadloos is
mix[: SR * 2] += mix[N: N + SR * 2]
out = np.tanh(mix[:N] * 0.9)
out = (out / np.max(np.abs(out)) * 0.8).astype(np.float32)
sf.write(OUT / "bed.wav", out, SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(OUT / "bed.wav"), "-b:a", "128k", str(OUT / "bed.mp3")], check=True)
(OUT / "bed.wav").unlink()
print("muziek klaar:", OUT / "bed.mp3")
