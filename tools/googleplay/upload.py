#!/usr/bin/env python3
"""Uploads an Android app bundle (AAB) to Google Play and puts it on a track
(default: alpha, which is Closed testing in Play Console), with release
notes in English and Portuguese from release-notes.json.
Usage: upload.py path/to/app.aab [track]"""
import json, os, sys
import listing_auth as auth

aab, track = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "alpha")
HERE = os.path.dirname(os.path.abspath(__file__))
notes = json.load(open(os.path.join(HERE, "release-notes.json")))
API, UPLOAD = auth.API, auth.UPLOAD

edit = auth.call("POST", f"{API}/edits")["id"]
with open(aab, "rb") as f:
    bundle = auth.call("POST", f"{UPLOAD}/edits/{edit}/bundles?uploadType=media", data=f.read(), headers={"Content-Type": "application/octet-stream"})
code = bundle["versionCode"]
print("Uploaded version code", code)
auth.call("PUT", f"{API}/edits/{edit}/tracks/{track}", json={"track": track, "releases": [{
    "versionCodes": [str(code)], "status": "completed",
    "releaseNotes": [{"language": k, "text": v} for k, v in notes.items()]}]})
auth.call("POST", f"{API}/edits/{edit}:commit")
print(f"Released version code {code} to the {track} track (alpha = Closed testing).")
