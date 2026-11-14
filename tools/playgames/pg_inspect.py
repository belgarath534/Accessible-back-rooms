#!/usr/bin/env python3
"""Shows one Play Games achievement exactly as Google stores it, then tries
the icon upload in a few ways and prints each answer."""
import json, os, sys
import create
import requests

ach = create.listed("achievements")
print("achievements:", len(ach))
a = ach[0]
print(json.dumps(a, indent=1, ensure_ascii=False)[:3000])
rid = a["id"]
png = open(os.path.join(create.HERE, "icon.png"), "rb").read()
small = open(os.path.join(create.HERE, "icon-small.png"), "rb").read()
tries = [
    ("media png", f"{create.IMG}/{rid}/imageType/ACHIEVEMENT_ICON?uploadType=media", small, {"Content-Type": "image/png"}),
    ("no uploadType", f"{create.IMG}/{rid}/imageType/ACHIEVEMENT_ICON", small, {"Content-Type": "image/png"}),
    ("big png", f"{create.IMG}/{rid}/imageType/ACHIEVEMENT_ICON?uploadType=media", png, {"Content-Type": "image/png"}),
]
for name, url, data, h in tries:
    r = requests.post(url, data=data, headers={**create.H, **h}, timeout=120)
    print(f"\n{name}: {r.status_code} {r.text[:500]}")
    if r.status_code < 300:
        break
# multipart
boundary = "xyzzyboundary"
body = (f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{{}}\r\n--{boundary}\r\nContent-Type: image/png\r\n\r\n").encode() + small + f"\r\n--{boundary}--\r\n".encode()
r = requests.post(f"{create.IMG}/{rid}/imageType/ACHIEVEMENT_ICON?uploadType=multipart", data=body,
                  headers={**create.H, "Content-Type": f"multipart/related; boundary={boundary}"}, timeout=120)
print(f"\nmultipart: {r.status_code} {r.text[:500]}")
