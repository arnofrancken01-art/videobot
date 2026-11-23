# Brein: zo schrijft Claude een nieuwe video

Kanaal: **Money, Mapped**. Korte video's (15 tot 25 seconden) over geld en de wereld, gebouwd op echte data.
Taal van de video's: Engels. Doelgroep: iedereen die trots is op zijn land of wil weten hoe het zich meet met een ander: de VS, maar net zo goed
India, de Filipijnen, Nigeria, Brazilië, Pakistan, Indonesië en Mexico. Die landen hebben een enorm publiek dat reageert en deelt.

## Werkwijze per run

1. `git pull`. Lees **eerst `state/insights.md`** (wat bij ons werkt per format, land, hook en uur; automatisch bijgewerkt),
   dan `state/stats.json` (onze eigen cijfers), `state/trends.json` (wat NU viraal gaat in onze niche),
   `data/catalog.json`, `state/queue.json` en de titels in `episodes/`.
2. **Leer eerst** (schrijf voor jezelf 3 regels op):
   - Welke 2 eigen video's scoorden het best (views, `avg_view_pct`) en wat hadden ze gemeen? Welke 2 flopten?
   - Welke 5 titels in `trends.json` (vooral `outliers_small_channels`: kleine kanalen met veel views, daar trekt het
     ONDERWERP) passen bij onze data? Welk patroon zit erin (raadspel, rivaliteit tussen twee landen, vlaggen,
     "this country...", extreem getal)? Neem het patroon over, nooit de video zelf.
3. **Schrijf drie kandidaten** (elk: titel + eerste gesproken zin + eerste beeld + format), over drie verschillende
   onderwerpen. Geef elk een score van 1 tot 10 op deze vier vragen en kies de hoogste som:
   - Stopt een scroller binnen 1 seconde? (herkenbaar land/vlag, vraag aan de kijker, schokkend getal in beeld)
   - Wil de kijker het antwoord weten voor hij verder kan? (open lus, raden)
   - Voelt de kijker zich aangesproken? (zijn land, zijn loon, zijn prijzen, trots of verontwaardiging)
   - Lokt het een reactie uit? (mensen verdedigen hun land, zijn het oneens, geven hun eigen cijfer)
   Is de beste som lager dan 28, bedenk dan drie nieuwe. Een middelmatige video schaadt het kanaal: YouTube toont de
   volgende dan aan minder mensen.
4. Haal de cijfers **alleen** uit de bestanden in `data/` (lees ze met Python). Verzin nooit een getal. Kies het meest
   recente jaar met data voor alle landen in de vergelijking en noem dat jaar.
5. Schrijf `episodes/epNNN.json` (volgend nummer, drie cijfers) met een format dat anders is dan de vorige twee.
6. Controleer: `python3 scripts/validate.py episodes/epNNN.json`. Los elke FOUT op.
7. Commit en push naar `main`. GitHub Actions maakt dan de video en stuurt hem naar Telegram ter goedkeuring.
8. Eindig met: het gekozen onderwerp, de drie scores, en welk trend-patroon je gebruikte.

## Drie video's per dag, één run om 4:41 (sinds 2026-11-23)

De ochtendrun schrijft **drie** afleveringen achter elkaar (stappen 2 tot 6 drie keer) en pusht ze in **één** commit. GitHub
Actions maakt ze dan alle drie en ze staan voor 6:30 in Telegram. Arno zet ze zelf openbaar op het uur in het veld `slot`
(Belgische tijd, staat in het Telegram-bericht). Elke aflevering krijgt een verplicht `slot`:

| slot | waarom dit uur | wat erin hoort |
|---|---|---|
| `"07:30"` | 12:00 in India, 11:30 Pakistan, 13:30 Indonesië: middagpauze in Zuid-Azië | het **experiment**: een ander land of format (Indonesia, Philippines, Bangladesh, Nigeria, Brazil, of de reeks "Your money there") |
| `"14:30"` | 19:00 in India: het drukste avonduur op mobiel | de **sterkste India-video** van de dag (India + rivaal, quiz of bubbles) |
| `"17:30"` | 22:00 India, 21:30 Pakistan, 11:30 New York | **Pakistan/Bangladesh in de hoofdrol**, of een deel 2 van een recente winnaar |

