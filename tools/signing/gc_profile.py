#!/usr/bin/env python3
"""Makes sure the App Store signing profile includes Game Center.

The old profile was made before the app used Game Center, so Xcode refuses
it ("doesn't include the Game Center capability"). This turns on Game
Center for the bundle ID if needed, makes a fresh App Store profile with
every valid distribution certificate, and installs it on the build Mac in
place of the old one, so `xcode-project use-profiles` picks it up.
Runs on Codemagic with the App Store Connect integration (see create.py)."""
import base64, glob, os, plistlib, subprocess, sys, time
from urllib.parse import quote

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gamecenter"))
import create  # noqa: E402  (shared API key handling and calls)

BUNDLE = "com.accessible.backrooms"
NAME = "Accessible Backrooms App Store GC"
call = create.call
DIRS = [os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles"),
        os.path.expanduser("~/Library/Developer/Xcode/UserData/Provisioning Profiles")]


def profile_info(path):
    raw = subprocess.run(["security", "cms", "-D", "-i", path], capture_output=True).stdout
    try:
        return plistlib.loads(raw)
    except Exception:
        return None


def main():
    ids = [b for b in call("GET", f"/bundleIds?filter[identifier]={BUNDLE}&limit=50")["data"] if b["attributes"]["identifier"] == BUNDLE]
    if not ids:
        sys.exit(f"Bundle ID {BUNDLE} not found")
    bid = ids[0]["id"]

    caps = {c["attributes"]["capabilityType"] for c in call("GET", f"/bundleIds/{bid}/bundleIdCapabilities")["data"]}
    print("Capabilities:", ", ".join(sorted(caps)) or "none")
    if "GAME_CENTER" not in caps:
        print("Turning on Game Center for", BUNDLE)
        call("POST", "/bundleIdCapabilities", {"data": {"type": "bundleIdCapabilities", "attributes": {"capabilityType": "GAME_CENTER"},
                                                        "relationships": {"bundleId": create.rel("bundleIds", bid)}}})

    now = time.strftime("%Y-%m-%dT%H:%M:%S")
    certs = [c for c in call("GET", "/certificates?filter[certificateType]=DISTRIBUTION,IOS_DISTRIBUTION&limit=200")["data"]
             if c["attributes"].get("expirationDate", "9999") > now]
    if not certs:
        sys.exit("No valid distribution certificate on the account")
    print(f"Distribution certificates: {len(certs)}")

    for old in call("GET", f"/profiles?filter[name]={quote(NAME)}&limit=50")["data"]:
        print("Removing the previous", NAME)
        call("DELETE", f"/profiles/{old['id']}")

    prof = call("POST", "/profiles", {"data": {"type": "profiles", "attributes": {"name": NAME, "profileType": "IOS_APP_STORE"},
                                               "relationships": {"bundleId": create.rel("bundleIds", bid),
                                                                 "certificates": {"data": [{"type": "certificates", "id": c["id"]} for c in certs]}}}})["data"]
    content = base64.b64decode(prof["attributes"]["profileContent"])
    uuid = prof["attributes"]["uuid"]

    for d in DIRS:
        os.makedirs(d, exist_ok=True)
        # take out the old profiles for this app, so the new one is the only choice
        for f in glob.glob(os.path.join(d, "*.mobileprovision")):
            info = profile_info(f)
            app_id = (info or {}).get("Entitlements", {}).get("application-identifier", "")
            if app_id.endswith("." + BUNDLE):
                print("Removing installed profile:", info.get("Name"))
                os.remove(f)
        with open(os.path.join(d, uuid + ".mobileprovision"), "wb") as fh:
            fh.write(content)

    ent = (profile_info(os.path.join(DIRS[0], uuid + ".mobileprovision")) or {}).get("Entitlements", {})
    print("Installed", NAME, uuid, "with Game Center:", "com.apple.developer.game-center" in ent)


if __name__ == "__main__":
    main()
