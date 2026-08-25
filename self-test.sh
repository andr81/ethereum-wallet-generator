#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_docker

docker run "${OFFLINE_RUN_ARGS[@]}" --entrypoint=node "${IMAGE_REF}" src/self-test.mjs
