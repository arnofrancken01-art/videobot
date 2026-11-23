"""Wat werkt er bij ONS? Zet state/stats.json om in een korte tabel die het brein elke run leest.
  python scripts/insights.py  -> state/insights.md

Belangrijkste maat: 'blijft' = engaged views / views = hoeveel kijkers NIET meteen wegvegen.
Onderzoek (Snapchat, 90.000 video's, arXiv 2410.00289) vond dat 'kijkt langer dan 5 seconden' 0,93 correleert
met de totale betrokkenheid: de eerste seconden beslissen bijna alles. Daarna: views, gemiddelde kijkduur, likes per view.
"""
import json, re, statistics as st
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
s = json.loads((ROOT / "state/stats.json").read_text())
eps = {}
for p in list((ROOT / "episodes").glob("ep*.json")):
    try:
        e = json.loads(p.read_text()); eps[e["id"]] = e
    except Exception:  # noqa: BLE001
        pass

FLAGS = {"in": "India", "pk": "Pakistan", "bd": "Bangladesh", "id": "Indonesia", "cn": "China", "us": "USA", "gb": "UK", "jp": "Japan",
         "ru": "Russia", "br": "Brazil", "ar": "Argentina", "tr": "Turkey", "ph": "Philippines", "ng": "Nigeria", "mx": "Mexico", "de": "Germany"}


def lead(e):
    """Het eerste land in de titel (vlag-emoji of naam), anders de eerste vlag op het openingsbeeld."""
    t = e.get("title", "")
    m = re.search(r"([\U0001F1E6-\U0001F1FF]{2})", t)
    if m:
        code = "".join(chr(ord(c) - 0x1F1E6 + 97) for c in m.group(1))
        return FLAGS.get(code, code.upper())
    hits = sorted((t.find(n), n) for n in set(FLAGS.values()) | {"America"} if n in t)
    if hits:
        return "USA" if hits[0][1] == "America" else hits[0][1]
    fl = (e.get("cover") or {}).get("flags") or []
    return FLAGS.get(fl[0], fl[0]) if fl else "geen land in titel"


rows = []
now = datetime.now(timezone.utc)
for v in s["videos"]:
    e = eps.get(v.get("episode") or "")
    if not e or v["privacy"] != "public":
        continue
    pub = datetime.fromisoformat(v["published"].replace("Z", "+00:00"))
    words = sum(len(x.get("text", "").split()) for x in e["segments"])
    # YouTube Analytics loopt ca. 3 dagen achter: jongere video's tellen nog niet mee voor 'blijft'.
    # Deel door de views van Analytics zelf (zelfde periode); de gewone teller loopt dagen voor.
    base = v.get("an_views") or v["views"]
    stay = v["engaged_views"] / base if v.get("engaged_views") and base >= 50 and (v.get("an_views") or (now - pub).days >= 3) else None
    rows.append({"id": e["id"], "fmt": e.get("format", "countdown"), "lead": lead(e), "hook": e.get("hook_type", "?"), "words": words,
                 "slot": (pub + timedelta(hours=1)).strftime("%H"), "views": v["views"], "stay": stay, "avd": v.get("avg_view_sec"),
                 "likes": v.get("likes", 0), "age": (now - pub).days, "title": v["title"]})


def table(key, label):
    groups = {}
    for r in rows:
        groups.setdefault(r[key], []).append(r)
    out = [f"| {label} | video's | mediaan views | blijft (gem.) | kijkduur (s) |", "|---|---|---|---|---|"]
    for k, g in sorted(groups.items(), key=lambda kv: -st.median([r["views"] for r in kv[1]])):
        stays = [r["stay"] for r in g if r["stay"] is not None]
        avds = [r["avd"] for r in g if r["avd"]]
        out.append(f"| {k} | {len(g)} | {st.median([r['views'] for r in g]):.0f} | {f'{100 * st.mean(stays):.0f}%' if stays else '-'} | {f'{st.mean(avds):.0f}' if avds else '-'} |")
    return "\n".join(out)


recent = [r for r in rows if r["age"] <= 21]
med = st.median([r["views"] for r in recent]) if recent else 0
stays = [r["stay"] for r in recent if r["stay"] is not None]
lines = [
    f"# Wat werkt bij Money, Mapped (automatisch, {now:%Y-%m-%d %H:%M} UTC)",
    "",
    f"Laatste 21 dagen: {len(recent)} video's, mediaan {med:.0f} views, gemiddeld blijft {100 * st.mean(stays):.0f}% kijken." if stays else "",
    "Doel: **blijft 60% of meer** (sterke Shorts halen 70 tot 80%). Elke procent erbij betekent dat YouTube de video aan meer mensen toont.",
    "",
    "## Per format (laatste 21 dagen)", table.__call__("fmt", "format") if False else "",
]
rows_all = rows
rows = recent
lines[-1] = table("fmt", "format")
lines += ["", "## Per hoofdland", table("lead", "land"), "", "## Per soort opening (`hook_type`)", table("hook", "hook"),
          "", "## Per uur dat Arno hem openbaar zette (Belgische tijd)", table("slot", "uur")]
top = sorted(recent, key=lambda r: -r["views"])[:5]
low = sorted([r for r in recent if r["age"] >= 2], key=lambda r: r["views"])[:3]
lines += ["", "## Beste 5", *[f"- {r['views']} views, blijft {f'{100 * r['stay']:.0f}%' if r['stay'] else '-'}: {r['title']} ({r['fmt']}, {r['hook']})" for r in top],
          "", "## Zwakste 3 (ouder dan 2 dagen)", *[f"- {r['views']} views: {r['title']} ({r['fmt']}, {r['hook']})" for r in low]]
(ROOT / "state/insights.md").write_text("\n".join(lines) + "\n")
print("\n".join(lines))
