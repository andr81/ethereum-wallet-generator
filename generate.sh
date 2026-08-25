#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="ethereum-offline-keygen:1.0.0"
COUNT="${1:-5}"

if [[ ! "${COUNT}" =~ ^[0-9]+$ ]] || (( COUNT < 1 || COUNT > 1000 )); then
  echo "Usage: ./generate.sh [address count from 1 to 1000]" >&2
  exit 1
fi

if [[ $# -gt 1 ]]; then
  echo "Error: too many arguments." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Error: Docker Engine is unavailable." >&2
  exit 1
fi

echo "Physically disconnect Wi-Fi and Ethernet before continuing."
echo "Have pen and paper ready: the seed phrase is shown in the terminal only."
read -r -p "Type GENERATE to confirm you are ready: " CONFIRMATION
if [[ "${CONFIRMATION}" != "GENERATE" ]]; then
  echo "Cancelled."
  exit 1
fi
unset CONFIRMATION

docker run \
  --rm \
  --pull=never \
  --network=none \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --pids-limit=64 \
  --memory=256m \
  --cpus=1 \
  --log-driver=none \
  "${IMAGE_REF}" "${COUNT}"

