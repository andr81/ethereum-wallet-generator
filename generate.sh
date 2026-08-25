#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="ethereum-offline-keygen:1.0.0"
COUNT="${1:-5}"

if [[ ! "${COUNT}" =~ ^[0-9]+$ ]] || (( COUNT < 1 || COUNT > 1000 )); then
  echo "Использование: ./generate.sh [количество адресов от 1 до 1000]" >&2
  exit 1
fi

if [[ $# -gt 1 ]]; then
  echo "Ошибка: передано слишком много аргументов." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Ошибка: Docker Engine недоступен." >&2
  exit 1
fi

echo "Перед продолжением физически отключите Wi-Fi и Ethernet."
echo "Подготовьте бумагу и ручку: seed-фраза будет показана только в терминале."
read -r -p "Введите GENERATE, чтобы подтвердить готовность: " CONFIRMATION
if [[ "${CONFIRMATION}" != "GENERATE" ]]; then
  echo "Отменено."
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

