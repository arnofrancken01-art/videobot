"""Telegram-hulpmiddelen voor de videobot.
  python scripts/telegram.py setup            -> zoekt jouw chat-id en bewaart hem in config/telegram.json
  python scripts/telegram.py send "tekst"     -> stuurt een bericht
  python scripts/telegram.py video pad.mp4 "bijschrift"  -> stuurt een video
Token komt uit de omgevingsvariabele TELEGRAM_BOT_TOKEN (GitHub-secret).
"""
import json, os, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
CFG = ROOT / "config/telegram.json"
TOKEN = os.environ["TELEGRAM_BOT_TOKEN"].strip()
API = f"https://api.telegram.org/bot{TOKEN}"


def chat_id():
    return json.loads(CFG.read_text())["chat_id"]


def call(method, **kw):
    r = requests.post(f"{API}/{method}", timeout=120, **kw)
    data = r.json()
    if not data.get("ok"):
        raise SystemExit(f"Telegram-fout bij {method}: {data.get('description')}")
    return data["result"]


def setup():
    updates = call("getUpdates")
    chats = [u["message"]["chat"] for u in updates if "message" in u and u["message"]["chat"]["type"] == "private"]
    if not chats:
        raise SystemExit("Geen bericht gevonden. Stuur je bot eerst een bericht in Telegram en probeer opnieuw.")
    chat = chats[-1]
    CFG.parent.mkdir(exist_ok=True)
    CFG.write_text(json.dumps({"chat_id": chat["id"], "name": chat.get("first_name", "")}, indent=1))
    print(f"Chat gevonden voor {chat.get('first_name', '')}")


def send(text):
    call("sendMessage", data={"chat_id": chat_id(), "text": text, "parse_mode": "HTML"})


def video(path, caption=""):
    with open(path, "rb") as f:
        call("sendVideo", data={"chat_id": chat_id(), "caption": caption, "parse_mode": "HTML", "supports_streaming": "true"}, files={"video": f})


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "setup":
        setup()
    elif cmd == "send":
        send(sys.argv[2])
    elif cmd == "video":
        video(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
