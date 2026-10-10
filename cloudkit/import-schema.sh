#!/bin/bash
# Adds the PluginSaveData record type (used by capacitor-icloud-sync) to the
# development schema of the iCloud container. Production is then one click:
# CloudKit Console, Deploy Schema Changes.
set -e
TEAM=ZPD555RW3A
CONTAINER=iCloud.com.accessible.backrooms
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$CK_MANAGEMENT_TOKEN" ]; then echo "CK_MANAGEMENT_TOKEN is not set"; exit 1; fi

echo "== cktool help, for the log =="
xcrun cktool save-token --help || true

echo "== Saving the management token =="
if ! xcrun cktool save-token "$CK_MANAGEMENT_TOKEN" --type management 2>/dev/null; then
  printf '%s\n' "$CK_MANAGEMENT_TOKEN" | xcrun cktool save-token --type management
fi

echo "== Current development schema =="
xcrun cktool export-schema --team-id "$TEAM" --container-id "$CONTAINER" --environment development --output-file current.ckdb
cat current.ckdb

if grep -q "RECORD TYPE PluginSaveData" current.ckdb; then
  echo "PluginSaveData already exists. Nothing to import."
  exit 0
fi

# Keep everything that is already there and add the new record type.
python3 - "$HERE/schema-addition.ckdb" <<'PY'
import sys,re
cur=open('current.ckdb').read().rstrip()
add=open(sys.argv[1]).read()
if not re.search(r'DEFINE\s+SCHEMA',cur): cur='DEFINE SCHEMA\n'
open('new.ckdb','w').write(cur+'\n\n'+add)
PY
echo "== New schema =="
cat new.ckdb

xcrun cktool import-schema --team-id "$TEAM" --container-id "$CONTAINER" --environment development --file new.ckdb
echo "== Done. Check the result =="
xcrun cktool export-schema --team-id "$TEAM" --container-id "$CONTAINER" --environment development