- De drie afleveringen hebben drie verschillende onderwerpen, drie verschillende landen in de hoofdrol en minstens twee
  verschillende formats en twee verschillende `hook_type`s. validate.py kijkt naar de vorige aflevering, dus schrijf ze in volgorde.
- Elke aflevering haalt zelf de score van 28. Liever twee sterke video's dan drie met één zwakke: lukt de derde echt niet,
  schrijf dan maar twee en zeg dat.
- Verwijder nooit een video om hem opnieuw te posten: YouTube ziet dat als spam.

## Wat de cijfers zeggen (stand 2026-11-16)

- Tot 13 november kreeg een nieuwe video 1 tot 12 views. Sinds de nieuwe look (14 november) is dat omgeslagen:
  - "America vs Japan: who lives better?" 78 en "China's economy was smaller than Spain's" 42: **de nieuwe look alleen is goed voor ca. 5 tot 10 keer meer**.
  - "India vs Pakistan: who is richer? 3 rounds" **410** en "India has more people than these 5 countries combined" **476** binnen
    één dag, met de eerste echte likes (8 en 4) en een kijker die vlaggen in de reacties zet. **India erbij is nog eens 5 tot 10 keer meer.**
- Wat de twee winnaars gemeen hebben, en wat elke video dus moet hebben:
  1. **India staat in de titel, op het eerste beeld en in de eerste gesproken zin.**
  2. Een **tegenstander** die Indiërs iets doet (Pakistan, China, of "vijf landen samen").
  3. Een **maatstaf die een kind snapt**: wie is rijker, wie heeft meer mensen, wie leeft langer.
  4. De titel is een **strijdvraag of een stoere bewering**, geen onderwerp.
  5. Het slot vraagt om een **kant te kiezen**, en kijkers antwoorden met hun vlag.
- Oudere lessen blijven gelden: één extreem getal + "this country" werkte (207 en 101 views), abstracte percentages van de
  economie flopten. Zoekverkeer (63 views) komt op titels met landnamen.
- In de niche gaan bij kleine kanalen viraal: "You Are Rich In This Country", "This Country Has a Very Weak Currency",
  "India vs Pakistan" vergelijkingen, "Which country has more ...?", vlaggen rangschikken, raad-het-land.

## India eerst (geldt tot de cijfers iets anders zeggen)

- **De video van 14:30 heeft India in de hoofdrol**, die van 17:30 Pakistan of Bangladesh (of een deel 2), die van 07:30 test een
  ander trots land met een groot publiek (Philippines, Indonesia, Nigeria, Brazil, Mexico, Turkey, Egypt) of de reeks "Your money there".
- Tegenstanders voor India, wissel ze af: Pakistan, China, Bangladesh, USA, UK (de oude kolonisator), Japan, Russia, Germany,
  "all of Europe", "these 5 countries combined". Nooit twee dagen na elkaar dezelfde tegenstander met dezelfde maatstaf.
- Maatstaven, van sterk naar zwak: bevolking, leger (`MS.MIL.TOTL.P1`, `MS.MIL.XPND.CD`), grootte van de economie, inkomen per persoon,
  reserves met goud (`FI.RES.TOTL.CD`), oppervlakte, export, internetgebruikers, levensverwachting, groei. Kijk in `data/catalog.json`
  wat er is; ontbreekt een bestand nog, neem dan een andere maatstaf.
- **Eerlijk blijven.** India mag verliezen op een maatstaf; een duel dat 2-2 of 3-1 eindigt lokt juist reacties uit. Verzin of
  verdraai nooit een cijfer om een land te laten winnen, en geen politiek, religie of oorlog: alleen cijfers.
- **Vervolg op een winnaar.** Heeft een video in `stats.json` minstens drie keer zoveel views als de mediaan van de laatste tien, maak
  dan binnen twee dagen een deel 2 met dezelfde landen en nieuwe maatstaven. Titel eindigt op "(Part 2)", en het slot van elk duel
  mag een volgend deel beloven ("Round five tomorrow.").
