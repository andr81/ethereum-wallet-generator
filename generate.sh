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
require_address_count "${COUNT}" "./generate.sh"
require_interactive_terminal
require_docker
require_local_docker_endpoint

echo "Physically disconnect Wi-Fi and Ethernet before continuing."
echo "Have pen and paper ready: the seed phrase is shown in the terminal only."
read -r -p "Type GENERATE to confirm you are ready: " CONFIRMATION
if [[ "${CONFIRMATION}" != "GENERATE" ]]; then
  echo "Cancelled."
  exit 1
fi
unset CONFIRMATION

docker run "${OFFLINE_RUN_ARGS[@]}" "${IMAGE_REF}" "${COUNT}"
