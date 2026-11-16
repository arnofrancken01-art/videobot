"""Maak eigen muziekbedden (geen licentiegedoe): vier stijlen die per video afwisselen.
Gebruik: python scripts/make_music.py  -> public/sfx/bed1.mp3 ... bed4.mp3 (elk ca. 35 s, naadloze lus)"""
import subprocess
from pathlib import Path
import numpy as np, soundfile as sf

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public/sfx"
rng = np.random.default_rng(3)
tt = lambda d: np.arange(int(SR * d)) / SR
note = lambda n: 440 * 2 ** ((n - 69) / 12)


def lp(x, cutoff):  # laagdoorlaat via FFT
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (fr / cutoff) ** 4), len(x))


hp = lambda x, cutoff: x - lp(x, cutoff)
t = tt(0.32); KICK = np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 28)) / SR) * np.exp(-t * 9)
t = tt(0.06); HAT = hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 70)
t = tt(0.18); CLAP = hp(lp(rng.standard_normal(len(t)), 5000), 900) * np.exp(-t * 26)


def pluck(n, d=0.42, bright=2600):
    t = tt(d); f = note(n)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in (1, 2, 3, 4, 5))
    return lp(x * np.exp(-t * 7) * (1 - np.exp(-t * 300)), bright)


def bass(n, d=0.24):
    t = tt(d); f = note(n)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 6) * (1 - np.exp(-t * 200))


def pad(tones, d):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * note(n) * t * (1 + dt)) for n in tones for dt in (-0.003, 0, 0.003))
    return lp(x, 1800) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)


# stijl: tempo, akkoorden (grondtoon, tonen), tellen met kick, tellen met klap, hi-hat per tel, bas-achtsten, arpeggio, pad
STYLES = {
    1: dict(bpm=110, chords=[(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])],
            kick=[0, 1, 2, 3], clap=[1, 3], hats=[0.5], bass=[1, 2, 3, 5, 6, 7], arp=[0, 2, 1, 3, 2, 1, 3, 2], pad=0),
    2: dict(bpm=124, chords=[(38, [57, 62, 65, 69]), (46, [58, 62, 65, 70]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67])],
            kick=[0, 1, 2, 3], clap=[1, 3], hats=[0.5], bass=[1, 3, 5, 7], arp=[0, 1, 2, 3, 2, 3, 1, 2], pad=0.05),
    3: dict(bpm=92, chords=[(40, [59, 64, 67, 71]), (36, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (38, [57, 62, 66, 69])],
            kick=[0, 1.5, 2.5], clap=[2], hats=[0.5, 0.75], bass=[0, 3, 5], arp=[0, None, 2, None, 3, None, 1, 2], pad=0.09),
    4: dict(bpm=128, chords=[(36, [60, 63, 67, 72]), (44, [60, 63, 68, 72]), (39, [58, 63, 67, 70]), (46, [58, 62, 65, 70])],
            kick=[0, 1, 2, 3], clap=[1, 3], hats=[0.25, 0.5, 0.75], bass=[0, 1, 2, 3, 4, 5, 6, 7], arp=[0, 3, 2, 3, 1, 3, 2, 3], pad=0),
}


def make(k, st):
    beat = 60 / st["bpm"]
    bars = 16 if st["bpm"] > 100 else 12
    n = int(SR * beat * 4 * bars)
    mix = np.zeros(n + SR * 2)

    def add(x, at, gain=1.0):
        i = int(at * SR)
        mix[i:i + len(x)] += x[: len(mix) - i] * gain

    for bar in range(bars):
        root, tones = st["chords"][bar % 4]
        t0 = bar * 4 * beat
        if st["pad"]:
            add(pad(tones, 4 * beat), t0, st["pad"])
        for b in st["kick"]:
            add(KICK, t0 + b * beat, 0.9)
        for b in st["clap"]:
            add(CLAP, t0 + b * beat, 0.22)
        for b in range(4):
            for h in st["hats"]:
                add(HAT, t0 + (b + h) * beat, 0.14)
        for e in st["bass"]:
            add(bass(root, 0.24 if st["bpm"] > 100 else 0.5), t0 + e * beat / 2, 0.5)
        for e, a in enumerate(st["arp"]):
            if a is None:
                continue
            add(pluck(tones[a] + 12), t0 + e * beat / 2, 0.16)
            add(pluck(tones[a] + 12), t0 + e * beat / 2 + beat * 0.75, 0.05)  # echo
    mix[: SR * 2] += mix[n: n + SR * 2]  # staart terugvouwen: naadloze lus
    out = np.tanh(mix[:n] * 0.9)
    out = (out / np.max(np.abs(out)) * 0.8).astype(np.float32)
    sf.write(OUT / "bed.wav", out, SR)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(OUT / "bed.wav"), "-b:a", "128k", str(OUT / f"bed{k}.mp3")], check=True)
    (OUT / "bed.wav").unlink()


for k, st in STYLES.items():
    make(k, st)
print("muziek klaar:", sorted(p.name for p in OUT.glob("bed*.mp3")))
