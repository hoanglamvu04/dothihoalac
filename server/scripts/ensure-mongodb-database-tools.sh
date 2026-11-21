#!/usr/bin/env bash
set -Eeuo pipefail

# Install only MongoDB stand-alone Database Tools; never install/upgrade
# MongoDB Server. Use official pinned .deb from fastdl.mongodb.org.
if command -v mongodump >/dev/null 2>&1 && command -v mongorestore >/dev/null 2>&1; then
  printf '[DTHL tools] Database Tools already available\n'
  exit 0
fi

if [[ ! -r /etc/os-release ]]; then
  echo '[DTHL tools] Cannot determine VPS operating system' >&2
  exit 10
fi

# ID and VERSION_ID come from the VPS operating system.
# shellcheck disable=SC1091
. /etc/os-release

VERSION="100.20.1"
ARCH="$(uname -m)"
OS_ID="$ID"
OS_VERSION="$VERSION_ID"
DISTRO=""
TOOL_ARCH=""

case "$OS_ID" in
  ubuntu)
    case "$OS_VERSION" in
      20.04|22.04|24.04|26.04)
        OS_DIGITS="$(printf %s "$OS_VERSION" | tr -d '.')"
        DISTRO="ubuntu$OS_DIGITS" ;;
      *)
        echo "[DTHL tools] Unsupported Ubuntu version: $OS_VERSION" >&2; exit 11 ;;
    esac
    case "$ARCH" in
      x86_64) TOOL_ARCH="x86_64" ;;
      aarch64) TOOL_ARCH="arm64" ;;
      *) echo "[DTHL tools] Unsupported Ubuntu architecture: $ARCH" >&2; exit 12 ;;
    esac
    ;;
  debian)
    case "$OS_VERSION" in
      10|11|12|13)
        DISTRO="debian$OS_VERSION" ;;
      *)
        echo "[DTHL tools] Unsupported Debian version: $OS_VERSION" >&2; exit 11 ;;
    esac
    if [[ "$ARCH" != "x86_64" ]]; then
      echo "[DTHL tools] Debian release requires x86_64, got: $ARCH" >&2
      exit 12
    fi
    TOOL_ARCH="x86_64"
    ;;
  *)
    echo "[DTHL tools] OS not configured for automatic tools installation: $OS_ID $OS_VERSION" >&2
    exit 11
    ;;
esac

if ! command -v curl >/dev/null 2>&1 ||
   ! command -v dpkg-deb >/dev/null 2>&1 ||
   ! command -v apt-get >/dev/null 2>&1; then
  echo '[DTHL tools] curl, dpkg-deb and apt-get are required' >&2
  exit 13
fi

if [[ "$(id -u)" -ne 0 ]] && {
  ! command -v sudo >/dev/null 2>&1 || ! sudo -n true;
}; then
  echo '[DTHL tools] Root or passwordless sudo required for package installation' >&2
  exit 14
fi

PACKAGE="mongodb-database-tools-$DISTRO-$TOOL_ARCH-$VERSION.deb"
URL="https://fastdl.mongodb.org/tools/db/$PACKAGE"
TEMP_DIR="$(mktemp -d /tmp/dthl-dbtools.XXXXXXXX)"
trap 'rm -rf "$TEMP_DIR"' EXIT

printf '[DTHL tools] Downloading official MongoDB Database Tools %s for %s %s\n' "$VERSION" "$OS_ID" "$ARCH"
curl --fail --location --silent --show-error --retry 2 --max-time 150 \
  --proto '=https' --tlsv1.2 \
  "$URL" --output "$TEMP_DIR/$PACKAGE"

if [[ ! -s "$TEMP_DIR/$PACKAGE" ]]; then
  echo '[DTHL tools] Downloaded package is empty' >&2
  exit 15
fi

PACKAGE_NAME="$(dpkg-deb --field "$TEMP_DIR/$PACKAGE" Package)"
if [[ "$PACKAGE_NAME" != "mongodb-database-tools" ]]; then
  echo '[DTHL tools] Unexpected Debian package name; refusing installation' >&2
  exit 16
fi

if [[ "$(id -u)" -eq 0 ]]; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    "$TEMP_DIR/$PACKAGE"
else
  sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    "$TEMP_DIR/$PACKAGE"
fi

command -v mongodump >/dev/null
command -v mongorestore >/dev/null
printf '[DTHL tools] Database Tools installed successfully\n'
mongodump --version | head -n 1
