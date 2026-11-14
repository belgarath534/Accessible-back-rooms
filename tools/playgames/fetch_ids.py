#!/usr/bin/env python3
"""After achievements were imported in Play Console, matches them to our ids
by their English name and prints PLAYGAMES_IDS (achievements + leaderboards)."""
import json, os
import create

items = json.load(open(os.path.join(create.HERE, "..", "gamecenter", "items.json")))
clean = lambda s: s.replace(",", " -").replace('"', "'").strip()
byname = {}
for a in create.listed("achievements"):
    for t in a["draft"]["name"]["translations"]:
        if t["locale"].startswith("en"):
            byname[t["value"].strip()] = a["id"]
ids, missing = {}, []
for a in items["achievements"]:
    n = clean(a["en"]["name"])
    if n in byname: ids[a["id"]] = byname[n]
    else: missing.append(n)
known = json.load(open(os.path.join(create.HERE, "ids.json")))
for b in items["leaderboards"]:
    if b["id"] in known: ids[b["id"]] = known[b["id"]]
print("PLAYGAMES_IDS " + json.dumps(ids, separators=(",", ":")))
print(f"{len(ids)} ids; missing: {missing}")
