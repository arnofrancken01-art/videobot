# Clipbot: dagelijkse GTA 6 top 5

Een tweede kanaal naast Money, Mapped. Elke ochtend (09:10 Brussel) zoekt de bot de meest bekeken GTA 6-clips van Twitch van de afgelopen 30 uur, kiest de 5 beste van **streamers die toestemming gaven**, en maakt er een verticale video van:

- haak: de beste seconden van #1 met "WAIT FOR #1"
- aftellen #5 → #1, stem zegt "Number three", clip even stiller
- per clip: rangnummer, naam van de streamer, twitch.tv-link (bronvermelding) en cliptitel
- grote ondertitels (max 3 woorden) van wat de streamer zegt, scheldwoorden gemaskeerd
- wazige achtergrond, Vice City-kleuren, SFX, eindscherm "new top 5 every day"

De video komt in Telegram (eigen bot) met **Posten / Weg**. Posten = privé-upload naar het nieuwe YouTube-kanaal; Arno zet hem zelf openbaar.

## Bestanden
- `config/streamers.json`: **toestemmingslijst**. Alleen deze streamers worden gebruikt.
- `config/settings.json`: aantal clips, lengte per clip, zoom, stem, geblokkeerde woorden (spoilers/ending/cutscene: Rockstar haalt die neer).
- `scripts/find.py`: Twitch API (of yt-dlp als reserve) → `work/picks.json`
- `scripts/prepare.py`: download, luidste stuk kiezen, verticaal, Whisper-ondertitels, Kokoro-stem → `remotion/timeline.json`
- `remotion/`: de opmaak (Remotion, compositie `Clips`)
- `scripts/approve.py` + `scripts/publish.py`: knoppen en privé-upload
- Workflows: `.github/workflows/clip-daily.yml` en `clip-poll.yml`. Raken Money, Mapped niet aan.
- Video's: branch `clip-renders`, map `clips/`.

## Testen
Pas `clipbot/TEST.txt` aan en push: de bot maakt een TEST-video die nooit gepost wordt.

## Secrets (GitHub → Settings → Secrets → Actions)
| Naam | Wat |
|---|---|
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | gratis app op dev.twitch.tv/console |
| `CLIPBOT_TELEGRAM_TOKEN` | nieuwe bot via @BotFather (stuur hem daarna één bericht) |
| `CLIPBOT_YOUTUBE_REFRESH_TOKEN` | login met het nieuwe kanaal, zelfde Google-app als Money, Mapped |
