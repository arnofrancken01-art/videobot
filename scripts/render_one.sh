#!/usr/bin/env bash
# Maak één aflevering: stem, timing, video, bewaren op de renders-branch, voorbeeld naar Telegram.
# Gebruik: bash scripts/render_one.sh episodes/ep040.json
set -euo pipefail
file="$1"; name=$(basename "$file" .json)
echo "::group::$name"
REQUIRE_EXACT_TIMING=1 python scripts/tts.py "$file"
python scripts/align.py
python scripts/fetch_images.py  # foto's voor scene photo + controle van de weetjes op Wikipedia
if [[ "$file" == long/* ]]; then
  # lange video (16:9): sterker samengedrukt zodat het bestand onder de 100 MB van GitHub blijft
  npx remotion render src/index.ts Short out/video.mp4 --concurrency=4 --crf=28
else
  npx remotion render src/index.ts Short out/video.mp4 --concurrency=2
fi
cp out/video.mp4 "/tmp/$name.mp4" && cp src/timeline.json "/tmp/$name.timeline.json"
here=$(git rev-parse HEAD)
git fetch -q origin renders:refs/remotes/origin/renders || true
git checkout -q -f -B renders origin/renders || git checkout -q -f --orphan renders
git rm -rfq --cached . >/dev/null 2>&1 || true
mkdir -p renders && cp "/tmp/$name.mp4" "/tmp/$name.timeline.json" renders/
git add renders && git commit -qm "Render $name"
for i in 1 2 3; do git push -q origin renders && break || { sleep 5; git pull -q --rebase origin renders || true; }; done
git checkout -q -f "$here"
git checkout -q -- src/timeline.json 2>/dev/null || true

title=$(python -c "import json,sys;print(json.load(open(sys.argv[1]))['title'])" "$file")
slot=$(python -c "import json,sys;print(json.load(open(sys.argv[1])).get('slot',''))" "$file")
send="/tmp/$name.mp4"; kind="Nieuwe video"
if [[ "$file" == long/* ]]; then
  kind="Nieuwe LANGE video (voorbeeld in lagere kwaliteit)"
  # Telegram neemt van een bot maximaal 50 MB aan: stuur een kleinere kopie ter controle.
  npx remotion ffmpeg -loglevel error -y -i "/tmp/$name.mp4" -vf scale=-2:540 -c:v libx264 -crf 31 -preset veryfast -c:a aac -b:a 64k out/preview.mp4 && send=out/preview.mp4
fi
plan=""; [ -n "$slot" ] && plan=$'\n'"<b>Openbaar zetten om $slot</b> (Belgische tijd)"
python scripts/telegram.py video "$send" "<b>$kind:</b> $title$plan" "$name"
echo "::endgroup::"
