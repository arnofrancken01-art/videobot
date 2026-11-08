"""Reactieronde voor YouTube.
  python scripts/comments.py fetch   -> state/comments.json: openbare video's van de laatste 3 dagen,
                                        hun reacties en welke nog geen antwoord van het kanaal hebben
  python scripts/comments.py apply   -> plaatst wat in state/replies.json staat en meldt het in Telegram

state/replies.json (geschreven door Claude):
  [{"video_id": "...", "parent_id": null, "text": "vraag als eerste reactie"},
   {"video_id": "...", "parent_id": "<commentThread-id>", "text": "antwoord"}]
Nodig: YOUTUBE_* secrets met scope youtube.force-ssl.
"""
import html, json, re, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from publish import youtube_token  # noqa: E402

API = "https://www.googleapis.com/youtube/v3"
OUT = ROOT / "state/comments.json"
REPLIES = ROOT / "state/replies.json"
LOG = ROOT / "state/comments_log.json"


def get(token, path, **params):
    r = requests.get(f"{API}/{path}", params=params, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"YouTube {path}: {r.text[:300]}")
    return r.json()


def question_for(title):
    """De slotvraag uit de aflevering met dezelfde titel."""
    for p in sorted((ROOT / "episodes").glob("ep*.json")):
        ep = json.loads(p.read_text())
        if title.startswith(ep["title"][:40]):
            out = [s for s in ep["segments"] if s["scene"] == "outro"]
            if out:
                q = re.split(r"(?<=\?)", out[0]["text"])[0].strip()
                return q if q.endswith("?") else None
    return None


def fetch():
    token = youtube_token()
    ch = get(token, "channels", part="id,contentDetails", mine="true")["items"][0]
    me = ch["id"]
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]
    items = get(token, "playlistItems", part="contentDetails", playlistId=uploads, maxResults=25)["items"]
    ids = [i["contentDetails"]["videoId"] for i in items]
    vids = get(token, "videos", part="snippet,status,statistics", id=",".join(ids))["items"] if ids else []
    since = datetime.now(timezone.utc) - timedelta(days=3)
    out = {"channel_id": me, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "videos": []}
    for v in vids:
        if v["status"]["privacyStatus"] != "public":
            continue
        if datetime.fromisoformat(v["snippet"]["publishedAt"].replace("Z", "+00:00")) < since:
            continue
        threads = get(token, "commentThreads", part="snippet,replies", videoId=v["id"], maxResults=100, order="time").get("items", [])
        comments, own_top = [], False
        for t in threads:
            top = t["snippet"]["topLevelComment"]["snippet"]
            if top.get("authorChannelId", {}).get("value") == me:
                own_top = True
                continue
            replies = t.get("replies", {}).get("comments", [])
            answered = any(r["snippet"].get("authorChannelId", {}).get("value") == me for r in replies)
            comments.append({"id": t["id"], "author": top["authorDisplayName"], "text": top["textOriginal"], "answered": answered,
                             "replies": [{"author": r["snippet"]["authorDisplayName"], "text": r["snippet"]["textOriginal"]} for r in replies]})
        out["videos"].append({
            "video_id": v["id"], "title": v["snippet"]["title"], "views": int(v["statistics"].get("viewCount", 0)),
            "question_posted": own_top, "question": question_for(v["snippet"]["title"]), "comments": comments})
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False))
    todo = sum(1 for v in out["videos"] for c in v["comments"] if not c["answered"])
    print(f"{len(out['videos'])} openbare video's, {todo} reacties zonder antwoord")


def apply():
    import telegram
    todo = json.loads(REPLIES.read_text()) if REPLIES.exists() else []
    if not todo:
        print("niets te plaatsen")
        return
    token = youtube_token()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    log = json.loads(LOG.read_text()) if LOG.exists() else []
    done, failed = [], []
    for r in todo:
        text = r["text"].strip()[:1000]
        if r.get("parent_id"):
            res = requests.post(f"{API}/comments?part=snippet", headers=h, timeout=30,
                                json={"snippet": {"parentId": r["parent_id"], "textOriginal": text}})
        else:
            res = requests.post(f"{API}/commentThreads?part=snippet", headers=h, timeout=30,
                                json={"snippet": {"videoId": r["video_id"], "topLevelComment": {"snippet": {"textOriginal": text}}}})
        (done if res.status_code == 200 else failed).append((r, res.text[:200]))
        log.append({**r, "ok": res.status_code == 200, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        time.sleep(1)
    LOG.write_text(json.dumps(log[-500:], indent=1, ensure_ascii=False))
    REPLIES.write_text("[]\n")
    lines = []
    for r, _ in done:
        kind = "Vraag geplaatst (pin hem!)" if not r.get("parent_id") else f"Antwoord aan {r.get('to', 'kijker')}"
        lines.append(f"• {kind}: {html.escape(r['text'][:120])}\nhttps://youtube.com/shorts/{r['video_id']}")
    for r, err in failed:
        lines.append(f"• MISLUKT ({r['video_id']}): {html.escape(err)}")
    telegram.send(f"<b>Reactieronde:</b> {len(done)} geplaatst, {len(failed)} mislukt\n\n" + "\n\n".join(lines))
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    {"fetch": fetch, "apply": apply}[sys.argv[1]]()
