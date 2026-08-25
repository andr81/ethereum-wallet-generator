#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="ethereum-offline-keygen:1.0.0"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Ошибка: Docker Engine недоступен." >&2
  exit 1
fi

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
  --entrypoint=node \
  "${IMAGE_REF}" src/self-test.mjs

