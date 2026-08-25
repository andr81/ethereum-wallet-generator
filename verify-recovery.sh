#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="ethereum-offline-keygen:1.0.0"
COUNT="${1:-5}"

if [[ ! "${COUNT}" =~ ^[0-9]+$ ]] || (( COUNT < 1 || COUNT > 1000 )); then
  echo "Usage: ./verify-recovery.sh [address count from 1 to 1000]" >&2
  exit 1
fi

if [[ $# -gt 1 ]]; then
  echo "Error: too many arguments." >&2
  exit 1
fi

if [[ ! -t 0 || ! -t 1 ]]; then
  echo "Error: hidden input requires an interactive terminal." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Error: Docker Engine is unavailable." >&2
  exit 1
fi

echo "Physically disconnect Wi-Fi and Ethernet before entering the seed phrase."

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
  --interactive \
  --tty \
  --entrypoint=node \
  "${IMAGE_REF}" src/verify-recovery.mjs "${COUNT}"

