# Lange video: één keer per week (vrijdag)

Doel: een liggende video (16:9) van 3 tot 6 minuten die langer bekeken wordt dan een Short en per view veel meer opbrengt.
Hij gebruikt dezelfde scenes als de Shorts: links de scene, rechts de wereldbol die naar elk land vliegt, bovenaan het hoofdstuk.

## Werkwijze per run

1. `git pull`. Lees `docs/BRAIN.md` (stijl- en eerlijkheidsregels gelden ook hier), `state/stats.json`, en de bestaande `long/*.json`.
2. **Kies het onderwerp uit de cijfers**: neem het land of de rivaliteit van de best scorende Shorts van de voorbije week en maak daar
   de grote versie van. De eerste was "India vs the World". Volgende ideeën: "India vs Pakistan: 20 rounds", "China vs USA: 20 rounds",
   "Which country wins? The G20 tournament", "Pakistan vs the World", "Every country India has passed since 1990" (met `race`).
   Herhaal nooit een bestaande lange video.
3. Maak een geraamte met echte cijfers:
   `python3 scripts/make_long.py IND "India" in PAK,CHN,USA,GBR,JPN,RUS,BGD,DEU long/lvNNN.json`
   (thuisland, naam, vlag, tegenstanders, uitvoer). Het script kiest per ronde het meest recente jaar met data voor beide landen.
4. **Herschrijf het geraamte tot een goede video.** Het script geeft correcte maar droge zinnen. Jij maakt er een verhaal van:
   - Opening (eerste 15 seconden): zeg wat de kijker krijgt en waarom hij moet blijven ("One of these battles ends four to zero. Guess which.").
   - 6 tot 8 hoofdstukken. Elk hoofdstuk begint met een segment met prop `chapter` (bv. `"India vs *China*"`): dat wordt de kop en
     een klikbaar hoofdstuk op YouTube. Een duel is `battle` (eerste segment met `a` en `b`, dan 4 of 5 rondes met `stat`, dan de uitslag).
   - **Wissel af**: niet acht keer hetzelfde duel. Zet er minstens twee andere hoofdstukken tussen: een `race` (balkenrace door de tijd),
     `bubbles`, `rank` (top 3 of 5, eerste segment met `title`), `thennow` of een `quiz` waar de kijker meeraadt.
   - Geef bij verrassende cijfers één zin uitleg ("Japan is shrinking. India adds a new Australia every two years.").
   - Hou de stand bij en zeg hem na elk hoofdstuk. Slot: eindstand + één vraag ("Which country should India face next?").
   - Controleer elk getal dat je toevoegt of verandert met Python tegen `data/`. Verzin niets. Geen politiek, religie of oorlog.
5. Velden: `"long": true`, `id`, `title` (max. 70 tekens, landen + belofte, met vlag-emoji), `headline` (max. 28 tekens, sterretjes rond
   het gele woord), `cover.flags`, `description` (2 tot 3 zinnen), `tags`, `hashtags`, `source`, `localizations` (zie BRAIN), `segments`.
   Mik op 450 tot 800 gesproken woorden (3 tot 5 minuten).
6. `python3 scripts/validate.py long/lvNNN.json` tot er geen FOUT meer is.
7. Commit en push naar `main`. GitHub Actions rendert (duurt 20 tot 40 minuten), stuurt Arno een voorbeeld in Telegram en zet de video
   na zijn akkoord privé op YouTube. Hoofdstukken met tijdstip komen vanzelf in de beschrijving.
8. Eindig met: onderwerp, aantal hoofdstukken, geschatte lengte.
