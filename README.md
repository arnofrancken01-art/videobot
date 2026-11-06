# Videobot: Money, Mapped

Automatische korte video's met echte data (niche: geld en de wereld in data).

## Hoe een video ontstaat
1. `episodes/epXXX.json`: script, data en bron per video (later door Claude geschreven).
2. `npm run voice -- episodes/ep001.json`: Kokoro-stem + tijdlijn (`src/timeline.json`).
3. `npm run render`: Remotion maakt `out/video.mp4` (1080x1920).

## Eerste keer
```
npm install
pip install -r requirements.txt
npm run models
```
