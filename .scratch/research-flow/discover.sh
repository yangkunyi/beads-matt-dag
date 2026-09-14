#!/usr/bin/env bash
# Discovery helper for this machine: web_search's providers are unavailable, so
# search over reachable engines and print result URLs.
#
#   bash discover.sh "<query>"          -> prints up to 25 result URLs
#   ENGINES="bing lite" bash discover.sh "<query>"
#
# Raw HTML is kept under raw/discovery for provenance.
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/raw/discovery"
mkdir -p "$DIR"
q="$1"
slug="$(python3 -c 'import sys,re;print(re.sub(r"[^a-z0-9]+","-",sys.argv[1].lower()).strip("-"))' "$q")"
ENGINES="${ENGINES:-lite bing}"

for eng in $ENGINES; do
  case "$eng" in
    lite) url="https://lite.duckduckgo.com/lite/?q=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$q")" ;;
    bing) url="https://www.bing.com/search?q=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$q")" ;;
    *) echo "unknown engine $eng" >&2; continue ;;
  esac
  out="$DIR/$slug-$eng.html"
  code="$(curl -sL --max-time 25 -A 'Mozilla/5.0 (X11; Linux x86_64)' -o "$out" -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
  printf '# %s  (%s, %sB)\n' "$url" "$code" "$(wc -c < "$out" | tr -d ' ')" >&2
  [ "$code" = "200" ] || continue
  python3 - "$out" <<'PY'
import re, sys, urllib.parse
html = open(sys.argv[1], encoding='utf-8', errors='ignore').read()
urls, seen = [], set()
for m in re.findall(r'uddg=([^&"\'#]+)', html):          # duckduckgo redirector
    u = urllib.parse.unquote(m)
    if u.startswith('http') and u not in seen: seen.add(u); urls.append(u)
for m in re.findall(r'href="(https?://[^"]+)"', html):    # plain links
    if any(d in m for d in ('bing.com','microsoft.com','duckduckgo.com','msn.com')): continue
    if m not in seen: seen.add(m); urls.append(m)
print('\n'.join(urls[:25]))
PY
done
