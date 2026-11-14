"""Haalt de cijfers van elke video op en schrijft state/stats.json.
Het brein leest dit bestand en maakt meer van wat werkt.
  python scripts/stats.py
Nodig: YOUTUBE_* secrets (scopes youtube.readonly + yt-analytics.readonly).
"""
import json, sys, time
from datetime import date
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from publish import youtube_token  # noqa: E402

API = "https://www.googleapis.com/youtube/v3"
AN = "https://youtubeanalytics.googleapis.com/v2/reports"


def get(token, url, **params):
    r = requests.get(url, params=params, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"{url}: {r.text[:300]}")
    return r.json()


def main():
    token = youtube_token()
    ch = get(token, f"{API}/channels", part="id,contentDetails,statistics", mine="true")["items"][0]
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]
    ids, page = [], None
    while True:
        r = get(token, f"{API}/playlistItems", part="contentDetails", playlistId=uploads, maxResults=50, **({"pageToken": page} if page else {}))
        ids += [i["contentDetails"]["videoId"] for i in r["items"]]
        page = r.get("nextPageToken")
        if not page:
            break
    queue = json.loads((ROOT / "state/queue.json").read_text())
    by_vid = {v["posts"]["youtube"]["id"]: k for k, v in queue.items() if not k.startswith("_") and "youtube" in v.get("posts", {})}
    analytics = {}
    try:
        rep = get(token, AN, ids="channel==MINE", startDate="2026-11-01", endDate=date.today().isoformat(),
                  metrics="views,engagedViews,averageViewPercentage,averageViewDuration,likes,comments,shares,subscribersGained",
                  dimensions="video", sort="-views", maxResults=200)
        cols = [c["name"] for c in rep["columnHeaders"]]
        for row in rep.get("rows", []):
            analytics[row[0]] = dict(zip(cols[1:], row[1:]))
    except Exception as e:  # noqa: BLE001
        print("analytics mislukt:", e)
    extra = {}
    for key, dims, kw in [("traffic", "insightTrafficSourceType", {}), ("daily", "day", {"sort": "day"}), ("countries", "country", {"sort": "-views", "maxResults": 8})]:
        try:
            rep = get(token, AN, ids="channel==MINE", startDate="2026-11-01", endDate=date.today().isoformat(), metrics="views", dimensions=dims, **kw)
            extra[key] = {r[0]: r[1] for r in rep.get("rows", [])}
        except Exception as e:  # noqa: BLE001
            print(key, "mislukt:", e)
    videos = []
    for i in range(0, len(ids), 50):
        for v in get(token, f"{API}/videos", part="snippet,status,statistics,contentDetails", id=",".join(ids[i:i + 50]))["items"]:
            ep_name = by_vid.get(v["id"])
            ep = json.loads((ROOT / f"episodes/{ep_name}.json").read_text()) if ep_name else {}
            a = analytics.get(v["id"], {})
            videos.append({
                "episode": ep_name, "video_id": v["id"], "title": v["snippet"]["title"], "format": ep.get("format", "countdown" if ep_name else None),
                "privacy": v["status"]["privacyStatus"], "published": v["snippet"]["publishedAt"],
                "views": int(v["statistics"].get("viewCount", 0)), "likes": int(v["statistics"].get("likeCount", 0)),
                "comments": int(v["statistics"].get("commentCount", 0)),
                "engaged_views": a.get("engagedViews"), "avg_view_pct": a.get("averageViewPercentage"),
                "avg_view_sec": a.get("averageViewDuration"), "shares": a.get("shares"), "subs_gained": a.get("subscribersGained"),
            })
    out = {"fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "channel": {"subscribers": int(ch["statistics"].get("subscriberCount", 0)), "views": int(ch["statistics"].get("viewCount", 0)), "videos": int(ch["statistics"].get("videoCount", 0))},
           **extra,
           "videos": sorted(videos, key=lambda x: x["published"])}
    (ROOT / "state/stats.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print(json.dumps(out["channel"]), json.dumps(extra))
    for v in out["videos"]:
        print(v["episode"], v["format"], v["privacy"], v["views"], v["engaged_views"], v["avg_view_pct"], "|", v["title"][:60])


if __name__ == "__main__":
    main()
