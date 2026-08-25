#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="ethereum-offline-keygen"
IMAGE_VERSION="1.0.0"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_VERSION}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "Ошибка: Docker не найден. Установите Docker и повторите попытку." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Ошибка: Docker Engine недоступен или нет прав на подключение к нему." >&2
  exit 1
fi

echo "Сборка ${IMAGE_REF}. Сейчас интернет может использоваться только для загрузки базового образа и зависимостей."
echo "На этапе сборки seed-фразы и ключи НЕ создаются; production-генератор НЕ запускается."

docker build --pull --tag "${IMAGE_REF}" "${SCRIPT_DIR}"

IMAGE_ID="$(docker image inspect --format '{{.Id}}' "${IMAGE_REF}")"
echo "Образ собран: ${IMAGE_REF}"
echo "ID образа: ${IMAGE_ID}"

