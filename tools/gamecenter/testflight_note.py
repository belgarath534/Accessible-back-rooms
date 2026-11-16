#!/usr/bin/env python3
"""Waits for the newest uploaded build of a version to finish processing and
sets its TestFlight "What to Test" note (TESTFLIGHT_NOTE, English)."""
import os, sys, time
import create
from create import call

note = os.environ.get("TESTFLIGHT_NOTE", "").strip()
vs = os.environ.get("TF_VERSION", "").strip()
num = os.environ.get("TF_BUILD", "").strip()
if not note:
    sys.exit(0)
app_id = call("GET", f"/apps?filter[bundleId]={create.BUNDLE_ID}")["data"][0]["id"]
for _ in range(45):
    q = f"/builds?filter[app]={app_id}&filter[preReleaseVersion.version]={vs}&filter[version]={num}&limit=1"
    b = call("GET", q)["data"]
    if b and b[0]["attributes"]["processingState"] == "VALID":
        bid = b[0]["id"]
        locs = call("GET", f"/builds/{bid}/betaBuildLocalizations")["data"]
        en = [l for l in locs if l["attributes"]["locale"].startswith("en")]
        if en:
            call("PATCH", f"/betaBuildLocalizations/{en[0]['id']}", {"data": {"type": "betaBuildLocalizations", "id": en[0]["id"], "attributes": {"whatsNew": note}}})
        else:
            call("POST", "/betaBuildLocalizations", {"data": {"type": "betaBuildLocalizations", "attributes": {"locale": "en-US", "whatsNew": note},
                 "relationships": {"build": {"data": {"type": "builds", "id": bid}}}}})
        print(f"TestFlight note set on {vs} ({num}). The build is ready to test.")
        sys.exit(0)
    print("Waiting for Apple to process the build...", b[0]["attributes"]["processingState"] if b else "not there yet")
    time.sleep(60)
print("Apple is still processing; the note was not set.")
