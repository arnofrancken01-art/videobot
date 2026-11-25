"""Post goedgekeurde video's naar Instagram en YouTube.
Leest state/queue.json (status "approved"), post naar elk platform waarvoor een
token bestaat, en bewaart de resultaten. Platformen zonder token worden overgeslagen.
Gebruik: python scripts/publish.py
"""
import json, os, re, subprocess, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import telegram  # noqa: E402

REPO = os.environ.get("GITHUB_REPOSITORY", "arnofrancken01-art/videobot")
Q_PATH = ROOT / "state/queue.json"
IG_API = "https://graph.instagram.com/v23.0"


DEFAULT_TAGS = ["money", "economy", "finance", "data", "countries", "top 5", "world", "dataviz", "facts"]


def hashtags(ep):
    """3 tot 5 hashtags: de eerste drie toont YouTube boven de titel. Altijd #shorts erbij."""
    tags = []
    for t in ep.get("hashtags", []) + ["money", "shorts"]:
        t = re.sub(r"[^a-z0-9]", "", t.lower())
        if t and t not in tags:
            tags.append(t)
    if "shorts" in tags[5:]:
        tags = tags[:4] + ["shorts"]
    return ["#" + t for t in tags[:5]]


def caption(ep):
    hook = ep.get("description") or ep["title"]
    return (f"{hook}\n\n"
            f"Source: {ep['source']}\n"
            f"Subscribe for a new country battle every day.\n\n"
            f"{' '.join(hashtags(ep))}")


def credits(name, ep):
    """Naamsvermelding voor muziek (CC BY) en foto's, uit de timeline op de renders-branch."""
    lines = []
    try:
        tl = json.loads(subprocess.run(["git", "show", f"origin/renders:renders/{name}.timeline.json"], check=True, capture_output=True, cwd=ROOT).stdout)
    except Exception:  # noqa: BLE001
        tl = {}
    tracks = json.loads((ROOT / "src/music.json").read_text())
    m = tl.get("music") or ep.get("music")
    if not (isinstance(m, str) and any(t["file"] == m for t in tracks)):
        n = int(re.sub(r"\D", "", str(ep.get("id", name))) or 0)
        m = tracks[n % len(tracks)]["file"]
    title = next(t["title"] for t in tracks if t["file"] == m)
    lines.append(f'Music: "{title}" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0')
    for c in tl.get("credits", []):
        lines.append("Photo: " + c)
    return "\n".join(lines)


def ep_path(name):
    """Korte video's staan in episodes/, lange in long/."""
    p = ROOT / f"episodes/{name}.json"
    return p if p.exists() else ROOT / f"long/{name}.json"


def chapters(name):
    """Hoofdstukken met tijdstip voor de beschrijving van een lange video (YouTube maakt er klikbare hoofdstukken van)."""
    try:
        tl = json.loads(subprocess.run(["git", "show", f"origin/renders:renders/{name}.timeline.json"], check=True, capture_output=True, cwd=ROOT).stdout)
    except Exception:  # noqa: BLE001
        return ""
    rows = [(0, "Intro")] + [(int(s["start"]), re.sub(r"\*", "", s["props"]["chapter"])) for s in tl["segments"] if s.get("props", {}).get("chapter") and s["start"] >= 10]
    return "\n".join(f"{t // 60}:{t % 60:02d} {label}" for t, label in rows) if len(rows) >= 3 else ""


def yt_title(ep):
    t = ep.get("yt_title") or ep["title"]
    if ep.get("long"):
        return t[:100]
    return (t if len(t) <= 90 else t[:87].rsplit(" ", 1)[0] + "...") + " #shorts"


def yt_tags(ep):
    out = []
    for t in ep.get("tags", []) + ep.get("hashtags", []) + DEFAULT_TAGS:
        if t.lower() not in out and sum(len(x) + 1 for x in out) + len(t) < 450:
            out.append(t.lower())
    return out


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


