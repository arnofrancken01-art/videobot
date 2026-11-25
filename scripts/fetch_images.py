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


def api(url, params):
    """Wikimedia-API met herkansing: bij 429 of een fout even wachten."""
    import time
    for i in range(4):
        r = requests.get(url, headers=H, timeout=30, params={**params, "maxlag": 5})
        if r.status_code == 200 and r.headers.get("content-type", "").startswith("application/json"):
            return r.json()
        print("wikimedia", r.status_code, r.text[:120].replace("\n", " "))
        time.sleep(2 + 3 * i)
    raise RuntimeError(f"wikimedia antwoordt niet: {url}")


def slug(s):
    s = re.sub(r"^file:", "", s.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:80]


def commons_info(fname):
    r = api("https://commons.wikimedia.org/w/api.php", {
        "action": "query", "format": "json", "titles": fname, "prop": "imageinfo", "iiprop": "extmetadata|url|size|mime", "iiurlwidth": 1600})
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
    r = api("https://en.wikipedia.org/w/api.php", {
        "action": "query", "format": "json", "titles": title, "prop": "pageimages|images", "piprop": "original", "imlimit": 30, "redirects": 1})
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


def verify_facts(tl):
    """Elk weetje met props.source = {wiki, check} moet in dat Wikipedia-artikel staan (alle check-woorden in één zin)."""
    bad = []
    for s in tl["segments"]:
        src = (s.get("props") or {}).get("source")
        if not src:
            continue
        r = api("https://en.wikipedia.org/w/api.php", {
            "action": "query", "format": "json", "prop": "extracts", "explaintext": 1, "titles": src["wiki"], "redirects": 1})
        text = next(iter(r["query"]["pages"].values())).get("extract", "")
        sents = re.split(r"(?<=[.!?])\s+", text)
        hit = next((x for x in sents if all(k.lower() in x.lower() for k in src.get("check", []))), None)
        if hit:
            print("weetje klopt:", src["wiki"], "|", hit[:160])
        else:
            bad.append(f"{src['wiki']} {src.get('check')}")
    if bad:
        sys.exit("weetje niet teruggevonden op Wikipedia (niet gepost): " + "; ".join(bad))


def main():
    tl_path = ROOT / "src/timeline.json"
    tl = json.loads(tl_path.read_text())
    verify_facts(tl)
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
                if img.status_code == 429:
                    import time; time.sleep(5); img = requests.get(info["url"], headers=H, timeout=60)
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
