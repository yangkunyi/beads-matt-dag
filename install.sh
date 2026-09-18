#!/usr/bin/env bash
# One command after clone: fetch the pinned tools, install the skill set, put `loom` on PATH.
#
#   git clone <this-repo> && cd beads-matt-dag && ./install.sh
#   export PATH="$HOME/.loom/bin:$PATH"
#
# Pins (the versions this checkout is tested against):
#   bun 1.4.2    bd 1.2.2    archon v0.10.1
#
# Binaries land in $LOOM_HOME (default ~/.loom), not in git.
set -euo pipefail

BUN_VERSION="${BUN_VERSION:-1.4.2}"
BD_VERSION="${BD_VERSION:-1.2.2}"
ARCHON_VERSION="${ARCHON_VERSION:-v0.10.1}"

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOOM_HOME="${LOOM_HOME:-$HOME/.loom}"
BIN="$LOOM_HOME/bin"

log() { printf 'loom-install: %s\n' "$*"; }
die() { printf 'loom-install: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "need $1 on PATH"
}

os_arch() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  if [ "$os" = "darwin" ] && { [ "$arch" = "x86_64" ] || [ "$arch" = "amd64" ]; } \
    && [ "$(sysctl -in sysctl.proc_translated 2>/dev/null || true)" = "1" ]; then
    arch="arm64"
  fi
  case "$os" in
    linux|darwin) ;;
    *) die "unsupported OS: $os (linux or darwin)" ;;
  esac
  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) die "unsupported arch: $arch" ;;
  esac
  printf '%s %s' "$os" "$arch"
}

# bun's linux/darwin arm zip is aarch64; bd's arch is amd64/arm64.
bun_zip() {
  local os="$1" arch="$2" bun_arch
  if [ "$arch" = "arm64" ]; then bun_arch="aarch64"; else bun_arch="x64"; fi
  printf 'bun-%s-%s.zip' "$os" "$bun_arch"
}

bd_tar() {
  local os="$1" arch="$2" bd_arch
  if [ "$arch" = "x64" ]; then bd_arch="amd64"; else bd_arch="arm64"; fi
  printf 'beads_%s_%s_%s.tar.gz' "$BD_VERSION" "$os" "$bd_arch"
}

archon_asset() {
  local os="$1" arch="$2"
  printf 'archon-%s-%s' "$os" "$arch"
}

fetch() {
  local url="$1" dest="$2"
  curl -fL --retry 2 --retry-delay 1 --max-time 120 -o "$dest" "$url"
}

have_bun() {
  local b
  b="$(command -v bun 2>/dev/null || true)"
  [ -n "$b" ] && [ "$("$b" --version 2>/dev/null || true)" = "$BUN_VERSION" ]
}

have_bd() {
  local b
  b="$(command -v bd 2>/dev/null || true)"
  [ -n "$b" ] && "$b" version 2>/dev/null | grep -q " ${BD_VERSION} "
}

have_archon() {
  local b ver
  b="$(command -v archon 2>/dev/null || true)"
  [ -n "$b" ] || return 1
  ver="$("$b" --version 2>/dev/null | head -1 || true)"
  printf '%s' "$ver" | grep -q "${ARCHON_VERSION#v}"
}

place() {
  local src="$1" name="$2"
  mkdir -p "$BIN"
  ln -sfn "$src" "$BIN/$name"
}

unpack_zip() {
  local zip="$1" dest="$2"
  mkdir -p "$dest"
  if command -v unzip >/dev/null 2>&1; then
    unzip -qo "$zip" -d "$dest"
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$zip" "$dest" <<'PY'
import sys, zipfile
zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])
PY
  else
    die "need unzip or python3 to unpack bun"
  fi
}

