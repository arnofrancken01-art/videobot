"""Lab: dezelfde tekst met Chatterbox (expressief) om te vergelijken met Kokoro."""
import time, sys
from pathlib import Path
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

OUT = Path("out/lab/voice"); OUT.mkdir(parents=True, exist_ok=True)
text = "This country has a vending machine for every twenty-three people. And that's not even the craziest part."
m = ChatterboxTTS.from_pretrained(device="cpu")
for ex, cfg in [(0.5, 0.5), (0.8, 0.35)]:
    t = time.time()
    wav = m.generate(text, exaggeration=ex, cfg_weight=cfg)
    ta.save(str(OUT / f"chatterbox_ex{ex}.wav"), wav, m.sr)
    print(f"exaggeration {ex}: {time.time() - t:.0f} s voor {wav.shape[-1] / m.sr:.1f} s audio", flush=True)
