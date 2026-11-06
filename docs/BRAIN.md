# Brein: zo schrijft Claude een nieuwe video

Kanaal: **Money, Mapped**. Korte video's (30 tot 50 seconden) over geld en de wereld, gebouwd op echte data.
Taal van de video's: Engels. Doelgroep: nieuwsgierige 18-35-jarigen in de VS en Europa.

## Werkwijze per run

1. `git pull`. Lees `data/catalog.json`, `state/queue.json`, `state/stats.json` (als die bestaat) en de titels in `episodes/`.
2. Kies **één** onderwerp dat nog niet gedaan is. Gebruik `state/stats.json`: maak meer van wat goed scoort (views, kijkduur), minder van wat flopt.
3. Haal de cijfers **alleen** uit de bestanden in `data/` (lees ze met Python). Verzin nooit een getal. Kies het meest recente jaar met data voor alle landen in de vergelijking en noem dat jaar.
4. Schrijf `episodes/epNNN.json` (volgend nummer, drie cijfers).
5. Controleer: `python3 scripts/validate.py episodes/epNNN.json`. Los elke FOUT op.
6. Commit en push naar `main`. GitHub Actions maakt dan de video en stuurt hem naar Telegram ter goedkeuring.

## Wat een goede video is (feedback van Arno)

- **Hook in de eerste 3 seconden**: een verrassend contrast of getal, meteen in beeld. Geen intro, geen "did you know".
- **Snel tempo**: korte zinnen (maximaal ca. 15 woorden), elk segment toont iets nieuws.
- **Nooit een leeg scherm**: elke scene heeft vanaf het begin iets in beeld; `at` laat het grote getal inslaan op het gesproken woord.
- **Echte inhoud, geen slop**: elk getal met bron, één duidelijke conclusie, een verrassende wending in het midden.
- **Einde**: altijd `"Follow for more money, mapped."` als laatste segment (scene `outro`).

## Formaat van een episode

```json
{
 "id": "ep002",
 "title": "Korte, klikbare titel (max. 90 tekens)",
 "source": "World Bank, GDP per capita (2024), data.worldbank.org",
 "voice": "af_heart",
 "hashtags": ["money", "economy", "dataviz"],
 "segments": [ { "scene": "...", "text": "Wat de stem zegt.", "props": { } } ]
}
```

Regels voor `text`: getallen voluit schrijven zoals je ze uitspreekt ("nine dollars", "sixty-two percent", "two thirty-eight"); jaartallen mogen als cijfers. Interpunctie bepaalt de captions (een leesteken sluit een caption-blok af).

### Scenes

Opeenvolgende segmenten met dezelfde scene `versus`, `bars` of `line` worden één doorlopende scene.

**versus** (de hook): eerste segment met `icon` (`burger`, `globe`, `house`, `clock`, `coin`) of een korte `headline`; elk segment kan een kaart toevoegen die inslaat op het woord in `at`.
```json
{"scene":"versus","text":"This exact burger costs nine dollars in Switzerland.","props":{"icon":"burger","format":{"prefix":"$","decimals":2},"item":{"label":"Switzerland","value":9.04},"at":"nine"}}
```

**bars** (ranglijst, 4 tot 12 balken, gesorteerd): eerste segment bevat de data, volgende segmenten zetten balken in de kijker met `highlight` (labels exact zoals in `items`).
```json
{"scene":"bars","text":"Here's what one Big Mac costs around the world.","props":{"title":"One Big Mac, in US dollars","subtitle":"July 2026","format":{"prefix":"$","decimals":2},"items":[{"label":"Indonesia","value":2.38}]}}
{"scene":"bars","text":"Indonesia is the cheapest.","props":{"highlight":["Indonesia"]}}
```

**bignumber**: één groot getal dat inslaat op `at`, met een bijschrift en optioneel twee vergelijkingsbalken.
```json
{"scene":"bignumber","text":"That's almost four times more.","props":{"value":3.8,"format":{"suffix":"x","decimals":1},"caption":"the price, same burger","at":"four","compare":{"format":{"prefix":"$","decimals":2},"items":[{"label":"Indonesia","value":2.38},{"label":"Switzerland","value":9.04}]}}}
```

**line** (verloop in de tijd, minstens 5 punten): `series` is een lijst `[jaar, waarde]`; `badge` is de conclusie.
```json
{"scene":"line","text":"And the price nearly tripled since 2000.","props":{"title":"Big Mac price in the US","subtitle":"2000 to 2026","format":{"prefix":"$","decimals":2},"series":[[2000,2.24],[2026,6.22]],"badge":"2.8x since 2000"}}
```

**outro**: `{"scene":"outro","text":"Follow for more money, mapped.","props":{}}`

`format` velden: `prefix`, `suffix`, `decimals`. Grote bedragen liever omrekenen naar duizenden of miljarden met een duidelijke suffix (bv. `{"prefix":"$","suffix":"k"}`).

## Onderwerpideeën

- Hoeveel uur werk je voor X, per land
- Landen waar je loon het verst reikt (PPP vs gewoon)
- Inflatie: wat 100 dollar in 2000 waard was, nu
- Staatsschuld per land, wie de meeste schuld heeft
- Hoeveel landen uitgeven aan gezondheid vs leger
- Geld dat migranten naar huis sturen: de grootste ontvangers
- Rijkste en armste landen, en hoe dat in 30 jaar veranderde
