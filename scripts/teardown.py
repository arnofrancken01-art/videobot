"""Ontleedt de allerbeste Shorts, in en buiten onze niche: metadata, beelden op vaste momenten en de gesproken tekst.
Draait in GitHub Actions (YouTube is daar bereikbaar) en schrijft naar research/ op de branch `research`.
  python scripts/teardown.py
"""
import json, re, subprocess, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from publish import youtube_token  # noqa: E402

API = "https://www.googleapis.com/youtube/v3"
OUT = ROOT / "research"
NICHE = ["country comparison", "india vs pakistan", "guess the country", "you are rich in this country", "richest countries",
         "countries ranked", "salary in different countries", "currency comparison", "population comparison", "flag quiz"]
OUTSIDE = ["facts you didn't know", "quiz can you guess", "would you rather", "money facts", "how much does it cost",
           "which one is bigger", "comparison size", "true or false", "price in different countries", "rich vs poor"]
TIMES = [0, 0.5, 1.0, 2.0, 3.0, 5.0, 8.0]


def get(token, path, **params):
    r = requests.get(f"{API}/{path}", params=params, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    r.raise_for_status()
    return r.json()


def secs(iso):
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    return sum(int(x or 0) * k for x, k in zip(m.groups(), (3600, 60, 1))) if m else 999


def collect(token, queries, group, after):
    ids = {}
    for q in queries:
        try:
            r = get(token, "search", part="id", q=q + " #shorts", type="video", videoDuration="short", order="viewCount",
                    publishedAfter=after, relevanceLanguage="en", maxResults=15)
            for it in r["items"]:
                ids.setdefault(it["id"]["videoId"], q)
        except Exception as e:  # noqa: BLE001
            print("zoeken mislukt", q, e)
    vids = []
    idl = list(ids)
    for i in range(0, len(idl), 50):
        for v in get(token, "videos", part="snippet,statistics,contentDetails", id=",".join(idl[i:i + 50]))["items"]:
            d = secs(v["contentDetails"]["duration"])
            if d > 180:
                continue
            st = v["statistics"]
            vids.append({"id": v["id"], "group": group, "query": ids[v["id"]], "title": v["snippet"]["title"],
                         "channel": v["snippet"]["channelTitle"], "channel_id": v["snippet"]["channelId"],
                         "published": v["snippet"]["publishedAt"][:10], "duration": d,
                         "views": int(st.get("viewCount", 0)), "likes": int(st.get("likeCount", 0)),
                         "comments": int(st.get("commentCount", 0)),
                         "description": v["snippet"].get("description", "")[:400], "tags": v["snippet"].get("tags", [])[:15]})
    chans = list({v["channel_id"] for v in vids})
    subs = {}
    for i in range(0, len(chans), 50):
        for c in get(token, "channels", part="statistics", id=",".join(chans[i:i + 50]))["items"]:
            subs[c["id"]] = int(c["statistics"].get("subscriberCount", 0))
    for v in vids:
        v["subs"] = subs.get(v["channel_id"], 0)
        v["views_per_sub"] = round(v["views"] / max(v["subs"], 1000), 1)
    return vids


def frames(v):
    d = OUT / v["id"]
    d.mkdir(parents=True, exist_ok=True)
    url = f"https://www.youtube.com/shorts/{v['id']}"
    r = subprocess.run(["yt-dlp", "-q", "-f", "worst[height>=360]/worst", "-o", str(d / "v.%(ext)s"), "--write-auto-subs",
                        "--sub-langs", "en.*,en", "--sub-format", "vtt", "--no-playlist", url], capture_output=True, text=True, timeout=180)
    files = [f for f in d.glob("v.*") if f.suffix not in (".vtt",)]
    if not files:
        v["download_error"] = (r.stderr or "")[-200:]
        return
    src = files[0]
    for t in TIMES + [max(v["duration"] - 1.5, 0)]:
        if t < v["duration"]:
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(t), "-i", str(src), "-frames:v", "1",
                            "-vf", "scale=270:-2", str(d / f"t{t:05.1f}.jpg")], timeout=60)
    vtt = next(d.glob("*.vtt"), None)
    if vtt:
        lines, seen = [], set()
        for line in vtt.read_text(errors="ignore").splitlines():
            line = re.sub(r"<[^>]+>", "", line).strip()
            if line and "-->" not in line and not line.startswith(("WEBVTT", "Kind:", "Language:")) and line not in seen:
                seen.add(line); lines.append(line)
        v["transcript"] = " ".join(lines)[:1500]
        vtt.unlink()
    src.unlink()


def main():
    from datetime import datetime, timedelta, timezone
    token = youtube_token()
    after = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    vids = collect(token, NICHE, "niche", after) + collect(token, OUTSIDE, "outside", after)
    seen, uniq = set(), []
    for v in sorted(vids, key=lambda x: -x["views"]):
        if v["id"] not in seen:
            seen.add(v["id"]); uniq.append(v)
    OUT.mkdir(exist_ok=True)
    pick = []
    for g in ("niche", "outside"):
        gs = [v for v in uniq if v["group"] == g]
        top = gs[:14]
        outl = [v for v in sorted(gs, key=lambda x: -x["views_per_sub"]) if v not in top][:6]
        pick += top + outl
    for v in pick:
        try:
            frames(v)
        except Exception as e:  # noqa: BLE001
            v["download_error"] = str(e)[:200]
        print(v["group"], v["views"], v["subs"], v["duration"], "ok" if "download_error" not in v else "X", v["title"][:70])
    (OUT / "videos.json").write_text(json.dumps({"picked": pick, "all": uniq[:200]}, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
