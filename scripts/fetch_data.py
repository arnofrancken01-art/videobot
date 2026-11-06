"""Haal echte, gratis data op voor de videobot en bewaar ze in data/.
Draait wekelijks in GitHub Actions (open internet). Resultaat:
  data/catalog.json            overzicht van alle datasets met bron en eenheid
  data/worldbank/<id>.csv      country,iso3,year,value (alleen landen, 1990+)
  data/bigmac.csv              The Economist Big Mac Index
"""
import csv, io, json
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data"
WB = "https://api.worldbank.org/v2"

INDICATORS = {
    "NY.GDP.PCAP.CD": ("GDP per person", "US dollars"),
    "NY.GDP.PCAP.PP.CD": ("GDP per person, adjusted for prices (PPP)", "international dollars"),
    "NY.GDP.MKTP.CD": ("Total GDP", "US dollars"),
    "FP.CPI.TOTL.ZG": ("Inflation, consumer prices", "% per year"),
    "SL.UEM.TOTL.ZS": ("Unemployment", "% of labour force"),
    "SP.DYN.LE00.IN": ("Life expectancy at birth", "years"),
    "GC.TAX.TOTL.GD.ZS": ("Tax revenue", "% of GDP"),
    "GC.DOD.TOTL.GD.ZS": ("Central government debt", "% of GDP"),
    "SI.POV.GINI": ("Income inequality (Gini index)", "0-100"),
    "SH.XPD.CHEX.PC.CD": ("Health spending per person", "US dollars"),
    "SE.XPD.TOTL.GD.ZS": ("Education spending", "% of GDP"),
    "MS.MIL.XPND.GD.ZS": ("Military spending", "% of GDP"),
    "BX.TRF.PWKR.CD.DT": ("Money sent home by migrants (remittances received)", "US dollars"),
    "NY.GNS.ICTR.ZS": ("Gross savings", "% of GDP"),
    "PA.NUS.FCRF": ("Exchange rate", "local currency per US dollar"),
    "SP.POP.TOTL": ("Population", "people"),
    "NE.CON.PRVT.PC.KD": ("Household spending per person", "constant 2015 US dollars"),
    "IT.NET.USER.ZS": ("Internet users", "% of population"),
}


def countries():
    r = requests.get(f"{WB}/country", params={"format": "json", "per_page": 400}, timeout=60).json()[1]
    return {c["id"]: c["name"] for c in r if c["region"]["value"] != "Aggregates"}


def main():
    (OUT / "worldbank").mkdir(parents=True, exist_ok=True)
    cs = countries()
    catalog = {"worldbank": {}, "other": {}}
    for ind, (name, unit) in INDICATORS.items():
        rows = []
        page, pages = 1, 1
        while page <= pages:
            meta, data = requests.get(f"{WB}/country/all/indicator/{ind}",
                                      params={"format": "json", "per_page": 20000, "date": "1990:2026", "page": page}, timeout=120).json()
            pages = meta["pages"]
            for d in data or []:
                iso = d["countryiso3code"]
                if d["value"] is None or iso not in cs:
                    continue
                rows.append([cs[iso], iso, d["date"], d["value"]])
            page += 1
        rows.sort(key=lambda r: (r[1], r[2]))
        with open(OUT / f"worldbank/{ind}.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["country", "iso3", "year", "value"])
            w.writerows(rows)
        latest = max((int(r[2]) for r in rows), default=None)
        catalog["worldbank"][ind] = {"name": name, "unit": unit, "file": f"data/worldbank/{ind}.csv", "rows": len(rows),
                                     "latest_year": latest, "source": f"World Bank, indicator {ind}",
                                     "url": f"https://data.worldbank.org/indicator/{ind}"}
        print(ind, len(rows))
    bm = requests.get("https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv", timeout=60).text
    (OUT / "bigmac.csv").write_text(bm)
    catalog["other"]["bigmac"] = {"name": "Big Mac Index (price of a Big Mac per country, in local currency and US dollars)",
                                  "file": "data/bigmac.csv", "source": "The Economist, Big Mac Index",
                                  "url": "https://github.com/TheEconomist/big-mac-data"}
    (OUT / "catalog.json").write_text(json.dumps(catalog, indent=1))


if __name__ == "__main__":
    main()
