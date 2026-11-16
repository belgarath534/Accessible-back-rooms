#!/usr/bin/env python3
"""Attaches Game Center to an app version, so the achievements and
leaderboards go to Apple's review with it (the same as the Game Center
section of the version page, which is hard to use with VoiceOver).

- turns Game Center on for the version (gameCenterAppVersions)
- adds every achievement and leaderboard to it (achievement and
  leaderboard releases)
- fills in What's New in English and Portuguese, if WHATS_NEW_EN / _PT given

Version: GC_VERSION (default: the version waiting to be submitted).
Runs on Codemagic (workflow game-center-attach) with the App Store
Connect API key, like create.py."""
import os, sys
import create
from create import call, all_pages, rel, step, problems

LOCALE_TEXT = {"en-US": os.environ.get("WHATS_NEW_EN", ""), "pt-BR": os.environ.get("WHATS_NEW_PT", "")}


def main():
    app = call("GET", f"/apps?filter[bundleId]={create.BUNDLE_ID}")["data"][0]
    app_id = app["id"]
    want = os.environ.get("GC_VERSION", "").strip()
    versions = all_pages(f"/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=50")
    editable = [v for v in versions if v["attributes"]["appStoreState"] in
                ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY")]
    pick = [v for v in (versions if want else editable) if not want or v["attributes"]["versionString"] == want]
    if not pick and want and not any(v["attributes"]["versionString"] == want for v in versions):
        print("Creating version", want, "in App Store Connect")
        made = call("POST", "/appStoreVersions", {"data": {"type": "appStoreVersions", "attributes": {"platform": "IOS", "versionString": want},
                    "relationships": {"app": rel("apps", app_id)}}})["data"]
        pick = [made]
    if not pick:
        sys.exit(f"No editable version found (asked for: {want or 'any'}). Versions: " +
                 ", ".join(f"{v['attributes']['versionString']} {v['attributes']['appStoreState']}" for v in versions[:8]))
    ver = pick[0]
    print("Version", ver["attributes"]["versionString"], ver["attributes"]["appStoreState"])

    gcv = call("GET", f"/appStoreVersions/{ver['id']}/gameCenterAppVersion", ok=(200, 404)).get("data")
    if gcv and gcv["attributes"].get("enabled"):
        print("Game Center already on for this version")
    elif gcv:
        step("turn on Game Center", lambda: call("PATCH", f"/gameCenterAppVersions/{gcv['id']}",
             {"data": {"type": "gameCenterAppVersions", "id": gcv["id"], "attributes": {"enabled": True}}}))
        print("Game Center turned on for this version")
    else:
        step("turn on Game Center", lambda: call("POST", "/gameCenterAppVersions",
             {"data": {"type": "gameCenterAppVersions", "attributes": {"enabled": True},
                       "relationships": {"appStoreVersion": rel("appStoreVersions", ver["id"])}}}))
        print("Game Center turned on for this version")

    gc_id = call("GET", f"/apps/{app_id}/gameCenterDetail")["data"]["id"]
    for kind, plural in (("Achievement", "achievements"), ("Leaderboard", "leaderboards")):
        items = all_pages(f"/gameCenterDetails/{gc_id}/gameCenter{kind}s?limit=200")
        released = {r["relationships"].get(f"gameCenter{kind}", {}).get("data", {}).get("id")
                    for r in (step(f"{plural} releases", lambda: all_pages(
                        f"/gameCenterDetails/{gc_id}/{kind.lower()}Releases?limit=200&include=gameCenter{kind}")) or [])}
        added = 0
        for it in items:
            if it["id"] in released:
                continue
            ok = step(f"{kind} {it['attributes'].get('vendorIdentifier')}", lambda: call("POST", f"/gameCenter{kind}Releases",
                      {"data": {"type": f"gameCenter{kind}Releases",
                                "relationships": {"gameCenterDetail": rel("gameCenterDetails", gc_id),
                                                  f"gameCenter{kind}": rel(f"gameCenter{kind}s", it["id"])}}}))
            if ok is not None:
                added += 1
        print(f"{kind}s: {len(items)} in total, {added} added to this version, {len(items) - added} were already in")

    if any(LOCALE_TEXT.values()):
        for loc in all_pages(f"/appStoreVersions/{ver['id']}/appStoreVersionLocalizations"):
            text = LOCALE_TEXT.get(loc["attributes"]["locale"])
            if text:
                step(f"What's New {loc['attributes']['locale']}", lambda: call("PATCH", f"/appStoreVersionLocalizations/{loc['id']}",
                     {"data": {"type": "appStoreVersionLocalizations", "id": loc["id"], "attributes": {"whatsNew": text}}}))
                print("What's New filled in:", loc["attributes"]["locale"])

    print()
    if problems:
        print(f"Finished with {len(problems)} problem(s):")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("Done: Game Center is attached to this version.")


if __name__ == "__main__":
    main()
