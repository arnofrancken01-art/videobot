"""Bouw het geraamte van een lange video "X tegen de wereld" uit echte data.
Gebruik: python3 scripts/make_long.py IND "India" in  PAK,CHN,USA,GBR,JPN,RUS  long/lv001.json
Het resultaat is een startpunt: de vrijdagrun (docs/LONG.md) herschrijft de zinnen en kiest de hoofdstukken.
Elk getal komt uit data/worldbank; per ronde het meest recente jaar waarvoor beide landen een cijfer hebben.
"""
import csv, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAMES = {  # iso3: (label in beeld, gesproken naam, vlag)
    "IND": ("India", "India", "in"), "PAK": ("Pakistan", "Pakistan", "pk"), "CHN": ("China", "China", "cn"), "USA": ("USA", "America", "us"),
    "GBR": ("UK", "Britain", "gb"), "JPN": ("Japan", "Japan", "jp"), "RUS": ("Russia", "Russia", "ru"), "BGD": ("Bangladesh", "Bangladesh", "bd"),
    "DEU": ("Germany", "Germany", "de"), "FRA": ("France", "France", "fr"), "BRA": ("Brazil", "Brazil", "br"), "IDN": ("Indonesia", "Indonesia", "id"),
    "NGA": ("Nigeria", "Nigeria", "ng"), "MEX": ("Mexico", "Mexico", "mx"), "TUR": ("Turkey", "Turkey", "tr"), "PHL": ("Philippines", "the Philippines", "ph"),
    "SAU": ("Saudi Arabia", "Saudi Arabia", "sa"), "KOR": ("South Korea", "South Korea", "kr"), "CAN": ("Canada", "Canada", "ca"), "AUS": ("Australia", "Australia", "au"),
}
# maatstaf: (bestand, kop, deler, notatie, zin bij groot verschil, lager wint?)
STATS = {
    "people": ("SP.POP.TOTL", "Population", 1e6, {"suffix": "M"}, "{W} has {x} times more people.", False),
    "economy": ("NY.GDP.MKTP.CD", "Size of the economy", 1e12, {"prefix": "$", "suffix": "T", "decimals": 2}, "{W}'s economy is {x} times bigger.", False),
    "income": ("NY.GDP.PCAP.CD", "Income per person", 1, {"prefix": "$"}, "{W} is {x} times richer per person.", False),
    "life": ("SP.DYN.LE00.IN", "Life expectancy", 1, {"suffix": " yrs", "decimals": 1}, "", False),
    "soldiers": ("MS.MIL.TOTL.P1", "Soldiers", 1e6, {"suffix": "M", "decimals": 2}, "{W} has {x} times more soldiers.", False),
    "military": ("MS.MIL.XPND.CD", "Military budget", 1e9, {"prefix": "$", "suffix": "B"}, "{W} spends {x} times more on its army.", False),
    "reserves": ("FI.RES.TOTL.CD", "Reserves and gold", 1e9, {"prefix": "$", "suffix": "B"}, "{W} holds {x} times more.", False),
    "land": ("AG.LND.TOTL.K2", "Land area", 1e6, {"suffix": "M km²", "decimals": 2}, "{W} is {x} times bigger.", False),
    "growth": ("NY.GDP.MKTP.KD.ZG", "Economic growth", 1, {"suffix": "%", "decimals": 1}, "", False),
    "online": ("IT.NET.USER.ZS", "People online", 1, {"suffix": "%"}, "", False),
    "exports": ("NE.EXP.GNFS.CD", "Exports", 1e9, {"prefix": "$", "suffix": "B"}, "{W} exports {x} times more.", False),
    "tourists": ("ST.INT.ARVL", "Tourists per year", 1e6, {"suffix": "M", "decimals": 1}, "{W} gets {x} times more tourists.", False),
    "murders": ("VC.IHR.PSRC.P5", "Murders per 100k people", 1, {"decimals": 1}, "Murder is {x} times rarer in {W}.", True),
    "jobs": ("SL.UEM.TOTL.ZS", "Unemployment", 1, {"suffix": "%", "decimals": 1}, "", True),
}
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "x x twenty thirty forty fifty sixty seventy eighty ninety".split()


def words(n):
    n = int(round(n))
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ("-" + ONES[n % 10] if n % 10 else "")
    return str(n)


def times(r):
    if r >= 2.75: return words(r)
    if r >= 2.25: return "two and a half"
    if r >= 1.75: return "two"
    return "one and a half"


def load(ind):
    out = {}
    for r in csv.DictReader(open(ROOT / f"data/worldbank/{ind}.csv")):
        out.setdefault(r["iso3"], {})[int(r["year"])] = float(r["value"])
    return out


