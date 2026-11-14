"""Weekrapport naar Telegram op basis van state/stats.json.
  python scripts/report.py"""
import html, json, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import telegram  # noqa: E402

s = json.loads((ROOT / "state/stats.json").read_text())
since = datetime.now(timezone.utc) - timedelta(days=7)
week = [v for v in s["videos"] if v["privacy"] == "public" and datetime.fromisoformat(v["published"].replace("Z", "+00:00")) >= since]
week.sort(key=lambda v: -v["views"])
line = lambda v: f"{v['views']} views · {v.get('format') or '?'} · {html.escape(v['title'][:60])}"
by = {}
for v in week:
    by.setdefault(v.get("format") or "?", []).append(v["views"])
fmt = sorted(((sum(x) / len(x), k, len(x)) for k, x in by.items()), reverse=True)
msg = [f"<b>Weekrapport Money, Mapped</b>",
       f"Kanaal: {s['channel']['subscribers']} abonnees, {s['channel']['views']} views in totaal.",
       f"Deze week: {len(week)} video's openbaar, samen {sum(v['views'] for v in week)} views."]
if week:
    msg += ["", "<b>Beste 3</b>"] + ["• " + line(v) for v in week[:3]]
    msg += ["", "<b>Zwakste 3</b>"] + ["• " + line(v) for v in week[-3:]]
    msg += ["", "<b>Gemiddeld per soort</b>"] + [f"• {k}: {a:.0f} views ({n}x)" for a, k, n in fmt]
    msg += ["", f"De bot maakt komende week meer '{fmt[0][1]}' en minder '{fmt[-1][1]}'."]
telegram.send("\n".join(msg))