- **Titel**: begint met de landen en bevat hun vlag-emoji: "India 🇮🇳 vs Pakistan 🇵🇰: who is richer?". Max. 60 tekens.
- **Hashtags**: eerst de landen (`india`, `pakistan`), dan `indiavspakistan`-achtige combinatie, dan `geography` of `countrycomparison`.
- **Slot**: laat kiezen en vraag om de vlag: "India or Pakistan? Comment your flag."
- **Vertaling** (veld `localizations`): staat er een land in de hoofdrol waar men een andere taal spreekt, voeg dan titel en
  beschrijving in die taal toe. YouTube toont ze aan kijkers met die taalinstelling. India: `hi`, Pakistan: `ur`, Bangladesh: `bn`,
  Indonesia: `id`, Brazil: `pt`, Mexico en Argentina: `es`, Turkey: `tr`, Philippines: `fil`, Egypt: `ar`. Voorbeeld:
  `"localizations": {"hi": {"title": "भारत 🇮🇳 vs पाकिस्तान 🇵🇰: कौन ज़्यादा अमीर है?", "description": "भारत या पाकिस्तान? असली आंकड़े, तीन राउंड। अपना झंडा कमेंट करें।"}}`.
  Vertaal natuurlijk en kort (max. 60 tekens), dezelfde belofte als de Engelse titel, zelfde cijfers. De video zelf blijft Engels.

## Het eerste beeld (verplicht veld `headline`)

Twee op drie kijkers veegden weg in de eerste seconde. Daarom opent elke video nu met een schermvullend beeld: de vlaggen
van de eerste scene over het hele scherm en de `headline` in reuzenletters. Na een halve seconde schuift die kop naar boven
en blijft hij de hele video staan. Onderaan draait een wereldbol die naar elk land vliegt dat een `flag` heeft.

- `headline`: de vraag of belofte van de video, **maximaal 28 tekens**, met het sterkste woord tussen sterretjes (wordt geel):
  `"Who lives *better*?"`, `"$1 = *89,500* of this?"`, `"Guess the *country*"`, `"India or *Pakistan*?"`.
  Het moet een vraag zijn die de kijker zelf wil beantwoorden. Geen onderwerp ("Inflation 2025"), wel een uitdaging.
- `cover` (optioneel): `{"flags": ["in", "pk"], "vs": true}` kiest zelf de vlaggen van het eerste beeld. Zonder `cover` neemt de
  video de eerste twee vlaggen uit de eerste scene. Bij een raadsel waar het land geheim moet blijven: `{"flags": []}`
  (dan komt er een blauw beeld met alleen de vraag).
- De eerste gesproken zin zegt hetzelfde als de headline, in andere woorden, en begint meteen (geen "Did you know").

## De drie reeksen (hier zetten we op in)

Uit onze cijfers en uit wat bij kleine kanalen viraal gaat. **Vier op vijf video's** horen bij een van deze reeksen; de vijfde
mag een experiment met een ander format zijn. Kijk in `state/stats.json` welke reeks het best scoort en maak daar meer van.

1. **"Your money there"** (format `quiz`, `bubbles` of `choice`; nieuw sinds 2026-11-23, vervangt de countdown "This country...",
   die 8 keer een mediaan van 24 views haalde): wat jouw geld waard is in een ander land. Prijsniveau = `NY.GDP.PCAP.CD` gedeeld
   door `NY.GDP.PCAP.PP.CD` (VS = 1). "$100 in America buys what $26 buys in India." "In Pakistan your $100 feels like $400."
   Het grootste virale format buiten onze niche ("You are rich in this country"). Altijd met bekende landen en het jaar van de data.
   Geen top 5 countdown meer, tenzij `state/insights.md` laat zien dat hij weer werkt.
