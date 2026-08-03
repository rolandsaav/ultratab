#!/usr/bin/env bash
# Build the extension, then assemble a clean per-browser folder for each target
# (dist-chrome/, dist-firefox/), each with a single manifest.json versioned from
# package.json. Optionally zips each for store upload.
#
#   scripts/release.sh                   # both targets, with zips
#   scripts/release.sh --target firefox  # one target only
#   scripts/release.sh --no-zip          # skip the zips
set -euo pipefail
cd "$(dirname "$0")/.."

targets="chrome firefox"
zip=1
while [ $# -gt 0 ]; do
  case "$1" in
    --target) targets="$2"; shift 2 ;;
    --no-zip) zip=0; shift ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

version=$(jq -r .version package.json)

# Content build empties dist/ and copies public/; the background and palette builds append.
bunx vite build
bunx vite build --config vite.background.config.js
bunx vite build --config vite.palette.config.js

for t in $targets; do
  src="public/manifest-$t.json"
  [ -f "$src" ] || { echo "unknown target: $t" >&2; exit 1; }
  out="dist-$t"
  rm -rf "$out" "$out.zip"
  cp -R dist "$out"
  rm -f "$out"/manifest*.json                             # each target gets one manifest.json, below
  jq --arg v "$version" '.version = $v' "$src" > "$out/manifest.json"
  [ "$zip" = 1 ] && ( cd "$out" && zip -r -FS "../$out.zip" . )  # zip contents so manifest.json is at root
  echo "[release] $t → $out/"
done
