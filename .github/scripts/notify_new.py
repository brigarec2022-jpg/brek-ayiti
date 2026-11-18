"""Envoie automatiquement une notification OneSignal pour chaque nouvelle publication
ajoutée à publications.json (au plus 2 par push). Mettre [sans-notif] dans le message
de commit pour ne rien envoyer."""
import json, os, re, subprocess, sys, time, uuid, urllib.request, html

APP_ID = "b3b391f3-132b-4477-9efb-f941226f22fd"
SITE = "https://brek-ayiti.pages.dev"
KEY = os.environ.get("ONESIGNAL_REST_API_KEY", "").strip()
BEFORE = os.environ.get("BEFORE_SHA", "")
MSG = os.environ.get("COMMIT_MSG", "")

if not KEY:
    print("Pas de clé ONESIGNAL_REST_API_KEY : rien envoyé."); sys.exit(0)
if "[sans-notif]" in MSG:
    print("[sans-notif] : rien envoyé."); sys.exit(0)

def load(ref):
    try:
        return json.loads(subprocess.check_output(["git", "show", f"{ref}:publications.json"]))
    except Exception:
        return None

old = load(BEFORE) if BEFORE and not BEFORE.startswith("0000") else None
new = load("HEAD") or []
if old is None:
    print("Pas d'état précédent : rien envoyé."); sys.exit(0)
known = {p.get("path") for p in old}
fresh = [p for p in new if p.get("path") and p["path"] not in known][:2]
if not fresh:
    print("Aucune nouvelle publication."); sys.exit(0)

def meta(path, prop):
    f = path.strip("/") + "/index.html"
    try:
        s = open(f, encoding="utf-8").read()
    except OSError:
        return ""
    m = re.search(r'<meta (?:property|name)="%s" content="([^"]*)"' % re.escape(prop), s)
    return html.unescape(m.group(1)) if m else ""

time.sleep(120)  # laisser Cloudflare Pages publier la page
for p in fresh:
    url = SITE + p["path"]
    title = p.get("title") or meta(p["path"], "og:title") or "BREK-AYITI"
    desc = meta(p["path"], "og:description") or "Nouvelle publication sur BREK-AYITI"
    img = meta(p["path"], "og:image")
    if len(desc) > 170: desc = desc[:167].rsplit(" ", 1)[0] + "…"
    body = {
        "app_id": APP_ID, "included_segments": ["Active Subscriptions"],
        "headings": {"en": title[:90], "fr": title[:90]},
        "contents": {"en": desc + " ➜", "fr": desc + " ➜"},
        "url": url, "name": "Auto · " + p["path"],
        "chrome_web_icon": SITE + "/icons/brek-ayiti-192-v2.png",
        "idempotency_key": str(uuid.uuid5(uuid.NAMESPACE_URL, url)),
    }
    if img:
        body["chrome_web_image"] = img; body["big_picture"] = img
    req = urllib.request.Request("https://api.onesignal.com/notifications?c=push",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Key " + KEY})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(p["path"], r.status, r.read().decode()[:300])
    except urllib.error.HTTPError as e:
        print(p["path"], "ERREUR", e.code, e.read().decode()[:300]); sys.exit(1)