2. **Land tegen land** (format `battle`, `quiz` of `race`): twee rivalen met een groot, trots publiek en een simpele maatstaf.
   India vs Pakistan, India vs China, USA vs China, Philippines vs Indonesia, Nigeria vs South Africa, Brazil vs Argentina,
   Mexico vs USA, UK vs France, Japan vs South Korea, Turkey vs Greece. De titel begint met de twee landen.
3. **Raad het** (format `quiz`, `choice`, `truefalse`, `clues`): de kijker speelt mee en zet zijn score in de reacties.
   Altijd met een bekend land en een antwoord dat verrast.

Maatstaven die iedereen snapt winnen altijd: bevolking, loon, prijs van iets, wat je munt waard is, hoe lang je leeft.
De titel is maximaal 60 tekens en begint met de landen of het getal.

## Wat de cijfers per format zeggen (stand 2026-11-23, zie `state/insights.md` voor de actuele stand)

- **quiz** (47% blijft kijken, mediaan 1000 views) en **bubbles** (39%, 1053) zijn onze beste formats: neem bij twee van de drie
  video's een van deze twee. **battle** (27%) verliest te veel kijkers in het midden: alleen met maximaal 3 rondes en een
  verrassing in ronde 2. **countdown** (mediaan 24) niet meer.
- Ons grootste probleem is niet het onderwerp maar dat **twee op drie kijkers in de eerste seconden wegvegen** (33% blijft, sterke
  Shorts halen 70 tot 80%). Elke regel hieronder over de hook gaat voor op alle andere.

## Soort opening (verplicht veld `hook_type`)

Kies er één en wissel af (nooit drie keer dezelfde op een dag). Zo leert `state/insights.md` welke opening werkt.
- `claim`: een bewering waar de helft van de kijkers het mee oneens is. "Pakistan beats India in this one."
- `question`: een vraag die de kijker zelf wil beantwoorden. "India or the UK: who is richer now?"
- `number`: één schokkend getal in beeld en in de eerste zin. "One dollar. Eighty-nine thousand of this money."
- `you`: spreekt de portemonnee of het land van de kijker aan. "Your hundred dollars is worth four hundred here."
- `challenge`: daagt uit. "Only one in ten gets all three right." (alleen als het niet verzonnen is: liever "Get all three right?")

## Sticker op het eerste beeld (optioneel `cover.badge`)

Een rode schuine sticker onder de headline, max. 12 tekens, in hoofdletters: `"PART 2"`, `"3 ROUNDS"`, `"REAL DATA"`, `"GUESS IT"`.
Gebruik hem bij een deel 2 altijd, anders alleen als het de belofte sterker maakt.

## Nagebootst van de allerbeste Shorts (ontleding 2026-11-23)

We haalden de 400 best bekeken Shorts van het laatste jaar op, in onze niche en erbuiten, en bekeken er 35 beeld per beeld
(samen ruim 1,4 miljard views, vaak van kanalen met maar 2.000 tot 60.000 abonnees). Wat ze bijna allemaal doen:

1. **Eén beeld, één feit, heel kort.** "Bangladesh has more people than Russia" (7 s, 3,1 mln views, kanaal van 24k), "Countries
   richer and poorer than India" (7 s, 3,5 mln), "Most World Cups" (11 s, 13 mln bij 7k abonnees), "Cost per tank shot" (10 s,
   3,7 mln bij 2k). Het antwoord staat er bijna meteen; mensen kijken twee keer om alles te lezen, dus meer dan 100% kijktijd.
   **Maak daarom elke dag minstens één korte lus** (`worldsplit` of een `truesize` van 8 tot 15 s), het liefst in slot 07:30.
2. **Kaarten gevuld met vlaggen, op ware grootte.** "How big is Brazil" (Europese landen op Brazilië), "Moon vs countries",
   "Russia compared to Bangladesh": format `truesize`. Kies een groot land met een trots publiek (India, Brazil, Indonesia, Pakistan,
   Nigeria, USA, Australia) en leg er bekende kleinere landen op, van groot naar klein. Controleer met `AG.LND.TOTL.K2` dat wat je
   zegt klopt ("India is bigger than these five combined" alleen als de som van de vijf echt kleiner is).
