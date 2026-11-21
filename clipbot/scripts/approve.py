"""Verwerk de Posten/Weg-knoppen van de clipbot-bot.
  python clipbot/scripts/approve.py once          -> één keer kijken (voor de cron)
  python clipbot/scripts/approve.py wait KEY 240  -> tot 240 minuten wachten op een klik voor KEY
Na een klik op Posten start publish.py meteen.
"""
import json, subprocess, sys, time
from common import CLIP, STATE, load, save, tg, chat_id, _api

Q = STATE / "queue.json"


def poll(timeout=0):
    queue = load(Q, {})
    offset = queue.get("_offset", 0)
    ups = tg("getUpdates", offset=offset, timeout=timeout, allowed_updates=json.dumps(["callback_query"])) or []
    changed = []
    for u in ups:
        offset = max(offset, u["update_id"] + 1)
        cq = u.get("callback_query")
        if not cq or str(cq["from"]["id"]) != str(chat_id()) or ":" not in cq.get("data", ""):
            continue
        act, key = cq["data"].split(":", 1)
        st = "approved" if act == "ok" else "rejected"
        queue.setdefault(key, {})["status"] = st
        changed.append((key, st))
        try:
            tg("answerCallbackQuery", callback_query_id=cq["id"], text="Wordt (privé) geüpload" if st == "approved" else "Weggegooid")
        except Exception as e:  # noqa: BLE001  oude klik: status telt toch
            print("antwoord op klik mislukt:", e)
    queue["_offset"] = offset
    save(Q, queue)
    return changed


def publish():
    subprocess.run([sys.executable, str(CLIP / "scripts/publish.py")], check=False)


if __name__ == "__main__":
    if not _api():
        raise SystemExit("CLIPBOT_TELEGRAM_TOKEN ontbreekt: knoppen kunnen niet gelezen worden.")
    if sys.argv[1] == "once":
        if poll():
            publish()
    elif sys.argv[1] == "wait":
        key, end = sys.argv[2], time.time() + 60 * float(sys.argv[3])
        while time.time() < end:
            try:
                ch = poll(timeout=50)
            except Exception as e:  # noqa: BLE001  netwerkfout: even wachten
                print(e); time.sleep(15); continue
            if ch:
                publish()
            if load(Q, {}).get(key, {}).get("status") in ("approved", "rejected"):
                break