install_bun() {
  if [ -x "$BIN/bun" ] && [ "$("$BIN/bun" --version 2>/dev/null || true)" = "$BUN_VERSION" ]; then
    log "bun $BUN_VERSION already in $BIN"
    return
  fi
  if have_bun; then
    place "$(command -v bun)" bun
    log "bun $BUN_VERSION (already on PATH) -> $BIN/bun"
    return
  fi
  local os arch zip tmp found
  read -r os arch <<<"$(os_arch)"
  zip="$(bun_zip "$os" "$arch")"
  tmp="$(mktemp -d)"
  log "fetching bun $BUN_VERSION ($zip)"
  fetch "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${zip}" "$tmp/$zip" \
    || die "could not download bun $BUN_VERSION"
  unpack_zip "$tmp/$zip" "$tmp/out"
  found="$(find "$tmp/out" -type f -name bun | head -1)"
  [ -n "$found" ] || die "bun binary missing from $zip"
  mkdir -p "$BIN"
  cp "$found" "$BIN/bun"
  chmod +x "$BIN/bun"
  rm -rf "$tmp"
  log "bun $BUN_VERSION -> $BIN/bun"
}

install_bd() {
  if [ -x "$BIN/bd" ] && "$BIN/bd" version 2>/dev/null | grep -q " ${BD_VERSION} "; then
    log "bd $BD_VERSION already in $BIN"
    return
  fi
  if have_bd; then
    place "$(command -v bd)" bd
    log "bd $BD_VERSION (already on PATH) -> $BIN/bd"
    return
  fi
  local os arch tar tmp found
  read -r os arch <<<"$(os_arch)"
  tar="$(bd_tar "$os" "$arch")"
  tmp="$(mktemp -d)"
  log "fetching bd $BD_VERSION ($tar)"
  fetch "https://github.com/gastownhall/beads/releases/download/v${BD_VERSION}/${tar}" "$tmp/$tar" \
    || die "could not download bd $BD_VERSION"
  tar -xzf "$tmp/$tar" -C "$tmp"
  found="$(find "$tmp" -type f -name bd | head -1)"
  [ -n "$found" ] || die "bd binary missing from $tar"
  mkdir -p "$BIN"
  cp "$found" "$BIN/bd"
  chmod +x "$BIN/bd"
  rm -rf "$tmp"
  log "bd $BD_VERSION -> $BIN/bd"
}

install_archon() {
  if [ -x "$BIN/archon" ] && "$BIN/archon" --version 2>/dev/null | grep -q "${ARCHON_VERSION#v}"; then
    log "archon $ARCHON_VERSION already in $BIN"
    return
  fi
  if have_archon; then
    place "$(command -v archon)" archon
    log "archon $ARCHON_VERSION (already on PATH) -> $BIN/archon"
    return
  fi
  local os arch asset tmp
  read -r os arch <<<"$(os_arch)"
  asset="$(archon_asset "$os" "$arch")"
  tmp="$(mktemp -d)"
  log "fetching archon $ARCHON_VERSION ($asset)"
  fetch "https://github.com/coleam00/Archon/releases/download/${ARCHON_VERSION}/${asset}" "$tmp/archon" \
    || die "could not download archon $ARCHON_VERSION"
  mkdir -p "$BIN"
  cp "$tmp/archon" "$BIN/archon"
  chmod +x "$BIN/archon"
  rm -rf "$tmp"
  log "archon $ARCHON_VERSION -> $BIN/archon"
}

write_wrappers() {
  mkdir -p "$BIN"
  cat >"$BIN/loom" <<EOF
#!/bin/sh
exec "$BIN/bun" "$ROOT/tools/flow.ts" "\$@"
EOF
  chmod +x "$BIN/loom"
  cp "$BIN/loom" "$BIN/beads-dag"
  log "loom -> $ROOT/tools/flow.ts"
}

need curl
need tar
need uname
mkdir -p "$BIN"
export PATH="$BIN:$PATH"

install_bun
install_bd
install_archon
write_wrappers

log "bun install (this checkout's JS deps)"
(cd "$ROOT" && "$BIN/bun" install --frozen-lockfile)

log "loom install (skills + pack link)"
"$BIN/loom" install

cat <<EOF

ok. Tools are in $BIN (bun $BUN_VERSION, bd $BD_VERSION, archon $ARCHON_VERSION).

  export PATH="$BIN:\$PATH"

Then:
  loom check                 # skills + pack
  loom init                  # in a product git repo, not this checkout
  archon setup               # credentials — cannot be bundled

Landing skill: /ask-loom
EOF
