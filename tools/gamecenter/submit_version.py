#!/usr/bin/env python3
"""Attaches the newest processed build to the version waiting to be submitted
and sends it to App Review (the same as picking the build and pressing
Submit for Review on the version page).
Waits for Apple to finish processing the build (up to WAIT_MINUTES, default 45).
Optional: BUILD_NUMBER to pick a particular build."""
import os, sys, time
import create
from create import call, all_pages, rel


def main():
    app_id = call("GET", f"/apps?filter[bundleId]={create.BUNDLE_ID}")["data"][0]["id"]
    versions = all_pages(f"/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=50")
    ver = next((v for v in versions if v["attributes"]["appStoreState"] in
                ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED")), None)
    if not ver:
        sys.exit("No version waiting to be submitted. States: " +
                 ", ".join(f"{v['attributes']['versionString']} {v['attributes']['appStoreState']}" for v in versions[:6]))
    vs = ver["attributes"]["versionString"]
    print("Version", vs, ver["attributes"]["appStoreState"])

    want = os.environ.get("BUILD_NUMBER", "").strip()
    deadline = time.time() + 60 * int(os.environ.get("WAIT_MINUTES", "45"))
    build = None
    while True:
        builds = call("GET", f"/builds?filter[app]={app_id}&filter[preReleaseVersion.version]={vs}&sort=-uploadedDate&limit=10")["data"]
        if want:
            builds = [b for b in builds if b["attributes"]["version"] == want]
        if builds:
            b = builds[0]
            state = b["attributes"]["processingState"]
            print(f"Build {b['attributes']['version']}: {state}")
            if state == "VALID":
                build = b
                break
            if state in ("FAILED", "INVALID"):
                sys.exit(f"Apple could not process build {b['attributes']['version']} ({state}).")
        else:
            print(f"No build for {vs} yet")
        if time.time() > deadline:
            sys.exit("Apple is still processing the build. Run this again a bit later.")
        time.sleep(60)

    if build["attributes"].get("usesNonExemptEncryption") is None:
        call("PATCH", f"/builds/{build['id']}", {"data": {"type": "builds", "id": build["id"],
             "attributes": {"usesNonExemptEncryption": False}}})
        print("Export compliance: no special encryption")
    call("PATCH", f"/appStoreVersions/{ver['id']}/relationships/build", {"data": {"type": "builds", "id": build["id"]}})
    print("Build", build["attributes"]["version"], "attached to", vs)

    # reuse an open submission if there is one, otherwise make one
    subs = call("GET", f"/reviewSubmissions?filter[app]={app_id}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES&limit=5")["data"]
    sub = subs[0] if subs else call("POST", "/reviewSubmissions", {"data": {"type": "reviewSubmissions",
            "attributes": {"platform": "IOS"}, "relationships": {"app": rel("apps", app_id)}}})["data"]
    items = call("GET", f"/reviewSubmissions/{sub['id']}/items?include=appStoreVersion&limit=50")
    has = any(i.get("relationships", {}).get("appStoreVersion", {}).get("data", {}) and
              i["relationships"]["appStoreVersion"]["data"]["id"] == ver["id"] for i in items.get("data", []))
    if not has:
        call("POST", "/reviewSubmissionItems", {"data": {"type": "reviewSubmissionItems", "relationships": {
            "reviewSubmission": rel("reviewSubmissions", sub["id"]), "appStoreVersion": rel("appStoreVersions", ver["id"])}}})
    call("PATCH", f"/reviewSubmissions/{sub['id']}", {"data": {"type": "reviewSubmissions", "id": sub["id"],
         "attributes": {"submitted": True}}})
    print(f"Submitted {vs} (build {build['attributes']['version']}) for App Review.")


if __name__ == "__main__":
    main()
