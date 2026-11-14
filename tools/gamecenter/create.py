#!/usr/bin/env python3
"""Creates the Game Center achievements and leaderboards for Accessible
Backrooms in App Store Connect, from items.json, with English and
Portuguese text and the same picture (badge.png) for every achievement.

Safe to run again: anything that already exists is skipped. Runs on
Codemagic (workflow game-center-setup), which gives it the App Store
Connect API key through these environment variables:
APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_KEY_IDENTIFIER and
APP_STORE_CONNECT_PRIVATE_KEY."""
import json, os, sys, time
import jwt, requests

BUNDLE_ID = "com.accessible.backrooms"
API = "https://api.appstoreconnect.apple.com/v1"
HERE = os.path.dirname(os.path.abspath(__file__))
LOCALES = {"en": "en-US", "pt": "pt-BR"}
problems = []


def token():
    key = os.environ["APP_STORE_CONNECT_PRIVATE_KEY"]
    now = int(time.time())
    return jwt.encode({"iss": os.environ["APP_STORE_CONNECT_ISSUER_ID"], "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"},
                      key, algorithm="ES256", headers={"kid": os.environ["APP_STORE_CONNECT_KEY_IDENTIFIER"], "typ": "JWT"})


TOKEN = {"value": None, "made": 0}


def call(method, path, body=None, ok=(200, 201, 204)):
    if time.time() - TOKEN["made"] > 900:
        TOKEN["value"], TOKEN["made"] = token(), time.time()
    url = path if path.startswith("http") else API + path
    for attempt in range(4):
        r = requests.request(method, url, json=body, headers={"Authorization": "Bearer " + TOKEN["value"]}, timeout=60)
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(2 ** attempt * 3)
            continue
        break
    if r.status_code not in ok:
        detail = r.text[:800]
        raise RuntimeError(f"{method} {path} -> {r.status_code}: {detail}")
    return r.json() if r.content else {}


def all_pages(path):
    out, url = [], path
    while url:
        d = call("GET", url)
        out += d.get("data", [])
        url = d.get("links", {}).get("next")
    return out


def rel(kind, id_):
    return {"data": {"type": kind, "id": id_}}


def step(what, fn):
    try:
        return fn()
    except Exception as e:  # keep going, report everything at the end
        problems.append(f"{what}: {e}")
        print(f"  !! {what}: {e}")
        return None


def upload_image(loc_id, path):
    data = open(path, "rb").read()
    img = call("POST", "/gameCenterAchievementImages", {"data": {"type": "gameCenterAchievementImages",
               "attributes": {"fileSize": len(data), "fileName": os.path.basename(path)},
               "relationships": {"gameCenterAchievementLocalization": rel("gameCenterAchievementLocalizations", loc_id)}}})["data"]
    for op in img["attributes"]["uploadOperations"]:
        part = data[op["offset"]:op["offset"] + op["length"]]
        headers = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        r = requests.request(op["method"], op["url"], data=part, headers=headers, timeout=120)
        if r.status_code >= 300:
            raise RuntimeError(f"image upload part -> {r.status_code}")
    call("PATCH", f"/gameCenterAchievementImages/{img['id']}", {"data": {"type": "gameCenterAchievementImages", "id": img["id"], "attributes": {"uploaded": True}}})


