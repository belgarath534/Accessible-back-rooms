#!/usr/bin/env python3
"""Deletes every (unpublished) Play Games achievement, so they can be
imported again from a zip in Play Console with their icons. Leaderboards stay."""
import create

items = create.listed("achievements")
n = 0
for it in items:
    try:
        create.call("DELETE", f"https://gamesconfiguration.googleapis.com/games/v1configuration/achievements/{it['id']}", retry=False)
        n += 1
    except Exception as e:
        print("  !! could not delete", it["id"], e)
print(f"Deleted {n} of {len(items)} achievements.")
