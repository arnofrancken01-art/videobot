"""Zoek de beste GTA 6-clips van de afgelopen uren.
Gebruik: python clipbot/scripts/find.py [--test] [--game "Grand Theft Auto V"] [--channels a,b]
  --test      : negeert de toestemmingslijst (alleen om de techniek te testen; zo'n video wordt nooit gepost)
  --game      : ander spel (bv. om vóór de release te testen met GTA 5)
  --channels  : kanalen om te doorzoeken als er geen Twitch-sleutel is
Schrijft clipbot/work/picks.json en clipbot/work/others.json (populaire streamers zonder toestemming).

Bron 1 (aanbevolen): de officiële Twitch API (TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET).
Bron 2 (reserve, zonder sleutel): de clips-pagina van elk kanaal via yt-dlp.
"""
import argparse, datetime as dt, json, os, re, subprocess
import requests
from common import CLIP, STATE, WORK, load, save, settings, allowlist

HELIX = "https://api.twitch.tv/helix"


def helix_session():
    cid, sec = os.environ.get("TWITCH_CLIENT_ID", "").strip(), os.environ.get("TWITCH_CLIENT_SECRET", "").strip()
    if not (cid and sec):
        return None
    r = requests.post("https://id.twitch.tv/oauth2/token", data={"client_id": cid, "client_secret": sec, "grant_type": "client_credentials"}, timeout=30).json()
    if "access_token" not in r:
        raise SystemExit(f"Twitch-login mislukt: {r}")
    s = requests.Session()
    s.headers.update({"Client-Id": cid, "Authorization": f"Bearer {r['access_token']}"})
    return s


def get(s, path, **params):
    r = s.get(f"{HELIX}/{path}", params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def game_ids(s, names):
    out = {}
    for n in names:
        for g in get(s, "games", name=n).get("data", []):
            out[g["id"]] = g["name"]
    if not out:
        raise SystemExit(f"Spel niet gevonden op Twitch: {names}")
    return out


def clips_helix(s, cfg, test):
    start = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=cfg["lookback_hours"])).strftime("%Y-%m-%dT%H:%M:%SZ")
    games = game_ids(s, cfg["game_names"])
    found = {}
    for gid in games:  # de meest bekeken clips van het hele spel
        cursor = None
        for _ in range(3):
            d = get(s, "clips", game_id=gid, started_at=start, first=100, **({"after": cursor} if cursor else {}))
            for c in d["data"]:
                found[c["id"]] = c
            cursor = d.get("pagination", {}).get("cursor")
            if not cursor:
                break
    allow = allowlist()
    if allow:  # kleinere streamers met toestemming vallen soms buiten de top 300: apart opvragen
        users = get(s, "users", **{"login": list(allow)[:100]}).get("data", [])
        for u in users:
            for c in get(s, "clips", broadcaster_id=u["id"], started_at=start, first=50)["data"]:
                if c.get("game_id") in games:
                    found[c["id"]] = c
    out = []
    for c in found.values():
        out.append({"id": c["id"], "url": c["url"], "title": c["title"].strip(), "views": c["view_count"],
                    "login": c["broadcaster_name"].lower(), "streamer": c["broadcaster_name"], "duration": c["duration"],
                    "language": c.get("language", ""), "created": c["created_at"], "clipper": c.get("creator_name", "")})
    return out


def clips_ytdlp(channels, rng="24hr"):
    out = []
    for ch in channels:
        r = subprocess.run(["yt-dlp", "-J", "--flat-playlist", "--playlist-end", "20", f"https://www.twitch.tv/{ch}/clips?filter=clips&range={rng}"],
                           capture_output=True, text=True, timeout=180)
        if r.returncode:
            print(f"{ch}: {r.stderr.strip()[-200:]}")
            continue
        for e in json.loads(r.stdout).get("entries", []):
            out.append({"id": e.get("id") or e["url"].rstrip("/").split("/")[-1], "url": e["url"], "title": (e.get("title") or "").strip(),
                        "views": e.get("view_count") or 0, "login": ch.lower(), "streamer": e.get("uploader") or ch,
                        "duration": e.get("duration") or 30, "language": "", "created": "", "clipper": ""})
    return out


def main():
    WORK.mkdir(exist_ok=True)
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--game")
    ap.add_argument("--channels", default="")
    a = ap.parse_args()
    cfg = settings()
    if a.game:
        cfg["game_names"] = [a.game]
    allow = allowlist()
    s = helix_session()
    if s:
        clips = clips_helix(s, cfg, a.test)
        source = "twitch-api"
    else:
        chans = [c for c in a.channels.split(",") if c] or list(allow)
        if not chans:
            print("Geen Twitch-sleutel en geen kanalen: zet TWITCH_CLIENT_ID/SECRET of vul config/streamers.json.")
            save(WORK / "others.json", [])
            raise SystemExit(3)
        clips = clips_ytdlp(chans, "7d" if a.test else "24hr")
        source = "yt-dlp"
    used = load(STATE / "used.json", {})
    blocked = re.compile(r"\b(" + "|".join(map(re.escape, cfg["blocked_words"])) + r")\b", re.I)

    def ok(c):
        return (c["id"] not in used and c["views"] >= (0 if source == "yt-dlp" else cfg["min_views"])
                and not blocked.search(c["title"]) and cfg["clip_min_seconds"] <= c["duration"] <= 65
                and (not cfg["languages"] or not c["language"] or c["language"] in cfg["languages"]))

    clips = sorted(filter(ok, clips), key=lambda c: -c["views"])
    allowed = clips if a.test else [c for c in clips if c["login"] in allow]
    picks, per = [], {}
    for c in allowed:
        if per.get(c["login"], 0) >= cfg["max_per_streamer"]:
            continue
        per[c["login"]] = per.get(c["login"], 0) + 1
        picks.append(c)
        if len(picks) == cfg["clips_per_video"]:
            break
    # Populaire streamers zónder toestemming: tip voor Arno om toestemming te vragen
    others = {}
    for c in clips:
        if c["login"] not in allow:
            o = others.setdefault(c["login"], {"streamer": c["streamer"], "views": 0, "clips": 0, "best": c["url"]})
            o["views"] += c["views"]; o["clips"] += 1
    others = sorted(others.values(), key=lambda o: -o["views"])[:10]
    WORK.mkdir(exist_ok=True)
    save(WORK / "picks.json", {"source": source, "test": a.test, "game": cfg["game_names"], "picks": picks})
    save(WORK / "others.json", others)
    print(f"{len(clips)} geschikte clips ({source}), {len(picks)} gekozen:")
    for c in picks:
        print(f"  {c['views']:>7} views  {c['streamer']}: {c['title']}")
    if len(picks) < 3:
        print("Te weinig clips voor een video.")
        raise SystemExit(3)


if __name__ == "__main__":
    main()
