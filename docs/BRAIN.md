# Brein: zo schrijft Claude een nieuwe video

Kanaal: **Money, Mapped**. Korte video's (15 tot 25 seconden) over geld en de wereld, gebouwd op echte data.
Taal van de video's: Engels. Doelgroep: nieuwsgierige 18-35-jarigen in de VS en Europa.

## Werkwijze per run

1. `git pull`. Lees `data/catalog.json`, `state/queue.json`, `state/stats.json` (als die bestaat) en de titels in `episodes/`.
2. Kies **één** onderwerp dat nog niet gedaan is en een **format dat anders is dan de vorige twee afleveringen** (zie hieronder). Gebruik `state/stats.json`: maak meer van wat goed scoort (views, kijkduur), minder van wat flopt.
3. Haal de cijfers **alleen** uit de bestanden in `data/` (lees ze met Python). Verzin nooit een getal. Kies het meest recente jaar met data voor alle landen in de vergelijking en noem dat jaar.
4. Schrijf `episodes/epNNN.json` (volgend nummer, drie cijfers).
5. Controleer: `python3 scripts/validate.py episodes/epNNN.json`. Los elke FOUT op.
6. Commit en push naar `main`. GitHub Actions maakt dan de video en stuurt hem naar Telegram ter goedkeuring.

## Waarom dit zo moet (cijfers van 2026-11-11)

Van de eerste video's bleef maar **34% kijken**; twee op drie veegden meteen weg. Een Short groeit pas boven ca. 70%.
Arno's opdracht: onderwerpen waarbij de kijker denkt "amai, dit gaat over mij", bekende landen, kortere video's,
een sterkere hook en **nooit twee keer na elkaar dezelfde soort video**.

## De vier harde regels

1. **De kijker staat centraal.** Kies iets wat een 18-35-jarige in de VS of Europa zelf voelt: lonen, prijzen, huur,
   werk, reizen, wat je geld waard is, wie rijker is. Geen droge begrotingscijfers ("% of GDP") tenzij je ze vertaalt
   naar iets tastbaars (dollars per persoon, aantal Big Macs, uren werk).
2. **Bekende landen.** Minstens de helft van de landen in beeld komt uit deze lijst, en de VS zit er bijna altijd bij
   als ijkpunt: USA, UK, Canada, Australia, Germany, France, Italy, Spain, Netherlands, Ireland, Switzerland, Sweden,
   Norway, Poland, Japan, South Korea, China, India, Brazil, Mexico, Turkey, Russia, Saudi Arabia, UAE, South Africa,
   Nigeria, Egypt, Argentina, Indonesia, Philippines. Een onbekend land mag alleen als verrassing tussen bekende.
3. **Kort.** 15 tot 25 seconden, dus ca. 40 tot 65 gesproken woorden. Elke zin die geen nieuw beeld oplevert, gaat eruit.
4. **Afwisseling.** Het `format` mag niet hetzelfde zijn als dat van de vorige twee afleveringen (validate.py weigert het).
   Wissel ook de invalshoek: niet drie keer na elkaar "wie is rijker".

## De hook (eerste 2 seconden beslissen alles)

- Spreek de kijker aan of zet hem voor een keuze: "Japan or Spain. Who is richer?", "Twenty dollars. How many Big Macs?",
  "In 1990, China was smaller than Italy."
- Vanaf frame 1 staat er iets groots in beeld (twee vlaggen, een getal, een icoon). Nooit een inleiding.
- Eerste zin maximaal 10 woorden. Schrijf drie hooks en kies de sterkste.
- De titel belooft hetzelfde als de hook en noemt een bekend land ("Japan or Spain: who is richer per person?").
  Geen verzonnen beweringen zoals "99% gets this wrong".

## Formats (kies er één per aflevering, veld `format`)

