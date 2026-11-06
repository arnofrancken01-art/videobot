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
import re
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
if not TOKEN:
    raise SystemExit("TELEGRAM_BOT_TOKEN is leeg: het GitHub-secret bestaat niet of heeft een andere naam.")
if not re.fullmatch(r"\d+:[\w-]{30,}", TOKEN):
    raise SystemExit(f"TELEGRAM_BOT_TOKEN heeft niet de vorm 123456:ABC... (lengte {len(TOKEN)}, bevat ':' = {':' in TOKEN}).")
API = f"https://api.telegram.org/bot{TOKEN}"


def chat_id():
    return json.loads(CFG.read_text())["chat_id"]


def call(method, **kw):
    r = requests.post(f"{API}/{method}", timeout=120, **kw)
    data = r.json()
    if not data.get("ok"):
        raise SystemExit(f"Telegram-fout bij {method}: {data.get('description')}")
    return data["result"]


def setup(wait_s=900):
    import time
    deadline = time.time() + wait_s
    while True:
        updates = call("getUpdates")
        chats = [u["message"]["chat"] for u in updates if "message" in u and u["message"]["chat"]["type"] == "private"]
        if chats or time.time() > deadline:
            break
        time.sleep(10)
    if not chats:
        raise SystemExit("Geen bericht gevonden. Stuur je bot eerst een bericht in Telegram en probeer opnieuw.")
    chat = chats[-1]
    CFG.parent.mkdir(exist_ok=True)
    CFG.write_text(json.dumps({"chat_id": chat["id"], "name": chat.get("first_name", "")}, indent=1))
    print(f"Chat gevonden voor {chat.get('first_name', '')}")


def send(text):
    call("sendMessage", data={"chat_id": chat_id(), "text": text, "parse_mode": "HTML"})


def video(path, caption="", episode=None):
    data = {"chat_id": chat_id(), "caption": caption, "parse_mode": "HTML", "supports_streaming": "true"}
    if episode:  # knoppen om goed te keuren of te weigeren
        data["reply_markup"] = json.dumps({"inline_keyboard": [[
            {"text": "Posten", "callback_data": f"ok:{episode}"},
            {"text": "Weg", "callback_data": f"no:{episode}"},
        ]]})
    with open(path, "rb") as f:
        call("sendVideo", data=data, files={"video": f})


def poll():
    """Verwerk knopdrukken: zet de status van elke aflevering in state/queue.json."""
    q_path = ROOT / "state/queue.json"
    q_path.parent.mkdir(exist_ok=True)
    queue = json.loads(q_path.read_text()) if q_path.exists() else {}
    offset = queue.get("_offset", 0)
    updates = call("getUpdates", data={"offset": offset, "allowed_updates": json.dumps(["callback_query", "message"])})
    changed = []
    for u in updates:
        offset = max(offset, u["update_id"] + 1)
        cq = u.get("callback_query")
        if not cq or str(cq["from"]["id"]) != str(chat_id()):
            continue
        action, ep = cq["data"].split(":", 1)
        status = "approved" if action == "ok" else "rejected"
        queue.setdefault(ep, {})["status"] = status
        changed.append((ep, status))
        call("answerCallbackQuery", data={"callback_query_id": cq["id"], "text": "Wordt gepost" if status == "approved" else "Weggegooid"})
    queue["_offset"] = offset
    q_path.write_text(json.dumps(queue, indent=1))
    for ep, st in changed:
        print(f"{ep}: {st}")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "setup":
        setup()
    elif cmd == "send":
        send(sys.argv[2])
    elif cmd == "video":
        video(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "", sys.argv[4] if len(sys.argv) > 4 else None)
    elif cmd == "poll":
        poll()
