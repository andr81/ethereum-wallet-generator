import { randomBytes } from "node:crypto";
import { HDNodeWallet, Mnemonic, getAddress } from "ethers";
import {
  ACCOUNT_PATH,
  assertNoExternalNetwork,
  BASE_PATH,
  parseAddressCount,
  wipeBytes,
} from "./security.mjs";

let entropy;
let mnemonic;

try {
  assertNoExternalNetwork();
  const count = parseAddressCount(process.argv[2]);

  entropy = randomBytes(32);
  mnemonic = Mnemonic.fromEntropy(entropy);

  const masterNode = HDNodeWallet.fromPhrase(mnemonic.phrase, "", "m");
  const accountNode = masterNode.derivePath(ACCOUNT_PATH);
  const branchNode = masterNode.derivePath(BASE_PATH);
  const publicNode = branchNode.neuter();

  console.log("\n=== SECRET DATA: COPY THIS ONTO PAPER ===\n");
  console.log(`SEED PHRASE: ${mnemonic.phrase}`);
  console.log(`DERIVATION PATH: ${BASE_PATH}`);
  console.log(`MASTER FINGERPRINT: ${masterNode.fingerprint}`);
  console.log(`ACCOUNT PUBLIC KEY: ${publicNode.publicKey}`);
  console.log("\nTwo export keys. Give your server the one matching how it derives:\n");
  console.log(`ACCOUNT XPUB (${ACCOUNT_PATH}) -- server derives child(0).child(index):`);
  console.log(`  ${accountNode.neuter().extendedKey}`);
  console.log(`BRANCH XPUB (${BASE_PATH}) -- server derives child(index):`);
  console.log(`  ${publicNode.extendedKey}`);
  console.log("\nBoth produce the SAME standard addresses below. Sending the wrong one");
  console.log("makes the server derive one level too deep and hand out foreign addresses.");

  for (let index = 0; index < count; index += 1) {
    const child = publicNode.deriveChild(index);
    console.log(`\n--- ADDRESS ${index} ---`);
    console.log(`INDEX: ${index}`);
    console.log(`FULL DERIVATION PATH: ${BASE_PATH}/${index}`);
    console.log(`ETHEREUM ADDRESS: ${getAddress(child.address)}`);
    console.log(`COMPRESSED PUBLIC KEY: ${child.publicKey}`);
  }

  console.log(
    "\nWARNING: this seed phrase fully controls ETH and every ERC-20 token on these addresses. " +
      "Do not keep it on a computer and do not share it with anyone.\n",
  );
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  wipeBytes(entropy);
  mnemonic = undefined;
}