def round_for(key, a, b):
    ind, label, div, fmt, big, lower = STATS[key]
    d = load(ind)
    years = sorted(set(d.get(a, {})) & set(d.get(b, {})))
    if not years: return None
    y = years[-1]
    va, vb = d[a][y] / div, d[b][y] / div
    dec = fmt.get("decimals", 0)
    va, vb = round(va, dec), round(vb, dec)
    if va == vb: return None
    a_wins = (va < vb) if lower else (va > vb)
    w = NAMES[a if a_wins else b][1]
    hi, lo = max(va, vb), min(va, vb)
    ratio = hi / lo if lo > 0 else 99
    head = label.split(" per ")[0] if key != "income" else "Income"
    if key == "life":
        say = f"People in {w} live {words(hi - lo) if hi - lo >= 1.5 else 'about one'} {'years' if hi - lo >= 1.5 else 'year'} longer."
    elif key == "growth":
        say = f"{w} is growing faster." if lo > 0 else f"{w} grows. The other one shrinks."
    elif key == "jobs":
        say = f"Fewer people are out of work in {w}."
    elif key == "online":
        say = f"More people are online in {w}."
    elif ratio < 1.25:
        say = f"{w} wins. But only just."
    elif ratio < 1.6:
        say = f"{w} leads by {words((ratio - 1) * 100 // 5 * 5)} percent."
    else:
        say = big.format(W=w, x=times(ratio))
    stat = {"label": f"{label} ({y})", "a": va, "b": vb, "format": fmt}
    if lower: stat["pick"] = "lower"
    return {"scene": "battle", "text": f"{head}. {say}", "props": {"stat": stat, "at": w.split()[-1]}}, a_wins, y


def main():
    home, title_name, _flag, rivals, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(","), sys.argv[5]
    plan = [["people", "economy", "soldiers", "income"], ["people", "economy", "growth", "life"], ["income", "people", "military", "growth"],
            ["economy", "land", "reserves", "life"], ["economy", "people", "online", "soldiers"], ["land", "economy", "military", "exports"],
            ["people", "income", "tourists", "growth"], ["economy", "soldiers", "reserves", "life"]]
    H = NAMES[home]
    segs = [{"scene": "hook", "text": f"{H[1]} against {words(len(rivals))} of the biggest countries on earth. Real numbers. Keep score.",
             "props": {"kicker": f"{H[0]} vs the world", "big": len(rivals) * 4, "format": {"suffix": " rounds"}, "sub": "Real World Bank data", "flag": H[2]}}]
    total = [0, 0]; won = 0
    for i, r in enumerate(rivals):
        R = NAMES[r]
        segs.append({"scene": "battle", "text": f"Battle {words(i + 1)}. {H[1]} versus {R[1]}.",
                     "props": {"a": {"label": H[0], "flag": H[2]}, "b": {"label": R[0], "flag": R[2]}, "chapter": f"{H[0]} vs *{R[0]}*"}})
        sa = sb = 0
        for key in plan[i % len(plan)]:
            got = round_for(key, home, r)
            if not got: continue
            seg, a_wins, _ = got
            segs.append(seg); sa += a_wins; sb += not a_wins
        total[0] += sa; total[1] += sb
        if sa == sb: verdict = f"A draw. {words(sa).capitalize()} all."
        else:
            won += sa > sb
            verdict = f"{(H if sa > sb else R)[1]} takes it. {words(max(sa, sb)).capitalize()} to {words(min(sa, sb))}."
        segs.append({"scene": "battle", "text": verdict, "props": {}})
    segs.append({"scene": "bignumber", "text": f"Final score. {H[1]} won {words(total[0])} of {words(sum(total))} rounds.",
                 "props": {"value": total[0], "format": {"suffix": f" of {sum(total)}"}, "caption": f"rounds won by {H[0]}", "at": "won", "chapter": "The *final* score"}})
    segs.append({"scene": "outro", "text": f"Which country should {H[1]} face next?", "props": {}})
    ep = {"id": Path(out).stem, "long": True, "title": f"{H[0]} vs the World: {len(rivals)} countries, {sum(total)} rounds, real data",
          "headline": f"{H[0]} vs *the world*", "topic": f"{H[0]} vs the world", "cover": {"flags": [H[2]]},
          "description": f"{H[0]} against {', '.join(NAMES[r][0] for r in rivals)}: population, economy, income, army and more. Every number is real World Bank data.",
          "tags": [f"{H[0].lower()} vs {NAMES[r][0].lower()}" for r in rivals] + ["country comparison", f"{H[0].lower()} vs the world"],
          "hashtags": [H[0].lower(), "countrycomparison", "geography"], "source": "World Bank, World Development Indicators (latest year per round)",
          "voice": "af_heart", "format": "battle", "segments": segs}
    Path(out).write_text(json.dumps(ep, indent=1, ensure_ascii=False))
    print(f"{out}: {len(segs)} segmenten, {sum(len(s['text'].split()) for s in segs)} woorden, eindstand {total}")
    for s in segs: print("  ", s["text"])


if __name__ == "__main__":
    main()
