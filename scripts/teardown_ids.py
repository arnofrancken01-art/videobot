"""Tweede stap van de ontleding: voor gekozen video's (env IDS) de automatische beelden op 25/50/75% en de omslag,
plus de gesproken tekst als die op te halen is. Schrijft research/ids/<id>/."""
import json, os, sys
from pathlib import Path
import requests

OUT = Path(__file__).resolve().parent.parent / "research" / "ids"
ids = os.environ["IDS"].split()
res = {}
for vid in ids:
    d = OUT / vid
    d.mkdir(parents=True, exist_ok=True)
    got = []
    for name in ("oar2", "hq1", "hq2", "hq3", "maxresdefault", "hqdefault"):
        r = requests.get(f"https://i.ytimg.com/vi/{vid}/{name}.jpg", timeout=20)
        if r.status_code == 200 and len(r.content) > 2000:
            (d / f"{name}.jpg").write_bytes(r.content); got.append(name)
    tr = None
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        t = YouTubeTranscriptApi().fetch(vid, languages=["en", "hi", "en-US"])
        tr = [{"t": round(s.start, 1), "text": s.text} for s in t]
    except Exception as e:  # noqa: BLE001
        tr = f"geen tekst: {type(e).__name__}"
    res[vid] = {"images": got, "transcript": tr}
    print(vid, got, "tekst" if isinstance(tr, list) else tr)
(OUT / "ids.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
