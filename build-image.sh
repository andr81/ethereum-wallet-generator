#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_docker

echo "Building ${IMAGE_REF}. Internet access here is only for pulling the base image and dependencies."
echo "No seed phrases or keys are created at build time; the production generator does NOT run."

docker build --pull --tag "${IMAGE_REF}" "${SCRIPT_DIR}"

IMAGE_ID="$(docker image inspect --format '{{.Id}}' "${IMAGE_REF}")"
echo "Image built: ${IMAGE_REF}"
echo "Image ID: ${IMAGE_ID}"
