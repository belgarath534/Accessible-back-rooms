#!/usr/bin/env python3
"""Fills in Accessible Backrooms' Google Play store listing: the name, short
and full description in English and Portuguese, the website, the icon, the
feature graphic and the phone screenshots (assets/).

Google Play only allows this once the app exists in Play Console. The
questionnaires (content rating, target audience, ads, app access, data
safety) cannot be answered by any tool and are done in Play Console.

Runs on Codemagic (workflow backrooms-play-listing) with the Google Play
service account from the google_credentials group."""
import json, os, sys, time
import jwt, requests

HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(HERE, "listing.json")))
PKG = cfg["packageName"]
API = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"
UPLOAD = f"https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{PKG}"


def access_token():
    raw = os.environ.get("GOOGLE_PLAY_SERVICE_ACCOUNT_CREDENTIALS", "")
    if os.path.isfile(raw):
        raw = open(raw).read()
    sa = json.loads(raw)
    now = int(time.time())
    assertion = jwt.encode({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/androidpublisher",
                            "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3000},
                           sa["private_key"], algorithm="RS256")
    r = requests.post("https://oauth2.googleapis.com/token", data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion}, timeout=60)
    r.raise_for_status()
    print("Signed in to Google Play as", sa["client_email"])
    return r.json()["access_token"]


H = {"Authorization": "Bearer " + access_token()}


def call(method, url, **kw):
    r = requests.request(method, url, headers={**H, **kw.pop("headers", {})}, timeout=120, **kw)
    if r.status_code >= 300:
        sys.exit(f"{method} {url.split(PKG)[-1]} -> {r.status_code}: {r.text[:800]}")
    return r.json() if r.content else {}


edit = call("POST", f"{API}/edits")["id"]
print("Edit", edit)
call("PATCH", f"{API}/edits/{edit}/details", json={"defaultLanguage": "en-US", "contactWebsite": cfg["contactWebsite"]})
print("Default language and website set")

for lang, text in cfg["listings"].items():
    call("PUT", f"{API}/edits/{edit}/listings/{lang}", json={"language": lang, **text})
    print("Listing", lang, "-", text["title"])
    images = [("icon", ["icon.png"]), ("featureGraphic", ["feature.png"]),
              ("phoneScreenshots", sorted(f for f in os.listdir(os.path.join(HERE, "assets")) if f.startswith("phone")))]
    for kind, files in images:
        call("DELETE", f"{API}/edits/{edit}/listings/{lang}/{kind}")
        for f in files:
            with open(os.path.join(HERE, "assets", f), "rb") as fh:
                call("POST", f"{UPLOAD}/edits/{edit}/listings/{lang}/{kind}?uploadType=media", data=fh.read(), headers={"Content-Type": "image/png"})
        print(f"  {kind}: {len(files)} uploaded")

res = call("POST", f"{API}/edits/{edit}:commit")
print("Saved to Google Play:", res.get("id"))
print("Done. The store listing is filled in. Answer the App content questions in Play Console to finish.")
