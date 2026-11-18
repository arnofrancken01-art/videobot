"""Download de gekozen clips en maak alles klaar voor Remotion.
Gebruik: python clipbot/scripts/prepare.py
Leest work/picks.json, schrijft public/clips/*, public/voice/*, remotion/timeline.json en work/meta.json.
"""
import datetime as dt, json, re, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf
from common import CLIP, WORK, PUB, load, save, settings

FPS = 30
cfg = settings()
CLIPS, VOICE = PUB / "clips", PUB / "voice"


def run(*cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"{cmd[0]} mislukt: {r.stderr[-600:]}")
    return r.stdout


def probe(path):
    d = json.loads(run("ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)))
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    return float(d["format"]["duration"]), int(v["width"]), int(v["height"])


def download(c, dest):
    if dest.exists():
        return
    run("yt-dlp", "-q", "--no-warnings", "-f", "best[height<=1080][ext=mp4]/best[height<=1080]/best", "-o", str(dest), c["url"])


def energy(path):
    """Luidheid per 0,1 s: de luidste stukken zijn meestal de reactie (geschreeuw, gelach)."""
    wav = WORK / "tmp.wav"
    run("ffmpeg", "-y", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", str(wav))
    x, sr = sf.read(wav, dtype="float32")
    n = len(x) // (sr // 10)
    return np.sqrt((x[: n * (sr // 10)].reshape(n, -1) ** 2).mean(axis=1) + 1e-9)


def pick_window(e, dur):
    L = min(cfg["clip_max_seconds"], dur)
    k = int(L * 10)
    if len(e) <= k:
        return 0.0, dur
    cs = np.concatenate([[0], np.cumsum(e)])
    score = [(cs[s + k] - cs[s]) * (1 + 0.15 * s / len(e)) for s in range(len(e) - k + 1)]  # bij gelijke stand liever later: daar zit de clou
    s = int(np.argmax(score))
    return s / 10, L


def process(src, dst, bg, start, length, w, h):
    vertical = h > w
    vf = ("scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" if vertical else
          f"scale={int(1080 * cfg['zoom']) // 2 * 2}:-2,crop=1080:ih")
    common = ["-ss", f"{start:.2f}", "-t", f"{length:.2f}", "-i", str(src)]
    run("ffmpeg", "-y", "-v", "error", *common, "-vf", vf + ",fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-af", "loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(dst))
    run("ffmpeg", "-y", "-v", "error", *common, "-vf", "scale=240:-2,boxblur=8:2,fps=15", "-an", "-c:v", "libx264", "-crf", "34", str(bg))
    return vertical


_whisper = None


def words_of(path):
    """Wat de streamer zegt, met tijd per woord (voor de grote ondertitels)."""
    global _whisper
    try:
        from faster_whisper import WhisperModel
        _whisper = _whisper or WhisperModel(cfg["whisper_model"], device="cpu", compute_type="int8")
        wav = WORK / "speech.wav"  # zelf decoderen: de av-versie op GitHub past niet bij faster-whisper
        run("ffmpeg", "-y", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", str(wav))
        audio, _ = sf.read(wav, dtype="float32")
        segs, _ = _whisper.transcribe(audio, word_timestamps=True, vad_filter=True, beam_size=3)
        out = [{"word": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)} for s in segs for w in s.words if w.word.strip()]
    except Exception as e:  # noqa: BLE001  zonder ondertitels is beter dan geen video
        import traceback
        traceback.print_exc()
        print("Whisper mislukt:", repr(e), flush=True)
        return []
    bad = re.compile(r"(" + "|".join(map(re.escape, cfg["censor_words"])) + r")", re.I)
    for w in out:  # scheldwoorden in beeld maskeren (beter voor advertenties)
        w["word"] = bad.sub(lambda m: m.group(0)[0] + "*" * (len(m.group(0)) - 1), w["word"])
    return out


_voice = None


def say(text, name):
    global _voice
    from kokoro_onnx import Kokoro
    _voice = _voice or Kokoro(str(CLIP.parent / "models/kokoro-v1.0.onnx"), str(CLIP.parent / "models/voices-v1.0.bin"))
    x, sr = _voice.create(text, voice=cfg["voice"], speed=1.12, lang="en-us")
    x = x / (np.abs(x).max() + 1e-9) * 0.85
    VOICE.mkdir(parents=True, exist_ok=True)
    sf.write(VOICE / f"{name}.wav", x.astype(np.float32), sr)
    return len(x) / sr


def clean_title(t):
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"\s+", " ", t).strip(" -|")
    return t[:70] if len(re.sub(r"[^A-Za-z]", "", t)) >= 4 else ""


NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]


def main():
    data = load(WORK / "picks.json")
    picks = data["picks"]
    n = len(picks)
    game = cfg["game_short"] if data["game"] == cfg["game_names"] else data["game"][0]
    spoken_game = game.replace("GTA 6", "GTA six").replace("GTA V", "GTA five")
    for d in (CLIPS, VOICE):
        d.mkdir(parents=True, exist_ok=True)
        for f in d.glob("*"):
            f.unlink()
    WORK.mkdir(exist_ok=True)
    items = []
    for i, c in enumerate(picks):  # i=0 is de best bekeken clip = nummer 1
        raw = WORK / f"raw_{c['id']}.mp4"
        download(c, raw)
        dur, w, h = probe(raw)
        start, length = pick_window(energy(raw), dur)
        vert = process(raw, CLIPS / f"c{i + 1}.mp4", CLIPS / f"c{i + 1}_bg.mp4", start, length, w, h)
        items.append({"rank": i + 1, "src": f"clips/c{i + 1}.mp4", "bg": f"clips/c{i + 1}_bg.mp4", "vertical": vert,
                      "dur": round(length, 2), "streamer": c["streamer"], "login": c["login"], "title": clean_title(c["title"]),
                      "words": words_of(CLIPS / f"c{i + 1}.mp4"), "url": c["url"], "views": c["views"], "peak": 0})
        e = energy(CLIPS / f"c{i + 1}.mp4")
        items[-1]["peak"] = round(float(np.argmax(np.convolve(e, np.ones(10), "same"))) / 10, 1)
        print(f"#{i + 1} {c['streamer']}: {length:.1f}s vanaf {start:.1f}s, {len(items[-1]['words'])} woorden")

    # Volgorde in de video: aftellen van de laagste plaats naar nummer 1
    order = sorted(items, key=lambda it: -it["rank"])
    t = 0.0
    voice = []
    hook = f"Today's craziest {spoken_game} moments."
    hd = say(hook, "hook")
    one = items[0]
    tease_len = max(2.4, hd + 0.2)
    tease_from = max(0.0, min(one["peak"] - tease_len / 2, one["dur"] - tease_len))
    intro = {"start": 0, "dur": round(tease_len, 2), "from": round(tease_from, 2), "src": one["src"], "bg": one["bg"], "vertical": one["vertical"]}
    voice.append({"src": "voice/hook.wav", "start": 0.05, "dur": round(hd, 2)})
    t = tease_len
    for it in order:
        line = ("And number one." if it["rank"] == 1 else f"Number {NUM[it['rank'] - 1]}.")
        vd = say(line, f"r{it['rank']}")
        it["start"] = round(t, 2)
        voice.append({"src": f"voice/r{it['rank']}.wav", "start": round(t + 0.05, 2), "dur": round(vd, 2)})
        t += it["dur"]
    od = say(f"Follow for tomorrow's top {NUM[n - 1]}.", "outro")
    outro = {"start": round(t, 2), "dur": round(max(1.8, od + 0.4), 2)}
    voice.append({"src": "voice/outro.wav", "start": round(t + 0.1, 2), "dur": round(od, 2)})
    t += outro["dur"]

    launch = dt.date.fromisoformat(cfg["launch_date"])
    day = (dt.date.today() - launch).days + 1
    header = f"TOP {n} {game.upper()} MOMENTS"
    tl = {"fps": FPS, "durationInFrames": int(t * FPS) + 1, "header": header, "sub": f"DAY {day}" if day >= 1 and game == cfg["game_short"] else "TODAY",
          "handle": cfg["channel_handle"], "intro": intro, "items": order, "voice": voice, "outro": outro, "test": data.get("test", False)}
    save(CLIP / "remotion/timeline.json", tl)

    credits = "\n".join(f"#{it['rank']} {it['streamer']}: twitch.tv/{it['login']}" for it in items)
    title = f"Top {n} {game} Moments Today 😳" + (f" (Day {day})" if day >= 1 and game == cfg["game_short"] else "")
    tags = ["gta 6", "gta vi", "gta 6 funny moments", "gta 6 clips", "gta 6 gameplay", "gta 6 fails", "twitch clips", "gaming", "funny moments"]
    if game != cfg["game_short"]:
        tags = [game.lower(), "twitch clips", "gaming", "funny moments"]
    hashtags = "#gta6 #gtavi #gaming #shorts" if game == cfg["game_short"] else "#gaming #twitch #shorts"
    desc = (f"The {n} craziest {game} moments from Twitch today. Which one was the best? 👇\n\n"
            f"Featured streamers (go follow them):\n{credits}\n\n"
            f"Clips are used with the streamers' permission. Want your clip featured or removed? Leave a comment.\n"
            f"New top {n} every day. Follow {cfg['channel_handle']}.\n\n{hashtags}")
    save(WORK / "meta.json", {"title": title[:95], "description": desc, "tags": tags, "credits": credits, "test": data.get("test", False),
                              "clips": [{"id": c["id"], "url": c["url"], "streamer": c["streamer"]} for c in picks]})
    print(f"Tijdlijn klaar: {t:.1f} s, {n} clips")


if __name__ == "__main__":
    main()