def main():
    items = json.load(open(os.path.join(HERE, "items.json")))
    badge = os.path.join(HERE, "badge.png")

    apps = call("GET", f"/apps?filter[bundleId]={BUNDLE_ID}")["data"]
    if not apps:
        sys.exit(f"No app with bundle id {BUNDLE_ID} on this App Store Connect account.")
    app_id = apps[0]["id"]
    print("App:", apps[0]["attributes"]["name"], app_id)

    gc = call("GET", f"/apps/{app_id}/gameCenterDetail", ok=(200, 404)).get("data")
    if not gc:
        print("Turning on Game Center for the app")
        gc = call("POST", "/gameCenterDetails", {"data": {"type": "gameCenterDetails", "relationships": {"app": rel("apps", app_id)}}})["data"]
    gc_id = gc["id"]

    have = {a["attributes"]["vendorIdentifier"]: a["id"] for a in all_pages(f"/gameCenterDetails/{gc_id}/gameCenterAchievements?limit=200")}
    print(f"Achievements already there: {len(have)}")
    for a in items["achievements"]:
        vid = a["id"]
        print("Achievement", vid)
        if vid not in have:
            made = step(vid, lambda: call("POST", "/gameCenterAchievements", {"data": {"type": "gameCenterAchievements",
                        "attributes": {"referenceName": a["en"]["name"], "vendorIdentifier": vid, "points": a["points"],
                                       "showBeforeEarned": not a["hidden"], "repeatable": False},
                        "relationships": {"gameCenterDetail": rel("gameCenterDetails", gc_id)}}})["data"])
            if not made:
                continue
            have[vid] = made["id"]
        ach_id = have[vid]
        locs = step(vid + " localizations", lambda: {l["attributes"]["locale"]: l["id"] for l in all_pages(f"/gameCenterAchievements/{ach_id}/localizations")}) or {}
        for short, locale in LOCALES.items():
            text = a[short]
            if locale not in locs:
                loc = step(f"{vid} {locale}", lambda: call("POST", "/gameCenterAchievementLocalizations", {"data": {"type": "gameCenterAchievementLocalizations",
                           "attributes": {"locale": locale, "name": text["name"], "beforeEarnedDescription": text["desc"], "afterEarnedDescription": text["desc"]},
                           "relationships": {"gameCenterAchievement": rel("gameCenterAchievements", ach_id)}}})["data"])
                if not loc:
                    continue
                locs[locale] = loc["id"]
            loc_id = locs[locale]
            img = step(f"{vid} {locale} picture check", lambda: call("GET", f"/gameCenterAchievementLocalizations/{loc_id}/gameCenterAchievementImage", ok=(200, 404)).get("data"))
            if not img:
                step(f"{vid} {locale} picture", lambda: upload_image(loc_id, badge))

    boards = {b["attributes"]["vendorIdentifier"]: b["id"] for b in all_pages(f"/gameCenterDetails/{gc_id}/gameCenterLeaderboards?limit=200")}
    for b in items["leaderboards"]:
        vid = b["id"]
        print("Leaderboard", vid)
        if vid not in boards:
            made = step(vid, lambda: call("POST", "/gameCenterLeaderboards", {"data": {"type": "gameCenterLeaderboards",
                        "attributes": {"referenceName": b["en"]["name"], "vendorIdentifier": vid, "defaultFormatter": "INTEGER",
                                       "submissionType": "BEST_SCORE", "scoreSortType": "DESC", "scoreRangeStart": "0", "scoreRangeEnd": "1000000"},
                        "relationships": {"gameCenterDetail": rel("gameCenterDetails", gc_id)}}})["data"])
            if not made:
                continue
            boards[vid] = made["id"]
        lb_id = boards[vid]
        locs = step(vid + " localizations", lambda: {l["attributes"]["locale"] for l in all_pages(f"/gameCenterLeaderboards/{lb_id}/localizations")}) or set()
        for short, locale in LOCALES.items():
            if locale in locs:
                continue
            text = b[short]
            step(f"{vid} {locale}", lambda: call("POST", "/gameCenterLeaderboardLocalizations", {"data": {"type": "gameCenterLeaderboardLocalizations",
                 "attributes": {"locale": locale, "name": text["name"], "formatterSuffix": text["many"], "formatterSuffixSingular": text["one"]},
                 "relationships": {"gameCenterLeaderboard": rel("gameCenterLeaderboards", lb_id)}}}))

    print()
    if problems:
        print(f"Finished with {len(problems)} problem(s):")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print(f"Done: {len(items['achievements'])} achievements and {len(items['leaderboards'])} leaderboards are in App Store Connect.")


if __name__ == "__main__":
    main()
