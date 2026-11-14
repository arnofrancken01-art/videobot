"""Controleer een episode-bestand voor het naar de render gaat.
Gebruik: python3 scripts/validate.py episodes/ep002.json
Stopt met een duidelijke fout als iets niet klopt.
"""
import json, re, sys
from pathlib import Path

NEW = ["truefalse", "choice", "clues", "thennow", "dots", "podium", "battle", "ticker", "receipt", "bubbles"]
SCENES = {"hook", "rank", "versus", "bars", "bignumber", "line", "outro", "quiz", "race", "grid", *NEW}
FORMATS = {"countdown", "quiz", "race", "story", *NEW}
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
if not 3 <= len(segs) <= 10:
    errors.append(f"{len(segs)} segmenten; mik op 4 tot 9")
words = sum(len(s.get("text", "").split()) for s in segs)
pauses = sum(float(s.get("props", {}).get("pause", 0)) for s in segs)
secs = words / 2.8 + pauses  # ruwe schatting van de duur
if words < 25 or secs > 30:
    errors.append(f"{words} woorden + {pauses:.1f} s denktijd = ca. {secs:.0f} s; mik op 10 tot 25 seconden (max. 30)")
scenes = [s.get("scene") for s in segs]
if segs and scenes[0] in ("outro", "rank", "bignumber", "line", "bars", "race"):
    errors.append("eerste segment moet meteen iets sterks tonen: 'hook' of de hoofdscene van het format")
if segs and scenes[-1] != "outro":
    errors.append("laatste segment moet scene 'outro' zijn")
if segs and len(segs[-1].get("text", "").split()) > 12:
    errors.append("outro: maximaal 12 woorden (één korte vraag die terugloopt naar de eerste zin, zonder 'Follow for more')")

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
if fmt in NEW:
    if fmt not in scenes:
        errors.append(f"format '{fmt}' heeft scene '{fmt}' nodig")
    elif scenes[0] not in (fmt, "hook"):
        errors.append(f"format '{fmt}' begint met scene '{fmt}' (of een korte hook)")
    mine = [s.get("props", {}) for s in segs if s.get("scene") == fmt]
    n = lambda key: sum(1 for q in mine if key in q)
    need = {"truefalse": ("statement", 1, 3), "choice": ("question", 1, 2), "clues": ("clue", 2, 4), "thennow": ("then", 1, 3),
            "dots": ("part", 2, 6), "podium": ("place", 3, 3), "battle": ("stat", 3, 4), "ticker": ("item", 1, 3),
            "receipt": ("line", 2, 5), "bubbles": ("item", 2, 4)}[fmt]
    if not need[1] <= n(need[0]) <= need[2]:
        errors.append(f"{fmt}: {need[1]} tot {need[2]} segmenten met '{need[0]}' (nu {n(need[0])})")