3. **Escalatie.** Elk volgend item is groter of verrassender: "≈350 ants tall → the Sun → the universe", "$1 → $1 quadrillion",
   "GOOD GDP → GREAT GDP → GODLY GDP". Het laatste item is de klap ("And Italy STILL fits.").
4. **Een vaste kop bovenaan die zegt wat je ziet** ("SABSE SASTA COUNTRY", "COUNTRIES RICHER & POORER THAN INDIA"). Dat is onze
   `headline`: maak hem beschrijvend en kort, niet vaag.
5. **Prijs onthullen.** "How much does one tank shot cost?", "1 kg gold price in different countries", "Kurkure price in other
   countries", "Rs 43,000 jeans": een ding dat iedereen kent + een prijs per land. Past in "Your money there".
6. **Lokale munt en taal.** De grootste India-hits tonen bedragen in ₹ (lakh, crore) en hebben Hindi-tekst. Bij een India-video
   over geld: zeg het bedrag ook in rupees (koers `PA.NUS.FCRF`, schrijf "four lakh rupees", label met prefix "₹" en suffix
   " lakh" of " crore"), en vul altijd `localizations.hi` in.
7. **Rivaliteit + reactie.** India vs Pakistan/China blijft de sterkste motor (24 tot 54 mln views). Eindig met een kant kiezen.

## De vier harde regels

1. **De kijker staat centraal.** Kies iets wat een 18-35-jarige in de VS of Europa zelf voelt: lonen, prijzen, huur,
   werk, reizen, wat je geld waard is, wie rijker is. Geen droge begrotingscijfers ("% of GDP") tenzij je ze vertaalt
   naar iets tastbaars (dollars per persoon, aantal Big Macs, uren werk).
2. **Bekende landen.** Minstens de helft van de landen in beeld komt uit deze lijst, en de VS zit er bijna altijd bij
   als ijkpunt: USA, UK, Canada, Australia, Germany, France, Italy, Spain, Netherlands, Ireland, Switzerland, Sweden,
   Norway, Poland, Japan, South Korea, China, India, Brazil, Mexico, Turkey, Russia, Saudi Arabia, UAE, South Africa,
   Nigeria, Egypt, Argentina, Indonesia, Philippines. Een onbekend land mag alleen als verrassing tussen bekende.
3. **Kort.** 10 tot 25 seconden, dus ca. 30 tot 65 gesproken woorden. Elke zin die geen nieuw beeld oplevert, gaat eruit.
4. **Afwisseling.** Het `format` mag niet hetzelfde zijn als dat van de vorige twee afleveringen (validate.py weigert het).
   Wissel ook de invalshoek: niet drie keer na elkaar "wie is rijker".

## Het einde loopt terug naar het begin (verplicht)

Shorts spelen vanzelf opnieuw af. De `outro` is daarom **één korte vraag (max. 8 woorden) die ook als aanloop naar
de eerste zin werkt**, zodat kijkers een tweede keer kijken zonder het te merken. Voorbeeld: eerste zin
"This country's money is almost worthless.", outro "Would your salary survive there?", en dan start de video opnieuw.
Zeg nooit "Follow for more": dat is het sein om weg te vegen. De vraag dient ook als reactie onder de video.

## De hook (eerste 2 seconden beslissen alles)

- Spreek de kijker aan of zet hem voor een keuze: "Japan or Spain. Who is richer?", "Twenty dollars. How many Big Macs?",
  "In 1990, China was smaller than Italy."
- Vanaf frame 1 staat er iets groots in beeld (twee vlaggen, een getal, een icoon). Nooit een inleiding.
- Eerste zin maximaal 10 woorden. Schrijf drie hooks en kies de sterkste.
- Het **antwoord of de clou zit in de eerste 3 seconden in beeld of belofte**: de kijker weet meteen waar hij op wacht
  ("Who wins in 3 rounds?"), en elke 2 tot 3 seconden verandert er iets (nieuw getal, vlag, balk, geluid).
