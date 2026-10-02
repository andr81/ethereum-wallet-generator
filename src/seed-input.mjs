import { Writable } from "node:stream";
import { createInterface } from "node:readline";
import { Mnemonic } from "ethers";

const hiddenOutput = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});

// The phrase is read only from stdin with echo suppressed (readline points at a
// throwaway Writable) — never from argv or the environment, where it would leak
// into `ps` and the process environment.
export async function readHiddenSeed() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Hidden seed phrase entry requires an interactive TTY.");
  }

  process.stdout.write("Enter the seed phrase (input hidden): ");
  const readline = createInterface({
    input: process.stdin,
    output: hiddenOutput,
    terminal: true,
  });

  try {
    return await new Promise((resolve, reject) => {
      // Ctrl-C and Ctrl-D must reject, or the outer catch/finally never run and
      // the process exits on an unsettled await instead of a clear error.
      readline.once("SIGINT", () => readline.close());
      readline.once("close", () => reject(new Error("Seed phrase entry was aborted.")));
      readline.question("", resolve);
    });
  } finally {
    readline.close();
    process.stdout.write("\n");
  }
}

export async function readValidMnemonic() {
  const phrase = (await readHiddenSeed()).trim().replace(/\s+/g, " ");

  if (!Mnemonic.isValidMnemonic(phrase)) {
    throw new Error("The seed phrase failed BIP-39 validation.");
  }

  return Mnemonic.fromPhrase(phrase);
}