def add_subtitles(token, vid, name, ep):
    """Echte ondertitels (Engels) bij de video: YouTube kan ze automatisch vertalen (Hindi, Spaans...) en doorzoekt de tekst."""
    tl = json.loads(subprocess.run(["git", "show", f"origin/renders:renders/{name}.timeline.json"], check=True, capture_output=True, cwd=ROOT).stdout)
    stamp = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(t * 1000 % 1000):03d}"
    srt = "\n".join(f"{i + 1}\n{stamp(s['start'])} --> {stamp(s['end'])}\n{s['text']}\n" for i, s in enumerate(tl["segments"]))
    meta = json.dumps({"snippet": {"videoId": vid, "language": "en", "name": "", "isDraft": False}})
    body = (f"--cut\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n"
            f"--cut\r\nContent-Type: application/octet-stream\r\n\r\n{srt}\r\n--cut--").encode()
    r = requests.post("https://www.googleapis.com/upload/youtube/v3/captions?uploadType=multipart&part=snippet",
                      headers={"Authorization": f"Bearer {token}", "Content-Type": "multipart/related; boundary=cut"}, data=body, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(r.text[:200])


def series_of(ep):
    """Afspeellijst waar de video in hoort: wie er één bekijkt, krijgt de volgende van dezelfde reeks."""
    title = ep["title"].lower()
    if ep.get("long"):
        return "Country battles: the long versions", "Full country comparisons with real World Bank data."
    if "india" in title:
        return "India vs the World 🇮🇳", "India against every big country, with real data. Who wins?"
    if ep.get("format") in ("quiz", "choice", "truefalse", "clues"):
        return "Guess the country 🌍", "Can you beat the quiz? Real data, surprising answers."
    if " vs " in title or ep.get("format") in ("battle", "race"):
        return "Country vs Country ⚔️", "Two countries, real numbers, one winner."
    return "This country... 💰", "One shocking number. Which country is it?"


def add_to_playlist(token, vid, name, ep):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    title, desc = series_of(ep)
    mine = requests.get("https://www.googleapis.com/youtube/v3/playlists", params={"part": "snippet", "mine": "true", "maxResults": 50}, headers=h, timeout=30).json()
    pid = next((p["id"] for p in mine.get("items", []) if p["snippet"]["title"] == title), None)
    if not pid:
        r = requests.post("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", headers=h, timeout=30,
                          data=json.dumps({"snippet": {"title": title, "description": desc}, "status": {"privacyStatus": "public"}}))
        if r.status_code != 200:
            raise RuntimeError(r.text[:200])
        pid = r.json()["id"]
    r = requests.post("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", headers=h, timeout=30,
                      data=json.dumps({"snippet": {"playlistId": pid, "resourceId": {"kind": "youtube#video", "videoId": vid}}}))
    if r.status_code != 200:
        raise RuntimeError(r.text[:200])


def youtube(name, ep, privacy="private"):  # privé: Arno kijkt na en zet zelf openbaar
    path = Path(f"/tmp/{name}.mp4")
    if not path.exists():
        subprocess.run(["git", "fetch", "-q", "origin", "renders:refs/remotes/origin/renders"], check=True, cwd=ROOT)
        path.write_bytes(subprocess.run(["git", "show", f"origin/renders:renders/{name}.mp4"], check=True, capture_output=True, cwd=ROOT).stdout)
    token = youtube_token()
    desc = caption(ep)
    try:
        subprocess.run(["git", "fetch", "-q", "origin", "renders:refs/remotes/origin/renders"], cwd=ROOT)
        cr = credits(name, ep)
        desc = desc.replace("\n\n#", f"\n{cr}\n\n#", 1) if "\n\n#" in desc else f"{desc}\n\n{cr}"
    except Exception as e:  # noqa: BLE001
        print("naamsvermelding mislukt:", e)
    if ep.get("long"):
        ch = chapters(name)
        desc = (f"{ep.get('description') or ep['title']}\n\n" + (ch + "\n\n" if ch else "") +
                f"Source: {ep['source']}\nSubscribe for a new country battle every day.\n\n{' '.join(h for h in hashtags(ep) if h != '#shorts')}")
        try:
            desc += "\n\n" + credits(name, ep)
        except Exception as e:  # noqa: BLE001
            print("naamsvermelding mislukt:", e)
    meta = {
        "snippet": {"title": yt_title(ep), "description": desc, "categoryId": "27", "tags": yt_tags(ep),
                    "defaultLanguage": "en", "defaultAudioLanguage": "en"},
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False, "containsSyntheticMedia": False},
    }
    # Vertaalde titel en beschrijving (bv. Hindi): kijkers met die taal zien de video in hun eigen taal in de feed.
    loc = {lang: {"title": (v["title"][:90] + ("" if ep.get("long") else " #shorts")), "description": f"{v.get('description', '')}\n\n{' '.join(hashtags(ep))}"[:4900]}
           for lang, v in (ep.get("localizations") or {}).items() if isinstance(v, dict) and v.get("title")}

    def start(body, parts):
        return requests.post(
            f"https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part={parts}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "X-Upload-Content-Type": "video/mp4"},
            data=json.dumps(body), timeout=60)

    init = start({**meta, "localizations": loc}, "snippet,status,localizations") if loc else start(meta, "snippet,status")
    if init.status_code != 200 and loc:  # vertaling geweigerd: liever zonder vertaling dan geen video
        print(f"vertalingen geweigerd, opnieuw zonder: {init.text[:200]}")
        init = start(meta, "snippet,status")
    if init.status_code != 200:
        raise RuntimeError(f"YouTube upload starten: {init.text[:300]}")
    up = requests.put(init.headers["Location"], data=path.read_bytes(), headers={"Content-Type": "video/mp4"}, timeout=600)
    if up.status_code not in (200, 201):
        raise RuntimeError(f"YouTube upload: {up.text[:300]}")
    vid = up.json()["id"]
    for extra in (add_subtitles, add_to_playlist):  # extraatjes: een fout hier mag de upload nooit breken
        try:
            extra(token, vid, name, ep)
        except Exception as e:  # noqa: BLE001
            print(f"{extra.__name__} mislukt: {e}")
    return {"id": vid, "url": f"https://youtube.com/{'watch?v=' if ep.get('long') else 'shorts/'}{vid}", "privacy": up.json()["status"]["privacyStatus"]}


