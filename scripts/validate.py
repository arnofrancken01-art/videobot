"""Controleer een episode-bestand voor het naar de render gaat.
Gebruik: python3 scripts/validate.py episodes/ep002.json
Stopt met een duidelijke fout als iets niet klopt.
"""
import json, re, sys
from pathlib import Path

SCENES = {"hook", "rank", "versus", "bars", "bignumber", "line", "outro", "quiz", "race", "grid"}
FORMATS = {"countdown", "quiz", "race", "story"}
FLAGS = {f.stem for f in (Path(__file__).resolve().parent.parent / "public/flags").glob("*.svg")}
ICONS = {None, "burger", "globe", "house", "clock", "coin"}
errors, warnings = [], []
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
path = Path(sys.argv[1])
ep = json.loads(path.read_text())

for key in ("id", "title", "source", "segments", "hashtags", "format"):
    if key not in ep:
        errors.append(f"veld '{key}' ontbreekt")
segs = ep.get("segments", [])
fmt = ep.get("format")
if fmt not in FORMATS:
    errors.append(f"format moet een van {sorted(FORMATS)} zijn")
if not 4 <= len(segs) <= 10:
    errors.append(f"{len(segs)} segmenten; mik op 5 tot 9")
words = sum(len(s.get("text", "").split()) for s in segs)
pauses = sum(float(s.get("props", {}).get("pause", 0)) for s in segs)
secs = words / 2.8 + pauses  # ruwe schatting van de duur
if words < 35 or secs > 30:
    errors.append(f"{words} woorden + {pauses:.1f} s denktijd = ca. {secs:.0f} s; mik op 15 tot 25 seconden (max. 30)")
scenes = [s.get("scene") for s in segs]
if segs and scenes[0] not in ("hook", "quiz", "grid", "versus"):
    errors.append("eerste segment moet 'hook', 'quiz', 'grid' of 'versus' zijn: er staat meteen iets sterks in beeld")
if segs and scenes[-1] != "outro":
    errors.append("laatste segment moet scene 'outro' zijn")
if segs and len(segs[-1].get("text", "").split()) > 12:
    errors.append("outro: maximaal 12 woorden (een korte vraag + 'Follow for more.')")

# Afwisseling: niet hetzelfde format als een van de vorige twee afleveringen.
m = re.fullmatch(r"ep(\d+)", path.stem)
if m and fmt in FORMATS:
    for k in (1, 2):
        prev_path = path.parent / f"ep{int(m.group(1)) - k:03d}.json"
        if prev_path.exists() and json.loads(prev_path.read_text()).get("format", "countdown") == fmt:
            errors.append(f"afwisseling: {prev_path.name} was ook format '{fmt}'; kies een ander format")

ranks = [s.get("props", {}).get("rank") for s in segs if s.get("scene") == "rank" and s.get("props", {}).get("rank")]
rank_idx = [i for i, s in enumerate(segs) if s.get("scene") == "rank"]
if fmt == "countdown":
    if ranks not in ([5, 4, 3, 2, 1], [3, 2, 1]):
        errors.append(f"countdown: de rank-segmenten tellen af 3, 2, 1 of 5, 4, 3, 2, 1 (nu {ranks})")
    if scenes[0] != "hook":
        errors.append("countdown begint met scene 'hook'")
    if rank_idx and (rank_idx[0] > 1 or rank_idx != list(range(rank_idx[0], rank_idx[-1] + 1))):
        errors.append("countdown: de aftelling begint meteen na de hook en loopt zonder onderbreking")
elif ranks:
    errors.append(f"scene 'rank' hoort alleen bij format 'countdown'")
if fmt == "quiz":
    rounds = sum(1 for s in segs if s.get("scene") == "quiz" and s.get("props", {}).get("options"))
    if not 2 <= rounds <= 3:
        errors.append(f"quiz: 2 of 3 rondes (nu {rounds})")
    if scenes[0] != "quiz":
        errors.append("quiz begint meteen met de eerste vraag (scene 'quiz'), zonder aparte hook")
if fmt == "race" and "race" not in scenes:
    errors.append("format 'race' heeft een scene 'race' nodig")
if fmt == "story" and not ({"grid", "versus", "line", "bars"} & set(scenes)):
    errors.append("format 'story' heeft minstens een scene 'grid', 'versus', 'line' of 'bars' nodig")

for key in ("topic", "description", "tags"):
    if key not in ep:
        warnings.append(f"veld '{key}' ontbreekt (beter bereik op YouTube)")
if len(ep.get("title", "")) > 90:
    errors.append("title is langer dan 90 tekens")

