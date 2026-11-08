"""Post goedgekeurde video's naar Instagram en YouTube.
Leest state/queue.json (status "approved"), post naar elk platform waarvoor een
token bestaat, en bewaart de resultaten. Platformen zonder token worden overgeslagen.
Gebruik: python scripts/publish.py
"""
import json, os, subprocess, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import telegram  # noqa: E402

REPO = os.environ.get("GITHUB_REPOSITORY", "arnofrancken01-art/videobot")
Q_PATH = ROOT / "state/queue.json"
IG_API = "https://graph.instagram.com/v23.0"


def caption(ep):
    tags = " ".join("#" + t for t in ep.get("hashtags", ["money", "economy", "data", "dataviz"]))
    return f"{ep['title']}\n\nSource: {ep['source'].split(',')[0]}\n\n{tags}"


def video_url(name):
    return f"https://raw.githubusercontent.com/{REPO}/renders/renders/{name}.mp4"


def instagram(name, ep):
    token = os.environ["INSTAGRAM_ACCESS_TOKEN"].strip()
    r = requests.post(f"{IG_API}/me/media", data={
        "media_type": "REELS", "video_url": video_url(name), "caption": caption(ep),
        "share_to_feed": "true", "access_token": token}, timeout=60).json()
    if "id" not in r:
        raise RuntimeError(f"Instagram: {r.get('error', r)}")
    cid = r["id"]
    for _ in range(60):  # Instagram verwerkt de video, max ca. 10 minuten
        st = requests.get(f"{IG_API}/{cid}", params={"fields": "status_code,status", "access_token": token}, timeout=30).json()
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") == "ERROR":
            raise RuntimeError(f"Instagram verwerking mislukt: {st.get('status')}")
        time.sleep(10)
    pub = requests.post(f"{IG_API}/me/media_publish", data={"creation_id": cid, "access_token": token}, timeout=60).json()
    if "id" not in pub:
        raise RuntimeError(f"Instagram publiceren: {pub.get('error', pub)}")
    link = requests.get(f"{IG_API}/{pub['id']}", params={"fields": "permalink", "access_token": token}, timeout=30).json().get("permalink", "")
    return {"id": pub["id"], "url": link}


def youtube_token():
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": os.environ["YOUTUBE_CLIENT_ID"].strip(),
        "client_secret": os.environ["YOUTUBE_CLIENT_SECRET"].strip(),
        "refresh_token": os.environ["YOUTUBE_REFRESH_TOKEN"].strip(),
        "grant_type": "refresh_token"}, timeout=30).json()
    if "access_token" not in r:
        raise RuntimeError(f"YouTube-login: {r}")
    return r["access_token"]


def youtube(name, ep, privacy="public"):
    path = Path(f"/tmp/{name}.mp4")
    if not path.exists():
        subprocess.run(["git", "fetch", "-q", "origin", "renders:refs/remotes/origin/renders"], check=True, cwd=ROOT)
        path.write_bytes(subprocess.run(["git", "show", f"origin/renders:renders/{name}.mp4"], check=True, capture_output=True, cwd=ROOT).stdout)
    token = youtube_token()
    meta = {
        "snippet": {"title": ep["title"][:95] + " #Shorts", "description": caption(ep), "categoryId": "27", "tags": ep.get("hashtags", [])},
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False, "containsSyntheticMedia": False},
    }
    init = requests.post(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "X-Upload-Content-Type": "video/mp4"},
        data=json.dumps(meta), timeout=60)
    if init.status_code != 200:
        raise RuntimeError(f"YouTube upload starten: {init.text[:300]}")
    up = requests.put(init.headers["Location"], data=path.read_bytes(), headers={"Content-Type": "video/mp4"}, timeout=600)
    if up.status_code not in (200, 201):
        raise RuntimeError(f"YouTube upload: {up.text[:300]}")
    vid = up.json()["id"]
    return {"id": vid, "url": f"https://youtube.com/shorts/{vid}", "privacy": up.json()["status"]["privacyStatus"]}


PLATFORMS = {
    "instagram": (instagram, ["INSTAGRAM_ACCESS_TOKEN"]),
    "youtube": (youtube, ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"]),
}


def main():
    queue = json.loads(Q_PATH.read_text()) if Q_PATH.exists() else {}
    for name, item in queue.items():
        if name.startswith("_") or item.get("status") != "approved":
            continue
        ep = json.loads((ROOT / f"episodes/{name}.json").read_text())
        posts = item.setdefault("posts", {})
        for platform, (fn, needs) in PLATFORMS.items():
            if platform in posts or not all(os.environ.get(n, "").strip() for n in needs):
                continue
            if sum(e.startswith(platform) for e in item.get("errors", [])) >= 3:
                continue  # na 3 mislukte pogingen niet blijven proberen
            try:
                posts[platform] = {**fn(name, ep), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
                note = " (privé tot de YouTube-audit rond is)" if posts[platform].get("privacy") == "private" else ""
                telegram.send(f"Gepost op {platform}{note}: {posts[platform]['url']}")
            except Exception as e:  # één platform mag de andere niet blokkeren
                item.setdefault("errors", []).append(f"{platform}: {e}")
                telegram.send(f"Posten van {name} op {platform} mislukt: {e}")
        Q_PATH.write_text(json.dumps(queue, indent=1))


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "test-youtube":
        # Testupload: altijd privé, raakt de wachtrij niet aan.
        n = sys.argv[2]
        res = youtube(n, json.loads((ROOT / f"episodes/{n}.json").read_text()), privacy="private")
        print(res)
        telegram.send(f"YouTube-test gelukt (privé): {res['url']}")
    else:
        main()
