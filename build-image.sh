#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="ethereum-offline-keygen"
IMAGE_VERSION="1.0.0"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_VERSION}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker not found. Install Docker and try again." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker Engine is unavailable or you lack permission to reach it." >&2
  exit 1
fi

echo "Building ${IMAGE_REF}. Internet access here is only for pulling the base image and dependencies."
echo "No seed phrases or keys are created at build time; the production generator does NOT run."

docker build --pull --tag "${IMAGE_REF}" "${SCRIPT_DIR}"

IMAGE_ID="$(docker image inspect --format '{{.Id}}' "${IMAGE_REF}")"
echo "Image built: ${IMAGE_REF}"
echo "Image ID: ${IMAGE_ID}"

