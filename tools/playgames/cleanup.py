#!/usr/bin/env python3
"""Deletes every Play Games achievement and leaderboard that is not in
ids.json (leftovers from runs that Google's busy servers turned into
duplicates), then retries the icons of the ones we keep. Only works while
they are unpublished drafts."""
import json, os, sys
sys.argv = sys.argv[:1]
import create  # noqa: E402  (sign-in, call(), listed(), icon())

keep = set(json.load(open(os.path.join(create.HERE, "ids.json"))).values())
for kind, icon_kind in (("achievements", "ACHIEVEMENT_ICON"), ("leaderboards", "LEADERBOARD_ICON")):
    items = create.listed(kind)
    gone = 0
    for it in items:
        if it["id"] in keep:
            create.icon(it["id"], icon_kind, it)
            continue
        try:
            create.call("DELETE", f"https://gamesconfiguration.googleapis.com/games/v1configuration/{kind}/{it['id']}", retry=False)
            gone += 1
        except Exception as e:
            print("  !! could not delete", it["id"], e)
    print(f"{kind}: {len(items)} found, {gone} leftovers deleted, {len([i for i in items if i['id'] in keep])} kept")
if create.icon_problems:
    print(f"{len(create.icon_problems)} icon(s) still not uploaded (image service busy); run cleanup again later.")
else:
    print("All icons are in.")
