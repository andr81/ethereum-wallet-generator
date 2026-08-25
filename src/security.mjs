import { networkInterfaces } from "node:os";

export const BASE_PATH = "m/44'/60'/0'/0";
export const DEFAULT_ADDRESS_COUNT = 5;
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

export function wipeBytes(value) {
  if (value instanceof Uint8Array) {
    value.fill(0);
  }
}