if fmt == "podium" and [q.get("place") for q in (s.get("props", {}) for s in segs) if "place" in q] != [3, 2, 1]:
    errors.append("podium: de volgorde is place 3, dan 2, dan 1")
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
    def needs_reveal():
        nxt = segs[i + 1] if i + 1 < len(segs) else {}
        if not (nxt.get("scene") == sc and nxt.get("props", {}).get("reveal")):
            errors.append(f"{where}: hierna komt een {sc}-segment met \"reveal\": true")
    def needs_pause():
        if not 1.2 <= float(p.get("pause", 0)) <= 2.5:
            errors.append(f"{where}: pause (denktijd) moet tussen 1.2 en 2.5 seconden zijn")
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    for obj in (p.get("row"), p.get("line"), p.get("a"), p.get("b")):
        if isinstance(obj, dict):
            check_flag(obj, obj.get("label"))
    for obj in p.get("parts", []):
        check_flag(obj, obj.get("label"))
    if sc == "truefalse" and "statement" in p:
        if not (p["statement"] and isinstance(p.get("answer"), bool) and p.get("fact")):
            errors.append(f"{where}: statement, answer (true/false) en fact (het echte cijfer) zijn nodig")
        if len(str(p["statement"])) > 70:
            errors.append(f"{where}: statement max. 70 tekens")
        needs_reveal(); needs_pause()
    if sc == "choice" and "question" in p:
        o = p.get("options", [])
        if not (len(o) == 3 and all(isinstance(x, str) and len(x) <= 18 for x in o) and p.get("answer") in (0, 1, 2)):
            errors.append(f"{where}: options = 3 korte teksten (max. 18 tekens), answer = 0, 1 of 2")
        needs_reveal(); needs_pause()
    if sc == "clues":
        if "clue" in p and not (isinstance(p["clue"], dict) and p["clue"].get("label") and isinstance(p["clue"].get("value"), str)):
            errors.append(f"{where}: clue heeft label en value (tekst, bv. \"123 million\") nodig")
        if p.get("reveal") and not (p.get("label") and p.get("flag")):
            errors.append(f"{where}: het reveal-segment heeft label en flag van het land nodig")
        if "clue" in p and not any("clue" in x.get("props", {}) for x in segs[i + 1:]):
            needs_reveal(); needs_pause()
    if sc == "thennow" and "then" in p:
        t, n2 = p.get("then", {}), p.get("now", {})
        if not (p.get("label") and num(t.get("value")) and num(n2.get("value")) and t.get("year") and n2.get("year") and t["value"] > 0 and n2["value"] > 0):
            errors.append(f"{where}: label, then {{year, value}} en now {{year, value}} (positieve getallen) zijn nodig")
        needs_reveal()
    if sc == "dots":
        if prev != "dots":
            parts = p.get("parts", [])
            if not p.get("title") or sum(x.get("count", 0) for x in parts) != 100 or not 2 <= len(parts) <= 6:
                errors.append(f"{where}: title en 2 tot 6 parts waarvan de counts samen precies 100 zijn")
            labels = {x.get("label") for x in parts}
            for j in range(i, len(segs)):
                if segs[j]["scene"] != "dots":
                    break
                if segs[j].get("props", {}).get("part") not in labels | {None}:
                    errors.append(f"segment {j + 1}: part staat niet in parts")
    if sc == "podium":
        if prev != "podium" and not (p.get("title") and "format" in p):
            errors.append(f"{where}: eerste podium-segment heeft title en format nodig")
        if "place" in p and not (p["place"] in (1, 2, 3) and p.get("label") and p.get("flag") and num(p.get("value"))):
            errors.append(f"{where}: place (3, 2 of 1), label, flag en value zijn nodig")
    if sc == "battle":
        if prev != "battle" and not all(isinstance(p.get(k), dict) and p[k].get("label") and p[k].get("flag") for k in ("a", "b")):
            errors.append(f"{where}: eerste battle-segment heeft a en b nodig, elk met label en flag")
        st = p.get("stat")
        if st is not None and not (st.get("label") and num(st.get("a")) and num(st.get("b")) and st["a"] != st["b"]):
            errors.append(f"{where}: stat heeft label en twee verschillende getallen a en b nodig")
    if sc == "ticker":
        if prev != "ticker" and not p.get("title"):
            errors.append(f"{where}: title ontbreekt")
        if "item" in p and not (p["item"].get("label") and num(p["item"].get("perSecond"))):
            errors.append(f"{where}: item heeft label en perSecond (getal per seconde) nodig")
    if sc == "receipt":
        if prev != "receipt" and not (p.get("title") and "format" in p):
            errors.append(f"{where}: eerste receipt-segment heeft title en format nodig")
        for k in ("line", "total"):
            if k in p and not (p[k].get("label") and num(p[k].get("value"))):
                errors.append(f"{where}: {k} heeft label en value nodig")
    if sc == "bubbles":
        if prev != "bubbles" and not (p.get("title") and "format" in p):
            errors.append(f"{where}: eerste bubbles-segment heeft title en format nodig")
        if "item" in p and not (p["item"].get("label") and p["item"].get("flag") and num(p["item"].get("value")) and p["item"]["value"] > 0):
            errors.append(f"{where}: item heeft label, flag en een positieve value nodig")
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
