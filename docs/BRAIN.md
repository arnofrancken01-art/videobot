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

## Verhaalopbouw (verplicht)

Schrijf eerst **drie hooks**, kies de sterkste, en bouw dan dit verhaal:

1. **Hook (0-3 s), scene `hook`**: het schokkendste getal staat vanaf frame 1 groot in beeld, de stem zegt de claim in max. 15 woorden. Formules die werken: "X krijgt/betaalt/verdient [groot getal]", "X is [N] keer meer dan Y", een getal dat tegen de intuïtie ingaat. Nooit beginnen met "Did you know", "Here's", "Today" of "In this video".
2. **Open lus (3-6 s)**: beloof een verrassing die pas later komt ("and number three makes no sense", "but one country breaks the pattern"). Zo blijven mensen kijken.
3. **Opbouw**: de ranglijst of vergelijking, elk segment één nieuw feit, en zet in de kijker wat je zegt.
4. **Wending / betaling**: los de open lus op met een echte uitleg (een reden, geen gok). Dat is het moment dat mensen delen.
5. **Laatste klap**: een tweede verrassend getal of een verloop in de tijd.
6. **Einde**: een vraag die tot reacties leidt + "Follow for more money, mapped." (scene `outro`).

Toets je script: zou iemand die scrollt na 1 seconde blijven hangen? Zou hij het naar een vriend sturen? Zo niet, herschrijf.

## Wat een goede video is (feedback van Arno)

- **Hook in de eerste 3 seconden**: een verrassend contrast of getal, meteen in beeld. Geen intro, geen "did you know".
- **Snel tempo**: korte zinnen (maximaal ca. 15 woorden), elk segment toont iets nieuws.
- **Nooit een leeg scherm**: elke scene heeft vanaf het begin iets in beeld; `at` laat het grote getal inslaan op het gesproken woord.
- **Echte inhoud, geen slop**: elk getal met bron, één duidelijke conclusie, een verrassende wending in het midden.
- **Einde**: een vraag + `"Follow for more money, mapped."` als laatste segment (scene `outro`).

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
