# Shared settings and guards for the offline keygen scripts.
# Sourced by build-image.sh, generate.sh, self-test.sh and verify-recovery.sh —
# never executed directly.

IMAGE_NAME="ethereum-offline-keygen"
IMAGE_VERSION="1.0.0"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_VERSION}"

# Every restriction placed on the one-shot containers lives here exactly once,
# so generation, self-test and recovery cannot drift apart.
#
#   --memory-swap equal to --memory disables swap entirely. Without it Docker
#   defaults to twice the memory limit, which would let the seed phrase reach
#   the host's swap file.
#   --ulimit core=0:0 stops a crash from writing a core dump containing the seed.
#   The proxy variables are blanked because the Docker CLI injects them from
#   ~/.docker/config.json when a `proxies` section exists; --network=none blocks
#   the egress but not the container's sight of the credentials in those URLs.
OFFLINE_RUN_ARGS=(
  --rm
  --pull=never
  --network=none
  --read-only
  --tmpfs /tmp:rw,noexec,nosuid,size=16m
  --cap-drop=ALL
  --security-opt=no-new-privileges
  --pids-limit=64
  --memory=256m
  --memory-swap=256m
  --ulimit core=0:0
  --cpus=1
  --log-driver=none
  --env HTTP_PROXY=
  --env http_proxy=
  --env HTTPS_PROXY=
  --env https_proxy=
  --env FTP_PROXY=
  --env ftp_proxy=
  --env NO_PROXY=
  --env no_proxy=
  --env ALL_PROXY=
  --env all_proxy=
)

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: Docker not found. Install Docker and try again." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker Engine is unavailable or you lack permission to reach it." >&2
    exit 1
  fi
}

# Container stdout streams over the Docker API, so a remote daemon would carry
# the seed phrase off this machine. Scripts that touch secrets must refuse
# anything but a local socket.
require_local_docker_endpoint() {
  local endpoint="${DOCKER_HOST:-}"

  if [[ -z "${endpoint}" ]]; then
    endpoint="$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
  fi

  if [[ "${endpoint}" != unix://* ]]; then
    echo "Error: Docker endpoint '${endpoint:-unknown}' is not a local unix socket." >&2
    echo "Secrets would travel to a remote daemon. Switch to a local context first." >&2
    exit 1
  fi
}

# Rejects leading zeros and out-of-range values without shell arithmetic, which
# treats a leading zero as octal and silently wraps on 64-bit overflow.
require_address_count() {
  local value="$1"
  local usage="$2"

  if [[ ! "${value}" =~ ^([1-9][0-9]{0,2}|1000)$ ]]; then
    echo "Usage: ${usage} [address count from 1 to 1000]" >&2
    exit 1
  fi
}

# Secret output must reach a human at a terminal, never a file or a pipe.
require_interactive_terminal() {
  if [[ ! -t 0 || ! -t 1 ]]; then
    echo "Error: this script must run on an interactive terminal." >&2
    echo "Redirecting or piping its output would write the seed phrase to disk." >&2
    exit 1
  fi
}
