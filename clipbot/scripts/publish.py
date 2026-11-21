"""Upload goedgekeurde clipvideo's PRIVÉ naar het nieuwe YouTube-kanaal. Arno zet ze zelf openbaar.
Leest clipbot/state/queue.json; video en metadata staan op de branch clip-renders.
Nodig: YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET (dezelfde Google-app als Money, Mapped)
       en CLIPBOT_YOUTUBE_REFRESH_TOKEN (login met het NIEUWE kanaal).
"""
import json, os, subprocess, time
from pathlib import Path
import requests
from common import ROOT, STATE, load, save, send

Q = STATE / "queue.json"


def from_branch(path):
    subprocess.run(["git", "fetch", "-q", "origin", "clip-renders:refs/remotes/origin/clip-renders"], check=True, cwd=ROOT)
    return subprocess.run(["git", "show", f"origin/clip-renders:{path}"], check=True, capture_output=True, cwd=ROOT).stdout


def token():
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": os.environ["YOUTUBE_CLIENT_ID"].strip(), "client_secret": os.environ["YOUTUBE_CLIENT_SECRET"].strip(),
        "refresh_token": os.environ["CLIPBOT_YOUTUBE_REFRESH_TOKEN"].strip(), "grant_type": "refresh_token"}, timeout=30).json()
    if "access_token" not in r:
        raise RuntimeError(f"YouTube-login: {r}")
    return r["access_token"]


def upload(key):
    meta = json.loads(from_branch(f"clips/{key}.json"))
    video = from_branch(f"clips/{key}.mp4")
    tok = token()
    body = {"snippet": {"title": meta["title"] + " #shorts", "description": meta["description"], "tags": meta["tags"], "categoryId": "20",
                        "defaultLanguage": "en", "defaultAudioLanguage": "en"},
            "status": {"privacyStatus": "private", "selfDeclaredMadeForKids": False, "containsSyntheticMedia": False}}
    init = requests.post("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                         headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json", "X-Upload-Content-Type": "video/mp4"},
                         data=json.dumps(body), timeout=60)
    if init.status_code != 200:
        raise RuntimeError(f"upload starten: {init.text[:300]}")
    up = requests.put(init.headers["Location"], data=video, headers={"Content-Type": "video/mp4"}, timeout=600)
    if up.status_code not in (200, 201):
        raise RuntimeError(f"upload: {up.text[:300]}")
    return up.json()["id"], meta


def main():
    need = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "CLIPBOT_YOUTUBE_REFRESH_TOKEN"]
    queue = load(Q, {})
    for key, item in queue.items():
        if key.startswith("_") or item.get("status") != "approved" or "youtube" in item or len(item.get("errors", [])) >= 3:
            continue
        if not all(os.environ.get(n, "").strip() for n in need):
            send(f"Clip-video {key} is goedgekeurd, maar de YouTube-koppeling van het nieuwe kanaal ontbreekt nog (CLIPBOT_YOUTUBE_REFRESH_TOKEN).")
            item.setdefault("errors", []).append("geen youtube-token")
            continue
        try:
            vid, meta = upload(key)
            item["youtube"] = {"id": vid, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
            send(f"<b>Staat (privé) op YouTube:</b> {meta['title']}\nhttps://youtube.com/shorts/{vid}\n\nBekijk en zet openbaar: https://studio.youtube.com/video/{vid}/edit")
        except Exception as e:  # noqa: BLE001
            item.setdefault("errors", []).append(str(e)[:300])
            send(f"Upload van clip-video {key} mislukt: {e}")
        save(Q, queue)
    save(Q, queue)


if __name__ == "__main__":
    main()
