#!/usr/bin/env python3
"""Checks every Play Games achievement and leaderboard as Google stores it and
lists anything that looks incomplete: no icon, missing English or Portuguese
name or description, points not a multiple of 5, and the points total."""
import create

ach = create.listed("achievements")
print("achievements:", len(ach))
total, bad = 0, 0
for a in ach:
    d = a.get("draft") or {}
    pts = d.get("pointValue", 0)
    total += pts
    issues = []
    if not d.get("iconUrl"):
        issues.append("no icon")
    if pts % 5 or not 5 <= pts <= 200:
        issues.append(f"points {pts}")
    for field in ("name", "description"):
        locs = {t["locale"]: t["value"] for t in (d.get(field) or {}).get("translations", [])}
        for want in ("en-US", "pt-BR"):
            if not locs.get(want):
                issues.append(f"{field} {want} missing")
    other = {k for k in d if k not in ("kind", "name", "description", "pointValue", "iconUrl", "sortRank")}
    name = next((t["value"] for t in (d.get("name") or {}).get("translations", []) if t["locale"] == "en-US"), a["id"])
    if issues:
        bad += 1
    print(f"{'!!' if issues else 'ok'} {name} [{a['achievementType']}, {a['initialState']}, steps {a.get('stepsToUnlock')}]"
          f"{' -> ' + ', '.join(issues) if issues else ''}{' extra:' + ','.join(other) if other else ''}")
print(f"\npoints total: {total} (Google allows at most 1000)")
print(f"achievements with problems: {bad}")

boards = create.listed("leaderboards")
print("\nleaderboards:", len(boards))
for b in boards:
    d = b.get("draft") or {}
    locs = {t["locale"] for t in (d.get("name") or {}).get("translations", [])}
    print(" ", b["id"], "icon" if d.get("iconUrl") else "NO ICON", sorted(locs), d.get("scoreFormat", {}).get("numberFormatStyle"))
