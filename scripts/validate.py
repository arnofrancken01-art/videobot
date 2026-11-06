"""Controleer een episode-bestand voor het naar de render gaat.
Gebruik: python3 scripts/validate.py episodes/ep002.json
Stopt met een duidelijke fout als iets niet klopt.
"""
import json, re, sys
from pathlib import Path

SCENES = {"versus", "bars", "bignumber", "line", "outro"}
ICONS = {None, "burger", "globe", "house", "clock", "coin"}
errors, warnings = [], []
path = Path(sys.argv[1])
ep = json.loads(path.read_text())

for key in ("id", "title", "source", "segments", "hashtags"):
    if key not in ep:
        errors.append(f"veld '{key}' ontbreekt")
segs = ep.get("segments", [])
if not 7 <= len(segs) <= 14:
    errors.append(f"{len(segs)} segmenten; mik op 8 tot 12")
words = sum(len(s.get("text", "").split()) for s in segs)
if not 70 <= words <= 170:
    errors.append(f"{words} woorden gesproken; mik op 90 tot 150 (ca. 30 tot 50 seconden)")
if segs and segs[0].get("scene") != "versus":
    warnings.append("eerste scene is geen 'versus': is de hook sterk genoeg?")
if segs and segs[-1].get("scene") != "outro":
    errors.append("laatste segment moet scene 'outro' zijn")

prev = None
for i, s in enumerate(segs):
    sc, p, text = s.get("scene"), s.get("props", {}), s.get("text", "")
    where = f"segment {i + 1} ({sc})"
    if sc not in SCENES:
        errors.append(f"{where}: onbekende scene")
        continue
    if re.search(r"\d", re.sub(r"\b(19|20)\d\d\b", "", text)):
        errors.append(f"{where}: schrijf getallen voluit in de gesproken tekst (\"two thirty-eight\", niet \"2.38\")")
    if len(text.split()) > 22:
        warnings.append(f"{where}: lange zin ({len(text.split())} woorden), splitsen maakt het tempo hoger")
    at = p.get("at")
    if at and not any(w.lower().strip(".,?!:;").startswith(at.lower()) for w in text.split()):
        errors.append(f"{where}: woord '{at}' uit props.at komt niet voor in de tekst")
    if sc == "versus":
        if prev != "versus" and not (p.get("icon") or p.get("headline")):
            errors.append(f"{where}: eerste versus heeft een icon of headline nodig")
        if p.get("icon") not in ICONS:
            errors.append(f"{where}: icon moet een van {sorted(x for x in ICONS if x)} zijn")
        if "item" in p and not {"label", "value"} <= set(p["item"]):
            errors.append(f"{where}: item heeft label en value nodig")
    if sc == "bars" and prev != "bars":
        items = p.get("items", [])
        if not 4 <= len(items) <= 12:
            errors.append(f"{where}: 4 tot 12 balken")
        if not p.get("title"):
            errors.append(f"{where}: title ontbreekt")
        labels = {x["label"] for x in items}
        for j in range(i, len(segs)):
            if segs[j]["scene"] != "bars":
                break
            for h in segs[j].get("props", {}).get("highlight", []):
                if h not in labels:
                    errors.append(f"segment {j + 1}: highlight '{h}' staat niet in de balken")
    if sc == "bignumber" and not isinstance(p.get("value"), (int, float)):
        errors.append(f"{where}: value moet een getal zijn")
    if sc == "line" and prev != "line":
        ser = p.get("series", [])
        if len(ser) < 5 or any(len(x) != 2 for x in ser):
            errors.append(f"{where}: series moet minstens 5 punten [x, y] hebben")
    prev = sc

for w in warnings:
    print("let op:", w)
if errors:
    print("\n".join("FOUT: " + e for e in errors))
    sys.exit(1)
print(f"OK: {len(segs)} segmenten, {words} woorden")
