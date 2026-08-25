import { Writable } from "node:stream";
import { createInterface } from "node:readline";
import { HDNodeWallet, Mnemonic, getAddress } from "ethers";
import {
  ACCOUNT_PATH,
  assertNoExternalNetwork,
  BASE_PATH,
  parseAddressCount,
} from "./security.mjs";

let seedPhrase = "";
let mnemonic;
let masterNode;
let accountNode;
let branchNode;
let publicNode;

const hiddenOutput = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});

async function readHiddenSeed() {
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

try {
  assertNoExternalNetwork();
  const count = parseAddressCount(process.argv[2]);
  seedPhrase = (await readHiddenSeed()).trim().replace(/\s+/g, " ");

  if (!Mnemonic.isValidMnemonic(seedPhrase)) {
    throw new Error("The seed phrase failed BIP-39 validation.");
  }

  mnemonic = Mnemonic.fromPhrase(seedPhrase);
  masterNode = HDNodeWallet.fromPhrase(mnemonic.phrase, "", "m");
  accountNode = masterNode.derivePath(ACCOUNT_PATH);
  branchNode = masterNode.derivePath(BASE_PATH);
  publicNode = branchNode.neuter();

  console.log("\n=== DATA FOR COMPARISON ===\n");
  console.log(`DERIVATION PATH: ${BASE_PATH}`);
  console.log(`MASTER FINGERPRINT: ${masterNode.fingerprint}`);
  console.log(`ACCOUNT PUBLIC KEY: ${publicNode.publicKey}`);
  console.log(`\nACCOUNT XPUB (${ACCOUNT_PATH}) -- server derives child(0).child(index):`);
  console.log(`  ${accountNode.neuter().extendedKey}`);
  console.log(`BRANCH XPUB (${BASE_PATH}) -- server derives child(index):`);
  console.log(`  ${publicNode.extendedKey}`);

  for (let index = 0; index < count; index += 1) {
    const child = publicNode.deriveChild(index);
    console.log(`\nINDEX: ${index}`);
    console.log(`FULL DERIVATION PATH: ${BASE_PATH}/${index}`);
    console.log(`ETHEREUM ADDRESS: ${getAddress(child.address)}`);
    console.log(`COMPRESSED PUBLIC KEY: ${child.publicKey}`);
  }

  console.log("\nCompare the XPUB and addresses against your original paper record. Nothing was saved.\n");
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  seedPhrase = "";
  mnemonic = undefined;
  masterNode = undefined;
  accountNode = undefined;
  branchNode = undefined;
  publicNode = undefined;
}
