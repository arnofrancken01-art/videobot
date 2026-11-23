"""Lijsten voor de scene `worldsplit`: welke landen staan boven en onder een land op een maatstaf.
  python3 scripts/make_split.py in NY.GDP.MKTP.CD          (meest recente jaar met data voor dit land)
  python3 scripts/make_split.py pk SP.POP.TOTL 2023
Drukt een JSON-blok af om in de props te plakken, plus het jaar en de aantallen.
"""
import csv, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
code, ind = sys.argv[1].lower(), sys.argv[2]
year = int(sys.argv[3]) if len(sys.argv) > 3 else None
iso = json.loads((ROOT / "data/iso3to2.json").read_text())
rows = [r for r in csv.DictReader(open(ROOT / f"data/worldbank/{ind}.csv")) if r["value"] and r["iso3"] in iso]
if year is None:
    year = max(int(r["year"]) for r in rows if iso[r["iso3"]] == code)
vals = {iso[r["iso3"]]: float(r["value"]) for r in rows if int(r["year"]) == year}
if code not in vals:
    sys.exit(f"geen waarde voor {code} in {year}")
ref = vals[code]
above = sorted(c for c, v in vals.items() if v > ref)
below = sorted(c for c, v in vals.items() if v < ref)
print(json.dumps({"above": above, "below": below}))
print(f"# {ind} {year}: {code} = {ref:,.0f}; {len(above)} landen hoger, {len(below)} lager", file=sys.stderr)
