import { HDNodeWallet, getAddress } from "ethers";
import {
  accountPath,
  assertNoExternalNetwork,
  parseAccountIndex,
  parseAddressCount,
} from "./security.mjs";
import { readValidMnemonic } from "./seed-input.mjs";

// Exports one BIP-44 account of an existing seed for a project server:
// the account XPUB (deposit addresses 0/i), the gas wallet 1/0 and, only with
// --xprv, the account XPRV that a sweeper needs to sign from those addresses.

let mnemonic;
let masterNode;
let accountNode;

try {
  assertNoExternalNetwork();
  const [rawAccount, rawCount, flag, ...extra] = process.argv.slice(2);
  if (extra.length > 0 || (flag !== undefined && flag !== "--xprv")) {
    throw new Error("Usage: export-account.mjs <account> <count> [--xprv]");
  }
  const account = parseAccountIndex(rawAccount);
  const count = parseAddressCount(rawCount);
  const withXprv = flag === "--xprv";
  const path = accountPath(account);

  mnemonic = await readValidMnemonic();
  masterNode = HDNodeWallet.fromPhrase(mnemonic.phrase, "", "m");
  accountNode = masterNode.derivePath(path);
  const accountPublic = HDNodeWallet.fromExtendedKey(accountNode.neuter().extendedKey);

  console.log(`\n=== ACCOUNT ${account} ===\n`);
  console.log(`ACCOUNT PATH: ${path}`);
  console.log(`MASTER FINGERPRINT: ${masterNode.fingerprint}`);
  console.log(`\nACCOUNT XPUB (${path}, depth ${accountPublic.depth}) -- server derives child(0).child(index):`);
  console.log(`  ${accountPublic.extendedKey}`);

  for (let index = 0; index < count; index += 1) {
    const address = getAddress(accountPublic.deriveChild(0).deriveChild(index).address);
    console.log(`DEPOSIT ${path}/0/${index}: ${address}`);
  }
  console.log(
    `GAS WALLET ${path}/1/0: ${getAddress(accountPublic.deriveChild(1).deriveChild(0).address)}`,
  );

  if (withXprv) {
    console.log(`\n!!! ACCOUNT XPRV (${path}) -- HOT KEY, spends every address of this account !!!`);
    console.log(`  ${accountNode.extendedKey}`);
    console.log("Put it straight into the server's secret store; never into chat, git or a file.");
    console.log("It does not reveal the seed phrase or any other account.");
  }

  console.log("\nCompare the first deposit addresses with your wallet. Nothing was saved.\n");
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  mnemonic = undefined;
  masterNode = undefined;
  accountNode = undefined;
}
