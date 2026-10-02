#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

USAGE="./export-account.sh <account index> [address count from 1 to 1000] [--xprv]"

XPRV_FLAG=""
ARGS=()
for arg in "$@"; do
  if [[ "${arg}" == "--xprv" ]]; then
    XPRV_FLAG="--xprv"
  else
    ARGS+=("${arg}")
  fi
done

if [[ ${#ARGS[@]} -lt 1 || ${#ARGS[@]} -gt 2 ]]; then
  echo "Usage: ${USAGE}" >&2
  exit 1
fi

ACCOUNT="${ARGS[0]}"
if [[ ! "${ACCOUNT}" =~ ^(0|[1-9][0-9]{0,9})$ ]]; then
  echo "Usage: ${USAGE}" >&2
  exit 1
fi
COUNT="${ARGS[1]:-5}"
require_address_count "${COUNT}" "${USAGE}"
require_interactive_terminal
require_docker
require_local_docker_endpoint

echo "Physically disconnect Wi-Fi and Ethernet before entering the seed phrase."
if [[ -n "${XPRV_FLAG}" ]]; then
  echo "The account XPRV (a hot key for this account) will be shown in the terminal."
  read -r -p "Type EXPORT to confirm: " CONFIRMATION
  if [[ "${CONFIRMATION}" != "EXPORT" ]]; then
    echo "Cancelled."
    exit 1
  fi
  unset CONFIRMATION
fi

docker run "${OFFLINE_RUN_ARGS[@]}" \
  --interactive \
  --tty \
  --entrypoint=node \
  "${IMAGE_REF}" src/export-account.mjs "${ACCOUNT}" "${COUNT}" ${XPRV_FLAG:+"${XPRV_FLAG}"}
