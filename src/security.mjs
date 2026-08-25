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
  const value = rawValue === undefined ? DEFAULT_ADDRESS_COUNT : Number(rawValue);

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

