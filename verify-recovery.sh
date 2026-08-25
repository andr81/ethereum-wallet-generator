#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

if [[ $# -gt 1 ]]; then
  echo "Error: too many arguments." >&2
  exit 1
fi

COUNT="${1:-5}"
require_address_count "${COUNT}" "./verify-recovery.sh"
require_interactive_terminal
require_docker
require_local_docker_endpoint

echo "Physically disconnect Wi-Fi and Ethernet before entering the seed phrase."

docker run "${OFFLINE_RUN_ARGS[@]}" \
  --interactive \
  --tty \
  --entrypoint=node \
  "${IMAGE_REF}" src/verify-recovery.mjs "${COUNT}"
