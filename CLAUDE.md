# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An offline Ethereum HD wallet generator: it produces a 24-word BIP-39 seed phrase, the XPUB for
`m/44'/60'/0'/0`, and deposit addresses inside a throwaway, network-less Docker container. Not a
server and not a library — a set of one-shot entrypoint scripts.

Documentation and all user-facing runtime strings are in English.

## Commands

```bash
./build-image.sh          # build the image — the only step that needs internet
./self-test.sh            # the project's entire test suite
./generate.sh [N]         # production generation, requires typing GENERATE
./verify-recovery.sh [N]  # seed recovery, requires an interactive TTY
npm run check             # node --check across every entrypoint, no deps needed
```

`N` is the address count, 1–1000, default 5.

There is no separate test runner: `src/self-test.mjs` *is* the suite — one deterministic vector (the
public `test test … junk` phrase, expected address `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
plus a cross-check that the XPUB-derived address matches the private-node one. To run a single
`.mjs` inside the image:

```bash
docker run --rm --network=none --entrypoint=node ethereum-offline-keygen:1.0.0 src/<file>.mjs
```

### Two traps when running locally

- **`generate.sh` and `verify-recovery.sh` refuse a non-TTY.** They are unrunnable from a
  non-interactive tool call by design; drive them by hand in a terminal.
- **`npm run self-test` always fails on the host.** Every entrypoint calls
  `assertNoExternalNetwork()` first, and any normal machine has Wi-Fi, so the test dies on
  "External network interfaces detected". That is the guard working, not a breakage — tests only
  run via `./self-test.sh`, i.e. in a container with `--network=none`.
- **The run scripts pass `--pull=never`.** Without `./build-image.sh` first, none of them will find
  the image.

## Architecture

### The two-stage model is the project's defining constraint

Dependencies cannot be downloaded inside a fully offline container, so they are installed ahead of
time: the `dependencies` stage in the `Dockerfile` runs `npm ci --omit=dev --ignore-scripts` and the
`runtime` stage copies `node_modules` across. Runtime installs and downloads nothing. The practical
consequence: **any dependency change requires rebuilding the image while online**, and that is the
only point where network access is legitimate at all.

### The offline invariant is held by two independent layers

1. Docker flags in the shell scripts: `--network=none`, `--read-only`, `--cap-drop=ALL`,
   `--security-opt=no-new-privileges`, `--pull=never`, `--log-driver=none`, CPU/RAM/PID limits, and
   a tmpfs `/tmp`.
2. `assertNoExternalNetwork()` from `src/security.mjs`, inside the process.

The duplication is deliberate. **A new entrypoint must call `assertNoExternalNetwork()` as its first
statement** — the sole exception is `src/derive-from-xpub.mjs`, which is meant to run online on a
server.

`lib/common.sh` is the single source for the image reference, the `OFFLINE_RUN_ARGS` restriction
array and the shared guards (`require_docker`, `require_local_docker_endpoint`,
`require_address_count`, `require_interactive_terminal`). **Add a container restriction there, never
in an individual script** — the point of the file is that generation, self-test and recovery cannot
drift apart. It is sourced via `BASH_SOURCE`, so the scripts work from any cwd, and it is excluded
from the build context.

The base image is pinned by digest in the `Dockerfile`; bumping the version means updating both
stages and `IMAGE_VERSION` in `lib/common.sh`.

### The secrecy boundary is what splits the files

The seed phrase exists only in the container's stdout and is never written to disk — hence the ban
on redirecting output, the `--log-driver=none`, and the total absence of volumes and bind mounts.
Only the XPUB, the derivation path and the master fingerprint travel to a server. That gives:

- `src/generate.mjs`, `src/verify-recovery.mjs` — handle the secret, offline only, zero their
  buffers in `finally`.
- `src/derive-from-xpub.mjs` — the public half, a template for server code, never touches secrets.
- `src/security.mjs` — shared invariants: `BASE_PATH`, `parseAddressCount`, the interface check,
  `wipeBytes`.

`verify-recovery.mjs` reads the phrase only from stdin with echo suppressed (readline pointed at a
throwaway `Writable` instead of a real output) — not from argv, not from the environment, or the
secret would leak into `ps` and the process environment.

### Why the path is exactly `m/44'/60'/0'/0`

`BASE_PATH` is the account-level node, and `neuter()` is taken there. Children `/0`, `/1`, `/2` are
non-hardened, which is what lets a server derive addresses from a single XPUB without the seed
phrase. A hardened level in the children's place would break the whole scheme. **`BASE_PATH` must
not change once the first address has been issued** — every previously issued address becomes
unrecoverable under a new path.

The project contains no cryptography of its own: BIP-39, BIP-32, secp256k1 and address encoding come
from `ethers` 6.17.0, entropy from `node:crypto`. Do not introduce hand-rolled implementations.

## Importing other agents' configs

`~/.codex/config.toml` and `~/.gemini/GEMINI.md` exist on this machine. To carry over MCP servers,
slash commands, subagents, skills or instructions from them, reply `/import` to see what is
importable, then `/import --yes=<digest>` (the scan output names the digest) to apply the user-level
items. If `/import` is unavailable on this surface, run `claude import` from a terminal.