| format | Wat het is | Opbouw |
|---|---|---|
| `quiz` | Raadspel: twee landen, timer, onthulling. 2 of 3 rondes. Kijkers spelen mee en zetten hun score in de reacties. | `quiz` (vraag + `pause`) → `quiz` (`reveal`) → ... → `outro` ("How many did you get?") |
| `race` | Balkenrace door de tijd: landen halen elkaar in terwijl het jaartal oploopt. | `hook` → 2 tot 4 × `race` → evt. `bignumber` → `outro` |
| `story` | Eén verrassend feit, tastbaar gemaakt met pictogrammen, een vergelijking of een lijn. | `grid` of `hook` → `grid` / `versus` / `line` / `bignumber` → `outro` |
| `countdown` | Top 3 (liefst) of top 5 aftelling. Alleen met bekende landen en een nummer 1 dat verrast. | `hook` → `rank` 3, 2, 1 → evt. 1 wending → `outro` |

Richtlijn voor de mix over een week: ca. 4 × quiz, 4 × story, 3 × race, 3 × countdown.
Bedenk gerust een nieuwe invalshoek binnen een format (bv. quiz "hoger of lager dan Amerika?", story "wat 100 dollar uit 2000 nu waard is",
race "wie had de hoogste inflatie"). Creativiteit mag, zolang elk getal uit `data/` komt.

Regels voor de tekst:
- **Stem:** korte, volledige zinnen die op een punt eindigen. Geen dubbelpunten of komma-opsommingen (de stem gaat dan omhoog).
  Alleen een echte vraag eindigt op "?".
- **Zeg de landnaam letterlijk zoals in `label`**: het beeld slaat in op dat woord. Gewone Engelse namen ("Turkey", niet "Turkiye").
- **Eerlijk:** bij een quiz moet het antwoord ondubbelzinnig uit de data volgen. Is het verschil kleiner dan 1%, zeg dat erbij ("by just twenty-seven dollars").
  Geef waar het kan in vijf woorden de reden ("Big tech books its profits there.").
- **Outro:** maximaal 12 woorden: een korte vraag die reacties uitlokt + "Follow for more."
- **Wereldkaart** (`"map": true` in het eerste rank-segment): alleen bij een countdown met landen op verschillende continenten.

## Uploadtekst (voor zoveel mogelijk bereik)

Vul in elke episode ook in:
- `title`: max. 70 tekens, bekend land of vraag + nieuwsgierigheid, geen leugen.
- `topic`: 2-4 woorden voor de kop bovenaan de video ("Who is richer?").
- `description`: 1-2 zinnen: de vraag aan de kijker + dat het echte data is.
- `hashtags`: 4 stuks, eerst het onderwerp, dan #money, #economy en één specifieke (#quiz, #top3, #dataviz). `#shorts` komt er automatisch bij.
- `tags`: 6-10 zoekwoorden die mensen echt intypen, met de landnamen.

## Wat een goede video is (feedback van Arno)

