"""Lab: controleert of elk weetje echt in het Wikipedia-artikel staat; schrijft de zinnen die passen."""
import json, re, sys
from pathlib import Path
import requests
H = {"User-Agent": "MoneyMappedVideobot/1.0 (https://github.com/arnofrancken01-art/videobot)"}
facts = json.loads(Path(sys.argv[1]).read_text())
out = []
for f in facts:
    r = requests.get("https://en.wikipedia.org/w/api.php", headers=H, timeout=30, params={"action": "query", "format": "json", "prop": "extracts", "explaintext": 1, "titles": f["wiki"], "redirects": 1}).json()
    pg = next(iter(r["query"]["pages"].values()))
    text = pg.get("extract", "")
    sents = re.split(r"(?<=[.!?])\s+", text)
    hits = [s for s in sents if all(k.lower() in s.lower() for k in f["check"])]
    out.append({**f, "found": bool(hits), "sentences": hits[:3], "missing_page": not text})
    print(("OK  " if hits else "NO  ") + f["id"], "|", (hits[0][:220] if hits else ""))
Path("out/lab").mkdir(parents=True, exist_ok=True)
Path("out/lab/facts_checked.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
