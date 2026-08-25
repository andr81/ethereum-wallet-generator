import { randomBytes } from "node:crypto";
import { HDNodeWallet, Mnemonic, getAddress } from "ethers";
import {
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
  const accountNode = masterNode.derivePath(BASE_PATH);
  const publicNode = accountNode.neuter();

  console.log("\n=== SECRET DATA: COPY THIS ONTO PAPER ===\n");
  console.log(`SEED PHRASE: ${mnemonic.phrase}`);
  console.log(`DERIVATION PATH: ${BASE_PATH}`);
  console.log(`MASTER FINGERPRINT: ${masterNode.fingerprint}`);
  console.log(`ACCOUNT PUBLIC KEY: ${publicNode.publicKey}`);
  console.log(`XPUB: ${publicNode.extendedKey}`);

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

