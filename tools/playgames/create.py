#!/usr/bin/env python3
"""Creates Accessible Backrooms' Google Play Games achievements and
leaderboards from tools/gamecenter/items.json (the same list Game Center
uses), in English and Portuguese, each with the game's icon. Safe to run
again: anything that already exists (same token) is skipped.

At the end it prints PLAYGAMES_IDS followed by a JSON map from each of our
ids (br_first, br_endless_depth, ...) to the id Google gave it; the game
needs those ids to unlock achievements on Android.

Runs on Codemagic (workflow backrooms-playgames-setup, in the Dungeon
Descent Android app, which holds the Google Play service account)."""
import json, os, sys, time
import jwt, requests

APP_ID = "705759620608"          # Play Games Services project for Accessible Backrooms
HERE = os.path.dirname(os.path.abspath(__file__))
API = f"https://gamesconfiguration.googleapis.com/games/v1configuration/applications/{APP_ID}"
IMG = "https://gamesconfiguration.googleapis.com/upload/games/v1configuration/images"
LOCALES = {"en": "en-US", "pt": "pt-BR"}


def token():
    raw = os.environ.get("GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS", "")
    if os.path.isfile(raw):
        raw = open(raw).read()
    sa = json.loads(raw)
    now = int(time.time())
    a = jwt.encode({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/androidpublisher",
                    "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3000}, sa["private_key"], algorithm="RS256")
    r = requests.post("https://oauth2.googleapis.com/token", data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": a}, timeout=60)
    r.raise_for_status()
    return r.json()["access_token"]


H = {"Authorization": "Bearer " + token()}


def call(method, url, **kw):
    for attempt in range(4):
        r = requests.request(method, url, headers={**H, **kw.pop("headers", {})}, timeout=120, **kw)
        if r.status_code in (429, 500, 502, 503):
            time.sleep(3 * 2 ** attempt); continue
        break
    if r.status_code >= 300:
        raise RuntimeError(f"{method} {url.split('v1configuration')[-1]} -> {r.status_code}: {r.text[:600]}")
    return r.json() if r.content else {}


def listed(kind):
    out, page = [], None
    while True:
        d = call("GET", f"{API}/{kind}" + (f"?pageToken={page}" if page else ""))
        out += d.get("items", [])
        page = d.get("nextPageToken")
        if not page:
            return out


def bundle(texts):
    return {"kind": "gamesConfiguration#localizedStringBundle",
            "translations": [{"kind": "gamesConfiguration#localizedString", "locale": loc, "value": texts[k]} for k, loc in LOCALES.items()]}


def icon(resource_id, kind):
    with open(os.path.join(HERE, "icon.jpg"), "rb") as f:
        call("POST", f"{IMG}/{resource_id}/imageType/{kind}?uploadType=media", data=f.read(), headers={"Content-Type": "image/jpeg"})


items = json.load(open(os.path.join(HERE, "..", "gamecenter", "items.json")))
ids, problems = {}, []

have = {a["token"]: a["id"] for a in listed("achievements") if a.get("token")}
print(f"Achievements already there: {len(have)}")
for rank, a in enumerate(items["achievements"], 1):
    tok = a["id"]
    if tok in have:
        ids[tok] = have[tok]; continue
    pts = 40 if a["points"] >= 40 else 20 if a["points"] >= 20 else 10   # Google: multiples of 5, 1000 in total
    body = {"kind": "gamesConfiguration#achievementConfiguration", "token": tok, "achievementType": "STANDARD",
            "initialState": "HIDDEN" if a["hidden"] else "REVEALED",
            "draft": {"kind": "gamesConfiguration#achievementConfigurationDetail",
                      "name": bundle({k: a[k]["name"] for k in LOCALES}), "description": bundle({k: a[k]["desc"] for k in LOCALES}),
                      "pointValue": pts, "sortRank": rank}}
    try:
        made = call("POST", f"{API}/achievements", json=body)
        ids[tok] = made["id"]
        icon(made["id"], "ACHIEVEMENT_ICON")
        print("Achievement", tok, "->", made["id"])
    except Exception as e:
        problems.append(f"{tok}: {e}"); print("  !!", tok, e)

have = {b["token"]: b["id"] for b in listed("leaderboards") if b.get("token")}
for rank, b in enumerate(items["leaderboards"], 1):
    tok = b["id"]
    if tok in have:
        ids[tok] = have[tok]; continue
    suffix = lambda key: bundle({k: b[k][key].strip() and " " + b[k][key].strip() for k in LOCALES})
    body = {"kind": "gamesConfiguration#leaderboardConfiguration", "token": tok, "scoreOrder": "LARGER_IS_BETTER",
            "draft": {"kind": "gamesConfiguration#leaderboardConfigurationDetail", "name": bundle({k: b[k]["name"] for k in LOCALES}),
                      "scoreFormat": {"numberFormatType": "NUMERIC", "numDecimalPlaces": 0,
                                      "suffix": {"one": suffix("one"), "many": suffix("many"), "other": suffix("many")}},
                      "sortRank": rank}}
    try:
        made = call("POST", f"{API}/leaderboards", json=body)
        ids[tok] = made["id"]
        icon(made["id"], "LEADERBOARD_ICON")
        print("Leaderboard", tok, "->", made["id"])
    except Exception as e:
        problems.append(f"{tok}: {e}"); print("  !!", tok, e)

print("\nPLAYGAMES_IDS " + json.dumps(ids, separators=(",", ":")))
if problems:
    print(f"\n{len(problems)} problem(s):"); [print(" -", p) for p in problems]; sys.exit(1)
print(f"\nDone: {len(items['achievements'])} achievements and {len(items['leaderboards'])} leaderboards in Play Games.")
