import { networkInterfaces } from "node:os";

// The account node. Most tooling (hardware wallets, the "Account Extended Public
// Key" field in BIP-39 tools) exports at this level and expects the consumer to
// derive change/index itself.
export const ACCOUNT_PATH = "m/44'/60'/0'";
// The external-chain node, one level below. A consumer holding this key derives
// an address with a single child index.
export const BASE_PATH = "m/44'/60'/0'/0";
export const DEFAULT_ADDRESS_COUNT = 5;
// BIP-32 indices below 2^31; the account level is hardened on top of that.
export const MAX_ACCOUNT_INDEX = 2 ** 31 - 1;
export const MAX_ADDRESS_COUNT = 1000;

export function externalNetworkInterfaces() {
  const found = [];

  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (!address.internal) {
        found.push(`${name} (${address.address})`);
      }
    }
  }

  return found;
}

export function assertNoExternalNetwork() {
  const found = externalNetworkInterfaces();

  if (found.length > 0) {
    throw new Error(
      `External network interfaces detected: ${found.join(", ")}. ` +
        "Generation is only allowed in a container with networking fully disabled.",
    );
  }
}

export function parseAddressCount(rawValue) {
  if (rawValue === undefined) {
    return DEFAULT_ADDRESS_COUNT;
  }

  // Number() would happily read "1e3" as 1000 and "0x10" as 16, so the raw
  // argument has to look like a plain decimal integer before it is converted.
  const value = /^[0-9]+$/.test(String(rawValue)) ? Number(rawValue) : Number.NaN;

  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_ADDRESS_COUNT) {
    throw new Error(
      `Address count must be an integer between 1 and ${MAX_ADDRESS_COUNT}.`,
    );
  }

  return value;
}

// BIP-44 account node `m/44'/60'/<account>'`. One seed phrase can serve several
// projects, each on its own account: their deposit addresses, gas wallets and
// nonces never overlap, and a leaked account XPRV exposes neither the seed nor
// any other account (the level is hardened).
export function accountPath(account) {
  return `m/44'/60'/${account}'`;
}

export function parseAccountIndex(rawValue) {
  const value = /^(0|[1-9][0-9]*)$/.test(String(rawValue ?? "")) ? Number(rawValue) : Number.NaN;

  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_ACCOUNT_INDEX) {
    throw new Error(`Account index must be an integer between 0 and ${MAX_ACCOUNT_INDEX}.`);
  }

  return value;
}

export function wipeBytes(value) {
  if (value instanceof Uint8Array) {
    value.fill(0);
  }
}

