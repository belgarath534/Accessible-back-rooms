#!/usr/bin/env python3
"""For the GitHub iPhone build: finds which App Store Connect key in the
private certificates folder works (AuthKey_<KEYID>.p8), and the team ID, and
writes them to $GITHUB_ENV. Never prints a key.
Usage: asc_env.py <folder with AuthKey_*.p8>   (needs APP_STORE_CONNECT_ISSUER_ID)"""
import glob, os, re, sys, time
import jwt, requests

folder = sys.argv[1]
issuer = os.environ.get("APP_STORE_CONNECT_ISSUER_ID", "").strip()
if not issuer:
    sys.exit("Add the APP_STORE_CONNECT_ISSUER_ID secret first (App Store Connect > Users and Access > Integrations > Issuer ID).")
want = os.environ.get("APP_STORE_CONNECT_KEY_IDENTIFIER", "").strip()
import subprocess
def added(path):  # newest key first: the time it was added to the private repository
    out = subprocess.run(["git", "-C", folder, "log", "-1", "--format=%ct", "--", os.path.relpath(path, folder)],
                         capture_output=True, text=True).stdout.strip()
    return int(out or 0)
keys = sorted(glob.glob(os.path.join(folder, "**", "AuthKey_*.p8"), recursive=True), key=added, reverse=True)
if want:
    keys = [k for k in keys if want in os.path.basename(k)] or keys
print("Keys found:", ", ".join(os.path.basename(k) for k in keys) or "none")
for path in keys:
    kid = re.search(r"AuthKey_([A-Z0-9]+)\.p8", path).group(1)
    now = int(time.time())
    tok = jwt.encode({"iss": issuer, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
                     open(path).read(), algorithm="ES256", headers={"kid": kid, "typ": "JWT"})
    r = requests.get("https://api.appstoreconnect.apple.com/v1/bundleIds?filter[identifier]=com.accessible.backrooms",
                     headers={"Authorization": "Bearer " + tok}, timeout=60)
    print(f"Key {kid}: {r.status_code}")
    if r.status_code == 200 and r.json()["data"]:
        team = r.json()["data"][0]["attributes"]["seedId"]
        with open(os.environ["GITHUB_ENV"], "a") as env:
            env.write(f"APP_STORE_CONNECT_KEY_IDENTIFIER={kid}\nAPP_STORE_CONNECT_PRIVATE_KEY={os.path.abspath(path)}\nAPPLE_TEAM_ID={team}\n")
        print("Using key", kid, "team", team)
        sys.exit(0)
sys.exit("None of the keys worked with this Issuer ID. Check the APP_STORE_CONNECT_ISSUER_ID secret.")