PLATFORMS = {
    "instagram": (instagram, ["INSTAGRAM_ACCESS_TOKEN"]),
    "youtube": (youtube, ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"]),
}


def main():
    queue = json.loads(Q_PATH.read_text()) if Q_PATH.exists() else {}
    for name, item in queue.items():
        if name.startswith("_") or item.get("status") != "approved":
            continue
        ep = json.loads(ep_path(name).read_text())
        posts = item.setdefault("posts", {})
        for platform, (fn, needs) in PLATFORMS.items():
            if platform in posts or not all(os.environ.get(n, "").strip() for n in needs):
                continue
            if sum(e.startswith(platform) for e in item.get("errors", [])) >= 3:
                continue  # na 3 mislukte pogingen niet blijven proberen
            try:
                posts[platform] = {**fn(name, ep), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
                if platform == "youtube":
                    vid = posts[platform]["id"]
                    telegram.send(f"<b>Staat (privé) op YouTube:</b> {ep['title']}\n{posts[platform]['url']}\n\nBekijk en zet openbaar in YouTube Studio: https://studio.youtube.com/video/{vid}/edit")
                else:
                    telegram.send(f"Gepost op {platform}: {posts[platform]['url']}")
            except Exception as e:  # één platform mag de andere niet blokkeren
                item.setdefault("errors", []).append(f"{platform}: {e}")
                telegram.send(f"Posten van {name} op {platform} mislukt: {e}")
        Q_PATH.write_text(json.dumps(queue, indent=1))


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "test-youtube":
        # Testupload: altijd privé, raakt de wachtrij niet aan.
        n = sys.argv[2]
        res = youtube(n, json.loads(ep_path(n).read_text()), privacy="private")
        print(res)
        telegram.send(f"YouTube-test gelukt (privé): {res['url']}\nStudio: https://studio.youtube.com/video/{res['id']}/edit")
    else:
        main()
