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

## Vast stramien: Top 5 aftelling (verplicht, elke video)

Elke video volgt exact dezelfde opbouw. Kijkers leren het format kennen en blijven tot nummer 1.
Kies dus een onderwerp waarvoor `data/` een **echte top 5 per land** geeft (meest recente jaar met genoeg landen).
Schrijf eerst **drie hooks**, kies de sterkste.

| # | Scene | Tijd | Wat de stem zegt |
|---|---|---|---|
| 1 | `hook` | 0-3 s | Het getal van nummer 1 groot in beeld, **zonder het land te verklappen**, + een raadvraag. "In one country, prices jumped forty-two percent in a single year. Can you guess which?" Gebruik `icon`, geen `flag` (anders verklap je het). |
| 2 | `rank` 5 | | "Top five. Number five: [land], [getal]." |
| 3 | `rank` 4 | | "Number four: [land], [getal]." Max. 8 woorden. |
| 4 | `rank` 3 | | "Number three: [land], [getal]." |
| 5 | `rank` 2 | | Bouw spanning op: "Number two is a holiday favorite. Turkey, thirty-five percent." |
| 6 | `rank` 1 | | "And number one: [land]. [getal]." + **één zin waarom** (echte reden). |
| 7 | `line` / `bignumber` / `versus` | | De wending: een tweede verrassend getal of verloop in de tijd ("But Turkey has seen worse..."). |
| 8 | eventueel nog 1 `bignumber` | | De laatste klap, één getal om te delen. |
| 9 | `outro` | | Een vraag die tot reacties leidt + "Follow for more money, mapped." |

Regels voor de aftelling:
- **Wereldkaart (af en toe):** zet `"map": true` in het eerste rank-segment om een kaart te tonen die van land naar land vliegt. Doe dat in ongeveer **1 op 3 video's**, en alleen als de landen verspreid over de wereld liggen. Kijk in `episodes/` naar de vorige twee: hadden die een kaart, dan nu niet.
- **Stem (belangrijk):** schrijf korte, volledige zinnen die op een punt eindigen. Geen dubbelpunten, geen komma-opsommingen zoals "Malawi, twenty-eight percent" (de stem gaat dan omhoog alsof het een vraag is). Goed: "Number five is Malawi. Twenty-eight percent." Alleen een echte vraag eindigt op "?".
- **Zeg de landnaam letterlijk zoals in `label`**: het land, de vlag en het getal slaan in op dat woord. Gebruik gewone Engelse namen ("Turkey", "Iran", niet "Turkiye" of "Iran, Islamic Rep.").
- Nummer 1 moet verrassen. Is de top 1 voorspelbaar, kies dan een andere maatstaf of een ander jaar.
- Elke rank-zin max. ca. 10 woorden; alleen bij nummer 1 mag er een uitleg bij.
- Titel van de video: verrassend getal + "Top 5 ..." (bv. "Prices rose 42% in ONE year in this country. Top 5 highest inflation in 2025").

Toets je script: zou iemand die scrollt na 1 seconde blijven hangen? Zou hij willen raden wie nummer 1 is? Zo niet, herschrijf.

## Wat een goede video is (feedback van Arno)

- **Hook in de eerste 3 seconden**: een verrassend contrast of getal, meteen in beeld. Geen intro, geen "did you know".
- **Snel tempo**: korte zinnen (maximaal ca. 15 woorden), elk segment toont iets nieuws.
- **Nooit een leeg scherm**: elke scene heeft vanaf het begin iets in beeld; `at` laat het grote getal inslaan op het gesproken woord.
- **Echte inhoud, geen slop**: elk getal met bron, één duidelijke conclusie, een verrassende wending in het midden.
- **Einde**: een vraag + `"Follow for more money, mapped."` als laatste segment (scene `outro`).

## Uploadtekst (voor zoveel mogelijk bereik)