- Sterk contrast werkt het best: een land dat iedereen arm denkt dat wint, een groot land dat verliest, een getal dat 10 keer
  groter is dan je denkt. Alleen met echte cijfers.
- De titel belooft hetzelfde als de hook en noemt een bekend land ("Japan or Spain: who is richer per person?").
  Geen verzonnen beweringen zoals "99% gets this wrong".

## Formats (kies er één per aflevering, veld `format`)

| format | Wat het is | Opbouw |
|---|---|---|
| `quiz` | Raadspel: twee landen, timer, onthulling. 2 of 3 rondes. Kijkers spelen mee en zetten hun score in de reacties. | `quiz` (vraag + `pause`) → `quiz` (`reveal`) → ... → `outro` ("How many did you get?") |
| `race` | Balkenrace door de tijd: landen halen elkaar in terwijl het jaartal oploopt. | `hook` → 2 tot 4 × `race` → evt. `bignumber` → `outro` |
| `story` | Eén verrassend feit, tastbaar gemaakt met pictogrammen, een vergelijking of een lijn. | `grid` of `hook` → `grid` / `versus` / `line` / `bignumber` → `outro` |
| `countdown` | Top 3 (liefst) of top 5 aftelling. Alleen met bekende landen en een nummer 1 dat verrast. | `hook` → `rank` 3, 2, 1 → evt. 1 wending → `outro` |

| `truefalse` | Waar of niet waar: een stelling, timer, stempel TRUE/FALSE met het echte cijfer. 1 tot 3 stellingen. | `truefalse` (stelling + `pause`) → `truefalse` (`reveal`) → ... → `outro` |
| `choice` | Meerkeuzevraag A/B/C met timer ("How much is a Big Mac in Switzerland?"). 1 of 2 vragen. | `choice` (vraag + `pause`) → `choice` (`reveal`) → `outro` |
| `clues` | Raad het land: 3 aanwijzingen slaan in, timer, de vlag draait om. | 3 × `clues` (clue) → `clues` (`reveal`) → `outro` |
| `thennow` | Toen en nu: twee zuilen, de tweede groeit en toont het verschil ("14.5x"). 1 tot 3 paren. | `thennow` → `thennow` (`reveal`) → `outro` |
| `dots` | 100 bolletjes: "als de wereld 100 dollar / 100 mensen was". | 3 tot 5 × `dots` → `outro` |
| `podium` | Brons, zilver, goud stijgen op met vlag en getal. | 3 × `podium` (place 3, 2, 1) → `outro` |
| `battle` | Duel tussen twee bekende landen over 3 of 4 cijfers, met scorebord. | 3 of 4 × `battle` → `outro` |
| `ticker` | Live tellers die echt meelopen: "since you started watching, America earned...". | 2 of 3 × `ticker` → `outro` |
| `receipt` | Kassabon op wit papier: regels worden geprint, eventueel een totaal. | 3 tot 5 × `receipt` → `outro` |
| `bubbles` | Bellen waarvan de oppervlakte het getal is; ze ploppen een voor een op. | 3 of 4 × `bubbles` → `outro` |
| `truesize` | Landen op ware grootte, gevuld met hun vlag, vallen een voor een op een groot land. | 1 × `truesize` met `base`, 2 tot 7 × met `item` → `outro` (8 tot 20 s) |
| `worldsplit` | De hele wereld kleurt in twee kleuren rond één land. Eén beeld, één feit, een lus van 5 tot 12 s. | 1 × `worldsplit` → `outro` |

Er zijn dus **14 formats**. Gebruik ze allemaal: kijk in `episodes/` welke formats de laatste 10 afleveringen hadden en kies er een
dat past bij de reeks die je kiest (zie "De drie reeksen"), en nooit hetzelfde als de vorige aflevering.
Bedenk gerust een nieuwe invalshoek binnen een format. Creativiteit mag, zolang elk getal uit `data/` komt.

Regels voor de tekst:
- **Stem:** korte, volledige zinnen die op een punt eindigen. Geen dubbelpunten of komma-opsommingen (de stem gaat dan omhoog).
  Alleen een echte vraag eindigt op "?".
