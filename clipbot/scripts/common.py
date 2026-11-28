"""Gedeelde hulpmiddelen van de clipbot (paden, instellingen, Telegram)."""
import json, os, re
from pathlib import Path
import requests

CLIP = Path(__file__).resolve().parent.parent          # clipbot/
ROOT = CLIP.parent                                     # repo
WORK = CLIP / "work"
PUB = CLIP / "public"
STATE = CLIP / "state"


def load(path, default=None):
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else default


def save(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, indent=1, ensure_ascii=False))


def settings():
    return load(CLIP / "config/settings.json")


def allowlist():
    return {s["login"].lower(): s for s in load(CLIP / "config/streamers.json", {"streamers": []})["streamers"] if s.get("login")}


# --- Telegram: een EIGEN bot voor de clipbot (niet die van Money, Mapped, want maar één programma mag knoppen van een bot lezen) ---
def _api():
    tok = os.environ.get("CLIPBOT_TELEGRAM_TOKEN", "").strip()
    if not re.fullmatch(r"\d+:[\w-]{30,}", tok):
        return None
    return f"https://api.telegram.org/bot{tok}"


def chat_id():
    # In een privéchat is de chat-id gelijk aan je Telegram-gebruikers-id: dezelfde als bij de eerste bot.
    return os.environ.get("CLIPBOT_CHAT_ID") or load(ROOT / "config/telegram.json")["chat_id"]


def tg(method, files=None, **data):
    api = _api()
    if not api:
        print(f"[geen CLIPBOT_TELEGRAM_TOKEN] {method}: {str(data.get('text') or data.get('caption') or '')[:300]}")
        return None
    r = requests.post(f"{api}/{method}", data=data, files=files, timeout=300).json()
    if not r.get("ok"):
        raise RuntimeError(f"Telegram {method}: {r.get('description')}")
    return r["result"]


def send(text):
    for i in range(0, len(text), 3900):  # Telegram: max 4096 tekens per bericht
        tg("sendMessage", chat_id=chat_id(), text=text[i:i + 3900], parse_mode="HTML", disable_web_page_preview="true")


def send_video(path, caption, key=None):
    data = {"chat_id": chat_id(), "caption": caption[:1000], "parse_mode": "HTML", "supports_streaming": "true"}
    if key:
        data["reply_markup"] = json.dumps({"inline_keyboard": [[
            {"text": "Posten", "callback_data": f"ok:{key}"}, {"text": "Weg", "callback_data": f"no:{key}"}]]})
    with open(path, "rb") as f:
        return tg("sendVideo", files={"video": f}, **data)


def send_file(path, caption=""):
    with open(path, "rb") as f:
        return tg("sendDocument", files={"document": f}, chat_id=chat_id(), caption=caption[:1000], parse_mode="HTML")