Vul in elke episode ook in:
- `title`: max. 70 tekens, getal + nieuwsgierigheid, geen clickbait-leugen ("Prices rose 42% in ONE year here. Top 5 highest inflation 2025").
- `topic`: 2-4 woorden voor de kop bovenaan de video ("Highest inflation 2025").
- `description`: 1-2 zinnen: een vraag + "number one will surprise you" + dat het echte data is.
- `hashtags`: 4 stuks, eerst het onderwerp (#inflation), dan #money, #economy en één specifieke (#top5). `#shorts` komt er automatisch bij.
- `tags`: 6-10 zoekwoorden die mensen echt intypen ("highest inflation", "cost of living", landnamen).

## Formaat van een episode

```json
{
 "id": "ep002",
 "title": "Korte, klikbare titel (max. 70 tekens)",
 "topic": "Highest inflation 2025",
 "description": "Which country has the fastest rising prices? Number one will surprise you.",
 "tags": ["highest inflation", "cost of living"],
 "source": "World Bank, GDP per capita (2024), data.worldbank.org",
 "voice": "af_heart",
 "hashtags": ["money", "economy", "dataviz"],
 "segments": [ { "scene": "...", "text": "Wat de stem zegt.", "props": { } } ]
}
```

Regels voor `text`: getallen voluit schrijven zoals je ze uitspreekt ("nine dollars", "sixty-two percent", "two thirty-eight"); jaartallen mogen als cijfers. Interpunctie bepaalt de captions (een leesteken sluit een caption-blok af).

### Scenes

**rank** (de aftelling, 5 opeenvolgende segmenten): eerste segment bevat `title` en `format`; elk segment `rank`, `label`, `value`, `flag`. Onderaan groeit een ladder 1-5 waarin de nog geheime plekken als "?" wachten.
```json
{"scene":"rank","text":"Top five. Number five: Malawi, twenty-eight percent.","props":{"title":"Highest inflation, 2025","format":{"suffix":"%","decimals":1},"rank":5,"label":"Malawi","value":28.4,"flag":"mw"}}
{"scene":"rank","text":"Number four: Haiti, almost twenty-nine.","props":{"rank":4,"label":"Haiti","value":28.6,"flag":"ht"}}
```

**hook** (altijd het eerste segment): de claim staat er vanaf frame 1.
```json
{"scene":"hook","text":"Indians working abroad sent home a hundred fifty-one billion dollars. In one year.","props":{"kicker":"Sent home by Indians abroad","big":150.7,"format":{"prefix":"$","suffix":"B","decimals":1},"sub":"in one year","flag":"in"}}
```
`flag` is een landcode van 2 letters (zie `data/flags.json`); zonder land gebruik je `icon`.

**Vlaggen**: geef elk land in `items` (bars) en `item` (versus) een `flag`-code. Vlaggen maken de video veel herkenbaarder.

Opeenvolgende segmenten met dezelfde scene `versus`, `bars` of `line` worden één doorlopende scene.

**versus** (vergelijking van 2 of 3 dingen die na elkaar inslaan): eerste segment met `icon` (`burger`, `globe`, `house`, `clock`, `coin`) of een korte `headline`; elk segment kan een kaart toevoegen die inslaat op het woord in `at`.
```json
{"scene":"versus","text":"This exact burger costs nine dollars in Switzerland.","props":{"icon":"burger","format":{"prefix":"$","decimals":2},"item":{"label":"Switzerland","value":9.04},"at":"nine"}}
```

**bars** (ranglijst, 4 tot 12 balken, gesorteerd): eerste segment bevat de data, volgende segmenten zetten balken in de kijker met `highlight` (labels exact zoals in `items`).
```json
{"scene":"bars","text":"Here's what one Big Mac costs around the world.","props":{"title":"One Big Mac, in US dollars","subtitle":"July 2026","format":{"prefix":"$","decimals":2},"items":[{"label":"Indonesia","value":2.38,"flag":"id"}]}}
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

**outro**: `{"scene":"outro","text":"Which number surprised you? Follow for more money, mapped.","props":{}}`

`format` velden: `prefix`, `suffix`, `decimals`. Grote bedragen liever omrekenen naar duizenden of miljarden met een duidelijke suffix (bv. `{"prefix":"$","suffix":"k"}`).

## Onderwerpideeën

- Hoeveel uur werk je voor X, per land
- Landen waar je loon het verst reikt (PPP vs gewoon)
- Inflatie: wat 100 dollar in 2000 waard was, nu
- Staatsschuld per land, wie de meeste schuld heeft
- Hoeveel landen uitgeven aan gezondheid vs leger
- Geld dat migranten naar huis sturen: de grootste ontvangers
- Rijkste en armste landen, en hoe dat in 30 jaar veranderde

## Skills

De officiële Remotion-skills staan in `.agents/skills/` (gekoppeld in `.claude/skills/`). Lees `remotion-best-practices` voordat je iets aan de scenes in `src/` verandert. Voor een gewone aflevering (alleen `episodes/epNNN.json`) zijn ze niet nodig.
