"""Zoekt de best scorende recente Shorts in onze niche en schrijft state/trends.json.
Het brein leert daaruit welke onderwerpen en hooks NU werken (niet kopieren, wel het patroon).
  python scripts/trends.py
"""
import json, re, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from publish import youtube_token  # noqa: E402

API = "https://www.googleapis.com/youtube/v3"
QUERIES = ["country comparison", "richest countries", "cost of living by country", "guess the country", "salary by country",
           "economy explained", "geography facts", "money facts", "countries ranked", "world data"]


def get(token, path, **params):
    r = requests.get(f"{API}/{path}", params=params, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"{path}: {r.text[:300]}")
    return r.json()


def seconds(iso):
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    return sum(int(x or 0) * k for x, k in zip(m.groups(), (3600, 60, 1))) if m else 999


def main():
    token = youtube_token()
    after = (datetime.now(timezone.utc) - timedelta(days=21)).strftime("%Y-%m-%dT%H:%M:%SZ")
    found = {}
    for q in QUERIES:
        try:
            r = get(token, "search", part="id", q=q + " #shorts", type="video", videoDuration="short", order="viewCount",
                    publishedAfter=after, relevanceLanguage="en", maxResults=20)
        except Exception as e:  # noqa: BLE001
            print("zoeken mislukt:", q, e)
            continue
        for it in r.get("items", []):
            found.setdefault(it["id"]["videoId"], q)
    ids = list(found)
    vids = []
    for i in range(0, len(ids), 50):
        vids += get(token, "videos", part="snippet,statistics,contentDetails", id=",".join(ids[i:i + 50]))["items"]
    vids = [v for v in vids if seconds(v["contentDetails"]["duration"]) <= 65]
    chans = {}
    cids = list({v["snippet"]["channelId"] for v in vids})
    for i in range(0, len(cids), 50):
        for c in get(token, "channels", part="statistics", id=",".join(cids[i:i + 50]))["items"]:
            chans[c["id"]] = int(c["statistics"].get("subscriberCount", 0) or 0)
    out = []
    for v in vids:
        views = int(v["statistics"].get("viewCount", 0))
        subs = chans.get(v["snippet"]["channelId"], 0)
        days = max(1, (datetime.now(timezone.utc) - datetime.fromisoformat(v["snippet"]["publishedAt"].replace("Z", "+00:00"))).days)
        out.append({"title": v["snippet"]["title"], "channel": v["snippet"]["channelTitle"], "views": views, "channel_subs": subs,
                    # uitschieter: veel meer views dan het kanaal abonnees heeft = het ONDERWERP trekt, niet de naam
                    "outlier": round(views / max(subs, 1000), 1), "views_per_day": views // days, "seconds": seconds(v["contentDetails"]["duration"]),
                    "likes": int(v["statistics"].get("likeCount", 0)), "comments": int(v["statistics"].get("commentCount", 0)),
                    "query": found[v["id"]], "url": f"https://youtube.com/shorts/{v['id']}"})
    out.sort(key=lambda x: -x["views_per_day"])
    res = {"fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "top": out[:40],
           "outliers_small_channels": sorted([o for o in out if o["channel_subs"] < 50000 and o["views"] > 50000], key=lambda x: -x["outlier"])[:20]}
    (ROOT / "state/trends.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
    for o in res["top"][:25]:
        print(o["views"], o["channel_subs"], o["seconds"], "|", o["title"][:80])
    print("--- kleine kanalen")
    for o in res["outliers_small_channels"][:15]:
        print(o["views"], o["channel_subs"], "|", o["title"][:80])


if __name__ == "__main__":
    main()
