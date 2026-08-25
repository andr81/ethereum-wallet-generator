# Ethereum Offline Keygen

Generates an Ethereum HD wallet inside a throwaway, network-less Docker container: a 24-word BIP-39
seed phrase, the account XPUB for `m/44'/60'/0'/0`, and deposit addresses derived from it. No
server, no open ports; the code writes no files and no logs. A single address receives both ETH and
any ERC-20 token on the chosen network.

## How it works

Dependencies cannot be fetched inside a fully offline container, so the process is split in two:

1. **`build-image.sh`** — run with internet. Installs `ethers` 6.17.0 into a build stage; the
   runtime stage only copies the result. No keys are created here.
2. **`generate.sh`** — run after physically disconnecting Wi-Fi and Ethernet. Starts a one-shot
   container with `--network=none`, no volumes, no host paths, no Docker socket, removed on exit.

## Quick start

```bash
./build-image.sh          # the only step that needs internet
./self-test.sh            # deterministic check, no real secrets
./generate.sh 10          # offline; type GENERATE to confirm
./verify-recovery.sh 10   # offline; re-derive from a seed you type back
```

Address count is optional, 1–1000, default 5.

`generate.sh` and `verify-recovery.sh` refuse to run unless stdin and stdout are both a terminal, so
redirecting them into a file or piping them through `tee` fails instead of silently writing the seed
phrase to disk. They also refuse a non-local Docker endpoint, which would stream the phrase to a
remote daemon. Disconnect the network, close screen recorders, and have pen and paper ready.

## What you get

The account node is `m/44'/60'/0'/0`; addresses are its children `/0`, `/1`, `/2`, and so on. The
generator prints the seed phrase, the path, the master fingerprint, the account public key, the
XPUB, and per child a checksummed address with its compressed public key. The XPRV and per-address
private keys are never printed.

### Two export keys, and why it matters

The generator prints the extended public key at **two** levels, because server code differs in which
one it expects, and the two look identical at a glance:

| Key | Path | Depth | The server must derive |
| --- | --- | --- | --- |
| `ACCOUNT XPUB` | `m/44'/60'/0'` | 3 | `child(0).child(index)` |
| `BRANCH XPUB` | `m/44'/60'/0'/0` | 4 | `child(index)` |

Both reach the **same** standard address `m/44'/60'/0'/0/<index>`. In BIP-39 tools the first is the
"Account Extended Public Key" field and the second is "BIP32 Extended Public Key"; hardware wallets
export the account level.

Giving a server the wrong one is silent and expensive: it derives one level too deep, to
`m/44'/60'/0'/0/0/<index>`, and hands out addresses no ordinary wallet lists. Funds sent there are
still recoverable from the seed with a custom derivation path — but only once you notice. Validate
the level on the server: `HDNodeWallet.fromExtendedKey(xpub).depth` must equal the depth your
derivation assumes.

**No BIP-39 passphrase is used.** The optional 25th word is always empty, so restoring in another
wallet requires leaving its passphrase field blank.

Randomness comes from the OS CSPRNG via `node:crypto`; BIP-39, BIP-32, secp256k1 and address
encoding are handled by `ethers`. No hand-rolled cryptography.

## Self-test

Runs under the same restrictions and never generates a random seed. It uses the publicly known
phrase `test test test test test test test test test test test junk` — which must never hold money —
and asserts that `m/44'/60'/0'/0/0` resolves to `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`. It
also checks that the XPUB-derived address matches the private-node one and that no external network
interfaces exist. Any failure exits non-zero.

## Recovery check

`verify-recovery.sh` opens an offline container with an interactive TTY. The seed is read from stdin
with echo suppressed, never as a process argument or environment variable, and the XPUB and first
addresses are re-derived so you can compare them with your paper record. The code writes nothing to
disk and the container cannot swap, but terminal scrollback and host-level logging remain outside
its control.

The code then zeroes buffers and drops references, but JavaScript strings are immutable and the
garbage collector may leave copies in memory. Discarding the container shortens process lifetime; it
does not give provable memory wiping.

## What is secret

The seed phrase is the whole wallet: it controls ETH and every ERC-20 token on every derived
address. Never move it to a server, cloud storage, a messenger, a screenshot or email. A password
manager is defensible only with a deliberate threat model and the understanding that it gives up
fully offline storage. Your terminal
keeps it in scrollback until the window closes — clear it once the paper record is safe, and account
for shell history, session recording and system swap.

Only one of the two XPUBs, the derivation path, and optionally the master fingerprint ever reach a
server. The XPUB cannot spend funds, but it reveals every child address and the branch's
financial history, so treat it as sensitive. `ACCOUNT PUBLIC KEY` is not a private key either.

## What Docker does and does not cover

The container runs with no network, a read-only root filesystem, an unprivileged user, all Linux
capabilities dropped, no privilege escalation, CPU/RAM/PID limits and a temporary `/tmp`. No bind
mounts, no volumes, no `--privileged`, no `/var/run/docker.sock`.

Swap is disabled with `--memory-swap` equal to `--memory` — Docker otherwise allows twice the memory
limit in swap, which is a path for the seed phrase to reach the host's disk. Core dumps are blocked
with `--ulimit core=0:0`, and the ten proxy variables the Docker CLI can inject from
`~/.docker/config.json` are blanked. Every one of these restrictions is defined once, in
`lib/common.sh`, and shared by all three run scripts. The base image is pinned by digest, not by its
mutable tag.

| Covered | **Not** covered |
| --- | --- |
| Accidental network egress from the container | A compromised host system |
| Writes escaping to the host filesystem | A compromised Docker Engine or base image |
| Privilege escalation inside the container | Keyloggers, screen recording, cameras, bystanders |
| | Memory reads with admin rights |

Review the sources and your environment's integrity. For significant amounts prefer a hardware
wallet, a dedicated air-gapped machine, or an HSM.

## Using the XPUB on a server

`src/derive-from-xpub.mjs` holds a minimal example and no real XPUB. Pick the branch that matches
the key you exported, and reject a key whose `.depth` does not match:

```js
import { HDNodeWallet } from "ethers";

// Account XPUB, m/44'/60'/0' (depth 3)
HDNodeWallet.fromExtendedKey(accountXpub).deriveChild(0).deriveChild(index).address;

// Branch XPUB, m/44'/60'/0'/0 (depth 4)
HDNodeWallet.fromExtendedKey(branchXpub).deriveChild(index).address;
```

The server must reserve each index atomically and persist `user_id -> derivation_index -> address`.
**An index must never go to two users** — one deposit address would then map to several accounts and
automatic crediting becomes ambiguous. Enforce it with a unique constraint and allocate under a
transaction or lock.

## Networks, tokens and gas

A token balance lives in one contract on one chain. Ethereum, Arbitrum, Base, Polygon and BNB Chain
differ in chain ID, contracts, risks and native coin even where EVM addresses look identical — a
transfer on one is not a transfer on another.

Sweeping ERC-20 tokens off a deposit address normally requires that address to hold the chain's
native coin for gas, so design top-ups and sweeps before you need them. Exercise the whole flow on
Sepolia — issuance, deposit detection, confirmations, reorg handling, gas, withdrawal — and test
seed recovery on an isolated machine before accepting the first real deposit.