- **Zeg de landnaam letterlijk zoals in `label`**: het beeld slaat in op dat woord. Gewone Engelse namen ("Turkey", niet "Turkiye").
- **Eerlijk:** bij een quiz moet het antwoord ondubbelzinnig uit de data volgen. Is het verschil kleiner dan 1%, zeg dat erbij ("by just twenty-seven dollars").
  Geef waar het kan in vijf woorden de reden ("Big tech books its profits there.").
- **Outro:** één korte vraag die reacties uitlokt (zie hierboven). Ze komt groot in beeld met "Comment your answer". Nooit "Follow for more".
- **Wereldkaart** (`"map": true` in het eerste rank-segment): alleen bij een countdown met landen op verschillende continenten.

## Muziek

Er zijn vier muziekjes (`public/sfx/bed1.mp3` tot `bed4.mp3`); het nummer van de aflevering kiest er vanzelf een, zodat ze afwisselen.
Wil je er zelf een kiezen, zet dan `"music": 1` (rustig, 110 bpm), `2` (vrolijk, 124 bpm), `3` (traag en zwaar, 92 bpm, past bij
raadsels en geldcrashes) of `4` (snel en gespannen, 128 bpm, past bij duels) in de aflevering.

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
 "slot": "14:30",
 "hook_type": "question",
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

**truefalse**: stelling (max. 70 tekens) met `answer` (true/false), `fact` (het echte cijfer, kort) en `pause`; daarna een reveal-segment dat begint met "True." of "False.".
```json
{"scene":"truefalse","text":"True or false? A Big Mac costs more in Mexico than in America.","props":{"statement":"A Big Mac costs more in Mexico than in America","answer":true,"fact":"Mexico $6.27 · USA $6.22","flag":"mx","pause":1.6}}
{"scene":"truefalse","text":"True. By five cents.","props":{"reveal":true}}
```

**choice**: `options` = 3 korte teksten, `answer` = index (0, 1 of 2), optioneel `flag` en `fact`. Lees de drie opties voor in de vraag.
```json
{"scene":"choice","text":"How much does one Big Mac cost in Switzerland? Five, seven or nine dollars?","props":{"question":"One Big Mac in Switzerland?","options":["$5","$7","$9"],"answer":2,"flag":"ch","fact":"$9.04. In the US it's $6.22","pause":1.8}}
{"scene":"choice","text":"Nine dollars. The most expensive Big Mac on Earth.","props":{"reveal":true}}
```

**clues**: elke aanwijzing is een segment met `clue` {label, value als tekst}; de laatste aanwijzing krijgt `pause`. Kies een bekend land en ga van vaag naar duidelijk.
```json
{"scene":"clues","text":"Guess the country. It has a hundred twenty-three million people.","props":{"title":"Guess the country","clue":{"label":"Population","value":"123 million"},"at":"hundred"}}
{"scene":"clues","text":"And a Big Mac costs just three dollars.","props":{"clue":{"label":"Big Mac","value":"$3.08"},"at":"three","pause":1.8}}
{"scene":"clues","text":"It's Japan.","props":{"reveal":true,"label":"Japan","flag":"jp"}}
```

**thennow**: `then` en `now` elk {year, value}; het verschil-etiket wordt zelf berekend. `"good": false` kleurt een stijging rood (bv. prijzen), `true` groen.
```json
{"scene":"thennow","text":"In 2015, one dollar got you under three Turkish lira. Guess what it gets you now.","props":{"label":"$1 in Turkish lira","flag":"tr","then":{"year":2015,"value":2.72},"now":{"year":2025,"value":39.45},"format":{"decimals":1},"good":false}}
{"scene":"thennow","text":"Thirty-nine. The lira lost over ninety percent of its value.","props":{"reveal":true}}
```

