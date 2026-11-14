#!/usr/bin/env python3
"""Moves every App Store link from the old Netlify sites to their new
Cloudflare addresses, for every app on the account: the Privacy Policy URL
(App Information) and the Support and Marketing URLs (each version that can
still be edited), in every language. Prints each change; anything Apple does
not let us edit right now is listed at the end, with the reason.

Runs on Codemagic (workflow fix-app-store-links) with the App Store Connect
key, the same way tools/gamecenter/create.py does."""
import os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gamecenter"))
import create  # noqa: E402

call = create.call
NEW = "leonardomachado39137.workers.dev"
MOVED = {
    "backrooms-audio-game": "accessible-backrooms",
    "the-last-signal-game-bk6r": "the-last-signal",
    "still-here-horror": "still-here",
    "glistening-pika-cbd458": "puzzle-master",
    "rift-deck": "rift-deck",
    "blackwood-manor-d9gr": "blackwood-manor",
    "prismatic-youtiao-66371f": "soul-echo",
    "dungeon-descent-3d-poc": "dungeon-descent-3d",
    "dungeonk": "dungeon-descent-privacy",
    "fancy-boba-878b04": "puzzle-master-old-1",
    "chimerical-raindrop-9c5d61": "puzzle-master-old-2",
    "gorgeous-eclair-79dbc1": "puzzle-master-old-3",
    "dancing-clafoutis-e4cc11": "puzzle-master-old-4",
    "dungion-descent": "dungeon-descent-old",
}
PAT = re.compile(r"https?://([a-z0-9-]+)\.netlify\.app(/[^\s]*)?", re.I)
changed, skipped = [], []


def moved(url):
    if not url:
        return None
    m = PAT.fullmatch(url.strip())
    if not m or m.group(1).lower() not in MOVED:
        return None
    path = m.group(2) or ""
    path = re.sub(r"\.html$", "", path)          # Cloudflare serves /privacy for privacy.html
    return f"https://{MOVED[m.group(1).lower()]}.{NEW}{path}"


def fix(kind, rid, attrs, fields, label):
    new = {f: moved(attrs.get(f)) for f in fields}
    new = {f: v for f, v in new.items() if v}
    if not new:
        return
    try:
        call("PATCH", f"/{kind}/{rid}", {"data": {"type": kind, "id": rid, "attributes": new}})
        for f, v in new.items():
            changed.append(f"{label} {f}: {attrs.get(f)} -> {v}")
            print("  changed", f, "->", v)
    except Exception as e:
        reason = str(e).split("->", 1)[-1][:300]
        for f in new:
            skipped.append(f"{label} {f} ({attrs.get(f)}): {reason}")
        print("  could not change", ", ".join(new), ":", reason)


def main():
    apps = create.all_pages("/apps?limit=200")
    print(f"{len(apps)} apps on the account")
    for app in apps:
        name = app["attributes"]["name"]
        print("App:", name)
        for info in create.all_pages(f"/apps/{app['id']}/appInfos?limit=50"):
            for loc in create.all_pages(f"/appInfos/{info['id']}/appInfoLocalizations?limit=50"):
                a = loc["attributes"]
                fix("appInfoLocalizations", loc["id"], a, ["privacyPolicyUrl", "privacyChoicesUrl"], f"{name} [{a.get('locale')}] App Information")
        for ver in create.all_pages(f"/apps/{app['id']}/appStoreVersions?limit=50"):
            st = ver["attributes"].get("appStoreState") or ver["attributes"].get("appVersionState")
            vs = ver["attributes"].get("versionString")
            for loc in create.all_pages(f"/appStoreVersions/{ver['id']}/appStoreVersionLocalizations?limit=50"):
                a = loc["attributes"]
                if not (moved(a.get("supportUrl")) or moved(a.get("marketingUrl"))):
                    continue
                if st not in ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"):
                    for f in ("supportUrl", "marketingUrl"):
                        if moved(a.get(f)):
                            skipped.append(f"{name} {vs} [{a.get('locale')}] {f} ({a.get(f)}): version is {st}, change it in the next version")
                    continue
                fix("appStoreVersionLocalizations", loc["id"], a, ["supportUrl", "marketingUrl"], f"{name} {vs} [{a.get('locale')}]")
    print()
    print(f"Changed {len(changed)} link(s).")
    for c in changed:
        print(" -", c)
    if skipped:
        print(f"\nNot changed ({len(skipped)}):")
        for s in skipped:
            print(" -", s)
    else:
        print("Nothing left pointing at Netlify.")


if __name__ == "__main__":
    main()