- **Snel tempo**: korte zinnen (max. ca. 12 woorden), elk segment toont iets nieuws.
- **Nooit een leeg scherm**: elke scene heeft vanaf het begin iets in beeld.
- **Echte inhoud, geen slop**: elk getal uit `data/`, met bron, en een verrassing op het einde.
- **Visueel sterk**: vlaggen bij elk land, één scene-type per idee, niet meer dan 3 verschillende scenes per video.

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
 "format": "quiz",
 "segments": [ { "scene": "...", "text": "Wat de stem zegt.", "props": { } } ]
}
```

Regels voor `text`: getallen voluit schrijven zoals je ze uitspreekt ("nine dollars", "sixty-two percent", "two thirty-eight"); jaartallen mogen als cijfers. Interpunctie bepaalt de captions (een leesteken sluit een caption-blok af).

### Scenes

**quiz** (raadspel): een ronde = een vraag-segment + een reveal-segment. Het eerste segment bevat `format`.
`pause` is de denktijd in seconden (1.2 tot 2.5): de timer tikt af, daarna licht de winnaar groen op en tellen de getallen op.
Winnaar = hoogste `value` (of laagste met `"pick": "lower"`).
```json
{"scene":"quiz","text":"Three rounds. Which country is richer per person? Japan or Spain?","props":{"question":"Who is richer per person?","format":{"prefix":"$"},"options":[{"label":"Japan","flag":"jp","value":35951},{"label":"Spain","flag":"es","value":38627}],"pause":1.6}}
{"scene":"quiz","text":"Spain. By almost three thousand dollars.","props":{"reveal":true}}
{"scene":"quiz","text":"Round two. China or Mexico?","props":{"question":"Who is richer per person?","options":[{"label":"China","flag":"cn","value":13862},{"label":"Mexico","flag":"mx","value":13889}],"pause":1.6}}
{"scene":"quiz","text":"Mexico. By just twenty-seven dollars.","props":{"reveal":true}}
```
Begin het reveal-segment met de naam van de winnaar. Bewaar de grootste verrassing voor de laatste ronde.

**race** (balkenrace): het eerste segment bevat alle data; `years` en per land evenveel `values` (haal ze met Python uit `data/`, alle jaren).
`show` = aantal zichtbare balken (5 of 6), `focus` = het land waar het verhaal om draait (groen). Elk segment kan `to` krijgen:
het jaar waarop de race staat als die zin gedaan is, zodat stem en beeld gelijk lopen. Het laatste segment eindigt op het laatste jaar.
```json
{"scene":"race","text":"Japan is number two. China is not even on the board.","props":{"title":"Biggest economies","format":{"prefix":"$","suffix":"T","decimals":1},"years":[1990,1991],"focus":"China","show":6,"to":1998,"items":[{"label":"United States","flag":"us","values":[5.963,6.158]}]}}
{"scene":"race","text":"In 2010, it passes Japan.","props":{"to":2010}}
```

**grid** (pictogram, "zoveel krijg je voor..."): per segment een rij icoontjes die een voor een inploppen op het woord `at`. 2 tot 4 rijen,
`count` is een geheel getal van 1 tot 36. Iconen: `burger`, `coin`, `house`, `clock`, `globe`.
```json
{"scene":"grid","text":"Twenty dollars. In Switzerland, that buys you two Big Macs.","props":{"title":"What $20 buys in Big Macs","icon":"burger","row":{"label":"Switzerland","flag":"ch","count":2},"at":"two"}}
{"scene":"grid","text":"In America, you get three.","props":{"row":{"label":"United States","flag":"us","count":3},"at":"three"}}
```

**rank** (de aftelling, 3 of 5 opeenvolgende segmenten): eerste segment bevat `title` en `format`; elk segment `rank`, `label`, `value`, `flag`.
```json
{"scene":"rank","text":"Number three is Germany. Sixty thousand dollars.","props":{"title":"Richest big countries, 2025","format":{"prefix":"$"},"rank":3,"label":"Germany","value":60496,"flag":"de"}}
```

**hook** (opening van race, countdown en vaak story): de claim staat er vanaf frame 1.
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

**outro**: `{"scene":"outro","text":"How many did you get? Follow for more.","props":{}}`

`format` velden: `prefix`, `suffix`, `decimals`. Grote bedragen liever omrekenen naar duizenden of miljarden met een duidelijke suffix (bv. `{"prefix":"$","suffix":"k"}`).

## Onderwerpideeën (herkenbaar, bekende landen)

- Quiz: wie is rijker per persoon / waar is het leven duurder (Big Mac) / waar leven mensen langer / wie heeft meer inwoners
- Quiz "hoger of lager dan Amerika": werkloosheid, inflatie, levensverwachting, internetgebruik
- Story: wat 20 dollar aan Big Macs koopt per land; hoeveel een dollar waard is in lira, yen of peso, toen en nu
- Story: je loon reikt hier dubbel zo ver (GDP per persoon gewoon vs PPP)
- Story: prijzen in jouw land sinds 2000 of 2020 (consumentenprijsindex, lijn)
- Race: grootste economieën, rijkste landen per persoon, grootste bevolking (India haalt China in), meeste toeristen
- Countdown top 3: duurste Big Mac, hoogste jeugdwerkloosheid in Europa, oudste bevolking, minste kinderen per vrouw
- Kijk in `data/catalog.json`: daar staan ook geboortes per vrouw, 65-plussers, toerisme, beurswaarde, rente, moorden, stroomverbruik (zodra opgehaald)

## Skills

De officiële Remotion-skills staan in `.agents/skills/` (gekoppeld in `.claude/skills/`). Lees `remotion-best-practices` voordat je iets aan de scenes in `src/` verandert. Voor een gewone aflevering (alleen `episodes/epNNN.json`) zijn ze niet nodig.
