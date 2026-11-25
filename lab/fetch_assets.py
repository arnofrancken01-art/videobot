"""Lab: probeert gratis, commercieel bruikbare bronnen uit en schrijft alles naar out/lab/."""
import io, json, re, subprocess, zipfile
from pathlib import Path
import requests

OUT = Path("out/lab"); OUT.mkdir(parents=True, exist_ok=True)
H = {"User-Agent": "MoneyMappedVideobot/1.0 (educational shorts; contact via GitHub)"}
rep = {}

# 1. Muziek: Kevin MacLeod (CC BY 4.0, naam in de beschrijving)
tracks = ["Monkeys Spinning Monkeys", "Pixel Peeker Polka - faster", "Sneaky Snitch", "Fluffing a Duck", "Investigations",
          "Scheming Weasel faster", "Funkorama", "Cipher", "Local Forecast - Elevator", "Carefree", "Wallpaper", "Hyperfun",
          "Itty Bitty 8 Bit", "Run Amok", "Merry Go", "Quirky Dog", "Life of Riley", "Rollin at 5", "Disco con Tutti", "Galactic Rap"]
(OUT / "music").mkdir(exist_ok=True)
for t in tracks:
    url = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" + requests.utils.quote(t) + ".mp3"
    try:
        r = requests.get(url, headers=H, timeout=60)
        ok = r.status_code == 200 and len(r.content) > 100000
        if ok:
            (OUT / "music" / (re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-") + ".mp3")).write_bytes(r.content)
        rep[f"music:{t}"] = r.status_code if not ok else len(r.content)
    except Exception as e:  # noqa: BLE001
        rep[f"music:{t}"] = str(e)[:80]

# 2. Geluidseffecten: Kenney (CC0)
(OUT / "sfx").mkdir(exist_ok=True)
for pack in ["interface-sounds", "impact-sounds", "ui-audio", "digital-audio", "casino-audio"]:
    try:
        page = requests.get(f"https://kenney.nl/assets/{pack}", headers=H, timeout=30).text
        m = re.search(r'href="([^"]+\.zip)"', page)
        if not m:
            rep[f"sfx:{pack}"] = "geen zip-link"; continue
        z = requests.get(m.group(1) if m.group(1).startswith("http") else "https://kenney.nl" + m.group(1), headers=H, timeout=60)
        zf = zipfile.ZipFile(io.BytesIO(z.content))
        n = 0
        for name in zf.namelist():
            if name.lower().endswith(".ogg"):
                (OUT / "sfx" / f"{pack}__{Path(name).name}").write_bytes(zf.read(name)); n += 1
        rep[f"sfx:{pack}"] = n
    except Exception as e:  # noqa: BLE001
        rep[f"sfx:{pack}"] = str(e)[:80]

# 3. Foto's: hoofdfoto van een Wikipedia-artikel, met licentie
(OUT / "img").mkdir(exist_ok=True)
for title in ["Shibuya Crossing", "Burj Khalifa", "Taj Mahal", "Monaco", "Big Mac", "Lahore", "Indian rupee", "Vending machine"]:
    try:
        q = requests.get("https://en.wikipedia.org/w/api.php", headers=H, timeout=30, params={
            "action": "query", "format": "json", "titles": title, "prop": "pageimages", "piprop": "original", "redirects": 1}).json()
        pg = next(iter(q["query"]["pages"].values()))
        src = pg.get("original", {}).get("source")
        if not src:
            rep[f"img:{title}"] = "geen foto"; continue
        fname = "File:" + requests.utils.unquote(src.split("/")[-1])
        meta = requests.get("https://commons.wikimedia.org/w/api.php", headers=H, timeout=30, params={
            "action": "query", "format": "json", "titles": fname, "prop": "imageinfo", "iiprop": "extmetadata|url", "iiurlwidth": 1080}).json()
        ii = next(iter(meta["query"]["pages"].values())).get("imageinfo", [{}])[0]
        em = ii.get("extmetadata", {})
        lic = em.get("LicenseShortName", {}).get("value", "?")
        artist = re.sub("<[^>]+>", "", em.get("Artist", {}).get("value", "?"))[:60]
        img = requests.get(ii.get("thumburl") or src, headers=H, timeout=60).content
        (OUT / "img" / (re.sub(r"[^a-z0-9]+", "-", title.lower()) + ".jpg")).write_bytes(img)
        rep[f"img:{title}"] = f"{lic} | {artist}"
    except Exception as e:  # noqa: BLE001
        rep[f"img:{title}"] = str(e)[:80]
(OUT / "report.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False))
print(json.dumps(rep, indent=1, ensure_ascii=False))
