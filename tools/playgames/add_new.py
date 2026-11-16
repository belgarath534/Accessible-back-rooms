#!/usr/bin/env python3
"""Adds only the achievements from tools/gamecenter/items.json that are not in
ids.json yet (never touches the existing ones), with English and Portuguese
text, 10 points, and its own picture: tools/playgames/import*/ach-<name>.jpg
(br_outsmart -> ach-outsmart.jpg). Google's picture upload is often refused;
then the achievement is made without one, and the picture can be added in
Play Console. Prints the new ids."""
import glob, json, os
import create
from create import call, bundle, LOCALES, API, IMG, HERE

items = json.load(open(os.path.join(HERE, "..", "gamecenter", "items.json")))["achievements"]
known = json.load(open(os.path.join(HERE, "ids.json")))
new = [a for a in items if a["id"] not in known]
print("New achievements:", [a["id"] for a in new] or "none")
for rank, a in enumerate(items, 1):
    if a in new:
        tok = a["id"]
        body = {"kind": "gamesConfiguration#achievementConfiguration", "token": tok, "achievementType": "STANDARD",
                "initialState": "HIDDEN" if a["hidden"] else "REVEALED",
                "draft": {"kind": "gamesConfiguration#achievementConfigurationDetail",
                          "name": bundle({k: a[k]["name"] for k in LOCALES}), "description": bundle({k: a[k]["desc"] for k in LOCALES}),
                          "pointValue": 10, "sortRank": rank}}
        made = call("POST", f"{API}/achievements", retry=False, json=body)
        print("Made", tok, "->", made["id"])
        pics = glob.glob(os.path.join(HERE, "import*", f"ach-{tok[3:]}.jpg"))
        if not pics:
            print("  no picture found for", tok); continue
        data = open(pics[0], "rb").read()
        ok = False
        for attempt, (ctype, url) in enumerate([("image/jpeg", f"{IMG}/{made['id']}/imageType/ACHIEVEMENT_ICON?uploadType=media"),
                                                ("image/jpeg", f"{IMG}/{made['id']}/imageType/ACHIEVEMENT_ICON?uploadType=media"),
                                                ("image/jpeg", f"{IMG}/{made['id']}/imageType/ACHIEVEMENT_ICON")]):
            try:
                call("POST", url, retry=False, data=data, headers={"Content-Type": ctype})
                print("  picture uploaded!"); ok = True; break
            except Exception as e:
                print(f"  picture try {attempt + 1}: {str(e)[:200]}")
        if not ok:
            print("  Google refused the picture again. Add it in Play Console: open the achievement, Icon, Replace.")