**dots**: eerste segment bevat `title` en alle `parts` (counts samen precies 100, reken af met Python en zet de rest in "Everyone else"); elk segment kleurt één `part` in op het woord `at`.
```json
{"scene":"dots","text":"Imagine the whole world economy is one hundred dollars. America holds twenty-six of them.","props":{"title":"The world economy as $100","parts":[{"label":"USA","count":26,"flag":"us"},{"label":"China","count":17,"flag":"cn"},{"label":"Everyone else","count":57}],"part":"USA","at":"twenty"}}
{"scene":"dots","text":"China has seventeen.","props":{"part":"China","at":"seventeen"}}
```

**podium**: drie segmenten met `place` 3, 2, 1; het eerste bevat `title` en `format`. Zeg de landnaam letterlijk.
```json
{"scene":"podium","text":"Where is the most expensive Big Mac on Earth? Bronze goes to Norway. Eight dollars.","props":{"title":"Most expensive Big Mac","format":{"prefix":"$","decimals":2},"place":3,"label":"Norway","flag":"no","value":8.05}}
```

**battle**: eerste segment bevat `a` en `b` (label, flag); elk segment een `stat` {label, a, b, format, optioneel "pick":"lower" als lager wint}. Zeg de winnaar op het woord `at`.
```json
{"scene":"battle","text":"America against China. Four rounds. Size of the economy? America wins.","props":{"a":{"label":"USA","flag":"us"},"b":{"label":"China","flag":"cn"},"stat":{"label":"Economy","a":30.8,"b":19.5,"format":{"prefix":"$","suffix":"T","decimals":1}},"at":"America"}}
```

**ticker**: elke `item` heeft `perSecond` (jaarcijfer gedeeld door 31,557,600); de teller loopt echt mee met de video. Begin de video met deze scene.
```json
{"scene":"ticker","text":"Since this video started, America's economy made this much money.","props":{"title":"Since you started watching","format":{"prefix":"$"},"item":{"label":"America earned","flag":"us","perSecond":975033},"at":"America"}}
```

**receipt**: eerste segment `title` en `format`; elk segment een `line` {label, value, flag} of op het einde een `total` {label, value} (alleen als optellen zin heeft).
```json
{"scene":"receipt","text":"Same burger, four countries. In India it costs two forty-five.","props":{"title":"One Big Mac, please","format":{"prefix":"$","decimals":2},"line":{"label":"India","value":2.45,"flag":"in"},"at":"India"}}
```

**truesize**: eerste segment `title` en `base` {flag, label} (het grote land); daarna elk segment één `item` {flag, label}
met `at` = het woord waarop het land valt. Leg landen van groot naar klein, 3 tot 6 stuks. De kaart toont ware grootte
(vlakketrouwe projectie), dus beweer alleen wat ook in `AG.LND.TOTL.K2` klopt.
```json
{"scene":"truesize","text":"India is huge. Watch this.","props":{"title":"True size: India","base":{"flag":"in","label":"India"}}},
{"scene":"truesize","text":"France.","props":{"item":{"flag":"fr","label":"France"},"at":"france"}}
```

**worldsplit**: één segment met `title`, `ref` {flag, label}, `legend` {above, below} en de lijsten `above` en `below` uit
`python3 scripts/make_split.py <land> <indicator> [jaar]` (plak de JSON-uitvoer). `at` = het woord waarop de kleuren verschijnen.
Zeg het getal hardop ("Only five countries have a bigger economy than India."). Dan meteen de `outro`.
```json
{"scene":"worldsplit","text":"Only five countries have a bigger economy than India.","props":{"title":"Bigger economy than India?","ref":{"flag":"in","label":"India"},"legend":{"above":"Bigger than India","below":"Smaller than India"},"above":["cn","de","gb","jp","us"],"below":["..."],"at":"five"}}
```

**bubbles**: eerste segment `title` en `format`; elk segment een `item` {label, flag, value}. Begin met de grootste. Werkt het best als de grootste minstens 3 keer de kleinste is.
```json
{"scene":"bubbles","text":"This is America's economy. Thirty-one trillion dollars.","props":{"title":"Size of the economy","format":{"prefix":"$","suffix":"T","decimals":1},"item":{"label":"USA","flag":"us","value":30.8},"at":"America"}}
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

**outro**: `{"scene":"outro","text":"How many did you get?","props":{}}`

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
