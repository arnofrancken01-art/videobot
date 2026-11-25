"""Haalt de foto's voor scene `photo` op en zet de bronvermelding in src/timeline.json.
Per segment: props.image = {"wiki": "Artikeltitel"} (hoofdfoto van dat Wikipedia-artikel) of {"file": "File:Naam.jpg"} (Wikimedia Commons).
Alleen vrije licenties (publiek domein, CC0, CC BY, CC BY-SA). Lukt een foto niet, dan valt die weg en blijft de scene staan.
  python scripts/fetch_images.py            (na tts.py, voor de render)
"""
import json, re, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
H = {"User-Agent": "MoneyMappedVideobot/1.0 (https://github.com/arnofrancken01-art/videobot)"}
FREE = re.compile(r"^(public domain|pd|cc0|cc[ -]by([ -]sa)?([ -]\d\.\d)?|cc[ -]by[ -]\d\.\d|attribution)", re.I)


def slug(s):
    s = re.sub(r"^file:", "", s.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:80]


def commons_info(fname):
    r = requests.get("https://commons.wikimedia.org/w/api.php", headers=H, timeout=30, params={
        "action": "query", "format": "json", "titles": fname, "prop": "imageinfo", "iiprop": "extmetadata|url|size|mime", "iiurlwidth": 1600}).json()
    ii = next(iter(r["query"]["pages"].values())).get("imageinfo", [None])[0]
    if not ii:
        return None
    em = ii.get("extmetadata", {})
    lic = em.get("LicenseShortName", {}).get("value", "")
    if em.get("NonFree", {}).get("value") or not FREE.match(lic.strip()) or "svg" in ii.get("mime", ""):
        return None
    artist = re.sub(r"<[^>]+>", "", em.get("Artist", {}).get("value", "unknown")).strip()[:80]
    return {"url": ii.get("thumburl") or ii["url"], "license": lic, "artist": artist, "page": ii.get("descriptionurl", "")}


def lead_image(title):
    r = requests.get("https://en.wikipedia.org/w/api.php", headers=H, timeout=30, params={
        "action": "query", "format": "json", "titles": title, "prop": "pageimages|images", "piprop": "original", "imlimit": 30, "redirects": 1}).json()
    pg = next(iter(r["query"]["pages"].values()))
    names = []
    if pg.get("original", {}).get("source"):
        names.append("File:" + requests.utils.unquote(pg["original"]["source"].split("/")[-1]).replace("_", " "))
    names += [i["title"] for i in pg.get("images", []) if re.search(r"\.(jpe?g|png|webp)$", i["title"], re.I)]
    for n in names[:12]:
        info = commons_info(n)
        if info:
            return n, info
    return None, None


def main():
    tl_path = ROOT / "src/timeline.json"
    tl = json.loads(tl_path.read_text())
    out = ROOT / "public/img"; out.mkdir(parents=True, exist_ok=True)
    credits, seen = [], {}
    for s in tl["segments"]:
        im = (s.get("props") or {}).get("image")
        if not im:
            continue
        key = im.get("wiki") or im.get("file") or ""
        if key in seen:
            continue
        name, info = None, None
        try:
            if im.get("file"):
                name, info = im["file"], commons_info(im["file"])
            if not info and im.get("wiki"):
                name, info = lead_image(im["wiki"])
            if info:
                img = requests.get(info["url"], headers=H, timeout=60)
                img.raise_for_status()
                (out / f"{slug(key)}.jpg").write_bytes(img.content)
                credits.append(f"{name.replace('File:', '')} by {info['artist']} ({info['license']}), via Wikimedia Commons")
                seen[key] = True
                print("foto:", key, "->", name, info["license"])
                continue
        except Exception as e:  # noqa: BLE001
            print("foto mislukt:", key, e)
        seen[key] = False
        print("geen vrije foto voor", key)
    for s in tl["segments"]:
        im = (s.get("props") or {}).get("image")
        if im and not seen.get(im.get("wiki") or im.get("file") or ""):
            s["props"]["image"] = None
    tl["credits"] = credits
    tl_path.write_text(json.dumps(tl, indent=1))
    bad = [k for k, v in seen.items() if not v]
    if seen and len(bad) == len(seen):
        sys.exit("geen enkele foto gevonden")


if __name__ == "__main__":
    main()
