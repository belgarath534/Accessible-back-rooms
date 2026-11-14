# Builds the Play Console achievements import zip (one picture per achievement, from www/img).
# Usage: python make_import_zip.py <work folder holding pgzip/ with the CSVs>
import json, os, sys, csv, zipfile
from PIL import Image, ImageOps
R = "/home/user/accessible-back-rooms"; S = sys.argv[1]
M = dict(first="lvl0", untouchable="lvl5", shocked="lvl3", party="lvl10", swim="lvl6", escape="last", nightmare="lvl13",
 thirst="x24", speed="lvl1", archivist="x26", marcus="mon_marcus", hider="mon_smiler", boom="mon_howler", friend="mon_face",
 mapper="lvl2", lookback="mon_watcher", deep10="x25", tutorial="title", hideseek="mon_hound", office="lvl4", suburbs="lvl7",
 city="lvl8", library="lvl12", carnival="lvl11", extra20="lvl9", extra50="mon_deep", puzzle="mon_glitch", trapper="mon_chaser",
 ironwill="mon_skin", ngplus="mon_mimic", company="mon_survivor", journal="mon_librarian", host="lvl14", bday="mon_party",
 candy="mon_wretch", passedby="mon_hallmon", school="x18", mall="x19", metro="x20", motion="x21", servers="x22",
 hospital="x15", hotel="x16", frozen="x17", daily="mon_moths", daily7="mon_frost", bestiary="mon_mannequin",
 trader="mon_trader", deep25="x23", hunt1="hunter", huntall="mon_crawler", hunt10="mon_toon", huntquiet="mon_host")
items = json.load(open(f"{R}/tools/gamecenter/items.json"))["achievements"]
ids = [a["id"][3:] for a in items]
assert set(ids) == set(M), set(ids) ^ set(M)
assert len(set(M.values())) == len(M), "duplicate picture"
out = f"{S}/pgzip2"
old = f"{S}/pgzip"
meta = list(csv.reader(open(f"{old}/AchievementsMetadata.csv", encoding="utf-8")))
names = [r[0] for r in meta]
assert len(names) == 53
by_name = {}
for a in items:
    n = a["en"]["name"].replace(",", " -")
    by_name[n] = a["id"][3:]
for n in names:
    assert n in by_name, n
rows = []
for n in names:
    key = by_name[n]
    im = Image.open(f"{R}/www/img/{M[key]}.jpg").convert("RGB")
    im = ImageOps.fit(im, (512, 512), Image.LANCZOS)
    fn = f"ach-{key}.jpg"
    im.save(f"{out}/{fn}", quality=88)
    assert os.path.getsize(f"{out}/{fn}") < 1_000_000
    rows.append([n, fn])
for f in ("AchievementsMetadata.csv", "AchievementsLocalizations.csv"):
    open(f"{out}/{f}", "wb").write(open(f"{old}/{f}", "rb").read())
for f in ("AchievementsIconsMappings.csv",):
    with open(f"{out}/{f}", "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows(rows)
z = f"{S}/backrooms-achievements-unique-icons.zip"
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for f in sorted(os.listdir(out)):
        zf.write(f"{out}/{f}", f)
print("zip", z, os.path.getsize(z), "files", len(os.listdir(out)))
