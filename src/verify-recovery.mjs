import { HDNodeWallet, getAddress } from "ethers";
import {
  ACCOUNT_PATH,
  assertNoExternalNetwork,
  BASE_PATH,
  parseAddressCount,
} from "./security.mjs";
import { readValidMnemonic } from "./seed-input.mjs";

let mnemonic;
let masterNode;
let accountNode;
let branchNode;
let publicNode;

try {
  assertNoExternalNetwork();
  const count = parseAddressCount(process.argv[2]);
  mnemonic = await readValidMnemonic();
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
  mnemonic = undefined;
  masterNode = undefined;
  accountNode = undefined;
  branchNode = undefined;
  publicNode = undefined;
}