prev = None
for i, s in enumerate(segs):
    sc, p, text = s.get("scene"), s.get("props", {}), s.get("text", "")
    where = f"segment {i + 1} ({sc})"
    if sc not in SCENES:
        errors.append(f"{where}: onbekende scene")
        continue
    if re.search(r"\d", re.sub(r"\b(19|20)\d\d\b", "", text)):
        errors.append(f"{where}: schrijf getallen voluit in de gesproken tekst (\"two thirty-eight\", niet \"2.38\")")
    if re.search(r"[:;]", text):
        warnings.append(f"{where}: dubbelpunt of puntkomma in de tekst; schrijf liever twee korte zinnen")
    if len(text.split()) > 22:
        warnings.append(f"{where}: lange zin ({len(text.split())} woorden), splitsen maakt het tempo hoger")
    at = p.get("at")
    if at and not any(w.lower().strip(".,?!:;").startswith(at.lower()) for w in text.split()):
        errors.append(f"{where}: woord '{at}' uit props.at komt niet voor in de tekst")
    def check_flag(obj, label):
        if obj.get("flag") and obj["flag"] not in FLAGS:
            errors.append(f"{where}: onbekende vlagcode '{obj['flag']}' bij {label}")
    check_flag(p, "hook")
    for it in p.get("items", []) + ([p["item"]] if "item" in p else []):
        check_flag(it, it.get("label"))
    if sc == "quiz":
        if p.get("options"):
            o = p["options"]
            if len(o) != 2 or any(not (x.get("label") and x.get("flag") and isinstance(x.get("value"), (int, float))) for x in o):
                errors.append(f"{where}: options = precies 2 keuzes met label, flag en value")
            else:
                for x in o:
                    check_flag(x, x["label"])
                    if not any(norm(w) == norm(x["label"].split()[0]) for w in text.split()) and not x.get("say"):
                        warnings.append(f"{where}: '{x['label']}' wordt niet letterlijk uitgesproken in de vraag")
                if o[0]["value"] == o[1]["value"]:
                    errors.append(f"{where}: de twee waarden zijn gelijk")
            if not p.get("question"):
                errors.append(f"{where}: question ontbreekt")
            if not 1.2 <= float(p.get("pause", 0)) <= 2.5:
                errors.append(f"{where}: pause (denktijd) moet tussen 1.2 en 2.5 seconden zijn")
            nxt = segs[i + 1] if i + 1 < len(segs) else {}
            if not (nxt.get("scene") == "quiz" and nxt.get("props", {}).get("reveal")):
                errors.append(f"{where}: na een vraag komt een quiz-segment met \"reveal\": true")
            if not text.strip().endswith("?"):
                warnings.append(f"{where}: de vraag eindigt best op een vraagteken")
        elif not p.get("reveal"):
            errors.append(f"{where}: quiz-segment heeft 'options' (vraag) of 'reveal' nodig")
        if prev != "quiz" and "format" not in p:
            errors.append(f"{where}: eerste quiz-segment heeft 'format' nodig")
    if sc == "race" and prev != "race":
        yrs, its = p.get("years", []), p.get("items", [])
        if len(yrs) < 5 or yrs != sorted(yrs):
            errors.append(f"{where}: years = minstens 5 oplopende jaren")
        if not 4 <= len(its) <= 10:
            errors.append(f"{where}: 4 tot 10 landen in items")
        for x in its:
            if len(x.get("values", [])) != len(yrs):
                errors.append(f"{where}: {x.get('label')} heeft {len(x.get('values', []))} waarden, verwacht {len(yrs)}")
            check_flag(x, x.get("label"))
        if not p.get("title"):
            errors.append(f"{where}: title ontbreekt")
        if p.get("focus") and p["focus"] not in {x.get("label") for x in its}:
            errors.append(f"{where}: focus '{p['focus']}' staat niet in items")
        last = None
        for j in range(i, len(segs)):
            if segs[j]["scene"] != "race":
                break
            to = segs[j].get("props", {}).get("to")
            if to is not None and (not yrs or not yrs[0] <= to <= yrs[-1] or (last and to < last)):
                errors.append(f"segment {j + 1}: 'to' moet een jaar binnen years zijn en mag niet teruggaan")
            last = to or last
    if sc == "grid":
        if prev != "grid" and not (p.get("title") and p.get("icon") in ICONS and p.get("icon")):
            errors.append(f"{where}: eerste grid-segment heeft title en icon nodig")
        r = p.get("row")
        if r:
            if not (r.get("label") and r.get("flag") and isinstance(r.get("count"), int) and 1 <= r["count"] <= 36):
                errors.append(f"{where}: row heeft label, flag en count (geheel getal, 1 tot 36) nodig")
            else:
                check_flag(r, r["label"])
    if sc == "hook" and not (p.get("kicker") and isinstance(p.get("big"), (int, float))):
        errors.append(f"{where}: hook heeft 'kicker' (tekst) en 'big' (getal) nodig")
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
    if sc == "rank":
        if prev != "rank" and not (p.get("title") and "format" in p):
            errors.append(f"{where}: eerste rank-segment heeft 'title' en 'format' nodig")
        if p.get("rank"):
            if not (p.get("label") and isinstance(p.get("value"), (int, float)) and p.get("flag")):
                errors.append(f"{where}: rank heeft label, value en flag nodig")
            elif not any(norm(w) == norm(p["label"].split()[0]) for w in text.split()):
                warnings.append(f"{where}: de landnaam '{p['label']}' wordt niet letterlijk uitgesproken; het land verschijnt dan pas na 1,2 s")
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
